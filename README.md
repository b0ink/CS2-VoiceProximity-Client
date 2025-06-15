# CS2 Voice Proximity (Client)

Electron-based client for proximity voice chat in Counter-Strike 2, featuring 3D positional audio and sound occlusion using [Three.js](https://threejs.org).

## Links

- [Voice Chat Client](https://github.com/b0ink/CS2-VoiceProximity-Client)
- [CS2 Plugin](https://github.com/b0ink/CS2-VoiceProximity-Plugin)
- [API Server](https://github.com/b0ink/CS2-VoiceProximity-Server)

## Screenshots

<p align="center">
    <img src="./screenshots/1-login.png" width="250px"/>
    <img src="./screenshots/2-main.png" width="250px"/>
    <img src="./screenshots/3-connect-now.png" width="250px"/>
</p>
<p align="center">
    <img src="./screenshots/4-joined-room.png" width="250px"/>
    <img src="./screenshots/5-settings-1.png" width="250px"/>
    <img src="./screenshots/6-settings-2.png" width="250px"/>
</p>

## Installation

### Option 1: Use the pre-built installer

Download the installer setup from the [latest release](https://github.com/b0ink/CS2-VoiceProximity-Client/releases/latest)

### Option 2: Build from source

Clone the repo & install dependencies:

```bash
git clone https://github.com/b0ink/CS2-VoiceProximity-Client.git
cd CS2-VoiceProximity-Client
npm install
```

Build for Windows and generate a setup installer:

```bash
npm run build:win
```

Develop with UI hot reloading (`src/main` changes require restart):

```bash
npm run dev
```

Develop with multiple app instances (each requires a valid JWT; use `window.saveAuth(steamid, token)` in the console to set manually):

```bash
npm run dev:multi 2
```

## How it works

The [CS2 plugin](https://github.com/b0ink/CS2-VoiceProximity-Plugin) sends player positions to an API, which broadcasts the data to all connected clients in a voice room.

Each client loads a simplified 3D model of the CS2 map and uses raycasting to simulate positional audio and occlusion effects.

### Occlusion

Occlusion is determined by raycasts between you and other players. More raycasts = smoother occlusion transitions, but higher CPU load. For example, half-peeking a wall will result in partially muffled audio.

A percentage of blocked vs. clear rays determines how much the audio is filtered. The client dynamically reduces raycast count if performance drops.

Diagram of raycast patterns by quality level:

<p align="center">
    <img src="./screenshots/7-occlusion-raycasts.png" />
</p>

Concept inspired by [this video](https://www.youtube.com/watch?v=0W29lnDGD9E).

### Voice Relay Server

Voice data is relayed through a TURN server by default to protect user IPs. For lower latency, you can disable this in private rooms — P2P will only work if both you and the other player(s) disable relaying.

---

<p align="center">
    <sub>Project development started in April, 2025.</sub>
	<br>
	<br>
	<a href="https://www.paypal.com/donate/?hosted_button_id=ZRBPV5GAXAWWU" 
	target="_blank">
	<img src="https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif" alt="PayPal this" 
	title="PayPal – The safer, easier way to pay online!" border="0" />
	</a>
</p>
