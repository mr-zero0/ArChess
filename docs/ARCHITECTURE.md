# ARCHESS — System Architecture & Technical Specifications

This document outlines the architectural patterns, component responsibilities, data flow, API contracts, physics formulas, and logging conventions governing **ArChess**.

---

## 🏗️ 1. High-Level Architecture Overview

```
                          ┌────────────────────────────┐
                          │   Client Web Browser       │
                          │ (Templates / Vanilla CSS)  │
                          └─────────────┬──────────────┘
                                        │
                         HTTP / REST API │ Web Audio & Canvas
                                        ▼
                          ┌────────────────────────────┐
                          │      run.py (Entrypoint)   │
                          └─────────────┬──────────────┘
                                        │
                                        ▼
                          ┌────────────────────────────┐
                          │     backend/app.py         │
                          │   (Flask Application Core) │
                          └──────┬──────────────┬──────┘
                                 │              │
                    SQL Queries  │              │ Structured JSON
                                 ▼              ▼
                    ┌──────────────────┐  ┌───────────────────────┐
                    │ backend/database │  │ backend/logger.py     │
                    │  (data/archess)  │  │ (Logs/.../RunXX.log)  │
                    └──────────────────┘  └───────────────────────┘
```

### Core Design Principles
1. **Zero Root Clutter**: The root directory contains solely the entry point (`run.py`), project metadata (`README.md`, `requirements.txt`), and `.gitignore`. All functional logic is encapsulated within `/backend`, `/templates`, `/static`, and `/data`.
2. **Authoritative Backend**: Session authentication, match persistence, ELO calculations, and telemetry recording are securely handled on the server.
3. **Decoupled Client-Side Engine**: The 32-piece physics engine, 2D/3D perspective projection, and procedural Web Audio run in the browser without requiring external heavy gaming libraries.

---

## 📁 2. Directory Responsibilities

| Directory | Responsibilities | Key Files |
| :--- | :--- | :--- |
| **`/` (Root)** | Top-level project entry point, dependency specifications, and general documentation. | `run.py`, `requirements.txt`, `README.md`, `.gitignore` |
| **`backend/`** | Python application server, database access layer, and structured logging middleware. | `app.py`, `database.py`, `logger.py`, `__init__.py` |
| **`data/`** | Persistent file storage for the SQLite database. | `archess.db` |
| **`docs/`** | Authoritative documentation suite, product trackers, architectural blueprints, and changelogs. | `TRACKER.md`, `ARCHITECTURE.md`, `CHANGELOG.md` |
| **`templates/`** | Server-rendered HTML multi-page templates. | `index.html`, `play.html`, `arsenal.html`, `leaderboard.html` |
| **`frontend/`** | React 19 source code, dependencies (`react-chessboard`, `chess.js`), and `esbuild` build pipeline. | `package.json`, `src/Archess2DChess.jsx` |
| **`static/css/`** | Styling, typography, luxury dark design system tokens, animations, and responsive media queries. | `style.css` |
| **`static/js/`** | Interactive client scripts: auth state manager, background canvas motion, side drawer, 32-piece physics engine, and bundled React 2D chessboard. | `main.js`, `auth.js`, `game.js`, `react-chessboard-bundle.js` |
| **`static/media/`**| High-resolution visual assets, emblems, and cinematic MP4 gameplay videos. | `Chess_pieces_colliding_on_boad.mp4`, `hero-banner.jpg`, `logo.png`, `logo.jpg` |
| **`Logs/`** | Generated structured execution logs categorized by date and auto-incrementing process runs. | `YYYY/MMM/DD_Logs/RunXX/app.log` |

---

## 🗄️ 3. Database Schema (`data/archess.db`)

### `users` Table
Stores authenticated user accounts, encrypted password hashes, and competitive ELO ratings.
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    elo_rating INTEGER DEFAULT 1200,
    matches_played INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    avatar TEXT DEFAULT 'knight',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### `matches` Table
Maintains match settlements, player participation, winner declarations, and physical damage metrics.
```sql
CREATE TABLE matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    white_username TEXT NOT NULL,
    black_username TEXT NOT NULL,
    winner TEXT NOT NULL,
    white_damage INTEGER DEFAULT 0,
    black_damage INTEGER DEFAULT 0,
    turns INTEGER DEFAULT 0,
    duration_sec INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### `telemetry` Table
Captures gameplay events, vector launch data, collision impulses, and client diagnostics with request correlation IDs.
```sql
CREATE TABLE telemetry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    correlation_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔌 4. REST API Specifications

### `GET /api/health`
- **Description**: Returns service status, software version, and active run directory.
- **Response**:
  ```json
  {
    "status": "healthy",
    "service": "ArChess Authoritative Backend",
    "version": "2.0.0",
    "active_run": "Logs/2026/Sep/09_Logs/Run01"
  }
  ```

### `POST /api/auth/register`
- **Payload**: `{"username": "...", "email": "...", "password": "..."}`
- **Response**: `201 Created` with user object, sets session cookie.

### `POST /api/auth/login`
- **Payload**: `{"username_or_email": "...", "password": "..."}`
- **Response**: `200 OK` with user profile, sets session cookie.

### `GET /api/auth/me`
- **Description**: Checks session authenticity and returns active player profile with live ELO.

### `GET /api/leaderboard?limit=25`
- **Description**: Retrieves top Grandmasters sorted descending by `elo_rating`.

---

## ⚛️ 5. Physics & Collision Mechanics

Archess replaces tile-based moves with physical vector impulse:

### 1. Vector Impulse Launch
A piece is aimed by dragging in reverse (slingshot vector). The launch velocity $\vec{v}_0$ is scaled by power factor $k$:
$$\vec{v}_0 = -k \cdot (\vec{p}_{\text{drag}} - \vec{p}_{\text{piece}})$$

### 2. Perimeter Cushion Elastic Bounce
When a piece strikes a board boundary cushion, its velocity normal to the cushion is inverted and dampened by restitution coefficient $e = 0.92$:
$$\vec{v}_{\text{normal}}' = -e \cdot \vec{v}_{\text{normal}}$$

### 3. Conservation of Momentum Collision
Upon collision between Piece 1 (mass $m_1$) and Piece 2 (mass $m_2$):
$$\vec{v}_1' = \frac{m_1 - m_2}{m_1 + m_2}\vec{v}_1 + \frac{2m_2}{m_1 + m_2}\vec{v}_2$$
$$\vec{v}_2' = \frac{2m_1}{m_1 + m_2}\vec{v}_1 + \frac{m_2 - m_1}{m_1 + m_2}\vec{v}_2$$

Damage dealt is proportional to momentum transfer $\Delta p = m \cdot \Delta v$.

### 4. 3D Isometric & Perspective Projection Engine
In 3D view mode, pieces and board vertices are projected using a natural perspective depth model:
$$x_{\text{screen}} = x_{\text{center}} + n_x \cdot \frac{W_{\text{board}}}{2} \cdot s \cdot (1 + 0.20 \cdot n_y)$$
$$y_{\text{screen}} = y_{\text{center}} + n_y \cdot \frac{W_{\text{board}}}{2} \cdot s \cdot p + 24 - \text{elevation} \cdot (1 + 0.20 \cdot n_y)$$
where $s = 0.86$ is the zoom scale, $p = 0.58$ is the vertical pitch tilt, and $n_y \in [-1, 1]$ represents normalized board depth.
- **Screen-Space Hit Testing**: Direct distance calculation against elevated screen positions ensures 100% accurate piece selection on all devices.
- **Isotropic Slingshot Vectoring**: Inverse projection factors map screen drag vectors uniformly into board coordinates, ensuring aim trajectories and physical piece momentum align perfectly with user input across all angles.

### 5. 2D Chess Engine (`react-chessboard` & `chess.js`)
When switched to 2D Chess view, ArChess mounts the official `react-chessboard` component:
- **Core Package**: `react-chessboard@5.12.1` by Clariity with `@dnd-kit/core` drag-and-drop.
- **Rule Engine**: `chess.js@1.4.0` for FEN position serialization, legal move validation, castling, promotion, and checkmate/draw settlement.
- **Bot AI**: Autonomous tactical heuristic evaluator selecting high-value legal moves with natural 650ms thinking dispersion.
- **State Synchronization**: Captures, turn changes, and match settlements automatically broadcast to the arena's battle casualties racks, material advantage badge, and victory modal.

---

## 📊 6. Tracker Logging Standard & Automated Retention

All process runs auto-discover the current date and append an auto-incrementing `RunXX` directory:
`Logs/YYYY/MMM/DD_Logs/RunXX/app.log`

Log entries are emitted as structured JSON lines:
```json
{"timestamp":"2026-09-09T14:00:18+0530", "level":"INFO", "logger":"ArChess", "message":{"req_id":"3a0066fc-0bd8", "method":"GET", "path":"/style.css", "status":200, "latency_ms":0.58}}
```
Every incoming HTTP request receives an injected `X-Request-ID` and `X-Correlation-ID` for cross-system traceability.

### Automated Log Pruning & Retention Engine
To prevent unbounded log accumulation on disk:
- `backend.logger.cleanup_old_logs()` automatically executes on application boot.
- Runs older than 7 days are automatically pruned.
- Runs per day are capped at 15 (oldest runs pruned first).
- Total log directory storage is capped at 30MB.
- The currently active run directory is strictly protected from deletion.
- Empty date subdirectories (`DD_Logs`, `MMM`, `YYYY`) are automatically cleaned up.

### Git & Version Control Exclusion
All log runs are strictly ignored via `.gitignore` (`Logs/`, `logs/`, `*.log`), guaranteeing no runtime logs or diagnostic traces are pushed to GitHub.
