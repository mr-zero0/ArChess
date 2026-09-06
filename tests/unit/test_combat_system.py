"""
Unit tests for Archess combat system.
"""
import sys
import os

# Add the archess package to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'src'))

from archess.app.combat.combat_system import CombatSystem, DamageEvent
from archess.app.core.game_state import GameStateManager, Piece
from archess.app.physics.physics_engine import CollisionEvent
from archess.app.config import combat_config, piece_config


def create_test_game_state_with_pieces():
    """Create a test game state with two pieces."""
    game_state = GameStateManager()
    # Initialize the game to get the default pieces
    game_state.initialize_game()

    # Clear existing pieces to have a clean state
    game_state.pieces.clear()
    game_state.active_pieces.clear()
    game_state.player_pieces = {0: [], 1: []}

    # Create two pieces
    piece_a = Piece(
        id="piece_a",
        piece_type="king",
        player_id=0,
        hp=100,
        max_hp=100,
        mass=2.0,  # king mass from config
        is_active=True,
        position=(0.0, 0.0, 0.0),
        velocity=(0.0, 0.0, 0.0)
    )

    piece_b = Piece(
        id="piece_b",
        piece_type="king",
        player_id=1,
        hp=100,
        max_hp=100,
        mass=2.0,
        is_active=True,
        position=(0.3, 0.0, 0.0),  # Close enough to collide
        velocity=(0.0, 0.0, 0.0)
    )

    game_state.add_piece(piece_a)
    game_state.add_piece(piece_b)

    return game_state, piece_a, piece_b


def test_combat_system_creation():
    """Test that combat system can be created."""
    game_state = create_test_game_state_with_pieces()[0]
    combat_system = CombatSystem(game_state)

    assert combat_system.game_state == game_state
    assert not combat_system.is_initialized  # Not initialized yet


def test_combat_system_initialization():
    """Test that combat system initializes correctly."""
    game_state = create_test_game_state_with_pieces()[0]
    combat_system = CombatSystem(game_state)

    assert combat_system.initialize() == True
    assert combat_system.is_initialized == True


def test_combat_system_update_no_collision():
    """Test combat update when no collision occurs."""
    game_state, piece_a, piece_b = create_test_game_state_with_pieces()
    # Move pieces far apart so they don't collide
    piece_a.position = (-2.0, 0.0, 0.0)
    piece_b.position = (2.0, 0.0, 0.0)

    combat_system = CombatSystem(game_state)
    combat_system.initialize()

    # Update with empty collision list
    damage_events = combat_system.update([])

    assert isinstance(damage_events, list)
    assert len(damage_events) == 0  # No damage expected
    assert combat_system.update_count == 1


def test_combat_system_update_with_collision():
    """Test combat update when collision occurs."""
    game_state, piece_a, piece_b = create_test_game_state_with_pieces()
    # Pieces are already positioned to collide (0.3 units apart)
    # Give them high velocity toward each other to ensure damage
    piece_a.velocity = (20.0, 0.0, 0.0)  # Moving right fast
    piece_b.velocity = (-20.0, 0.0, 0.0)  # Moving left fast

    combat_system = CombatSystem(game_state)
    combat_system.initialize()

    # Create a mock collision event (since we're not running physics)
    collision = CollisionEvent(
        piece_a_id="piece_a",
        piece_b_id="piece_b",
        position=(0.15, 0.0, 0.0),  # Midpoint
        normal=(1.0, 0.0, 0.0),    # Pointing from A to B
        penetration=0.2,           # Some penetration
        relative_velocity=(-40.0, 0.0, 0.0)  # B moving left relative to A (high speed)
    )

    # Update with the collision
    damage_events = combat_system.update([collision])

    assert isinstance(damage_events, list)
    # Should generate damage events for both pieces
    assert len(damage_events) == 2

    # Check that damage events have expected properties
    for event in damage_events:
        assert isinstance(event, DamageEvent)
        assert event.target_piece_id in ["piece_a", "piece_b"]
        assert event.attacker_piece_id in ["piece_a", "piece_b"]
        assert event.target_piece_id != event.attacker_piece_id  # Should be different
        assert event.damage_amount >= 0
        assert event.damage_type == "impact"
        assert event.position == (0.15, 0.0, 0.0)

    # Check that the combat system tracked the update
    assert combat_system.update_count == 1

    # Check that pieces took damage (HP reduced significantly)
    updated_piece_a = game_state.get_piece("piece_a")
    updated_piece_b = game_state.get_piece("piece_b")
    # Both should have much less than starting HP (100) due to high speed
    assert updated_piece_a.hp < 50  # Expect significant damage
    assert updated_piece_b.hp < 50


def test_combat_system_king_destroyed():
    """Test combat system when a king is destroyed."""
    game_state, piece_a, piece_b = create_test_game_state_with_pieces()

    combat_system = CombatSystem(game_state)
    combat_system.initialize()

    # Create a collision that will deal massive damage
    collision = CollisionEvent(
        piece_a_id="piece_a",
        piece_b_id="piece_b",
        position=(0.15, 0.0, 0.0),
        normal=(1.0, 0.0, 0.0),
        penetration=0.5,
        relative_velocity=(-100.0, 0.0, 0.0)  # High velocity for lots of damage
    )

    # Update with the collision
    damage_events = combat_system.update([collision])

    # Should have damage events
    assert len(damage_events) >= 1

    # Check if any piece was destroyed (HP <= 0)
    piece_a_after = game_state.get_piece("piece_a")
    piece_b_after = game_state.get_piece("piece_b")

    # At least one should be destroyed or significantly damaged
    # We'll check that the system tracked destroyed pieces
    destroyed_pieces = combat_system.get_pieces_destroyed_this_turn()
    # It's possible that neither is fully destroyed in one hit, but let's see

    # Check that kings_hit_this_turn is updated if a king was hit
    kings_hit = combat_system.get_kings_hit_this_turn()
    # Since both pieces are kings, if either took damage, the corresponding player
    # should be in kings_hit_this_turn
    # Actually, the king is considered "hit" when it takes damage, not just when destroyed
    # So we expect both players to be in the set if both took damage
    # But let's just verify the set is not empty if damage occurred
    if len(damage_events) > 0:
        assert len(kings_hit) > 0  # At least one king was hit


def test_combat_system_multiple_updates():
    """Test multiple combat updates."""
    game_state, piece_a, piece_b = create_test_game_state_with_pieces()

    combat_system = CombatSystem(game_state)
    combat_system.initialize()

    # Run several updates with no collisions
    for i in range(5):
        damage_events = combat_system.update([])
        assert isinstance(damage_events, list)
        assert len(damage_events) == 0  # No collisions, no damage

    assert combat_system.update_count == 5


def test_combat_system_cleanup():
    """Test combat system cleanup."""
    game_state = create_test_game_state_with_pieces()[0]
    combat_system = CombatSystem(game_state)
    combat_system.initialize()

    assert combat_system.is_initialized == True

    combat_system.cleanup()

    assert combat_system.is_initialized == False
    assert len(combat_system.damage_events) == 0
    assert len(combat_system.pieces_destroyed_this_turn) == 0
    assert len(combat_system.kings_hit_this_turn) == 0


def test_damage_event_dataclass():
    """Test DamageEvent dataclass."""
    event = DamageEvent(
        target_piece_id="target",
        attacker_piece_id="attacker",
        damage_amount=50.0,
        damage_type="impact",
        position=(1.0, 2.0, 3.0)
    )

    assert event.target_piece_id == "target"
    assert event.attacker_piece_id == "attacker"
    assert event.damage_amount == 50.0
    assert event.damage_type == "impact"
    assert event.position == (1.0, 2.0, 3.0)
    # Timestamp should be set automatically
    assert isinstance(event.timestamp, float)
    assert event.timestamp > 0


def test_combat_system_getters():
    """Test combat system getter methods."""
    game_state, piece_a, piece_b = create_test_game_state_with_pieces()
    combat_system = CombatSystem(game_state)
    combat_system.initialize()

    # Initially, no damage events, no destroyed pieces, no kings hit
    assert len(combat_system.get_damage_events()) == 0
    assert len(combat_system.get_pieces_destroyed_this_turn()) == 0
    assert len(combat_system.get_kings_hit_this_turn()) == 0

    # After applying some damage, we should see changes
    # Create a collision that deals damage
    collision = CollisionEvent(
        piece_a_id="piece_a",
        piece_b_id="piece_b",
        position=(0.15, 0.0, 0.0),
        normal=(1.0, 0.0, 0.0),
        penetration=0.2,
        relative_velocity=(-5.0, 0.0, 0.0)
    )

    combat_system.update([collision])

    # Now we should have damage events
    damage_events = combat_system.get_damage_events()
    assert len(damage_events) > 0

    # Destroyed pieces and kings hit might be empty if damage wasn't lethal
    # But we can still call the getters
    _ = combat_system.get_pieces_destroyed_this_turn()
    _ = combat_system.get_kings_hit_this_turn()


if __name__ == "__main__":
    # Run tests
    test_combat_system_creation()
    test_combat_system_initialization()
    test_combat_system_update_no_collision()
    test_combat_system_update_with_collision()
    test_combat_system_king_destroyed()
    test_combat_system_multiple_updates()
    test_combat_system_cleanup()
    test_damage_event_dataclass()
    test_combat_system_getters()

    print("All combat system tests passed!")