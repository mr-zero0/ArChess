# AI Opponent Implementation for Archess

## Overview
This implementation adds a computer-controlled AI opponent for single-player gameplay in the Archess game. The AI controls Player 1 (the right side) while the human player controls Player 0 (the left side).

## Files Modified/Added

### 1. New File: `src/archess/app/ai_controller.py`
- Contains the `AIController` class that handles computer player decision making
- Includes configurable AI behavior through `AIConfig` class
- Implements turn-based AI actions with thinking delays
- Features simple AI strategy for piece selection and launching

### 2. Modified File: `src/archess/app/bootstrap/app.py`
- Added import for `AIController` and `AIConfig`
- Initializes AI controller for Player 1 during application startup
- Updates AI controller each frame in the main game loop
- Cleans up AI controller resources during shutdown

## AI Controller Features

### Configuration (`AIConfig`)
- `difficulty`: AI difficulty level (easy, medium, hard)
- `reaction_time`: Seconds to "think" before making a move
- `aggression`: AI aggression level (0.0 passive to 1.0 aggressive)
- `smart_launching`: Whether to use strategy or random piece selection

### Decision Making
1. **Turn Checking**: AI only acts when it's its turn, game is running, and in piece selection phase
2. **Thinking Delay**: AI waits for configured reaction time before making decisions
3. **Piece Selection**: 
   - In smart mode: Evaluates pieces based on HP, type, and randomness
   - Prefers launching weaker pieces first (lower HP)
   - Piece type preferences: Giant > Archer > Pawn > Knight > King
4. **Launch Parameters**:
   - Direction: Based on player ID (Player 0→right, Player 1→left)
   - Speed: Base speed with random variation
   - Vertical/Z variation: Based on aggression setting

### Integration
- AI controller runs every frame in the game loop
- Directly modifies piece velocity and updates game state statistics
- Records launch events for replay/debugging purposes
- Properly initializes and cleans up resources

## Game Flow
1. Game starts with Player 0 (human) and Player 1 (AI)
2. Human player takes turn first (Player 0)
3. When human player ends turn, game automatically switches to Player 1 (AI)
4. AI controller detects it's AI's turn and begins "thinking"
5. After reaction delay, AI selects a piece and launches it
6. Turn ends normally via game state mechanisms
7. Process repeats with human player's turn

## Configuration Used
- Difficulty: Medium
- Reaction Time: 1.5 seconds
- Aggression: 0.6 (moderately aggressive)
- Smart Launching: Enabled

## Testing
A basic test script (`test_ai_controller.py`) is included to verify:
- AI controller initialization
- Turn-based operation
- Piece launching functionality
- Proper cleanup

## Future Enhancements
- More sophisticated AI strategies (defensive play, targeting specific pieces)
- Difficulty levels that affect decision-making accuracy
- AI personality traits (aggressive, defensive, opportunistic)
- Visual indicators showing when it's AI's turn
- AI move preview or telegraphing