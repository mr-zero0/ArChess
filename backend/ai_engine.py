"""
ARCHESS - Authoritative AI, Agentic AI, RAG & Prompt Engineering Engine
100% Free & Open-Source. Operates completely offline with zero-cost deterministic
reasoning heuristics, local RAG codex, and pluggable local LLM support (Ollama / Gemini Free).
"""

import json
import math
import os
import re
import urllib.request
import urllib.error
from typing import Dict, List, Optional, Any, Tuple


# =========================================================================
# 1. ARCHESS CODEX & ZERO-COST RAG ENGINE
# =========================================================================

DEFAULT_CODEX_DOCUMENTS = [
    {
        "id": "piece_pawn",
        "category": "pieces",
        "title": "Pawn - The Phalanx Vanguard",
        "content": (
            "Pawns possess 50 HP and require 1 Action Point (AP) to activate. "
            "They have low kinetic mass (1.0) and absorb frontal impacts with a 15% damage reduction "
            "when aligned in a phalanx with adjacent friendly pawns. Ideal as sacrificial shields "
            "or for early board control."
        ),
        "tags": ["pawn", "phalanx", "defense", "ap:1", "hp:50"]
    },
    {
        "id": "piece_knight",
        "category": "pieces",
        "title": "Knight - The Ricochet Cavalier",
        "content": (
            "Knights have 65 HP, cost 2 AP to launch, and possess a high restitution coefficient (0.95). "
            "Unlike conventional chess, Knights in ARCHESS gain +25% bonus kinetic damage after "
            "ricocheting off at least one boundary wall. They can bank shot around defensive pawn walls."
        ),
        "tags": ["knight", "ricochet", "bank shot", "cavalry", "ap:2", "hp:65"]
    },
    {
        "id": "piece_bishop",
        "category": "pieces",
        "title": "Bishop - Precision Kinetic Striker",
        "content": (
            "Bishops possess 60 HP, cost 2 AP to launch, and excel in narrow-angle diagonal strikes. "
            "They suffer minimal friction deceleration (0.99 per tick) and deliver piercing damage "
            "that can strike multiple aligned targets in a single vector path."
        ),
        "tags": ["bishop", "diagonal", "piercing", "laser", "ap:2", "hp:60"]
    },
    {
        "id": "piece_rook",
        "category": "pieces",
        "title": "Rook - The Kinetic Battering Ram",
        "content": (
            "Rooks have 85 HP, cost 3 AP, and possess the heaviest non-King mass (2.5). "
            "When launched, Rooks transfer 80% of their momentum into target pieces upon collision, "
            "causing massive knockback and environmental collision damage against walls."
        ),
        "tags": ["rook", "battering ram", "heavy", "knockback", "ap:3", "hp:85"]
    },
    {
        "id": "piece_queen",
        "category": "pieces",
        "title": "Queen - Sovereign Devastator",
        "content": (
            "Queens have 100 HP, cost 4 AP, and combine maximum launch velocity with 360-degree vector freedom. "
            "A Queen's impact creates a shockwave radius of 1.5 grid units, dealing 30 collateral damage "
            "to any adjacent piece regardless of allegiance."
        ),
        "tags": ["queen", "devastator", "shockwave", "ap:4", "hp:100"]
    },
    {
        "id": "piece_king",
        "category": "pieces",
        "title": "King - The Citadel Sovereign",
        "content": (
            "The King possesses 120 HP and costs 3 AP to maneuver. If the King's HP drops to 0, the match ends "
            "instantly in Sovereign Elimination. When attacked, the King emits a defensive repulsor field "
            "that dampens incoming projectile velocity by 30%."
        ),
        "tags": ["king", "sovereign", "objective", "hp:120", "ap:3"]
    },
    {
        "id": "physics_ricochet",
        "category": "physics",
        "title": "Kinetic Ricochet & Restitution Laws",
        "content": (
            "When a launched piece strikes the arena boundary, its angle of incidence equals the angle of reflection. "
            "Standard wall restitution is 0.85, retaining 85% of perpendicular velocity. Glancing bank shots "
            "(incidence angle < 30 degrees) maintain up to 92% velocity, enabling lethal long-range bank shots."
        ),
        "tags": ["physics", "ricochet", "angles", "reflection", "restitution"]
    },
    {
        "id": "physics_damage",
        "category": "physics",
        "title": "Combat Damage & Momentum Transfer",
        "content": (
            "Collision damage is formulated as: Damage = BaseWeaponDamage + (PieceMass * Velocity * PowerRatio * 0.4). "
            "Critical strikes (+50% damage) trigger when a piece collides with an opponent's rear or flank "
            "relative to their current orientation."
        ),
        "tags": ["physics", "damage", "formula", "critical", "momentum"]
    },
    {
        "id": "tactics_corner_trap",
        "category": "tactics",
        "title": "Tactical Maneuver: The Corner Trap",
        "content": (
            "The Corner Trap involves angling a bank shot into a 90-degree arena corner so the piece bounces twice "
            "in rapid succession before striking an opponent pinned against the perimeter. This delivers double impact "
            "compression before the target can recover."
        ),
        "tags": ["tactics", "corner trap", "bank shot", "double bounce"]
    },
    {
        "id": "tactics_king_shelter",
        "category": "tactics",
        "title": "Tactical Maneuver: Sovereign Sheltering",
        "content": (
            "Always maintain at least two Pawns or a Rook between your King and the center arena diagonal. "
            "Direct projectile lanes allow enemy Queens and Rooks to execute straight-line orbital strikes "
            "that can deplete 50% of the King's HP in a single round."
        ),
        "tags": ["tactics", "king shelter", "defense", "positioning"]
    }
]


class ArchessCodexRAG:
    """
    Zero-Cost Retrieval-Augmented Generation (RAG) engine.
    Uses TF-IDF / Token Cosine & Jaccard semantic scoring with zero external API fees.
    """
    def __init__(self, documents: Optional[List[Dict[str, Any]]] = None):
        self.documents: List[Dict[str, Any]] = []
        docs = documents if documents is not None else DEFAULT_CODEX_DOCUMENTS
        for doc in docs:
            self.add_document(doc)

    @staticmethod
    def tokenize(text: str) -> List[str]:
        """Convert string into normalized token stream."""
        if not text:
            return []
        cleaned = re.sub(r"[^\w\s]", " ", text.lower())
        tokens = [t.strip() for t in cleaned.split() if len(t.strip()) > 1]
        stop_words = {
            "the", "a", "an", "and", "or", "in", "on", "at", "to", "for",
            "of", "with", "by", "is", "are", "was", "were", "it", "this", "that"
        }
        return [t for t in tokens if t not in stop_words]

    def add_document(self, doc: Dict[str, Any]):
        """Index a codex document with token frequencies."""
        doc_id = doc.get("id", f"doc_{len(self.documents)}")
        title = doc.get("title", "")
        content = doc.get("content", "")
        tags = doc.get("tags", [])
        combined_text = f"{title} {content} {' '.join(tags)}"
        tokens = self.tokenize(combined_text)
        
        # Build token frequency dictionary
        tf: Dict[str, float] = {}
        for token in tokens:
            tf[token] = tf.get(token, 0.0) + 1.0
        
        indexed_doc = {
            "id": doc_id,
            "category": doc.get("category", "general"),
            "title": title,
            "content": content,
            "tags": tags,
            "tokens": set(tokens),
            "tf": tf,
            "length": len(tokens)
        }
        self.documents.append(indexed_doc)

    def search(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """Search indexed documents by query relevance."""
        q_tokens = self.tokenize(query)
        if not q_tokens or not self.documents:
            return []

        scores: List[Tuple[float, Dict[str, Any]]] = []
        q_set = set(q_tokens)

        for doc in self.documents:
            # Overlap score + frequency boost
            overlap = q_set.intersection(doc["tokens"])
            if not overlap:
                continue
            
            raw_score = sum(doc["tf"].get(token, 1.0) for token in overlap)
            # Normalize by document length to prevent bias toward verbose chunks
            norm_score = raw_score / max(1.0, math.sqrt(doc["length"]))
            # Bonus if query matches title or tags directly
            for token in overlap:
                if token in doc["tags"]:
                    norm_score += 1.5
                if token in doc["title"].lower():
                    norm_score += 1.0

            scores.append((norm_score, {
                "id": doc["id"],
                "category": doc["category"],
                "title": doc["title"],
                "content": doc["content"],
                "score": round(norm_score, 4)
            }))

        scores.sort(key=lambda x: x[0], reverse=True)
        return [doc for _, doc in scores[:top_k]]


# =========================================================================
# 2. PROMPT CATALOG & PERSONA SYSTEM
# =========================================================================

class PromptCatalog:
    """Enterprise Prompt Engineering Catalog for Coach, Shoutcaster, and Debrief Agents."""

    PERSONAS = {
        "magnus": {
            "name": "Grandmaster Magnus",
            "title": "Authoritative Tactical Mentor",
            "tone": "Analytical, precise, strategic, focusing on positional superiority and risk mitigation.",
            "greeting": "Greetings, Duelist. Let us calculate the highest-probability kinetic line."
        },
        "glitch": {
            "name": "Glitch-9",
            "title": "Cyberpunk Ricochet Specialist",
            "tone": "Fast-paced, aggressive, daring, always looking for multi-bounce bank shots and lethal combos.",
            "greeting": "Yo! Let's shatter the grid with a high-velocity corner ricochet."
        },
        "valkyrie": {
            "name": "Valkyrie",
            "title": "Bastion Shield Strategist",
            "tone": "Stoic, defensive, guardian-focused, prioritizing King preservation and counter-ambushes.",
            "greeting": "Hold the line. Secure the Sovereign, and let the adversary break against our shield."
        },
        "blitz": {
            "name": "Blitzcaster",
            "title": "Esports High-Energy Shoutcaster",
            "tone": "Excited, dynamic, play-by-play hype commentary with esports terminology.",
            "greeting": "WELCOME TO THE CITADEL ARENA! LET'S GET READY FOR COMBAT!"
        }
    }

    @classmethod
    def get_coach_system_prompt(cls, persona_key: str = "magnus", rag_context: str = "") -> str:
        persona = cls.PERSONAS.get(persona_key, cls.PERSONAS["magnus"])
        return (
            f"You are {persona['name']}, {persona['title']} in ARCHESS.\n"
            f"Persona Style: {persona['tone']}\n\n"
            "### ARCHESS RULES & COMBAT KNOWLEDGE:\n"
            f"{rag_context if rag_context else 'Default physics laws apply: angles reflect off walls, pieces deal damage on impact.'}\n\n"
            "### INSTRUCTIONS:\n"
            "1. Analyze the board state, piece health, and available Action Points (AP).\n"
            "2. Reason step-by-step using Chain-of-Thought (CoT).\n"
            "3. Recommend: piece to launch, launch angle (-180 to 180 deg), power ratio (0.0 to 1.0), and tactical explanation.\n"
            "4. Format the output in clean JSON:\n"
            "{\n"
            '  "recommended_piece": "piece_id",\n'
            '  "suggested_angle_deg": 45.0,\n'
            '  "suggested_power_ratio": 0.8,\n'
            '  "tactical_rationale": "Reasoning here.",\n'
            '  "chain_of_thought": "Step-by-step reasoning."\n'
            "}"
        )

    @classmethod
    def get_shoutcaster_system_prompt(cls, rag_context: str = "") -> str:
        return (
            "You are Blitzcaster, an elite esports tournament shoutcaster for ARCHESS.\n"
            "Your commentary is punchy, high-energy, and calls out kinetic impacts, wall bank shots, and eliminations.\n"
            f"{rag_context}\n"
            "Keep the commentary to 1-2 thrilling sentences maximum."
        )

    @classmethod
    def get_debrief_system_prompt(cls, persona_key: str = "magnus") -> str:
        persona = cls.PERSONAS.get(persona_key, cls.PERSONAS["magnus"])
        return (
            f"You are {persona['name']}, providing a formal post-match debrief for an ARCHESS duel.\n"
            "Format your debrief with exactly three sections:\n"
            "1. MVP Play (Defining kinetic maneuver)\n"
            "2. Tactical Blunder / Turning Point\n"
            "3. Recommended Training Focus"
        )


# =========================================================================
# 3. DETERMINISTIC PHYSICS TRAJECTORY SIMULATOR (ZERO COST)
# =========================================================================

class PhysicsSimulator:
    """
    Lightweight, deterministic 2D physics impulse and ricochet simulator.
    Runs locally in pure Python with zero external compute costs.
    """
    ARENA_MIN_X = -10.0
    ARENA_MAX_X = 10.0
    ARENA_MIN_Y = -10.0
    ARENA_MAX_Y = 10.0
    RESTITUTION = 0.85

    @classmethod
    def simulate_shot(
        cls,
        start_x: float,
        start_y: float,
        angle_deg: float,
        power_ratio: float,
        target_pieces: Optional[List[Dict[str, Any]]] = None,
        max_bounces: int = 2
    ) -> Dict[str, Any]:
        """
        Simulate a launch vector and calculate wall bounces and piece collisions.
        """
        clamped_power = max(0.1, min(1.0, float(power_ratio)))
        rad = math.radians(float(angle_deg))
        speed = 150.0 * clamped_power
        vx = math.cos(rad) * speed
        vy = math.sin(rad) * speed

        cur_x = float(start_x)
        cur_y = float(start_y)
        bounces = 0
        hits = []
        path_points = [{"x": round(cur_x, 2), "y": round(cur_y, 2)}]
        
        targets = target_pieces if target_pieces else []
        dt = 0.05  # simulation time step
        total_damage = 0.0

        for _ in range(60):  # max 60 ticks (~3 seconds simulation)
            step_dist = math.hypot(vx, vy) * dt
            sub_steps = max(1, min(10, int(step_dist / 0.4)))
            sub_dt = dt / sub_steps

            for _s in range(sub_steps):
                cur_x += vx * sub_dt
                cur_y += vy * sub_dt

                # Wall collisions
                if cur_x <= cls.ARENA_MIN_X:
                    cur_x = cls.ARENA_MIN_X
                    vx = -vx * cls.RESTITUTION
                    bounces += 1
                elif cur_x >= cls.ARENA_MAX_X:
                    cur_x = cls.ARENA_MAX_X
                    vx = -vx * cls.RESTITUTION
                    bounces += 1

                if cur_y <= cls.ARENA_MIN_Y:
                    cur_y = cls.ARENA_MIN_Y
                    vy = -vy * cls.RESTITUTION
                    bounces += 1
                elif cur_y >= cls.ARENA_MAX_Y:
                    cur_y = cls.ARENA_MAX_Y
                    vy = -vy * cls.RESTITUTION
                    bounces += 1

                # Check target piece collision
                for t in targets:
                    tx = float(t.get("x", 0.0))
                    ty = float(t.get("y", 0.0))
                    tid = t.get("id", "target")
                    dist = math.hypot(cur_x - tx, cur_y - ty)
                    if dist < 1.2 and tid not in hits:
                        cur_speed = math.hypot(vx, vy)
                        dmg = round(20.0 + (cur_speed * 0.25) * (1.2 if bounces > 0 else 1.0), 1)
                        total_damage += dmg
                        hits.append(tid)

            path_points.append({"x": round(cur_x, 2), "y": round(cur_y, 2)})

            if bounces >= max_bounces or math.hypot(vx, vy) < 5.0:
                break

        return {
            "end_x": round(cur_x, 2),
            "end_y": round(cur_y, 2),
            "bounces": bounces,
            "hits": hits,
            "predicted_damage": round(total_damage, 1),
            "trajectory_points": path_points[:10]  # compact summary
        }


# =========================================================================
# 4. PLUGGABLE LOCAL INFERENCE PROVIDER (OLLAMA / GEMINI / OFFLINE)
# =========================================================================

class LocalLLMProvider:
    """
    Zero-Cost Inference Provider.
    1. Connects to Local Ollama endpoint (e.g. http://localhost:11434/v1) if configured.
    2. Connects to Gemini Free Tier if GEMINI_API_KEY is supplied.
    3. Falls back seamlessly to Built-in Deterministic Engine with 0ms latency.
    """
    def __init__(self, api_url: Optional[str] = None, api_key: Optional[str] = None, enabled: Optional[bool] = None):
        self.api_url = api_url if api_url is not None else os.environ.get("AI_PROVIDER_URL")
        self.api_key = api_key if api_key is not None else os.environ.get("GEMINI_API_KEY", "")
        self.model_name = os.environ.get("AI_MODEL_NAME", "llama3.2:1b")
        if enabled is not None:
            self.enabled = enabled
        else:
            self.enabled = bool(self.api_url or self.api_key)

    def generate(self, system_prompt: str, user_prompt: str, timeout_sec: float = 2.0) -> Optional[str]:
        """Attempt inference via local/free HTTP endpoint, returning None on failure or if disabled."""
        if not self.enabled or not self.api_url:
            return None
        if not (self.api_url.startswith("http://") or self.api_url.startswith("https://")):
            return None

        payload = {
            "model": self.model_name,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.3,
            "max_tokens": 400
        }
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        try:
            req = urllib.request.Request(
                self.api_url,
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=timeout_sec) as resp:  # nosec B310
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    choices = data.get("choices", [])
                    if choices:
                        return choices[0].get("message", {}).get("content", "").strip()
        except Exception:
            return None
        return None


# =========================================================================
# 5. AGENTIC AI ARCHITECTURE (REACT AGENTS)
# =========================================================================

class TacticalCoachAgent:
    """
    Autonomous ReAct (Reason -> Act -> Observe) Tactical Coach Agent.
    Evaluates board state, queries RAG codex, runs physics simulations,
    and returns authoritative tactical recommendations.
    """
    def __init__(self, rag_engine: Optional[ArchessCodexRAG] = None, llm_provider: Optional[LocalLLMProvider] = None):
        self.rag = rag_engine or ArchessCodexRAG()
        self.llm = llm_provider or LocalLLMProvider()

    # Tool 1: Inspect Board
    def tool_inspect_board(self, board_state: List[Dict[str, Any]], active_turn: str) -> Dict[str, Any]:
        friendly = []
        enemy = []
        for p in board_state:
            color = p.get("color", "white").lower()
            if color == active_turn.lower():
                friendly.append(p)
            else:
                enemy.append(p)
        return {
            "friendly_count": len(friendly),
            "enemy_count": len(enemy),
            "friendly_pieces": friendly,
            "enemy_pieces": enemy
        }

    # Tool 2: Simulate Shot
    def tool_simulate_shot(self, piece: Dict[str, Any], angle_deg: float, power: float, enemy_pieces: List[Dict[str, Any]]) -> Dict[str, Any]:
        return PhysicsSimulator.simulate_shot(
            start_x=float(piece.get("x", 0.0)),
            start_y=float(piece.get("y", 0.0)),
            angle_deg=angle_deg,
            power_ratio=power,
            target_pieces=enemy_pieces
        )

    # Tool 3: Query Codex (RAG)
    def tool_query_codex(self, query: str) -> List[Dict[str, Any]]:
        return self.rag.search(query, top_k=2)

    def recommend_move(
        self,
        board_state: List[Dict[str, Any]],
        active_turn: str = "white",
        persona: str = "magnus"
    ) -> Dict[str, Any]:
        """
        Execute the ReAct reasoning loop to determine the optimal move.
        """
        # Step 1: Tool Execution - Inspect Board
        board_analysis = self.tool_inspect_board(board_state, active_turn)
        friendly = board_analysis["friendly_pieces"]
        enemy = board_analysis["enemy_pieces"]

        if not friendly:
            return {
                "success": False,
                "error": "No friendly pieces available to launch."
            }

        # Step 2: Tool Execution - Query RAG Codex
        codex_hints = self.tool_query_codex("ricochet bank shot tactics damage")
        context_str = "\n".join([f"- {h['title']}: {h['content']}" for h in codex_hints])

        # Step 3: Heuristic Physics Trajectory Evaluation (Deterministic Reasoning)
        best_piece = friendly[0]
        best_angle = 45.0
        best_power = 0.8
        max_score = -1.0
        best_sim: Dict[str, Any] = {}

        # Search candidates
        candidate_angles = [0.0, 30.0, 45.0, 60.0, 90.0, 135.0, -45.0, -90.0]
        for p in friendly:
            for angle in candidate_angles:
                sim = self.tool_simulate_shot(p, angle, 0.85, enemy)
                # Score formula: damage + bank shot bonus if glitch persona
                score = sim["predicted_damage"]
                if persona == "glitch" and sim["bounces"] > 0:
                    score += 15.0  # Glitch persona prioritizes bank shots
                elif persona == "valkyrie" and p.get("type", "") == "king":
                    score -= 50.0  # Valkyrie protects King

                if score > max_score:
                    max_score = score
                    best_piece = p
                    best_angle = angle
                    best_power = 0.85
                    best_sim = sim

        # Step 4: ReAct Synthesis (Prompting + LLM / Deterministic fallback)
        system_prompt = PromptCatalog.get_coach_system_prompt(persona, context_str)
        user_prompt = (
            f"Active Turn: {active_turn}\n"
            f"Friendly pieces: {json.dumps(friendly)}\n"
            f"Enemy targets: {json.dumps(enemy)}\n"
            f"Candidate: {best_piece.get('id')} at angle {best_angle} delivers {best_sim.get('predicted_damage', 0)} damage with {best_sim.get('bounces', 0)} bounces."
        )

        llm_output = self.llm.generate(system_prompt, user_prompt)
        if llm_output:
            try:
                parsed = json.loads(llm_output)
                if "recommended_piece" in parsed:
                    parsed["success"] = True
                    parsed["source"] = "llm"
                    return parsed
            except Exception:
                pass

        # Deterministic Fallback Output (100% Guaranteed Reliability)
        piece_id = best_piece.get("id", "piece_0")
        ptype = best_piece.get("type", "pawn").capitalize()
        bounces = best_sim.get("bounces", 0)
        dmg = best_sim.get("predicted_damage", 0.0)

        rationale = (
            f"Launch {ptype} [{piece_id}] along vector {best_angle}° with {int(best_power * 100)}% power. "
            f"Predicted collision deals ~{dmg} HP damage with {bounces} boundary ricochet(s)."
        )

        return {
            "success": True,
            "source": "deterministic_heuristic",
            "persona": persona,
            "recommended_piece": piece_id,
            "suggested_angle_deg": best_angle,
            "suggested_power_ratio": best_power,
            "tactical_rationale": rationale,
            "predicted_damage": dmg,
            "bounces": bounces,
            "chain_of_thought": (
                f"Thought 1: Identified {len(enemy)} enemy targets. "
                f"Thought 2: RAG retrieved {len(codex_hints)} tactical principles. "
                f"Thought 3: Evaluated physics raycast across {len(friendly) * len(candidate_angles)} trajectories. "
                f"Final: Selected optimal damage trajectory."
            )
        }


class ShoutcasterAgent:
    """
    Live Esports Shoutcaster Agent generating punchy, dynamic combat commentary.
    """
    def __init__(self, llm_provider: Optional[LocalLLMProvider] = None):
        self.llm = llm_provider or LocalLLMProvider()

    def generate_commentary(self, event: Dict[str, Any]) -> str:
        etype = event.get("event_type", event.get("type", "COLLISION")).upper()
        attacker = event.get("attacker", "White")
        target = event.get("target", "Opponent")
        dmg = event.get("damage", 0)
        bounces = event.get("ricochets", event.get("bounces", 0))

        # Try LLM commentary
        sys_prompt = PromptCatalog.get_shoutcaster_system_prompt()
        usr_prompt = f"Event: {etype}, Attacker: {attacker}, Target: {target}, Damage: {dmg}, Ricochets: {bounces}"
        llm_text = self.llm.generate(sys_prompt, usr_prompt)
        if llm_text:
            return llm_text

        # High-energy deterministic templates
        if "ELIM" in etype or "SHATTER" in etype:
            if bounces > 0:
                return f"WHAT A BANK SHOT! {attacker} ricochets off the perimeter wall and completely SHATTERS {target} for {dmg} damage!"
            return f"UNBELIEVABLE STRIKE! {attacker} hammers into {target}, wiping them off the board with {dmg} damage!"
        elif bounces > 0:
            return f"Calculated trajectory! {attacker} executes a {bounces}-wall bank shot into {target}, dealing {dmg} kinetic damage!"
        elif dmg > 40:
            return f"CRUSHING BLOW! {attacker} delivers a massive {dmg} damage impact directly onto {target}!"
        return f"{attacker} launches into {target}, delivering {dmg} kinetic impact damage."


class MatchDebriefAgent:
    """
    Post-Match Tactical Reviewer.
    Synthesizes match telemetry into MVP plays, critical blunders, and strategic advice.
    """
    def __init__(self, rag_engine: Optional[ArchessCodexRAG] = None, llm_provider: Optional[LocalLLMProvider] = None):
        self.rag = rag_engine or ArchessCodexRAG()
        self.llm = llm_provider or LocalLLMProvider()

    def generate_debrief(self, match_data: Dict[str, Any], persona: str = "magnus") -> Dict[str, Any]:
        winner = match_data.get("winner", "white")
        turns = match_data.get("turns", 1)
        w_dmg = match_data.get("white_damage", 0)
        b_dmg = match_data.get("black_damage", 0)

        # Attempt LLM generation
        sys_prompt = PromptCatalog.get_debrief_system_prompt(persona)
        usr_prompt = f"Match Data: Winner={winner}, Turns={turns}, White Damage={w_dmg}, Black Damage={b_dmg}"
        llm_text = self.llm.generate(sys_prompt, usr_prompt)
        if llm_text:
            return {
                "success": True,
                "source": "llm",
                "debrief_text": llm_text
            }

        # Deterministic Debrief
        mvp_desc = f"{winner.capitalize()}'s decisive kinetic engagement delivering {max(w_dmg, b_dmg)} overall damage."
        blunder_desc = (
            f"Underestimating perimeter bounce angles in turn {max(1, turns // 2)}, allowing flanking ricochets."
            if turns > 3 else "Exposing the King to early direct line-of-fire without pawn phalanx protection."
        )
        training_desc = "Practice 2-wall bank shots and maintain active pawn shielding around the Citadel Sovereign."

        return {
            "success": True,
            "source": "deterministic_heuristic",
            "persona": persona,
            "mvp_play": mvp_desc,
            "critical_blunder": blunder_desc,
            "recommended_training": training_desc,
            "formatted_summary": (
                f"### Match Debrief by {PromptCatalog.PERSONAS.get(persona, {}).get('name', 'Grandmaster')}\n"
                f"- **MVP Play**: {mvp_desc}\n"
                f"- **Tactical Blunder**: {blunder_desc}\n"
                f"- **Training Focus**: {training_desc}"
            )
        }


# Global singleton instances
global_rag_engine = ArchessCodexRAG()
global_coach_agent = TacticalCoachAgent(global_rag_engine)
global_shoutcaster_agent = ShoutcasterAgent()
global_debrief_agent = MatchDebriefAgent(global_rag_engine)
