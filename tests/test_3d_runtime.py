import os

import pytest
from playwright.sync_api import sync_playwright


@pytest.mark.skipif(os.environ.get("RUN_BROWSER_MATRIX") != "1", reason="Browser matrix requires installed Playwright browsers")
def test_three_d_renderer_is_visible():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(viewport={"width":1440,"height":900})
        page = context.new_page()
        page.goto("http://localhost:5000/", wait_until="networkidle")
        page.wait_for_timeout(900)

        state = page.evaluate("""() => {
            const gl=document.querySelector('#glCanvas');
            const game=document.querySelector('#gameCanvas');
            const scene=window.__ArChessThreeD;
            return {
                ready:document.body.classList.contains('archess-3d-ready'),
                scene:Boolean(scene),
                children:scene?.scene?.children?.length??0,
                entries:scene?.entries?.size??0,
                glWidth:gl?.clientWidth??0,
                glHeight:gl?.clientHeight??0,
                gameOpacity:getComputedStyle(game).opacity,
                glOpacity:getComputedStyle(gl).opacity,
                renderCalls:scene?.renderer?.info?.render?.calls??0,
                renderTriangles:scene?.renderer?.info?.render?.triangles??0,
            };
        }""")

        assert state["scene"] is True
        assert state["children"] >= 20
        assert state["entries"] == 32
        assert state["glWidth"] > 0 and state["glHeight"] > 0
        assert state["gameOpacity"] == "1"

        page.locator("[data-archess-mode='3d']").click()
        page.wait_for_function("() => document.body.dataset.renderMode === '3d'")
        page.wait_for_timeout(250)

        state_3d = page.evaluate("""() => ({
            ready:document.body.classList.contains('archess-3d-ready'),
            gameOpacity:getComputedStyle(document.querySelector('#gameCanvas')).opacity,
            glOpacity:getComputedStyle(document.querySelector('#glCanvas')).opacity,
            renderCalls:window.__ArChessThreeD?.renderer?.info?.render?.calls??0,
            renderTriangles:window.__ArChessThreeD?.renderer?.info?.render?.triangles??0
        })""")
        assert state_3d["ready"] is True
        assert state_3d["gameOpacity"] == "0"
        assert state_3d["glOpacity"] == "1"
        assert state_3d["renderCalls"] > 0
        assert state_3d["renderTriangles"] > 0

        page.locator("[data-archess-mode='2d']").click()
        page.wait_for_function("() => document.body.dataset.renderMode === '2d'")
        assert page.evaluate("() => getComputedStyle(document.querySelector('#gameCanvas')).opacity") == "1"
        browser.close()
