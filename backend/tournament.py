"""
ARCHESS - Knockout Tournament Championship Bracket Engine
Manages 8-commander single-elimination tournament seasons, ELO-weighted match simulations,
bracket tree navigation, and live round progressions.
"""

import time
import random
import math
from typing import Dict, List, Any, Optional
from backend.database import get_connection


def elo_win_probability(rating_a: float, rating_b: float) -> float:
    """Calculate standard Elo expected score probability."""
    return 1.0 / (1.0 + math.pow(10, (rating_b - rating_a) / 400.0))


class TournamentEngine:
    def __init__(self):
        self.season = 1
        self.status = "quarterfinals"  # "quarterfinals", "semifinals", "finals", "completed"
        self.bracket: Dict[str, Any] = {}
        self.winner: Optional[Dict[str, Any]] = None
        self.initialize_season()

    def get_seed_commanders(self) -> List[Dict[str, Any]]:
        """Fetch top 8 commanders from database, falling back to default elite roster."""
        commanders = []
        conn = None
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT id, username, elo_rating, avatar FROM users ORDER BY elo_rating DESC LIMIT 8")
            rows = cursor.fetchall()
            for r in rows:
                commanders.append({
                    "id": r["id"],
                    "username": r["username"],
                    "elo": r["elo_rating"],
                    "avatar": r["avatar"] or "king"
                })
        except Exception:
            pass
        finally:
            if conn:
                conn.close()

        # Fallback if fewer than 8 users
        default_roster = [
            {"id": 1, "username": "Vanguard_Prime", "elo": 2840, "avatar": "king"},
            {"id": 2, "username": "Magnus_Kinetic", "elo": 2795, "avatar": "queen"},
            {"id": 3, "username": "Hikaru_Impulse", "elo": 2760, "avatar": "knight"},
            {"id": 4, "username": "Basalt_Wall", "elo": 2650, "avatar": "rook"},
            {"id": 5, "username": "Prism_Sniper", "elo": 2580, "avatar": "bishop"},
            {"id": 6, "username": "Alpha_Zero_Kinetic", "elo": 2520, "avatar": "queen"},
            {"id": 7, "username": "Iron_Citadel", "elo": 2440, "avatar": "rook"},
            {"id": 8, "username": "Tactical_Cadet", "elo": 2350, "avatar": "pawn"},
        ]
        while len(commanders) < 8:
            commanders.append(default_roster[len(commanders)])

        return commanders[:8]

    def initialize_season(self, season_num: Optional[int] = None):
        """Initialize Quarterfinals with seeded bracket pairings (1 vs 8, 4 vs 5, 2 vs 7, 3 vs 6)."""
        if season_num is not None:
            self.season = season_num
        else:
            self.season = getattr(self, "season", 0) + 1

        seeds = self.get_seed_commanders()
        self.status = "quarterfinals"
        self.winner = None

        # Seeded match matchups
        qf_matches = [
            {
                "match_id": "QF-1",
                "round": "quarterfinals",
                "player1": {**seeds[0], "seed": 1},
                "player2": {**seeds[7], "seed": 8},
                "score1": 0, "score2": 0,
                "winner": None,
                "status": "pending"
            },
            {
                "match_id": "QF-2",
                "round": "quarterfinals",
                "player1": {**seeds[3], "seed": 4},
                "player2": {**seeds[4], "seed": 5},
                "score1": 0, "score2": 0,
                "winner": None,
                "status": "pending"
            },
            {
                "match_id": "QF-3",
                "round": "quarterfinals",
                "player1": {**seeds[1], "seed": 2},
                "player2": {**seeds[6], "seed": 7},
                "score1": 0, "score2": 0,
                "winner": None,
                "status": "pending"
            },
            {
                "match_id": "QF-4",
                "round": "quarterfinals",
                "player1": {**seeds[2], "seed": 3},
                "player2": {**seeds[5], "seed": 6},
                "score1": 0, "score2": 0,
                "winner": None,
                "status": "pending"
            }
        ]

        self.bracket = {
            "quarterfinals": qf_matches,
            "semifinals": [
                {"match_id": "SF-1", "round": "semifinals", "player1": None, "player2": None, "score1": 0, "score2": 0, "winner": None, "status": "waiting"},
                {"match_id": "SF-2", "round": "semifinals", "player1": None, "player2": None, "score1": 0, "score2": 0, "winner": None, "status": "waiting"}
            ],
            "finals": [
                {"match_id": "F-1", "round": "finals", "player1": None, "player2": None, "score1": 0, "score2": 0, "winner": None, "status": "waiting"}
            ]
        }

    def simulate_match(self, match: Dict[str, Any]) -> Dict[str, Any]:
        """Simulate match between player1 and player2 using Elo probabilities."""
        p1 = match["player1"]
        p2 = match["player2"]
        if not p1 or not p2:
            return match

        prob_p1 = elo_win_probability(p1["elo"], p2["elo"])
        # Best of 3 games
        wins1, wins2 = 0, 0
        while wins1 < 2 and wins2 < 2:
            if random.random() < prob_p1:
                wins1 += 1
            else:
                wins2 += 1

        match["score1"] = wins1
        match["score2"] = wins2
        match["winner"] = p1 if wins1 > wins2 else p2
        match["status"] = "completed"
        return match

    def advance_round(self) -> Dict[str, Any]:
        """Simulate and advance the active tournament round."""
        if self.status == "quarterfinals":
            # Simulate Quarterfinals
            for m in self.bracket["quarterfinals"]:
                if m["status"] != "completed":
                    self.simulate_match(m)

            # Seed Semifinals
            sf1_p1 = self.bracket["quarterfinals"][0]["winner"]
            sf1_p2 = self.bracket["quarterfinals"][1]["winner"]
            sf2_p1 = self.bracket["quarterfinals"][2]["winner"]
            sf2_p2 = self.bracket["quarterfinals"][3]["winner"]

            self.bracket["semifinals"][0]["player1"] = sf1_p1
            self.bracket["semifinals"][0]["player2"] = sf1_p2
            self.bracket["semifinals"][0]["status"] = "pending"

            self.bracket["semifinals"][1]["player1"] = sf2_p1
            self.bracket["semifinals"][1]["player2"] = sf2_p2
            self.bracket["semifinals"][1]["status"] = "pending"

            self.status = "semifinals"

        elif self.status == "semifinals":
            # Simulate Semifinals
            for m in self.bracket["semifinals"]:
                if m["status"] != "completed":
                    self.simulate_match(m)

            # Seed Finals
            f_p1 = self.bracket["semifinals"][0]["winner"]
            f_p2 = self.bracket["semifinals"][1]["winner"]

            self.bracket["finals"][0]["player1"] = f_p1
            self.bracket["finals"][0]["player2"] = f_p2
            self.bracket["finals"][0]["status"] = "pending"

            self.status = "finals"

        elif self.status == "finals":
            # Simulate Finals
            f_match = self.bracket["finals"][0]
            if f_match["status"] != "completed":
                self.simulate_match(f_match)

            self.winner = f_match["winner"]
            self.status = "completed"

        return self.get_summary()

    def get_summary(self) -> Dict[str, Any]:
        return {
            "season": self.season,
            "status": self.status,
            "winner": self.winner,
            "bracket": self.bracket
        }


# Global Singleton Tournament Instance
tournament_engine = TournamentEngine()
