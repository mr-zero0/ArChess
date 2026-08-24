from app import create_app
from config import Config
from extensions import db
from game.telemetry import prune_events


if __name__ == "__main__":
    app = create_app(Config)
    with app.app_context():
        result = prune_events(commit=True)
        print(result)
