// Game State Management
// Handles game logic, turn management, win conditions, and piece lifecycle

const PhysicsEngine = require('../physics/engine');
const CollisionSystem = require('../physics/collision');

class GameState {
  constructor(options = {}) {
    // Game configuration
    this.config = {
      boardSize: options.boardSize || 8,
      maxPiecesPerTeam: options.maxPiecesPerTeam || 16,
      timeLimit: options.timeLimit || 0, // 0 = no limit
      winCondition: options.winCondition || 'standard', // standard, timed, points, etc.
      gravity: options.gravity || -9.82
    };

    // Game state
    this.pieces = []; // All pieces in the game
    this.currentTurn = 'white'; // white or black
    this.moveCount = 0;
    this.gameOver = false;
    this.winner = null;
    this.lastActivity = Date.now();
    this.collisionHistory = [];

    // Team scores (for points-based modes)
    this.teamScores = {
      white: 0,
      black: 0
    };

    // Initialize physics engine
    this.physicsEngine = new PhysicsEngine({
      timeStep: 1/60,
      maxSubSteps: 3
    });

    // Initialize collision system
    this.collisionSystem = new CollisionSystem(this.physicsEngine, this);

    // Create game board
    this.createBoard();

    // Create initial pieces
    this.createInitialPieces();
  }

  // Create the game board (static physics body)
  createBoard() {
    this.boardBody = this.physicsEngine.createBoardBody(
      this.config.boardSize,
      0.1 // board thickness
    );
  }

  // Create initial chess pieces in starting positions
  createInitialPieces() {
    const pieceDefinitions = [
      // Back row (rank 0 for white, rank 7 for black)
      { type: 'rook',   col: 0,  row: 0, team: 'white' },
      { type: 'knight', col: 1,  row: 0, team: 'white' },
      { type: 'bishop', col: 2,  row: 0, team: 'white' },
      { type: 'queen',  col: 3,  row: 0, team: 'white' },
      { type: 'king',   col: 4,  row: 0, team: 'white' },
      { type: 'bishop', col: 5,  row: 0, team: 'white' },
      { type: 'knight', col: 6,  row: 0, team: 'white' },
      { type: 'rook',   col: 7,  row: 0, team: 'white' },

      { type: 'rook',   col: 0,  row: 7, team: 'black' },
      { type: 'knight', col: 1,  row: 7, team: 'black' },
      { type: 'bishop', col: 2,  row: 7, team: 'black' },
      { type: 'queen',  col: 3,  row: 7, team: 'black' },
      { type: 'king',   col: 4,  row: 7, team: 'black' },
      { type: 'bishop', col: 5,  row: 7, team: 'black' },
      { type: 'knight', col: 6,  row: 7, team: 'black' },
      { type: 'rook',   col: 7,  row: 7, team: 'black' },

      // Pawns (rank 1 for white, rank 6 for black)
      { type: 'pawn', col: 0, row: 1, team: 'white' },
      { type: 'pawn', col: 1, row: 1, team: 'white' },
      { type: 'pawn', col: 2, row: 1, team: 'white' },
      { type: 'pawn', col: 3, row: 1, team: 'white' },
      { type: 'pawn', col: 4, row: 1, team: 'white' },
      { type: 'pawn', col: 5, row: 1, team: 'white' },
      { type: 'pawn', col: 6, row: 1, team: 'white' },
      { type: 'pawn', col: 7, row: 1, team: 'white' },

      { type: 'pawn', col: 0, row: 6, team: 'black' },
      { type: 'pawn', col: 1, row: 6, team: 'black' },
      { type: 'pawn', col: 2, row: 6, team: 'black' },
      { type: 'pawn', col: 3, row: 6, team: 'black' },
      { type: 'pawn', col: 4, row: 6, team: 'black' },
      { type: 'pawn', col: 5, row: 6, team: 'black' },
      { type: 'pawn', col: 6, row: 6, team: 'black' },
      { type: 'pawn', col: 7, row: 6, team: 'black' }
    ];

    // Create pieces from definitions
    pieceDefinitions.forEach(def => {
      this.createPiece(def.type, def.col, def.row, def.team, true); // true = starting piece
    });
  }

  // Create a new game piece
  createPiece(type, col, row, team, isStarting = false) {
    // Convert board coordinates to physics coordinates
    // Board center is at (0, 0, 0), so we offset accordingly
    const boardOffset = this.config.boardSize / 2 - 0.5;
    const x = (col - boardOffset);
    const z = (row - boardOffset);
    const y = 1.0; // Height above board

    // Piece properties based on type
    const pieceProps = this.getPieceProperties(type);

    const piece = {
      id: this.generatePieceId(),
      type,
      team,
      position: { x, y, z },
      velocity: { x: 0, y: 0, z: 0 }, // Start stationary
      hp: pieceProps.maxHp,
      maxHp: pieceProps.maxHp,
      power: pieceProps.power,
      radius: pieceProps.radius,
      mass: pieceProps.mass,
      alive: true,
      isStartingPiece: isStarting,
      abilities: this.getInitialAbilities(type),
      activeAbilities: [], // Abilities currently active
      cooldowns: {} // Ability cooldown timers
    };

    // Add to game state
    this.pieces.push(piece);

    // Create physics body
    const physicsBody = this.physicsEngine.createPieceBody(piece);
    piece.physicsBody = physicsBody;

    return piece;
  }

  // Get piece properties based on type
  getPieceProperties(type) {
    const properties = {
      pawn: {
        maxHp: 30,
        power: 25,
        radius: 0.4,
        mass: 1.0
      },
      knight: {
        maxHp: 45,
        power: 30,
        radius: 0.45,
        mass: 1.2
      },
      bishop: {
        maxHp: 45,
        power: 30,
        radius: 0.45,
        mass: 1.2
      },
      rook: {
        maxHp: 60,
        power: 35,
        radius: 0.5,
        mass: 1.5
      },
      queen: {
        maxHp: 70,
        power: 40,
        radius: 0.55,
        mass: 1.8
      },
      king: {
        maxHp: 100,
        power: 20, // King is weaker in power but has high HP
        radius: 0.5,
        mass: 2.0
      }
    };

    return properties[type] || properties.pawn;
  }

  // Get initial abilities for a piece type
  getInitialAbilities(type) {
    // In a full implementation, this would load from ability definitions
    // For now, return empty array - abilities would be granted through gameplay
    return [];
  }

  // Generate unique piece ID
  generatePieceId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get alive pieces for a team
  getAlivePieces(team) {
    return this.pieces.filter(piece => piece.team === team && piece.alive);
  }

  // Get alive enemy pieces for a team
  getAliveEnemyPieces(team) {
    const enemyTeam = team === 'white' ? 'black' : 'white';
    return this.getAlivePieces(enemyTeam);
  }

  // Check if king is alive for a team
  isKingAlive(team) {
    const king = this.pieces.find(
      piece => piece.team === team && piece.type === 'king' && piece.alive
    );
    return king !== undefined;
  }

  // Handle piece launch
  launchPiece(pieceId, forceData) {
    const piece = this.pieces.find(p => p.id === pieceId);
    if (!piece || !piece.alive) return false;

    // Check if it's the correct team's turn
    if (piece.team !== this.currentTurn) return false;

    // Launch the piece using physics engine
    const success = this.physicsEngine.launchPiece(
      piece.physicsBody,
      forceData
    );

    if (success) {
      this.moveCount++;
      this.lastActivity = Date.now();
      // Switch turns after successful launch
      this.currentTurn = this.currentTurn === 'white' ? 'black' : 'white';
    }

    return success;
  }

  // Select a piece (for aiming)
  selectPiece(pieceId) {
    const piece = this.pieces.find(p => p.id === pieceId);
    if (!piece || !piece.alive) return false;
    if (piece.team !== this.currentTurn) return false;

    // Clear previous selection
    this.pieces.forEach(p => p.selected = false);

    // Select new piece
    piece.selected = true;
    return true;
  }

  // Deselect current piece
  deselectPiece() {
    this.pieces.forEach(p => p.selected = false);
  }

  // Get currently selected piece
  getSelectedPiece() {
    return this.pieces.find(p => p.selected && p.alive) || null;
  }

  // Update game state (called each frame)
  update(deltaTime) {
    // Step physics
    this.physicsEngine.step();

    // Process collisions
    this.collisionSystem.processCollisions();

    // Update ability cooldowns
    this.updateAbilityCooldowns(deltaTime);

    // Check win conditions
    this.checkWinConditions();

    // Check for time limit
    if (this.config.timeLimit > 0) {
      const elapsedTime = (Date.now() - this.startTime) / 1000;
      if (elapsedTime >= this.config.timeLimit) {
        this.endGameByTimeout();
      }
    }

    // Update last activity if there was movement
    const hasMovement = this.pieces.some(piece =>
      piece.alive &&
      (Math.abs(piece.velocity.x) > 0.01 ||
       Math.abs(piece.velocity.y) > 0.01 ||
       Math.abs(piece.velocity.z) > 0.01)
    );

    if (hasMovement) {
      this.lastActivity = Date.now();
    }
  }

  // Update ability cooldowns
  updateAbilityCooldowns(deltaTime) {
    this.pieces.forEach(piece => {
      if (!piece.alive) return;

      Object.keys(piece.cooldowns).forEach(abilityId => {
        piece.cooldowns[abilityId] -= deltaTime;
        if (piece.cooldowns[abilityId] <= 0) {
          delete piece.cooldowns[abilityId];
        }
      });
    });
  }

  // Check win conditions based on game mode
  checkWinConditions() {
    if (this.gameOver) return;

    switch (this.config.winCondition) {
      case 'standard':
        this.checkStandardWinCondition();
        break;
      case 'timed':
        this.checkTimedWinCondition();
        break;
      case 'points':
        this.checkPointsWinCondition();
        break;
      case 'survivor':
        this.checkSurvivorWinCondition();
        break;
      default:
        this.checkStandardWinCondition();
    }
  }

  // Standard win condition: destroy enemy king
  checkStandardWinCondition() {
    const whiteKingAlive = this.isKingAlive('white');
    const blackKingAlive = this.isKingAlive('black');

    if (!whiteKingAlive && !blackKingAlive) {
      // Both kings destroyed - draw or based on who destroyed last
      this.endGame('draw');
    } else if (!whiteKingAlive) {
      this.endGame('black');
    } else if (!blackKingAlive) {
      this.endGame('white');
    }
  }

  // Timed win condition: most destruction when time runs out
  checkTimedWinCondition() {
    // Handled in update() when time limit is reached
  }

  // Points win condition: first to N points wins
  checkPointsWinCondition() {
    const pointsToWin = this.config.pointsToWin || 10;

    if (this.teamScores.white >= pointsToWin) {
      this.endGame('white');
    } else if (this.teamScores.black >= pointsToWin) {
      this.endGame('black');
    }
  }

  // Survivor win condition: last team with pieces wins
  checkSurvivorWinCondition() {
    const whitePiecesAlive = this.getAlivePieces('white').length;
    const blackPiecesAlive = this.getAlivePieces('black').length;

    if (whitePiecesAlive === 0 && blackPiecesAlive === 0) {
      this.endGame('draw');
    } else if (whitePiecesAlive === 0) {
      this.endGame('black');
    } else if (blackPiecesAlive === 0) {
      this.endGame('white');
    }
  }

  // End the game with a winner
  endGame(winner) {
    this.gameOver = true;
    this.winner = winner;
    this.lastActivity = Date.now();

    // In a full implementation, we would:
    // - Save game to database
    // - Generate analytics
    // - Notify clients
  }

  // End game due to timeout
  endGameByTimeout() {
    this.gameOver = true;
    // Determine winner based on remaining pieces or points
    const whitePieces = this.getAlivePieces('white').length;
    const blackPieces = this.getAlivePieces('black').length;

    if (whitePieces > blackPieces) {
      this.winner = 'white';
    } else if (blackPieces > whitePieces) {
      this.winner = 'black';
    } else {
      // Equal pieces - compare total HP
      const whiteHP = this.getAlivePieces('white').reduce((sum, p) => sum + p.hp, 0);
      const blackHP = this.getAlivePieces('black').reduce((sum, p) => sum + p.hp, 0);

      if (whiteHP > blackHP) {
        this.winner = 'white';
      } else if (blackHP > whiteHP) {
        this.winner = 'black';
      } else {
        this.winner = 'draw';
      }
    }

    this.lastActivity = Date.now();
  }

  // Get state for sending to clients
  getStateForClient() {
    return {
      pieces: this.pieces.map(piece => ({
        id: piece.id,
        type: piece.type,
        team: piece.team,
        position: piece.position,
        velocity: piece.velocity,
        hp: piece.hp,
        maxHp: piece.maxHp,
        power: piece.power,
        radius: piece.radius,
        mass: piece.mass,
        alive: piece.alive,
        selected: piece.selected || false
      })),
      currentTurn: this.currentTurn,
      moveCount: this.moveCount,
      gameOver: this.gameOver,
      winner: this.winner,
      lastActivity: this.lastActivity,
      teamScores: this.teamScores,
      config: this.config
    };
  }

  // Reset game for new match
  reset() {
    // Remove all physics bodies
    this.physicsEngine.reset();

    // Clear game state
    this.pieces = [];
    this.currentTurn = 'white';
    this.moveCount = 0;
    this.gameOver = false;
    this.winner = null;
    this.lastActivity = Date.now();
    this.teamScores = { white: 0, black: 0 };
    this.collisionHistory = [];

    // Recreate board and pieces
    this.createBoard();
    this.createInitialPieces();
  }

  // Destroy game state and cleanup
  destroy() {
    this.physicsEngine.destroy();
    // Additional cleanup would go here
  }
}

module.exports = GameState;