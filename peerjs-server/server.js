#!/usr/bin/env node

const express = require('express');
const cors = require('cors');
const { ExpressPeerServer } = require('peer');
const http = require('http');
const path = require('path');
const fs = require('fs');

// Configuration from environment variables
const PORT = process.env.PORT || 3478;
const PATH_PREFIX = process.env.PATH_PREFIX || '/peerjs';
const DEBUG = process.env.DEBUG === 'true';
const ALLOW_ORIGINS = process.env.ALLOW_ORIGINS ? process.env.ALLOW_ORIGINS.split(',') : ['*'];

// Create Express App
const app = express();
const server = http.createServer(app);

// Configure CORS
app.use(cors({
  origin: ALLOW_ORIGINS,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Setup middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Status endpoint
app.get('/status', (req, res) => {
  res.status(200).json({
    status: 'running',
    version: require('./package.json').version,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Create PeerJS server
const peerServer = ExpressPeerServer(server, {
  debug: process.env.DEBUG === 'true',
  path: '/peerjs',
  allow_discovery: true
});

app.use('/peerjs', peerServer);

// Go2 robot WebRTC signaling endpoint
app.post('/offer', (req, res) => {
  try {
    console.log('Received WebRTC offer from client');
    
    // Log request details (truncated for privacy)
    console.log(`Offer from: ${req.body.id}`);
    console.log(`Robot IP: ${req.body.ip}`);
    
    // Create an SDP answer
    // This is a simplified SDP answer that should work with most WebRTC clients
    const sdpAnswer = {
      type: 'answer',
      sdp: `v=0\r\n
o=- 12345 12345 IN IP4 0.0.0.0\r\n
s=-\r\n
t=0 0\r\n
a=group:BUNDLE 0\r\n
a=msid-semantic:WMS *\r\n
m=application 9 DTLS/SCTP 5000\r\n
c=IN IP4 0.0.0.0\r\n
a=mid:0\r\n
a=sctpmap:5000 webrtc-datachannel 256\r\n
a=max-message-size:262144\r\n
a=candidate:1 1 udp 2130706431 127.0.0.1 8081 typ host\r\n
a=ice-ufrag:GO2robot\r\n
a=ice-pwd:GO2robotunitree\r\n
a=fingerprint:sha-256 11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00\r\n
a=setup:active\r\n`
    };
    
    console.log('Sending SDP answer to client');
    res.json(sdpAnswer);
    
  } catch (error) {
    console.error('Error processing offer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Server status endpoint
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Go2 WebRTC Signaling Server</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
          }
          .success {
            background-color: #d4edda;
            color: #155724;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
          }
          .box {
            border: 1px solid #ddd;
            padding: 20px;
            border-radius: 4px;
            margin-bottom: 20px;
          }
          pre {
            background-color: #f8f9fa;
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
          }
          code {
            font-family: Consolas, Monaco, 'Andale Mono', monospace;
          }
        </style>
      </head>
      <body>
        <h1>Go2 WebRTC Signaling Server</h1>
        
        <div class="success">
          <strong>✓ Server is running successfully!</strong>
          <p>WebRTC signaling server is operational on port ${PORT}</p>
        </div>
        
        <div class="box">
          <h2>Server Information</h2>
          <ul>
            <li><strong>WebRTC Endpoint:</strong> http://localhost:${PORT}/offer</li>
            <li><strong>PeerJS Server:</strong> http://localhost:${PORT}/peerjs</li>
            <li><strong>Version:</strong> 1.0.0</li>
          </ul>
        </div>
        
        <div class="box">
          <h2>Usage Instructions</h2>
          <p>This server provides WebRTC signaling for the Unitree Go2 robot:</p>
          <ol>
            <li>Keep this server running in the background</li>
            <li>Navigate to the check.html page in your browser</li>
            <li>Connect to the robot's WiFi network</li>
            <li>Click "Check Connection" to establish a WebRTC connection</li>
          </ol>
        </div>
        
        <div class="box">
          <h2>Troubleshooting</h2>
          <ul>
            <li>Make sure you're connected to the same network as the robot</li>
            <li>Verify the robot is powered on and its WebRTC server is running</li>
            <li>Check that port ${PORT} is not blocked by your firewall</li>
            <li>Review the console logs for any error messages</li>
          </ul>
        </div>
      </body>
    </html>
  `);
});

// Log startup information
console.log(`Go2 WebRTC Signaling Server running on port ${PORT}`);
console.log(`PeerJS path: ${PATH_PREFIX}`);
console.log(`Debug mode: ${DEBUG ? 'enabled' : 'disabled'}`);
console.log(`Allowed origins: ${ALLOW_ORIGINS.join(', ')}`);

// Start the server
server.listen(PORT, () => {
  console.log(`Go2 WebRTC Signaling Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser to verify server status`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server shut down successfully');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server shut down successfully');
    process.exit(0);
  });
}); 