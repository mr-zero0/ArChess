"""Server-side constants mirrored by the browser configuration endpoint."""

BOARD_SIZE = 8

PIECE_STATS = {
    "pawn": {"hp": 30, "power": 10, "mass": 0.80, "radius": 0.28},
    "knight": {"hp": 50, "power": 30, "mass": 1.00, "radius": 0.30},
    "bishop": {"hp": 40, "power": 25, "mass": 0.90, "radius": 0.29},
    "rook": {"hp": 80, "power": 40, "mass": 1.30, "radius": 0.31},
    "queen": {"hp": 90, "power": 70, "mass": 1.15, "radius": 0.32},
    "king": {"hp": 120, "power": 100, "mass": 1.45, "radius": 0.34},
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
}

BACK_RANK = ("rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook")
