const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const wrtc = require('webrtc');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Store active connections
const connections = new Map();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('offer', async (offer) => {
    try {
      const peerConnection = new wrtc.RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      });

      // Store the connection
      connections.set(socket.id, peerConnection);

      // Handle ICE candidates
      peerConnection.on('icecandidate', (candidate) => {
        socket.emit('ice-candidate', candidate);
      });

      // Handle data channels
      peerConnection.on('datachannel', (channel) => {
        console.log('Data channel received');
        
        channel.on('message', (message) => {
          console.log('Received message:', message);
          // Echo back the message
          channel.send(`Server received: ${message}`);
        });
      });

      // Set the remote description
      await peerConnection.setRemoteDescription(offer);

      // Create and send answer
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit('answer', answer);

    } catch (error) {
      console.error('Error handling offer:', error);
    }
  });

  socket.on('ice-candidate', async (candidate) => {
    try {
      const peerConnection = connections.get(socket.id);
      if (peerConnection) {
        await peerConnection.addIceCandidate(candidate);
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    const peerConnection = connections.get(socket.id);
    if (peerConnection) {
      peerConnection.close();
      connections.delete(socket.id);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 