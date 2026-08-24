import os
import time

import pytest
from playwright.sync_api import sync_playwright

BROWSERS = ["chromium", "firefox", "webkit"]
VIEWPORTS = [
    {"name": "desktop", "width": 1920, "height": 1080},
    {"name": "tablet", "width": 768, "height": 1024},
    {"name": "mobile", "width": 375, "height": 667},
]


@pytest.mark.parametrize("browser_name", BROWSERS)
@pytest.mark.parametrize("viewport", VIEWPORTS, ids=lambda v: v["name"])
@pytest.mark.skipif(os.environ.get("CI") is None, reason="Only run in CI")
def test_browser_matrix_viewports(browser_name, viewport):
    with sync_playwright() as p:
        browser_type = getattr(p, browser_name)
        browser = browser_type.launch()
        context_args = {"viewport": {"width": viewport["width"], "height": viewport["height"]}}
        if viewport["name"] in ["mobile", "tablet"]:
            context_args["has_touch"] = True

        context = browser.new_context(**context_args)
        page = context.new_page()
        response = page.goto("http://localhost:5000/")
        assert response.status == 200
        assert page.viewport_size["width"] == viewport["width"]
        assert page.viewport_size["height"] == viewport["height"]

        if viewport["name"] in ["mobile", "tablet"]:
            assert page.evaluate("() => 'ontouchstart' in window") is True

        assert page.locator("#archessMultiPanel").count() == 1
        browser.close()


@pytest.mark.skipif(os.environ.get("CI") is None, reason="Only run in CI")
def test_browser_authoritative_multiplayer_flow():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        response = page.goto("http://localhost:5000/")
        assert response.status == 200

        suffix = str(time.time_ns())
        black_guest = f"browser-black-{suffix}"

        created = page.evaluate("async () => await window.ArChessMultiplayer.createRoom()")
        room_code = created["roomId"]
        assert page.evaluate("() => window.ArChessMultiplayer.team") == "white"

        joined = page.evaluate(
            "async ({room, guestId}) => await (await fetch(`/api/rooms/${room}/join`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({guestId})})).json()",
            {"room": room_code, "guestId": black_guest},
        )
        assert joined["status"] == "waiting"

        started = page.evaluate("async () => await window.ArChessMultiplayer.startRoom()")
        assert len(started["state"]["pieces"]) == 32
        assert page.evaluate("() => window.ArChessMultiplayer.active") is True
        assert page.evaluate("() => window.gameState.pieces.length") == 32
        assert page.evaluate("() => window.gameState.currentPlayer") == "white"

        launch_ok = page.evaluate(
            "async () => { const piece = window.gameState.pieces.find(p => p.team === 'white' && p.alive); return await window.ArChessMultiplayer.launch(piece, 0.9, 0); }"
        )
        assert launch_ok is True

        page.wait_for_timeout(150)
        assert page.evaluate("() => window.gameState.currentPlayer") == "black"
        browser.close()
