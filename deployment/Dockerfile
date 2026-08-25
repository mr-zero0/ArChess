FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=3)"

CMD ["sh", "-c", "gunicorn -w ${WEB_CONCURRENCY:-2} --threads ${WEB_THREADS:-2} --timeout ${WEB_TIMEOUT:-60} -b 0.0.0.0:${PORT:-8000} 'app:create_app()'"]
