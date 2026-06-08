# 🪐 Gravity Wells

A real-time multiplayer gravity arena game. Collect asteroids, grow your planet, and push opponents into black holes!

![Gravity Wells](https://img.shields.io/badge/Game-Multiplayer%20Arena-purple) ![HTML5](https://img.shields.io/badge/HTML5-Canvas-orange) ![Node.js](https://img.shields.io/badge/Node.js-WebSocket-green)

## 🎮 How to Play

- **Move:** `WASD` or Arrow keys or Mouse click
- **Boost:** `Space` or Double-click (3s cooldown)
- **Mobile:** Touch joystick + Boost button

### Objective
1. 🪨 **Collect asteroids** to grow your planet and increase your score
2. ⚡ **Grab power-ups:** Speed boost, Shield, Gravity amplifier, Mass
3. 🕳️ **Avoid black holes** — they pull you in!
4. 💥 **Push smaller players** into black holes or absorb them by being 30% bigger
5. 🏆 **Dominate the leaderboard** before the arena shrinks!

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm start

# Open in browser
open http://localhost:3000
```

## 🌐 Multiplayer

The game runs on a WebSocket server. Anyone on your network (or with your public URL) can join the same game!

- Default port: `3000` (change with `PORT` env variable)
- Supports unlimited concurrent players
- Real-time physics synchronization

## 🏗️ Architecture

```
gravity-wells/
├── server.js          # WebSocket game server (physics, state management)
├── client/
│   └── index.html     # Single-file game client (HTML + CSS + JS + Canvas)
├── package.json
└── README.md
```

- **Server:** Node.js + Express + WebSocket (ws). Runs authoritative physics at 30 ticks/sec
- **Client:** Pure HTML5 Canvas rendering, zero dependencies, single HTML file
- **Protocol:** Lightweight JSON messages over WebSocket

## 🎨 Features

- 🌌 Stunning space visuals with parallax star field
- 🌀 Realistic gravity physics (black holes pull, planets attract asteroids)
- ✨ Particle effects for boosts and collisions
- 🗺️ Live minimap with player positions
- 📊 Real-time leaderboard
- 📱 Mobile touch controls
- 🎯 Power-up system (Speed, Shield, Gravity Amp, Mass)
- 🔲 Shrinking arena for intense late-game

## 📦 Deploy

### Heroku / Railway / Render
```bash
# Just push — it detects Node.js automatically
git push heroku main
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install --production
EXPOSE 3000
CMD ["node", "server.js"]
```

### VPS / PM2
```bash
pm2 start server.js --name gravity-wells
```

## License

MIT
