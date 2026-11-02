import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIRECTORY = path.join(PROJECT_ROOT, "docs", "static", "data");
const RAW_ROOT = "https://raw.githubusercontent.com/pvpoke/pvpoke/";
const ALLOWED_TYPES = new Set([
  "normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground",
  "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"
]);

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(label + " must be a JSON object.");
  return value;
}

function validateUpstream(gamemaster, rankings) {
  requireObject(gamemaster, "PvPoke Game Master");
  if (!Array.isArray(gamemaster.pokemon) || gamemaster.pokemon.length < 800) throw new Error("PvPoke Game Master species list is missing or incomplete.");
  if (!Array.isArray(gamemaster.moves) || gamemaster.moves.length < 100) throw new Error("PvPoke Game Master move list is missing or incomplete.");
  if (!Array.isArray(rankings) || rankings.length < 250) throw new Error("PvPoke Great League overall rankings contain fewer than 250 rows.");

  const moveIds = new Set();
  gamemaster.moves.forEach((move) => {
    if (!move || typeof move.moveId !== "string" || !move.moveId || !move.name || !ALLOWED_TYPES.has(String(move.type || "").toLowerCase())) {
      throw new Error("PvPoke move data contains a row without a stable ID, name, or supported type.");
    }
    if (moveIds.has(move.moveId)) throw new Error("PvPoke move data contains duplicate ID " + move.moveId + ".");
    moveIds.add(move.moveId);
  });

  const speciesIds = new Set();
  gamemaster.pokemon.forEach((pokemon) => {
    if (!pokemon || typeof pokemon.speciesId !== "string" || !pokemon.speciesId || !pokemon.speciesName ||
        !Number.isInteger(Number(pokemon.dex)) || Number(pokemon.dex) < 1 || !pokemon.baseStats ||
        !["atk", "def", "hp"].every((stat) => Number.isFinite(Number(pokemon.baseStats[stat]))) ||
        !Array.isArray(pokemon.types) || !pokemon.types.filter((type) => type !== "none").length) {
      throw new Error("PvPoke Game Master contains an incomplete species row.");
    }
    if (speciesIds.has(pokemon.speciesId)) throw new Error("PvPoke Game Master contains duplicate species ID " + pokemon.speciesId + ".");
    speciesIds.add(pokemon.speciesId);
    ["fastMoves", "chargedMoves", "legacyMoves", "eliteMoves"].forEach((field) => {
      if (pokemon[field] != null && !Array.isArray(pokemon[field])) throw new Error("PvPoke species " + pokemon.speciesId + " has an invalid " + field + " list.");
      (pokemon[field] || []).forEach((moveId) => {
        if (!moveIds.has(moveId)) throw new Error("PvPoke species " + pokemon.speciesId + " refers to missing move " + moveId + ".");
      });
    });
    if (pokemon.types.some((type) => type !== "none" && !ALLOWED_TYPES.has(String(type).toLowerCase()))) {
      throw new Error("PvPoke species " + pokemon.speciesId + " has an unsupported type.");
    }
  });

  const rankingIds = new Set();
  rankings.forEach((ranking) => {
    if (!ranking || typeof ranking.speciesId !== "string" || !ranking.speciesId || !ranking.speciesName) {
      throw new Error("PvPoke rankings contain a row without a species ID or display name.");
    }
    if (rankingIds.has(ranking.speciesId)) throw new Error("PvPoke rankings contain duplicate species ID " + ranking.speciesId + ".");
    rankingIds.add(ranking.speciesId);
  });
  return { speciesCount: gamemaster.pokemon.length, moveCount: gamemaster.moves.length, rankingCount: rankings.length };
}

export function buildSnapshot(gamemaster, rankingRows, sourceRevision, now = new Date()) {
  const counts = validateUpstream(gamemaster, rankingRows);
  const species = gamemaster.pokemon.map((pokemon) => ({
    id: pokemon.speciesId,
    dex: Number(pokemon.dex),
    name: pokemon.speciesName,
    types: pokemon.types.filter((type) => type !== "none").map((type) => String(type).toLowerCase()),
    baseStats: {
      attack: Number(pokemon.baseStats.atk),
      defense: Number(pokemon.baseStats.def),
      stamina: Number(pokemon.baseStats.hp)
    },
    fastMoves: pokemon.fastMoves || [],
    chargedMoves: pokemon.chargedMoves || [],
    legacyMoves: pokemon.legacyMoves || [],
    eliteMoves: pokemon.eliteMoves || [],
    tags: Array.isArray(pokemon.tags) ? pokemon.tags.map((tag) => String(tag).toLowerCase()) : [],
    released: Boolean(pokemon.released)
  }));
  const moves = gamemaster.moves.map((move) => ({
    id: move.moveId,
    name: move.name,
    type: String(move.type).toLowerCase(),
    energy: Number.isFinite(Number(move.energy)) ? Number(move.energy) : null,
    energyGain: Number.isFinite(Number(move.energyGain)) ? Number(move.energyGain) : null,
    power: Number.isFinite(Number(move.power)) ? Number(move.power) : null
  }));
  const rankings = rankingRows.map((ranking, index) => ({
    id: ranking.speciesId,
    name: ranking.speciesName,
    rank: index + 1,
    score: Number.isFinite(Number(ranking.score)) ? Number(ranking.score) : null,
    rating: Number.isFinite(Number(ranking.rating)) ? Number(ranking.rating) : null
  }));
  const snapshot = {
    schemaVersion: 1,
    meta: {
      source: "PvPoke",
      sourceUrl: "https://github.com/pvpoke/pvpoke",
      sourceRevision,
      generatedAt: now.toISOString(),
      upstreamTimestamp: String(gamemaster.timestamp || ""),
      ranking: "Great League · Overall · 1500 CP",
      license: "MIT",
      licenseFile: "PVPOKE-LICENSE.txt",
      counts
    },
    species,
    moves,
    rankings
  };
  const validation = validateSnapshot(snapshot);
  if (!validation.valid) throw new Error("Generated PvPoke snapshot failed validation: " + validation.errors.join(" "));
  return snapshot;
}

export function validateSnapshot(snapshot) {
  const errors = [];
  if (!snapshot || snapshot.schemaVersion !== 1) errors.push("Unsupported snapshot schema version.");
  if (!snapshot || !snapshot.meta || !/^[a-f0-9]{40}$/i.test(String(snapshot.meta.sourceRevision || ""))) errors.push("Source revision must be a full Git commit SHA.");
  if (!snapshot || !Array.isArray(snapshot.species) || snapshot.species.length < 800) errors.push("Species data is incomplete.");
  if (!snapshot || !Array.isArray(snapshot.moves) || snapshot.moves.length < 100) errors.push("Move data is incomplete.");
  if (!snapshot || !Array.isArray(snapshot.rankings) || snapshot.rankings.length < 250) errors.push("Rankings data is incomplete.");
  if (errors.length) return { valid: false, errors };
  const seenSpecies = new Set();
  snapshot.species.forEach((species) => {
    if (!species || !species.id || seenSpecies.has(species.id) || !Number.isInteger(species.dex) ||
        !Array.isArray(species.types) || !species.types.length || species.types.some((type) => !ALLOWED_TYPES.has(type)) ||
        !species.baseStats || !["attack", "defense", "stamina"].every((field) => Number.isFinite(species.baseStats[field])) ||
        !Array.isArray(species.fastMoves) || !Array.isArray(species.chargedMoves) || !Array.isArray(species.legacyMoves) ||
        !Array.isArray(species.eliteMoves) || !Array.isArray(species.tags)) {
      errors.push("Snapshot species rows must be complete and unique.");
    }
    seenSpecies.add(species && species.id);
  });
  const seenMoves = new Set();
  snapshot.moves.forEach((move) => {
    if (!move || !move.id || seenMoves.has(move.id) || !move.name || !ALLOWED_TYPES.has(move.type)) errors.push("Snapshot move rows must be complete and unique.");
    seenMoves.add(move && move.id);
  });
  const speciesMoveIds = new Set(snapshot.moves.map((move) => move.id));
  snapshot.species.forEach((species) => {
    if ([...species.fastMoves, ...species.chargedMoves, ...species.legacyMoves, ...species.eliteMoves].some((id) => !speciesMoveIds.has(id))) {
      errors.push("Snapshot species reference a move missing from the move index.");
    }
  });
  const seenRanks = new Set();
  snapshot.rankings.forEach((ranking, index) => {
    if (!ranking || !ranking.id || seenRanks.has(ranking.id) || ranking.rank !== index + 1 || !ranking.name) errors.push("Snapshot ranking rows must be ordered and unique.");
    seenRanks.add(ranking && ranking.id);
  });
  return { valid: errors.length === 0, errors: Array.from(new Set(errors)) };
}

async function readJson(response, label) {
  if (!response.ok) throw new Error(label + " download failed (HTTP " + response.status + ").");
  const text = await response.text();
  if (!text || text.length > 20 * 1024 * 1024) throw new Error(label + " download is empty or exceeds the 20 MB safety limit.");
  try { return JSON.parse(text); } catch (error) { throw new Error(label + " is not valid JSON: " + error.message); }
}

async function readText(response, label) {
  if (!response.ok) throw new Error(label + " download failed (HTTP " + response.status + ").");
  const text = await response.text();
  if (!text.includes("MIT License") || !text.includes("Permission is hereby granted")) throw new Error("PvPoke license text is not a recognizable MIT license.");
  return text.trimEnd() + "\n";
}

export async function refreshPvpokeData(options = {}) {
  const fetcher = options.fetch || globalThis.fetch;
  const outputDirectory = options.outputDirectory || DATA_DIRECTORY;
  const now = options.now || new Date();
  const sourceRevision = String(options.sourceRevision || "");
  if (typeof fetcher !== "function") throw new Error("This updater requires a Node.js runtime with fetch support.");
  if (!/^[a-f0-9]{40}$/i.test(sourceRevision)) throw new Error("Pass a full PvPoke Git commit SHA; the updater does not choose or poll for a revision.");
  const root = RAW_ROOT + sourceRevision + "/src/data/";
  const [gamemaster, rankingRows, licenseText] = await Promise.all([
    fetcher(root + "gamemaster.min.json").then((response) => readJson(response, "PvPoke Game Master")),
    fetcher(root + "rankings/all/overall/rankings-1500.json").then((response) => readJson(response, "PvPoke Great League rankings")),
    fetcher(RAW_ROOT + sourceRevision + "/LICENSE").then((response) => readText(response, "PvPoke license"))
  ]);
  const snapshot = buildSnapshot(gamemaster, rankingRows, sourceRevision, now);
  const serialized = JSON.stringify(snapshot);
  if (serialized.length > 8 * 1024 * 1024) throw new Error("Validated PvPoke snapshot exceeds the 8 MB static data budget.");
  await mkdir(outputDirectory, { recursive: true });
  const dataTarget = path.join(outputDirectory, "pvpoke-v1.json");
  const licenseTarget = path.join(outputDirectory, "PVPOKE-LICENSE.txt");
  const suffix = "." + process.pid + ".tmp";
  const dataTemp = dataTarget + suffix;
  const licenseTemp = licenseTarget + suffix;
  try {
    await writeFile(dataTemp, serialized + "\n", "utf8");
    await writeFile(licenseTemp, "PvPoke data derived from " + snapshot.meta.sourceUrl + " at commit " + sourceRevision + ".\n\n" + licenseText, "utf8");
    const written = JSON.parse(await readFile(dataTemp, "utf8"));
    const writtenValidation = validateSnapshot(written);
    if (!writtenValidation.valid) throw new Error("Temporary PvPoke file failed validation: " + writtenValidation.errors.join(" "));
    await rename(licenseTemp, licenseTarget);
    await rename(dataTemp, dataTarget);
  } catch (error) {
    await Promise.all([dataTemp, licenseTemp].map((file) => rm(file, { force: true }).catch(() => {})));
    throw error;
  }
  return { snapshot, bytes: Buffer.byteLength(serialized + "\n", "utf8"), files: [dataTarget, licenseTarget] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  refreshPvpokeData({ sourceRevision: process.argv[2] }).then((result) => {
    process.stdout.write("Imported pinned PvPoke snapshot " + result.snapshot.meta.sourceRevision + " (" + result.snapshot.species.length + " species, " + result.snapshot.moves.length + " moves, " + result.snapshot.rankings.length + " rankings, " + result.bytes + " bytes).\n");
  }).catch((error) => {
    process.stderr.write("Manual PvPoke import failed; the previous snapshot was left untouched. " + error.message + "\n");
    process.exitCode = 1;
  });
}
