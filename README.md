# ♟️ ARCHESS — Kinetic Chess Protocol

**ARCHESS** is a minimalist, physics-driven tactical chess variant where strict conservation of momentum replaces rigid tile moves. Aim with sub-degree vector precision, launch pieces across the board, rebound off perimeter cushions, and shatter enemy defense formations in real time.

---

## 🏛️ Project Architecture

To adhere to professional software engineering standards, the repository maintains **bare-minimum root-level files** with all components organized into clean, dedicated directories:

```
c:\Users\mohda\Python Codes\ARCHESS\
├── run.py                 # Application server entrypoint
├── requirements.txt       # Python package dependencies
├── README.md              # Project overview & documentation
├── .gitignore             # Version control exclusions
│
├── backend/               # Server application & data layer
│   ├── __init__.py        # Python package marker
│   ├── app.py             # Flask application, routing & REST APIs
│   ├── database.py        # SQLite schema, user auth & match records
│   └── logger.py          # Tracker-compliant structured logging engine
│
├── data/                  # Persistent data directory
│   └── archess.db         # SQLite database file
│
├── docs/                  # Comprehensive engineering documentation
│   ├── TRACKER.md         # Full Product, Engineering & Verification Tracker
│   ├── ARCHITECTURE.md    # System architecture, API contracts & physics
│   └── CHANGELOG.md       # Chronological change records with rationale
│
├── templates/             # HTML View Templates
│   ├── index.html         # Landing page (video hero, themes, side drawer)
│   ├── play.html          # 32-piece Tactical Arena
│   ├── arsenal.html       # Piece Codex & stats inspector
│   └── leaderboard.html   # Global Grandmaster ELO ladder
│
├── static/                # Static frontend assets
│   ├── css/
│   │   └── style.css      # Luxury dark design system, typography & animations
│   ├── js/
│   │   ├── main.js        # Motion canvas, drawer toggle, video controls
│   │   ├── auth.js        # Session authentication & user profile state
│   │   └── game.js        # 32-piece physics engine, collisions, Web Audio
│   └── media/             # Visual assets & cinematic video
│       ├── logo.jpg
│       ├── hero-banner.jpg
│       ├── hero-video.mp4
│       └── Chess_pieces_colliding_on_boad.mp4
│
└── Logs/                  # Generated run logs
    └── YYYY/MMM/DD_Logs/RunXX/app.log
```

---

## ⚡ Quick Start

### 1. Activate Environment & Install Dependencies
```bash
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2. Launch the Application Server
```bash
python run.py
```
The server will start on port **5000**:
- **ARCHESS Overview**: [http://localhost:5000/](http://localhost:5000/)
- **Tactical Arena**: [http://localhost:5000/play](http://localhost:5000/play)
- **Piece Codex**: [http://localhost:5000/arsenal](http://localhost:5000/arsenal)
- **Rankings Ladder**: [http://localhost:5000/leaderboard](http://localhost:5000/leaderboard)

---

## 📖 Documentation Suite

Comprehensive product and engineering documentation is maintained in the [`docs/`](file:///c:/Users/mohda/Python%20Codes/ARCHESS/docs/) folder:
- **[docs/TRACKER.md](file:///c:/Users/mohda/Python%20Codes/ARCHESS/docs/TRACKER.md)**: Authoritative progress tracker documenting completed milestones, pending items, modification ledger, and verification snapshot.
- **[docs/ARCHITECTURE.md](file:///c:/Users/mohda/Python%20Codes/ARCHESS/docs/ARCHITECTURE.md)**: System design specifications, REST API reference, SQLite data model, physics impulse formulas, and tracker-compliant logging schema.
- **[docs/CHANGELOG.md](file:///c:/Users/mohda/Python%20Codes/ARCHESS/docs/CHANGELOG.md)**: Chronological version history detailing what was modified and why.

---

## 🛡️ License & Attributions
Free & Open-Source &bull; mr-zero0/ArChess
