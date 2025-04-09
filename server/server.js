const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate } = require('node-webrtc');

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
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      });

      // Store the connection
      connections.set(socket.id, peerConnection);

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', event.candidate);
        }
      };

      // Handle data channels
      peerConnection.ondatachannel = (event) => {
        console.log('Data channel received');
        const channel = event.channel;
        
        channel.onmessage = (event) => {
          console.log('Received message:', event.data);
          // Echo back the message
          channel.send(`Server received: ${event.data}`);
        };
      };

      // Set the remote description
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

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
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
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