// Socket.IO Connection Handlers
// Manages client connections, room management, and game events

const GameState = require('../game/state');

class NetworkHandlers {
  constructor(io) {
    this.io = io;
    this.rooms = new Map(); // roomId => { gameState, players, sockets }
    this.playerSockets = new Map(); // socketId => { roomId, playerId, team }

    // Set up connection handler
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });
  }

  handleConnection(socket) {
    console.log(`Client connected: ${socket.id}`);

    // Handle joining a room
    socket.on('joinRoom', (data, callback) => {
      this.handleJoinRoom(socket, data, callback);
    });

    // Handle leaving a room
    socket.on('leaveRoom', (data) => {
      this.handleLeaveRoom(socket, data);
    });

    // Handle piece selection
    socket.on('selectPiece', (data, callback) => {
      this.handleSelectPiece(socket, data, callback);
    });

    // Handle piece launch
    socket.on('launchPiece', (data, callback) => {
      this.handleLaunchPiece(socket, data, callback);
    });

    // Handle ability activation
    socket.on('activateAbility', (data, callback) => {
      this.handleActivateAbility(socket, data, callback);
    });

    // Handle chat messages
    socket.on('chatMessage', (data) => {
      this.handleChatMessage(socket, data);
    });

    // Handle ready signal
    socket.on('playerReady', (data, callback) => {
      this.handlePlayerReady(socket, data, callback);
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      this.handleDisconnect(socket, reason);
    });

    // Handle ping for latency measurement
    socket.on('ping', (data, callback) => {
      if (callback) callback({ timestamp: Date.now(), latency: Date.now() - data.timestamp });
    });
  }

  handleJoinRoom(socket, data, callback) {
    const { roomId, playerData } = data;

    // Validate input
    if (!roomId) {
      return callback({ success: false, error: 'Room ID is required' });
    }

    // Get or create room
    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        gameState: new GameState(),
        players: new Map(), // playerId => { socketId, team, username, ready }
        sockets: new Set(), // socketIds in this room
        createdAt: Date.now()
      };
      this.rooms.set(roomId, room);
    }

    // Generate player ID
    const playerId = `${roomId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Assign team based on current balance
    const whiteCount = Array.from(room.players.values()).filter(p => p.team === 'white').length;
    const blackCount = Array.from(room.players.values()).filter(p => p.team === 'black').length;
    const team = whiteCount <= blackCount ? 'white' : 'black';

    // Add player to room
    room.players.set(playerId, {
      socketId: socket.id,
      team,
      username: playerData.username || 'Anonymous',
      ready: false
    });

    room.sockets.add(socket.id);

    // Track player socket
    this.playerSockets.set(socket.id, {
      roomId,
      playerId,
      team
    });

    // Join the Socket.IO room
    socket.join(roomId);

    // Initialize player in game state if not already present
    // (Pieces are created during game state initialization)

    // Send success response with player info
    callback({
      success: true,
      playerId,
      team,
      gameState: room.gameState.getStateForClient()
    });

    // Notify room members of new player
    this.io.to(roomId).emit('playerJoined', {
      playerId,
      team: room.players.get(playerId).team,
      username: room.players.get(playerId).username,
      playerCount: room.players.size
    });

    console.log(`Player ${playerId} joined room ${roomId} as ${team}`);
  }

  handleLeaveRoom(socket, data) {
    const { roomId } = data;
    const playerInfo = this.playerSockets.get(socket.id);

    if (!playerInfo || playerInfo.roomId !== roomId) {
      return;
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      return;
    }

    // Remove player from room
    const playerId = playerInfo.playerId;
    room.players.delete(playerId);
    room.sockets.delete(socket.id);

    // Leave Socket.IO room
    socket.leave(roomId);

    // Clean up player socket tracking
    this.playerSockets.delete(socket.id);

    // If room is empty, clean it up
    if (room.players.size === 0) {
      room.gameState.destroy();
      this.rooms.delete(roomId);
      console.log(`Room ${roomId} removed (empty)`);
    } else {
      // Notify room members of player leaving
      this.io.to(roomId).emit('playerLeft', {
        playerId,
        username: playerInfo.username || 'Unknown',
        playerCount: room.players.size
      });
    }

    console.log(`Player ${playerId} left room ${roomId}`);
  }

  handleSelectPiece(socket, data, callback) {
    const { pieceId } = data;
    const playerInfo = this.playerSockets.get(socket.id);

    if (!playerInfo) {
      return callback({ success: false, error: 'Player not in a room' });
    }

    const room = this.rooms.get(playerInfo.roomId);
    if (!room) {
      return callback({ success: false, error: 'Room not found' });
    }

    // Check if it's the player's turn
    if (room.gameState.currentTurn !== playerInfo.team) {
      return callback({ success: false, error: 'Not your turn' });
    }

    // Select the piece
    const success = room.gameState.selectPiece(pieceId);

    if (success) {
      // Notify room of piece selection
      this.io.to(playerInfo.roomId).emit('pieceSelected', {
        pieceId,
        playerId: playerInfo.playerId,
        team: playerInfo.team
      });

      callback({ success: true });
    } else {
      callback({ success: false, error: 'Cannot select piece' });
    }
  }

  handleLaunchPiece(socket, data, callback) {
    const { pieceId, forceData } = data;
    const playerInfo = this.playerSockets.get(socket.id);

    if (!playerInfo) {
      return callback({ success: false, error: 'Player not in a room' });
    }

    const room = this.rooms.get(playerInfo.roomId);
    if (!room) {
      return callback({ success: false, error: 'Room not found' });
    }

    // Validate launch
    const piece = room.gameState.pieces.find(p => p.id === pieceId);
    if (!piece) {
      return callback({ success: false, error: 'Piece not found' });
    }

    if (!piece.alive) {
      return callback({ success: false, error: 'Piece is destroyed' });
    }

    if (piece.team !== playerInfo.team) {
      return callback({ success: false, error: 'Not your piece' });
    }

    if (room.gameState.currentTurn !== playerInfo.team) {
      return callback({ success: false, error: 'Not your turn' });
    }

    // Launch the piece
    const launchSuccess = room.gameState.launchPiece(pieceId, forceData);

    if (launchSuccess) {
      // Notify room of launch
      this.io.to(playerInfo.roomId).emit('pieceLaunched', {
        pieceId,
        forceData,
        playerId: playerInfo.playerId,
        team: playerInfo.team
      });

      // Switch turn after successful launch
      room.gameState.currentTurn =
        room.gameState.currentTurn === 'white' ? 'black' : 'white';

      // Broadcast updated game state
      this.broadcastGameState(roomId);

      callback({ success: true });
    } else {
      callback({ success: false, error: 'Launch failed' });
    }
  }

  handleActivateAbility(socket, data, callback) {
    const { abilityType } = data;
    const playerInfo = this.playerSockets.get(socket.id);

    if (!playerInfo) {
      return callback({ success: false, error: 'Player not in a room' });
    }

    const room = this.rooms.get(playerInfo.roomId);
    if (!room) {
      return callback({ success: false, error: 'Room not found' });
    }

    // Get selected piece
    const selectedPiece = room.gameState.getSelectedPiece();
    if (!selectedPiece) {
      return callback({ success: false, error: 'No piece selected' });
    }

    if (selectedPiece.team !== playerInfo.team) {
      return callback({ success: false, error: 'Not your piece' });
    }

    if (room.gameState.currentTurn !== playerInfo.team) {
      return callback({ success: false, error: 'Not your turn' });
    }

    // Check if piece has this ability (simplified)
    // In a full implementation, we would check the piece's available abilities
    const abilityAvailable = true; // Placeholder

    if (!abilityAvailable) {
      return callback({ success: false, error: 'Ability not available' });
    }

    // Activate ability (would modify piece state for next launch)
    // For now, just acknowledge
    callback({ success: true, message: `Ability ${abilityType} activated` });

    // Notify room
    this.io.to(playerInfo.roomId).emit('abilityActivated', {
      pieceId: selectedPiece.id,
      abilityType,
      playerId: playerInfo.playerId
    });
  }

  handleChatMessage(socket, data) {
    const { message } = data;
    const playerInfo = this.playerSockets.get(socket.id);

    if (!playerInfo || !message.trim()) {
      return;
    }

    const room = this.rooms.get(playerInfo.roomId);
    if (!room) {
      return;
    }

    // Broadcast chat message to room
    this.io.to(playerInfo.roomId).emit('chatMessage', {
      playerId: playerInfo.playerId,
      username: playerInfo.username,
      team: playerInfo.team,
      message: message.trim(),
      timestamp: Date.now()
    });
  }

  handlePlayerReady(socket, data, callback) {
    const playerInfo = this.playerSockets.get(socket.id);

    if (!playerInfo) {
      return callback({ success: false, error: 'Player not in a room' });
    }

    const room = this.rooms.get(playerInfo.roomId);
    if (!room) {
      return callback({ success: false, error: 'Room not found' });
    }

    // Update player ready status
    const player = room.players.get(playerInfo.playerId);
    if (player) {
      player.ready = true;

      // Check if all players are ready
      const allReady = Array.from(room.players.values()).every(p => p.ready);

      if (allReady && room.players.size >= 2) {
        // Start the game
        this.io.to(playerInfo.roomId).emit('gameStart', {
          gameState: room.gameState.getStateForClient()
        });
      }
    }

    callback({ success: true });
  }

  handleDisconnect(socket, reason) {
    console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
    const playerInfo = this.playerSockets.get(socket.id);

    if (playerInfo) {
      // Treat as leaving the room
      this.handleLeaveRoom(socket, { roomId: playerInfo.roomId });
    }
  }

  // Broadcast game state to all clients in a room
  broadcastGameState(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const state = room.gameState.getStateForClient();
    this.io.to(roomId).emit('gameStateUpdate', state);
  }

  // Get room info for debugging
  getRoomInfo(roomId) {
    return this.rooms.get(roomId);
  }

  // Get all rooms
  getAllRooms() {
    return Array.from(this.rooms.entries()).map(([roomId, room]) => ({
      roomId,
      playerCount: room.players.size,
      createdAt: room.createdAt,
      gameOver: room.gameState.gameOver
    }));
  }

  // Cleanup empty rooms (call periodically)
  cleanupEmptyRooms(maxAgeMs = 3600000) { // 1 hour
    const now = Date.now();
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.players.size === 0 && (now - room.createdAt) > maxAgeMs) {
        room.gameState.destroy();
        this.rooms.delete(roomId);
        console.log(`Cleaned up empty room ${roomId}`);
      }
    }
  }
}

module.exports = NetworkHandlers;