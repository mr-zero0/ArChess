# ♟️ ARCHESS — The Kinetic Chess Protocol

[![Live Application](https://img.shields.io/badge/Live%20Demo-archess.onrender.com-brightgreen?logo=render&logoColor=white)](https://archess.onrender.com)
[![Version](https://img.shields.io/badge/Version-v4.3.1-blue.svg)](docs/CHANGELOG.md)
[![CI/CD Pipeline](https://github.com/mr-zero0/ArChess/actions/workflows/ci.yml/badge.svg)](https://github.com/mr-zero0/ArChess/actions/workflows/ci.yml)
[![Tests Passing](https://img.shields.io/badge/Tests-373%20passed-brightgreen.svg)](tests/)
[![Python Version](https://img.shields.io/badge/Python-3.10%20%7C%203.11%20%7C%203.12-blue.svg)](https://www.python.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Security Grade](https://img.shields.io/badge/Security-Grade%20A%2B-success.svg)](SECURITY.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> 🚀 **Live Production Deployment**: **[https://archess.onrender.com](https://archess.onrender.com)**  
> Full-featured physical kinetic chess with persistent WebSockets, 3 distinct view modes, Grandmaster Atelier live customization, dynamic leaderboards, and 5-tier AI tactical coaching.

---

**ARCHESS** is an authoritative, full-stack kinetic chess platform where rigid turn-based grid constraints collide with real-time physical momentum. Aim with sub-degree vector precision, launch pieces across the battlefield, rebound off perimeter cushions, and shatter opposing army formations in a unified **2D Kinetic Arena**, a fully procedural **3D WebGL Studio**, or standard **2D Classic FIDE Chess**.

Built for competitive tactical mastery with real-time multiplayer matchmaking, bi-directional WebSockets, multi-season knockout tournaments, automated ELO rating progression, zero-dependency Web Audio synthesizers, and real-time live theme customization that preserves in-progress gameplay.

---

## 🌟 Key Features

### 🎮 Three Authoritative Perspectives
* **🪐 3D Realistic WebGL Studio (`Three.js`)**:
  * Procedurally lathed Staunton geometry with soft shadow maps and studio multi-point illumination (key, rim, ambient, fill, and spot) calibrated with ACES Filmic tone mapping.
  * Real 3D physical parlor table, shadow catcher, 3D rank and file notations (a-h, 1-8), and dynamic camera preset lerping (`tabletop`, `cinematic`, `tactical`).
  * Real-time dynamic PBR material swapping across 5 piece sets (`Classic`, `Neo`, `Cyber`, `Crystal`, `Mono`).
  * Dynamic Queen mesh swap on pawn promotion, 3D golden star for veteran pawns, Knight parabolic vault arcs, and glowing citadel barriers.
  * Slingshot targeting with 24-point arced trajectory ribbon and real-time elastic tension cord.
* **⚔️ 2D Arena Kinetic Combat (`game.js`)**:
  * Authentic slingshot kinetic combat engine with momentum conservation, trajectory prediction arcs, and drag physics.
  * **💣 Tactical Deployables System**:
    * **2 Explosive Landmines per Game**: Placeable on any open square in exchange for 1 move. Detonates upon piece entry, inflicting up to 65 AoE blast damage + radial knockback.
    * **2 Indestructible Walls per Game**: Permanent fortified barriers placeable in exchange for 1 move. Blocks and rebounds all pieces (Knights vault cleanly over).
  * **🎖️ Veteran Pawn Ascension**: Pawns must eliminate a non-pawn officer and reach the deep back cushion outside the King's fortress to ascend to Queen.
  * **🛡️ Fortified King Citadel**: King remains anchored behind its square fortress wall (fits chessboard square, inflicts recoil damage) as the core objective.
  * High-elasticity perimeter cushions with wall rebounds, shockwaves, and particle spark explosions.
  * Bespoke vector piece silhouettes with tailored drop shadows, bevels, and radial HP halos on hover.
* **♟️ 2D Classic FIDE Mode (`react-chessboard` + `chess.js`)**:
  * Full FIDE chess rules with turn validation, legal move highlights, check/checkmate detection, and FEN generation.
  * Custom vector SVG piece sets (`Classic`, `Neo Modern`, `Cyber Neon`, `Crystal`, `Mono`) with defensive auto-scaling.

### 🎨 Grandmaster Atelier & Live Customization (No Match Resets)
* **7 Curated Board Palettes**: `Midnight Obsidian`, `Woodland Walnut`, `Ivory Classical`, `Tournament Emerald`, `Cyberpunk Neon`, `Imperial Bloodstone`, and `Oceanic Obsidian`.
* **5 Bespoke Piece Styles**: `Staunton Classic`, `Neo Modernist`, `Cyberpunk Neon`, `Frosted Crystal`, and `Tournament Monochrome`.
* **⚡ Live Mid-Game Swapping**: Change board palettes and piece sets mid-match across all 3 view modes without resetting the board, piece coordinates, HP durability, or turn order.
* **Match State Persistence (`sessionStorage`)**:
  * Active piece coordinates `(col, row)`, piece HP, turn count, and active FEN are automatically preserved in `sessionStorage` (`archess_active_arena_match` / `archess_active_classic_fen`).
  * Even upon direct URL parameter navigation (e.g. `/play?theme=emerald`) or page refreshes, active gameplay is restored seamlessly.
* **Seamless In-Place Modals**: Top navbar, mobile drawer, and footer "Themes" links open the Grandmaster Atelier modal in-place without page navigation.

### 🌐 Real-Time Multiplayer & Matchmaking
* **Bi-directional WebSockets**: Live low-latency game room streaming via `flask-sock` / `simple-websocket` (`/ws/combat/<room_id>`).
* **Live Aim Relay**: Opponent slingshot angles and tension indicators broadcast live during active turns.
* **Matchmaking Queue**: ELO-bracketed match allocation with role preferences (White, Black, Random) and invite codes (`ARC-XXX-YYY`).

### 🏆 Knockout Tournaments & Achievements
* **Automated Bracket Simulation**: Multi-round championship bracket engine with seasonal resets, grandmaster bot simulation, and match history.
* **8 Unlockable Achievements**: First Blood, Precision Striker, Citadel Defender, Awakened Monarch, Speed Demon, Grandmaster Slayer, etc., with real-time HUD badge unlocks.
* **Authoritative ELO Rating**: Server-validated ELO calculation with K-factor scaling based on match outcomes and damage dealt.

### 🤖 5-Level Tactical Engine & AI vs AI Spectator Match
* **Autonomous AI vs AI Spectator Match**: Real-time battle simulation where White and Black AI clash autonomously with human-watchable pacing (~650ms), live pause/resume, and turn-stepping controls.
* **5-Level Tactical Intelligence**:
  * **Level 1: Novice** (~800 ELO): Casual random targeting with wide dispersion jitter ($\pm 0.38\text{ rad}$) and erratic kinetic power.
  * **Level 2: Apprentice** (~1200 ELO): Proximity-weighted forward targeting with moderate dispersion ($\pm 0.18\text{ rad}$).
  * **Level 3: Commander** (~1600 ELO): Value-weighted tactical fire prioritizing high-value pieces with distance-calibrated power.
  * **Level 4: Master** (~2000 ELO): Obstacle raycasting with single-cushion bank-shot wall rebounds when direct line-of-sight is blocked.
  * **Level 5: Sovereign (Grandmaster)** (~2400+ ELO): Deep multi-raycast obstacle detection, checkmate assassination priority, and dual-wall cushion rebound bank-shots with zero dispersion.

### 🧠 Autonomous Agentic AI, RAG & Prompts (100% Free & Open-Source)
* **Autonomous ReAct Coach (`TacticalCoachAgent`)**: Runs multi-tool reasoning (`inspect_board`, `simulate_shot`, `query_codex`) with Chain-of-Thought (CoT) tactical trajectory recommendations.
* **Zero-Cost Semantic Codex (RAG)**: Pure-Python TF-IDF / Token Cosine & Jaccard semantic scoring engine indexing piece abilities, ricochet laws, and combat mechanics without external vector DB fees.
* **Dynamic Personas (`PromptCatalog`)**: Swap between **Grandmaster Magnus** (positional mentor), **Glitch-9** (aggressive bank-shot specialist), **Valkyrie** (guardian fortress), and **Blitzcaster** (hype esports shoutcaster).
* **Pluggable Zero-Cost Inference**: Pluggable support for local Ollama models (`llama3.2`, `qwen2.5`) or Gemini Free Tier, backed by instant 0ms offline deterministic heuristic fallback.

### 🛡️ Enterprise Hardening, Observability & Anti-Cheat
* **Prometheus Exposition (`/metrics`)**: Zero-dependency metrics engine exporting uptime, HTTP latency histograms, active WebSockets, rooms, and security events.
* **Authoritative Anti-Cheat**: Clamps launch velocities within physics thresholds, strips NaN/Infinity payloads, and validates damage plausibility.
* **Remote Session Revocation**: Atomic `token_version` tracking allows users to instantly invalidate all active logins across devices simultaneously.
* **Zero Known Vulnerabilities**: 100% clean scan via `bandit` SAST and `pip-audit`.
* **Strict CSP & Permissions-Policy**: Defense-in-depth against XSS, clickjacking, and unauthorized camera/microphone hardware access.

---

## 🏗️ System Architecture

```
ARCHESS System Topology
├── Client Tier (Browser)
│   ├── 3D WebGL Studio (Three.js + PBR Shaders + Orbit Controls)
│   ├── 2D Tactical Arena (HTML5 Canvas + Slingshot Physics + Cushion Rebound)
│   ├── 2D Classic FIDE (react-chessboard + chess.js + Custom SVG Pieces)
│   ├── Grandmaster Atelier (Live In-Match Customizer + sessionStorage Engine)
│   ├── Procedural Audio FX (Zero-Dependency Web Audio API Synthesizer)
│   └── WebSocket Client (Live Aiming & Vector Synchronization)
│
├── Ingress & Reverse Proxy Tier
│   ├── Render / Cloudflare / Nginx (SSL Termination, HTTP/2, Gzip, WebSocket Upgrade)
│   └── Static Asset Offloader (Immutable 1-Year Cache Headers)
│
├── Application Tier (WSGI / Python 3.10+)
│   ├── Gunicorn / Waitress Multi-Threaded WSGI Worker Pool
│   ├── Flask Authoritative REST API Engine (12 Modular Python Subsystems)
│   ├── Flask-Sock WebSocket Event Streamer
│   ├── In-Memory ELO Matchmaking Queue & Room Manager
│   └── Security, Rate Limiting & Telemetry Middleware
│
└── Data Tier (Persistence & Backups)
    ├── SQLite WAL Mode (check_same_thread=False, 30s busy_timeout)
    ├── PostgreSQL DDL Compatibility (Supabase / Neon ready)
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

Run the server with production multi-threaded worker pools:
```bash
python run.py --production
```

---

### 3. Docker Container Deployment

```bash
# Build and launch with persistent data and logs
docker compose up -d

# Verify container health (Linux / macOS / Git Bash)
curl -f http://localhost:5000/api/health

# On Windows PowerShell:
curl.exe -f http://localhost:5000/api/health
```

---

## 🧪 Verification & Test Suite

The ArChess test suite provides comprehensive test coverage across all 12 backend modules with zero external network dependencies:

```bash
# Run all tests
python -m pytest tests/ -v

# Run with line-by-line coverage report
python -m pytest tests/ --cov=backend --cov-report=term-missing
```

```text
=============================== tests coverage ================================
Name                      Stmts   Miss  Cover   Missing
-------------------------------------------------------
backend\__init__.py           0      0   100%
backend\achievements.py     124      0   100%
backend\ai_engine.py        278      0   100%
backend\app.py              718     25    97%
backend\backup.py            36      0   100%
backend\database.py         467     25    95%
backend\logger.py           205     11    95%
backend\metrics.py          100      0   100%
backend\multiplayer.py      324      0   100%
backend\notation.py         107      0   100%
backend\schemas.py          170     21    88%
backend\tournament.py        97      0   100%
-------------------------------------------------------
TOTAL                      2626     82    97%

======================= 373 passed, 1 warning in 15.24s =======================
```

---

## 📚 Complete Documentation Suite

Detailed engineering and operational guides are available in the repository:

* 🗺️ **[Project Status & Roadmap](docs/PROJECT_STATUS_AND_ROADMAP.md)**: Comprehensive breakdown of verified capabilities, project architecture map, and concrete future roadmap items.
* 🏛️ **[Architecture Reference](docs/ARCHITECTURE.md)**: System blueprint, 3D WebGL PBR engine, live customization mechanics, and physics formulas.
* 🔌 **[API Specification](docs/API.md)**: Complete REST schemas, error status codes, and WebSocket packet protocol documentation.
* 🚀 **[Deployment Manual](docs/DEPLOYMENT.md)**: Cloud hosting guides (Render, Cloudflare Tunnel, Hugging Face, Linux VPS), Nginx reverse proxy configuration, and SSL setup.
* 📋 **[Changelog](docs/CHANGELOG.md)**: Chronological version history from v1.0.0 through v4.3.1.
* 📊 **[Milestone Tracker](docs/TRACKER.md)**: Progress dashboard and feature verification matrix.
* 🛡️ **[Security Policy](SECURITY.md)**: Threat model analysis, vulnerability disclosure, and security controls.
* 🤝 **[Contributing Guidelines](CONTRIBUTING.md)**: Development workflow, coding style conventions, and pull request checklist.

---

## 📄 License & Attribution

Distributed under the **MIT License**. Created & maintained by [mr-zero0](https://github.com/mr-zero0).
