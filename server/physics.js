// Physik-Modul – portiert aus game/index.html

const TURN_RATE    = 4.5;
const ACCEL_FACTOR = Math.LN2 / 8;
const DECEL_FACTOR = Math.LN2 / 5;
const MIN_SPEED    = 100;
const MAX_SPEED    = 3000;
const PRADIUS      = 14;
const MAX_TRAIL    = 300;
const MAP_BORDER   = 30; // Breite des grauen Randes (Bande) – muss mit Client übereinstimmen

/**
 * Einen Spieler einen Tick vorwärts simulieren.
 * @param {object} player - { x, y, angle, speed, maxSpeed, trail, alive }
 * @param {'left'|'right'|'none'} input
 * @param {number} dt - Zeitdelta in Sekunden
 * @returns {object} aktualisierter Spieler (in-place mutiert und zurückgegeben)
 */
function tickPlayer(player, input, dt) {
  const turning = input === 'left' || input === 'right';

  if (turning) {
    player.speed = Math.max(MIN_SPEED, player.speed * Math.exp(-DECEL_FACTOR * dt));
    const tr = TURN_RATE / (1 + Math.pow(player.speed / 300, 2) * 8);
    if (input === 'left')  player.angle -= tr * dt;
    if (input === 'right') player.angle += tr * dt;
  } else {
    player.speed = Math.min(MAX_SPEED, player.speed * Math.exp(ACCEL_FACTOR * dt));
  }

  player.x += Math.cos(player.angle) * player.speed * dt;
  player.y += Math.sin(player.angle) * player.speed * dt;

  player.trail.push({ x: player.x, y: player.y });
  if (player.trail.length > MAX_TRAIL) player.trail.shift();

  if (player.speed > player.maxSpeed) player.maxSpeed = player.speed;

  return player;
}

/**
 * Kreis-Rechteck-Kollision
 */
function circleRect(cx, cy, r, rx, ry, rw, rh) {
  const nx = Math.max(rx, Math.min(cx, rx + rw));
  const ny = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nx, dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

/**
 * Kollisionen prüfen und auflösen.
 * Mutiert player.alive und player.speed direkt.
 * @param {object[]} players - Array von ServerPlayer-Objekten
 * @param {object[]} obstacles - Array von { x, y, w, h }
 */
function checkCollisions(players, obstacles) {
  // Spieler-Hindernis
  for (const p of players) {
    if (!p.alive) continue;
    const wall = MAP_BORDER + PRADIUS;
    if (p.x < wall || p.x > p._mapWidth - wall ||
        p.y < wall || p.y > p._mapHeight - wall) {
      p.alive = false;
      continue;
    }
    for (const o of obstacles) {
      if (circleRect(p.x, p.y, PRADIUS, o.x, o.y, o.w, o.h)) {
        p.alive = false;
        break;
      }
    }
  }

  // Spieler-Spieler
  for (let i = 0; i < players.length; i++) {
    if (!players[i].alive) continue;
    for (let j = i + 1; j < players.length; j++) {
      if (!players[j].alive) continue;
      const dx = players[i].x - players[j].x;
      const dy = players[i].y - players[j].y;
      if (dx * dx + dy * dy < (PRADIUS * 2) * (PRADIUS * 2)) {
        if (players[i].speed > players[j].speed) {
          players[j].alive = false;
          players[i].speed = Math.max(MIN_SPEED, players[i].speed / 2);
        } else if (players[j].speed > players[i].speed) {
          players[i].alive = false;
          players[j].speed = Math.max(MIN_SPEED, players[j].speed / 2);
        } else {
          // Gleichstand – beide aus
          players[i].alive = false;
          players[j].alive = false;
        }
      }
    }
  }
}

/**
 * 15 (landscape) oder 8 (portrait) zufällige, nicht überlappende Hindernisse generieren.
 */
function randomObstacles(width, height, count = 15) {
  const obs = [];
  const GAP = 20;
  const edge = MAP_BORDER + 30;
  for (let i = 0; i < count; i++) {
    for (let attempt = 0; attempt < 100; attempt++) {
      const w = 20 + Math.random() * 220;
      const h = 15 + Math.random() * 160;
      const x = edge + Math.random() * (width - w - edge * 2);
      const y = edge + Math.random() * (height - h - edge * 2);
      let overlap = false;
      for (const o of obs) {
        if (x < o.x + o.w + GAP && x + w > o.x - GAP &&
            y < o.y + o.h + GAP && y + h > o.y - GAP) {
          overlap = true; break;
        }
      }
      if (!overlap) { obs.push({ x, y, w, h }); break; }
    }
  }
  return obs;
}

/**
 * Kollisionsfreie Startpositionen für `count` Spieler berechnen.
 * Stellt sicher, dass in Startrichtung kein Hindernis direkt vor dem Spieler ist.
 */
function safeStartPositions(count, obstacles, width, height) {
  const positions = [];
  const margin = MAP_BORDER + PRADIUS + 40;
  const CLEAR_DIST = 200; // Mindestfreiraum in Startrichtung
  const CLEAR_STEPS = 10;

  function pathClear(x, y, angle) {
    for (let s = 1; s <= CLEAR_STEPS; s++) {
      const dist = (s / CLEAR_STEPS) * CLEAR_DIST;
      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist;
      if (px < margin || px > width - margin || py < margin || py > height - margin) return false;
      for (const o of obstacles) {
        if (circleRect(px, py, PRADIUS + 10, o.x, o.y, o.w, o.h)) return false;
      }
    }
    return true;
  }

  for (let i = 0; i < count; i++) {
    let placed = false;
    for (let attempt = 0; attempt < 300; attempt++) {
      const x = margin + Math.random() * (width - margin * 2);
      const y = margin + Math.random() * (height - margin * 2);
      let blocked = false;
      for (const o of obstacles) {
        if (circleRect(x, y, PRADIUS + 20, o.x, o.y, o.w, o.h)) { blocked = true; break; }
      }
      if (blocked) continue;
      let tooClose = false;
      for (const p of positions) {
        const dx = x - p.x, dy = y - p.y;
        if (dx * dx + dy * dy < 80 * 80) { tooClose = true; break; }
      }
      if (tooClose) continue;
      // Zufälligen Winkel suchen der freie Bahn hat
      let angle = Math.random() * Math.PI * 2;
      let angleOk = false;
      for (let a = 0; a < 8; a++) {
        const testAngle = angle + (a / 8) * Math.PI * 2;
        if (pathClear(x, y, testAngle)) { angle = testAngle; angleOk = true; break; }
      }
      if (!angleOk) continue;
      positions.push({ x, y, angle }); placed = true; break;
    }
    if (!placed) positions.push({ x: width / 2 + (Math.random() - 0.5) * 200, y: height / 3, angle: -Math.PI / 2 });
  }
  return positions;
}

module.exports = {
  TURN_RATE, ACCEL_FACTOR, DECEL_FACTOR, MIN_SPEED, MAX_SPEED, PRADIUS, MAP_BORDER,
  tickPlayer, circleRect, checkCollisions, randomObstacles, safeStartPositions
};
