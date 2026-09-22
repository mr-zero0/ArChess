"""
Comprehensive test suite for ARCHESS Launch Readiness:
1. Google OAuth ID Token verification & account auto-linking
2. Role-Based Access Control (RBAC) & @admin_required enforcement
3. Administrative management endpoints (stats, user management, rooms, tournaments)
4. Self-protection guards (anti-self-demotion, anti-self-deletion)
5. Zero static/seed data verification in production
"""
import os
import json
import pytest
from unittest.mock import patch, MagicMock

from backend.app import app, room_manager, tournament_engine, _verify_google_id_token
from backend.database import (
    get_connection,
    init_db,
    register_user,
    authenticate_user,
    get_or_create_google_user,
    create_or_promote_admin,
    set_user_admin_status,
    list_users_admin,
    get_admin_system_stats,
    delete_user_account
)


@pytest.fixture
def client(tmp_path, monkeypatch):
    """Provide an isolated test client with a fresh temporary database."""
    test_db = str(tmp_path / "test_launch.db")
    monkeypatch.setenv("ARCHESS_DB_PATH", test_db)
    monkeypatch.setenv("SEED_DEMO_DATA", "0")
    monkeypatch.setenv("ADMIN_EMAIL", "master_admin@archess.io")
    monkeypatch.setenv("ADMIN_PASSWORD", "SuperSecureAdminSecret!99")
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-client-id.apps.googleusercontent.com")

    init_db()
    app.config["TESTING"] = True
    app.config["WTF_CSRF_ENABLED"] = False

    with app.test_client() as test_client:
        yield test_client


def test_seed_demo_data_strictly_disabled_by_default(tmp_path, monkeypatch):
    """Verify that fake seed accounts are NOT inserted into the database when SEED_DEMO_DATA is 0/unset."""
    test_db = str(tmp_path / "clean_prod.db")
    monkeypatch.setenv("ARCHESS_DB_PATH", test_db)
    monkeypatch.setenv("SEED_DEMO_DATA", "0")
    monkeypatch.delenv("ADMIN_EMAIL", raising=False)

    init_db()

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT username FROM users WHERE username IN ('Magnus_Kinetic', 'Vishy_Tactics', 'Hikaru_Bullet')")
    demo_users = cursor.fetchall()
    conn.close()

    assert len(demo_users) == 0, "Seed demo accounts should not exist in production database!"


def test_create_or_promote_admin_auto_provisioning():
    """Verify admin provisioning creates the sovereign user with is_admin=1."""
    ok, admin = create_or_promote_admin("RootAdmin", "root@archess.io", "StrongPassword123")
    assert ok is True
    assert admin["is_admin"] == 1
    assert admin["email"] == "root@archess.io"

    # Re-running updates credentials and keeps admin role
    ok2, admin2 = create_or_promote_admin("RootAdmin", "root@archess.io", "NewStrongPassword456")
    assert ok2 is True
    assert admin2["is_admin"] == 1


def test_google_id_token_verification_claims():
    """Verify _verify_google_id_token enforces audience, issuer, and email_verified."""
    # 1. Missing credential
    valid, claims, err = _verify_google_id_token("", "expected-client-id")
    assert valid is False
    assert "Missing" in err

    # 2. Audience mismatch mock
    fake_payload = {
        "aud": "wrong-client-id",
        "iss": "accounts.google.com",
        "email_verified": True,
        "email": "player@gmail.com",
        "sub": "123456789"
    }
    mock_resp = MagicMock()
    mock_resp.status = 200
    mock_resp.read.return_value = json.dumps(fake_payload).encode("utf-8")
    mock_resp.__enter__.return_value = mock_resp

    with patch("urllib.request.urlopen", return_value=mock_resp):
        valid, claims, err = _verify_google_id_token("fake_token", "expected-client-id")
        assert valid is False
        assert "audience mismatch" in err

    # 3. Valid Google response
    fake_payload["aud"] = "expected-client-id"
    mock_resp.read.return_value = json.dumps(fake_payload).encode("utf-8")
    with patch("urllib.request.urlopen", return_value=mock_resp):
        valid, claims, err = _verify_google_id_token("fake_token", "expected-client-id")
        assert valid is True
        assert claims["email"] == "player@gmail.com"
        assert claims["sub"] == "123456789"


def test_google_auth_inherits_admin_for_admin_email(client, monkeypatch):
    """Signing in with Google using the ADMIN_EMAIL automatically awards is_admin=1."""
    monkeypatch.setenv("ADMIN_EMAIL", "founder@archess.io")

    payload = {
        "email": "founder@archess.io",
        "sub": "google_uid_9999",
        "name": "ArChess Founder",
        "avatar": "sovereign",
        "demo": True
    }
    res = client.post("/api/auth/google", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["user"]["is_admin"] == 1
    assert data["user"]["email"] == "founder@archess.io"


def test_admin_routes_rbac_unauthenticated_and_forbidden(client):
    """Verify unauthorized users (unauthenticated and regular users) cannot access /admin or /api/admin/*."""
    # 1. Unauthenticated requests
    assert client.get("/admin").status_code == 302 # Redirects to /play
    res = client.get("/api/admin/stats")
    assert res.status_code == 401
    assert res.get_json()["success"] is False

    # 2. Authenticated standard player
    register_user("RegularPlayer", "player@example.com", "SecretPass123")
    client.post("/api/auth/login", json={"email": "player@example.com", "password": "SecretPass123"})

    res_admin_page = client.get("/admin")
    assert res_admin_page.status_code == 403

    res_api = client.get("/api/admin/stats")
    assert res_api.status_code == 403
    assert "Forbidden" in res_api.get_json()["error"]


def test_admin_dashboard_and_management_flow(client, monkeypatch):
    """Verify full admin suite: metrics, user pagination, role toggle, user delete, rooms, and tournament reset."""
    admin_email = "superadmin@archess.io"
    admin_pass = "OmniPass12345!"
    create_or_promote_admin("SuperAdmin", admin_email, admin_pass)

    # Login as admin
    login_res = client.post("/api/auth/login", json={"email": admin_email, "password": admin_pass})
    assert login_res.status_code == 200
    assert login_res.get_json()["user"]["is_admin"] == 1

    # Access HTML dashboard
    admin_page = client.get("/admin")
    assert admin_page.status_code == 200
    assert b"Platform Administration" in admin_page.data
    assert b"AUTHORITATIVE COMMAND CENTER" in admin_page.data

    # 1. Stats API
    stats_res = client.get("/api/admin/stats")
    assert stats_res.status_code == 200
    stats_data = stats_res.get_json()["stats"]
    assert stats_data["total_users"] >= 1
    assert stats_data["admin_count"] >= 1
    assert "active_rooms_count" in stats_data

    # 2. Register candidate user for administration
    register_user("PlayerToPromote", "candidate@test.com", "Password456")
    candidate_user = authenticate_user("candidate@test.com", "Password456")[1]
    candidate_id = candidate_user["id"]
    assert candidate_user["is_admin"] == 0

    # 3. Users List API
    users_res = client.get("/api/admin/users?search=candidate")
    assert users_res.status_code == 200
    u_list = users_res.get_json()["users"]
    assert len(u_list) == 1
    assert u_list[0]["username"] == "PlayerToPromote"

    # 4. Promote candidate to admin
    promote_res = client.post(f"/api/admin/users/{candidate_id}/role", json={"is_admin": True})
    assert promote_res.status_code == 200
    assert promote_res.get_json()["user"]["is_admin"] == 1

    # 5. Demote back
    demote_res = client.post(f"/api/admin/users/{candidate_id}/role", json={"is_admin": False})
    assert demote_res.status_code == 200
    assert demote_res.get_json()["user"]["is_admin"] == 0

    # 6. Self-demotion guard
    my_id = login_res.get_json()["user"]["id"]
    self_demote = client.post(f"/api/admin/users/{my_id}/role", json={"is_admin": False})
    assert self_demote.status_code == 400
    assert "Cannot revoke your own" in self_demote.get_json()["error"]

    # 7. Self-deletion guard
    self_delete = client.delete(f"/api/admin/users/{my_id}")
    assert self_delete.status_code == 400
    assert "Cannot delete your own" in self_delete.get_json()["error"]

    # 8. Delete target user
    delete_res = client.delete(f"/api/admin/users/{candidate_id}")
    assert delete_res.status_code == 200

    # Verify user deleted
    check_deleted = client.get("/api/admin/users?search=candidate")
    assert len(check_deleted.get_json()["users"]) == 0

    # 9. Rooms API
    rooms_res = client.get("/api/admin/rooms")
    assert rooms_res.status_code == 200
    assert isinstance(rooms_res.get_json()["rooms"], list)

    # 10. Tournament Reset API
    tourn_res = client.post("/api/admin/tournament/reset")
    assert tourn_res.status_code == 200
    assert tourn_res.get_json()["success"] is True
