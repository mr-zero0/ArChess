import json
import logging
from datetime import datetime, timezone


class JsonFormatter(logging.Formatter):
    def format(self, record):
        payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload)


def configure_logging(application):
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    application.logger.handlers.clear()
    application.logger.addHandler(handler)
    application.logger.setLevel(logging.INFO)
    application.logger.propagate = False
