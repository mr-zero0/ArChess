# ArChess Modern Client

## Stack

React 19 + TypeScript, Phaser 4, Tailwind CSS 4, Motion for React, and Vite 8.

## Local run

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL shown by the terminal. The legacy Flask server remains independent and should not be replaced while parity work is in progress.

## Backend

The migration service is in `backend/`:

```powershell
pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --reload --port 8000
```

Vite proxies `/api` and `/ws` to port 8000.

## Architecture

React renders the product shell and HUD. Phaser owns the interactive arena and frame/update loop. The local Phaser physics model is deterministic and explicitly transitions from physics to the opposite player's turn when all surviving pieces settle. FastAPI is the modern transport boundary; the existing Python game authority remains the source of truth until parity is proven.
