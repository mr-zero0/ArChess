"""
Unit tests for Archess piece manager.
"""
import sys
import os

# Add the archess package to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'src'))

from archess.app.pieces.piece_manager import PieceManager, PieceStats
from archess.app.core.game_state import GameStateManager, Piece
from archess.app.config import piece_config


def create_test_game_state():
    """Create a test game state with some pieces."""
    game_state = GameStateManager()
    # Initialize the game to get pieces
    game_state.initialize_game()
    return game_state


def test_piece_manager_creation():
    """Test that piece manager can be created."""
    game_state = create_test_game_state()
    piece_manager = PieceManager(game_state)

    assert piece_manager.game_state == game_state
    # Note: logger is set but we won't test it here


def test_get_pieces_by_player():
    """Test getting pieces by player."""
    game_state = create_test_game_state()
    piece_manager = PieceManager(game_state)

    # Get pieces for player 0
    player0_pieces = piece_manager.get_pieces_by_player(0)
    # Should have pieces (the exact number depends on piece_config)
    assert len(player0_pieces) > 0
    # All pieces should belong to player 0
    for piece in player0_pieces.values():
        assert piece.player_id == 0

    # Get pieces for player 1
    player1_pieces = piece_manager.get_pieces_by_player(1)
    assert len(player1_pieces) > 0
    for piece in player1_pieces.values():
        assert piece.player_id == 1

    # No overlap between players
    player0_ids = set(player0_pieces.keys())
    player1_ids = set(player1_pieces.keys())
    assert len(player0_ids.intersection(player1_ids)) == 0


def test_get_active_pieces_by_player():
    """Test getting active pieces by player."""
    game_state = create_test_game_state()
    piece_manager = PieceManager(game_state)

    # Initially all pieces should be active
    active_p0 = piece_manager.get_active_pieces_by_player(0)
    active_p1 = piece_manager.get_active_pieces_by_player(1)

    all_p0 = piece_manager.get_pieces_by_player(0)
    all_p1 = piece_manager.get_pieces_by_player(1)

    # All pieces should be active initially
    assert len(active_p0) == len(all_p0)
    assert len(active_p1) == len(all_p1)

    # Deactivate a piece and test
    piece_id = list(active_p0.keys())[0]
    piece = game_state.get_piece(piece_id)
    piece.is_active = False
    # Also remove from active_pieces in game_state
    if piece_id in game_state.active_pieces:
        del game_state.active_pieces[piece_id]

    # Now active count should be one less
    active_p0_after = piece_manager.get_active_pieces_by_player(0)
    assert len(active_p0_after) == len(active_p0) - 1
    assert piece_id not in active_p0_after


def test_get_pieces_by_type():
    """Test getting pieces by type."""
    game_state = create_test_game_state()
    piece_manager = PieceManager(game_state)

    # Get kings
    kings = piece_manager.get_pieces_by_type("king")
    # Should have exactly 2 kings (one per player)
    assert len(kings) == 2
    for piece in kings.values():
        assert piece.piece_type == "king"

    # Get pawns
    pawns = piece_manager.get_pieces_by_type("pawn")
    # Should have multiple pawns
    assert len(pawns) > 0
    for piece in pawns.values():
        assert piece.piece_type == "pawn"


def test_get_king_piece():
    """Test getting king piece for a player."""
    game_state = create_test_game_state()
    piece_manager = PieceManager(game_state)

    # Get king for player 0
    king_p0 = piece_manager.get_king_piece(0)
    assert king_p0 is not None
    assert king_p0.piece_type == "king"
    assert king_p0.player_id == 0
    assert king_p0.is_active

    # Get king for player 1
    king_p1 = piece_manager.get_king_piece(1)
    assert king_p1 is not None
    assert king_p1.piece_type == "king"
    assert king_p1.player_id == 1
    assert king_p1.is_active

    # Kings should be different pieces
    assert king_p0.id != king_p1.id

    # Test with invalid player ID
    try:
        piece_manager.get_king_piece(2)
        assert False, "Should have raised ValueError"
    except ValueError:
        pass  # Expected


def test_get_piece_stats():
    """Test getting piece statistics."""
    game_state = create_test_game_state()
    piece_manager = PieceManager(game_state)

    # Get stats for all players
    stats_all = piece_manager.get_piece_stats()
    assert isinstance(stats_all, PieceStats)
    assert stats_all.count > 0
    assert stats_all.total_hp > 0
    assert stats_all.average_hp > 0
    assert isinstance(stats_all.type_distribution, dict)
    assert "king" in stats_all.type_distribution
    assert "pawn" in stats_all.type_distribution

    # Get stats for player 0 only
    stats_p0 = piece_manager.get_piece_stats(0)
    assert stats_p0.count > 0
    # All pieces should be player 0
    # We can't easily verify type distribution without knowing exact counts,
    # but we can check that it's a dict
    assert isinstance(stats_p0.type_distribution, dict)

    # Test with invalid player ID
    try:
        piece_manager.get_piece_stats(2)
        assert False, "Should have raised ValueError"
    except ValueError:
        pass  # Expected


def test_is_piece_alive():
    """Test checking if a piece is alive."""
    game_state = create_test_game_state()
    piece_manager = PieceManager(game_state)

    # Get a piece and test it's alive
    piece_id = list(game_state.get_pieces().keys())[0]
    piece = game_state.get_piece(piece_id)
    assert piece.is_alive()  # Using the Piece method
    assert piece_manager.is_piece_alive(piece_id)  # Using manager

    # Kill the piece by setting HP to 0
    piece.hp = 0
    assert not piece.is_alive()
    assert not piece_manager.is_piece_alive(piece_id)

    # Test with non-existent piece ID
    assert not piece_manager.is_piece_alive("non-existent-id")


def test_get_living_piece_count():
    """Test getting count of living pieces."""
    game_state = create_test_game_state()
    piece_manager = PieceManager(game_state)

    # Initially all pieces should be alive
    total_living = piece_manager.get_living_piece_count()
    living_p0 = piece_manager.get_living_piece_count(0)
    living_p1 = piece_manager.get_living_piece_count(1)

    assert total_living == living_p0 + living_p1
    assert total_living > 0

    # Kill a piece and test
    piece_id = list(game_state.get_pieces().keys())[0]
    piece = game_state.get_piece(piece_id)
    piece.hp = 0

    new_total = piece_manager.get_living_piece_count()
    assert new_total == total_living - 1

    # Test with invalid player ID
    try:
        piece_manager.get_living_piece_count(2)
        assert False, "Should have raised ValueError"
    except ValueError:
        pass  # Expected


def test_piece_stats_dataclass():
    """Test PieceStats dataclass."""
    stats = PieceStats(
        count=5,
        total_hp=250,
        average_hp=50.0,
        type_distribution={"king": 1, "queen": 1, "rook": 2, "pawn": 1}
    )

    assert stats.count == 5
    assert stats.total_hp == 250
    assert stats.average_hp == 50.0
    assert stats.type_distribution["king"] == 1
    assert stats.type_distribution["pawn"] == 1


if __name__ == "__main__":
    # Run tests
    test_piece_manager_creation()
    test_get_pieces_by_player()
    test_get_active_pieces_by_player()
    test_get_pieces_by_type()
    test_get_king_piece()
    test_get_piece_stats()
    test_is_piece_alive()
    test_get_living_piece_count()
    test_piece_stats_dataclass()

    print("All piece manager tests passed!")