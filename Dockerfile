# ==============================================================================
# ARCHESS - Production Multi-Stage Container Dockerfile
# ==============================================================================

FROM python:3.11-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# ==============================================================================
# Final Production Runtime Image
# ==============================================================================
FROM python:3.11-slim AS runner

LABEL maintainer="ArChess Team"
LABEL version="4.0.0"
LABEL description="Production container for ArChess authoritative server"

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=5000 \
    HOST=0.0.0.0 \
    FLASK_ENV=production \
    PRODUCTION=1 \
    ARCHESS_DB_PATH=/app/data/archess.db \
    PATH=/home/archess/.local/bin:$PATH

WORKDIR /app

# Install runtime curl for health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create unprivileged application user
RUN groupadd -g 10001 archess && \
    useradd -u 10001 -g archess -m -s /bin/bash archess

# Copy installed Python packages from builder
COPY --from=builder /root/.local /home/archess/.local

# Copy application source code
COPY --chown=archess:archess . /app

# Ensure writable data & logs directories for the non-root user
RUN mkdir -p /app/data /app/Logs && \
    chown -R archess:archess /app/data /app/Logs

USER archess

EXPOSE 5000

# Docker Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# Launch via Gunicorn with gthread worker pool for concurrent HTTP & WebSocket traffic
CMD ["gunicorn", "-w", "2", "-k", "gthread", "--threads", "8", "-b", "0.0.0.0:5000", "--access-logfile", "-", "--error-logfile", "-", "run:app"]
