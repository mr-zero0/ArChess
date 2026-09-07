// Physics Engine for Chess Variant Game
// Using cannon-es for realistic physics simulation

const CANNON = require('cannon-es');

class PhysicsEngine {
  constructor(options = {}) {
    // Physics world configuration
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0), // Realistic gravity
      broadphase: new CANNON.NaiveBroadphase(),
      solver: new CANNON.GSSolver()
    });

    // Physics parameters
    this.timeStep = options.timeStep || 1 / 60; // Fixed time step for determinism
    this.maxSubSteps = options.maxSubSteps || 3;

    // Material properties for different piece types
    this.materials = this.createMaterials();

    // Collision tracking
    this.collisionEvents = [];

    // Set up collision event listener
    this.world.addEventListener('postStep', () => {
      this.processCollisions();
    });

    // Performance tracking
    this.stats = {
      bodies: 0,
      collisions: 0,
      stepTime: 0
    };
  }

  createMaterials() {
    // Default material for pieces
    const defaultMaterial = new CANNON.Material('default');

    // Contact materials for different interactions
    const piecePieceContact = new CANNON.ContactMaterial(
      defaultMaterial,
      defaultMaterial,
      {
        friction: 0.3,
        restitution: 0.4, // Bounciness
        contactEquationStiffness: 1e7,
        contactEquationRelaxation: 3
      }
    );

    const pieceBoardContact = new CANNON.ContactMaterial(
      defaultMaterial,
      new CANNON.Material('board'),
      {
        friction: 0.5,
        restitution: 0.2,
        contactEquationStiffness: 1e7,
        contactEquationRelaxation: 3
      }
    );

    // Add contact materials to world
    this.world.addContactMaterial(piecePieceContact);
    this.world.addContactMaterial(pieceBoardContact);

    return {
      default: defaultMaterial,
      piecePiece: piecePieceContact,
      pieceBoard: pieceBoardContact
    };
  }

  // Create a physics body for a game piece
  createPieceBody(pieceData) {
    const shape = new CANNON.Sphere(pieceData.radius);

    const body = new CANNON.Body({
      mass: pieceData.mass,
      position: new CANNON.Vec3(
        pieceData.position.x,
        pieceData.position.y,
        pieceData.position.z
      ),
      velocity: new CANNON.Vec3(
        pieceData.velocity.x,
        pieceData.velocity.y,
        pieceData.velocity.z
      ),
      shape,
      material: this.materials.default,
      linearDamping: 0.01, // Air resistance
      angularDamping: 0.01
    });

    // Store reference to game piece data
    body.gamePieceId = pieceData.id;
    body.gamePieceType = pieceData.type;
    body.gamePieceTeam = pieceData.team;

    // Add to physics world
    this.world.addBody(body);

    return body;
  }

  // Create static body for the game board
  createBoardBody(boardSize = 8, boardThickness = 0.1) {
    const shape = new CANNON.Box(
      new CANNON.Vec3(boardSize / 2, boardThickness / 2, boardSize / 2)
    );

    const body = new CANNON.Body({
      mass: 0, // Static body
      position: new CANNON.Vec3(0, -boardThickness / 2, 0),
      shape,
      material: new CANNON.Material('board')
    });

    this.world.addBody(body);
    return body;
  }

  // Apply launch force to a piece
  launchPiece(pieceBody, forceVector) {
    if (!pieceBody || pieceBody.type !== CANNON.Body.DYNAMIC) {
      return false;
    }

    // Apply impulse (instantaneous force)
    pieceBody.applyImpulse(
      new CANNON.Vec3(forceVector.x, forceVector.y, forceVector.z),
      pieceBody.position
    );

    return true;
  }

  // Apply special ability effects
  applyAbilityEffect(pieceBody, abilityType, params = {}) {
    switch (abilityType) {
      case 'charge_shot':
        // Already handled by increased force in launch
        break;

      case 'curve_shot':
        // Apply sideways force based on spin
        if (params.spin) {
          const spinForce = new CANNON.Vec3(
            params.spin.x * 0.5,
            params.spin.y * 0.5,
            params.spin.z * 0.5
          );
          pieceBody.applyImpulse(spinForce, pieceBody.position);
        }
        break;

      case 'pierce_shot':
        // Reduce mass temporarily for less collision resistance
        pieceBody.mass *= 0.7;
        // Restore mass after a short time (would be handled in game logic)
        break;

      case 'blast_shot':
        // Blast effect is handled on collision, not during launch
        break;

      default:
        console.warn(`Unknown ability type: ${abilityType}`);
        return false;
    }

    return true;
  }

  // Step the physics simulation
  step() {
    const startTime = performance.now();

    // Step the physics world
    this.world.step(this.timeStep, undefined, this.maxSubSteps);

    // Update stats
    this.stats.bodies = this.world.bodies.length;
    this.stats.stepTime = performance.now() - startTime;
  }

  // Process collisions and generate events
  processCollisions() {
    // Clear previous collision events
    this.collisionEvents = [];

    // Check for new contacts
    const contacts = this.world.contacts;
    if (!contacts || contacts.length === 0) return;

    contacts.forEach(contact => {
      const bodyA = contact.bi;
      const bodyB = contact.bj;

      // Skip if either body doesn't belong to a game piece
      if (!bodyA.gamePieceId || !bodyB.gamePieceId) {
        return;
      }

      // Skip if both pieces are on the same team (friendly fire handled differently)
      if (bodyA.gamePieceTeam === bodyB.gamePieceTeam) {
        return;
      }

      // Calculate collision impact
      const impactSpeed = Math.sqrt(
        Math.pow(contact.ri.x - contact.rj.x, 2) +
        Math.pow(contact.ri.y - contact.rj.y, 2) +
        Math.pow(contact.ri.z - contact.rj.z, 2)
      ) / this.timeStep;

      // Generate collision event
      this.collisionEvents.push({
        pieceIdA: bodyA.gamePieceId,
        pieceIdB: bodyB.gamePieceId,
        typeA: bodyA.gamePieceType,
        typeB: bodyB.gamePieceType,
        teamA: bodyA.gamePieceTeam,
        teamB: bodyB.gamePieceTeam,
        position: new CANNON.Vec3(
          contact.ri.x,
          contact.ri.y,
          contact.ri.z
        ),
        normal: new CANNON.Vec3(
          contact.ni.x,
          contact.ni.y,
          contact.ni.z
        ),
        impactSpeed,
        timestamp: Date.now()
      });

      this.stats.collisions++;
    });
  }

  // Get collision events since last call
  getCollisionEvents() {
    const events = [...this.collisionEvents];
    this.collisionEvents = [];
    return events;
  }

  // Get current state of all pieces
  getPieceStates() {
    const states = [];

    this.world.bodies.forEach(body => {
      if (body.gamePieceId) { // Only return game pieces
        states.push({
          id: body.gamePieceId,
          position: {
            x: body.position.x,
            y: body.position.y,
            z: body.position.z
          },
          velocity: {
            x: body.velocity.x,
            y: body.velocity.y,
            z: body.velocity.z
          },
          quaternion: {
            x: body.quaternion.x,
            y: body.quaternion.y,
            z: body.quaternion.z,
            w: body.quaternion.w
          },
          angularVelocity: {
            x: body.angularVelocity.x,
            y: body.angularVelocity.y,
            z: body.angularVelocity.z
          },
          awake: body.awake,
          gamePieceType: body.gamePieceType,
          gamePieceTeam: body.gamePieceTeam
        });
      }
    });

    return states;
  }

  // Remove a piece from physics simulation
  removePiece(pieceBody) {
    if (pieceBody && pieceBody.gamePieceId) {
      this.world.removeBody(pieceBody);
      return true;
    }
    return false;
  }

  // Get physics engine statistics
  getStats() {
    return { ...this.stats };
  }

  // Reset physics world (for new game)
  reset() {
    // Remove all bodies
    while (this.world.bodies.length > 0) {
      const body = this.world.bodies[0];
      this.world.removeBody(body);
    }

    // Reset collision events
    this.collisionEvents = [];

    // Reset stats
    this.stats = {
      bodies: 0,
      collisions: 0,
      stepTime: 0
    };
  }

  // Destroy physics engine and cleanup
  destroy() {
    this.reset();
    // In a more complete implementation, we would also remove event listeners
  }
}

module.exports = PhysicsEngine;