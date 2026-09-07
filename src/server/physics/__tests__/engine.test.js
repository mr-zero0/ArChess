// Physics Engine Tests
const PhysicsEngine = require('../engine');

describe('PhysicsEngine', () => {
  let physicsEngine;

  beforeEach(() => {
    physicsEngine = new PhysicsEngine();
  });

  afterEach(() => {
    physicsEngine.destroy();
  });

  test('should create a physics world', () => {
    expect(physicsEngine.world).toBeDefined();
    expect(physicsEngine.world.gravity.y).toBe(-9.82);
  });

  test('should create a piece body', () => {
    const pieceData = {
      id: 'test-piece',
      type: 'pawn',
      team: 'white',
      position: { x: 0, y: 1, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      hp: 30,
      maxHp: 30,
      power: 25,
      radius: 0.4,
      mass: 1.0,
      alive: true
    };

    const body = physicsEngine.createPieceBody(pieceData);

    expect(body).toBeDefined();
    expect(body.gamePieceId).toBe('test-piece');
    expect(body.gamePieceType).toBe('pawn');
    expect(body.gamePieceTeam).toBe('white');
    expect(body.shapes.length).toBe(1);
    expect(body.mass).toBe(1.0);
  });

  test('should create a board body', () => {
    const boardBody = physicsEngine.createBoardBody(8, 0.1);

    expect(boardBody).toBeDefined();
    expect(boardBody.gamePieceId).toBeUndefined(); // Static body
    expect(boardBody.mass).toBe(0); // Static body has zero mass
  });

  test('should apply launch force to a piece', () => {
    const pieceData = {
      id: 'test-piece',
      type: 'pawn',
      team: 'white',
      position: { x: 0, y: 1, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      hp: 30,
      maxHp: 30,
      power: 25,
      radius: 0.4,
      mass: 1.0,
      alive: true
    };

    const body = physicsEngine.createPieceBody(pieceData);
    const initialVelocity = body.velocity.clone();

    const forceData = { x: 5, y: 5, z: 0 };
    const result = physicsEngine.launchPiece(body, forceData);

    expect(result).toBe(true);
    // Velocity should have changed after applying impulse
    expect(body.velocity).not.toEqual(initialVelocity);
  });

  test('should step the physics simulation', () => {
    const pieceData = {
      id: 'test-piece',
      type: 'pawn',
      team: 'white',
      position: { x: 0, y: 1, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      hp: 30,
      maxHp: 30,
      power: 25,
      radius: 0.4,
      mass: 1.0,
      alive: true
    };

    physicsEngine.createPieceBody(pieceData);

    // Store initial positions
    const initialPositions = physicsEngine.getPieceStates();

    // Step the physics
    physicsEngine.step();

    // Get positions after step
    const finalPositions = physicsEngine.getPieceStates();

    // With gravity, the piece should have fallen slightly
    expect(finalPositions[0].position.y).toBeLessThan(initialPositions[0].position.y);
  });

  test('should reset the physics world', () => {
    const pieceData = {
      id: 'test-piece',
      type: 'pawn',
      team: 'white',
      position: { x: 0, y: 1, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      hp: 30,
      maxHp: 30,
      power: 25,
      radius: 0.4,
      mass: 1.0,
      alive: true
    };

    physicsEngine.createPieceBody(pieceData);
    expect(physicsEngine.world.bodies.length).toBeGreaterThan(0);

    physicsEngine.reset();
    expect(physicsEngine.world.bodies.length).toBe(0);
  });
});