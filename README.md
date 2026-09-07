# Physics-Based Chess Variant

A innovative chess variant where pieces are launched as projectiles with physics-based combat. Destroy the enemy king by reducing its HP to 0 through collisions and special abilities.

## Features

- **Physics-Based Combat**: Pieces have HP, mass, radius, and velocity vectors
- **Realistic Physics Engine**: Advanced rigid body dynamics with collision detection
- **Special Abilities**: Each piece type has unique abilities (charge shots, curve shots, piercing, blast, etc.)
- **Multiple Game Modes**: Standard, Timed, Points, Survivor, Assassin, King Protection
- **Real-Time Multiplayer**: Authoritative server architecture with Socket.IO
- **3D Visualization**: Stunning Three.js graphics with trajectory previews
- **Replay System**: Save, share, and analyze matches with multiple camera angles
- **Analytics & Statistics**: Track player performance and game metrics
- **Custom Variant Editor**: Create and share your own game variants
- **Tournament System**: Competitive play with brackets and leagues
- **Environmental Hazards**: Dynamic board elements affecting trajectories
- **Spectator Mode**: Watch live games with commentary tools

## Technology Stack

### Backend
- **Node.js** with Express and Socket.IO for real-time communication
- **cannon-es** for advanced physics simulation
- **PostgreSQL** for persistent data storage
- **Redis** for caching and real-time state sharing
- **Winston** for structured logging

### Frontend
- **React** for component-based UI
- **Three.js** for 3D rendering and physics visualization
- **Socket.IO Client** for real-time server communication
- **CSS3** with modern animations and responsive design

## Getting Started

### Prerequisites
- Node.js 18.x or higher
- PostgreSQL 13.x or higher
- Redis 6.x or higher
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/physics-chess-variant.git
cd physics-chess-variant
```

2. Install backend dependencies:
```bash
npm install
```

3. Install frontend dependencies:
```bash
cd client
npm install
cd ..
```

4. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. Initialize the database:
```bash
# Create database and run migrations
createdb chess_variant
npm run db:migrate
```

### Development

Start the development servers:

```bash
# Start backend server
npm run dev:server

# In another terminal, start frontend
npm run dev:client
```

### Production

Build and run for production:

```bash
# Build frontend
npm run build

# Start production server
npm start
```

## Game Modes

1. **Standard Mode**: Destroy the enemy king to win
2. **Timed Mode**: Most destruction wins when time runs out
3. **Points Mode**: First to N points wins
4. **Survivor Mode**: Last team with pieces remaining wins
5. **Assassin Mode**: Eliminate specific high-value pieces first
6. **King Protection**: Defend your king for N turns while attacking opponent's

## Piece Abilities

### Pawn
- **Swarm**: Launch 3 weaker shots in a spread pattern
- **Shield**: Temporary damage resistance for 5 seconds

### Knight
- **Jump Shot**: Ignore first collision, continue with reduced velocity
- **Teleport**: Short-range blink before launch

### Bishop
- **Piercing Shot**: Damage continues through pieces with reduction
- **Reflective Shot**: Bounce off pieces instead of stopping

### Rook
- **Blast Shot**: Area damage on impact in radius
- **Magnetic Shot**: Pull pieces toward impact point

### Queen
- **Hybrid Shot**: Combine two abilities of your choice
- **Cascade Shot**: Chain reaction between pieces

### King
- **Last Stand**: Enhanced abilities when HP < 30%
- **Guard Stance**: Reflect damage back to attacker

## API Endpoints

### Authentication
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Log in an existing user

### Game Management
- `POST /games` - Create a new game
- `PUT /games/:gameId/result` - Update game result

### Analytics
- `GET /analytics/game/:gameId` - Get analytics for a specific game
- `GET /analytics/user/:userId` - Get statistics for a specific user
- `GET /leaderboard` - Get global leaderboard

### Variants
- `GET /variants` - List available game variants
- `POST /variants` - Create a custom variant

## Project Structure

```
src/
├── server/
│   ├── index.js              # Server entry point
│   ├── api/                  # REST API routes
│   ├── game/                 # Game logic and state management
│   │   ├── state.js          # Game state class
│   │   └── rules/            # Game rules and win conditions
│   ├── network/              # Socket.IO connection handling
│   │   └── handlers.js       # Connection and event handlers
│   ├── physics/              # Physics engine and collision detection
│   │   ├── engine.js         # Core physics simulation
│   │   └── collision.js      # Collision detection and resolution
│   ├── pieces/               # Piece definitions and abilities
│   │   ├── abilities/        # Piece-specific ability implementations
│   │   └── base.js           # Base piece class
│   ├── services/             # Background services (analytics, matchmaking, etc.)
│   ├── storage/              # Data persistence (database, redis)
│   └── utils/                # Utility functions (logger, validation, etc.)
└── client/
    ├── src/
    │   ├── components/       # Reusable React components
    │   ├── scenes/           # Different application scenes (game, lobby, etc.)
    │   ├── hooks/            # Custom React hooks
    │   ├── lib/              # Utility libraries
    │   └── styles/           # CSS and styling
    └── public/               # Static assets
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by traditional chess and physics-based games
- Built with the cannon-es physics engine
- Uses React and Three.js for immersive 3D visualization
- Thanks to the open-source community for various libraries and tools