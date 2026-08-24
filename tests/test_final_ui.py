from pathlib import Path

import pytest
from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]


def test_final_ui_assets_are_wired():
    html = (ROOT / "templates" / "index.html").read_text(encoding="utf-8")
    assert "final_ui.js" in html
    assert Path(ROOT / "static" / "css" / "final_ui.css").exists()
    assert Path(ROOT / "static" / "js" / "final_ui.js").exists()


@pytest.mark.skipif(True, reason="Browser-specific assertions run in the existing browser matrix")
def test_placeholder():
    pass


def test_final_ui_browser_contract():
    # The standard CI workflow runs this test with RUN_BROWSER_MATRIX=1 after
    # installing Playwright browsers. Keep it skipped during normal pytest runs.
    if __import__("os").environ.get("RUN_BROWSER_MATRIX") != "1":
        pytest.skip("browser matrix only")
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        response = page.goto("http://localhost:5000/", wait_until="networkidle")
        assert response and response.status == 200
        assert page.locator(".au-topbar").is_visible()
        assert page.locator(".au-nav button").count() >= 4
        assert not page.locator(".left-panel").is_visible()
        assert not page.locator(".right-panel").is_visible()
        page.get_by_role("button", name="Profile").click()
        assert page.get_by_text("Welcome to ArChess").is_visible()
        assert page.get_by_role("link", name="SIGN IN / CREATE ACCOUNT").is_visible()
        browser.close()
