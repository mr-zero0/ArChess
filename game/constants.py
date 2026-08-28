"""Server-side constants mirrored by the browser configuration endpoint."""

BOARD_SIZE = 8

PIECE_STATS = {
    "pawn": {"hp": 30, "power": 10, "mass": 0.80, "radius": 0.28, "launchMul": 1.15, "friction": 0.985, "restitution": 0.84, "damageMul": 0.75, "collisionMul": 0.85},
    "knight": {"hp": 50, "power": 30, "mass": 1.00, "radius": 0.30, "launchMul": 1.10, "friction": 0.980, "restitution": 0.86, "damageMul": 1.00, "collisionMul": 1.00},
    "bishop": {"hp": 40, "power": 25, "mass": 0.90, "radius": 0.29, "launchMul": 1.05, "friction": 0.993, "restitution": 0.88, "damageMul": 0.90, "collisionMul": 0.95},
    "rook": {"hp": 80, "power": 40, "mass": 1.30, "radius": 0.31, "launchMul": 0.90, "friction": 0.975, "restitution": 0.78, "damageMul": 1.15, "collisionMul": 1.20},
    "queen": {"hp": 90, "power": 70, "mass": 1.15, "radius": 0.32, "launchMul": 0.95, "friction": 0.980, "restitution": 0.82, "damageMul": 1.25, "collisionMul": 1.10},
    "king": {"hp": 120, "power": 100, "mass": 1.45, "radius": 0.34, "launchMul": 0.80, "friction": 0.972, "restitution": 0.80, "damageMul": 1.40, "collisionMul": 1.35},
}

GAME_CONFIG = {
    "maxLaunchSpeed": 13.5,
    "launchStrength": 5.2,
    "maxDragDistance": 2.6,
    "friction": 0.985,
    "bounceFactor": 0.82,
    "collisionMultiplier": 1.0,
    "damageMultiplier": 0.55,
    "impactReferenceSpeed": 8.0,
    "maxCollisionDamage": 58,
    "minDamageImpact": 0.65,
    "minVelocity": 0.18,
    "physicsSubsteps": 3,
    "collisionRestitution": 0.84,
    "collisionCooldown": 0.16,
    "settleDelay": 0.34,
    "collisionSeparationEpsilon": 0.002,
    "comboWindow": 1.2,
    "version": "1.0.0",
}


BACK_RANK = ("rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook")
