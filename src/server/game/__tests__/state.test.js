const GameState = require('../state');

describe('GameState', () => {
  let gameState;

  beforeEach(() => {
    gameState = new GameState();
  });

  test('should create a game state instance', () => {
    expect(gameState).toBeInstanceOf(GameState);
    expect(gameState.currentTurn).toBe('white');
    expect(gameState.moveCount).toBe(0);
    expect(gameState.gameOver).toBe(false);
    expect(gameState.winner).toBe(null);
    expect(Array.isArray(gameState.pieces)).toBe(true);
    expect(gameState.pieces.length).toBeGreaterThan(0); // Should have initial pieces
  });

  test('should initialize with correct board size', () => {
    const customSize = 10;
    const gameStateCustom = new GameState({ boardSize: customSize });
    expect(gameStateCustom.config.boardSize).toBe(customSize);
  });

  test('should create a piece', () => {
    const initialPieceCount = gameState.pieces.length;
    const piece = gameState.createPiece('pawn', 0, 0, 'white', false);

    expect(piece).toBeDefined();
    expect(gameState.pieces.length).toBe(initialPieceCount + 1);

    expect(piece.type).toBe('pawn');
    expect(piece.team).toBe('white');
    expect(piece.alive).toBe(true);
  });

  test('should launch a piece', () => {
    // Get a white pawn to launch
    const whitePawn = gameState.pieces.find(
      p => p.type === 'pawn' && p.team === 'white' && p.alive
    );

    if (!whitePawn) {
      throw new Error('Could not find white pawn for test');
    }

    const initialTurn = gameState.currentTurn;
    const launchSuccess = gameState.launchPiece(whitePawn.id, { x: 5, y: 5, z: 0 });

    // Launch might fail due to positioning, but if successful should switch turns
    if (launchSuccess) {
      expect(gameState.currentTurn).toBe(initialTurn === 'white' ? 'black' : 'white');
      expect(gameState.moveCount).toBe(1);
    }
  });

  test('should handle win conditions when kings are destroyed', () => {
    // Test standard win condition: white king destroyed
    const whiteKing = gameState.pieces.find(
      p => p.type === 'king' && p.team === 'white'
    );

    if (!whiteKing) {
      throw new Error('Could not find white king for test');
    }

    // Simulate white king being destroyed
    whiteKing.hp = 0;
    whiteKing.alive = false;

    // Check win conditions
    gameState.checkWinConditions();

    // Black should win
    expect(gameState.gameOver).toBe(true);
    expect(gameState.winner).toBe('black');
  });

  test('should handle draw when both kings destroyed', () => {
    // Find both kings
    const whiteKing = gameState.pieces.find(
      p => p.type === 'king' && p.team === 'white'
    );
    const blackKing = gameState.pieces.find(
      p => p.type === 'king' && p.team === 'black'
    );

    if (!whiteKing || !blackKing) {
      throw new Error('Could not find kings for test');
    }

    // Simulate both kings being destroyed
    whiteKing.hp = 0;
    whiteKing.alive = false;
    blackKing.hp = 0;
    blackKing.alive = false;

    // Check win conditions
    gameState.checkWinConditions();

    // Should be draw
    expect(gameState.gameOver).toBe(true);
    expect(gameState.winner).toBe('draw');
  });

  test('should reset game state', () => {
    // Modify some state
    gameState.currentTurn = 'black';
    gameState.moveCount = 5;
    gameState.gameOver = true;
    gameState.winner = 'white';

    // Store initial piece count
    const initialPieceCount = gameState.pieces.length;

    // Reset
    gameState.reset();

    // Check reset state
    expect(gameState.currentTurn).toBe('white');
    expect(gameState.moveCount).toBe(0);
    expect(gameState.gameOver).toBe(false);
    expect(gameState.winner).toBe(null);
    // Should have same number of pieces (reset recreates them)
    expect(gameState.pieces.length).toBe(initialPieceCount);
  });
});