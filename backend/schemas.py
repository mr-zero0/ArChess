"""
ARCHESS - Authoritative Data & Validation Schemas
Type-checked dataclasses, payload validation, and public serialization DTOs.
Version: 2.0.0
"""

import re
from dataclasses import dataclass, field, asdict
from typing import Optional, Dict, Any, Tuple, List, Union


class ValidationError(Exception):
    """Raised when request payload fails schema validation."""
    def __init__(self, message: str, field_errors: Optional[Dict[str, str]] = None):
        super().__init__(message)
        self.message = message
        self.field_errors = field_errors or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": False,
            "error": self.message,
            "field_errors": self.field_errors
        }


# ==============================================================================
# 1. AUTHENTICATION & USER SCHEMAS
# ==============================================================================

@dataclass
class UserRegisterSchema:
    username: str
    email: str
    password: str

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "UserRegisterSchema":
        if not isinstance(data, dict):
            raise ValidationError("Payload must be a valid JSON object.")

        username = str(data.get("username", "")).strip()
        email = str(data.get("email", "")).strip().lower()
        password = str(data.get("password", ""))

        errors = {}

        if not username:
            errors["username"] = "Username is required."
        elif len(username) < 3 or len(username) > 30:
            errors["username"] = "Username must be between 3 and 30 characters."
        elif not re.match(r"^[A-Za-z0-9_]+$", username):
            errors["username"] = "Username may only contain letters, numbers, and underscores."

        if not email:
            errors["email"] = "Email address is required."
        elif len(email) < 5 or len(email) > 100 or not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
            errors["email"] = "A valid email address is required."

        if not password:
            errors["password"] = "Password is required."
        elif len(password) < 6 or len(password) > 128:
            errors["password"] = "Password must be between 6 and 128 characters."

        if errors:
            first_msg = next(iter(errors.values()))
            raise ValidationError(first_msg, errors)

        return cls(username=username, email=email, password=password)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class UserLoginSchema:
    username_or_email: str
    password: str

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "UserLoginSchema":
        if not isinstance(data, dict):
            raise ValidationError("Payload must be a valid JSON object.")

        ident = data.get("username_or_email") or data.get("identifier") or data.get("username") or data.get("email") or ""
        password = data.get("password", "")

        if not isinstance(ident, str) or not isinstance(password, str):
            raise ValidationError("Invalid credentials format.")

        ident = ident.strip()
        if "\x00" in ident or "\x00" in password:
            raise ValidationError("Null bytes are prohibited in credentials.")

        if not ident or not password:
            raise ValidationError("Username/email and password are required.")

        return cls(username_or_email=ident, password=password)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class GoogleAuthSchema:
    credential: str

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "GoogleAuthSchema":
        if not isinstance(data, dict):
            raise ValidationError("Payload must be a valid JSON object.")

        cred = data.get("credential") or data.get("id_token") or ""
        if not isinstance(cred, str) or not cred.strip():
            raise ValidationError("Google credential token is required.")

        # Basic JWT format sanity check: header.payload.signature
        parts = cred.strip().split(".")
        if len(parts) != 3:
            raise ValidationError("Invalid Google ID token format (must be 3-part JWT).")

        return cls(credential=cred.strip())

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ==============================================================================
# 2. MATCH SETTLEMENT & TELEMETRY SCHEMAS
# ==============================================================================

@dataclass
class MatchRecordSchema:
    white_username: str
    black_username: str
    winner: str
    white_damage: int = 0
    black_damage: int = 0
    turns: int = 0
    duration_sec: int = 0

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "MatchRecordSchema":
        if not isinstance(data, dict):
            raise ValidationError("Payload must be a valid JSON object.")

        white = str(data.get("white_username", "")).strip() or "Player 1"
        black = str(data.get("black_username", "")).strip() or "ArChess Bot"
        winner = str(data.get("winner", "")).strip().lower()

        if winner not in ("white", "black", "draw"):
            raise ValidationError("Winner must be 'white', 'black', or 'draw'.")

        def _to_non_neg_int(val: Any, default: int = 0) -> int:
            try:
                num = int(val)
                return max(0, num)
            except (ValueError, TypeError):
                return default

        w_dmg = _to_non_neg_int(data.get("white_damage"), 0)
        b_dmg = _to_non_neg_int(data.get("black_damage"), 0)
        turns = _to_non_neg_int(data.get("turns"), 0)
        duration = _to_non_neg_int(data.get("duration_sec"), 0)

        return cls(
            white_username=white,
            black_username=black,
            winner=winner,
            white_damage=w_dmg,
            black_damage=b_dmg,
            turns=turns,
            duration_sec=duration
        )

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class TelemetryEventSchema:
    correlation_id: str
    event_type: str
    payload: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "TelemetryEventSchema":
        if not isinstance(data, dict):
            raise ValidationError("Payload must be a valid JSON object.")

        corr_id = str(data.get("correlation_id", "")).strip()
        event_type = str(data.get("event_type", "")).strip()
        payload = data.get("payload", {})

        if not corr_id:
            raise ValidationError("correlation_id is required.")
        if not event_type:
            raise ValidationError("event_type is required.")
        if not isinstance(payload, (dict, list, str, int, float, bool)):
            payload = {"raw": str(payload)}

        return cls(
            correlation_id=corr_id,
            event_type=event_type,
            payload=payload if isinstance(payload, dict) else {"data": payload}
        )

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class AchievementUnlockSchema:
    username: str
    achievement_id: str

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "AchievementUnlockSchema":
        if not isinstance(data, dict):
            raise ValidationError("Payload must be a valid JSON object.")

        user = str(data.get("username", "")).strip()
        ach_id = str(data.get("achievement_id", "")).strip()

        if not user:
            raise ValidationError("username is required.")
        if not ach_id:
            raise ValidationError("achievement_id is required.")

        return cls(username=user, achievement_id=ach_id)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ==============================================================================
# 3. PUBLIC RESPONSE DTOS (DATA TRANSFER OBJECTS)
# ==============================================================================

@dataclass
class UserPublicDTO:
    id: int
    username: str
    email: str
    elo_rating: int = 1200
    matches_played: int = 0
    wins: int = 0
    losses: int = 0
    avatar: str = "knight"
    is_admin: bool = False
    auth_provider: str = "local"
    created_at: Optional[str] = None

    @classmethod
    def from_db_row(cls, row: Dict[str, Any]) -> "UserPublicDTO":
        return cls(
            id=int(row.get("id", 0)),
            username=str(row.get("username", "")),
            email=str(row.get("email", "")),
            elo_rating=int(row.get("elo_rating", 1200)),
            matches_played=int(row.get("matches_played", 0)),
            wins=int(row.get("wins", 0)),
            losses=int(row.get("losses", 0)),
            avatar=str(row.get("avatar", "knight")),
            is_admin=bool(row.get("is_admin", False)),
            auth_provider=str(row.get("auth_provider", "local")),
            created_at=str(row.get("created_at")) if row.get("created_at") else None
        )

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class MatchSummaryDTO:
    id: int
    white_username: str
    black_username: str
    winner: str
    white_damage: int
    black_damage: int
    turns: int
    duration_sec: int
    created_at: Optional[str] = None

    @classmethod
    def from_db_row(cls, row: Dict[str, Any]) -> "MatchSummaryDTO":
        return cls(
            id=int(row.get("id", 0)),
            white_username=str(row.get("white_username", "")),
            black_username=str(row.get("black_username", "")),
            winner=str(row.get("winner", "draw")),
            white_damage=int(row.get("white_damage", 0)),
            black_damage=int(row.get("black_damage", 0)),
            turns=int(row.get("turns", 0)),
            duration_sec=int(row.get("duration_sec", 0)),
            created_at=str(row.get("created_at")) if row.get("created_at") else None
        )

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class LeaderboardEntryDTO:
    rank: int
    username: str
    elo_rating: int
    matches_played: int
    wins: int
    avatar: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ==============================================================================
# 4. GENERIC VALIDATION HELPER
# ==============================================================================

def validate_schema(schema_cls: Any, data: Dict[str, Any]) -> Tuple[bool, Optional[Any], Optional[str]]:
    """
    Validate a dictionary against a schema class.
    Returns: (is_valid, parsed_schema_instance, error_message)
    """
    try:
        instance = schema_cls.from_dict(data)
        return True, instance, None
    except ValidationError as e:
        return False, None, e.message
    except Exception as e:
        return False, None, str(e)
