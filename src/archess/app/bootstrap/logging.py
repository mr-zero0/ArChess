"""
Structured logging setup for Archess game.
Implements proper application logging with correlation IDs and structured fields.
"""
import logging
import sys
import uuid
import os
from datetime import datetime
from typing import Any, Dict, Optional


class GameLogger:
    """Structured logger for Archess game with correlation ID support."""

    def __init__(self, name: str = "archess", level: int = logging.INFO, enable_file_logging: bool = True):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(level)
        self.correlation_id: Optional[str] = None
        self.enable_file_logging = enable_file_logging
        self.log_file_path: Optional[str] = None

        # Prevent duplicate handlers
        if not self.logger.handlers:
            self._setup_handlers()

    def _setup_handlers(self) -> None:
        """Set up logging handlers with structured formatting."""
        # Console handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.DEBUG)

        # Structured formatter
        formatter = StructuredFormatter()
        console_handler.setFormatter(formatter)

        self.logger.addHandler(console_handler)

        # File handler (if enabled)
        if self.enable_file_logging:
            # Create logs directory if it doesn't exist
            log_dir = os.path.join(os.getcwd(), "logs")
            if not os.path.exists(log_dir):
                os.makedirs(log_dir)

            # Create a log file with timestamp to avoid overwriting
            log_file = os.path.join(log_dir, f"archess_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log")
            file_handler = logging.FileHandler(log_file)
            file_handler.setLevel(logging.DEBUG)
            file_handler.setFormatter(formatter)
            self.logger.addHandler(file_handler)

            # Store the log file path for reference
            self.log_file_path = log_file

    def set_correlation_id(self, correlation_id: Optional[str] = None) -> None:
        """Set correlation ID for tracking game sessions."""
        self.correlation_id = correlation_id or str(uuid.uuid4())

    def get_correlation_id() -> Optional[str]:
        """Get current correlation ID."""
        return self.correlation_id

    def debug(self, event: str, **kwargs: Any) -> None:
        """Log debug event with structured fields."""
        self.logger.debug(self._format_event(event, **kwargs))

    def info(self, event: str, **kwargs: Any) -> None:
        """Log info event with structured fields."""
        self.logger.info(self._format_event(event, **kwargs))

    def warning(self, event: str, **kwargs: Any) -> None:
        """Log warning event with structured fields."""
        self.logger.warning(self._format_event(event, **kwargs))

    def error(self, event: str, **kwargs: Any) -> None:
        """Log error event with structured fields."""
        self.logger.error(self._format_event(event, **kwargs))

    def critical(self, event: str, **kwargs: Any) -> None:
        """Log critical event with structured fields."""
        self.logger.critical(self._format_event(event, **kwargs))

    def _format_event(self, event: str, **kwargs: Any) -> Dict[str, Any]:
        """Format event as structured dictionary."""
        log_entry: Dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "event": event,
        }

        if self.correlation_id:
            log_entry["correlation_id"] = self.correlation_id

        # Add any additional fields
        log_entry.update(kwargs)

        return log_entry


class StructuredFormatter(logging.Formatter):
    """Custom formatter for structured logging output."""

    def format(self, record: logging.LogRecord) -> str:
        """Format log record as structured JSON-like string."""
        if isinstance(record.msg, dict):
            # Already structured, just format it
            import json
            return json.dumps(record.msg)
        else:
            # Traditional message, wrap in structure
            import json
            log_entry = {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "level": record.levelname,
                "event": record.getMessage(),
                "logger": record.name,
            }
            if hasattr(record, "correlation_id"):
                log_entry["correlation_id"] = record.correlation_id
            return json.dumps(log_entry)


# Global logger instance
game_logger = GameLogger()

# Convenience functions
def get_logger() -> GameLogger:
    """Get the global game logger instance."""
    return game_logger

def setup_logging(level: int = logging.INFO) -> GameLogger:
    """Setup and configure logging for the application."""
    global game_logger
    game_logger = GameLogger(level=level)
    return game_logger