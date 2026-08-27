import os

import pytest
from playwright.sync_api import sync_playwright

RUN_BROWSER = os.getenv("RUN_BROWSER_MATRIX") == "1"
BASE = "http://127.0.0.1:5000"


@pytest.mark.skipif(not RUN_BROWSER, reason="Browser regression requires Playwright")
def test_2d_arena_surface_and_no_3d_runtime():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto(BASE, wait_until="networkidle")
        page.wait_for_timeout(1200)

        assert page.locator("#gameCanvas").count() == 1
        assert page.locator("#chessBoard").count() == 1
        assert page.locator("#archessProfessionalShell").count() == 0
        assert page.locator("#archessProToolbar").count() == 0
        assert page.evaluate("() => document.body.dataset.renderMode") == "2d"
        assert page.evaluate("() => window.gameState?.phase") == "aim"
        assert page.evaluate("() => window.gameState?.pieces?.length") == 32
        assert page.evaluate("() => Boolean(window.ThreeDScene)") is False
        forbidden = page.evaluate("""() => Array.from(document.scripts).map(s => s.src).filter(Boolean).filter(src => [
            'render3d.js','professional_shell.js','professional_runtime.js','render_router.js',
            'release_boot.js','runtime_stabilizer.js','camera_controls.js','presentation_fix.js',
            'presentation_fallback3d.js','local_input_controller.js','local_input_v2.js','final_ui.js'
        ].some(name => src.includes(name)))""")
        assert forbidden == []
        browser.close()


@pytest.mark.skipif(not RUN_BROWSER, reason="Browser regression requires Playwright")
def test_2d_arena_board_responsive_and_theme():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto(BASE, wait_until="networkidle")
        page.wait_for_timeout(900)

        metrics = page.evaluate("""() => {
            const board = document.getElementById('chessBoard');
            const shell = document.getElementById('boardWrap');
            return { boardBox: board?.getBoundingClientRect(), shellBox: shell?.getBoundingClientRect(), theme: document.documentElement.dataset.theme, library: document.body.dataset.boardRenderer };
        }""")
        assert metrics["boardBox"]["width"] > 300
        assert metrics["boardBox"]["height"] > 300
        assert metrics["library"] in ("library", "canvas")

        page.locator("#themeBtn").click()
        theme_after = page.evaluate("() => document.documentElement.dataset.theme")
        assert theme_after in ("dark", "light", "wood")

        page.set_viewport_size({"width": 390, "height": 844})
        page.wait_for_timeout(300)
        mobile = page.evaluate("""() => {
            const r = document.getElementById('boardWrap').getBoundingClientRect();
            return {width:r.width,height:r.height,viewport:innerWidth};
        }""")
        assert mobile["width"] <= mobile["viewport"]
        browser.close()


@pytest.mark.skipif(not RUN_BROWSER, reason="Browser regression requires Playwright")
def test_negative_wrong_team_selection_and_zero_release():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        page.goto(BASE, wait_until="networkidle")
        page.wait_for_timeout(900)
        canvas = page.locator("#gameCanvas")
        rect = canvas.bounding_box()
        assert rect

        black = page.evaluate("() => gameState.pieces.find(p => p.alive && p.team === 'black' && p.type === 'pawn')")
        assert black
        bx = rect["x"] + black["x"] / 8 * rect["width"]
        by = rect["y"] + black["y"] / 8 * rect["height"]
        page.mouse.click(bx, by)
        state = page.evaluate("() => ({selected:gameState.selectedPiece, feedback:gameState.feedback?.text, player:gameState.currentPlayer})")
        assert state["selected"] is None
        assert state["player"] == "white"
        assert "Only WHITE" in (state["feedback"] or "")

        white = page.evaluate("() => gameState.pieces.find(p => p.alive && p.team === 'white' && p.type === 'pawn')")
        sx = rect["x"] + white["x"] / 8 * rect["width"]
        sy = rect["y"] + white["y"] / 8 * rect["height"]
        page.mouse.move(sx, sy)
        page.mouse.down()
        page.mouse.up()
        state = page.evaluate("() => ({phase:gameState.phase,dragging:gameState.dragging,selected:gameState.selectedPiece})")
        assert state["phase"] == "aim"
        assert state["dragging"] is False
        assert state["selected"] is None
        browser.close()


@pytest.mark.skipif(not RUN_BROWSER, reason="Browser regression requires Playwright")
def test_positive_drag_release_and_turn_resolution():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto(BASE, wait_until="networkidle")
        page.wait_for_timeout(900)
        canvas = page.locator("#gameCanvas")
        rect = canvas.bounding_box()
        assert rect
        white = page.evaluate("() => gameState.pieces.find(p => p.alive && p.team === 'white' && p.type === 'pawn')")
        assert white
        sx = rect["x"] + white["x"] / 8 * rect["width"]
        sy = rect["y"] + white["y"] / 8 * rect["height"]

        page.mouse.move(sx, sy)
        page.mouse.down()
        page.mouse.move(sx - 100, sy, steps=8)
        assert page.evaluate("() => gameState.dragging") is True
        assert page.evaluate("() => gameState.powerRatio") > 0
        page.mouse.up()
        assert page.evaluate("() => gameState.dragging") is False
        page.wait_for_function("() => gameState.phase === 'aim' && gameState.currentPlayer === 'black'", timeout=10000)
        assert page.evaluate("() => gameState.pieces.some(p => p.moving)") is False
        browser.close()


def test_tracker_and_workflow_contract():
    tracker = os.path.join(os.path.dirname(os.path.dirname(__file__)), "ARCHESS_TRACKER.md")
    assert os.path.exists(tracker)
    with open(tracker, encoding="utf-8") as handle:
        text = handle.read()
    assert "2D" in text
    assert "GitHub Actions" in text
    assert "DEFERRED" in text or "DISABLED" in text
