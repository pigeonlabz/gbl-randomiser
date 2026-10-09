"use strict";

(() => {
  const engine = window.ChaosDemoEngine;
  const metadata = { roles: engine.roles, leagues: engine.leagues };
  const $ = (id) => document.getElementById(id);
  const copy = (value) => JSON.parse(JSON.stringify(value)); // Plain JSON demo state only.

  // Four separate concepts: lobby/settings, immutable originals, current cards,
  // and history. No localStorage, cookies, sessions or production API calls.
  let state = {
    lobby: { players: [], settings: { flexible_league: "random" } },
    round: null,
    history: [],
  };
  const demoUndo = []; // Snapshots of lobby/round only; the event journal stays append-only.
  let busy = false;
  let editingPlayerId = null;
  let nextPlayerId = 1; // Tab-local mock IDs; works on file:// and insecure previews too.

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function record(message, playerId = null) {
    state.history.push({ message, player_id: playerId, time: new Date().toISOString() });
  }

  function checkpoint(label) {
    demoUndo.push({ label, lobby: copy(state.lobby), round: copy(state.round) });
  }

  function status(message, error = false) {
    $("status").textContent = message;
    $("status").dataset.error = String(error);
  }

  async function run(message, action) {
    if (busy) return;
    busy = true;
    status(message);
    render();
    try {
      await action();
    } catch (error) {
      status(error.message, true);
    } finally {
      busy = false;
      render();
    }
  }

  function newPlayerState(playerId, slot) {
    return {
      player_id: playerId,
      generated_assignment: copy(slot.assignment),
      generated_error: slot.error,
      current_assignment: copy(slot.assignment),
      reroll_count: 0,
      host_reroll_count: 0,
      error: slot.error,
      history: [],
      undo_stack: [],
    };
  }

  function playerSnapshot(player) {
    return {
      current_assignment: copy(player.current_assignment),
      reroll_count: player.reroll_count,
      host_reroll_count: player.host_reroll_count,
      error: player.error,
    };
  }

  function changePlayer(player, label, changes) {
    const before = playerSnapshot(player);
    player.undo_stack.push({ label, before });
    player.history.push({ message: label, time: new Date().toISOString(), before });
    Object.assign(player, changes);
  }

  function playerName(id) {
    return state.lobby.players.find((player) => player.id === id)?.name || "Player";
  }

  function allowance(assignment, used) {
    return assignment.reroll_limit === null
      ? `Unlimited player rerolls · ${used} used`
      : `${Math.max(0, assignment.reroll_limit - used)} / ${assignment.reroll_limit} player rerolls remaining · ${used} used`;
  }

  function button(label, action, playerId, disabled = false, quiet = false) {
    const node = element("button", label, quiet ? "quiet" : "");
    node.type = "button";
    node.dataset.action = action;
    node.dataset.playerId = playerId;
    node.disabled = busy || disabled;
    node.addEventListener("click", () => handlePlayerAction(action, playerId));
    return node;
  }

  function assignmentDetails(assignment, container) {
    container.append(element("p", `${assignment.role} · ${assignment.league}`));
    const rules = element("ul");
    assignment.rules.forEach((rule) => rules.append(element("li", rule)));
    container.append(rules, element("code", assignment.search || "No inventory filter — apply rules manually."));
    container.append(element("p", `Original player allowance: ${assignment.reroll_limit ?? "unlimited"}`));
  }

  function renderCard(lobbyPlayer) {
    const card = element("article", undefined, "player-card");
    card.dataset.playerId = lobbyPlayer.id;
    const heading = element("div", undefined, "card-heading");
    heading.append(element("h3", lobbyPlayer.name), button("Remove", "remove", lobbyPlayer.id, false, true));
    card.append(heading);
    const player = state.round?.assignments[lobbyPlayer.id];
    if (!player) {
      card.append(element("p", "Waiting for the first round.", "muted"));
      return card;
    }
    const current = player.current_assignment;
    if (player.error) card.append(element("p", player.error, "error"));
    if (current) {
      const matchesOriginal = JSON.stringify(current) === JSON.stringify(player.generated_assignment);
      card.append(element("span", current.source === "manual" ? "Manual override" : matchesOriginal ? "Original assignment" : "Rerolled assignment", "badge"));
      card.append(element("div", current.role, "role"), element("div", current.league, "league"));
      const rules = element("ul", undefined, "rules");
      current.rules.forEach((rule) => rules.append(element("li", rule)));
      card.append(rules);
      const searchLabel = element("div", undefined, "search-label");
      searchLabel.append(element("small", "Pokémon GO search"), button("Copy", "copy", lobbyPlayer.id, !current.search, true));
      card.append(searchLabel, element("code", current.search || "No inventory filter — apply rules manually."));
      current.warnings.forEach((warning) => card.append(element("p", warning, "warning")));
      card.append(element("p", allowance(current, player.reroll_count), "allowance"));
    } else {
      card.append(element("div", "Assignment unavailable", "role"));
      card.append(element("p", "Use Host Reroll or Edit to recover only this player.", "muted"));
    }
    const actions = element("div", undefined, "actions");
    actions.append(
      button("Reroll", "reroll", lobbyPlayer.id, !current || (current.reroll_limit !== null && player.reroll_count >= current.reroll_limit)),
      button("Host Reroll ∞", "host-reroll", lobbyPlayer.id),
      button("Edit", "edit", lobbyPlayer.id),
      button("Undo", "undo", lobbyPlayer.id, player.undo_stack.length === 0),
    );
    card.append(actions, element("small", `Host recovery is unlimited · ${player.host_reroll_count} host rerolls used`));
    const original = element("details");
    original.append(element("summary", "Originally generated assignment"));
    if (player.generated_assignment) {
      assignmentDetails(player.generated_assignment, original);
      original.append(button("Restore original", "restore", lobbyPlayer.id));
    } else {
      original.append(element("p", player.generated_error || "Generation failed; no original was created.", "error"));
    }
    card.append(original);
    const history = element("details");
    history.append(element("summary", `Player history (${player.history.length})`));
    if (!player.history.length) history.append(element("p", "No changes to this player's card."));
    const historyList = element("ul");
    player.history.slice().reverse().forEach((entry) => historyList.append(element("li", entry.message)));
    history.append(historyList);
    card.append(history);
    return card;
  }

  function render() {
    const focus = document.activeElement;
    const focusId = focus?.id;
    const focusAction = focus?.dataset.action;
    const focusPlayer = focus?.dataset.playerId;
    const openDetails = new Set(Array.from($("players").querySelectorAll("details[open]"))
      .map((node) => `${node.parentElement.dataset.playerId}:${Array.from(node.parentElement.querySelectorAll("details")).indexOf(node)}`));
    $("players").replaceChildren(...state.lobby.players.map(renderCard));
    $("players").querySelectorAll("details").forEach((node) => {
      const key = `${node.parentElement.dataset.playerId}:${Array.from(node.parentElement.querySelectorAll("details")).indexOf(node)}`;
      node.open = openDetails.has(key);
    });
    $("add-player").disabled = busy || state.lobby.players.length >= 12;
    $("player-name").disabled = busy;
    $("flexible-league").disabled = busy;
    $("flexible-league").value = state.lobby.settings.flexible_league;
    $("generate-round").disabled = busy || state.lobby.players.length === 0 || !!state.round;
    $("reset-round").disabled = busy || !state.round;
    $("new-round").disabled = busy || !state.round || state.lobby.players.length === 0;
    $("undo-demo").disabled = busy || demoUndo.length === 0;
    $("undo-demo").title = demoUndo.length ? `Undo: ${demoUndo.at(-1).label}` : "No actions to undo";
    $("round-status").textContent = state.round
      ? `Round ${state.round.number} · ${state.lobby.players.length} players`
      : `No round generated · ${state.lobby.players.length} players`;
    $("edit-save").disabled = busy;
    $("edit-cancel").disabled = busy;
    const entries = state.history.slice(-30).reverse();
    $("event-history").replaceChildren(...entries.map((entry) => {
      const item = element("li");
      const time = element("time", new Date(entry.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      time.dateTime = entry.time;
      item.append(time, document.createTextNode(entry.message));
      return item;
    }));
    if (!entries.length) $("event-history").append(element("li", "No events yet.", "muted"));
    // Retain keyboard focus when card controls are recreated after a mutation.
    if (focusId && $(focusId) && !$(focusId).disabled) $(focusId).focus();
    else if (focusAction && focusPlayer) {
      const next = $("players").querySelector(`[data-action="${focusAction}"][data-player-id="${focusPlayer}"]`);
      if (next && !next.disabled) next.focus();
    }
  }

  async function startRound() {
    await run("Generating independent assignments…", async () => {
      const data = { slots: engine.generateRound(state.lobby.players.length, state.lobby.settings) };
      checkpoint(state.round ? "new round" : "generate round");
      const assignments = {};
      state.lobby.players.forEach((player, index) => {
        assignments[player.id] = newPlayerState(player.id, data.slots[index]);
      });
      state.round = {
        number: (state.round?.number || 0) + 1,
        generated_settings: copy(state.lobby.settings),
        assignments,
      };
      const failed = data.slots.filter((slot) => slot.error).length;
      record(`Round ${state.round.number} generated for ${state.lobby.players.length} players${failed ? `; ${failed} cards need recovery` : ""}.`);
      status(failed ? `${failed} assignments failed. Recover those cards with Host Reroll or Edit; other cards are ready.` : `Round ${state.round.number} is ready. Try changing one player's card.`, failed > 0);
    });
  }

  function editPlayer(id) {
    editingPlayerId = id;
    const assignment = state.round.assignments[id].current_assignment;
    $("edit-title").textContent = `Edit ${playerName(id)}'s assignment`;
    $("edit-role").value = assignment?.role || "Custom";
    $("edit-league").value = assignment?.league || "Great League";
    $("edit-rules").value = assignment?.rules.join("\n") || "Any Pokémon within your CP cap.";
    $("edit-search").value = assignment?.search ?? "cp-1500";
    $("edit-limit").value = assignment ? (assignment.reroll_limit ?? "") : "";
    $("edit-error").hidden = true;
    $("edit-dialog").showModal();
  }

  async function rerollPlayer(id, host) {
    const player = state.round.assignments[id];
    const current = player.current_assignment;
    if (!host && (!current || (current.reroll_limit !== null && player.reroll_count >= current.reroll_limit))) return;
    await run(`Rerolling ${playerName(id)} only…`, async () => {
      let assignment;
      try {
        assignment = engine.generateAssignment(state.lobby.settings, { exclude_role: current?.role });
      } catch (error) {
        checkpoint(`failed reroll for ${playerName(id)}`);
        changePlayer(player, "Reroll failed; assignment and allowance preserved.", { error: error.message });
        record(`${playerName(id)}'s reroll failed; other cards and reroll allowance unchanged.`, id);
        throw error;
      }
      // Rolled roles do not replenish normal rerolls. Only a host edit/reset can.
      assignment.reroll_limit = current ? current.reroll_limit : assignment.reroll_limit;
      const label = `${playerName(id)} ${host ? "host-rerolled" : "rerolled"} ${current?.role || "unavailable"} → ${assignment.role}.`;
      checkpoint(label);
      changePlayer(player, label, {
        current_assignment: assignment,
        reroll_count: player.reroll_count + (host ? 0 : 1),
        host_reroll_count: player.host_reroll_count + (host ? 1 : 0),
        error: null,
      });
      record(label, id);
      status(label);
    });
  }

  function restorePlayer(id) {
    const player = state.round.assignments[id];
    if (!player.generated_assignment) return;
    const label = `${playerName(id)} restored their original assignment and allowance.`;
    checkpoint(label);
    changePlayer(player, label, {
      current_assignment: copy(player.generated_assignment), reroll_count: 0,
      host_reroll_count: 0, error: player.generated_error,
    });
    record(label, id);
    status(label);
    render();
  }

  async function handlePlayerAction(action, id) {
    if (busy) return;
    if (action === "remove") {
      const name = playerName(id);
      checkpoint(`remove ${name}`);
      state.lobby.players = state.lobby.players.filter((player) => player.id !== id);
      if (state.round) delete state.round.assignments[id];
      record(`${name} removed from the lobby. Whole-demo undo can restore them.`, id);
      status(`${name} removed. Undo last demo action can bring them back.`);
      render();
      return;
    }
    if (action === "edit") return editPlayer(id);
    if (action === "reroll" || action === "host-reroll") return rerollPlayer(id, action === "host-reroll");
    if (action === "restore") return restorePlayer(id);
    const player = state.round.assignments[id];
    if (action === "undo") {
      if (!player.undo_stack.length) return;
      const label = `${playerName(id)} undid their last card change.`;
      checkpoint(label);
      const previous = player.undo_stack.pop();
      Object.assign(player, copy(previous.before));
      player.history.push({ message: `Undid: ${previous.label}`, time: new Date().toISOString() });
      record(label, id);
      status(label);
      render();
    }
    if (action === "copy") {
      try {
        await navigator.clipboard.writeText(player.current_assignment.search);
        status(`${playerName(id)}'s search copied.`);
      } catch {
        status("Copy was unavailable. Select the search text and copy it manually.", true);
      }
    }
  }

  $("add-player-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy) return;
    const name = $("player-name").value.trim();
    if (!name) return status("Enter a player name.", true);
    if (state.lobby.players.some((player) => player.name.toLowerCase() === name.toLowerCase())) {
      return status("That player name already exists. Use a distinct name.", true);
    }
    if (state.lobby.players.length >= 12) return status("This demo supports up to 12 players.", true);
    await run(`Adding ${name}…`, async () => {
      let slot = null;
      if (state.round) {
        try {
          slot = { assignment: engine.generateAssignment(state.lobby.settings), error: null };
        } catch (error) {
          slot = { assignment: null, error: error.message };
        }
      }
      checkpoint(`add ${name}`);
      const player = { id: `demo-player-${nextPlayerId++}`, name };
      state.lobby.players.push(player);
      if (state.round) state.round.assignments[player.id] = newPlayerState(player.id, slot);
      record(`${name} joined the mock lobby${state.round ? "; only their card was generated" : ""}.`, player.id);
      $("player-name").value = "";
      status(slot?.error ? `${name} added, but their assignment failed. Use Host Reroll or Edit.` : `${name} added.`, !!slot?.error);
    });
    $("player-name").focus();
  });

  $("flexible-league").addEventListener("change", (event) => {
    if (busy) return;
    checkpoint("change league setting");
    state.lobby.settings.flexible_league = event.target.value;
    record(`Flexible-role league changed to ${event.target.value}; existing cards preserved.`);
    status("League setting updated for future rolls. Existing cards stay as assigned.");
    render();
  });
  $("generate-round").addEventListener("click", startRound);
  $("new-round").addEventListener("click", startRound);
  $("reset-round").addEventListener("click", () => {
    if (busy || !state.round) return;
    checkpoint("reset round");
    Object.values(state.round.assignments).forEach((player) => {
      changePlayer(player, "Round reset: original assignment and allowance restored.", {
        current_assignment: copy(player.generated_assignment), reroll_count: 0,
        host_reroll_count: 0, error: player.generated_error,
      });
    });
    record(`Round ${state.round.number} reset to original assignments; lobby players kept.`);
    status("Round reset. Originals and allowances restored; players kept. Failed originals still allow host recovery.");
    render();
  });
  $("undo-demo").addEventListener("click", () => {
    if (busy || !demoUndo.length) return;
    const previous = demoUndo.pop();
    state.lobby = previous.lobby;
    state.round = previous.round;
    record(`Whole-demo undo: ${previous.label}.`);
    status(`Undid ${previous.label}. Lobby and round restored; event journal retained.`);
    render();
  });

  $("edit-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy || !editingPlayerId) return;
    const id = editingPlayerId;
    const limitText = $("edit-limit").value.trim();
    const assignment = {
      role: $("edit-role").value,
      league: $("edit-league").value,
      rules: $("edit-rules").value.split("\n").map((rule) => rule.trim()).filter(Boolean),
      search: $("edit-search").value.trim(),
      reroll_limit: limitText === "" ? null : Number(limitText),
      source: "manual",
    };
    await run(`Validating ${playerName(id)}'s override…`, async () => {
      let data;
      try {
        data = { assignment: engine.validateAssignment(assignment) };
      } catch (error) {
        $("edit-error").textContent = error.message;
        $("edit-error").hidden = false;
        throw error;
      }
      const player = state.round.assignments[id];
      const label = `${playerName(id)} edited ${player.current_assignment?.role || "unavailable"} → ${data.assignment.role}.`;
      checkpoint(label);
      changePlayer(player, label, { current_assignment: data.assignment, error: null });
      record(label, id);
      status(`${label} Original assignment preserved.`);
      $("edit-dialog").close();
      editingPlayerId = null;
    });
  });
  $("edit-cancel").addEventListener("click", () => {
    if (!busy) $("edit-dialog").close();
  });
  $("edit-dialog").addEventListener("cancel", (event) => {
    if (busy) event.preventDefault();
  });
  $("edit-dialog").addEventListener("close", () => { editingPlayerId = null; });

  [...Object.keys(metadata.roles), "Custom"].forEach((role) => {
    const option = element("option", role);
    option.value = role;
    $("edit-role").append(option);
  });
  Object.entries(metadata.roles).forEach(([name, definition]) => {
    $("role-guide").append(element("p", `${name}: ${definition.description} Player rerolls: ${definition.reroll_limit ?? "unlimited"}.`));
  });
  render();
  $("server-hint").hidden = true;
})();
