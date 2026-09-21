"""
ARCHESS - Enterprise SRE Observability & Prometheus Metrics Engine
Lightweight, zero-external-dependency metrics collector and exposition engine.
Formats metrics conforming to Prometheus / OpenMetrics text exposition specifications.
"""

import time
import threading
from typing import Dict, Tuple


class MetricsEngine:
    """Thread-safe collector for server runtime, HTTP, WebSocket, and game telemetry."""

    def __init__(self):
        self._lock = threading.Lock()
        self.start_time = time.time()

        # Metrics storage
        self._http_requests: Dict[Tuple[str, str, int], int] = {}
        self._http_latency_sum_ms: Dict[str, float] = {}
        self._http_latency_count: Dict[str, int] = {}

        self._active_ws_connections: int = 0
        self._active_rooms: Dict[str, int] = {"waiting": 0, "in_combat": 0, "finished": 0}
        self._matchmaking_queue_depth: int = 0
        self._matches_settled: Dict[str, int] = {"white": 0, "black": 0, "draw": 0}
        self._security_events: Dict[str, int] = {}

    def record_request(self, method: str, endpoint: str, status_code: int, latency_ms: float = 0.0) -> None:
        """Record an incoming HTTP request transaction."""
        clean_method = (method or "GET").upper()
        clean_endpoint = endpoint or "/"
        clean_status = int(status_code)

        with self._lock:
            # Enforce max cardinality cap on endpoint keys to prevent memory exhaustion
            if len(self._http_latency_count) >= 250 and clean_endpoint not in self._http_latency_count:
                clean_endpoint = "other"

            key = (clean_method, clean_endpoint, clean_status)
            self._http_requests[key] = self._http_requests.get(key, 0) + 1

            self._http_latency_sum_ms[clean_endpoint] = self._http_latency_sum_ms.get(clean_endpoint, 0.0) + max(0.0, latency_ms)
            self._http_latency_count[clean_endpoint] = self._http_latency_count.get(clean_endpoint, 0) + 1

    def inc_websocket_connections(self) -> int:
        with self._lock:
            self._active_ws_connections += 1
            return self._active_ws_connections

    def dec_websocket_connections(self) -> int:
        with self._lock:
            self._active_ws_connections = max(0, self._active_ws_connections - 1)
            return self._active_ws_connections

    def set_websocket_connections(self, count: int) -> None:
        with self._lock:
            self._active_ws_connections = max(0, count)

    def set_active_rooms(self, waiting: int = 0, in_combat: int = 0, finished: int = 0) -> None:
        with self._lock:
            self._active_rooms["waiting"] = max(0, waiting)
            self._active_rooms["in_combat"] = max(0, in_combat)
            self._active_rooms["finished"] = max(0, finished)

    def set_matchmaking_queue_depth(self, depth: int) -> None:
        with self._lock:
            self._matchmaking_queue_depth = max(0, depth)

    def inc_matches_settled(self, winner: str) -> None:
        clean_winner = str(winner).lower()
        if clean_winner not in ("white", "black", "draw"):
            clean_winner = "draw"
        with self._lock:
            self._matches_settled[clean_winner] = self._matches_settled.get(clean_winner, 0) + 1

    def inc_security_event(self, event_type: str) -> None:
        clean_type = str(event_type).lower().strip()[:32]
        with self._lock:
            self._security_events[clean_type] = self._security_events.get(clean_type, 0) + 1

    def export_metrics(self) -> str:
        """Render metrics as standard Prometheus text exposition format."""
        now = time.time()
        uptime_sec = round(now - self.start_time, 2)

        lines = [
            "# HELP archess_uptime_seconds Total running time of the ArChess authoritative server.",
            "# TYPE archess_uptime_seconds gauge",
            f"archess_uptime_seconds {uptime_sec}",
            "",
            "# HELP archess_active_websocket_connections Number of live WebSocket clients currently connected.",
            "# TYPE archess_active_websocket_connections gauge",
        ]

        with self._lock:
            lines.append(f"archess_active_websocket_connections {self._active_ws_connections}")
            lines.append("")

            lines.append("# HELP archess_active_rooms Number of combat rooms categorized by game lifecycle state.")
            lines.append("# TYPE archess_active_rooms gauge")
            for status, count in self._active_rooms.items():
                lines.append(f'archess_active_rooms{{status="{status}"}} {count}')
            lines.append("")

            lines.append("# HELP archess_matchmaking_queue_depth Number of commanders currently awaiting matchmaking.")
            lines.append("# TYPE archess_matchmaking_queue_depth gauge")
            lines.append(f"archess_matchmaking_queue_depth {self._matchmaking_queue_depth}")
            lines.append("")

            lines.append("# HELP archess_matches_settled_total Cumulative total of finished kinetic chess matches.")
            lines.append("# TYPE archess_matches_settled_total counter")
            for winner, count in self._matches_settled.items():
                lines.append(f'archess_matches_settled_total{{winner="{winner}"}} {count}')
            lines.append("")

            if self._security_events:
                lines.append("# HELP archess_security_events_total Security shields triggered (rate limits, anti-cheat, session revocation).")
                lines.append("# TYPE archess_security_events_total counter")
                for stype, scount in self._security_events.items():
                    lines.append(f'archess_security_events_total{{type="{stype}"}} {scount}')
                lines.append("")

            lines.append("# HELP archess_http_requests_total Total count of HTTP transactions handled by endpoint, method, and status.")
            lines.append("# TYPE archess_http_requests_total counter")
            for (method, endpoint, status), count in sorted(self._http_requests.items()):
                lines.append(f'archess_http_requests_total{{endpoint="{endpoint}",method="{method}",status="{status}"}} {count}')
            lines.append("")

            lines.append("# HELP archess_http_request_duration_ms_sum Cumulative milliseconds spent processing endpoint requests.")
            lines.append("# TYPE archess_http_request_duration_ms_sum counter")
            for endpoint, total_ms in sorted(self._http_latency_sum_ms.items()):
                lines.append(f'archess_http_request_duration_ms_sum{{endpoint="{endpoint}"}} {round(total_ms, 2)}')
            lines.append("")

            lines.append("# HELP archess_http_request_duration_ms_count Count of measured requests for latency computation.")
            lines.append("# TYPE archess_http_request_duration_ms_count counter")
            for endpoint, count in sorted(self._http_latency_count.items()):
                lines.append(f'archess_http_request_duration_ms_count{{endpoint="{endpoint}"}} {count}')

        return "\n".join(lines) + "\n"


# Global metrics engine singleton
metrics_engine = MetricsEngine()

def get_metrics_engine() -> MetricsEngine:
    return metrics_engine
