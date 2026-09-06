"""
Unit tests for Archess piece factory.
"""
import sys
import os

# Add the archess package to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'src'))

from archess.app.pieces.piece_factory import PieceFactory, PieceSpawnData
from archess.app.core.game_state import Piece
from archess.app.config import piece_config, game_config


def test_piece_factory_creation():
    """Test that piece factory can be created."""
    factory = PieceFactory()
    assert factory.logger is not None  # Logger should be set


def test_create_piece_basic():
    """Test creating a basic piece."""
    factory = PieceFactory()
    piece = factory.create_piece(
        piece_type="king",
        player_id=0,
        position=(1.0, 2.0, 3.0),
        velocity=(0.1, 0.2, 0.3)
    )

    assert isinstance(piece, Piece)
    assert piece.piece_type == "king"
    assert piece.player_id == 0
    assert piece.position == (1.0, 2.0, 3.0)
    assert piece.velocity == (0.1, 0.2, 0.3)
    # HP should be from config for king
    assert piece.hp == piece_config.king_hp
    assert piece.max_hp == piece_config.king_hp
    # Mass should be from config for king
    assert piece.mass == piece_config.king_mass
    # ID should be a UUID string
    assert isinstance(piece.id, str)
    assert len(piece.id) > 0
    assert piece.is_active == True
    assert piece.is_destroyed == False


def test_create_piece_all_types():
    """Test creating all piece types."""
    factory = PieceFactory()
    piece_types = ["king", "queen", "rook", "bishop", "knight", "pawn"]

    for piece_type in piece_types:
        piece = factory.create_piece(piece_type, player_id=0)
        assert piece.piece_type == piece_type
        assert piece.player_id == 0
        # HP and mass should be set according to config
        if piece_type == "king":
            assert piece.hp == piece_config.king_hp
            assert piece.mass == piece_config.king_mass
        else:
            assert piece.hp == piece_config.piece_types[piece_type]["hp"]
            assert piece.mass == piece_config.piece_types[piece_type]["mass"]


def test_create_piece_invalid_player():
    """Test creating a piece with invalid player ID."""
    factory = PieceFactory()
    try:
        factory.create_piece("king", player_id=2)
        assert False, "Should have raised ValueError"
    except ValueError:
        pass  # Expected


def test_create_piece_unknown_type():
    """Test creating a piece with unknown piece type (should default to pawn)."""
    factory = PieceFactory()
    # We'll capture the warning by checking logs, but for now just test that it creates a pawn
    piece = factory.create_piece("unknown_piece", player_id=0)
    # Should have defaulted to pawn
    assert piece.piece_type == "pawn"
    assert piece.player_id == 0
    assert piece.hp == piece_config.piece_types["pawn"]["hp"]
    assert piece.mass == piece_config.piece_types["pawn"]["mass"]


def test_create_standard_set():
    """Test creating a standard set of pieces."""
    factory = PieceFactory()
    pieces = factory.create_standard_set(
        player_id=0,
        base_position=(0.0, 0.0, 0.0),
        spacing=2.0
    )

    # Should have created the expected number of pieces
    expected_count = game_config.pieces_per_player  # total pieces per player
    assert len(pieces) == expected_count

    # All pieces should belong to player 0
    for piece in pieces.values():
        assert piece.player_id == 0

    # Check that we have the right types
    piece_types = [piece.piece_type for piece in pieces.values()]
    from collections import Counter
    type_counts = Counter(piece_types)

    # Expected counts for a standard chess set:
    # 1 king, 1 queen, 2 rooks, 2 bishops, 2 knights, 8 pawns
    assert type_counts["king"] == 1
    assert type_counts["queen"] == 1
    assert type_counts["rook"] == 2
    assert type_counts["bishop"] == 2
    assert type_counts["knight"] == 2
    assert type_counts["pawn"] == 8

    # Check that pieces have unique IDs
    piece_ids = list(pieces.keys())
    assert len(piece_ids) == len(set(piece_ids))  # All unique

    # Check that pieces are positioned correctly
    # Back row should be at y=0, front row at y=spacing (2.0)
    back_row_pieces = [p for p in pieces.values() if p.piece_type in ["rook", "knight", "bishop", "king", "queen", "bishop", "knight", "rook"]]
    front_row_pieces = [p for p in pieces.values() if p.piece_type == "pawn"]

    for piece in back_row_pieces:
        assert piece.position[1] == 0.0  # y position

    for piece in front_row_pieces:
        assert piece.position[1] == 2.0  # y position (spacing)

    # Check that x positions increase with index
    back_row_sorted = sorted(back_row_pieces, key=lambda p: p.position[0])
    # Should follow the order: rook, knight, bishop, king, queen, bishop, knight, rook
    expected_back_row = ["rook", "knight", "bishop", "king", "queen", "bishop", "knight", "rook"]
    actual_back_row = [p.piece_type for p in back_row_sorted]
    assert actual_back_row == expected_back_row

    front_row_sorted = sorted(front_row_pieces, key=lambda p: p.position[0])
    # All should be pawns
    assert all(p.piece_type == "pawn" for p in front_row_sorted)


def test_create_standard_set_player_1():
    """Test creating a standard set for player 1."""
    factory = PieceFactory()
    pieces = factory.create_standard_set(
        player_id=1,
        base_position=(10.0, 0.0, 0.0),
        spacing=2.0
    )

    # All pieces should belong to player 1
    for piece in pieces.values():
        assert piece.player_id == 1

    # Should have the same number of pieces
    assert len(pieces) == game_config.pieces_per_player


def test_piece_factory_cleanup():
    """Test piece factory cleanup."""
    factory = PieceFactory()
    # Just test that it doesn't crash
    factory.cleanup()


def test_piece_spawn_data_dataclass():
    """Test PieceSpawnData dataclass."""
    spawn_data = PieceSpawnData(
        piece_type="king",
        player_id=0,
        position=(1.0, 2.0, 3.0),
        velocity=(0.1, 0.2, 0.3)
    )

    assert spawn_data.piece_type == "king"
    assert spawn_data.player_id == 0
    assert spawn_data.position == (1.0, 2.0, 3.0)
    assert spawn_data.velocity == (0.1, 0.2, 0.3)


if __name__ == "__main__":
    # Run tests
    test_piece_factory_creation()
    test_create_piece_basic()
    test_create_piece_all_types()
    test_create_piece_invalid_player()
    test_create_piece_unknown_type()
    test_create_standard_set()
    test_create_standard_set_player_1()
    test_piece_factory_cleanup()
    test_piece_spawn_data_dataclass()

    print("All piece factory tests passed!")