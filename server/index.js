const http  = require('http');
const fs    = require('fs');
const path  = require('path');
const { WebSocketServer } = require('ws');
const { v4: uuidv4 } = require('uuid');
const { queue5, queue2 } = require('./matchmaking');
const Room = require('./room');

const PORT = process.env.PORT || 8080;

const rooms     = new Map(); // roomId → Room
const playerRoom = new Map(); // playerId → Room
const playerQueue = new Map(); // playerId → 'q5'|'q2'

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json',
  '.mp3': 'audio/mpeg', '.png': 'image/png',
};

const server = http.createServer((req, res) => {
  let urlPath = req.url === '/' ? '/multiplayer.html' : req.url;
  const candidates = [
    path.join(__dirname, '..', 'client', urlPath),
    path.join(__dirname, '..', 'game',   urlPath),
  ];
  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      const ext  = path.extname(filePath);
      const mime = MIME[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime });
      fs.createReadStream(filePath).pipe(res);
      return;
    }
  }
  res.writeHead(404); res.end('Not found');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  const playerId = uuidv4();

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {
      case 'join_queue': {
        const q = msg.mode === '1v1' ? queue2 : queue5;
        const qKey = msg.mode === '1v1' ? 'q2' : 'q5';
        playerQueue.set(playerId, qKey);
        q.addPlayer(ws, playerId);
        break;
      }
      case 'leave_queue': {
        const qKey = playerQueue.get(playerId);
        if (qKey === 'q2') queue2.removePlayer(playerId);
        else queue5.removePlayer(playerId);
        playerQueue.delete(playerId);
        break;
      }
      case 'input': {
        const room = playerRoom.get(playerId);
        if (room) room.setInput(playerId, msg.direction);
        break;
      }
    }
  });

  ws.on('close', () => {
    const qKey = playerQueue.get(playerId);
    if (qKey === 'q2') queue2.removePlayer(playerId);
    else queue5.removePlayer(playerId);
    playerQueue.delete(playerId);

    const room = playerRoom.get(playerId);
    if (room) {
      room.handleDisconnect(playerId);
      playerRoom.delete(playerId);
      if (room.getState() === 'finished') rooms.delete(room.roomId);
    }
  });

  ws.on('error', (err) => console.error(`[WS ${playerId}]`, err.message));
});

function createRoom(players) {
  try {
    const room = new Room(players);
    rooms.set(room.roomId, room);
    for (const { playerId: pid } of players) playerRoom.set(pid, room);
    room.start();
  } catch (err) {
    console.error('[Matchmaking] Fehler:', err);
    for (const { ws } of players) {
      if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'error', code: 'ROOM_ERROR', message: 'Raum konnte nicht erstellt werden.' }));
    }
  }
}

queue5.onRoomReady(createRoom);
queue2.onRoomReady(createRoom);

server.listen(PORT, () => console.log(`Curve Racer Server läuft auf Port ${PORT}`));

module.exports = server;
