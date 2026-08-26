from pathlib import Path

import os
import pytest
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


def test_ui_runtime_assets_are_wired():
    html = (ROOT / "templates" / "index.html").read_text(encoding="utf-8")
    assert "release_boot.js" in html
    assert "archess_bootstrap.js" not in html
    assert Path(ROOT / "static" / "js" / "release_boot.js").exists()
    assert Path(ROOT / "static" / "js" / "professional_runtime.js").exists()


@pytest.mark.skipif(os.environ.get("RUN_BROWSER_MATRIX") != "1", reason="browser matrix only")
def test_ui_browser_contract():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        response = page.goto("http://localhost:5000/", wait_until="networkidle")
        assert response and response.status == 200
        page.wait_for_timeout(1000)
        assert page.locator("#archessProfessionalShell").count() == 1
        assert page.locator("[data-archess-mode='2d']").count() == 1
        assert page.locator("[data-archess-mode='3d']").count() == 1
        assert page.locator("#archessProfessionalShell .aps-topbar").is_visible()
        assert page.locator("#gameCanvas").count() == 1
        assert page.locator("#glCanvas").count() == 1
        browser.close()
