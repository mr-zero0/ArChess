-- ==============================================================================
-- ARCHESS Database Schema (PostgreSQL / Supabase / Neon Production DDL)
-- Version: 2.0.0
-- ==============================================================================

-- 1. USERS & COMMANDERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(64) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    elo_rating INTEGER DEFAULT 1200,
    matches_played INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    avatar VARCHAR(64) DEFAULT 'knight',
    auth_provider VARCHAR(32) DEFAULT 'local',
    google_id VARCHAR(128),
    token_version INTEGER DEFAULT 1,
    is_admin INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_elo ON users (elo_rating DESC);
CREATE INDEX IF NOT EXISTS idx_users_google ON users (google_id);
CREATE INDEX IF NOT EXISTS idx_users_admin ON users (is_admin);
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- 2. MATCHES & TOURNAMENT SETTLEMENT TABLE
CREATE TABLE IF NOT EXISTS matches (
    id SERIAL PRIMARY KEY,
    white_username VARCHAR(64) NOT NULL,
    black_username VARCHAR(64) NOT NULL,
    winner VARCHAR(16) NOT NULL CHECK (winner IN ('white', 'black', 'draw')),
    white_damage INTEGER DEFAULT 0,
    black_damage INTEGER DEFAULT 0,
    turns INTEGER DEFAULT 0,
    duration_sec INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_matches_created ON matches (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_white_user ON matches (white_username, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_black_user ON matches (black_username, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_winner ON matches (winner);

-- 3. USER ACHIEVEMENTS TABLE
CREATE TABLE IF NOT EXISTS user_achievements (
    id SERIAL PRIMARY KEY,
    username VARCHAR(64) NOT NULL,
    achievement_id VARCHAR(64) NOT NULL,
    unlocked_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_achievement UNIQUE (username, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements (username);
CREATE INDEX IF NOT EXISTS idx_user_achievements_id ON user_achievements (achievement_id);

-- 4. TELEMETRY & AUDIT EVENT LEDGER TABLE
CREATE TABLE IF NOT EXISTS telemetry (
    id SERIAL PRIMARY KEY,
    correlation_id VARCHAR(128) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_telemetry_corr ON telemetry (correlation_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_type ON telemetry (event_type);
CREATE INDEX IF NOT EXISTS idx_telemetry_created ON telemetry (created_at DESC);
