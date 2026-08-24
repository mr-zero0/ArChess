import os

import pytest
from playwright.sync_api import sync_playwright


@pytest.mark.skipif(os.environ.get("RUN_BROWSER_MATRIX") != "1", reason="Browser matrix requires installed Playwright browsers")
def test_three_d_renderer_is_visible():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        page.goto("http://localhost:5000/", wait_until="networkidle")
        page.wait_for_timeout(400)

        state = page.evaluate(
            """() => {
                const gl = document.querySelector('#glCanvas');
                const game = document.querySelector('#gameCanvas');
                const scene = window.__ArChessThreeD;
                const board = scene?.scene;
                const glContext = gl?.getContext('webgl2');
                const px = new Uint8Array(4);
                if (glContext) glContext.readPixels(0, 0, 1, 1, glContext.RGBA, glContext.UNSIGNED_BYTE, px);
                return {
                    ready: document.body.classList.contains('archess-3d-ready'),
                    scene: Boolean(scene),
                    children: board?.children?.length ?? 0,
                    glWidth: gl?.clientWidth ?? 0,
                    glHeight: gl?.clientHeight ?? 0,
                    gameOpacity: getComputedStyle(game).opacity,
                    pixelSum: Array.from(px).reduce((a, b) => a + b, 0),
                };
            }"""
        )

        assert state["ready"] is True
        assert state["scene"] is True
        assert state["children"] >= 20
        assert state["glWidth"] > 0 and state["glHeight"] > 0
        assert float(state["gameOpacity"]) == 0.0
        assert state["pixelSum"] > 0

        browser.close()
