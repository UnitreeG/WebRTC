// Title: G1 WebRTC Observable Client
// Author: @dcmcshan

// Import dependencies
import {html} from "@observablehq/stdlib"

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
}
</style>`

// Initialize state
const state = {
  peerConnection: null,
  dataChannel: null,
  socket: null
}

// Create UI container
const ui = html`
  <div class="webrtc-container">
    <div class="controls">
      <button id="connect">Connect</button>
      <button id="video" disabled>Enable Video</button>
      <button id="audio" disabled>Enable Audio</button>
      <button id="traffic" disabled>Traffic Saving</button>
    </div>
    <div id="status" class="disconnected">Disconnected</div>
    <div id="log" class="log"></div>
  </div>
`

// Get UI elements
const elements = ({
  status: ui.querySelector("#status"),
  log: ui.querySelector("#log"),
  connectBtn: ui.querySelector("#connect"),
  videoBtn: ui.querySelector("#video"),
  audioBtn: ui.querySelector("#audio"),
  trafficBtn: ui.querySelector("#traffic")
})

// Logging function
function logMessage(msg, type = 'info') {
  const entry = document.createElement('div');
  entry.textContent = `${new Date().toLocaleTimeString()} [${type}] ${msg}`;
  elements.log.appendChild(entry);
  elements.log.scrollTop = elements.log.scrollHeight;
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
    elements.status.textContent = 'Disconnected';
    elements.status.className = 'disconnected';
    elements.videoBtn.disabled = true;
    elements.audioBtn.disabled = true;
    elements.trafficBtn.disabled = true;
  };

  channel.onmessage = function(event) {
    const message = JSON.parse(event.data);
    
    if (message.type === 'validation') {
      if (message.data === 'Validation Ok.') {
        logMessage('Connection validated successfully');
        elements.status.textContent = 'Connected';
        elements.status.className = 'connected';
        elements.videoBtn.disabled = false;
        elements.audioBtn.disabled = false;
        elements.trafficBtn.disabled = false;
        
        // Query robot info after successful validation
        sendRobotInfoRequest();
      } else {
        logMessage('Validation failed', 'error');
        channel.close();
      }
    } else if (message.type === 'RTC_REPORT' && message.data.req_type === 'get_robot_info') {
      const info = message.data.info;
      logMessage('Connected to ' + info.model + ' (Version: ' + info.version + ')');
      elements.status.textContent = 'Connected to ' + info.model;
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
      const response = await fetch('http://localhost:3000/webrtc/offer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'offer',
          sdp: 'v=0\r\n...' // Your SDP offer here
        })
      });

      const data = await response.json();
      
      if (data.sdp === 'reject') {
        throw new Error('Connection rejected - another client is already connected');
      }

      state.peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      state.dataChannel = state.peerConnection.createDataChannel('data');
      state.dataChannel.validationKey = data.validationKey;
      setupDataChannel(state.dataChannel);

      await state.peerConnection.setRemoteDescription(new RTCSessionDescription(data));
      logMessage('Connecting...');
    } catch (error) {
      logMessage(error.message, 'error');
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

// Export notebook cells
export function initialize() {
  document.body.innerHTML = ui.toString();
  // Connect automatically on page load
  webrtc.connect();
}

// Auto-initialize when the module loads
initialize();