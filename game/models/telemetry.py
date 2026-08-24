from datetime import datetime, timezone

from extensions import db


class TelemetryEvent(db.Model):
    __tablename__ = "telemetry_events"

    id = db.Column(db.Integer, primary_key=True)
    event_type = db.Column(db.String(80), nullable=False, index=True)
    actor_hash = db.Column(db.String(64), nullable=True, index=True)
    room_id = db.Column(db.Integer, db.ForeignKey("rooms.id"), nullable=True, index=True)
    payload = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    def __repr__(self):
        return f"<TelemetryEvent {self.event_type} {self.id}>"
