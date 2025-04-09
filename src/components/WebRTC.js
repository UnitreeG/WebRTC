import {html} from "@observablehq/stdlib"

export default function WebRTC() {
  const state = {
    peerConnection: null,
    dataChannel: null,
    socket: null
  }

  function logMessage(msg, type = 'info') {
    const entry = document.createElement("div")
    entry.textContent = `${new Date().toLocaleTimeString()} [${type}] ${msg}`
    document.querySelector("#log").appendChild(entry)
    const log = document.querySelector("#log")
    log.scrollTop = log.scrollHeight
  }

  async function connect() {
    try {
      state.socket = new WebSocket('ws://localhost:8080')
      
      // Send robot connection config
      state.socket.send(JSON.stringify({
        type: 'CONNECT',
        config: {
          method: 'LocalSTA',
          ip: '192.168.8.181'  // Update with your robot's IP
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
      
      logMessage("Connected!")
    } catch (error) {
      logMessage(error.message, 'error')
    }
  }

  async function switchVideo(enabled) {
    if (!state.socket) {
      logMessage("Not connected", 'error')
      return
    }
    state.socket.send(JSON.stringify({
      type: 'VID',
      enabled
    }))
    logMessage(`Video ${enabled ? "enabled" : "disabled"}`)
  }

  async function switchAudio(enabled) {
    if (!state.socket) {
      logMessage("Not connected", 'error')
      return
    }
    state.socket.send(JSON.stringify({
      type: 'AUD',
      enabled
    }))
    logMessage(`Audio ${enabled ? "enabled" : "disabled"}`)
  }

  async function disableTrafficSaving(disabled) {
    if (!state.socket) {
      logMessage("Not connected", 'error')
      return
    }
    state.socket.send(JSON.stringify({
      type: 'RTC_INNER_REQ',
      data: {
        req_type: 'disable_traffic_saving',
        instruction: disabled ? 'on' : 'off'
      }
    }))
    logMessage(`Traffic saving ${disabled ? "disabled" : "enabled"}`)
  }

  // Set up event handlers after render
  setTimeout(() => {
    const connectBtn = document.querySelector("#connect")
    const videoBtn = document.querySelector("#video")
    const audioBtn = document.querySelector("#audio")
    const trafficBtn = document.querySelector("#traffic")

    connectBtn.onclick = connect
    videoBtn.onclick = () => {
      const enabled = videoBtn.textContent === "Enable Video"
      switchVideo(enabled)
      videoBtn.textContent = enabled ? "Disable Video" : "Enable Video"
    }
    audioBtn.onclick = () => {
      const enabled = audioBtn.textContent === "Enable Audio"
      switchAudio(enabled)
      audioBtn.textContent = enabled ? "Disable Audio" : "Enable Audio"
    }
    trafficBtn.onclick = () => {
      const disabled = trafficBtn.textContent === "Traffic Saving"
      disableTrafficSaving(disabled)
      trafficBtn.textContent = disabled ? "Enable Traffic" : "Traffic Saving"
    }
  }, 0)

  return html`<div class="webrtc-container">
    <style>
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
      #log {
        height: 200px;
        overflow-y: auto;
        padding: 0.5em;
        background: #1f2937;
        color: #f9fafb;
        border-radius: 4px;
        font-family: Monaco, monospace;
        font-size: 0.9em;
      }
    </style>
    <div class="controls">
      <button id="connect">Connect</button>
      <button id="video" disabled>Enable Video</button>
      <button id="audio" disabled>Enable Audio</button>
      <button id="traffic" disabled>Traffic Saving</button>
    </div>
    <div id="status" class="disconnected">Disconnected</div>
    <div id="log"></div>
  </div>`
} 