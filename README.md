# ♟️ ARCHESS — The Kinetic Chess Protocol

[![CI/CD Pipeline](https://github.com/mr-zero0/ArChess/actions/workflows/ci.yml/badge.svg)](https://github.com/mr-zero0/ArChess/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/badge/Coverage-100%25-brightgreen.svg)](https://github.com/mr-zero0/ArChess)
[![Python Version](https://img.shields.io/badge/Python-3.10%20%7C%203.11%20%7C%203.12-blue.svg)](https://www.python.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Security Grade](https://img.shields.io/badge/Security-Grade%20A%2B-success.svg)](SECURITY.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**ARCHESS** is an authoritative, full-stack kinetic chess platform where rigid turn-based grid constraints collide with real-time physical momentum. Aim with sub-degree vector precision, launch pieces across the battlefield, rebound off perimeter cushions, and shatter opposing army formations in a unified **2D Kinetic Arena** or a fully procedural **3D WebGL Orbit View**.

Built for competitive tactical mastery with real-time multiplayer matchmaking, bi-directional WebSockets, multi-season knockout tournaments, automated ELO rating progression, and zero-dependency Web Audio synthesizers.

---

## 🌟 Key Features

### ⚔️ Kinetic Arena Physics (2D & 3D)
* **Momentum Conservation**: Slingshot vector launching with trajectory arcs, power metrics, and drag physics.
* **Citadel Bastion Mechanics**: The King serves as an immovable heavy fortress (4x mass); unlocks **Awakened Mode** when the vanguard falls below 3 units.
* **Perimeter Cushion Collisions**: Elastic rebound walls with impact shockwaves, particle sparks, and sound design.
* **Perfect Alignment**: Unmoved pieces are mathematically anchored to exact chessboard square centroids across viewport resizes and perspective shifts.

### 🪐 3D WebGL Studio Engine (`Three.js`)
* **Procedural Staunton Geometry**: Mathematically lathed and compound Staunton meshes for King, Queen, Rook, Bishop, Knight, and Pawn.
* **Photometric PBR Lighting**: Balanced multi-point studio illumination (key, rim, ambient, fill, and spot) calibrated with ACES Filmic tone mapping (`exposure: 1.0`).
* **Satin Alabaster & Obsidian Materials**: Eliminates specular washout while preserving deep tactile grain across 7 swappable board palettes (`Midnight`, `Woodland`, `Ivory`, `Emerald`, `Cyberpunk`, `Bloodstone`, `Oceanic`).
* **Smooth Camera Controls**: Orbit, tilt, zoom bounds, and focus framing with momentum damping.

### 🌐 Real-Time Multiplayer & Matchmaking
* **Bi-directional WebSockets**: Live low-latency game room streaming via `flask-sock` / `simple-websocket` (`/ws/combat/<room_id>`).
* **Live Aim Relay**: Opponent slingshot angles and tension indicators broadcast live during active turns.
* **Matchmaking Queue**: ELO-bracketed match allocation with role preferences (White, Black, Random) and invite codes (`ARC-XXX-YYY`).

### 🏆 Knockout Tournaments & Achievements
* **Automated Bracket Simulation**: Multi-round championship bracket engine with seasonal resets, grandmaster bot simulation, and match history.
* **8 Unlockable Achievements**: First Blood, Precision Striker, Citadel Defender, Awakened Monarch, Speed Demon, Grandmaster Slayer, etc., with real-time HUD badge unlocks.
* **Authoritative ELO Rating**: Server-validated ELO calculation with K-factor scaling based on match outcomes and damage dealt.

### 🛡️ Enterprise Security & Hardening
* **Zero Known Vulnerabilities**: 100% clean scan via `bandit` and `pip-audit`.
* **Injection Immunity**: 100% parameterized SQLite queries preventing SQL injection across all database routes.
* **Brute-Force Shields**: Sliding-window rate limiters on `/api/auth/login` (15 req/min) and match settlements (60 req/min).
* **Defense-in-Depth Headers**: `nosniff`, `SAMEORIGIN`, `strict-origin`, HSTS, and immutable asset caching.
* **Memory Exhaustion Guard**: WebSocket frame size ceiling enforcing a strict 64KB cap.

---

## 🏗️ System Architecture

```
ARCHESS System Topology
├── Client Tier (Browser)
│   ├── 2D Tactical Arena (HTML5 Canvas + Slingshot Physics)
│   ├── 3D WebGL Studio (Three.js + PBR Shaders + Orbit Controls)
│   ├── Procedural Audio FX (Web Audio API Synthesizer)
│   └── WebSocket Client (Live Aiming & Vector Synchronization)
│
├── Reverse Proxy & Ingress Tier
│   ├── Nginx / Cloudflare (SSL Termination, HTTP/2, Gzip, WebSocket Upgrade)
│   └── Static Asset Offloader (Immutable 1-Year Cache Headers)
│
├── Application Tier (WSGI / Python 3.11+)
│   ├── Gunicorn / Waitress Multi-Threaded WSGI Worker Pool
│   ├── Flask Authoritative REST API Engine
│   ├── Flask-Sock WebSocket Event Streamer
│   ├── In-Memory ELO Matchmaking Queue & Room Manager
│   └── Security & Rate Limiting Middleware
│
└── Data Tier (Persistence & Backups)
    ├── SQLite WAL Mode (check_same_thread=False, 30s busy_timeout)
    └── Zero-Downtime Online Backup Routine (sqlite3.Connection.backup)
```

---

## ⚡ Quick Start

### 1. Local Development Mode

```bash
# Clone the repository
git clone https://github.com/mr-zero0/ArChess.git
cd ArChess

# Create and activate virtual environment
python -m venv .venv
# On Windows:
.\.venv\Scripts\Activate.ps1
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run development server
python run.py
```
Visit **[http://127.0.0.1:5000](http://127.0.0.1:5000)** in your browser.

---

### 2. Local Production Mode (Waitress Multi-Threaded WSGI)

Run the server with multi-threaded worker pools and zero development server warnings:
```bash
python run.py --production
```

---

### 3. Docker Container Deployment

Run with a single command using Docker Compose:
```bash
# Build and launch with persistent data and logs
docker compose up -d

# Verify container health
curl -f http://localhost:5000/api/health
```

---

## 🧪 Verification & Test Suite

The ArChess test suite provides **100% statement coverage** across all backend modules with zero external network dependencies:

```bash
# Run all tests with line-by-line coverage report
python -m pytest tests/ --cov=backend --cov-report=term-missing -v
```

```text
-------------------------------------------------------
Name                      Stmts   Miss  Cover   Missing
-------------------------------------------------------
backend\__init__.py           0      0   100%
backend\achievements.py     125      0   100%
backend\app.py              484      0   100%
backend\backup.py            36      0   100%
backend\database.py         316      0   100%
backend\logger.py           189      0   100%
backend\multiplayer.py      283      0   100%
backend\notation.py         107      0   100%
backend\tournament.py        98      0   100%
-------------------------------------------------------
TOTAL                      1638      0   100%
======================== 122 passed in 8.30s =========================
```

---

## 📚 Complete Documentation Suite

Detailed engineering and operational guides are available in the repository:

* 🚀 **[Deployment Manual](docs/DEPLOYMENT.md)**: Cloud hosting guides (Render, Cloudflare Tunnel, Hugging Face, Linux VPS), Nginx reverse proxy configuration, and SSL setup.
* 🔌 **[API Specification](docs/API.md)**: Complete REST API schemas, status codes, and WebSocket packet protocol documentation.
* 🏛️ **[Architecture Reference](docs/ARCHITECTURE.md)**: Detailed system blueprint, state synchronization models, database schema, and physics formulas.
* 🛡️ **[Security Policy](SECURITY.md)**: Threat model analysis, vulnerability disclosure, and security controls.
* 🤝 **[Contributing Guidelines](CONTRIBUTING.md)**: Development workflow, coding style conventions, and pull request checklist.
* 📋 **[Changelog](docs/CHANGELOG.md)**: Chronological version history.

---

## 📄 License & Attribution

Distributed under the **MIT License**. Created & maintained by [mr-zero0](https://github.com/mr-zero0).
