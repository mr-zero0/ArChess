import os

import pytest
from playwright.sync_api import sync_playwright


@pytest.mark.skipif(os.environ.get("RUN_BROWSER_MATRIX") != "1", reason="Browser matrix requires installed Playwright browsers")
def test_three_d_compatibility_fallback_when_webgl2_api_is_unavailable():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        page.add_init_script("delete window.WebGL2RenderingContext")
        page.goto("http://localhost:5000/", wait_until="networkidle")
        page.wait_for_timeout(900)

        state = page.evaluate(
            """() => ({
                compatReady: Boolean(document.querySelector('#archessCompat3D.ready')),
                pieceCount: document.querySelectorAll('#archessCompat3D .c3d-piece').length,
                gameOpacity: getComputedStyle(document.querySelector('#gameCanvas')).opacity,
                compatVisible: getComputedStyle(document.querySelector('#archessCompat3D')).display,
            })"""
        )

        assert state["compatReady"] is True
        assert state["pieceCount"] >= 32
        assert float(state["gameOpacity"]) == 0.0
        assert state["compatVisible"] == "block"

        browser.close()
