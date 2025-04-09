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
state = ({
  peerConnection: null,
  dataChannel: null,
  socket: null
})

// Create UI container
ui = html`
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
elements = ({
  status: ui.querySelector("#status"),
  log: ui.querySelector("#log"),
  connectBtn: ui.querySelector("#connect"),
  videoBtn: ui.querySelector("#video"),
  audioBtn: ui.querySelector("#audio"),
  trafficBtn: ui.querySelector("#traffic")
})

// Logging function
logMessage = (msg, type = 'info') => {
  const entry = document.createElement("div")
  entry.textContent = \`\${new Date().toLocaleTimeString()} [\${type}] \${msg}\`
  elements.log.appendChild(entry)
  elements.log.scrollTop = elements.log.scrollHeight
}

// Setup data channel handlers
setupDataChannel = (channel) => {
  channel.onopen = () => {
    logMessage('Data channel opened')
    elements.status.textContent = "Connected"
    elements.status.className = "connected"
    elements.videoBtn.disabled = false
    elements.audioBtn.disabled = false
    elements.trafficBtn.disabled = false
  }

  channel.onclose = () => {
    logMessage('Data channel closed')
    elements.status.textContent = "Disconnected"
    elements.status.className = "disconnected"
    elements.videoBtn.disabled = true
    elements.audioBtn.disabled = true
    elements.trafficBtn.disabled = true
  }

  channel.onmessage = (event) => {
    logMessage(\`Received: \${event.data}\`)
  }
}

// WebRTC interface
webrtc = ({
  async connect() {
    try {
      state.socket = new WebSocket('ws://localhost:8080')
      
      // Send robot connection config
      state.socket.send(JSON.stringify({
        type: 'CONNECT',
        config: {
          method: 'LocalSTA',
          ip: '192.168.8.181'  // Update this with your robot's IP
        }
      }))
      
      // Handle robot messages
      state.socket.onmessage = (event) => {
        const data = JSON.parse(event.data)
        switch (data.type) {
          case 'robot_log':
            logMessage(data.data, 'robot')
            break
          case 'robot_error':
            logMessage(data.data, 'error')
            break
          default:
            logMessage(JSON.stringify(data), 'info')
        }
      }
      
      return "Connected!"
    } catch (error) {
      logMessage(error.message, 'error')
      return \`Connection failed: \${error.message}\`
    }
  },

  async switchVideo(enabled) {
    if (!state.socket) return "Not connected"
    state.socket.send(JSON.stringify({
      type: 'VID',
      enabled
    }))
    return \`Video \${enabled ? "enabled" : "disabled"}\`
  },

  async switchAudio(enabled) {
    if (!state.socket) return "Not connected"
    state.socket.send(JSON.stringify({
      type: 'AUD',
      enabled
    }))
    return \`Audio \${enabled ? "enabled" : "disabled"}\`
  },

  async disableTrafficSaving(disabled) {
    if (!state.socket) return "Not connected"
    state.socket.send(JSON.stringify({
      type: 'RTC_INNER_REQ',
      data: {
        req_type: 'disable_traffic_saving',
        instruction: disabled ? 'on' : 'off'
      }
    }))
    return \`