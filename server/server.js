const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Store active rooms and connections
const rooms = new Map();
const peers = new Map();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Handle room joining
  socket.on('join', (roomId) => {
    console.log(`Client ${socket.id} joining room ${roomId}`);
    
    // Create room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    
    // Add peer to room
    const room = rooms.get(roomId);
    room.add(socket.id);
    socket.join(roomId);

    // Store peer info
    peers.set(socket.id, {
      roomId,
      offers: new Map(),
      candidates: new Map()
    });

    // Notify other peers in the room
    socket.to(roomId).emit('peer-joined', socket.id);
    
    // Send list of existing peers to the new peer
    const existingPeers = Array.from(room).filter(id => id !== socket.id);
    socket.emit('room-peers', existingPeers);
  });

  // Handle WebRTC signaling
  socket.on('offer', (data) => {
    const { targetId, offer } = data;
    console.log(`Received offer from ${socket.id} to ${targetId}`);
    
    const peer = peers.get(socket.id);
    if (peer) {
      // Store the offer
      peer.offers.set(targetId, offer);
      
      // Forward the offer to the target peer
      socket.to(targetId).emit('offer', {
        sourceId: socket.id,
        offer: offer
      });
    }
  });

  socket.on('answer', (data) => {
    const { targetId, answer } = data;
    console.log(`Received answer from ${socket.id} to ${targetId}`);
    
    // Forward the answer to the target peer
    socket.to(targetId).emit('answer', {
      sourceId: socket.id,
      answer: answer
    });
  });

  socket.on('ice-candidate', (data) => {
    const { targetId, candidate } = data;
    console.log(`Received ICE candidate from ${socket.id} to ${targetId}`);
    
    const peer = peers.get(socket.id);
    if (peer) {
      // Store the candidate
      if (!peer.candidates.has(targetId)) {
        peer.candidates.set(targetId, []);
      }
      peer.candidates.get(targetId).push(candidate);
      
      // Forward the candidate to the target peer
      socket.to(targetId).emit('ice-candidate', {
        sourceId: socket.id,
        candidate: candidate
      });
    }
  });

  // Handle data channel messages
  socket.on('message', (data) => {
    const { targetId, message } = data;
    console.log(`Received message from ${socket.id} to ${targetId}: ${message}`);
    
    // Forward the message to the target peer
    socket.to(targetId).emit('message', {
      sourceId: socket.id,
      message: message
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Get peer info
    const peer = peers.get(socket.id);
    if (peer) {
      const { roomId } = peer;
      
      // Remove from room
      const room = rooms.get(roomId);
      if (room) {
        room.delete(socket.id);
        if (room.size === 0) {
          rooms.delete(roomId);
        }
      }
      
      // Notify other peers in the room
      socket.to(roomId).emit('peer-left', socket.id);
      
      // Clean up peer data
      peers.delete(socket.id);
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
}); 