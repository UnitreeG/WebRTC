#!/usr/bin/env node

const { PeerServer } = require('peer');
const process = require('process');

// Parse command line arguments
const args = process.argv.slice(2);
let port = 3478;
let path = '/';
let key = 'peerjs';
let debug = false;

// Simple command line parsing
for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' && i + 1 < args.length) {
        port = parseInt(args[i + 1], 10);
        i++;
    } else if (args[i] === '--path' && i + 1 < args.length) {
        path = args[i + 1];
        i++;
    } else if (args[i] === '--key' && i + 1 < args.length) {
        key = args[i + 1];
        i++;
    } else if (args[i] === '--debug') {
        debug = true;
    } else if (args[i] === '--help' || args[i] === '-h') {
        console.log('PeerJS Server - Simple WebRTC Signaling Server');
        console.log('');
        console.log('Options:');
        console.log('  --port PORT      Port to listen on (default: 3478)');
        console.log('  --path PATH      Path for the PeerJS server (default: /)');
        console.log('  --key KEY        API key for the server (default: peerjs)');
        console.log('  --debug          Enable debug mode');
        console.log('  --help, -h       Show this help message');
        process.exit(0);
    }
}

// Create PeerJS server
const server = PeerServer({
    port: port,
    path: path,
    key: key,
    debug: debug,
});

// Log successful start
console.log(`PeerJS server running on port ${port}`);
console.log(`Server path: ${path}`);
console.log(`API key: ${key}`);
console.log(`Debug mode: ${debug ? 'enabled' : 'disabled'}`);
console.log('Press Ctrl+C to stop the server');

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down PeerJS server...');
    server.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Shutting down PeerJS server...');
    server.close();
    process.exit(0);
}); 