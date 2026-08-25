import os
import time
from uuid import uuid4

import pytest
from playwright.sync_api import sync_playwright, expect

from game import create_app
from config.config import TestingConfig if False else DevelopmentConfig

RUN_BROWSER = os.environ.get("RUN_BROWSER_MATRIX") == "1"
BASE = "http://127.0.0.1:5000"


def unique_account():
    token = uuid4().hex[:10]
    return {
        "username": f"QA_{token}",
        "email": f"qa-{token}@example.com",
        "password": "Valid-password-123",
    }


@pytest.mark.parametrize("payload,expected", [
    ({"username": "ab", "email": "a@example.com", "password": "Valid-password-123"}, "invalid_username"),
    ({"username": "ValidUser", "email": "not-an-email", "password": "Valid-password-123"}, "invalid_email"),
    ({"username": "ValidUser", "email": "a@example.com", "password": "short"}, "weak_password"),
])
def test_auth_signup_negative_cases(payload, expected):
    app = create_app(DevelopmentConfig)
    client = app.test_client()
    with client.session_transaction() as session:
        session["csrf_token"] = "test-csrf"
    response = client.post("/api/auth/signup", json=payload, headers={"X-CSRF-Token": "test-csrf"})
    assert response.status_code == 400
    assert response.get_json()["error"] == expected


def test_auth_missing_csrf_is_rejected():
    app = create_app(DevelopmentConfig)
    client = app.test_client()
    account = unique_account()
    response = client.post("/api/auth/signup", json=account)
    assert response.status_code == 403
    assert response.get_json()["error"] == "csrf_required"


def test_auth_signup_duplicate_username_and_email_are_rejected():
    app = create_app(DevelopmentConfig)
    client = app.test_client()
    account = unique_account()
    with client.session_transaction() as session:
        session["csrf_token"] = "test-csrf"
    first = client.post("/api/auth/signup", json=account, headers={"X-CSRF-Token": "test-csrf"})
    assert first.status_code == 201

    with client.session_transaction() as session:
        session["csrf_token"] = "test-csrf-2"
    duplicate_user = {**account, "email": f"other-{uuid4().hex[:8]}@example.com"}
    duplicate_email = {**account, "username": f"Other_{uuid4().hex[:8]}"}
    r1 = client.post("/api/auth/signup", json=duplicate_user, headers={"X-CSRF-Token": "test-csrf-2"})
    assert r1.status_code == 409 and r1.get_json()["error"] == "username_taken"
    with client.session_transaction() as session:
        session["csrf_token"] = "test-csrf-3"
    r2 = client.post("/api/auth/signup", json=duplicate_email, headers={"X-CSRF-Token": "test-csrf-3"})
    assert r2.status_code == 409 and r2.get_json()["error"] == "email_taken"


@pytest.mark.skipif(not RUN_BROWSER, reason="Browser regression requires Playwright")
def test_release_positive_and_negative_ui_flow():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        account = unique_account()
        page.goto(f"{BASE}/login", wait_until="networkidle")
        expect(page.locator("#signupTab")).to_have_count(1)
        page.click("#signupTab")
        page.locator('#signupForm input[name="username"]').fill(account["username"])
        page.locator('#signupForm input[name="email"]').fill(account["email"])
        page.locator('#signupForm input[name="password"]').fill(account["password"])
        page.click('#signupForm button.primary')
        page.wait_for_url("**/profile")
        expect(page.locator("#name")).to_have_text(account["username"], timeout=5000)

        page.goto(f"{BASE}/", wait_until="networkidle")
        page.wait_for_timeout(900)
        initial = page.evaluate("() => ({player:gameState.currentPlayer,phase:gameState.phase,pieces:gameState.pieces.length,input:Boolean(window.__ArChessLocalInputController),threeD:Boolean(window.__ArChessThreeD),gateHidden:document.querySelector('#archessAuthGate')?.classList.contains('hidden')})")
        assert initial == {"player": "white", "phase": "aim", "pieces": 32, "input": True, "threeD": True, "gateHidden": True}

        board = page.locator("#boardWrap")
        box = board.bounding_box()
        assert box and abs(box[2] - box[3]) < 3
        x0 = box[0] + box[2] * (0.5 / 8)
        y0 = box[1] + box[3] * (6.5 / 8)

        # Negative: clicking an opposing black piece during White's turn must not start a drag.
        black_x = box[0] + box[2] * (0.5 / 8)
        black_y = box[1] + box[3] * (0.5 / 8)
        page.mouse.click(black_x, black_y)
        assert page.evaluate("() => ({dragging:gameState.dragging,selected:gameState.selectedPiece?.team||null,player:gameState.currentPlayer})") == {"dragging": False, "selected": None, "player": "white"}

        # Positive: drag a white pawn backward and release.
        page.mouse.move(x0, y0)
        page.mouse.down()
        page.mouse.move(x0 - 120, y0, steps=12)
        assert page.evaluate("() => gameState.dragging") is True
        assert page.evaluate("() => gameState.powerRatio > 0") is True
        assert page.locator("#trajectoryCanvas").count() == 1
        page.mouse.up()
        page.wait_for_function("() => gameState.phase === 'aim' && gameState.currentPlayer === 'black'", timeout=7000)
        after_white = page.evaluate("() => ({player:gameState.currentPlayer,phase:gameState.phase,history:gameState.history.length,moving:gameState.pieces.some(p=>p.moving)})")
        assert after_white["player"] == "black"
        assert after_white["phase"] == "aim"
        assert after_white["history"] >= 2
        assert after_white["moving"] is False

        # Negative: White cannot launch again during Black's turn.
        page.mouse.click(x0, y0)
        assert page.evaluate("() => gameState.dragging") is False

        # Positive: Black launches a black pawn; turn must return to White.
        bx = black_x
        by = black_y
        page.mouse.move(bx, by)
        page.mouse.down()
        page.mouse.move(bx + 120, by, steps=12)
        assert page.evaluate("() => gameState.dragging") is True
        page.mouse.up()
        page.wait_for_function("() => gameState.phase === 'aim' && gameState.currentPlayer === 'white'", timeout=7000)
        after_black = page.evaluate("() => ({player:gameState.currentPlayer,phase:gameState.phase})")
        assert after_black == {"player": "white", "phase": "aim"}

        # Negative: empty-board click must not create a selected piece.
        page.mouse.click(box[0] + box[2] * 0.5, box[1] + box[3] * 0.5)
        assert page.evaluate("() => gameState.selectedPiece === null") is True

        page.goto(f"{BASE}/profile", wait_until="networkidle")
        expect(page.locator("#name")).to_have_text(account["username"], timeout=5000)
        page.click("#logout")
        page.wait_for_url("**/login")
        page.goto(f"{BASE}/", wait_until="networkidle")
        page.wait_for_timeout(700)
        assert page.evaluate("() => document.querySelector('#archessAuthGate')?.classList.contains('hidden')") is False

        browser.close()
