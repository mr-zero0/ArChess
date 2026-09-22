# ♟️ ARCHESS — The Kinetic Chess Protocol

[![Live Application](https://img.shields.io/badge/Live%20Demo-archess.onrender.com-brightgreen?logo=render&logoColor=white)](https://archess.onrender.com)
[![CI/CD Pipeline](https://github.com/mr-zero0/ArChess/actions/workflows/ci.yml/badge.svg)](https://github.com/mr-zero0/ArChess/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/badge/Coverage-100%25-brightgreen.svg)](https://github.com/mr-zero0/ArChess)
[![Python Version](https://img.shields.io/badge/Python-3.10%20%7C%203.11%20%7C%203.12-blue.svg)](https://www.python.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Security Grade](https://img.shields.io/badge/Security-Grade%20A%2B-success.svg)](SECURITY.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> 🚀 **Live Production Deployment**: **[https://archess.onrender.com](https://archess.onrender.com)**  
> Full-featured physical kinetic chess with persistent WebSockets, 3D/2D views, dynamic live leaderboards, and AI coaching.

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

### 🤖 AI vs AI Spectator Watch Mode & 5-Level Tactical Engine
* **Autonomous AI vs AI Spectator Match**: Real-time battle simulation where White and Black AI clash autonomously with human-watchable pacing (~650ms), live pause/resume, and turn-stepping controls.
* **5-Level Tactical AI Intelligence**:
  * **Level 1: Novice** (~800 ELO): Casual random targeting with wide dispersion jitter ($\pm 0.38\text{ rad}$) and erratic kinetic power.
  * **Level 2: Apprentice** (~1200 ELO): Proximity-weighted forward targeting with moderate dispersion ($\pm 0.18\text{ rad}$).
  * **Level 3: Commander** (~1600 ELO): Value-weighted tactical fire prioritizing high-value pieces with distance-calibrated power.
  * **Level 4: Master** (~2000 ELO): Obstacle raycasting with single-cushion bank-shot wall rebounds when direct line-of-sight is blocked.
  * **Level 5: Sovereign (Grandmaster)** (~2400+ ELO): Deep multi-raycast obstacle detection, checkmate assassination priority, and dual-wall cushion rebound bank-shots with zero dispersion.
* **Drag-and-Fit Responsive Controls**: Interactive range slider track paired with responsive `L1` to `L5` segmented buttons and dynamic ELO rating pill badge (`#aiLevelRatingBadge`) with live mid-game toggle.

### 🧠 Autonomous Agentic AI, RAG & Prompts (100% Free & Open-Source)
* **Autonomous ReAct Coach (`TacticalCoachAgent`)**: Runs multi-tool reasoning (`inspect_board`, `simulate_shot`, `query_codex`) with Chain-of-Thought (CoT) tactical trajectory recommendations.
* **Zero-Cost Semantic Codex (RAG)**: Pure-Python TF-IDF / Token Cosine & Jaccard semantic scoring engine indexing piece abilities, ricochet laws, and combat mechanics without external vector DB fees.
* **Dynamic Personas (`PromptCatalog`)**: Swap between **Grandmaster Magnus** (positional mentor), **Glitch-9** (aggressive bank-shot specialist), **Valkyrie** (guardian fortress), and **Blitzcaster** (hype esports shoutcaster).
* **Pluggable Zero-Cost Inference**: Pluggable support for local Ollama models (`llama3.2`, `qwen2.5`) or Gemini Free Tier, backed by instant 0ms offline deterministic heuristic fallback.
* **Esports Live Shoutcasting & Post-Match Debrief**: Real-time play-by-play combat commentary and automated post-game tactical reviews.

### 🛡️ Enterprise Hardening, Observability & Anti-Cheat
* **Prometheus Exposition (`/metrics`)**: Zero-dependency metrics engine exporting uptime, HTTP latency histograms, active WebSockets, rooms, and security events.
* **Authoritative Anti-Cheat**: Clamps launch velocities within physics thresholds, strips NaN/Infinity payloads, and validates damage plausibility.
* **Remote Session Revocation**: Atomic `token_version` tracking allows users to instantly invalidate all active logins across devices simultaneously.
* **Zero Known Vulnerabilities**: 100% clean scan via `bandit` SAST and `pip-audit`.
* **Injection Immunity**: 100% parameterized SQLite queries preventing SQL injection across all database routes.
* **Brute-Force Shields**: Sliding-window rate limiters on `/api/auth/login` (15 req/min) and match settlements (60 req/min).
* **Strict CSP & Permissions-Policy**: Defense-in-depth against XSS, clickjacking, and unauthorized camera/microphone hardware access.

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

If you have Docker Desktop (Windows/macOS) or Docker Engine (Linux) installed:
```bash
# Build and launch with persistent data and logs
docker compose up -d

# Verify container health (Linux / macOS / Git Bash)
curl -f http://localhost:5000/api/health

# On Windows PowerShell, use curl.exe or Invoke-RestMethod:
curl.exe -f http://localhost:5000/api/health
# or: Invoke-RestMethod http://localhost:5000/api/health
```

> [!NOTE]
> If Docker is not installed on your system, run locally without containers:
> `python run.py` (development) or `python run.py --production` (production WSGI).

---

## 🧪 Verification & Test Suite

The ArChess test suite provides **100.0% statement coverage** across all 11 backend modules with zero external network dependencies:

```bash
# Run all tests with line-by-line coverage report
python -m pytest tests/ --cov=backend --cov-report=term-missing -v
```

```text
=============================== tests coverage ================================
Name                      Stmts   Miss  Cover   Missing
-------------------------------------------------------
backend\__init__.py           0      0   100%
backend\achievements.py     124      0   100%
backend\ai_engine.py        278      0   100%
backend\app.py              592      0   100%
backend\backup.py            36      0   100%
backend\database.py         337      0   100%
backend\logger.py           189      0   100%
backend\metrics.py          100      0   100%
backend\multiplayer.py      324      0   100%
backend\notation.py         107      0   100%
backend\tournament.py        97      0   100%
-------------------------------------------------------
TOTAL                      2184      0   100%
======================= 148 passed, 1 warning in 8.91s ========================
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
