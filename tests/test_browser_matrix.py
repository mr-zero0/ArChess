import json
import os
import time

import pytest
from playwright.sync_api import sync_playwright

from tests.browser_helpers import is_headed, open_page

BROWSERS = ["chromium", "firefox", "webkit"]
VIEWPORTS = [
    {"name": "desktop", "width": 1920, "height": 1080},
    {"name": "tablet", "width": 768, "height": 1024},
    {"name": "mobile", "width": 375, "height": 667},
]

RUN_BROWSER_MATRIX = os.environ.get("RUN_BROWSER_MATRIX") == "1"
BASE = "http://127.0.0.1:5000"


@pytest.mark.parametrize("browser_name", BROWSERS)
@pytest.mark.parametrize("viewport", VIEWPORTS, ids=lambda v: v["name"])
@pytest.mark.skipif(not RUN_BROWSER_MATRIX, reason="Browser matrix requires installed Playwright browsers")
def test_browser_matrix_viewports(browser_name, viewport):
    with sync_playwright() as p:
        browser_type = getattr(p, browser_name)
        browser = browser_type.launch(headless=not is_headed())
        context_args = {"viewport": {"width": viewport["width"], "height": viewport["height"]}}
        if viewport["name"] in ["mobile", "tablet"]:
            context_args["has_touch"] = True
        context = browser.new_context(**context_args)
        page = context.new_page()
        open_page(page)
        assert page.locator("#gameCanvas").count() == 1
        assert page.locator("#chessBoard").count() == 1
        assert page.locator("#newGameBtn").count() == 1
        assert page.evaluate("() => document.body.dataset.renderMode") == "2d"
        assert page.evaluate("() => window.gameState?.pieces?.length") == 32
        assert page.evaluate("() => Boolean(window.ThreeDScene)") is False
        assert page.evaluate("() => Boolean(document.querySelector('#archessProfessionalShell'))") is False
        assert page.evaluate("() => Boolean(document.querySelector('#glCanvas'))") is False
        box = page.locator("#boardWrap").bounding_box()
        assert box and box["width"] > 250 and box["height"] > 250
        assert abs(box["width"] - box["height"]) < 4
        context.close()
        browser.close()


@pytest.mark.skipif(not RUN_BROWSER_MATRIX, reason="Browser matrix requires installed Playwright browsers")
def test_browser_authoritative_multiplayer_flow():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not is_headed())
        context_one = browser.new_context(viewport={"width": 1280, "height": 800})
        context_two = browser.new_context(viewport={"width": 1280, "height": 800})
        page_one = context_one.new_page()
        page_two = context_two.new_page()
        open_page(page_one)
        open_page(page_two)
        suffix = str(time.time_ns())
        white_guest = f"browser-white-{suffix}"
        black_guest = f"browser-black-{suffix}"
        created = page_one.evaluate("async guestId => await (await fetch('/api/rooms', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({guestId})})).json()", white_guest)
        room_code = created["roomId"]
        assert created["players"][0]["team"] == "white"
        joined = page_two.evaluate("async ({room, guestId}) => await (await fetch(`/api/rooms/${room}/join`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({guestId})})).json()", {"room": room_code, "guestId": black_guest})
        assert len(joined["players"]) == 2
        assert any(player["team"] == "black" for player in joined["players"])
        started = page_one.evaluate("async room => await (await fetch(`/api/rooms/${room}/start`, {method:'POST', headers:{'Content-Type':'application/json'}, body:'{}'})).json()", room_code)
        assert started["state"]["currentTeam"] == "white"
        assert len(started["state"]["pieces"]) == 32
        assert started["room"]["canonicalHash"]
        white_piece = next(piece for piece in started["state"]["pieces"] if piece["team"] == "white" and piece["alive"])
        launched = page_one.evaluate("async ({room, guestId, pieceId}) => await (await fetch(`/api/rooms/${room}/launch`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({guestId, launchData:{pieceId, drag:{x:0.9,y:0}}})})).json()", {"room": room_code, "guestId": white_guest, "pieceId": white_piece["id"]})
        assert launched["status"] == "success"
        assert launched["nextTurn"] == "black"
        assert launched["state"]["currentTeam"] == "black"
        post_hash = launched["state"]["integrity"]["postHash"]
        assert isinstance(post_hash, str) and len(post_hash) == 64
        reconnect = page_two.evaluate("async ({room, guestId}) => await (await fetch(`/api/rooms/${room}/reconnect`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({guestId})})).json()", {"room": room_code, "guestId": black_guest})
        assert reconnect["currentTurn"] == "black"
        assert reconnect["room"]["canonicalHash"] == post_hash
        assert json.loads(reconnect["state"]) == launched["state"]
        context_one.close()
        context_two.close()
        browser.close()
