// Import Observable standard library
import { html } from "npm:@observablehq/stdlib";

// Create WebRTC interface
function webrtc() {
  let peerConnection;
  let dataChannel;
  let socket;

  return {
    async connect() {
      try {
        socket = new WebSocket('wss://your-webrtc-server.com');
        peerConnection = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        
        dataChannel = peerConnection.createDataChannel('data');
        return "Connected!";
      } catch (error) {
        return `Connection failed: ${error.message}`;
      }
    },

    async switchVideo(enabled) {
      if (!dataChannel) return "Not connected";
      dataChannel.send(JSON.stringify({
        type: 'VID',
        data: enabled ? 'on' : 'off'
      }));
      return `Video ${enabled ? "enabled" : "disabled"}`;
    },

    async switchAudio(enabled) {
      if (!dataChannel) return "Not connected";
      dataChannel.send(JSON.stringify({
        type: 'AUD',
        data: enabled ? 'on' : 'off'
      }));
      return `Audio ${enabled ? "enabled" : "disabled"}`;
    },

    async disableTrafficSaving(disabled) {
      if (!dataChannel) return "Not connected";
      dataChannel.send(JSON.stringify({
        type: 'RTC_INNER_REQ',
        data: {
          req_type: 'disable_traffic_saving',
          instruction: disabled ? 'on' : 'off'
        }
      }));
      return `Traffic saving ${disabled ? "disabled" : "enabled"}`;
    }
  };
}

// Create UI controls
function controls(webrtc) {
  const form = html`<form>
    <div class="controls">
      <button type="button" id="connect">Connect</button>
      <button type="button" id="video" disabled>Enable Video</button>
      <button type="button" id="audio" disabled>Enable Audio</button>
      <button type="button" id="traffic" disabled>Traffic Saving</button>
    </div>
    <div id="status" class="disconnected">Disconnected</div>
    <div id="log"></div>
  </form>`;

  const status = form.querySelector("#status");
  const log = form.querySelector("#log");
  const connectBtn = form.querySelector("#connect");
  const videoBtn = form.querySelector("#video");
  const audioBtn = form.querySelector("#audio");
  const trafficBtn = form.querySelector("#traffic");

  function logMessage(msg) {
    const entry = document.createElement("div");
    entry.textContent = `${new Date().toLocaleTimeString()} - ${msg}`;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
  }

  connectBtn.onclick = async () => {
    const result = await webrtc.connect();
    logMessage(result);
    if (result === "Connected!") {
      status.textContent = "Connected";
      status.className = "connected";
      videoBtn.disabled = false;
      audioBtn.disabled = false;
      trafficBtn.disabled = false;
    }
  };

  videoBtn.onclick = async () => {
    const enabled = videoBtn.textContent === "Enable Video";
    const result = await webrtc.switchVideo(enabled);
    logMessage(result);
    videoBtn.textContent = enabled ? "Disable Video" : "Enable Video";
  };

  audioBtn.onclick = async () => {
    const enabled = audioBtn.textContent === "Enable Audio";
    const result = await webrtc.switchAudio(enabled);
    logMessage(result);
    audioBtn.textContent = enabled ? "Disable Audio" : "Enable Audio";
  };

  trafficBtn.onclick = async () => {
    const disabled = trafficBtn.textContent === "Traffic Saving";
    const result = await webrtc.disableTrafficSaving(disabled);
    logMessage(result);
    trafficBtn.textContent = disabled ? "Enable Traffic" : "Traffic Saving";
  };

  return form;
}

// Export notebook cells
export default function define(runtime, observer) {
  const main = runtime.module();

  // Create WebRTC interface
  main.variable(observer("webrtc")).define("webrtc", [], webrtc);

  // Create controls view
  main.variable(observer("viewof controls")).define("viewof controls", ["webrtc"], controls);

  // Add documentation
  main.variable(observer()).define(["md"], md => md`
# G1 WebRTC Observable Client

This notebook provides an interface to control a WebRTC connection.

## Available Commands

\`\`\`javascript
// Connect to WebRTC server
await webrtc.connect()

// Control video
await webrtc.switchVideo(true)   // Enable video
await webrtc.switchVideo(false)  // Disable video

// Control audio
await webrtc.switchAudio(true)   // Enable audio
await webrtc.switchAudio(false)  // Disable audio

// Control traffic saving
await webrtc.disableTrafficSaving(true)   // Disable traffic saving
await webrtc.disableTrafficSaving(false)  // Enable traffic saving
\`\`\`
  `);

  return main;
} 