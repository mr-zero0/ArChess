import os
import time

import pytest
from playwright.sync_api import sync_playwright

RUN_BROWSER_MATRIX = os.environ.get("RUN_BROWSER_MATRIX") == "1"
BASE_URL = "http://localhost:5000"


@pytest.mark.skipif(not RUN_BROWSER_MATRIX, reason="Browser matrix requires installed Playwright browsers")
def test_local_physics_turn_alternates_after_real_drag():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        page.goto(f"{BASE_URL}/")
        page.wait_for_timeout(1200)

        state = page.evaluate("() => ({authenticated: document.body.classList.contains('archess-authenticated'), login: location.pathname, input: Boolean(window.__ArChessLocalInputV2)})")
        assert state["authenticated"] is False
        assert state["input"] is True
        assert state["login"] == "/"

        # The arena is gated. A browser-level authentication flow is covered by test_auth_browser.py;
        # this test focuses on the local physics path after the gate has been verified in the page runtime.
        page.goto(f"{BASE_URL}/login")
        assert page.url.endswith("/login")

        # Use the existing test account flow only when the login page exposes the expected signup controls.
        page.click("#signupTab")
        suffix = str(time.time_ns())
        username = f"Play_{suffix[-8:]}"
        email = f"play-{suffix}@example.com"
        page.locator('#signupForm input[name="username"]').fill(username)
        page.locator('#signupForm input[name="email"]').fill(email)
        page.locator('#signupForm input[name="password"]').fill("A-strong-password-123")
        page.click('#signupForm button.primary')
        page.wait_for_url("**/profile")
        page.goto(f"{BASE_URL}/")
        page.wait_for_timeout(1200)

        initial = page.evaluate("""() => ({
            authenticated: document.body.classList.contains('archess-authenticated'),
            currentPlayer: gameState.currentPlayer,
            phase: gameState.phase,
            pieces: gameState.pieces.length,
            threeDReady: document.body.classList.contains('archess-3d-ready'),
            trajectoryScript: Boolean(window.__ArChessLocalInputV2),
            piecePack: document.documentElement.dataset.ossPieces || 'loading'
        })""")
        assert initial["authenticated"] is True
        assert initial["currentPlayer"] == "white"
        assert initial["phase"] == "aim"
        assert initial["pieces"] == 32
        assert initial["threeDReady"] is True
        assert initial["trajectoryScript"] is True

        page.wait_for_function("() => ['loading','ready','fallback'].includes(document.documentElement.dataset.ossPieces || 'loading')", timeout=5000)
        trajectory = page.locator("#trajectoryCanvas")
        assert trajectory.count() == 1

        white = page.evaluate("() => gameState.pieces.find(p => p.alive && p.team === 'white' && p.type === 'pawn')")
        assert white
        rect = page.locator("#gameCanvas").bounding_box()
        assert rect
        sx = rect["x"] + (white["x"] / 8) * rect["width"]
        sy = rect["y"] + (white["y"] / 8) * rect["height"]
        ex = sx - min(120, rect["width"] * 0.18)
        ey = sy - min(35, rect["height"] * 0.06)

        page.mouse.move(sx, sy)
        page.mouse.down()
        page.mouse.move(ex, ey, steps=12)
        page.wait_for_timeout(80)
        dragging = page.evaluate("() => ({dragging: gameState.dragging, selected: gameState.selectedPiece?.team || null, power: gameState.powerRatio})")
        assert dragging["dragging"] is True
        assert dragging["selected"] == "white"
        assert dragging["power"] > 0
        page.mouse.up()

        page.wait_for_function("() => gameState.phase === 'aim' && gameState.currentPlayer === 'black'", timeout=10000)
        after_white = page.evaluate("""() => ({
            currentPlayer: gameState.currentPlayer,
            phase: gameState.phase,
            moving: gameState.pieces.filter(p => p.moving).length,
            history: gameState.history.slice(-4),
        })""")
        assert after_white["phase"] == "aim", after_white
        assert after_white["currentPlayer"] == "black", after_white
        assert after_white["moving"] == 0, after_white
        assert any("Black to move." in entry for entry in after_white["history"]), after_white

        black = page.evaluate("() => gameState.pieces.find(p => p.alive && p.team === 'black' && p.type === 'pawn')")
        assert black
        rect = page.locator("#gameCanvas").bounding_box()
        assert rect
        bx = rect["x"] + (black["x"] / 8) * rect["width"]
        by = rect["y"] + (black["y"] / 8) * rect["height"]
        page.mouse.click(bx, by)
        assert page.evaluate("() => gameState.selectedPiece?.team || null") == "black"

        page.mouse.down()
        page.mouse.move(bx + min(100, rect["width"] * 0.14), by + min(30, rect["height"] * 0.05), steps=10)
        page.mouse.up()
        page.wait_for_function("() => gameState.phase === 'physics' && gameState.currentPlayer === 'black'", timeout=2000)
        page.wait_for_function("() => { const e=[...window.__ArChessThreeD.entries.values()].find(x=>x.piece.team==='black'&&x.piece.type==='pawn'); return e ? e.piece.moving && e.group.position.y > 0.02 : false; }", timeout=1500)

        flight = page.evaluate("""() => {
            const e=[...window.__ArChessThreeD.entries.values()].find(x=>x.piece.team==='black'&&x.piece.type==='pawn');
            return e ? {y:e.group.position.y,moving:e.piece.moving} : null;
        }""")
        assert flight and flight["moving"] is True, flight
        assert flight["y"] > 0.02, flight

        browser.close()
