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
        page.wait_for_timeout(1200)

        expect(page.locator("#archessProToolbar")).to_have_count(1)
        expect(page.locator("[data-archess-mode='2d']")).to_have_count(1)
        expect(page.locator("[data-archess-mode='3d']")).to_have_count(1)
        expect(page.locator(".archess-theme-choice")).to_have_count(4)

        page.locator("[data-archess-mode='2d']").click()
        expect(page.locator("body")).to_have_class(lambda value: "archess-mode-2d" in value)
        assert page.evaluate("() => document.body.dataset.renderMode") == "2d"

        page.locator("[data-archess-mode='3d']").click()
        assert page.evaluate("() => document.body.dataset.renderMode") == "3d"

        page.locator("#archessThemeButton").click()
        page.locator(".archess-theme-choice[data-skin='emerald']").click()
        assert page.evaluate("() => document.documentElement.dataset.skin") == "emerald"

        page.locator("#archessThemeButton").click()
        page.locator(".archess-theme-choice[data-skin='walnut']").click()
        assert page.evaluate("() => document.documentElement.dataset.skin") == "walnut"
        browser.close()


@pytest.mark.skipif(not RUN_BROWSER, reason="Browser regression requires Playwright")
def test_professional_ui_resize_and_invalid_mode_recovery():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto(f"{BASE}/", wait_until="networkidle")
        page.wait_for_timeout(1000)

        start = page.evaluate("() => getComputedStyle(document.documentElement).getPropertyValue('--archess-board-size').trim()")
        page.locator("#archessBoardPlus").click()
        larger = page.evaluate("() => getComputedStyle(document.documentElement).getPropertyValue('--archess-board-size').trim()")
        assert larger != start

        page.locator("#archessBoardMinus").click()
        restored = page.evaluate("() => getComputedStyle(document.documentElement).getPropertyValue('--archess-board-size').trim()")
        assert restored == start

        result = page.evaluate("() => { try { window.__ArChessProfessionalUI && document.querySelector('[data-archess-mode=\"2d\"]')?.click(); return document.body.dataset.renderMode; } catch (_) { return 'error'; } }")
        assert result == "2d"
        browser.close()
