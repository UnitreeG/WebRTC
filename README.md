# Observable WebRTC Client with Go2 API Server

This project implements a WebRTC client using Observable and a server that implements the Go2 WebRTC API. The client can be served via GitHub Pages, while the server runs locally for development.

## Project Structure

```
observable-webrtc/
├── server/           # WebRTC server implementation
│   ├── package.json
│   └── server.js
└── client/          # Observable client
    └── index.html
```

## Setup

### Server Setup

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

### Client Setup

The client is a static HTML file that can be served via GitHub Pages. To deploy:

1. Create a new GitHub repository
2. Push the contents of the `client` directory to the repository
3. Enable GitHub Pages in the repository settings
4. Set the source to the main branch

## Usage

1. Start the server locally
2. Open the client in a web browser (either locally or via GitHub Pages)
3. Click the "Connect" button to establish a WebRTC connection
4. Once connected, you can send messages using the "Send Message" button

## Features

- WebRTC peer-to-peer connection
- Real-time data channel communication
- Connection status indicators
- Message history display
- Simple and intuitive UI

## Development

To modify the client:
1. Edit the `client/index.html` file
2. Test locally by opening the file in a browser
3. Push changes to GitHub to update the deployed version

To modify the server:
1. Edit the `server/server.js` file
2. Restart the server to apply changes
3. Test with the client

## Notes

- The server uses Socket.IO for signaling
- STUN servers are used for NAT traversal
- The client is built with Observable's runtime
- The server implements basic WebRTC functionality similar to the Go2 API 