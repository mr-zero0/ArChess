"""
ArChess — Match Algebraic Notation, PGN & FEN Export Engine (v3.4.0)
Converts tactical combat telemetry, kinetic battle outcomes, and board arrangements
into standard Portable Game Notation (PGN) and Forsyth-Edwards Notation (FEN).
"""

import json
from datetime import datetime


def format_pgn_tag(key, value):
    """Format a single PGN header tag pair: [Key "Value"]."""
    escaped_val = str(value).replace('"', '\\"')
    return f'[{key} "{escaped_val}"]'


def get_pgn_result(winner):
    """Map match winner to standard chess result string."""
    w = str(winner).lower().strip() if winner else ""
    if w == "white":
        return "1-0"
    elif w == "black":
        return "0-1"
    elif w in ("draw", "stalemate"):
        return "1/2-1/2"
    return "*"


def generate_pgn(match):
    """
    Generate an authoritative Portable Game Notation (PGN) document from a match record.
    Supports extended ArChess tactical tags (damage output, duration, sudden death).
    """
    if not match:
        return ""

    created_at = match.get("created_at")
    if created_at:
        try:
            # Format ISO date into PGN standard YYYY.MM.DD
            dt = datetime.fromisoformat(str(created_at).replace("Z", "+00:00"))
            date_str = dt.strftime("%Y.%m.%d")
            time_str = dt.strftime("%H:%M:%S")
        except Exception:
            date_str = "????.??.??"
            time_str = "??:??:??"
    else:
        now = datetime.now()
        date_str = now.strftime("%Y.%m.%d")
        time_str = now.strftime("%H:%M:%S")

    winner = match.get("winner", "draw")
    result_str = get_pgn_result(winner)
    white_user = match.get("white_username", "Player 1")
    black_user = match.get("black_username", "ArChess Bot")
    turns = match.get("turns", 1)
    duration = match.get("duration_sec", 0)
    white_dmg = match.get("white_damage", 0)
    black_dmg = match.get("black_damage", 0)
    match_id = match.get("id", "0")

    termination = "Sovereign Elimination"
    if winner in ("draw", "stalemate"):
        termination = "Insufficient Material / Stalemate"

    # Assemble Standard & Tactical PGN Headers
    headers = [
        format_pgn_tag("Event", "ArChess Tactical Combat Season 3"),
        format_pgn_tag("Site", "ArChess Citadel Nexus (mr-zero0/ArChess)"),
        format_pgn_tag("Date", date_str),
        format_pgn_tag("Time", time_str),
        format_pgn_tag("Round", str(match_id)),
        format_pgn_tag("White", white_user),
        format_pgn_tag("Black", black_user),
        format_pgn_tag("Result", result_str),
        format_pgn_tag("Variant", "ArChess Physical Combat"),
        format_pgn_tag("Termination", termination),
        format_pgn_tag("Turns", str(turns)),
        format_pgn_tag("Duration", f"{duration}s"),
        format_pgn_tag("WhiteDamage", f"{white_dmg} HP"),
        format_pgn_tag("BlackDamage", f"{black_dmg} HP")
    ]

    header_block = "\n".join(headers)

    # Assemble Tactical Moves Block from Events
    events = match.get("events", [])
    move_lines = []
    
    tactical_events = []
    for ev in events:
        etype = ev.get("event_type")
        payload = ev.get("payload")
        if isinstance(payload, str):
            try:
                payload = json.loads(payload)
            except Exception:
                pass
        tactical_events.append((etype, payload))

    # Construct turn-annotated tactical moves
    turn_count = max(1, turns)
    current_move_num = 1
    
    if tactical_events:
        # Step through events and pair them into move numbers
        event_idx = 0
        while event_idx < len(tactical_events):
            # White sub-move
            ev_type, payload = tactical_events[event_idx]
            desc = str(payload.get("desc", payload.get("message", ev_type))) if isinstance(payload, dict) else str(payload)
            clean_desc = desc.replace("\n", " ").strip()
            
            # Map piece and action
            w_token = f"W_{ev_type}"
            if "LAUNCH" in ev_type:
                w_token = "W_KINETIC_LAUNCH"
            elif "COLLISION" in ev_type or "HIT" in ev_type:
                w_token = "W_IMPACT_STRIKE"
            elif "BREACH" in ev_type:
                w_token = "W_CITADEL_BREACH"
            elif "ELIMINATION" in ev_type:
                w_token = "W_SHATTER_X"

            move_text = f"{current_move_num}. {w_token} {{ {clean_desc} }}"
            event_idx += 1

            # Black sub-move if present
            if event_idx < len(tactical_events):
                b_type, b_payload = tactical_events[event_idx]
                b_desc = str(b_payload.get("desc", b_payload.get("message", b_type))) if isinstance(b_payload, dict) else str(b_payload)
                b_clean = b_desc.replace("\n", " ").strip()
                
                b_token = f"B_{b_type}"
                if "LAUNCH" in b_type:
                    b_token = "B_KINETIC_LAUNCH"
                elif "COLLISION" in b_type or "HIT" in b_type:
                    b_token = "B_IMPACT_STRIKE"
                elif "BREACH" in b_type:
                    b_token = "B_CITADEL_BREACH"
                elif "ELIMINATION" in b_type:
                    b_token = "B_SHATTER_X"

                move_text += f" {b_token} {{ {b_clean} }}"
                event_idx += 1

            move_lines.append(move_text)
            current_move_num += 1
    else:
        # Generate simulated chronological turn matrix
        for t in range(1, turn_count + 1):
            if t == turn_count and winner in ("white", "black"):
                if winner == "white":
                    move_lines.append(f"{t}. W_CHECKMATE_STRIKE {{ Sovereign white victory confirmed }}")
                else:
                    move_lines.append(f"{t}. W_TACTICAL_IMPULSE {{ Deflection strike }} B_CHECKMATE_STRIKE {{ Sovereign black victory confirmed }}")
            else:
                move_lines.append(f"{t}. W_KINETIC_STRIKE {{ Ballistic impulse }} B_KINETIC_COUNTER {{ Deflection rebound }}")

    moves_body = "\n".join(move_lines)
    full_pgn = f"{header_block}\n\n{moves_body} {result_str}\n"
    return full_pgn


def generate_fen(winner="white", turns=1):
    """
    Generate Forsyth-Edwards Notation (FEN) string representing the match conclusion.
    """
    w = str(winner).lower().strip() if winner else ""
    if w == "white":
        # White King intact on e1, Black King shattered
        return f"8/8/8/8/8/8/8/4K3 b - - 0 {max(1, turns)}"
    elif w == "black":
        # Black King intact on e8, White King shattered
        return f"4k3/8/8/8/8/8/8/8 w - - 0 {max(1, turns)}"
    else:
        # Both Kings alive in Sudden Death or Stalemate
        return f"4k3/8/8/8/8/8/8/4K3 w - - 0 {max(1, turns)}"
