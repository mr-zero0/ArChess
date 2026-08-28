from __future__ import annotations


GAME_CONFIG = {
    "boardSize": 8,
    "maxLaunchSpeed": 13.5,
    "launchStrength": 2.15,
    "maxDragDistance": 3.25,
    "friction": 0.985,
    "bounceFactor": 0.82,
    "collisionMultiplier": 0.78,
    "damageMultiplier": 0.9,
    "maxCollisionDamage": 45,
    "impactReferenceSpeed": 8.5,
    "minDamageImpact": 0.65,
    "minVelocity": 0.18,
    "minDragDistance": 0.08,
    "physicsSubsteps": 3,
    "collisionCooldown": 0.16,
    "settleDelay": 0.34,
    "collisionSeparationEpsilon": 0.002,
    "trailLifetime": 0.32,
    "maxTrailPoints": 22,
    "turnTime": 30,
}


PIECE_STATS = {
    "pawn": {"hp": 30, "power": 10, "mass": 1.0, "radius": 0.28, "launchMul": 1.08, "friction": 0.984, "restitution": 0.84, "damageMul": 0.92, "collisionMul": 0.95},
    "knight": {"hp": 50, "power": 30, "mass": 1.2, "radius": 0.31, "launchMul": 1.02, "friction": 0.984, "restitution": 0.83, "damageMul": 1.0, "collisionMul": 1.0},
    "bishop": {"hp": 40, "power": 25, "mass": 1.1, "radius": 0.30, "launchMul": 1.04, "friction": 0.986, "restitution": 0.84, "damageMul": 0.98, "collisionMul": 0.98},
    "rook": {"hp": 80, "power": 40, "mass": 1.7, "radius": 0.34, "launchMul": 0.96, "friction": 0.982, "restitution": 0.8, "damageMul": 1.06, "collisionMul": 1.05},
    "queen": {"hp": 90, "power": 70, "mass": 1.45, "radius": 0.35, "launchMul": 0.98, "friction": 0.984, "restitution": 0.81, "damageMul": 1.18, "collisionMul": 1.1},
    "king": {"hp": 120, "power": 100, "mass": 2.2, "radius": 0.37, "launchMul": 0.9, "friction": 0.98, "restitution": 0.78, "damageMul": 1.24, "collisionMul": 1.16},
}

INITIAL_BOARD = [
    ["rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook"],
    ["pawn"] * 8,
    [None] * 8,
    [None] * 8,
    [None] * 8,
    [None] * 8,
    ["pawn"] * 8,
    ["rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook"],
]
