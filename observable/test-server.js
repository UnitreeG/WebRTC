const WebSocket = require('ws');
const server = new WebSocket.Server({ port: 8080 });

console.log('WebSocket server running on ws://localhost:8080');

server.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('Received:', data);
            
            // Echo back the message to simulate response
            ws.send(JSON.stringify({
                type: 'response',
                originalRequest: data,
                status: 'success'
            }));
        } catch (e) {
            console.error('Error processing message:', e);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
}); 