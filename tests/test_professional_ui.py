import os

import pytest
from playwright.sync_api import sync_playwright, expect

RUN_BROWSER = os.getenv("RUN_BROWSER_MATRIX") == "1"
BASE = "http://127.0.0.1:5000"


@pytest.mark.skipif(not RUN_BROWSER, reason="Browser regression requires Playwright")
def test_professional_ui_modes_and_theme_controls():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto(f"{BASE}/", wait_until="networkidle")
        page.wait_for_timeout(1400)

        expect(page.locator("#archessProfessionalShell")).to_have_count(1)
        expect(page.locator("#archessProToolbar")).to_have_count(0)
        expect(page.locator("[data-archess-mode='2d']")).to_have_count(1)
        expect(page.locator("[data-archess-mode='3d']")).to_have_count(1)
        expect(page.locator("[data-archess-skin]")).to_have_count(4)
        expect(page.locator("#archessProfessionalShell .aps-player")).to_have_count(1)
        expect(page.locator("#archessProfessionalShell .aps-context")).to_have_count(1)

        forbidden = page.evaluate("""() => Array.from(document.scripts).map(s => s.src).filter(Boolean).filter(src => [
            'final_ui.js','professional_ui.js','presentation_fix.js','presentation_fallback3d.js',
            'render_router.js','local_input_controller.js','projectile_visuals_v2.js'
        ].some(name => src.includes(name)))""")
        assert forbidden == []

        page.locator("[data-archess-mode='2d']").click()
        assert page.evaluate("() => document.body.classList.contains('archess-mode-2d')") is True
        assert page.evaluate("() => document.body.dataset.renderMode") == "2d"
        assert page.evaluate("() => getComputedStyle(document.getElementById('gameCanvas')).pointerEvents") == "auto"

        page.locator("[data-archess-mode='3d']").click()
        assert page.evaluate("() => document.body.classList.contains('archess-mode-3d')") is True
        assert page.evaluate("() => document.body.dataset.renderMode") == "3d"
        assert page.evaluate("() => getComputedStyle(document.getElementById('gameCanvas')).pointerEvents") == "auto"

        page.locator("#archessThemeButton").click()
        page.locator("[data-archess-skin='emerald']").click()
        assert page.evaluate("() => document.documentElement.dataset.skin") == "emerald"
        assert page.evaluate("() => getComputedStyle(document.body).backgroundColor")

        page.locator("#archessThemeButton").click()
        page.locator("[data-archess-skin='walnut']").click()
        assert page.evaluate("() => document.documentElement.dataset.skin") == "walnut"

        browser.close()


@pytest.mark.skipif(not RUN_BROWSER, reason="Browser regression requires Playwright")
def test_professional_ui_resize_focus_theatre_and_mobile_layout():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto(f"{BASE}/", wait_until="networkidle")
        page.wait_for_timeout(1000)

        start = page.evaluate("() => getComputedStyle(document.documentElement).getPropertyValue('--archess-board-size').trim()")
        page.locator("#archessBoardPlus").click()
        larger = page.evaluate("() => getComputedStyle(document.documentElement).getPropertyValue('--archess-board-size').trim()")
        assert larger != start

        page.locator("#archessFocusBtn").click()
        assert page.evaluate("() => document.body.classList.contains('archess-focus-mode')") is True
        assert page.locator("#archessProfessionalShell .aps-player").is_hidden()

        page.locator("#archessFocusBtn").click()
        page.locator("#archessTheatreBtn").click()
        assert page.evaluate("() => document.body.classList.contains('archess-theatre-mode')") is True
        assert page.locator("#archessProfessionalShell .aps-context").is_hidden()

        page.set_viewport_size({"width": 390, "height": 844})
        page.wait_for_timeout(250)
        assert page.evaluate("() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--archess-board-size')) <= 390")
        assert page.locator("#archessProfessionalShell .aps-topbar").is_visible()
        browser.close()


@pytest.mark.skipif(not RUN_BROWSER, reason="Browser regression requires Playwright")
def test_professional_ui_mode_switch_is_instant():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto(f"{BASE}/", wait_until="networkidle")
        page.wait_for_timeout(1400)

        result = page.evaluate("""() => {
            const button3d = document.querySelector('[data-archess-mode="3d"]');
            const button2d = document.querySelector('[data-archess-mode="2d"]');
            const t0 = performance.now();
            button3d?.click();
            const switched3d = document.body.dataset.renderMode === '3d';
            button2d?.click();
            const switched2d = document.body.dataset.renderMode === '2d';
            return { switched3d, switched2d, elapsed: performance.now() - t0 };
        }""")
        assert result["switched3d"] is True
        assert result["switched2d"] is True
        assert result["elapsed"] < 100
        browser.close()
