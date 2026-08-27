import os
import time

import pytest
from playwright.sync_api import sync_playwright

from tests.browser_helpers import is_headed, open_page

RUN_BROWSER_MATRIX = os.environ.get("RUN_BROWSER_MATRIX") == "1"
BASE = "http://127.0.0.1:5000"


@pytest.mark.skipif(not RUN_BROWSER_MATRIX, reason="Browser matrix requires installed Playwright browsers")
def test_local_drag_release_alternates_white_to_black_and_back():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not is_headed())
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        open_page(page, "/login", require_game=False)

        suffix = str(time.time_ns())
        page.click("#signupTab")
        page.locator('#signupForm input[name="username"]').fill(f"Play{suffix[-8:]}")
        page.locator('#signupForm input[name="email"]').fill(f"play{suffix}@example.com")
        page.locator('#signupForm input[name="password"]').fill("A-strong-password-123")
        page.click('#signupForm button.primary')
        page.wait_for_url("**/profile", timeout=10000)

        open_page(page)
        state = page.evaluate("() => ({player:gameState.currentPlayer,phase:gameState.phase,pieces:gameState.pieces.length,input:!!document.querySelector('#gameCanvas'),threeD:Boolean(window.ThreeDScene)})")
        assert state == {"player": "white", "phase": "aim", "pieces": 32, "input": True, "threeD": False}

        canvas = page.locator("#gameCanvas")
        rect = canvas.bounding_box()
        white = page.evaluate("() => gameState.pieces.find(p => p.alive && p.team==='white' && p.type==='pawn')")
        assert rect and white
        sx = rect["x"] + white["x"] / 8 * rect["width"]
        sy = rect["y"] + white["y"] / 8 * rect["height"]

        page.mouse.move(sx, sy)
        page.mouse.down()
        page.mouse.move(sx - 120, sy - 30, steps=12)
        drag_state = page.evaluate("() => ({dragging:gameState.dragging,team:gameState.selectedPiece?.team,power:gameState.powerRatio})")
        assert drag_state["dragging"] is True
        assert drag_state["team"] == "white"
        assert drag_state["power"] > 0
        page.mouse.up()

        page.wait_for_function("() => gameState.phase === 'aim' && gameState.currentPlayer === 'black'", timeout=10000)
        assert page.evaluate("() => gameState.pieces.some(p => p.moving)") is False

        black = page.evaluate("() => gameState.pieces.find(p => p.alive && p.team==='black' && p.type==='pawn')")
        rect = canvas.bounding_box()
        assert black and rect
        bx = rect["x"] + black["x"] / 8 * rect["width"]
        by = rect["y"] + black["y"] / 8 * rect["height"]
        page.mouse.move(bx, by)
        page.mouse.down()
        page.mouse.move(bx + 120, by + 35, steps=12)
        black_drag = page.evaluate("() => ({dragging:gameState.dragging,team:gameState.selectedPiece?.team,power:gameState.powerRatio})")
        assert black_drag["dragging"] is True
        assert black_drag["team"] == "black"
        assert black_drag["power"] > 0
        page.mouse.up()

        page.wait_for_function("() => gameState.phase === 'aim' && gameState.currentPlayer === 'white'", timeout=10000)
        assert page.evaluate("() => gameState.pieces.some(p => p.moving)") is False

        browser.close()
