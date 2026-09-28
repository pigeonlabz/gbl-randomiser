from flask import (
    Flask, jsonify, request, render_template,
    redirect, url_for, send_file
)
import io
import qrcode
import os
from rules_engine import SESSIONS_DIR
from rules_engine import (
    create_session,
    load_session,
    advance_round,
    reroll_current_round,   # NEW
    LEAGUES,
    Player,
    save_session,
    load_custom_cups,
)


app = Flask(__name__)


# ---------- Web pages ----------


@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == "POST":
        # League is now chosen in Cup settings, default Master
        league_key = request.form.get("cup_league", "master")
        level_raw = request.form.get("randomness_level", "1")

        def parse_weight(name: str) -> int:
            val = request.form.get(name)
            if not val:
                return 0
            try:
                w = int(val)
            except ValueError:
                return 0
            return max(0, min(10, w))

        def w(enabled_field: str, weight_field: str) -> int:
            # If the checkbox is off, force this family to 0
            if not request.form.get(enabled_field):
                return 0
            return parse_weight(weight_field)

        # randomness_level still controls round count and defaults
        if level_raw in ("1", "2", "3"):
            randomness_level = int(level_raw)
            randomness_level = max(1, min(3, randomness_level))
        else:
            randomness_level = 1

        # Read Cup settings
        cup_enabled = bool(request.form.get("enable_cup"))
        cup_search = (request.form.get("cup_search") or "").strip()
        battle_limit_raw = request.form.get("battle_limit")
        battle_limit = None
        if battle_limit_raw:
            try:
                b_val = int(battle_limit_raw)
                if b_val > 0:
                    battle_limit = b_val
            except ValueError:
                battle_limit = None

        # Build rule weights from the UI
        rule_weights = {
            # BASIC
            "shiny_only":        w("enable_shiny",    "weight_shiny"),
            "legendary_only":    w("enable_legendary","weight_legendary"),
            "specific_cp":       w("enable_cp",       "weight_cp"),
            "type_allowed":      w("enable_type",     "weight_type"),
            "type_banned":       w("enable_type",     "weight_type"),
            "region_allowed":    w("enable_region",   "weight_region"),
            "region_banned":     w("enable_region",   "weight_region"),
            "move_type_allowed": w("enable_move",     "weight_move"),
            "move_type_banned":  w("enable_move",     "weight_move"),
            "shadow_filter":     w("enable_shadow",   "weight_shadow"),   # NEW
            "purified_filter":   w("enable_purified", "weight_purified"), # NEW
            "recent_catch":      w("enable_recent",   "weight_recent"),
            "xl_only":           w("enable_xl",       "weight_xl"),

            # EXPERIMENTAL
            "meta_moves_banned": w("enable_meta",     "weight_meta"),
            "mega_required":     w("enable_mega",     "weight_mega"),
            "buddy_only":        w("enable_buddy",    "weight_buddy"),
            "xs_only":           w("enable_xs",       "weight_xs"),
            "weather_only":      w("enable_weather",  "weight_weather"),
            "mega_lvl_only":     w("enable_mega_l",   "weight_mega_l"),
            "candy_count":       w("enable_candy",    "weight_candy"),
            "dex_suffix":        w("enable_dex",      "weight_dex"),
            "lucky_filter":      w("enable_lucky",    "weight_lucky"),    # NEW
        }



        if league_key not in LEAGUES:
            league_key = "master"

        # Create session with league + weights as usual
        new_session = create_session(
            league_key,
            randomness_level=randomness_level,
            rule_weights=rule_weights,
        )

        # Patch Cup data onto the session and prepend static filter
        session = load_session(new_session.session_id)
        if session:
            session.cup_enabled = cup_enabled
            session.cup_search = cup_search
            session.battle_limit = battle_limit

            base_rule = session.league_rule
            cp_prefix = getattr(base_rule, "cp_filter", "") or ""

            if cup_enabled and cup_search:
                if cp_prefix and cup_search:
                    combined_cp = f"{cp_prefix}&{cup_search}"
                else:
                    combined_cp = cup_search or cp_prefix
            else:
                combined_cp = cp_prefix

            from rules_engine import LeagueRule
            session.league_rule = LeagueRule(
                league=base_rule.league,
                display=base_rule.display,
                cp_filter=combined_cp,
            )

            save_session(session)

        return redirect(url_for("session_view", session_id=new_session.session_id))

    # GET: show form + list of existing sessions
    sessions = []
    if os.path.isdir(SESSIONS_DIR):
        for fname in sorted(os.listdir(SESSIONS_DIR)):
            if not fname.endswith(".json"):
                continue
            sid = fname[:-5]
            sessions.append(sid)

    custom_cups = load_custom_cups()
    return render_template("index.html", leagues=LEAGUES, sessions=sessions, custom_cups=custom_cups)


@app.route("/session/<session_id>")
def session_view(session_id):
    session = load_session(session_id)
    if not session:
        return "Session not found", 404

    join_url = request.host_url.rstrip("/") + url_for("join", session_id=session_id)

    return render_template(
        "session.html",
        session_id=session.session_id,
        league_display=session.league_rule.display,
        randomness_level=session.randomness_level,
        join_url=join_url,
    )


@app.route("/join/<session_id>", methods=["GET", "POST"])
def join(session_id):
    session = load_session(session_id)
    if not session:
        return "Session not found", 404

    if request.method == "GET":
        join_url = request.host_url.rstrip("/") + url_for("join", session_id=session_id)
        return render_template("join.html", session_id=session_id, join_url=join_url)

    # POST
    name = (request.form.get("name") or "").strip()
    avatar = (request.form.get("avatar") or "").strip() or "😀"

    if not name:
        return "Name required", 400

    # ensure unique-ish name within session
    existing_names = {p.name for p in session.players}
    base_name = name
    counter = 2
    while name in existing_names:
        name = f"{base_name} {counter}"
        counter += 1

    player = Player(name=name, avatar=avatar)
    session.players.append(player)
    save_session(session)

    return redirect(url_for("play", session_id=session_id, player_name=name))


@app.route("/play/<session_id>/<player_name>")
def play(session_id, player_name):
    session = load_session(session_id)
    if not session:
        return "Session not found", 404

    return render_template(
        "play.html",
        session_id=session_id,
        player_name=player_name,
    )


@app.route("/qrcode/<session_id>.png")
def qrcode_png(session_id):
    join_url = request.host_url.rstrip("/") + url_for("join", session_id=session_id)
    img = qrcode.make(join_url)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return send_file(buf, mimetype="image/png")


# ---------- JSON API ----------

@app.route("/api/session/<session_id>/result", methods=["POST"])
def api_record_result(session_id):
    session = load_session(session_id)
    if not session:
        return jsonify({"error": "session not found"}), 404

    data = request.get_json(silent=True) or {}
    round_number = int(data.get("round", session.current_round))
    winner = (data.get("winner") or "").strip()

    if not winner:
        winner = "skip"

    # get search string for that round
    round_state = next((r for r in session.rounds if r.round_number == round_number), None)
    search_string = round_state.search_string if round_state else ""

    from rules_engine import MatchResult  # import at top if you prefer

    # overwrite existing result for this round if present
    session.results = [r for r in session.results if r.round_number != round_number]
    session.results.append(MatchResult(round_number=round_number, winner=winner, search_string=search_string))
    save_session(session)

    return jsonify({"ok": True})


@app.route("/api/session/<session_id>/reroll", methods=["POST"])
def api_reroll_round(session_id):
    session = load_session(session_id)
    if not session:
        return jsonify({"error": "session not found"}), 404

    rs = reroll_current_round(session)
    if not rs:
        return jsonify({"error": "no round to reroll"}), 400

    return jsonify({
        "session_id": session.session_id,
        "round": rs.round_number,
        "search_string": rs.search_string,
        "rules": [
            {
                "kind": r.kind,
                "display": r.display,
                "search": r.search,
                "meta": r.meta,
            }
            for r in rs.final_rules
        ],
    })

@app.route("/api/session/<session_id>/state")
def api_session_state(session_id):
    session = load_session(session_id)
    if not session:
        return jsonify({"error": "session not found"}), 404

    current_round = session.rounds[-1] if session.rounds else None
    current_round_data = None
    if current_round:
        current_round_data = {
            "round": current_round.round_number,
            "search_string": current_round.search_string,
            "rules": [
                {
                    "kind": r.kind,
                    "display": r.display,
                    "search": r.search,
                    "meta": r.meta,
                }
                for r in current_round.final_rules
            ],
            "players": [
                p for p in [current_round.player1, current_round.player2] if p
            ],
        }

    # simple score tally
    scores = {}
    for p in session.players:
        scores[p.name] = 0
    for res in session.results:
        if res.winner in scores:
            scores[res.winner] += 1

    return jsonify({
        "session_id": session.session_id,
        "league_display": session.league_rule.display,
        "randomness_level": session.randomness_level,
        "players": [
            {"name": p.name, "avatar": p.avatar} for p in session.players
        ],
        "current_round": session.current_round,
        "current_round_data": current_round_data,
        "results": [
            {"round": r.round_number, "winner": r.winner, "search_string": r.search_string}
            for r in session.results
        ],
        "scores": scores,
    })


@app.route("/api/session/<session_id>/next_round", methods=["POST"])
def api_next_round(session_id):
    session = load_session(session_id)
    if not session:
        return jsonify({"error": "session not found"}), 404

    rs = advance_round(session)

    return jsonify({
        "session_id": session.session_id,
        "round": rs.round_number,
        "search_string": rs.search_string,
        "rules": [
            {
                "kind": r.kind,
                "display": r.display,
                "search": r.search,
                "meta": r.meta,
            }
            for r in rs.final_rules
        ],
        "players": [
            p for p in [rs.player1, rs.player2] if p
        ],
    })


if __name__ == "__main__":
    # avoids 5001, as requested
    app.run(host="0.0.0.0", port=8000, debug=True)