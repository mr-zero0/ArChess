import pytest
import os
import sys
from playwright.sync_api import sync_playwright

@pytest.mark.skipif(os.environ.get("CI") is None, reason="Only run in CI")
def test_browser_matrix():
    with sync_playwright() as p:
        for browser_type in [p.chromium, p.firefox, p.webkit]:
            browser = browser_type.launch()
            page = browser.new_page()
            # Assuming the app is running on localhost:5000 in CI
            response = page.goto("http://localhost:5000/api/version")
            assert response.status == 200
            data = response.json()
            assert "version" in data
            browser.close()
