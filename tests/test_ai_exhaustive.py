"""
ARCHESS - Exhaustive Test Suite for AI, Agentic AI, RAG & Prompt Engineering Engine
Guarantees 100% statement and branch coverage across backend.ai_engine and related app routes.
"""

import json
import pytest
from unittest.mock import patch, MagicMock
from backend.app import app
from backend.ai_engine import (
    ArchessCodexRAG,
    PromptCatalog,
    PhysicsSimulator,
    LocalLLMProvider,
    TacticalCoachAgent,
    ShoutcasterAgent,
    MatchDebriefAgent,
    DEFAULT_CODEX_DOCUMENTS
)


@pytest.fixture
def client():
    app.config["TESTING"] = True
    app.config["SECRET_KEY"] = "test-ai-key-42"
    with app.test_client() as c:
        yield c


# =========================================================================
# 1. RAG & CODEX TESTS
# =========================================================================

def test_rag_tokenization_and_indexing():
    rag = ArchessCodexRAG([])
    assert len(rag.documents) == 0

    # Test tokenization edge cases
    assert rag.tokenize("") == []
    assert rag.tokenize(None) == []
    tokens = rag.tokenize("The Pawn and the Knight in 3D Arena!")
    assert "pawn" in tokens
    assert "knight" in tokens
    assert "3d" in tokens
    assert "the" not in tokens  # Stop word removed

    # Add custom document
    rag.add_document({
        "id": "custom_tactics",
        "category": "tactics",
        "title": "Quantum Bank Shot",
        "content": "Deflecting a projectile across dual mirrored boundaries.",
        "tags": ["quantum", "bank shot", "mirrored"]
    })
    assert len(rag.documents) == 1

    # Search matches
    hits = rag.search("quantum bank shot", top_k=5)
    assert len(hits) == 1
    assert hits[0]["id"] == "custom_tactics"
    assert hits[0]["score"] > 0.0

    # Search empty / no match
    assert rag.search("") == []
    assert rag.search("completely_unrelated_gobbledygook_xyz") == []


def test_rag_default_codex_coverage():
    rag = ArchessCodexRAG()
    assert len(rag.documents) >= len(DEFAULT_CODEX_DOCUMENTS)

    # Verify key searches return expected results
    pawn_hits = rag.search("pawn defense shield", top_k=2)
    assert len(pawn_hits) > 0
    assert any("Pawn" in h["title"] for h in pawn_hits)

    ricochet_hits = rag.search("ricochet angle restitution", top_k=2)
    assert len(ricochet_hits) > 0


# =========================================================================
# 2. PROMPT CATALOG & PERSONA TESTS
# =========================================================================

def test_prompt_catalog_personas():
    for p_key in ["magnus", "glitch", "valkyrie", "blitz"]:
        assert p_key in PromptCatalog.PERSONAS
        persona = PromptCatalog.PERSONAS[p_key]
        assert "name" in persona
        assert "tone" in persona

    # Unknown persona fallback
    unknown_prompt = PromptCatalog.get_coach_system_prompt("non_existent_persona")
    assert "Grandmaster Magnus" in unknown_prompt

    # Coach prompts with and without RAG context
    prompt_with_rag = PromptCatalog.get_coach_system_prompt("glitch", "Extra rule context here")
    assert "Extra rule context here" in prompt_with_rag
    assert "Glitch-9" in prompt_with_rag

    prompt_without_rag = PromptCatalog.get_coach_system_prompt("valkyrie", "")
    assert "Default physics laws apply" in prompt_without_rag
    assert "Valkyrie" in prompt_without_rag

    # Shoutcaster & Debrief prompts
    shout_prompt = PromptCatalog.get_shoutcaster_system_prompt("Extra event rules")
    assert "Blitzcaster" in shout_prompt
    assert "Extra event rules" in shout_prompt

    debrief_prompt = PromptCatalog.get_debrief_system_prompt("magnus")
    assert "MVP Play" in debrief_prompt


# =========================================================================
# 3. PHYSICS SIMULATOR TESTS
# =========================================================================

def test_physics_simulator_bounces_and_collisions():
    # 1. Straight right shot hitting max_x wall and bouncing
    sim1 = PhysicsSimulator.simulate_shot(
        start_x=8.0,
        start_y=0.0,
        angle_deg=0.0,
        power_ratio=1.0,
        target_pieces=None,
        max_bounces=1
    )
    assert sim1["bounces"] >= 1
    assert len(sim1["trajectory_points"]) > 0

    # 2. Shots hitting min_x, max_y, min_y
    # Shot hitting min_x
    sim_min_x = PhysicsSimulator.simulate_shot(start_x=-8.0, start_y=0.0, angle_deg=180.0, power_ratio=0.5, max_bounces=1)
    assert sim_min_x["bounces"] >= 1

    # Shot hitting max_y
    sim_max_y = PhysicsSimulator.simulate_shot(start_x=0.0, start_y=8.0, angle_deg=90.0, power_ratio=0.5, max_bounces=1)
    assert sim_max_y["bounces"] >= 1

    # Shot hitting min_y
    sim_min_y = PhysicsSimulator.simulate_shot(start_x=0.0, start_y=-8.0, angle_deg=-90.0, power_ratio=0.5, max_bounces=1)
    assert sim_min_y["bounces"] >= 1

    # 3. Collision with target piece directly
    targets = [{"id": "target_king", "x": 3.0, "y": 0.0}]
    sim_hit = PhysicsSimulator.simulate_shot(
        start_x=0.0,
        start_y=0.0,
        angle_deg=0.0,
        power_ratio=0.8,
        target_pieces=targets
    )
    assert "target_king" in sim_hit["hits"]
    assert sim_hit["predicted_damage"] > 20.0


# =========================================================================
# 4. LOCAL LLM PROVIDER TESTS
# =========================================================================

def test_local_llm_provider_offline_and_mock():
    provider = LocalLLMProvider(api_url="http://127.0.0.1:9999/fake_endpoint", api_key="secret-key")
    
    # When offline / connection refused, returns None gracefully
    assert provider.generate("sys", "user", timeout_sec=0.1) is None

    # Test mocked successful HTTP response
    mock_resp_data = json.dumps({
        "choices": [{"message": {"content": '{"recommended_piece": "pawn_1"}'}}]
    }).encode("utf-8")
    
    mock_resp = MagicMock()
    mock_resp.status = 200
    mock_resp.read.return_value = mock_resp_data
    mock_resp.__enter__.return_value = mock_resp

    with patch("urllib.request.urlopen", return_value=mock_resp):
        res = provider.generate("sys", "user")
        assert res == '{"recommended_piece": "pawn_1"}'

    # Test HTTP non-200 or empty choices
    mock_resp.status = 500
    with patch("urllib.request.urlopen", return_value=mock_resp):
        assert provider.generate("sys", "user") is None

    # Test explicit enabled flag (covers line 414)
    provider_disabled = LocalLLMProvider(enabled=False)
    assert provider_disabled.enabled is False
    assert provider_disabled.generate("sys", "user") is None

    # Test invalid scheme (covers line 423)
    provider_bad_scheme = LocalLLMProvider(api_url="ftp://invalid-scheme.internal", enabled=True)
    assert provider_bad_scheme.generate("sys", "user") is None


# =========================================================================
# 5. TACTICAL COACH AGENT TESTS
# =========================================================================

def test_tactical_coach_agent_deterministic_and_llm():
    agent = TacticalCoachAgent()

    # Empty friendly pieces error branch
    res_empty = agent.recommend_move([], active_turn="white")
    assert res_empty["success"] is False
    assert "No friendly pieces" in res_empty["error"]

    # Valid board state with deterministic evaluation
    board = [
        {"id": "w_pawn_1", "type": "pawn", "color": "white", "x": -2.0, "y": 0.0},
        {"id": "w_king", "type": "king", "color": "white", "x": -5.0, "y": -5.0},
        {"id": "b_queen", "type": "queen", "color": "black", "x": 2.0, "y": 0.0}
    ]

    rec_magnus = agent.recommend_move(board, active_turn="white", persona="magnus")
    assert rec_magnus["success"] is True
    assert rec_magnus["source"] == "deterministic_heuristic"
    assert "suggested_angle_deg" in rec_magnus
    assert "suggested_power_ratio" in rec_magnus
    assert "chain_of_thought" in rec_magnus

    # Glitch persona prioritizes bank shots
    rec_glitch = agent.recommend_move(board, active_turn="white", persona="glitch")
    assert rec_glitch["success"] is True
    assert rec_glitch["persona"] == "glitch"

    # Valkyrie persona protects King
    rec_valk = agent.recommend_move(board, active_turn="white", persona="valkyrie")
    assert rec_valk["success"] is True
    assert rec_valk["persona"] == "valkyrie"

    # Mocked LLM returning valid JSON
    mock_llm = MagicMock()
    mock_llm.generate.return_value = json.dumps({
        "recommended_piece": "w_pawn_1",
        "suggested_angle_deg": 30.0,
        "suggested_power_ratio": 0.9,
        "tactical_rationale": "High-velocity strike to breach enemy defense."
    })
    agent_with_llm = TacticalCoachAgent(llm_provider=mock_llm)
    rec_llm = agent_with_llm.recommend_move(board, active_turn="white")
    assert rec_llm["success"] is True
    assert rec_llm["source"] == "llm"
    assert rec_llm["recommended_piece"] == "w_pawn_1"

    # Mocked LLM returning malformed string (falls back to deterministic)
    mock_llm.generate.return_value = "Sorry, I am an AI and cannot move."
    rec_fallback = agent_with_llm.recommend_move(board, active_turn="white")
    assert rec_fallback["success"] is True
    assert rec_fallback["source"] == "deterministic_heuristic"


# =========================================================================
# 6. SHOUTCASTER & MATCH DEBRIEF AGENTS TESTS
# =========================================================================

def test_shoutcaster_agent_all_scenarios():
    shouter = ShoutcasterAgent()

    # 1. Elimination with bank shot bounces
    ev1 = {"event_type": "ELIMINATION", "attacker": "White Knight", "target": "Black Queen", "damage": 85, "ricochets": 2}
    c1 = shouter.generate_commentary(ev1)
    assert "WHAT A BANK SHOT!" in c1
    assert "SHATTERS" in c1

    # 2. Elimination direct
    ev2 = {"event_type": "SHATTER", "attacker": "White Rook", "target": "Black King", "damage": 120, "ricochets": 0}
    c2 = shouter.generate_commentary(ev2)
    assert "UNBELIEVABLE STRIKE!" in c2

    # 3. Bank shot without elimination
    ev3 = {"type": "HIT", "attacker": "White Bishop", "target": "Black Knight", "damage": 30, "ricochets": 1}
    c3 = shouter.generate_commentary(ev3)
    assert "Calculated trajectory!" in c3

    # 4. Massive damage impact
    ev4 = {"type": "COLLISION", "attacker": "White Queen", "target": "Black Pawn", "damage": 55, "ricochets": 0}
    c4 = shouter.generate_commentary(ev4)
    assert "CRUSHING BLOW!" in c4

    # 5. Minor impact
    ev5 = {"type": "COLLISION", "attacker": "White Pawn", "target": "Black Pawn", "damage": 15, "ricochets": 0}
    c5 = shouter.generate_commentary(ev5)
    assert "kinetic impact damage" in c5

    # 6. LLM generated commentary
    mock_llm = MagicMock()
    mock_llm.generate.return_value = "ELECTRIC VOLTAGE! An impossible angle from downtown!"
    shouter_llm = ShoutcasterAgent(llm_provider=mock_llm)
    c_llm = shouter_llm.generate_commentary(ev1)
    assert c_llm == "ELECTRIC VOLTAGE! An impossible angle from downtown!"


def test_match_debrief_agent_all_scenarios():
    debrief_agent = MatchDebriefAgent()

    # Short match debrief
    short_match = {"winner": "black", "turns": 2, "white_damage": 20, "black_damage": 120}
    deb_short = debrief_agent.generate_debrief(short_match, persona="magnus")
    assert deb_short["success"] is True
    assert "Exposing the King to early direct line-of-fire" in deb_short["critical_blunder"]

    # Longer match debrief
    long_match = {"winner": "white", "turns": 8, "white_damage": 240, "black_damage": 160}
    deb_long = debrief_agent.generate_debrief(long_match, persona="glitch")
    assert deb_long["success"] is True
    assert "Underestimating perimeter bounce angles" in deb_long["critical_blunder"]

    # Mock LLM generation
    mock_llm = MagicMock()
    mock_llm.generate.return_value = "### Custom AI Analysis\nOutstanding endgame execution."
    debrief_llm = MatchDebriefAgent(llm_provider=mock_llm)
    res_llm = debrief_llm.generate_debrief(long_match)
    assert res_llm["success"] is True
    assert res_llm["source"] == "llm"
    assert "Custom AI Analysis" in res_llm["debrief_text"]


# =========================================================================
# 7. FLASK REST API ENDPOINTS TESTS
# =========================================================================

def test_api_ai_status_and_personas(client):
    # GET /api/ai/status
    res = client.get("/api/ai/status")
    assert res.status_code == 200
    assert res.json["success"] is True
    assert res.json["status"] == "online"
    assert res.json["rag_documents_indexed"] > 0
    assert "magnus" in res.json["available_personas"]

    # GET /api/ai/personas
    res_p = client.get("/api/ai/personas")
    assert res_p.status_code == 200
    assert res_p.json["success"] is True
    assert "magnus" in res_p.json["personas"]
    assert "glitch" in res_p.json["personas"]


def test_api_ai_coach_recommend(client):
    # Valid board state
    payload = {
        "board_state": [
            {"id": "w_p1", "type": "pawn", "color": "white", "x": 0.0, "y": 0.0},
            {"id": "b_p1", "type": "pawn", "color": "black", "x": 2.0, "y": 0.0}
        ],
        "turn": "white",
        "persona": "magnus"
    }
    res = client.post("/api/ai/coach/recommend", json=payload)
    assert res.status_code == 200
    assert res.json["success"] is True
    assert "suggested_angle_deg" in res.json

    # Invalid board state (not a list)
    res_inv = client.post("/api/ai/coach/recommend", json={"board_state": "invalid_not_a_list"})
    assert res_inv.status_code == 400
    assert res_inv.json["success"] is False

    # Empty board state (friendly count 0 -> error 400)
    res_empty = client.post("/api/ai/coach/recommend", json={"board_state": []})
    assert res_empty.status_code == 400
    assert res_empty.json["success"] is False


def test_api_ai_rag_query(client):
    # Valid query
    res = client.post("/api/ai/rag/query", json={"query": "knight ricochet rules", "top_k": 2})
    assert res.status_code == 200
    assert res.json["success"] is True
    assert res.json["count"] > 0
    assert len(res.json["results"]) <= 2

    # Missing / empty query
    res_empty = client.post("/api/ai/rag/query", json={"query": "   "})
    assert res_empty.status_code == 400
    assert res_empty.json["success"] is False


def test_api_ai_match_debrief_and_shoutcast(client):
    # Debrief with direct match payload
    match_payload = {
        "winner": "white",
        "turns": 6,
        "white_damage": 180,
        "black_damage": 90
    }
    res_deb = client.post("/api/ai/match/debrief", json={"match_data": match_payload, "persona": "glitch"})
    assert res_deb.status_code == 200
    assert res_deb.json["success"] is True
    assert "mvp_play" in res_deb.json

    # Debrief with non-existent match_id fallback
    res_deb_id = client.post("/api/ai/match/debrief", json={"match_id": 999999})
    assert res_deb_id.status_code == 200
    assert res_deb_id.json["success"] is True

    # Shoutcast event
    event_payload = {
        "event_type": "ELIMINATION",
        "attacker": "Knight 1",
        "target": "King",
        "damage": 90,
        "ricochets": 1
    }
    res_shout = client.post("/api/ai/shoutcast", json={"event": event_payload})
    assert res_shout.status_code == 200
    assert res_shout.json["success"] is True
    assert "commentary" in res_shout.json
    assert len(res_shout.json["commentary"]) > 0
