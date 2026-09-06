# Archess - Production-Grade Python Game

A high-quality physics-based game built with production-grade Python engineering standards.

## Project Overview

Archess is a physics game where players launch pieces at each other, simulating combat with realistic physics, damage calculation, and game state management. Built following strict production-grade engineering standards including:

- Clean, idiomatic Python with type hints
- Proper separation of concerns (game rules, physics, combat, rendering)
- Comprehensive logging with correlation IDs
- Resource management and graceful shutdown
- Automated testing at unit, integration, and gameplay levels
- Configuration management
- Observability and diagnostics

## Project Structure

```
archess/
│
├── app/
│   ├── bootstrap/      # Application initialization and logging
│   ├── config          # Centralized configuration
│   ├── core            # Core game systems (game state, update tracking)
│   ├── game            # Game logic and rules
│   ├── physics         # Physics engine (independent of rendering)
│   ├── combat          # Combat and damage systems
│   ├── pieces          # Piece factory and management
│   ├── rendering       # Rendering system (placeholder)
│   ├── input           # Input handling (placeholder)
│   ├── audio           # Audio system (placeholder)
│   ├── ui              # User interface (placeholder)
│   ├── services        # Business services
│   └── infrastructure  # External services and utilities
│
├── tests/
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests
│   ├── gameplay/       # Gameplay-specific tests
│   └── e2e/            # End-to-end tests
│
├── assets/             # Game assets (images, sounds, etc.)
└── tools/              # Development tools and scripts
```

## Key Features

### Engineering Excellence
- **Type Safety**: Full type hinting throughout
- **Separation of Concerns**: Physics engine has zero dependencies on rendering or UI
- **Structured Logging**: Correlation IDs for tracking game sessions
- **Resource Management**: Proper lifecycles for all resources
- **Graceful Shutdown**: Handles SIGINT, SIGTERM, window close events
- **Defensive Programming**: Input validation and error handling throughout

### Game Systems
- **Physics Engine**: Realistic physics simulation with collision detection
- **Combat System**: Damage calculation based on impact velocity and piece types
- **Game State Management**: Turn-based gameplay with update tracking
- **Piece Factory**: Configurable piece creation with proper typing
- **Update Tracker**: Records important game state changes for debugging

### Testing
- **Unit Tests**: Testing individual components in isolation
- **Integration Tests**: Testing systems working together
- **Gameplay Tests**: Testing specific game mechanics
- **Automatic Test Generation**: Tests created alongside features

## Getting Started

### Prerequisites
- Python 3.12+
- pip (Python package installer)

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd archess

# Install dependencies (optional for basic functionality)
pip install -r requirements.txt
```

### Running Tests
```bash
# Run all tests
pytest

# Run unit tests only
pytest tests/unit/

# Run integration tests only
pytest tests/integration/

# Run tests with coverage
pytest --cov=archess tests/
```

### Running the Application
```bash
# Run the main application
python -m archess
```

## Architecture Principles

### Domain Separation
```
Domain/Game Rules
    ↓
Game State
    ↓
Physics Engine (independent)
    ↓
Combat System (independent)
    ↓
Application Services
    ↓
Rendering/UI (independent)
```

### Key Architectural Decisions
1. **Physics Independence**: Physics engine has no knowledge of pieces, game state, or rendering
2. **Combat Independence**: Combat system calculates damage without physics dependencies
3. **Configuration Centralization**: All configurable values in `app/config/`
4. **Structured Logging**: All logging includes correlation IDs and structured fields
5. **Resource Lifecycle**: Every resource has clear initialization and cleanup paths
6. **Update Tracking**: Important state changes are tracked for debugging and observability

## Development Guidelines

### Code Quality
- Follow PEP 8 and PEP 257
- Use type hints for all public APIs
- Keep functions and classes small and focused
- Prefer composition over inheritance
- Use dependency injection where appropriate

### Logging
- Use structured logging with correlation IDs
- Log meaningful events, not every frame
- Use appropriate log levels (DEBUG, INFO, WARNING, ERROR, CRITICAL)
- Include contextual fields in logs when useful

### Testing
- Write tests before or alongside implementation
- Test normal cases, edge cases, and error conditions
- Mock external dependencies in unit tests
- Make physics tests deterministic when possible

### Configuration
- Centralize all configurable values
- Use named constants instead of magic numbers
- Support different configurations for development/testing/production
- Never commit secrets or credentials

## Production Readiness

This implementation follows the production-grade standards outlined in the project documentation, including:

“…….”

## License

[License information would go here]

## Acknowledgments

[Any acknowledgments would go here]