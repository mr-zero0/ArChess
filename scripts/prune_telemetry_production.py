from app import create_app
from config import ProductionConfig
from game.telemetry import prune_events


if __name__ == "__main__":
    app = create_app(ProductionConfig)
    with app.app_context():
        print(prune_events(commit=True))
