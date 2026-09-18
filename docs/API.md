# 🔌 ArChess API & WebSocket Protocol Specification

Comprehensive REST API and WebSocket event protocol documentation for ArChess authoritative backend services.

---

## 📋 Table of Contents
1. [General Specifications](#-general-specifications)
2. [Health & Monitoring](#-health--monitoring)
3. [Authentication & Account Management](#-authentication--account-management)
4. [Live Matchmaking Queue](#-live-matchmaking-queue)
5. [Multiplayer Rooms & WebSocket Protocol](#-multiplayer-rooms--websocket-protocol)
6. [Match Settlement & Telemetry](#-match-settlement--telemetry)
7. [Leaderboards & Player Profiles](#-leaderboards--player-profiles)
8. [Knockout Tournament Engine](#-knockout-tournament-engine)
9. [Achievements Engine](#-achievements-engine)

---

## 🌐 General Specifications

* **Base URL**: `http://127.0.0.1:5000` (Local) / `https://your-domain.com` (Production)
* **WebSocket URL**: `ws://<host>/ws/combat/<room_id>` or `wss://<host>/ws/combat/<room_id>`
* **Content Type**: `application/json`
* **Authentication**: Session cookie (`session_id`) set upon successful authentication (`SameSite=Lax`, `HttpOnly`).
* **Headers**: Every response returns:
  * `X-Request-ID`: Unique UUID correlation identifier.
  * `X-Correlation-ID`: Trace identifier propagating through backend logs.

---

## 🩺 Health & Monitoring

### `GET /api/health`
Liveness and readiness probe for load balancers and container orchestrators.

* **Authentication**: None required.
* **Rate Limit**: Unrestricted.
* **Response (200 OK)**:
```json
{
  "status": "healthy",
  "service": "ArChess Authoritative Backend",
  "version": "2.0.0",
  "database": "connected",
  "uptime_seconds": 1248.5,
  "active_run": "Logs/2026/Sep/18_Logs/Run45",
  "timestamp": 1789721495.23
}
```
* **Failure (503 Service Unavailable)**: Returned if database read/write probe fails.

---

## 🔐 Authentication & Account Management

### `POST /api/auth/register`
Creates a new local user account.

* **Payload**:
```json
{
  "username": "GrandmasterX",
  "email": "player@example.com",
  "password": "SecurePassword123!"
}
```
* **Response (201 Created)**:
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "GrandmasterX",
    "email": "player@example.com",
    "elo_rating": 1200
  }
}
```

---

### `POST /api/auth/login`
Authenticates existing account.

* **Rate Limit**: **15 attempts per minute per IP** (returns `429 Too Many Requests` on breach).
* **Payload**:
```json
{
  "username_or_email": "GrandmasterX",
  "password": "SecurePassword123!"
}
```
* **Response (200 OK)**:
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "GrandmasterX",
    "email": "player@example.com",
    "elo_rating": 1200,
    "matches_played": 0,
    "wins": 0,
    "losses": 0,
    "avatar": "knight"
  }
}
```

---

### `GET /api/auth/me`
Fetches current session profile.
* **Response (200 OK)**:
```json
{
  "authenticated": true,
  "user": { ... }
}
```

---

### `POST /api/auth/logout`
Terminates current user session and clears cookie.

---

### `GET / PUT /api/auth/profile`
* **GET**: Returns user profile and match performance stats.
* **PUT**: Updates username or avatar icon (`knight`, `queen`, `king`, `rook`).

---

### `POST /api/auth/google`
Authenticates via Google OAuth 2.0 credential JWT token.

---

## 🎯 Live Matchmaking Queue

### `POST /api/matchmaking/join`
Enters the automated matchmaking pool.
* **Payload**:
```json
{
  "username": "GrandmasterX",
  "elo": 1240,
  "mode": "3d-arena",
  "preferred_role": "random"
}
```
* **Response (200 OK)**:
```json
{
  "success": true,
  "ticket": {
    "ticket_id": "MM-82914-419",
    "username": "GrandmasterX",
    "elo": 1240,
    "status": "waiting",
    "created_at": 1789721500.0,
    "room_id": null
  }
}
```

---

### `GET /api/matchmaking/ticket/<ticket_id>`
Polls queue ticket status until paired (`status: "matched"`).

---

### `DELETE /api/matchmaking/ticket/<ticket_id>`
Cancels pending matchmaking ticket.

---

## 🎮 Multiplayer Rooms & WebSocket Protocol

### `POST /api/multiplayer/rooms/create`
Creates a private multiplayer battle room.
* **Response (201 Created)**:
```json
{
  "success": true,
  "room_id": "ARC-K7X-92M",
  "room": { ... }
}
```

---

### WebSocket Stream: `/ws/combat/<room_id>`
Bi-directional real-time communication stream.

* **Security Guard**: Max payload ceiling of **64KB** per frame.

#### 1. Client $\rightarrow$ Server Handshake
Upon establishing WebSocket connection:
```json
{
  "type": "join",
  "username": "CommanderX",
  "preferred_role": "white"
}
```

#### 2. Server $\rightarrow$ Client Handshake Confirmation
```json
{
  "type": "handshake_ok",
  "role": "white",
  "username": "CommanderX",
  "room_id": "ARC-K7X-92M",
  "room": { ... }
}
```

#### 3. Client $\rightarrow$ Server: Live Aiming Preview
```json
{
  "type": "aim",
  "pieceId": "w_knight_1",
  "angle": 1.24,
  "powerRatio": 0.75,
  "screenX": 340,
  "screenY": 410
}
```
*Server broadcasts `opponent_aim` to opposing player and spectators.*

#### 4. Client $\rightarrow$ Server: Slingshot Launch
```json
{
  "type": "launch",
  "pieceId": "w_knight_1",
  "vx": 12.4,
  "vy": -8.6,
  "power": 0.85
}
```
*Server updates turn counter and broadcasts `opponent_launch`.*

#### 5. Ping / Latency Check
* Client sends: `{"type": "ping", "client_ts": 1789721510000}`
* Server returns: `{"type": "pong", "client_ts": 1789721510000, "server_ts": 1789721510012}`

---

## 📊 Match Settlement & Telemetry

### `POST /api/matches/record`
Persists completed match results, updates player ELO ratings, and evaluates achievement unlocks.

* **Rate Limit**: **60 requests/min per IP** for unauthenticated guests.
* **Payload**:
```json
{
  "white_username": "GrandmasterX",
  "black_username": "ArChess Bot",
  "winner": "white",
  "white_damage": 380,
  "black_damage": 120,
  "turns": 18,
  "duration_sec": 94
}
```
* **Response (200 OK)**:
```json
{
  "success": true,
  "match_id": 42,
  "elo_change": {
    "white": 18,
    "black": -18
  },
  "unlocked_achievements": [
    { "id": "first_blood", "title": "First Blood", "icon": "⚔️" }
  ]
}
```

---

## 🏆 Knockout Tournament Engine

### `GET /api/tournament/bracket`
Fetches current championship tournament bracket, match pairings, and round statuses.

### `POST /api/tournament/simulate`
Advances tournament simulation by one round.

### `POST /api/tournament/reset`
Resets the tournament and initializes a new seasonal bracket.

---

## 🎖️ Achievements Engine

### `GET /api/achievements`
Returns the master catalog of all 8 unlockable platform achievements.

### `GET /api/achievements/user`
Returns achievements currently unlocked by the authenticated player.
