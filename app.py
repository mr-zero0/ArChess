from flask import Flask, jsonify, render_template

from game import BOARD_SIZE, GAME_CONFIG, PIECE_STATS

VERSION = "v0.5.1"

app = Flask(__name__)


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/api/game/config")
def game_config():
    return jsonify(
        {
            "version": VERSION,
            "boardSize": BOARD_SIZE,
            "pieceStats": PIECE_STATS,
            "gameConfig": GAME_CONFIG,
        }
    )


@app.get("/api/version")
def get_version():
    return jsonify({"version": VERSION})


# Backward-compatible alias for the starter project.
@app.get("/api/config")
def legacy_config():
    return game_config()


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
