-- ==============================================================================
-- ARCHESS Database Schema (Authoritative SQL DDL)
-- Suitable for SQLite (Local/Embedded) and ANSI SQL / PostgreSQL Migrations
-- Version: 2.0.0
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. USERS & COMMANDERS TABLE
-- Tracks player accounts, auth methods (local vs Google OAuth), competitive ELO,
-- win/loss records, avatar cosmetics, and administrative privileges.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    elo_rating INTEGER DEFAULT 1200,
    matches_played INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    avatar TEXT DEFAULT 'knight',
    auth_provider TEXT DEFAULT 'local',
    google_id TEXT,
    token_version INTEGER DEFAULT 1,
    is_admin INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes for User Queries & Leaderboard Sorting
CREATE INDEX IF NOT EXISTS idx_users_elo ON users (elo_rating DESC);
CREATE INDEX IF NOT EXISTS idx_users_google ON users (google_id);
CREATE INDEX IF NOT EXISTS idx_users_admin ON users (is_admin);
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ------------------------------------------------------------------------------
-- 2. MATCHES & TOURNAMENT SETTLEMENT TABLE
-- Authoritative match ledger recording competitive duel outcomes, turn counts,
-- match duration, kinetic damage breakdown, and player timestamps.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    white_username TEXT NOT NULL,
    black_username TEXT NOT NULL,
    winner TEXT NOT NULL CHECK (winner IN ('white', 'black', 'draw')),
    white_damage INTEGER DEFAULT 0,
    black_damage INTEGER DEFAULT 0,
    turns INTEGER DEFAULT 0,
    duration_sec INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes for Historical Querying & Player Profiles
CREATE INDEX IF NOT EXISTS idx_matches_created ON matches (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_white_user ON matches (white_username, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_black_user ON matches (black_username, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_winner ON matches (winner);

-- ------------------------------------------------------------------------------
-- 3. USER ACHIEVEMENTS TABLE
-- Unlocked career badges and milestone accomplishments.
-- Composite UNIQUE constraint prevents duplicate badge unlocks per commander.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    achievement_id TEXT NOT NULL,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(username, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements (username);
CREATE INDEX IF NOT EXISTS idx_user_achievements_id ON user_achievements (achievement_id);

-- ------------------------------------------------------------------------------
-- 4. TELEMETRY & AUDIT EVENT LEDGER TABLE
-- Correlated observability and audit log events for compliance and analytics.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS telemetry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    correlation_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_telemetry_corr ON telemetry (correlation_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_type ON telemetry (event_type);
CREATE INDEX IF NOT EXISTS idx_telemetry_created ON telemetry (created_at DESC);
