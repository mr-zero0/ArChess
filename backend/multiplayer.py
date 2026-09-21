"""
ARCHESS - Real-Time Tactical Multiplayer Room Engine
Handles dynamic room creation, invite codes, player assignment (White vs Black vs Spectator),
live aiming previews, turn-locked slingshot launch vectors, and ping latency measurement.
"""

import os
import math
import time
import json
import random
import string
import secrets
import threading
from typing import Dict, List, Optional, Any


class RedisRelay:
    """Optional Pub/Sub bridge for multi-worker / multi-container cluster state distribution."""
    def __init__(self, redis_url: Optional[str] = None):
        self.redis_url = redis_url if redis_url is not None else os.environ.get("REDIS_URL")
        self.active = False
        self._client = None
        if self.redis_url:
            try:
                import redis
                self._client = redis.from_url(self.redis_url)
                self.active = True
            except Exception:
                self.active = False

    def publish_room_event(self, room_id: str, payload: Dict[str, Any]) -> bool:
        if self.active and self._client:
            try:
                self._client.publish(f"archess:room:{room_id}", json.dumps(payload))
                return True
            except Exception:
                return False
        return False


redis_relay = RedisRelay()




def generate_room_id(length: int = 6) -> str:
    """Generate a clean 6-character room identifier, e.g. ARC-729."""
    chars = string.ascii_uppercase + string.digits
    chars = chars.replace('O', '').replace('0', '').replace('I', '').replace('1', '')
    suffix = ''.join(secrets.choice(chars) for _ in range(3)) + '-' + ''.join(secrets.choice(chars) for _ in range(3))
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

        # Relay to Redis Pub/Sub cluster if configured
        redis_relay.publish_room_event(self.room_id, payload)

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
        if not raw_data or len(raw_data) > 65536:
            return
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

        # 4. Piece Launch (with Anti-Cheat Physical Clamping & Sanitization)
        if mtype == "launch":
            if role == self.current_turn:
                try:
                    raw_vx = float(msg.get("vx", 0.0))
                    raw_vy = float(msg.get("vy", 0.0))
                    raw_power = float(msg.get("powerRatio", 0.0))
                    if math.isnan(raw_vx) or math.isinf(raw_vx):
                        raw_vx = 0.0
                    if math.isnan(raw_vy) or math.isinf(raw_vy):
                        raw_vy = 0.0
                    if math.isnan(raw_power) or math.isinf(raw_power):
                        raw_power = 0.0
                except (ValueError, TypeError):
                    raw_vx, raw_vy, raw_power = 0.0, 0.0, 0.0

                clamped_vx = max(-150.0, min(150.0, raw_vx))
                clamped_vy = max(-150.0, min(150.0, raw_vy))
                clamped_power = max(0.0, min(1.0, raw_power))

                self.turns_elapsed += 1
                self.broadcast({
                    "type": "opponent_launch",
                    "role": role,
                    "pieceId": msg.get("pieceId"),
                    "vx": clamped_vx,
                    "vy": clamped_vy,
                    "powerRatio": clamped_power,
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
                "type": "game_over",
                "winner": self.winner,
                "reason": msg.get("reason", "checkmate"),
                "turns": self.turns_elapsed
            })
            return

        # 7. Dynamic Combat Emote Reaction (broadcast to all room occupants)
        if mtype == "reaction":
            emoji = str(msg.get("emoji", "⚔️"))[:8]
            sender_name = str(msg.get("username", role))[:30]
            self.broadcast({
                "type": "reaction",
                "role": role,
                "username": sender_name,
                "emoji": emoji,
                "originX": msg.get("originX"),
                "originY": msg.get("originY")
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


class MatchmakingTicket:
    def __init__(self, ticket_id: str, username: str, elo: int = 1200, mode: str = "3d-arena", preferred_role: Optional[str] = None):
        self.ticket_id = ticket_id
        self.username = username
        self.elo = elo
        self.mode = mode
        self.preferred_role = preferred_role
        self.created_at = time.time()
        self.status = "searching"  # "searching", "matched", "cancelled", "timeout"
        self.matched_room_id: Optional[str] = None
        self.assigned_role: Optional[str] = None
        self.matched_opponent: Optional[str] = None
        self.matched_opponent_elo: Optional[int] = None
        self.matched_at: Optional[float] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "ticket_id": self.ticket_id,
            "username": self.username,
            "elo": self.elo,
            "mode": self.mode,
            "status": self.status,
            "matched_room_id": self.matched_room_id,
            "assigned_role": self.assigned_role,
            "matched_opponent": self.matched_opponent,
            "matched_opponent_elo": self.matched_opponent_elo,
            "wait_time": round(time.time() - self.created_at, 1)
        }


class MatchmakingQueue:
    def __init__(self, room_mgr: RoomManager):
        self.room_mgr = room_mgr
        self.tickets: Dict[str, MatchmakingTicket] = {}
        self.lock = threading.RLock()

    def join_queue(self, username: str, elo: int = 1200, mode: str = "3d-arena", preferred_role: Optional[str] = None) -> MatchmakingTicket:
        clean_user = str(username or "Commander").strip()[:30]
        try:
            clean_elo = int(elo)
        except (ValueError, TypeError):
            clean_elo = 1200
        clean_mode = str(mode or "3d-arena").strip().lower()

        with self.lock:
            # Cancel any existing active searching ticket for this user
            for t in list(self.tickets.values()):
                if t.username == clean_user and t.status == "searching":
                    t.status = "cancelled"

            tid = f"MM-{int(time.time() * 1000) % 1000000}-{random.randint(100, 999)}"
            ticket = MatchmakingTicket(tid, clean_user, clean_elo, clean_mode, preferred_role)
            self.tickets[tid] = ticket

            # Evaluate matches immediately
            self.evaluate_matches()
            return ticket

    def get_ticket(self, ticket_id: str) -> Optional[Dict[str, Any]]:
        with self.lock:
            self.evaluate_matches()
            self.prune_expired_tickets()
            ticket = self.tickets.get(ticket_id)
            if ticket:
                return ticket.to_dict()
            return None

    def cancel_ticket(self, ticket_id: str) -> bool:
        with self.lock:
            ticket = self.tickets.get(ticket_id)
            if ticket and ticket.status == "searching":
                ticket.status = "cancelled"
                return True
            return False

    def evaluate_matches(self) -> int:
        matched_count = 0
        now = time.time()
        with self.lock:
            searching = [t for t in self.tickets.values() if t.status == "searching"]
            if len(searching) < 2:
                return 0

            # Sort searching tickets by wait time descending (longest waiting first)
            searching.sort(key=lambda t: t.created_at)

            paired = set()
            for i, t1 in enumerate(searching):
                if t1.ticket_id in paired or t1.status != "searching":
                    continue

                wait_sec = now - t1.created_at
                # Elo tolerance starts at 100 and widens by 50 every 3 seconds, capped at 600
                elo_window = min(600, 100 + int(wait_sec / 3.0) * 50)

                best_match = None
                min_elo_diff = float("inf")

                for j in range(i + 1, len(searching)):
                    t2 = searching[j]
                    if t2.ticket_id in paired or t2.status != "searching":
                        continue
                    if t2.username == t1.username:
                        continue  # Avoid self-matching
                    if t2.mode != t1.mode:
                        continue  # Ensure same game mode

                    elo_diff = abs(t1.elo - t2.elo)
                    if elo_diff <= elo_window and elo_diff < min_elo_diff:
                        min_elo_diff = elo_diff
                        best_match = t2

                if best_match:
                    t2 = best_match
                    paired.add(t1.ticket_id)
                    paired.add(t2.ticket_id)

                    room = self.room_mgr.create_room(host_username=t1.username)

                    # Role assignment based on preference or alternating
                    if t1.preferred_role == "black" or t2.preferred_role == "white":
                        role_1, role_2 = "black", "white"
                    else:
                        role_1, role_2 = "white", "black"

                    t1.status = "matched"
                    t1.matched_room_id = room.room_id
                    t1.assigned_role = role_1
                    t1.matched_opponent = t2.username
                    t1.matched_opponent_elo = t2.elo
                    t1.matched_at = now

                    t2.status = "matched"
                    t2.matched_room_id = room.room_id
                    t2.assigned_role = role_2
                    t2.matched_opponent = t1.username
                    t2.matched_opponent_elo = t1.elo
                    t2.matched_at = now

                    matched_count += 1

        return matched_count

    def prune_expired_tickets(self, max_wait_sec: float = 60.0) -> int:
        now = time.time()
        count = 0
        with self.lock:
            for t in self.tickets.values():
                if t.status == "searching" and (now - t.created_at) > max_wait_sec:
                    t.status = "timeout"
                    count += 1
            to_del = [tid for tid, t in self.tickets.items() if (now - t.created_at) > 600 and t.status != "searching"]
            for tid in to_del:
                del self.tickets[tid]
        return count

    def get_stats(self) -> Dict[str, Any]:
        with self.lock:
            searching = [t for t in self.tickets.values() if t.status == "searching"]
            return {
                "active_searching": len(searching),
                "total_tickets": len(self.tickets)
            }


# Global Singleton Matchmaking Queue
matchmaking_queue = MatchmakingQueue(room_manager)

