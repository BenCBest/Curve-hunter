// Spielraum-Modul
const { v4: uuidv4 } = require('uuid');
const {
  tickPlayer, checkCollisions, randomObstacles, safeStartPositions,
  MIN_SPEED, PRADIUS
} = require('./physics');

const PLAYER_COLORS = ['#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];
const MAP_WIDTH  = 1920;
const MAP_HEIGHT = 1080;

class Room {
  constructor(players) {
    this.roomId   = uuidv4();
    this.status   = 'waiting'; // waiting → countdown → active → finished
    this.tick     = 0;
    this.startedAt = null;
    this._interval = null;
    this._lastTick = null;

    this.obstacles = randomObstacles(MAP_WIDTH, MAP_HEIGHT);
    const startPos = safeStartPositions(players.length, this.obstacles, MAP_WIDTH, MAP_HEIGHT);

    this.players = new Map();
    players.forEach(({ ws, playerId }, i) => {
      this.players.set(playerId, {
        id: playerId,
        ws,
        colorHex: PLAYER_COLORS[i % PLAYER_COLORS.length],
        x: startPos[i].x,
        y: startPos[i].y,
        angle: startPos[i].angle,
        speed: MIN_SPEED,
        maxSpeed: MIN_SPEED,
        trail: [],
        alive: true,
        lastInput: 'none',
        _mapWidth: MAP_WIDTH,
        _mapHeight: MAP_HEIGHT
      });
    });

    // game_init an alle senden
    const playerInits = [...this.players.values()].map(p => ({
      id: p.id, colorHex: p.colorHex, x: p.x, y: p.y, angle: p.angle
    }));
    this._broadcast({
      type: 'game_init',
      players: playerInits,
      obstacles: this.obstacles,
      mapWidth: MAP_WIDTH,
      mapHeight: MAP_HEIGHT
    }, true /* include playerId per client */);
  }

  // game_init braucht playerId pro Client
  _broadcast(msg, withPlayerId = false) {
    for (const p of this.players.values()) {
      if (p.ws.readyState !== 1) continue;
      const payload = withPlayerId && msg.type === 'game_init'
        ? JSON.stringify({ ...msg, playerId: p.id })
        : JSON.stringify(msg);
      p.ws.send(payload);
    }
  }

  getState() { return this.status; }

  start() {
    this.status = 'countdown';
    let count = 3;
    this._broadcast({ type: 'countdown', value: count });
    const iv = setInterval(() => {
      count--;
      this._broadcast({ type: 'countdown', value: count });
      if (count <= 0) {
        clearInterval(iv);
        this._startGameLoop();
      }
    }, 1000);
  }

  _startGameLoop() {
    this.status   = 'active';
    this.startedAt = Date.now();
    this._lastTick = Date.now();

    this._interval = setInterval(() => {
      try {
        this._tick();
      } catch (err) {
        this._handleRoomError(err);
      }
    }, 1000 / 60);
  }

  _tick() {
    const now = Date.now();
    const dt  = Math.min((now - this._lastTick) / 1000, 0.05);
    this._lastTick = now;
    this.tick++;

    const alivePlayers = [...this.players.values()].filter(p => p.alive);

    // Physik
    for (const p of alivePlayers) {
      tickPlayer(p, p.lastInput, dt);
    }

    // Kollisionen
    checkCollisions([...this.players.values()], this.obstacles);

    // Spielende prüfen
    const stillAlive = [...this.players.values()].filter(p => p.alive);
    if (stillAlive.length <= 1) {
      const winner = stillAlive.length === 1 ? stillAlive[0].id : null;
      this._endGame(winner);
      return;
    }

    // Zustand senden
    const elapsedMs = Date.now() - this.startedAt;
    const playerStates = [...this.players.values()].map(p => ({
      id: p.id, x: p.x, y: p.y, angle: p.angle,
      speed: p.speed, maxSpeed: p.maxSpeed,
      trail: p.trail.slice(-300),
      alive: p.alive,
      colorHex: p.colorHex
    }));
    this._broadcast({
      type: 'game_state',
      tick: this.tick,
      players: playerStates,
      activeCount: stillAlive.length,
      elapsedMs
    });
  }

  _endGame(winnerId) {
    this.status = 'finished';
    if (this._interval) { clearInterval(this._interval); this._interval = null; }
    const elapsedMs = this.startedAt ? Date.now() - this.startedAt : 0;
    this._broadcast({ type: 'game_over', winnerId, elapsedMs });
  }

  handleDisconnect(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    p.alive = false;

    if (this.status === 'active') {
      const stillAlive = [...this.players.values()].filter(pl => pl.alive);
      if (stillAlive.length <= 1) {
        const winner = stillAlive.length === 1 ? stillAlive[0].id : null;
        this._endGame(winner);
      }
    }

    // Alle weg?
    const anyConnected = [...this.players.values()].some(pl => pl.ws.readyState === 1);
    if (!anyConnected) this.destroy();
  }

  setInput(playerId, direction) {
    if (this.status !== 'active') return;
    const p = this.players.get(playerId);
    if (p && p.alive) p.lastInput = direction;
  }

  destroy() {
    if (this._interval) { clearInterval(this._interval); this._interval = null; }
    this.players.clear();
  }

  _handleRoomError(err) {
    console.error(`[Room ${this.roomId}] Fehler:`, err);
    this._broadcast({ type: 'error', code: 'ROOM_ERROR', message: 'Interner Serverfehler im Spielraum.' });
    this.destroy();
  }
}

module.exports = Room;
