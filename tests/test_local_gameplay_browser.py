import os
import time

import pytest
from playwright.sync_api import sync_playwright

RUN_BROWSER_MATRIX = os.environ.get("RUN_BROWSER_MATRIX") == "1"


@pytest.mark.skipif(not RUN_BROWSER_MATRIX, reason="Browser matrix requires installed Playwright browsers")
def test_local_physics_turn_alternates_after_real_drag():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        page.goto("/login")

        suffix = str(time.time_ns())
        username = f"Play_{suffix[-8:]}"
        email = f"play-{suffix}@example.com"
        page.click("#signupTab")
        page.locator('#signupForm input[name="username"]').fill(username)
        page.locator('#signupForm input[name="email"]').fill(email)
        page.locator('#signupForm input[name="password"]').fill("A-strong-password-123")
        page.click('#signupForm button.primary')
        page.wait_for_url("**/profile")

        page.goto("/")
        page.wait_for_timeout(1500)

        initial = page.evaluate("""() => ({
            authenticated: document.body.classList.contains('archess-authenticated'),
            currentPlayer: gameState.currentPlayer,
            phase: gameState.phase,
            pieces: gameState.pieces.length,
            threeDReady: document.body.classList.contains('archess-3d-ready'),
            trajectoryScript: Boolean(window.__ArChessLocalInputV2),
            piecePack: document.documentElement.dataset.ossPieces || 'loading'
        })""")
        assert initial == {
            "authenticated": True,
            "currentPlayer": "white",
            "phase": "aim",
            "pieces": 32,
            "threeDReady": True,
            "trajectoryScript": True,
            "piecePack": "loading",
        } or initial["piecePack"] in {"loading", "ready", "fallback"}

        # Give the lazy Staunton pack time to finish before validating the final scene.
        page.wait_for_function("() => document.documentElement.dataset.ossPieces === 'ready'", timeout=10000)
        pack = page.evaluate("""() => ({
            status: document.documentElement.dataset.ossPieces,
            modelCount: [...(window.__ArChessThreeD?.entries?.values() || [])].filter(e => e.__ossModel).length,
            entryCount: window.__ArChessThreeD?.entries?.size || 0,
        })""")
        assert pack["status"] == "ready"
        assert pack["entryCount"] == 32
        assert pack["modelCount"] == 32

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

        # Wait for the actual simulation to settle and main.js to perform its normal turn transition.
        page.wait_for_function("() => gameState.phase === 'aim' && gameState.currentPlayer === 'black'", timeout=10000)
        after_white = page.evaluate("""() => ({
            currentPlayer: gameState.currentPlayer,
            phase: gameState.phase,
            moving: gameState.pieces.filter(p => p.moving).length,
            history: gameState.history.slice(-4),
            launched: Boolean(gameState.__lastLaunchPiece),
        })""")
        assert after_white["phase"] == "aim", after_white
        assert after_white["currentPlayer"] == "black", after_white
        assert after_white["moving"] == 0, after_white
        assert any("Black to move." in entry for entry in after_white["history"]), after_white

        # Verify the 3D visual flight actually separates from the board plane during motion.
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
        page.mouse.move(bx + min(130, rect["width"] * 0.18), by + min(40, rect["height"] * 0.06), steps=6)
        visual_samples = page.evaluate("""() => {
            const entry = [...window.__ArChessThreeD.entries.values()].find(e => e.piece.team === 'black' && e.piece.type === 'pawn' && e.piece.moving);
            return entry ? { y: entry.group.position.y, moving: entry.piece.moving } : null;
        }""")
        assert visual_samples and visual_samples["moving"] is True
        assert visual_samples["y"] > 0.02, visual_samples
        page.mouse.up()
        page.wait_for_timeout(150)

        second = page.evaluate("() => ({phase: gameState.phase, currentPlayer: gameState.currentPlayer, selected: gameState.selectedPiece?.team || null})")
        assert second["phase"] == "physics", second
        assert second["currentPlayer"] == "black", second
        assert second["selected"] is None, second

        browser.close()
