# 🪐 Gravity Wells

A real-time gravity arena game. Collect asteroids, grow your planet, and push opponents into black holes!

![Gravity Wells](https://img.shields.io/badge/Game-Multiplayer%20Arena-purple) ![HTML5](https://img.shields.io/badge/HTML5-Canvas-orange) ![Node.js](https://img.shields.io/badge/Node.js-WebSocket-green)

## 🎮 Two Ways to Play

### 🎮 Solo (vs AI Bots) — No server needed!
Just open `index.html` in a browser, or play on **GitHub Pages**. 5 AI bots with different behaviors (hunt, flee, collect, wander).

### 🌐 Multiplayer — Requires Node.js server
Run `npm start` and share the URL. Real-time WebSocket multiplayer with unlimited players.

## 🕹️ Controls

| Action | Keyboard | Mouse | Mobile |
|--------|----------|-------|--------|
| Move | `WASD` / Arrow keys | Click & hold | Touch joystick |
| Boost | `Space` | Double-click | Boost button |

## 🎯 How to Play

1. 🪨 **Collect asteroids** to grow and score
2. ⚡ **Grab power-ups:** Speed, Shield, Gravity Amp, Mass
3. 🕳️ **Avoid black holes** — they pull you in!
4. 💥 **Absorb smaller players** (be 30%+ bigger) or push them into holes
5. 🏆 **Climb the leaderboard** as the arena shrinks!

## 🚀 Quick Start (Multiplayer)

```bash
npm install
npm start
# Open http://localhost:3000
```

## 🏗️ Architecture

```
gravity-wells/
├── server.js          # WebSocket game server (Node.js)
├── client/
│   └── index.html     # Complete game (works standalone!)
├── package.json
└── README.md
```

- **Client:** Pure HTML5 Canvas, zero dependencies, single file
- **Server:** Node.js + Express + ws, authoritative physics at 30 tps
- **Protocol:** Lightweight JSON over WebSocket

## 🌐 Deploy

### GitHub Pages (Solo mode works!)
Enable Pages → deploy from `main` branch `/client` folder.

### Heroku / Railway / Render
```bash
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

## License

MIT
