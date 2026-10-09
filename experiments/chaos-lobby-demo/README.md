# Experimental Chaos Lobby Demo

A self-contained, **browser-only** host-facing prototype for asymmetric Pokémon GO
challenges. Ready for GitHub Pages: no Flask, backend, build step, external assets,
authentication, accounts, joins or production sessions are required.

## Open locally

Open `experiments/chaos-lobby-demo/index.html` in your browser. It takes you to
`templates/chaos_demo.html`, which is now ordinary static HTML and also works when
opened directly, including the file preview used during development. Keep the
`static/` directory in place so its relative scripts can load.

If the Codex file viewer does not run scripts, open the file in a browser or use
this optional local static preview, from the repository root:

```sh
python experiments/chaos-lobby-demo/app.py
```

Then open http://127.0.0.1:8010. This helper uses only Python's standard library,
serves this directory, binds to loopback and stops with Ctrl+C. It is optional;
GitHub Pages and direct file use need no Python at all. JavaScript must be enabled.

## GitHub Pages

Publish **the contents of `experiments/chaos-lobby-demo/` as static files**, preserving
`index.html`, `templates/` and `static/`. The entry page and assets use relative paths,
so the demo works at a project root or nested GitHub Pages URL. For example, when
this repository root is served, the demo entry is:

```text
https://<owner>.github.io/<repository>/experiments/chaos-lobby-demo/
```

If the existing production Pages deployment publishes only `docs/`, this isolated
`experiments/` directory is not automatically included. Use a separate demo Pages
repository or a separate static deployment artifact containing this folder. Do not
change the production publishing source or copy files into `docs/` just to test it.
No deployment configuration has been changed and no site has been published here.

## Demo flow

1. Add 2–6 mock players (up to 12 supported). Names must be distinct.
2. Click **Generate Round**. A shuffled role bag gives different roles to the first
   five players. Larger lobbies repeat roles with independently generated rules.
3. **Reroll** spends one player's normal allowance and rolls another role and its
   rules. Everyone else's card and the originally generated assignment stay intact.
4. **Host Reroll ∞** is unlimited recovery, even with no normal rerolls left.
5. **Edit** overrides role, league, written rules, search and total reroll allowance.
   Blank allowance means unlimited. Role selection changes the label; the host
   explicitly edits the rules/search to match. Editing spends no rerolls.
6. A card's **Undo** restores its previous assignment, allowance, counters and error.
   Repeated undo walks back earlier card changes.
7. Expand **Originally generated assignment** to inspect or restore the original.
8. **Reset Round** restores originals and clears usage without removing players.
   **New Round** generates a fresh set and increments the round number.
9. **Undo last demo action** restores the lobby/round snapshot for the latest
   mutation, including remove, reset, settings changes, card undo and new rounds.
   The global event journal retains a record of actions and undos.

Adding a player mid-round generates only their card. Removing a player changes no
other assignment; whole-demo undo can bring their card back. League settings affect
future rolls only. No action calls a server or requires regenerating all players.

## State separation

All state lives in JavaScript memory in **one browser tab**. No cookies, localStorage,
database, production APIs or production session JSON are read or written.

```text
lobby: players [{id, name}], settings
round: number, generated_settings, assignments keyed by player ID
  player_id
  generated_assignment       # original, never overwritten by edit/reroll
  generated_error            # retained if initial generation failed
  current_assignment         # active card, separate copy
  reroll_count               # normal player rerolls used
  host_reroll_count          # unlimited recovery uses
  error
  history                    # per-player records, including before snapshots
  undo_stack                 # prior current assignment/counters/error
global history               # demo event journal
demoUndo                     # prior lobby/round snapshots
```

The role initially sets a player's round allowance. Rerolling into another role
**does not** refill or change that allowance; otherwise a Wildcard could escape its
single-reroll limit. Host edits/restoring originals/reset/new rounds can change the
budget. Host recovery never spends it.

Whole-demo undo restores per-player histories/stacks from its snapshot while keeping
the global journal. Card undo retains its own journal and pops one previous snapshot.
No separate redo button is provided, but whole-demo undo can reverse a card undo.
Older-round originals are recoverable by undoing New Round. Refresh/close loses all
state; nothing is persisted across visits.

## Role definitions and rule safety

**`ROLE_DEFINITIONS` in `static/chaos_demo_engine.js` is the single role definition
structure.** It holds descriptions, fixed/random leagues, pool strategies, written
rules, filters and initial player rerolls. Hunter, Specialist and Purist start with
2, Wildcard with 1, and Underdog with 4. These are provisional balancing choices.

Specialist gets one random type. Underdog combines one type with non-Shadow and/or
non-Legendary/Mythical/Ultra Beast restrictions. Generated conditions avoid obvious
contradictions but cannot guarantee a usable collection. Search terms follow
[Pokémon GO's official inventory search help](https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/1486-searching-filtering-your-pokemon-inventory/).

Manual validation catches malformed fields, direct AND-term contradictions, Shadow
plus Purified and impossible CP ranges. Complex custom searches and consistency
between written rules and search are **not fully parsed**; warnings ask the host to
check. A missing search is allowed for rules enforced manually.

Round generation reports errors per card. A failed reroll preserves the previous
assignment and allowance, records an error and leaves undo/host reroll/edit available.
Reset restores initially failed originals as errors rather than disguising them.

## Files and isolation

All files live in `experiments/chaos-lobby-demo/`:

- `index.html`: GitHub Pages/local entry linking to the static demo page.
- `templates/chaos_demo.html`: dark static UI and override dialog, with no template syntax.
- `static/chaos_demo_engine.js`: browser generator, role definitions and override validation.
- `static/chaos_demo.js`: state, host controls, originals, undo and event history.
- `README.md`: instructions, semantics, limits and proposed future integration.
- `test_demo_engine.js`: focused Node generator/validation regression tests.
- `test_demo.py`: static path checks and optional standard-library preview checks.
- `app.py`: optional local static preview on port 8010; no Flask dependency.
- `demo_engine.py`: retained scaffold filename pointing to the browser engine; no Python rule policy.
- `requirements.txt`: records that no third-party dependencies are needed.
- `.gitignore`: ignores local bytecode and the earlier development virtual environment.
- `smoke-test.png`: screenshot of the six-player browser smoke test.

**No production files were changed for this prototype.** Unrelated local changes were
left as found. There are no shared assets/templates, routes, imports, rule engines,
session files, custom cups, results, databases or multiplayer connections. No files
were deleted or moved. The old ignored development `.venv/` remains on disk but is
unused by this static version and is not needed for running or publishing it.

## Checks

From the repository root, with Node 18+ and Python 3.10+ for development checks only:

```sh
node experiments/chaos-lobby-demo/test_demo_engine.js
node --check experiments/chaos-lobby-demo/static/chaos_demo.js
python -m unittest discover -s experiments/chaos-lobby-demo -v
```

Tests cover role constraints, 2–6-player variety, independent assignments, fixed and
flexible leagues, broken-role isolation, generated validity, custom overrides,
contradictions, relative static assets and absence of API/template dependencies.
Browser smoke checks also cover add/remove, per-player reroll/edit/undo, originals,
reset/new-round recovery and event history.

Verified during implementation: all 10 browser-engine tests and 4 static-preview
checks passed. A manual browser smoke test through the optional static server added
six players and exercised isolated reroll, manual edits, contradictory-edit rejection,
per-player undo, original preservation, reset, new-round undo, player removal recovery,
mid-round additions, duplicate-name rejection and event logging. Browser console errors
were absent. The browser automation tool does not allow `file://` navigation, so direct
file opening was checked through relative asset/template checks rather than automated
file-origin browser interaction. GitHub Pages has not been deployed or live-tested.

## Known gameplay/design limits

- Personal league caps do not configure a real shared Pokémon GO battle. Hosts must
  agree a compatible format; Great-capped teams may be disadvantaged against Ultra.
- Type restrictions may leave fewer than three usable Pokémon. There is no inventory,
  species eligibility, move or balance database.
- Illustrative roles repeat beyond five players and can repeat across new rounds.
- Reroll allowances follow the player's round budget rather than a newly rolled
  role's default. This is explained in the UI and needs playtesting.
- Manual role/rule/search fields can diverge. A full search expression parser is
  outside the demo; the host enforces custom rules.
- English search terms are used; CP filtering alone does not prove battle eligibility.
- Every tab is independent. Reload/close loses everything. The visible global journal
  shows the latest 30 events; in-memory history and undo are unbounded for a short demo.
- No multiplayer synchronization, results tracking, joining or account flow exists.

## Future integration points (proposals only)

- Agree a shared battle format, then express asymmetric personal pools/caps within it.
- Map demo IDs to existing session players. Keep lobby settings, originals, current
  overrides and audit history separate in a versioned session schema.
- Adapt the production generator/search builder behind the per-player operation only
  after role compatibility and reroll semantics have been playtested.
- Add session-authorized host controls and synchronization of one-player changes;
  connect results only after defining how reset/undo affect submitted outcomes.
- Playtest collection sizes, role strength and reroll budgets with real players.

None of those integrations or balancing proposals has been implemented.
