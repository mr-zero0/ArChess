"""
STEP 9 — Automated Testing, QA and Performance (part 2)
Browser matrix test scaffolding.

This module structures browser compatibility tests across Chromium,
Firefox, and WebKit, across desktop, tablet, and mobile viewports,
with pointer and touch input support.

Run with: python -m pytest tests/test_browser_matrix.py -v

Note: Actual browser rendering tests require Playwright or similar.
This file provides the test structure and unit-level validation
of the test configuration that can run without a full browser.
"""

import os

import pytest


# Test configuration constants — these define the browser matrix
# that should be validated during CI / manual testing.

BROWSERS = ["chromium", "firefox", "webkit"]
VIEWPORTS = [
    {"width": 1920, "height": 1080, "name": "desktop"},
    {"width": 1024, "height": 768, "name": "tablet"},
    {"width": 375, "height": 667, "name": "mobile"},
]
INPUT_MODES = ["mouse", "touch"]


def test_browser_config_imports():
    """Validate that browser test configuration is properly set up."""
    assert len(BROWSERS) > 0, "At least one browser must be configured"
    assert len(VIEWPORTS) > 0, "At least one viewport must be configured"
    assert len(INPUT_MODES) > 0, "At least one input mode must be configured"


def test_browser_has_valid_names():
    """Ensure browser names are non-empty strings."""
    for browser in BROWSERS:
        assert isinstance(browser, str), f"Browser name must be string, got {type(browser)}"
        assert len(browser) > 0, "Browser name cannot be empty"


def test_viewport_has_valid_dimensions():
    """Ensure all viewports have positive dimensions."""
    for viewport in VIEWPORTS:
        assert "width" in viewport, f"Viewport missing 'width': {viewport}"
        assert "height" in viewport, f"Viewport missing 'height': {viewport}"
        assert viewport["width"] > 0, f"Viewport width must be positive: {viewport['width']}"
        assert viewport["height"] > 0, f"Viewport height must be positive: {viewport['height']}"
        assert "name" in viewport, f"Viewport missing 'name': {viewport}"


def test_input_modes_are_valid():
    """Ensure input mode strings are valid."""
    for mode in INPUT_MODES:
        assert isinstance(mode, str), f"Input mode must be string, got {type(mode)}"
        assert len(mode) > 0, "Input mode cannot be empty"
        # Normalize to lowercase for comparison
        assert mode.lower() in ["mouse", "touch"], f"Unexpected input mode: {mode}"


# The following integration tests require a browser runtime (Playwright).
# They are marked with `skip` by default and can be enabled when browsers
# are available in the test environment.

try:
    from playwright.sync_api import Error as PlaywrightError
    from playwright.sync_api import sync_playwright

    BROWSER_AVAILABLE = True
except ImportError:
    BROWSER_AVAILABLE = False


BASE_URL = os.environ.get("ARCHESS_BASE_URL", "http://127.0.0.1:5000")


def open_page(browser_name, viewport, touch=False):
    """Open one matrix cell and skip cleanly when its runtime is unavailable."""
    if not BROWSER_AVAILABLE:
        pytest.skip("Playwright not available")

    playwright = sync_playwright().start()
    try:
        browser = getattr(playwright, browser_name).launch(headless=True)
    except PlaywrightError as error:
        playwright.stop()
        pytest.skip(f"{browser_name} browser is not installed: {error}")

    context = browser.new_context(viewport=viewport, has_touch=touch, is_mobile=touch)
    page = context.new_page()
    try:
        page.goto(BASE_URL, wait_until="networkidle")
    except PlaywrightError as error:
        context.close()
        browser.close()
        playwright.stop()
        pytest.skip(f"ArChess server is unavailable: {error}")
    return playwright, browser, context, page


def close_page(playwright, browser, context):
    context.close()
    browser.close()
    playwright.stop()


@pytest.mark.parametrize("browser_name", BROWSERS)
def test_browser_matrix_loads_page(browser_name):
    """Every configured browser can load the game without page errors."""
    playwright, browser, context, page = open_page(browser_name, VIEWPORTS[0])
    errors = []
    page.on("pageerror", errors.append)
    assert page.title() == "ArChess — Physics Chess Battle"
    assert page.locator("#gameCanvas").is_visible()
    assert not errors
    close_page(playwright, browser, context)


@pytest.mark.parametrize("browser_name", BROWSERS)
@pytest.mark.parametrize("viewport", VIEWPORTS, ids=[v["name"] for v in VIEWPORTS])
def test_responsive_viewports(browser_name, viewport):
    """The board remains visible and inside each configured viewport."""
    playwright, browser, context, page = open_page(browser_name, viewport)
    box = page.locator("#gameCanvas").bounding_box()
    assert box and box["width"] > 0 and box["height"] > 0
    assert box["x"] + box["width"] <= viewport["width"]
    assert box["y"] + box["height"] <= viewport["height"]
    close_page(playwright, browser, context)


@pytest.mark.parametrize("browser_name", BROWSERS)
def test_pointer_input(browser_name):
    """The tutorial Skip control accepts pointer input in each browser."""
    playwright, browser, context, page = open_page(browser_name, VIEWPORTS[-1])
    page.evaluate("localStorage.removeItem('archess-tutorial-v2')")
    page.reload(wait_until="networkidle")
    page.wait_for_timeout(900)
    assert page.locator("#tutorialSkip").is_visible()
    page.locator("#tutorialSkip").click()
    assert page.locator("#tutorialCard").is_hidden()
    close_page(playwright, browser, context)


def test_guest_identity_persists_in_browser():
    """An anonymous guest ID persists without collecting account data."""
    playwright, browser, context, page = open_page("chromium", VIEWPORTS[-1])
    first_id = page.evaluate("localStorage.getItem('archess-guest-id')")
    page.reload(wait_until="networkidle")
    second_id = page.evaluate("localStorage.getItem('archess-guest-id')")
    assert first_id and first_id == second_id
    close_page(playwright, browser, context)


def test_preferences_persist_in_browser():
    """Theme, board size, and game-mode preferences survive a reload."""
    playwright, browser, context, page = open_page("chromium", VIEWPORTS[-1])
    page.evaluate("""() => {
        localStorage.setItem('archess-theme', 'dark');
        localStorage.setItem('archess-board-size', '840');
        localStorage.setItem('archess-game', JSON.stringify({mode: 'practice', turnTime: 45}));
    }""")
    page.reload(wait_until="networkidle")
    assert page.locator("html").get_attribute("data-theme") == "dark"
    assert page.locator("#boardSizeValue").text_content() == "110%"
    assert page.evaluate("window.GameModeManager.get()") == {"mode": "practice", "turnTime": 45}
    close_page(playwright, browser, context)


def test_match_history_persists_for_guest():
    """Completed guest match results persist locally and remain capped data."""
    playwright, browser, context, page = open_page("chromium", VIEWPORTS[-1])
    page.evaluate("localStorage.removeItem('archess-match-history')")
    page.reload(wait_until="networkidle")
    page.evaluate("MatchHistory.record({winner: 'white', mode: 'match', turns: 1})")
    page.reload(wait_until="networkidle")
    assert page.evaluate("MatchHistory.getAll()[0].winner") == "white"
    close_page(playwright, browser, context)


def test_touch_input():
    """A mobile touch context can dismiss the tutorial with a tap."""
    playwright, browser, context, page = open_page("chromium", VIEWPORTS[-1], touch=True)
    page.evaluate("localStorage.removeItem('archess-tutorial-v2')")
    page.reload(wait_until="networkidle")
    page.wait_for_timeout(900)
    assert page.locator("#tutorialSkip").is_visible()
    page.locator("#tutorialSkip").tap()
    assert page.locator("#tutorialCard").is_hidden()
    close_page(playwright, browser, context)