from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = (ROOT / "templates" / "index.html").read_text(encoding="utf-8")
BOARD = (ROOT / "static" / "js" / "board.js").read_text(encoding="utf-8")
TRACKER = (ROOT / "ARCHESS_TRACKER.md").read_text(encoding="utf-8")


def test_template_is_2d_only_and_uses_open_source_ui_stack():
    assert "bootstrap@5.3.8" in TEMPLATE
    assert "bootstrap-icons@1.13.1" in TEMPLATE
    assert "gchessboard@1.4.0" in TEMPLATE
    assert 'data-render-mode="2d"' in TEMPLATE
    assert "#glCanvas" not in TEMPLATE
    for forbidden in (
        "render3d.js",
        "professional_shell.js",
        "professional_runtime.js",
        "render_router.js",
        "runtime_stabilizer.js",
        "release_boot.js",
        "camera_controls.js",
    ):
        assert forbidden not in TEMPLATE


def test_physics_canvas_is_transparent_overlay():
    assert 'getContext("2d", { alpha: true' in BOARD
    assert "alpha:false" not in BOARD


def test_tracker_keeps_release_gate_and_2d_scope():
    assert "2D only" in TRACKER
    assert "GitHub Actions" in TRACKER
    assert "Do not move `ui-rebuild-2d-v2` to `main`" in TRACKER
