const WebSocket = require('ws');
const { spawn } = require('child_process');
const path = require('path');

const server = new WebSocket.Server({ port: 8080 });

console.log('WebSocket server running on ws://localhost:8080');

// Store robot connection
let robotProcess = null;

function startRobotConnection(config) {
  const scriptPath = path.join(__dirname, 'go2_webrtc_connect/examples/data_channel/vui/vui.py');
  
  // Kill any existing process
  if (robotProcess) {
    robotProcess.kill();
  }

  // Start new Python process
  robotProcess = spawn('python3', [scriptPath], {
    env: {
      ...process.env,
      ROBOT_IP: config.ip || '192.168.8.181',
      ROBOT_SERIAL: config.serialNumber,
      CONNECTION_METHOD: config.method || 'LocalSTA'
    }
  });

  // Handle process output
  robotProcess.stdout.on('data', (data) => {
    console.log(`Robot output: ${data}`);
    // Broadcast to all connected clients
    server.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'robot_log',
          data: data.toString()
        }));
      }
    });
  });

  robotProcess.stderr.on('data', (data) => {
    console.error(`Robot error: ${data}`);
    // Broadcast errors to clients
    server.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'robot_error',
          data: data.toString()
        }));
      }
    });
  });
}

server.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received:', data);

      switch (data.type) {
        case 'CONNECT':
          // Start robot connection with provided config
          startRobotConnection(data.config);
          ws.send(JSON.stringify({
            type: 'response',
            status: 'success',
            message: 'Robot connection initiated'
          }));
          break;

        case 'VID':
          // Handle video control
          if (robotProcess) {
            robotProcess.stdin.write(JSON.stringify({
              api_id: 1007,
              parameter: {
                color: data.enabled ? 'CYAN' : 'OFF',
                time: 1
              }
            }) + '\n');
          }
          break;

        case 'AUD':
          // Handle audio control
          if (robotProcess) {
            robotProcess.stdin.write(JSON.stringify({
              api_id: 1003,
              parameter: {
                volume: data.enabled ? 10 : 0
              }
            }) + '\n');
          }
          break;

        case 'RTC_INNER_REQ':
          // Handle traffic saving
          if (robotProcess) {
            // Map to appropriate robot command
            robotProcess.stdin.write(JSON.stringify({
              api_id: 1005,
              parameter: {
                brightness: data.data.instruction === 'on' ? 10 : 5
              }
            }) + '\n');
          }
          break;

        default:
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Unknown command'
          }));
      }
    } catch (e) {
      console.error('Error processing message:', e);
      ws.send(JSON.stringify({
        type: 'error',
        message: e.message
      }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    // Optionally kill robot connection when all clients disconnect
    if (server.clients.size === 0 && robotProcess) {
      robotProcess.kill();
      robotProcess = null;
    }
  });
}); 