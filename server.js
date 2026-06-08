const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.static(path.join(__dirname, 'client')));

// ─── Game Constants ───────────────────────────────────────────
const TICK_RATE = 30; // server ticks per second
const ARENA_W = 3000;
const ARENA_H = 3000;
const INITIAL_RADIUS = 22;
const INITIAL_SPEED = 3.5;
const BOOST_SPEED = 10;
const BOOST_COOLDOWN = 3000; // ms
const BOOST_DURATION = 400; // ms
const GRAVITY_RANGE = 150;
const GRAVITY_STRENGTH = 0.015;
const PUSH_FORCE = 8;
const ASTEROID_COUNT = 80;
const BLACK_HOLE_COUNT = 4;
const POWERUP_COUNT = 5;
const SHRINK_INTERVAL = 30000; // ms
const SHRINK_AMOUNT = 50;
const MIN_ARENA = 600;
const RESPAWN_TIME = 3000;
const COLORS = [
  '#00f0ff', '#ff00aa', '#ffee00', '#00ff66',
  '#ff6600', '#aa55ff', '#ff3344', '#44ddff',
  '#88ff44', '#ff88cc'
];
const POWERUP_TYPES = ['speed', 'shield', 'gravity_amp', 'mass'];

// ─── Game State ───────────────────────────────────────────────
let players = {};
let asteroids = [];
let blackHoles = [];
let powerups = [];
let arenaW = ARENA_W;
let arenaH = ARENA_H;
let gameTime = 0;
let nextId = 1;
let nextAsteroidId = 1;
let nextPowerupId = 1;

function rand(min, max) { return Math.random() * (max - min) + min; }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

function initAsteroids() {
  asteroids = [];
  for (let i = 0; i < ASTEROID_COUNT; i++) {
    asteroids.push({
      id: nextAsteroidId++,
      x: rand(50, arenaW - 50),
      y: rand(50, arenaH - 50),
      r: rand(4, 10),
      vx: rand(-0.3, 0.3),
      vy: rand(-0.3, 0.3)
    });
  }
}

function initBlackHoles() {
  blackHoles = [];
  for (let i = 0; i < BLACK_HOLE_COUNT; i++) {
    blackHoles.push({
      x: rand(200, arenaW - 200),
      y: rand(200, arenaH - 200),
      r: rand(30, 50),
      pull: rand(0.03, 0.06)
    });
  }
}

function spawnPowerup() {
  if (powerups.length >= POWERUP_COUNT) return;
  const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
  powerups.push({
    id: nextPowerupId++,
    x: rand(100, arenaW - 100),
    y: rand(100, arenaH - 100),
    type,
    r: 12,
    duration: type === 'shield' ? 5000 : type === 'speed' ? 4000 : type === 'gravity_amp' ? 6000 : 0
  });
}

function createPlayer(ws) {
  const id = nextId++;
  const color = COLORS[(id - 1) % COLORS.length];
  const spawnX = rand(100, arenaW - 100);
  const spawnY = rand(100, arenaH - 100);
  return {
    id, ws, color, name: `P${id}`,
    x: spawnX, y: spawnY,
    vx: 0, vy: 0,
    radius: INITIAL_RADIUS,
    speed: INITIAL_SPEED,
    score: 0,
    alive: true,
    boosting: false,
    boostEnd: 0,
    lastBoost: 0,
    powerup: null,
    powerupEnd: 0,
    deaths: 0,
    kills: 0,
    respawnAt: 0
  };
}

function respawnPlayer(p) {
  p.x = rand(100, arenaW - 100);
  p.y = rand(100, arenaH - 100);
  p.vx = 0;
  p.vy = 0;
  p.radius = INITIAL_RADIUS;
  p.alive = true;
  p.powerup = null;
  p.powerupEnd = 0;
}

// ─── Physics Tick ─────────────────────────────────────────────
function tick(dt) {
  gameTime += dt;
  const now = Date.now();

  // Shrink arena over time
  if (gameTime > 0 && Math.floor(gameTime) % (SHRINK_INTERVAL / 1000) === 0 && gameTime - dt < Math.floor(gameTime)) {
    arenaW = Math.max(MIN_ARENA, arenaW - SHRINK_AMOUNT);
    arenaH = Math.max(MIN_ARENA, arenaH - SHRINK_AMOUNT);
  }

  // Spawn powerups
  if (Math.random() < 0.01) spawnPowerup();

  // Move asteroids
  for (const a of asteroids) {
    a.x += a.vx;
    a.y += a.vy;
    if (a.x < a.r || a.x > arenaW - a.r) a.vx *= -1;
    if (a.y < a.r || a.y > arenaH - a.r) a.vy *= -1;
    a.x = Math.max(a.r, Math.min(arenaW - a.r, a.x));
    a.y = Math.max(a.r, Math.min(arenaH - a.r, a.y));
  }

  // Process players
  const alivePlayers = Object.values(players).filter(p => p.alive);

  for (const p of Object.values(players)) {
    if (!p.alive) {
      if (now >= p.respawnAt && p.respawnAt > 0) {
        respawnPlayer(p);
      }
      continue;
    }

    // Apply boost
    const spd = (p.boosting && now < p.boostEnd) ? BOOST_SPEED :
                (p.powerup === 'speed' && now < p.powerupEnd) ? p.speed * 1.6 :
                p.speed;

    p.x += p.vx * spd;
    p.y += p.vy * spd;

    // Arena bounds
    p.x = Math.max(p.radius, Math.min(arenaW - p.radius, p.x));
    p.y = Math.max(p.radius, Math.min(arenaH - p.radius, p.y));

    // Black hole gravity
    for (const bh of blackHoles) {
      const d = dist(p, bh);
      if (d < bh.r + p.radius) {
        // Player sucked into black hole
        p.alive = false;
        p.deaths++;
        p.respawnAt = now + RESPAWN_TIME;
        continue;
      }
      if (d < 250) {
        const force = bh.pull * (1 - d / 250);
        const angle = Math.atan2(bh.y - p.y, bh.x - p.x);
        p.vx += Math.cos(angle) * force;
        p.vy += Math.sin(angle) * force;
      }
    }

    // Player gravity field (collect asteroids)
    const gravRange = (p.powerup === 'gravity_amp' && now < p.powerupEnd)
      ? GRAVITY_RANGE * 2.5 : GRAVITY_RANGE;

    for (let i = asteroids.length - 1; i >= 0; i--) {
      const a = asteroids[i];
      const d = dist(p, a);
      if (d < gravRange) {
        const force = GRAVITY_STRENGTH * (1 - d / gravRange);
        const angle = Math.atan2(p.y - a.y, p.x - a.x);
        a.vx += Math.cos(angle) * force;
        a.vy += Math.sin(angle) * force;
      }
      if (d < p.radius + a.r) {
        // Collect asteroid
        p.radius = Math.min(60, p.radius + a.r * 0.15);
        p.score += Math.round(a.r);
        // Respawn asteroid
        a.x = rand(50, arenaW - 50);
        a.y = rand(50, arenaH - 50);
        a.r = rand(4, 10);
      }
    }

    // Collect powerups
    for (let i = powerups.length - 1; i >= 0; i--) {
      const pw = powerups[i];
      if (dist(p, pw) < p.radius + pw.r) {
        if (pw.type === 'mass') {
          p.radius = Math.min(60, p.radius + 8);
          p.score += 50;
        } else {
          p.powerup = pw.type;
          p.powerupEnd = now + pw.duration;
        }
        powerups.splice(i, 1);
      }
    }

    // Decay velocity
    p.vx *= 0.92;
    p.vy *= 0.92;
  }

  // Player-player collisions
  for (let i = 0; i < alivePlayers.length; i++) {
    for (let j = i + 1; j < alivePlayers.length; j++) {
      const a = alivePlayers[i];
      const b = alivePlayers[j];
      const d = dist(a, b);
      const minDist = a.radius + b.radius;

      if (d < minDist && d > 0) {
        const hasShieldA = a.powerup === 'shield' && now < a.powerupEnd;
        const hasShieldB = b.powerup === 'shield' && now < b.powerupEnd;

        if (a.radius > b.radius * 1.3 && !hasShieldB) {
          // A eats B
          b.alive = false;
          b.deaths++;
          b.respawnAt = now + RESPAWN_TIME;
          a.radius = Math.min(60, a.radius + b.radius * 0.3);
          a.score += b.score;
          a.kills++;
        } else if (b.radius > a.radius * 1.3 && !hasShieldA) {
          // B eats A
          a.alive = false;
          a.deaths++;
          a.respawnAt = now + RESPAWN_TIME;
          b.radius = Math.min(60, b.radius + a.radius * 0.3);
          b.score += a.score;
          b.kills++;
        } else {
          // Push each other
          const angle = Math.atan2(b.y - a.y, b.x - a.x);
          const push = PUSH_FORCE * (minDist - d) / minDist;
          if (!hasShieldA) {
            a.vx -= Math.cos(angle) * push;
            a.vy -= Math.sin(angle) * push;
          }
          if (!hasShieldB) {
            b.vx += Math.cos(angle) * push;
            b.vy += Math.sin(angle) * push;
          }
        }
      }
    }
  }
}

// ─── Broadcast ────────────────────────────────────────────────
function broadcast(msg) {
  const data = JSON.stringify(msg);
  for (const p of Object.values(players)) {
    if (p.ws.readyState === 1) {
      p.ws.send(data);
    }
  }
}

function getGameState(playerId) {
  const now = Date.now();
  return {
    t: 'state',
    time: Math.floor(gameTime),
    arena: { w: arenaW, h: arenaH },
    you: playerId,
    players: Object.values(players).map(p => ({
      id: p.id,
      name: p.name,
      x: Math.round(p.x),
      y: Math.round(p.y),
      r: Math.round(p.radius * 10) / 10,
      color: p.color,
      score: p.score,
      alive: p.alive,
      boosting: p.boosting && now < p.boostEnd,
      powerup: (p.powerup && now < p.powerupEnd) ? p.powerup : null,
      kills: p.kills,
      deaths: p.deaths
    })),
    asteroids: asteroids.map(a => ({
      id: a.id,
      x: Math.round(a.x),
      y: Math.round(a.y),
      r: Math.round(a.r * 10) / 10
    })),
    blackHoles: blackHoles.map(bh => ({
      x: Math.round(bh.x),
      y: Math.round(bh.y),
      r: Math.round(bh.r)
    })),
    powerups: powerups.map(pw => ({
      id: pw.id,
      x: Math.round(pw.x),
      y: Math.round(pw.y),
      type: pw.type,
      r: pw.r
    }))
  };
}

// ─── WebSocket Handling ───────────────────────────────────────
wss.on('connection', (ws) => {
  const player = createPlayer(ws);
  players[player.id] = player;

  ws.send(JSON.stringify({ t: 'welcome', id: player.id, color: player.color }));
  broadcast({ t: 'player_join', id: player.id, name: player.name, color: player.color });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.t === 'input') {
        player.vx = msg.dx || 0;
        player.vy = msg.dy || 0;
      }
      if (msg.t === 'boost') {
        const now = Date.now();
        if (now - player.lastBoost >= BOOST_COOLDOWN) {
          player.boosting = true;
          player.boostEnd = now + BOOST_DURATION;
          player.lastBoost = now;
        }
      }
      if (msg.t === 'name') {
        player.name = String(msg.name || '').slice(0, 12) || `P${player.id}`;
      }
    } catch (e) {}
  });

  ws.on('close', () => {
    delete players[player.id];
    broadcast({ t: 'player_leave', id: player.id, name: player.name });
  });
});

// ─── Game Loop ────────────────────────────────────────────────
initAsteroids();
initBlackHoles();

const tickInterval = 1000 / TICK_RATE;
setInterval(() => {
  tick(tickInterval / 1000);

  // Send state to each player
  for (const p of Object.values(players)) {
    if (p.ws.readyState === 1) {
      p.ws.send(JSON.stringify(getGameState(p.id)));
    }
  }
}, tickInterval);

// ─── Start Server ─────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🪐 Gravity Wells running on http://localhost:${PORT}`);
});
