import os

from playwright.sync_api import Page

BASE = os.getenv("ARCHESS_TEST_BASE", "http://127.0.0.1:5000")
NAVIGATION_TIMEOUT_MS = int(os.getenv("ARCHESS_TEST_NAV_TIMEOUT_MS", "10000"))
READY_TIMEOUT_MS = int(os.getenv("ARCHESS_TEST_READY_TIMEOUT_MS", "8000"))


def is_headed() -> bool:
    return os.getenv("PLAYWRIGHT_HEADLESS", "1") == "0"


def attach_browser_diagnostics(page: Page) -> None:
    errors = page.context._options.get("_archess_page_errors", []) if hasattr(page.context, "_options") else []
    if not isinstance(errors, list):
        errors = []
    page.context._options["_archess_page_errors"] = errors
    page.on("pageerror", lambda error: errors.append(f"pageerror: {error}"))
    page.on("console", lambda message: errors.append(f"console:{message.type}: {message.text}") if message.type == "error" else None)


def open_page(page: Page, path: str = "/", require_game: bool = True) -> None:
    attach_browser_diagnostics(page)
    response = page.goto(
        f"{BASE}{path}",
        wait_until="domcontentloaded",
        timeout=NAVIGATION_TIMEOUT_MS,
    )
    assert response is not None, f"No response received from {BASE}{path}"
    assert response.ok, f"HTTP {response.status} for {BASE}{path}"
    if require_game:
        page.wait_for_function(
            "() => window.gameState && Array.isArray(window.gameState.pieces) && window.gameState.pieces.length === 32",
            timeout=READY_TIMEOUT_MS,
        )


def diagnostics(page: Page) -> list[str]:
    values = page.context._options.get("_archess_page_errors", []) if hasattr(page.context, "_options") else []
    return list(values) if isinstance(values, list) else []
