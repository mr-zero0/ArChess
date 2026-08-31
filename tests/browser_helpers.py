import os

from playwright.sync_api import Page

BASE = os.getenv("ARCHESS_TEST_BASE", "http://127.0.0.1:5000")
NAVIGATION_TIMEOUT_MS = int(os.getenv("ARCHESS_TEST_NAV_TIMEOUT_MS", "5000"))
READY_TIMEOUT_MS = int(os.getenv("ARCHESS_TEST_READY_TIMEOUT_MS", "8000"))


def is_headed() -> bool:
    return os.getenv("PLAYWRIGHT_HEADLESS", "1") == "0"


def attach_browser_diagnostics(page: Page) -> None:
    page_errors: list[str] = []
    setattr(page, "_archess_page_errors", page_errors)
    page.on("pageerror", lambda error: page_errors.append(f"pageerror: {error}"))
    page.on(
        "console",
        lambda message: page_errors.append(f"console:{message.type}: {message.text}")
        if message.type == "error"
        else None,
    )


def open_page(page: Page, path: str = "/", require_game: bool = True) -> None:
    attach_browser_diagnostics(page)
    try:
        response = page.goto(
            f"{BASE}{path}",
            wait_until="commit",
            timeout=NAVIGATION_TIMEOUT_MS,
        )
    except Exception as error:
        details = "; ".join(diagnostics(page)[-5:])
        raise AssertionError(f"Navigation failed for {BASE}{path}: {error}. Browser diagnostics: {details}") from error

    assert response is not None, f"No response received from {BASE}{path}"
    assert response.ok, f"HTTP {response.status} for {BASE}{path}"
    if require_game:
        try:
            page.wait_for_function(
                "() => window.gameState && Array.isArray(window.gameState.pieces) && window.gameState.pieces.length === 32",
                timeout=READY_TIMEOUT_MS,
            )
        except Exception as error:
            details = "; ".join(diagnostics(page)[-10:])
            raise AssertionError(
                f"ArChess runtime did not become ready within {READY_TIMEOUT_MS}ms. Browser diagnostics: {details}"
            ) from error


def diagnostics(page: Page) -> list[str]:
    values = getattr(page, "_archess_page_errors", [])
    return list(values) if isinstance(values, list) else []
