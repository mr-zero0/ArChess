import pytest
import os
from playwright.sync_api import sync_playwright

# Define browsers and viewports for matrix testing
BROWSERS = ["chromium", "firefox", "webkit"]
VIEWPORTS = [
    {"name": "desktop", "width": 1920, "height": 1080},
    {"name": "tablet", "width": 768, "height": 1024},
    {"name": "mobile", "width": 375, "height": 667},
]

@pytest.mark.parametrize("browser_name", BROWSERS)
@pytest.mark.parametrize("viewport", VIEWPORTS, ids=lambda v: v["name"])
@pytest.mark.skipif(os.environ.get("CI") is None, reason="Only run in CI")
def test_browser_matrix_viewports(browser_name, viewport):
    with sync_playwright() as p:
        browser_type = getattr(p, browser_name)
        browser = browser_type.launch()
        
        # Configure context with touch enabled for mobile/tablet viewports
        context_args = {"viewport": {"width": viewport["width"], "height": viewport["height"]}}
        if viewport["name"] in ["mobile", "tablet"]:
            context_args["has_touch"] = True
            
        context = browser.new_context(**context_args)
        page = context.new_page()
        
        # Verify the application is responsive and reachable
        response = page.goto("http://localhost:5000/")
        assert response.status == 200
        
        # Verify viewport size
        actual_size = page.viewport_size
        assert actual_size["width"] == viewport["width"]
        
        # Check touch capability for mobile/tablet
        if viewport["name"] in ["mobile", "tablet"]:
            # Simple check if ontouchstart is defined or similar in JS
            has_touch = page.evaluate("() => 'ontouchstart' in window")
            assert has_touch is True
        
        browser.close()
