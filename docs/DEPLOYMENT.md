# 🚀 ArChess Enterprise Deployment Manual

This guide covers deploying ArChess in production across diverse environments: from 100% free cloud hosting to enterprise Linux VPS deployments with Docker, Nginx, and TLS termination.

---

## 📋 Table of Contents
1. [Environment Variables Reference](#-environment-variables-reference)
2. [Method 1: Docker Compose (Standard Production Container)](#-method-1-docker-compose)
3. [Method 2: Render.com (100% Free Cloud PaaS)](#-method-2-rendercom-free-cloud-paas)
4. [Method 3: Cloudflare Tunnel (100% Free Self-Hosted)](#-method-3-cloudflare-tunnel-free-self-hosted)
5. [Method 4: Production Linux VPS (Gunicorn + Nginx + Systemd)](#-method-4-production-linux-vps)
6. [Automated Database Backups](#-automated-database-backups)
7. [Health & Monitoring Probe](#-health--monitoring-probe)

---

## ⚙️ Environment Variables Reference

Copy `.env.example` to `.env` and configure the following parameters:

| Variable | Default | Required in Prod? | Description |
| :--- | :--- | :---: | :--- |
| `SECRET_KEY` | *(ephemeral random)* | **YES** | 64-character cryptographic hex string for signing session cookies and tokens. |
| `FLASK_ENV` | `production` | **YES** | Activates production security headers and cookie policies (`production` / `development`). |
| `PRODUCTION` | `1` | **YES** | Enables production WSGI multi-threading and disables debug endpoints. |
| `PORT` | `5000` | No | HTTP listening port. |
| `HOST` | `0.0.0.0` | No | Network interface binding. |
| `SESSION_COOKIE_SECURE`| `1` | No | Enforces `Secure` flag on cookies (set to `1` when serving behind HTTPS). |
| `ARCHESS_DB_PATH` | `/app/data/archess.db` | No | Custom path to SQLite database (allows persistent volume mounts). |
| `WSGI_THREADS` | `16` | No | Number of concurrent worker threads in WSGI pool. |
| `CORS_ORIGINS` | `*` (or unset) | No | Comma-separated list of allowed origins (e.g., `https://archess.com`). |
| `GOOGLE_CLIENT_ID` | `None` | No | Google OAuth 2.0 Web Client ID for Google Sign-In. |

Generate a production `SECRET_KEY`:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## 🐳 Method 1: Docker Compose

The simplest and most reliable deployment for any system with Docker installed:

### 1. Build and Start
```bash
# Clone and enter directory
git clone https://github.com/mr-zero0/ArChess.git
cd ArChess

# Copy and update environment variables
cp .env.example .env

# Build and start in detached mode
docker compose up -d --build
```

### 2. Verify Status
```bash
# Check container health and status
docker compose ps

# Inspect live logs
docker compose logs -f --tail=100

# Check health endpoint
curl -f http://localhost:5000/api/health
```

### 3. Persistent Volumes
Docker Compose manages two persistent named volumes:
* `archess-data`: Preserves SQLite database (`archess.db`) across container updates.
* `archess-logs`: Preserves structured JSON execution logs.

---

## ☁️ Method 2: Render.com (Free Cloud PaaS)

Render offers **750 free instance hours/month**, automatic HTTPS (`*.onrender.com`), and automated redeployment upon git pushes to `main`.

1. Sign in to **[render.com](https://render.com)** using your GitHub account.
2. Navigate to **New +** $\rightarrow$ **Web Service**.
3. Link your repository: `mr-zero0/ArChess`.
4. Configure fields:
   * **Name**: `archess`
   * **Language**: `Docker` (Render automatically uses the multi-stage `Dockerfile`)
   * **Instance Type**: **Free** ($0 / month)
5. Under **Environment Variables**, add:
   * `SECRET_KEY`: *(paste your generated 64-char hex key)*
   * `FLASK_ENV`: `production`
   * `PRODUCTION`: `1`
   * `PORT`: `5000`
6. Click **Create Web Service**.

> [!NOTE]
> Free tier instances spin down after 15 minutes of inactivity. When a new player visits, the service wakes up in ~30 seconds.

---

## 🛡️ Method 3: Cloudflare Tunnel (Free Self-Hosted)

If you have a dedicated machine, home server, or Raspberry Pi that stays powered on, Cloudflare Tunnel provides:
* **Zero cost forever** (no credit card required).
* **Zero spin-down**: Runs 24/7.
* **Full local persistence**: Never resets the SQLite database.
* **Free public HTTPS domain**: `https://your-tunnel.trycloudflare.com` or custom domain.

### Steps:
1. Install `cloudflared`:
   * **Windows**: `winget install Cloudflare.cloudflared`
   * **Linux**: `sudo apt install cloudflared` or download binary from Cloudflare.
   * **macOS**: `brew install cloudflared`
2. Start the ArChess production server:
   ```bash
   python run.py --production
   ```
3. In a separate terminal, launch the tunnel:
   ```bash
   cloudflared tunnel --url http://127.0.0.1:5000
   ```
4. Cloudflare will output an active HTTPS link ready to be shared with players worldwide.

---

## 🐧 Method 4: Production Linux VPS (Ubuntu 22.04 / 24.04)

For dedicated Linux VPS hosting (DigitalOcean, AWS EC2, Hetzner, Linode):

### 1. System Packages & Python Setup
```bash
sudo apt update && sudo apt install -y python3-pip python3-venv nginx certbot python3-certbot-nginx git
git clone https://github.com/mr-zero0/ArChess.git /opt/archess
cd /opt/archess

python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Systemd Service (`/etc/systemd/system/archess.service`)
```ini
[Unit]
Description=ArChess Authoritative Game Server
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/opt/archess
Environment="PATH=/opt/archess/.venv/bin"
Environment="FLASK_ENV=production"
Environment="PRODUCTION=1"
EnvironmentFile=/opt/archess/.env
# Note: 1 worker with 16 threads preserves unified in-memory multiplayer rooms & matchmaking
ExecStart=/opt/archess/.venv/bin/gunicorn -w 1 -k gthread --threads 16 -b 127.0.0.1:5000 run:app
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo chown -R www-data:www-data /opt/archess
sudo systemctl daemon-reload
sudo systemctl enable --now archess
```

### 3. Nginx Reverse Proxy & SSL
Copy the production Nginx config:
```bash
sudo cp /opt/archess/deployment/nginx.conf /etc/nginx/sites-available/archess
sudo ln -s /etc/nginx/sites-available/archess /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Obtain free SSL certificate via Let's Encrypt:
```bash
sudo certbot --nginx -d yourdomain.com
```

---

## 💾 Automated Database Backups

ArChess includes a zero-downtime online backup module ([`backend/backup.py`](file:///c:/Users/mohda/Python%20Codes/ARCHESS/backend/backup.py)) using SQLite's native non-blocking backup API.

### Run Manual Backup
```bash
python -m backend.backup
```

### Setup Automated Daily Backup (Cron)
Add the following job to `crontab -e`:
```bash
# Run online backup daily at 03:00 UTC and retain last 14 snapshots
0 3 * * * cd /opt/archess && /opt/archess/.venv/bin/python -m backend.backup >> /opt/archess/Logs/backup.log 2>&1
```

---

## 🩺 Health & Monitoring Probe

Cloud load balancers, orchestrators, and uptime monitors (UptimeKuma, BetterStack, Cloudflare) can probe:

```http
GET /api/health
```

### Response Schema:
```json
{
  "status": "healthy",
  "service": "ArChess Authoritative Backend",
  "version": "2.0.0",
  "database": "connected",
  "uptime_seconds": 384.12,
  "active_run": "C:/Users/mohda/Python Codes/ARCHESS/Logs/2026/Sep/18_Logs/Run45",
  "timestamp": 1789721495.23
}
```
* Returns **HTTP 200 OK** when operational.
* Returns **HTTP 503 Service Unavailable** if database connectivity fails.
