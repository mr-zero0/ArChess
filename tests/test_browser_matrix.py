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

RUN_BROWSER_MATRIX = os.environ.get("RUN_BROWSER_MATRIX") == "1"


@pytest.mark.parametrize("browser_name", BROWSERS)
@pytest.mark.parametrize("viewport", VIEWPORTS, ids=lambda v: v["name"])
@pytest.mark.skipif(not RUN_BROWSER_MATRIX, reason="Browser matrix requires installed Playwright browsers")
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


@pytest.mark.skipif(not RUN_BROWSER_MATRIX, reason="Browser matrix requires installed Playwright browsers")
def test_browser_authoritative_multiplayer_flow():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context_one = browser.new_context(viewport={"width": 1280, "height": 800})
        context_two = browser.new_context(viewport={"width": 1280, "height": 800})
        page_one = context_one.new_page()
        page_two = context_two.new_page()

        assert page_one.goto("http://localhost:5000/").status == 200
        assert page_two.goto("http://localhost:5000/").status == 200

        suffix = str(time.time_ns())
        white_guest = f"browser-white-{suffix}"
        black_guest = f"browser-black-{suffix}"

        created = page_one.evaluate(
            "async guestId => await (await fetch('/api/rooms', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({guestId})})).json()",
            white_guest,
        )
        room_code = created["roomId"]
        assert created["players"][0]["team"] == "white"

        joined = page_two.evaluate(
            "async ({room, guestId}) => await (await fetch(`/api/rooms/${room}/join`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({guestId})})).json()",
            {"room": room_code, "guestId": black_guest},
        )
        assert len(joined["players"]) == 2
        assert any(player["team"] == "black" for player in joined["players"])

        started = page_one.evaluate(
            "async room => await (await fetch(`/api/rooms/${room}/start`, {method:'POST', headers:{'Content-Type':'application/json'}, body:'{}'})).json()",
            room_code,
        )
        assert started["state"]["currentTeam"] == "white"
        assert len(started["state"]["pieces"]) == 32

        white_piece = next(piece for piece in started["state"]["pieces"] if piece["team"] == "white" and piece["alive"])
        launched = page_one.evaluate(
            "async ({room, guestId, pieceId}) => await (await fetch(`/api/rooms/${room}/launch`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({guestId, launchData:{pieceId, drag:{x:0.9,y:0}}})})).json()",
            {"room": room_code, "guestId": white_guest, "pieceId": white_piece["id"]},
        )
        assert launched["status"] == "success"
        assert launched["nextTurn"] == "black"
        assert launched["state"]["currentTeam"] == "black"

        reconnect = page_two.evaluate(
            "async ({room, guestId}) => await (await fetch(`/api/rooms/${room}/reconnect`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({guestId})})).json()",
            {"room": room_code, "guestId": black_guest},
        )
        assert reconnect["currentTurn"] == "black"
        assert reconnect["state"] == launched["state"]
        context_one.close()
        context_two.close()
        browser.close()
