import os
import logging
from logging.handlers import TimedRotatingFileHandler
from datetime import datetime
import shutil
import json
from datetime import timezone

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

def setup_logging_retention():
    base_logs = os.path.join(os.getcwd(), "logs")
    if not os.path.exists(base_logs):
        return

    for year in os.listdir(base_logs):
        year_path = os.path.join(base_logs, year)
        for month in os.listdir(year_path):
            month_path = os.path.join(year_path, month)
            for day in os.listdir(month_path):
                day_path = os.path.join(month_path, day)
                if (datetime.now() - datetime.fromtimestamp(os.path.getmtime(day_path))).days > 7:
                    shutil.rmtree(day_path)

def configure_logging(application):
    # Ensure log directory for today
    log_dir = os.path.join(os.getcwd(), "logs", datetime.now().strftime("%Y/%m/%d"))
    os.makedirs(log_dir, exist_ok=True)
    
    log_file = os.path.join(log_dir, "run.log")
    
    # Run retention policy
    setup_logging_retention()
    
    # Configure logging
    file_handler = TimedRotatingFileHandler(log_file, when="midnight", interval=1, backupCount=7)
    file_handler.setFormatter(JsonFormatter())
    
    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(JsonFormatter())
    
    application.logger.handlers.clear()
    application.logger.addHandler(file_handler)
    application.logger.addHandler(stream_handler)
    application.logger.setLevel(logging.INFO)
    application.logger.propagate = False

