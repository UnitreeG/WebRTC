// Title: G1 WebRTC Observable Client
// Author: @dcmcshan

import {html} from "https://cdn.jsdelivr.net/npm/@observablehq/stdlib@5/dist/stdlib.js";

// Define styles
styles = html`<style>
.webrtc-container {
  font-family: -apple-system, system-ui, sans-serif;
  padding: 1em;
}
.controls {
  display: flex;
  gap: 0.5em;
  margin-bottom: 1em;
}
button {
  padding: 0.5em 1em;
  border: none;
  border-radius: 4px;
  background: #3b82f6;
  color: white;
  cursor: pointer;
}
button:disabled {
  background: #9ca3af;
}
#status {
  padding: 0.5em;
  margin-bottom: 1em;
  border-radius: 4px;
  text-align: center;
}
.connected {
  background: #dcfce7;
  color: #166534;
}
.disconnected {
  background: #fee2e2;
  color: #991b1b;
}
.log {
  height: 200px;
  overflow-y: auto;
  padding: 0.5em;
  background: #1f2937;
  color: #f9fafb;
  border-radius: 4px;
  font-family: Monaco, monospace;
  font-size: 0.9em;
  white-space: pre-wrap;
}
</style>`

// Configuration
const config = {
  serverUrl: 'http://192.168.8.181',  // Robot's IP address
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
};

// State management
let state = {
  peerConnection: null,
  dataChannel: null
};

// Create the main view
function createView() {
  return html`
    <style>
      .webrtc-container {
        font-family: -apple-system, system-ui, sans-serif;
        padding: 1em;
      }
      #status {
        padding: 0.5em;
        margin-bottom: 1em;
        border-radius: 4px;
        text-align: center;
      }
      .connected {
        background: #dcfce7;
        color: #166534;
      }
      .disconnected {
        background: #fee2e2;
        color: #991b1b;
      }
      #log {
        height: 200px;
        overflow-y: auto;
        padding: 0.5em;
        background: #1f2937;
        color: #f9fafb;
        border-radius: 4px;
        font-family: Monaco, monospace;
        font-size: 0.9em;
        white-space: pre-wrap;
      }
    </style>
    <div class="webrtc-container">
      <div id="status" class="disconnected">Disconnected</div>
      <div id="log"></div>
    </div>
  `;
}

function logMessage(msg, type = 'info') {
  const entry = document.createElement('div');
  entry.textContent = `${new Date().toLocaleTimeString()} [${type}] ${msg}`;
  document.querySelector('#log').appendChild(entry);
  const log = document.querySelector('#log');
  log.scrollTop = log.scrollHeight;
}

// Override console methods to capture logs
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn
};

console.log = function(...args) {
  logMessage(args.join(' '), 'log');
  originalConsole.log.apply(console, args);
};

console.error = function(...args) {
  logMessage(args.join(' '), 'error');
  originalConsole.error.apply(console, args);
};

console.warn = function(...args) {
  logMessage(args.join(' '), 'warn');
  originalConsole.warn.apply(console, args);
};

// Add global error handler
window.onerror = function(message, source, lineno, colno, error) {
  logMessage(`Error: ${message}\nAt: ${source}:${lineno}:${colno}`, 'error');
  return false;
};

// Add unhandled promise rejection handler
window.onunhandledrejection = function(event) {
  logMessage(`Unhandled Promise Rejection: ${event.reason}`, 'error');
};

// Setup data channel handlers
const setupDataChannel = function(channel) {
  channel.onopen = function() {
    logMessage('Data channel opened');
    
    // Send validation message
    const validationMsg = {
      type: 'validation',
      data: channel.validationKey
    };
    channel.send(JSON.stringify(validationMsg));
  };

  channel.onclose = function() {
    logMessage('Data channel closed');
    document.querySelector('#status').textContent = 'Disconnected';
    document.querySelector('#status').className = 'disconnected';
  };

  channel.onmessage = function(event) {
    const message = JSON.parse(event.data);
    
    if (message.type === 'validation') {
      if (message.data === 'Validation Ok.') {
        logMessage('Connection validated successfully');
        document.querySelector('#status').textContent = 'Connected';
        document.querySelector('#status').className = 'connected';
        
        // Query robot info after successful validation
        sendRobotInfoRequest();
      } else {
        logMessage('Validation failed', 'error');
        channel.close();
      }
    } else if (message.type === 'RTC_REPORT' && message.data.req_type === 'get_robot_info') {
      const info = message.data.info;
      logMessage('Connected to ' + info.model + ' (Version: ' + info.version + ')');
      document.querySelector('#status').textContent = 'Connected to ' + info.model;
    } else {
      logMessage('Received: ' + JSON.stringify(message));
    }
  };
};

function sendRobotInfoRequest() {
  if (!state.dataChannel) return;
  const msg = {
    type: 'RTC_INNER_REQ',
    data: {
      req_type: 'get_robot_info'
    }
  };
  state.dataChannel.send(JSON.stringify(msg));
}

// WebRTC interface
const webrtc = {
  async connect() {
    try {
      logMessage('Connecting to robot...', 'info');
      
      const response = await fetch(`${config.serverUrl}/webrtc/offer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'offer',
          sdp: 'v=0\r\no=- ' + Date.now() + ' 2 IN IP4 127.0.0.1\r\n' +
               's=-\r\nt=0 0\r\na=group:BUNDLE 0\r\n' +
               'a=msid-semantic: WMS\r\n' +
               'm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n' +
               'c=IN IP4 0.0.0.0\r\n' +
               'a=ice-ufrag:' + Math.random().toString(36).substr(2, 4) + '\r\n' +
               'a=ice-pwd:' + Math.random().toString(36).substr(2, 24) + '\r\n' +
               'a=fingerprint:sha-256 ' + Array.from({length: 32}, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join(':') + '\r\n' +
               'a=setup:actpass\r\n' +
               'a=mid:0\r\n' +
               'a=sctp-port:5000\r\n' +
               'a=max-message-size:262144\r\n'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.sdp === 'reject') {
        throw new Error('Connection rejected - another client is already connected');
      }

      state.peerConnection = new RTCPeerConnection({ iceServers: config.iceServers });

      // Set up ICE candidate handling
      state.peerConnection.onicecandidate = event => {
        if (event.candidate) {
          fetch(`${config.serverUrl}/webrtc/candidate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              candidate: event.candidate
            })
          }).catch(error => {
            logMessage(`Failed to send ICE candidate: ${error.message}`, 'error');
          });
        }
      };

      state.dataChannel = state.peerConnection.createDataChannel('data');
      state.dataChannel.validationKey = data.validationKey;
      setupDataChannel(state.dataChannel);

      await state.peerConnection.setRemoteDescription(new RTCSessionDescription(data));
      const offer = await state.peerConnection.createOffer();
      await state.peerConnection.setLocalDescription(offer);
      
      logMessage('WebRTC connection established', 'info');
    } catch (error) {
      logMessage(`Connection error: ${error.message}`, 'error');
    }
  },

  async switchVideo(enabled) {
    if (!state.dataChannel) return "Not connected";
    const msg = {
      type: 'VID',
      enabled: enabled
    };
    state.dataChannel.send(JSON.stringify(msg));
    return enabled ? "Video enabled" : "Video disabled";
  },

  async switchAudio(enabled) {
    if (!state.dataChannel) return "Not connected";
    const msg = {
      type: 'AUD',
      enabled: enabled
    };
    state.dataChannel.send(JSON.stringify(msg));
    return enabled ? "Audio enabled" : "Audio disabled";
  },

  async disableTrafficSaving(disabled) {
    if (!state.dataChannel) return "Not connected";
    const msg = {
      type: 'RTC_INNER_REQ',
      data: {
        req_type: 'disable_traffic_saving',
        instruction: disabled ? 'on' : 'off'
      }
    };
    state.dataChannel.send(JSON.stringify(msg));
    return disabled ? "Traffic saving disabled" : "Traffic saving enabled";
  },

  async getRobotInfo() {
    if (!state.dataChannel) return "Not connected";
    const msg = {
      type: 'RTC_INNER_REQ',
      data: {
        req_type: 'get_robot_info'
      }
    };
    state.dataChannel.send(JSON.stringify(msg));
    return "Requesting robot information...";
  }
};

// Export Observable notebook cells
export default function define(runtime, observer) {
  const main = runtime.module();

  // Create and display the view
  main.variable(observer()).define([], createView);

  // Start connection after view is created
  main.variable(observer()).define(["Promises"], async function(Promises) {
    await Promises.delay(100); // Give the view time to render
    await webrtc.connect();
  });

  return main;
}