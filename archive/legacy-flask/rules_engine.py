import json
import os
import random
import time
from dataclasses import dataclass, asdict, field
from hashlib import sha256
from typing import List, Dict, Any, Optional
from json import JSONDecodeError
from typing import List, Dict, Any, Optional
from itertools import combinations

SESSIONS_DIR = "sessions"

CUSTOM_CUP_DIR = "custom"

MAX_POKEDEX = 1025


def _parse_bool(val: str):
    if val is None:
        return None
    v = val.strip().lower()
    if not v:
        return None
    if v in ("true", "yes", "y", "1", "on"):
        return True
    if v in ("false", "no", "n", "0", "off"):
        return False
    return None


def _parse_int(val: str):
    if val is None:
        return None
    v = val.strip()
    if not v:
        return None
    try:
        return int(v)
    except ValueError:
        return None


def _parse_enabled_weight(raw: str):
    """
    Parse strings like:
      "true,4"  -> (True, 4)
      "false,0" -> (False, 0)
      "true"    -> (True, None)
      "4"       -> (None, 4)
      ""        -> (None, None)
    """
    if raw is None:
        return None, None

    s = raw.strip()
    if not s:
        return None, None

    if "," in s:
        left, right = [p.strip() for p in s.split(",", 1)]
        enabled = _parse_bool(left) if left else None
        weight = _parse_int(right)
        # handle case like ",4"
        if enabled is None and weight is not None:
            # let JS decide enabled based on >0 weight if needed
            return None, weight
        return enabled, weight

    # No comma: either pure bool or pure weight
    enabled = _parse_bool(s)
    if enabled is not None:
        return enabled, None

    weight = _parse_int(s)
    return (None, weight)


def load_custom_cups():
    """
    Load .cup files using the compact format, e.g.:

      name    = Rock Cup
      enabled = true
      search  = rock&!@rock
      league  = great
      battles = 5

      type    = true,4
      move    = false,0
      ...

    Returns a list of dicts, each with:
      - filename
      - name
      - enabled
      - search
      - league
      - battles
      - families: {family: {"enabled": bool|None, "weight": int|None}}
    """
    cups = []
    if not os.path.isdir(CUSTOM_CUP_DIR):
        return cups

    family_keys = [
        "type", "move", "cp", "region",
        "shiny", "legendary", "shadow", "recent",
        "xl", "xs", "meta", "mega", "weather",
    ]

    for fname in os.listdir(CUSTOM_CUP_DIR):
        if not fname.endswith(".cup"):
            continue

        path = os.path.join(CUSTOM_CUP_DIR, fname)
        cup = {
            "filename": fname,
            "name": None,
            "enabled": True,
            "search": "",
            "league": "master",
            "battles": None,
            "families": {f: {"enabled": None, "weight": None} for f in family_keys},
        }

        try:
            with open(path, "r", encoding="utf-8") as f:
                for raw in f:
                    line = raw.strip()
                    # treat any '#' line as comment / divider
                    if not line or line.startswith("#"):
                        continue
                    if "=" not in line:
                        continue

                    key, value = line.split("=", 1)
                    key = key.strip().lower()
                    value = value.strip()

                    # strip optional surrounding quotes on search etc
                    if value.startswith('"') and value.endswith('"') and len(value) >= 2:
                        value = value[1:-1]

                    if key == "name":
                        cup["name"] = value or fname.replace(".cup", "")
                    elif key == "enabled":
                        b = _parse_bool(value)
                        if b is not None:
                            cup["enabled"] = b
                    elif key == "search":
                        cup["search"] = value
                    elif key == "league":
                        cup["league"] = (value or "master").strip().lower()
                    elif key == "battles":
                        cup["battles"] = _parse_int(value)
                    elif key in family_keys:
                        enabled, weight = _parse_enabled_weight(value)
                        cup["families"][key]["enabled"] = enabled
                        cup["families"][key]["weight"] = weight
        except OSError:
            continue

        # Require at least a name + search to be useful
        if not cup["name"] or not cup["search"]:
            continue

        cups.append(cup)

    return cups

# ---------- Data models ----------

@dataclass
class LeagueRule:
    league: str          # "little", "great", "ultra", "master"
    display: str         # label shown in UI
    cp_filter: str = ""  # e.g. "cp0-1500" or "" for no default

@dataclass
class MatchResult:
    round_number: int
    winner: str          # player name or "draw" / "skip"
    search_string: str   # rules used

@dataclass
class BattleRule:
    kind: str            # e.g. "shiny_only", "region_allowed"
    display: str         # human-friendly text
    search: str          # literal PoGo filter snippet, e.g. "paldea&water"
    meta: Dict[str, Any] = field(default_factory=dict)


@dataclass
class RoundState:
    round_number: int
    round_seed: int
    generated_rules: List[BattleRule]
    final_rules: List[BattleRule]
    search_string: str
    player1: Optional[str] = None
    player2: Optional[str] = None


@dataclass
class Player:
    name: str
    avatar: str


@dataclass
class SessionState:
    session_id: str
    session_seed: int
    created_at: float
    league_rule: LeagueRule
    randomness_level: int = 1
    current_round: int = 0
    rounds: List[RoundState] = field(default_factory=list)
    players: List[Player] = field(default_factory=list)
    results: List[MatchResult] = field(default_factory=list)
    rule_weights: Optional[Dict[str, int]] = None
    cup_enabled: bool = False
    cup_search: str = ""
    battle_limit: Optional[int] = None


# ---------- Constants ----------

LEAGUES = {
    "little": LeagueRule("little", "Little Cup (500 CP)", "cp0-500"),
    "great":  LeagueRule("great",  "Great League (1500 CP)", "cp0-1500"),
    "ultra":  LeagueRule("ultra",  "Ultra League (2500 CP)", "cp0-2500"),
    "master": LeagueRule("master", "Master League (no CP limit)", ""),
}

TYPES = [
    "normal", "fire", "water", "grass", "electric", "ice",
    "fighting", "poison", "ground", "flying", "psychic",
    "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy",
]

REGIONS = [
    "kanto", "johto", "hoenn", "sinnoh",
    "unova", "kalos", "alola", "galar", "paldea",
]

META_MOVES = [
    "Hydro Cannon", "Blast Burn", "Frenzy Plant", "Meteor Mash",
    "Smack Down", "Aqua Tail", "Volt Switch", "Icicle Spear",
    "Precipice Blades", "Sunsteel Strike", "Aeroblast", "Payback",
    "Psystrike", "Sacred Fire", "Ice Burn",
]

# Rule kinds
RULE_KINDS = [
    "shiny_only",
    "legendary_only",
    "specific_cp",
    "type_allowed",
    "type_banned",
    "region_allowed",
    "region_banned",
    "move_type_allowed",
    "move_type_banned",
    "meta_moves_banned",
    "shadow_purified",
    "recent_catch",     # NEW
    "mega_required",    # NEW
    "xl_only",
    "xs_only",
    "buddy_only",
    "weather_only",
    "mega_lvl_only",
    "candy_count",      # NEW
    "dex_suffix",       # NEW
]

# Chaos / randomness weighting
RULE_WEIGHTS = {
    1: {  # chill
        "shiny_only":        1,
        "legendary_only":    1,
        "specific_cp":       1,
        "type_allowed":      4,
        "type_banned":       3,
        "region_allowed":    2,
        "region_banned":     2,
        "move_type_allowed": 1,
        "move_type_banned":  1,
        "meta_moves_banned": 0,
        "shadow_purified":   1,
        "recent_catch":      1,
        "mega_required":     1,
        "xl_only":           1,
        "xs_only":           1,
        "buddy_only":        1,
        "weather_only":      1,
        "mega_lvl_only":     1,
        "candy_count":       0,
        "dex_suffix":        0,
        "shadow_filter":     1,
        "purified_filter":   0,
        "lucky_filter":      0,
    },
    2: {  # spicy
        "shiny_only":        2,
        "legendary_only":    2,
        "specific_cp":       3,
        "type_allowed":      3,
        "type_banned":       3,
        "region_allowed":    2,
        "region_banned":     2,
        "move_type_allowed": 3,
        "move_type_banned":  3,
        "meta_moves_banned": 1,
        "shadow_purified":   2,
        "recent_catch":      2,
        "mega_required":     2,
        "xl_only":           2,
        "xs_only":           1,
        "buddy_only":        1,
        "weather_only":      2,
        "mega_lvl_only":     1,
        "candy_count":       1,
        "dex_suffix":        2,
        "shadow_filter":     2,
        "purified_filter":   1,
        "lucky_filter":      1,
    },
    3: {  # chaos
        "shiny_only":        3,
        "legendary_only":    3,
        "specific_cp":       4,
        "type_allowed":      2,
        "type_banned":       2,
        "region_allowed":    3,
        "region_banned":     3,
        "move_type_allowed": 4,
        "move_type_banned":  4,
        "meta_moves_banned": 2,
        "shadow_purified":   3,
        "recent_catch":      3,
        "mega_required":     3,
        "xl_only":           3,
        "xs_only":           1,
        "buddy_only":        1,
        "weather_only":      3,
        "mega_lvl_only":     1,
        "candy_count":       2,
        "dex_suffix":        3,
        "shadow_filter":     3,
        "purified_filter":   1,
        "lucky_filter":      2,
    },
}


# ---------- Helpers ----------

def ensure_sessions_dir():
    os.makedirs(SESSIONS_DIR, exist_ok=True)


def generate_session_id(rng: random.Random, length: int = 6) -> str:
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(rng.choice(chars) for _ in range(length))


def round_rule_count(round_number: int, max_rules: int = 6) -> int:
    # 1–3 => 2 rules, 4–6 => 3, etc. capped at max_rules
    base = 2 + (round_number - 1) // 3
    return min(base, max_rules)


def make_round_seed(session_seed: int, round_number: int) -> int:
    data = f"{session_seed}:{round_number}".encode("utf-8")
    digest = sha256(data).hexdigest()
    return int(digest[:8], 16)


def weighted_choice(rng: random.Random, weights: Dict[str, int]) -> str:
    items = [(k, w) for k, w in weights.items() if w > 0]
    total = sum(w for _, w in items)
    r = rng.uniform(0, total)
    upto = 0
    for kind, w in items:
        upto += w
        if r <= upto:
            return kind
    return items[-1][0]


# ---------- Rule generators ----------

def gen_shadow_filter(rng: random.Random) -> BattleRule:
    """
    Shadow-only vs no shadow.
    """
    mode = rng.choice(["shadow_only", "no_shadow"])
    if mode == "shadow_only":
        display = "Shadow Pokémon only"
        search = "shadow"
    else:
        display = "No Shadow Pokémon"
        search = "!shadow"
    return BattleRule(
        "shadow_filter",
        display,
        search,
        {"mode": mode},
    )


def gen_purified_filter(rng: random.Random) -> BattleRule:
    """
    Purified-only vs no purified.
    """
    mode = rng.choice(["purified_only", "no_purified"])
    if mode == "purified_only":
        display = "Purified Pokémon only"
        search = "purified"
    else:
        display = "No Purified Pokémon"
        search = "!purified"
    return BattleRule(
        "purified_filter",
        display,
        search,
        {"mode": mode},
    )


def gen_lucky_filter(rng: random.Random) -> BattleRule:
    """
    Lucky-only vs no lucky.
    """
    mode = rng.choice(["lucky_only", "no_lucky"])
    if mode == "lucky_only":
        display = "Lucky Pokémon only"
        search = "lucky"
    else:
        display = "No Lucky Pokémon"
        search = "!lucky"
    return BattleRule(
        "lucky_filter",
        display,
        search,
        {"mode": mode},
    )

def gen_shiny_only(rng: random.Random) -> BattleRule:
    return BattleRule("shiny_only", "Shiny only", "shiny")


def gen_legendary_only(rng: random.Random) -> BattleRule:
    return BattleRule("legendary_only", "Legendary & Mythical only", "Ultra Beasts,Legendary,Mythical")
    
    
def gen_xl_only(rng: random.Random) -> BattleRule:
    return BattleRule("xl_only", "XL and XXL", "XXL,XL")
    
def gen_xs_only(rng: random.Random) -> BattleRule:
    return BattleRule("xs_only", "XS and XXS", "XXS,XS")
    
def gen_buddy_only(rng: random.Random) -> BattleRule:
    return BattleRule("buddy_only", "Buddy 3 & 4", "Buddy3,Buddy4")
    
def gen_weather_boost_only(rng: random.Random) -> BattleRule:
    return BattleRule("weather_only", "Weather Boosted Attacks", "@weather")
    
def gen_mega_level_only (rng: random.Random) -> BattleRule:
    return BattleRule("mega_lvl_only", "Mega Level 3-4", "mega2-3")

def gen_specific_cp(rng: random.Random, league: LeagueRule) -> BattleRule:
    # League is display-only, this just nudges the range
    if league.league == "little":
        max_cp = rng.randint(10, 600)
    elif league.league == "great":
        max_cp = rng.randint(200, 1600)
    elif league.league == "ultra":
        max_cp = rng.randint(1000, 2700)
    else:
        max_cp = rng.randint(1500, 5000)

    display = f"Max CP {max_cp}"
    search = f"cp0-{max_cp}"
    return BattleRule("specific_cp", display, search, {"max_cp": max_cp})


def gen_type_allowed(rng: random.Random) -> BattleRule:
    count = rng.randint(1, 4)
    chosen = sorted(rng.sample(TYPES, count))
    if len(chosen) == 1:
        display = f"Only {chosen[0].capitalize()} types"
        search = chosen[0]
    else:
        display = "Only " + ", ".join(t.capitalize() for t in chosen) + " types"
        # comma = OR in PoGo search
        search = ",".join(chosen)
    return BattleRule("type_allowed", display, search, {"types": chosen})


def gen_type_banned(rng: random.Random) -> BattleRule:
    count = rng.randint(1, 4)
    chosen = sorted(rng.sample(TYPES, count))
    display = "No " + ", ".join(t.capitalize() for t in chosen) + " types"
    search = "&".join(f"!{t}" for t in chosen)
    return BattleRule("type_banned", display, search, {"types": chosen})


def gen_region_allowed(rng: random.Random) -> BattleRule:
    count = rng.randint(1, 3)
    chosen = sorted(rng.sample(REGIONS, count))
    if len(chosen) == 1:
        display = f"Only {chosen[0].capitalize()} Pokémon"
        search = chosen[0]
    else:
        display = "Only " + ", ".join(r.capitalize() for r in chosen) + " Pokémon"
        search = ",".join(chosen)
    return BattleRule("region_allowed", display, search, {"regions": chosen})

def gen_shadow_purified(rng: random.Random) -> BattleRule:
    # Different possibilities: shadow only, purified only, no shadows, no purified, no shadow or purified
    choice = rng.choice(["shadow_only", "purified_only", "no_shadow", "no_purified", "no_both"])

    if choice == "shadow_only":
        return BattleRule(
            "shadow_purified",
            "Shadow Pokémon only",
            "shadow",
            {"mode": choice},
        )
    elif choice == "purified_only":
        return BattleRule(
            "shadow_purified",
            "Purified Pokémon only",
            "purified",
            {"mode": choice},
        )
    elif choice == "no_shadow":
        return BattleRule(
            "shadow_purified",
            "No Shadow Pokémon",
            "!shadow",
            {"mode": choice},
        )
    elif choice == "no_purified":
        return BattleRule(
            "shadow_purified",
            "No Purified Pokémon",
            "!purified",
            {"mode": choice},
        )
    else:  # no_both
        return BattleRule(
            "shadow_purified",
            "No Shadow or Purified Pokémon",
            "!shadow&!purified",
            {"mode": choice},
        )

def gen_region_banned(rng: random.Random) -> BattleRule:
    count = rng.randint(1, 3)
    chosen = sorted(rng.sample(REGIONS, count))
    if len(chosen) == 1:
        display = f"No {chosen[0].capitalize()} Pokémon"
    else:
        display = "No " + ", ".join(r.capitalize() for r in chosen) + " Pokémon"
    search = "&".join(f"!{r}" for r in chosen)
    return BattleRule("region_banned", display, search, {"regions": chosen})


def gen_move_type_allowed(rng: random.Random) -> BattleRule:
    count = rng.randint(1, 2)
    chosen = sorted(rng.sample(TYPES, count))
    if len(chosen) == 1:
        display = f"Must know at least one {chosen[0].capitalize()} type move"
        search = f"@{chosen[0]}"
    else:
        pretty = " or ".join(t.capitalize() for t in chosen)
        display = f"Must know at least one {pretty} type move"
        # comma = OR
        search = ",".join(f"@{t}" for t in chosen)
    return BattleRule("move_type_allowed", display, search, {"move_types": chosen})


def gen_move_type_banned(rng: random.Random) -> BattleRule:
    count = rng.randint(1, 2)
    chosen = sorted(rng.sample(TYPES, count))
    if len(chosen) == 1:
        display = f"No {chosen[0].capitalize()} type moves"
    else:
        pretty = " or ".join(t.capitalize() for t in chosen)
        display = f"No {pretty} type moves"
    search = "&".join(f"!@{t}" for t in chosen)
    return BattleRule("move_type_banned", display, search, {"move_types": chosen})


def gen_meta_moves_banned(rng: random.Random) -> BattleRule:
    display = "Meta moves banned"
    search = "&".join(f"!@{m}" for m in META_MOVES)
    return BattleRule("meta_moves_banned", display, search, {"moves": META_MOVES})
    
def gen_recent_catch(rng: random.Random) -> BattleRule:
    # Simple: only Pokémon caught in last 90 days
    return BattleRule(
        "recent_catch",
        "Only Pokémon caught in the last 90 days",
        "age0-90",
        {"days": 90},
    )
    
def gen_mega_required(rng: random.Random) -> BattleRule:
    # Search filter: megaevolve
    # In practice this means you’ll only see Mega-evolved Pokémon when this filter is active.
    return BattleRule(
        "mega_required",
        "Must use Mega-evolved Pokémon",
        "megaevolve",
        {},
    )

def gen_candy_count(rng: random.Random) -> BattleRule:
    """
    Up to N candies, using countcandy0-N.
    N is random between 50 and 800 (inclusive), max per your spec.
    """
    max_candy = rng.randint(50, 800)
    display = f"Pokémon with up to {max_candy} candy"
    search = f"countcandy0-{max_candy}"
    return BattleRule(
        "candy_count",
        display,
        search,
        {"max_candy": max_candy},
    )


def gen_dex_suffix(rng: random.Random) -> BattleRule:
    """
    All Pokédex numbers ending in a given digit (0–9).
    e.g. suffix = 1 → 1,11,21,... up to MAX_POKEDEX.
    """
    suffix = rng.randint(0, 9)
    numbers = [n for n in range(1, MAX_POKEDEX + 1) if n % 10 == suffix]
    search = ",".join(str(n) for n in numbers)
    display = f"Pokédex numbers ending in {suffix}"
    return BattleRule(
        "dex_suffix",
        display,
        search,
        {"suffix": suffix, "numbers": numbers},
    )

RULE_GENERATORS = {
    "shiny_only":        gen_shiny_only,
    "legendary_only":    gen_legendary_only,
    "specific_cp":       gen_specific_cp,
    "type_allowed":      gen_type_allowed,
    "type_banned":       gen_type_banned,
    "region_allowed":    gen_region_allowed,
    "region_banned":     gen_region_banned,
    "move_type_allowed": gen_move_type_allowed,
    "move_type_banned":  gen_move_type_banned,
    "meta_moves_banned": gen_meta_moves_banned,
    "shadow_purified":   gen_shadow_purified,      # legacy, effectively unused
    "recent_catch":      gen_recent_catch,
    "mega_required":     gen_mega_required,
    "xl_only":           gen_xl_only,
    "xs_only":           gen_xs_only,
    "buddy_only":        gen_buddy_only,
    "weather_only":      gen_weather_boost_only,
    "mega_lvl_only":     gen_mega_level_only,
    "candy_count":       gen_candy_count,
    "dex_suffix":        gen_dex_suffix,
    "shadow_filter":     gen_shadow_filter,        # NEW
    "purified_filter":   gen_purified_filter,      # NEW
    "lucky_filter":      gen_lucky_filter,         # NEW
}


def can_add_rule(candidate_kind: str, existing_rules: List[BattleRule]) -> bool:
    def has_any(kinds):
        return any(r.kind in kinds for r in existing_rules)

    if candidate_kind in ("region_allowed", "region_banned"):
        if has_any(("region_allowed", "region_banned")):
            return False

    if candidate_kind in ("type_allowed", "type_banned"):
        if has_any(("type_allowed", "type_banned")):
            return False

    if candidate_kind in ("move_type_allowed", "move_type_banned"):
        if has_any(("move_type_allowed", "move_type_banned")):
            return False

    singleton_kinds = {
        "shiny_only",
        "legendary_only",
        "specific_cp",
        "meta_moves_banned",
        "shadow_purified",
        "recent_catch",     
        "mega_required",    
        "candy_count",
        "dex_suffix",
        "shadow_filter",
        "purified_filter",
        "lucky_filter",
    }
    if candidate_kind in singleton_kinds and has_any((candidate_kind,)):
        return False

    return True


def generate_battle_rules(
    session_seed: int,
    round_number: int,
    league_rule: LeagueRule,
    randomness_level: int = 1,
    rule_weights: Optional[Dict[str, int]] = None,
) -> RoundState:
    rc = round_rule_count(round_number)
    round_seed = make_round_seed(session_seed, round_number)
    rng = random.Random(round_seed)

    if rule_weights:
        weights = rule_weights
        # if everything is zero, fall back to default for level 1
        if not any(w > 0 for w in weights.values()):
            weights = RULE_WEIGHTS[1]
    else:
        weights = RULE_WEIGHTS.get(randomness_level, RULE_WEIGHTS[1])

    rules: List[BattleRule] = []
    attempts = 0
    max_attempts = rc * 10

    while len(rules) < rc and attempts < max_attempts:
        attempts += 1
        kind = weighted_choice(rng, weights)
        if not can_add_rule(kind, rules):
            continue
        gen_func = RULE_GENERATORS[kind]
        if kind == "specific_cp":
            rule = gen_func(rng, league_rule)
        else:
            rule = gen_func(rng)
        rules.append(rule)

    final_rules = list(rules)

    # Do we already have a specific CP rule?
    has_cp_rule = any(r.kind == "specific_cp" for r in final_rules)

    filters: List[str] = []

    # If no specific CP rule and league has a default CP band, add it first
    if league_rule.cp_filter and not has_cp_rule:
        filters.append(league_rule.cp_filter)

    # Then all other rule filters
    filters.extend(r.search for r in final_rules if r.search)

    search_string = "&".join(filters) if filters else ""

    return RoundState(
        round_number=round_number,
        round_seed=round_seed,
        generated_rules=rules,
        final_rules=final_rules,
        search_string=search_string,
    )


# ---------- Session persistence ----------

def create_session(league_key: str = "great", randomness_level: int = 1,
                   rule_weights: Optional[Dict[str, int]] = None) -> SessionState:
    ensure_sessions_dir()
    sys_rng = random.SystemRandom()
    session_seed = sys_rng.randrange(1, 2**31 - 1)
    session_id = generate_session_id(sys_rng)
    league_rule = LEAGUES[league_key]

    session = SessionState(
        session_id=session_id,
        session_seed=session_seed,
        created_at=time.time(),
        league_rule=league_rule,
        randomness_level=randomness_level,
        rule_weights=rule_weights,
    )
    save_session(session)
    return session


def save_session(session: SessionState) -> None:
    ensure_sessions_dir()

    def round_to_dict(r: RoundState) -> Dict[str, Any]:
        return {
            "round_number": r.round_number,
            "round_seed": r.round_seed,
            "generated_rules": [asdict(br) for br in r.generated_rules],
            "final_rules": [asdict(br) for br in r.final_rules],
            "search_string": r.search_string,
            "player1": r.player1,
            "player2": r.player2,
        }


    data = {
        "session_id": session.session_id,
        "session_seed": session.session_seed,
        "created_at": session.created_at,
        "league_rule": asdict(session.league_rule),
        "randomness_level": session.randomness_level,
        "current_round": session.current_round,
        "rounds": [round_to_dict(r) for r in session.rounds],
        "players": [asdict(p) for p in session.players],
        "results": [asdict(r) for r in getattr(session, "results", [])],
        "rule_weights": session.rule_weights,
        "cup_enabled": getattr(session, "cup_enabled", False),
        "cup_search": getattr(session, "cup_search", ""),
        "battle_limit": getattr(session, "battle_limit", None),
    }

    path = os.path.join(SESSIONS_DIR, f"{session.session_id}.json")
    tmp_path = path + ".tmp"

    # write to temp file first, then atomically replace
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    os.replace(tmp_path, path)


def load_session(session_id: str) -> Optional[SessionState]:
    path = os.path.join(SESSIONS_DIR, f"{session_id}.json")
    if not os.path.exists(path):
        return None

    with open(path, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
        except JSONDecodeError:
            # corrupted / empty session file
            return None

    league_data = data["league_rule"]
    league_rule = LeagueRule(
        league=league_data["league"],
        display=league_data["display"],
        cp_filter=league_data.get("cp_filter", "")  # default for old files
    )

    # <- define this ONCE, outside the loop
    def parse_rules(rule_list):
        return [BattleRule(**br) for br in rule_list]

    rounds: List[RoundState] = []
    for r in data.get("rounds", []):
        round_state = RoundState(
            round_number=r["round_number"],
            round_seed=r["round_seed"],
            generated_rules=parse_rules(r["generated_rules"]),
            final_rules=parse_rules(r["final_rules"]),
            search_string=r["search_string"],
            # these are safe even if old files don't have them
            player1=r.get("player1"),
            player2=r.get("player2"),
        )
        rounds.append(round_state)

    players = [Player(**p) for p in data.get("players", [])]
    results = [MatchResult(**r) for r in data.get("results", [])]
    rule_weights = data.get("rule_weights")

    session = SessionState(
        session_id=data["session_id"],
        session_seed=data["session_seed"],
        created_at=data["created_at"],
        league_rule=league_rule,
        randomness_level=data.get("randomness_level", 1),
        current_round=data.get("current_round", 0),
        rounds=rounds,
        players=players,
        results=results,
        rule_weights=rule_weights,
        cup_enabled=data.get("cup_enabled", False),
        cup_search=data.get("cup_search", ""),
        battle_limit=data.get("battle_limit"),
    )
    return session


def advance_round(session: SessionState) -> RoundState:
    if session.battle_limit is not None:
        if session.current_round >= session.battle_limit:
            # Already at or past limit, just return the last round
            if session.rounds:
                return session.rounds[-1]
    next_round = session.current_round + 1
    rs = generate_battle_rules(
        session_seed=session.session_seed,
        round_number=next_round,
        league_rule=session.league_rule,
        randomness_level=session.randomness_level,
        rule_weights=session.rule_weights,
    )
    
    if len(session.players) >= 2:
        names = [p.name for p in session.players]
        # all unique pairs: scalable for any N
        all_pairs = [(a, b) for i, a in enumerate(names) for b in names[i + 1:]]
        if all_pairs:
            pair_index = (next_round - 1) % len(all_pairs)
            rs.player1, rs.player2 = all_pairs[pair_index]
    else:
        rs.player1 = None
        rs.player2 = None
    
    session.current_round = next_round
    session.rounds.append(rs)
    save_session(session)
    return rs

def reroll_current_round(session: SessionState) -> Optional[RoundState]:
    """Regenerate rules for the current round (same round_number)."""
    if session.current_round == 0:
        return None  # nothing to reroll yet

    round_number = session.current_round

    rs = generate_battle_rules(
        session_seed=session.session_seed,
        round_number=round_number,
        league_rule=session.league_rule,
        randomness_level=session.randomness_level,
    )

    # replace last round state
    if session.rounds and session.rounds[-1].round_number == round_number:
        session.rounds[-1] = rs
    else:
        session.rounds.append(rs)

    save_session(session)
    return rs

# Quick CLI test
#if __name__ == "__main__":
#    s = create_session("great", randomness_level=2)
#    print("Session", s.session_id, "seed", s.session_seed)
#    for _ in range(3):
#        r = advance_round(s)
#        print("Round", r.round_number, "=>", r.search_string)
#        for rule in r.final_rules:
#            print(" -", rule.display)
#        print()
