"""
Comprehensive tests for ArChess SQL DDL Schemas, Python Validation Schemas & OpenAPI Specification.
"""

import os
import json
import sqlite3
import pytest
from backend.schemas import (
    UserRegisterSchema,
    UserLoginSchema,
    GoogleAuthSchema,
    MatchRecordSchema,
    TelemetryEventSchema,
    AchievementUnlockSchema,
    UserPublicDTO,
    MatchSummaryDTO,
    ValidationError,
    validate_schema
)
from backend.database import init_db_from_schema
from backend.app import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


class TestSqlDatabaseSchemas:
    """Test SQL schema DDL execution and structure integrity."""

    def test_sqlite_schema_ddl_execution(self, tmp_path):
        """Verify backend/schema.sql executes cleanly and creates all tables, columns, and indexes."""
        db_file = str(tmp_path / "test_schema.db")
        init_db_from_schema(custom_path=db_file)

        conn = sqlite3.connect(db_file)
        cursor = conn.cursor()

        # Check all required tables exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = {row[0] for row in cursor.fetchall()}
        assert "users" in tables
        assert "matches" in tables
        assert "user_achievements" in tables
        assert "telemetry" in tables

        # Verify users columns
        cursor.execute("PRAGMA table_info(users);")
        user_cols = {c[1] for c in cursor.fetchall()}
        expected_user_cols = {
            "id", "username", "email", "password_hash", "elo_rating",
            "matches_played", "wins", "losses", "avatar", "auth_provider",
            "google_id", "token_version", "is_admin", "created_at"
        }
        assert expected_user_cols.issubset(user_cols)

        # Verify matches columns
        cursor.execute("PRAGMA table_info(matches);")
        match_cols = {c[1] for c in cursor.fetchall()}
        expected_match_cols = {
            "id", "white_username", "black_username", "winner",
            "white_damage", "black_damage", "turns", "duration_sec", "created_at"
        }
        assert expected_match_cols.issubset(match_cols)

        # Verify indexes exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='index';")
        indexes = {row[0] for row in cursor.fetchall()}
        assert "idx_users_elo" in indexes
        assert "idx_users_google" in indexes
        assert "idx_users_admin" in indexes
        assert "idx_matches_created" in indexes
        assert "idx_user_achievements_user" in indexes
        assert "idx_telemetry_corr" in indexes

        conn.close()

    def test_root_schema_sql_matches_backend(self):
        """Ensure root schema.sql exists and is consistent with backend/schema.sql."""
        root_path = os.path.join(os.path.dirname(__file__), "..", "schema.sql")
        backend_path = os.path.join(os.path.dirname(__file__), "..", "backend", "schema.sql")
        assert os.path.exists(root_path)
        assert os.path.exists(backend_path)
        with open(root_path, "r", encoding="utf-8") as f1, open(backend_path, "r", encoding="utf-8") as f2:
            assert f1.read() == f2.read()

    def test_postgres_schema_file_exists_and_valid(self):
        """Verify PostgreSQL DDL schema exists with valid PostgreSQL syntax."""
        pg_path = os.path.join(os.path.dirname(__file__), "..", "backend", "schema.postgres.sql")
        assert os.path.exists(pg_path)
        with open(pg_path, "r", encoding="utf-8") as f:
            content = f.read()
            assert "CREATE TABLE IF NOT EXISTS users" in content
            assert "CREATE TABLE IF NOT EXISTS matches" in content
            assert "SERIAL PRIMARY KEY" in content
            assert "TIMESTAMPTZ" in content


class TestPythonValidationSchemas:
    """Test Python dataclass validation schemas and DTOs."""

    def test_user_register_schema_success(self):
        schema = UserRegisterSchema.from_dict({
            "username": "Commander_Tactics",
            "email": "cmd@archess.io",
            "password": "Password123!"
        })
        assert schema.username == "Commander_Tactics"
        assert schema.email == "cmd@archess.io"
        assert schema.password == "Password123!"
        assert isinstance(schema.to_dict(), dict)

    def test_user_register_schema_invalid_username(self):
        # Too short
        with pytest.raises(ValidationError) as exc:
            UserRegisterSchema.from_dict({"username": "ab", "email": "valid@test.com", "password": "password"})
        assert "between 3 and 30 characters" in exc.value.message

        # Invalid characters
        with pytest.raises(ValidationError) as exc:
            UserRegisterSchema.from_dict({"username": "user@invalid!", "email": "valid@test.com", "password": "password"})
        assert "letters, numbers, and underscores" in exc.value.message

    def test_user_register_schema_invalid_email(self):
        with pytest.raises(ValidationError) as exc:
            UserRegisterSchema.from_dict({"username": "valid_user", "email": "invalid-email", "password": "password"})
        assert "valid email address" in exc.value.message

    def test_user_register_schema_invalid_password(self):
        with pytest.raises(ValidationError) as exc:
            UserRegisterSchema.from_dict({"username": "valid_user", "email": "valid@test.com", "password": "123"})
        assert "between 6 and 128 characters" in exc.value.message

    def test_user_login_schema(self):
        # Valid username
        login1 = UserLoginSchema.from_dict({"username_or_email": "Commander", "password": "Secret123"})
        assert login1.username_or_email == "Commander"

        # Valid with identifier alias
        login2 = UserLoginSchema.from_dict({"identifier": "cmd@archess.io", "password": "Secret123"})
        assert login2.username_or_email == "cmd@archess.io"

        # Empty credentials
        with pytest.raises(ValidationError):
            UserLoginSchema.from_dict({"username_or_email": "", "password": ""})

        # Null byte protection
        with pytest.raises(ValidationError) as exc:
            UserLoginSchema.from_dict({"username_or_email": "admin\x00inject", "password": "pass"})
        assert "Null bytes are prohibited" in exc.value.message

    def test_google_auth_schema(self):
        # Valid 3-part JWT
        token = "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjM0NTYifQ.signature"
        schema = GoogleAuthSchema.from_dict({"credential": token})
        assert schema.credential == token

        # Invalid JWT format
        with pytest.raises(ValidationError) as exc:
            GoogleAuthSchema.from_dict({"credential": "invalid-token-not-jwt"})
        assert "3-part JWT" in exc.value.message

        # Missing token
        with pytest.raises(ValidationError):
            GoogleAuthSchema.from_dict({"credential": ""})

    def test_match_record_schema(self):
        # Valid match
        m = MatchRecordSchema.from_dict({
            "white_username": "Magnus",
            "black_username": "Hikaru",
            "winner": "white",
            "white_damage": 450,
            "black_damage": 220,
            "turns": 32,
            "duration_sec": 412
        })
        assert m.winner == "white"
        assert m.white_damage == 450
        assert m.turns == 32

        # Invalid winner
        with pytest.raises(ValidationError) as exc:
            MatchRecordSchema.from_dict({"winner": "invalid_winner"})
        assert "Winner must be 'white', 'black', or 'draw'" in exc.value.message

        # Negative numbers clamped gracefully to 0
        m_neg = MatchRecordSchema.from_dict({"winner": "draw", "white_damage": -50, "turns": -10})
        assert m_neg.white_damage == 0
        assert m_neg.turns == 0

    def test_telemetry_event_schema(self):
        t = TelemetryEventSchema.from_dict({
            "correlation_id": "test-corr-123",
            "event_type": "slingshot_strike",
            "payload": {"power": 85, "angle": 45}
        })
        assert t.correlation_id == "test-corr-123"
        assert t.event_type == "slingshot_strike"
        assert t.payload["power"] == 85

        with pytest.raises(ValidationError):
            TelemetryEventSchema.from_dict({"correlation_id": "", "event_type": "event"})

    def test_achievement_unlock_schema(self):
        a = AchievementUnlockSchema.from_dict({"username": "Commander1", "achievement_id": "first_strike"})
        assert a.username == "Commander1"
        assert a.achievement_id == "first_strike"

        with pytest.raises(ValidationError):
            AchievementUnlockSchema.from_dict({"username": "", "achievement_id": ""})

    def test_user_public_dto_never_exposes_password_hash(self):
        row = {
            "id": 10,
            "username": "Commander_Zero",
            "email": "zero@archess.io",
            "password_hash": "pbkdf2:sha256:600000$super_secret_hash",
            "elo_rating": 1500,
            "matches_played": 25,
            "wins": 18,
            "losses": 7,
            "avatar": "queen",
            "is_admin": 1,
            "created_at": "2026-09-22 10:00:00"
        }
        dto = UserPublicDTO.from_db_row(row)
        d = dto.to_dict()
        assert "password_hash" not in d
        assert d["id"] == 10
        assert d["username"] == "Commander_Zero"
        assert d["is_admin"] is True

    def test_validate_schema_helper(self):
        valid, instance, err = validate_schema(UserRegisterSchema, {
            "username": "PlayerOne",
            "email": "p1@archess.io",
            "password": "Password123"
        })
        assert valid is True
        assert instance is not None
        assert err is None

        valid_err, instance_err, err_msg = validate_schema(UserRegisterSchema, {"username": ""})
        assert valid_err is False
        assert instance_err is None
        assert err_msg is not None


class TestOpenApiEndpoint:
    """Test OpenAPI JSON endpoint."""

    def test_get_openapi_json(self, client):
        res = client.get("/api/openapi.json")
        assert res.status_code == 200
        data = res.get_json()
        assert data["openapi"] == "3.1.0"
        assert "components" in data
        assert "schemas" in data["components"]
        assert "UserRegisterRequest" in data["components"]["schemas"]
        assert "MatchRecordRequest" in data["components"]["schemas"]

    def test_get_schemas_alias(self, client):
        res = client.get("/api/schemas")
        assert res.status_code == 200
        data = res.get_json()
        assert data["openapi"] == "3.1.0"
