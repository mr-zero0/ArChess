import os

import pytest
from playwright.sync_api import sync_playwright


@pytest.mark.skipif(os.environ.get("RUN_BROWSER_MATRIX") != "1", reason="Browser matrix requires installed Playwright browsers")
def test_compat_3d_projects_all_living_pieces():
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--disable-gpu"])
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto("http://localhost:5000/", wait_until="networkidle")
        page.wait_for_timeout(1200)
        result = page.evaluate("""() => ({
            compat: Boolean(window.__ArChessCompat3D?.root?.classList.contains('ready')),
            pieces: window.gameState?.pieces?.filter(p => p.alive).length ?? 0,
            rendered: document.querySelectorAll('#archessCompat3D .c3d-piece').length,
            text: [...document.querySelectorAll('#archessCompat3D .c3d-piece')].map(n => n.textContent),
            positions: [...document.querySelectorAll('#archessCompat3D .c3d-piece')].map(n => ({left:n.style.left, top:n.style.top})),
        }))""")
        assert result["compat"] is True
        assert result["pieces"] == 32
        assert result["rendered"] == 32
        assert all(text for text in result["text"])
        assert all(0 <= float(pos["left"].rstrip("%")) <= 87.5 for pos in result["positions"])
        assert all(0 <= float(pos["top"].rstrip("%")) <= 87.5 for pos in result["positions"])
        browser.close()
