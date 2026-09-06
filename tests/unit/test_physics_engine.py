"""
Unit tests for Archess physics engine.
"""
import sys
import os

# Add the archess package to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'src'))

from archess.app.physics.physics_engine import PhysicsEngine, CollisionEvent
from archess.app.core.game_state import GameStateManager, Piece
from archess.app.config import game_config, physics_config


def create_test_game_state_with_pieces():
    """Create a test game state with two pieces positioned to collide."""
    game_state = GameStateManager()
    # Initialize the game to get the default pieces
    game_state.initialize_game()

    # Clear existing pieces to have a clean state
    game_state.pieces.clear()
    game_state.active_pieces.clear()
    game_state.player_pieces = {0: [], 1: []}

    # Create two pieces that will overlap
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
        position=(0.3, 0.0, 0.0),  # Close enough to collide (size ~0.5 each, so sum ~1.0)
        velocity=(0.0, 0.0, 0.0)
    )

    game_state.add_piece(piece_a)
    game_state.add_piece(piece_b)

    return game_state, piece_a, piece_b


def test_physics_engine_creation():
    """Test that physics engine can be created."""
    game_state = create_test_game_state_with_pieces()[0]
    physics_engine = PhysicsEngine(game_state)

    assert physics_engine.game_state == game_state
    assert physics_engine.time_step == 1.0 / game_config.target_fps
    assert not physics_engine.is_initialized  # Not initialized yet


def test_physics_engine_initialization():
    """Test that physics engine initializes correctly."""
    game_state = create_test_game_state_with_pieces()[0]
    physics_engine = PhysicsEngine(game_state)

    assert physics_engine.initialize() == True
    assert physics_engine.is_initialized == True


def test_physics_engine_update_no_collision():
    """Test physics update when no collision occurs."""
    game_state, piece_a, piece_b = create_test_game_state_with_pieces()
    # Move pieces far apart so they don't collide
    piece_a.position = (-2.0, 0.0, 0.0)
    piece_b.position = (2.0, 0.0, 0.0)

    physics_engine = PhysicsEngine(game_state)
    physics_engine.initialize()

    # Update with a small time step
    collisions = physics_engine.update(0.016)  # ~60 FPS

    assert isinstance(collisions, list)
    assert len(collisions) == 0  # No collision expected
    assert physics_engine.update_count == 1


def test_physics_engine_update_with_collision():
    """Test physics update when collision occurs."""
    game_state, piece_a, piece_b = create_test_game_state_with_pieces()
    # Pieces are already positioned to collide (0.3 units apart)

    physics_engine = PhysicsEngine(game_state)
    physics_engine.initialize()

    # Update with a small time step
    collisions = physics_engine.update(0.016)  # ~60 FPS

    assert isinstance(collisions, list)
    # Should detect at least one collision
    assert len(collisions) >= 1

    # Check that the collision event has the expected properties
    collision = collisions[0]
    assert isinstance(collision, CollisionEvent)
    assert collision.piece_a_id == "piece_a"
    assert collision.piece_b_id == "piece_b"
    # Position is on the surface of piece_a in the direction of the normal
    # piece_a at (0,0,0) with size 1.5, normal (1,0,0) => position at (1.5,0,0)
    assert abs(collision.position[0] - 1.5) < 0.1
    assert abs(collision.position[1]) < 0.003  # allow small floating point error
    assert abs(collision.position[2]) < 0.003  # allow small floating point error
    # Penetration should be positive (they are overlapping)
    assert collision.penetration > 0
    # Normal should point from A to B (approximately)
    assert collision.normal[0] > 0  # Positive X direction

    assert physics_engine.update_count == 1


def test_physics_engine_multiple_updates():
    """Test multiple physics updates."""
    game_state, piece_a, piece_b = create_test_game_state_with_pieces()

    physics_engine = PhysicsEngine(game_state)
    physics_engine.initialize()

    # Run several updates
    for i in range(5):
        collisions = physics_engine.update(0.016)
        # Just ensure it doesn't crash
        assert isinstance(collisions, list)

    assert physics_engine.update_count == 5


def test_physics_engine_cleanup():
    """Test physics engine cleanup."""
    game_state = create_test_game_state_with_pieces()[0]
    physics_engine = PhysicsEngine(game_state)
    physics_engine.initialize()

    assert physics_engine.is_initialized == True

    physics_engine.cleanup()

    assert physics_engine.is_initialized == False
    assert len(physics_engine.collision_events) == 0
    assert len(physics_engine.broad_pairs) == 0


def test_collision_event_dataclass():
    """Test CollisionEvent dataclass."""
    event = CollisionEvent(
        piece_a_id="a",
        piece_b_id="b",
        position=(1.0, 2.0, 3.0),
        normal=(0.0, 1.0, 0.0),
        penetration=0.5,
        relative_velocity=(0.0, 0.0, 0.0)
    )

    assert event.piece_a_id == "a"
    assert event.piece_b_id == "b"
    assert event.position == (1.0, 2.0, 3.0)
    assert event.normal == (0.0, 1.0, 0.0)
    assert event.penetration == 0.5
    assert event.relative_velocity == (0.0, 0.0, 0.0)
    # Timestamp should be set automatically
    assert isinstance(event.timestamp, float)
    assert event.timestamp > 0


if __name__ == "__main__":
    # Run tests
    test_physics_engine_creation()
    test_physics_engine_initialization()
    test_physics_engine_update_no_collision()
    test_physics_engine_update_with_collision()
    test_physics_engine_multiple_updates()
    test_physics_engine_cleanup()
    test_collision_event_dataclass()

    print("All physics engine tests passed!")