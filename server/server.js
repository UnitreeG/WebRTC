const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Add CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Store active rooms and connections
const rooms = new Map();
const peers = new Map();
const validationKeys = new Map();
const activeConnections = new Set();

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

// Message handler for data channel
function handleDataChannelMessage(message) {
    switch (message.type) {
        case 'validation':
            // Verify validation key
            if (message.data === validationKey) {
                return {
                    type: 'validation',
                    data: 'Validation Ok.'
                };
            }
            break;
            
        case 'RTC_INNER_REQ':
            switch (message.data.req_type) {
                case 'get_robot_info':
                    return {
                        type: 'RTC_REPORT',
                        data: {
                            req_type: 'get_robot_info',
                            info: {
                                model: 'G1',  // This should match your robot model
                                version: '1.0.0',  // Current firmware version
                                serialNumber: process.env.ROBOT_SERIAL || 'DEMO_UNIT',
                                capabilities: ['video', 'audio', 'data']
                            }
                        }
                    };
                case 'disable_traffic_saving':
                    // Handle traffic saving request
                    return {
                        type: 'RTC_REPORT',
                        data: {
                            req_type: 'disable_traffic_saving',
                            status: 'ok'
                        }
                    };
            }
            break;
    }
    
    // Default response for unhandled messages
    return {
        type: 'ERR',
        data: 'Unsupported message type'
    };
}

// WebRTC data channel setup
function setupDataChannel(channel) {
    channel.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            const response = handleDataChannelMessage(message);
            if (response) {
                channel.send(JSON.stringify(response));
            }
        } catch (error) {
            console.error('Error handling message:', error);
            channel.send(JSON.stringify({
                type: 'ERR',
                data: 'Invalid message format'
            }));
        }
    };
}

app.post('/webrtc/offer', async (req, res) => {
    console.log('Received WebRTC offer:', req.body);

    // Check if there's already an active connection
    if (activeConnections.size > 0) {
        console.log('Rejecting connection - another client is already connected');
        return res.json({
            sdp: "reject",
            type: "answer"
        });
    }

    // Generate validation key
    const validationKey = crypto.randomBytes(16).toString('hex');
    const connectionId = crypto.randomBytes(8).toString('hex');
    validationKeys.set(connectionId, validationKey);
    activeConnections.add(connectionId);

    // Create peer connection
    const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    // Create data channel
    const dataChannel = peerConnection.createDataChannel('data');
    setupDataChannel(dataChannel);

    // Create answer
    const answer = {
        type: "answer",
        sdp: `v=0
o=- ${Date.now()} 2 IN IP4 127.0.0.1
s=-
t=0 0
a=group:BUNDLE 0
a=msid-semantic: WMS
m=application 9 UDP/DTLS/SCTP webrtc-datachannel
c=IN IP4 0.0.0.0
a=ice-ufrag:${crypto.randomBytes(4).toString('hex')}
a=ice-pwd:${crypto.randomBytes(22).toString('base64')}
a=fingerprint:sha-256 ${crypto.randomBytes(32).toString('hex').match(/.{2}/g).join(':')}
a=setup:passive
a=mid:0
a=sctp-port:5000
a=max-message-size:262144`,
        validationKey: validationKey
    };

    res.json(answer);
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

server.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
}); 