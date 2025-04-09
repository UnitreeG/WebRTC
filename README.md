# WebRTC

## G1 WebRTC Observable Client

A modern WebRTC client implementation using Observable HQ's runtime, designed to work with the Go2 WebRTC API. This client provides a clean, intuitive interface for WebRTC connections and real-time communication.

## Project Structure

```
├── index.html        # Observable WebRTC client (served via GitHub Pages)
├── server/           # WebRTC server implementation
│   ├── package.json
│   └── server.js
└── go2_webrtc_connect/ # Reference implementation
```

## Features

- Modern, responsive UI
- WebRTC peer-to-peer connection
- Real-time data channel communication
- Connection status indicators
- Message history display
- Built with Observable's runtime

## Getting Started

### Running the Server

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

The server will run on `http://localhost:3000` by default.

### Using the Client

The client is hosted on GitHub Pages and can be accessed at [https://unitreeg.github.io/WebRTC/](https://unitreeg.github.io/WebRTC/)

To use the client:
1. Start the local server (see above)
2. Open the client in your web browser
3. Click "Connect" to establish a WebRTC connection
4. Once connected, use "Send Message" to test the data channel

## Development

### Client Development
- Edit `index.html` to modify the client
- Test locally by opening the file in a browser
- Push changes to GitHub to update the deployed version

### Server Development
- Edit files in the `server/` directory
- Restart the server to apply changes
- Test with the client

## Technical Details

- Uses Socket.IO for WebRTC signaling
- Implements STUN for NAT traversal
- Built on Observable's runtime for reactive programming
- Compatible with Go2 WebRTC API specification

## Reference Implementation

The `go2_webrtc_connect/` directory contains the reference implementation from which this client was derived. It provides examples and documentation for the full Go2 WebRTC API. 