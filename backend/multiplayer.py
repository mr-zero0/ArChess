"""
ARCHESS - Real-Time Tactical Multiplayer Room Engine
Handles dynamic room creation, invite codes, player assignment (White vs Black vs Spectator),
live aiming previews, turn-locked slingshot launch vectors, and ping latency measurement.
"""

import time
import json
import random
import string
import threading
from typing import Dict, List, Optional, Any


def generate_room_id(length: int = 6) -> str:
    """Generate a clean 6-character room identifier, e.g. ARC-729."""
    chars = string.ascii_uppercase + string.digits
    chars = chars.replace('O', '').replace('0', '').replace('I', '').replace('1', '')
    suffix = ''.join(random.choices(chars, k=3)) + '-' + ''.join(random.choices(chars, k=3))
    return f"ARC-{suffix}"


class CombatRoom:
    def __init__(self, room_id: str, host_username: str = "Commander"):
        self.room_id = room_id
        self.created_at = time.time()
        self.host_username = host_username
        self.status = "waiting"  # "waiting", "in_combat", "finished"
        self.white_player: Optional[Dict[str, Any]] = None
        self.black_player: Optional[Dict[str, Any]] = None
        self.spectators: List[Dict[str, Any]] = []
        self.current_turn = "white"
        self.turns_elapsed = 0
        self.lock = threading.RLock()
        self.last_activity = time.time()
        self.match_started_at: Optional[float] = None
        self.winner: Optional[str] = None

    def add_connection(self, ws: Any, username: str, preferred_role: Optional[str] = None) -> str:
        with self.lock:
            self.last_activity = time.time()
            clean_user = (username or "Anonymous").strip()[:30]

            # Reconnection check: if this user was already white or black with a stale socket
            if self.white_player and self.white_player.get("username") == clean_user:
                self.white_player["ws"] = ws
                return "white"
            if self.black_player and self.black_player.get("username") == clean_user:
                self.black_player["ws"] = ws
                return "black"

            # Assign White (host / first player)
            if self.white_player is None and preferred_role != "black" and preferred_role != "spectator":
                self.white_player = {"ws": ws, "username": clean_user, "joined_at": time.time()}
                return "white"

            # Assign Black (challenger / second player)
            if self.black_player is None and preferred_role != "spectator":
                self.black_player = {"ws": ws, "username": clean_user, "joined_at": time.time()}
                self.status = "in_combat"
                if not self.match_started_at:
                    self.match_started_at = time.time()
                return "black"

            # Assign Spectator
            self.spectators.append({"ws": ws, "username": clean_user, "joined_at": time.time()})
            return "spectator"

    def remove_connection(self, ws: Any) -> Optional[str]:
        with self.lock:
            self.last_activity = time.time()
            departed_role = None

            if self.white_player and self.white_player.get("ws") == ws:
                departed_role = "white"
                self.white_player["ws"] = None
            elif self.black_player and self.black_player.get("ws") == ws:
                departed_role = "black"
                self.black_player["ws"] = None
            else:
                self.spectators = [s for s in self.spectators if s.get("ws") != ws]

            return departed_role

    def broadcast(self, payload: Dict[str, Any], exclude_ws: Optional[Any] = None) -> None:
        raw = json.dumps(payload)
        recipients = []

        with self.lock:
            if self.white_player and self.white_player.get("ws"):
                recipients.append(self.white_player["ws"])
            if self.black_player and self.black_player.get("ws"):
                recipients.append(self.black_player["ws"])
            for s in self.spectators:
                if s.get("ws"):
                    recipients.append(s["ws"])

        for target in recipients:
            if target != exclude_ws:
                try:
                    target.send(raw)
                except Exception:
                    pass

    def get_summary(self) -> Dict[str, Any]:
        with self.lock:
            return {
                "room_id": self.room_id,
                "host_username": self.host_username,
                "status": self.status,
                "created_at": self.created_at,
                "current_turn": self.current_turn,
                "turns_elapsed": self.turns_elapsed,
                "white": {
                    "username": self.white_player["username"] if self.white_player else None,
                    "connected": bool(self.white_player and self.white_player.get("ws"))
                },
                "black": {
                    "username": self.black_player["username"] if self.black_player else None,
                    "connected": bool(self.black_player and self.black_player.get("ws"))
                },
                "spectators_count": len(self.spectators),
                "winner": self.winner
            }

    def handle_message(self, ws: Any, role: str, raw_data: str) -> None:
        self.last_activity = time.time()
        try:
            msg = json.loads(raw_data)
        except Exception:
            return

        mtype = msg.get("type")

        # 1. Ping / Pong Latency Check
        if mtype == "ping":
            try:
                ws.send(json.dumps({
                    "type": "pong",
                    "client_ts": msg.get("client_ts"),
                    "server_ts": round(time.time() * 1000)
                }))
            except Exception:
                pass
            return

        # 2. Slingshot Live Aim Preview (relay to opponent & spectators)
        if mtype == "aim":
            # Only allow aiming if it is currently this player's turn
            if role == self.current_turn:
                self.broadcast({
                    "type": "opponent_aim",
                    "role": role,
                    "pieceId": msg.get("pieceId"),
                    "angle": msg.get("angle"),
                    "powerRatio": msg.get("powerRatio"),
                    "screenX": msg.get("screenX"),
                    "screenY": msg.get("screenY")
                }, exclude_ws=ws)
            return

        # 3. Slingshot Aim Cancelled
        if mtype == "aim_cancel":
            if role == self.current_turn:
                self.broadcast({
                    "type": "opponent_aim_cancel",
                    "role": role
                }, exclude_ws=ws)
            return

        # 4. Piece Launch
        if mtype == "launch":
            if role == self.current_turn:
                self.turns_elapsed += 1
                self.broadcast({
                    "type": "opponent_launch",
                    "role": role,
                    "pieceId": msg.get("pieceId"),
                    "vx": msg.get("vx"),
                    "vy": msg.get("vy"),
                    "powerRatio": msg.get("powerRatio"),
                    "turn": self.turns_elapsed
                }, exclude_ws=ws)
            return

        # 5. Turn Complete Handshake
        if mtype == "turn_complete":
            next_turn = "black" if self.current_turn == "white" else "white"
            self.current_turn = next_turn
            self.broadcast({
                "type": "turn_update",
                "current_turn": self.current_turn,
                "turns_elapsed": self.turns_elapsed
            })
            return

        # 6. Match Victory / Defeat Settlement
        if mtype == "game_over":
            self.status = "finished"
            self.winner = msg.get("winner")
            self.broadcast({
                "type": "match_finished",
                "winner": self.winner,
                "reason": msg.get("reason", "CHECKMATE")
            })
            return

        # 7. Tactical Taunt / Quick Chat
        if mtype == "taunt":
            taunt_text = str(msg.get("text", "")).strip()[:80]
            if taunt_text:
                self.broadcast({
                    "type": "tactical_taunt",
                    "role": role,
                    "username": msg.get("username", role.capitalize()),
                    "text": taunt_text
                })
            return


class RoomManager:
    def __init__(self):
        self.rooms: Dict[str, CombatRoom] = {}
        self.lock = threading.RLock()

    def create_room(self, host_username: str = "Commander") -> CombatRoom:
        with self.lock:
            for _ in range(20):
                rid = generate_room_id()
                if rid not in self.rooms:
                    room = CombatRoom(rid, host_username)
                    self.rooms[rid] = room
                    return room
            # Fallback
            rid = f"ARC-{int(time.time() * 1000) % 1000000}"
            room = CombatRoom(rid, host_username)
            self.rooms[rid] = room
            return room

    def get_room(self, room_id: str) -> Optional[CombatRoom]:
        with self.lock:
            return self.rooms.get(room_id)

    def find_quick_match(self, username: str) -> CombatRoom:
        """Find an open waiting room or create a new one."""
        with self.lock:
            # Look for room waiting for an opponent
            for room in self.rooms.values():
                if room.status == "waiting" and room.white_player and not room.black_player:
                    if room.white_player.get("username") != username:
                        return room
            # No open room found, create one
            return self.create_room(username)

    def prune_stale_rooms(self, max_age_sec: float = 7200) -> int:
        now = time.time()
        pruned = 0
        with self.lock:
            to_remove = [
                rid for rid, r in self.rooms.items()
                if (now - r.last_activity) > max_age_sec and not r.white_player and not r.black_player
            ]
            for rid in to_remove:
                del self.rooms[rid]
                pruned += 1
        return pruned


# Global Singleton Room Manager
room_manager = RoomManager()
