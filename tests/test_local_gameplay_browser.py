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

        # Create a real test account so the arena auth gate is passed exactly as a user would.
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
        page.wait_for_timeout(1200)

        state = page.evaluate(
            """() => ({
                authenticated: document.body.classList.contains('archess-authenticated'),
                currentPlayer: window.gameState?.currentPlayer,
                phase: window.gameState?.phase,
                pieces: window.gameState?.pieces?.length ?? 0,
                glReady: document.body.classList.contains('archess-3d-ready'),
            })"""
        )
        assert state["authenticated"] is True
        assert state["currentPlayer"] == "white"
        assert state["phase"] == "aim"
        assert state["pieces"] == 32
        assert state["glReady"] is True

        white = page.evaluate(
            """() => window.gameState.pieces.find(p => p.alive && p.team === 'white' && p.type === 'pawn')"""
        )
        assert white

        rect = page.locator("#gameCanvas").bounding_box()
        assert rect
        sx = rect["x"] + (white["x"] / 8.0) * rect["width"]
        sy = rect["y"] + (white["y"] / 8.0) * rect["height"]
        # Pull the piece down/left and release: this should launch the white pawn.
        ex = sx - min(120, rect["width"] * 0.18)
        ey = sy - min(35, rect["height"] * 0.06)

        page.mouse.move(sx, sy)
        page.mouse.down()
        page.mouse.move(ex, ey, steps=12)
        page.mouse.up()

        page.wait_for_timeout(1200)
        after = page.evaluate(
            """() => ({
                currentPlayer: window.gameState?.currentPlayer,
                phase: window.gameState?.phase,
                moving: window.gameState?.pieces?.filter(p => p.moving).length ?? 0,
                history: window.gameState?.history?.slice(-3) ?? [],
            })"""
        )

        assert after["phase"] == "aim", after
        assert after["currentPlayer"] == "black", after
        assert any("Black to move." in entry for entry in after["history"]), after

        black = page.evaluate(
            """() => window.gameState.pieces.find(p => p.alive && p.team === 'black' && p.type === 'pawn')"""
        )
        assert black
        sx2 = rect["x"] + (black["x"] / 8.0) * rect["width"]
        sy2 = rect["y"] + (black["y"] / 8.0) * rect["height"]

        # The opposite side must now be selectable. A failed selection is the exact regression the user reported.
        page.mouse.click(sx2, sy2)
        selected = page.evaluate("() => window.gameState?.selectedPiece?.team ?? null")
        assert selected == "black"

        page.mouse.down()
        page.mouse.move(sx2 + min(100, rect["width"] * 0.14), sy2 + min(30, rect["height"] * 0.05), steps=10)
        page.mouse.up()
        page.wait_for_timeout(800)

        second = page.evaluate(
            """() => ({currentPlayer: window.gameState?.currentPlayer, phase: window.gameState?.phase})"""
        )
        assert second["phase"] in {"physics", "aim"}
        assert second["currentPlayer"] in {"white", "black"}

        browser.close()
