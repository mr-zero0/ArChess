from game.game_state import GameState
from game.physics.state_hash import canonical_state, shot_hash, state_hash


def test_state_hash_is_deterministic_for_key_order():
    first = {"b": 2, "a": 1}
    second = {"a": 1, "b": 2}
    assert canonical_state(first) == canonical_state(second)
    assert state_hash(first) == state_hash(second)


def test_state_hash_changes_when_match_state_changes():
    state = GameState.new().snapshot()
    original = state_hash(state)
    state["pieces"][0]["hp"] -= 1
    assert state_hash(state) != original


def test_shot_hash_binds_intent_and_states():
    state = GameState.new().snapshot()
    intent = {"pieceId": state["pieces"][0]["id"], "dx": 1.5, "dy": -0.5}
    digest = shot_hash(state, intent, state)
    assert len(digest) == 64
    assert digest == shot_hash(state, intent, state)
    assert digest != shot_hash(state, {**intent, "dx": 1.6}, state)
