// Matchmaking-Modul – unterstützt beliebige Raumgröße

class Matchmaking {
  constructor(roomSize) {
    this._roomSize = roomSize;
    this._queue = []; // [{ ws, playerId }]
    this._roomReadyCallback = null;
  }

  onRoomReady(callback) {
    this._roomReadyCallback = callback;
  }

  addPlayer(ws, playerId) {
    this._queue.push({ ws, playerId });
    this._broadcastQueueUpdate();
    if (this._queue.length >= this._roomSize) {
      const players = this._queue.splice(0, this._roomSize);
      this._broadcastQueueUpdate();
      if (this._roomReadyCallback) this._roomReadyCallback(players);
    }
  }

  removePlayer(playerId) {
    const idx = this._queue.findIndex(p => p.playerId === playerId);
    if (idx !== -1) {
      this._queue.splice(idx, 1);
      this._broadcastQueueUpdate();
    }
  }

  getQueueCount() { return this._queue.length; }

  _broadcastQueueUpdate() {
    const msg = JSON.stringify({ type: 'queue_update', count: this._queue.length, max: this._roomSize });
    for (const { ws } of this._queue) {
      if (ws.readyState === 1) ws.send(msg);
    }
  }
}

module.exports = {
  queue5: new Matchmaking(5),
  queue2: new Matchmaking(2),
  queue5mobile: new Matchmaking(5),
  queue2mobile: new Matchmaking(2),
};
