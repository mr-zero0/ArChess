# ArChess Modern Client

## Stack

React 19 + TypeScript, Phaser 4, Tailwind CSS 4, Motion for React, and Vite 8.

## Local run

```powershell
cd frontend
npm install
npm run build
cd ..
python game.py
```

Open `http://127.0.0.1:5000/`. Flask serves the compiled React/Phaser client and owns the HTTP/WebSocket API.

## Architecture

React renders the product shell and HUD. Phaser owns the interactive arena and frame/update loop. The local Phaser physics model is deterministic and explicitly transitions from physics to the opposite player's turn when all surviving pieces settle. Flask owns the transport boundary and authoritative room service.
