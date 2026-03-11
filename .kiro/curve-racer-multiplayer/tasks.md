# Implementierungsplan: Curve Racer Multiplayer

## Übersicht

Schrittweise Implementierung des Mehrspielermodus: Physik-Modul → Matchmaking → Spielraum → Server-Einstiegspunkt → Multiplayer-Client → Deployment-Konfiguration. Jeder Schritt baut auf dem vorherigen auf und endet mit der vollständigen Verdrahtung aller Komponenten.

## Aufgaben

- [x] 1. Projektstruktur und Abhängigkeiten einrichten
  - `package.json` mit `main: "server/index.js"` und den Abhängigkeiten `ws`, `uuid` sowie den Dev-Abhängigkeiten `jest`, `fast-check` erstellen
  - Verzeichnisse `server/` und `client/` anlegen
  - Jest-Konfiguration in `package.json` eintragen (`testEnvironment: node`)
  - Leere Platzhalterdateien `server/physics.js`, `server/matchmaking.js`, `server/room.js`, `server/index.js`, `client/multiplayer.html` erstellen
  - _Anforderungen: 10.1_

- [x] 2. Physik-Modul implementieren (`server/physics.js`)
  - [x] 2.1 Physik-Konstanten und `tickPlayer` portieren
    - Konstanten `TURN_RATE=4.5`, `ACCEL_FACTOR=Math.LN2/8`, `DECEL_FACTOR=Math.LN2/5`, `MIN_SPEED=100`, `MAX_SPEED=3000`, `PRADIUS=14` aus `game/index.html` übernehmen
    - `tickPlayer(player, input, dt)` implementieren: Winkeländerung und Geschwindigkeitsupdate gemäß Physikformeln, Position aktualisieren, Trail anhängen (max. 300 Punkte), `maxSpeed` nachführen
    - _Anforderungen: 4.4_

  - [ ]* 2.2 Eigenschaftstest für Geschwindigkeitsupdate schreiben (`physics.test.js`)
    - **Eigenschaft 6: Physik-Korrektheit – Geschwindigkeitsupdate**
    - **Validiert: Anforderungen 4.4**

  - [ ]* 2.3 Eigenschaftstest für Wendekreis schreiben (`physics.test.js`)
    - **Eigenschaft 7: Physik-Korrektheit – Wendekreis**
    - **Validiert: Anforderungen 4.4**

  - [x] 2.4 `circleRect` und Kollisionsfunktionen implementieren
    - `circleRect(cx, cy, r, rx, ry, rw, rh)` implementieren
    - `checkCollisions(players, obstacles)` implementieren: Spieler-Spieler-Kollision (Geschwindigkeitsregel: Langsamerer scheidet aus, Schnellerer halbiert Geschwindigkeit, Gleichstand → beide aus) und Spieler-Hindernis-Kollision
    - _Anforderungen: 4.5, 4.6_

  - [ ]* 2.5 Eigenschaftstest für Spieler-Spieler-Kollision schreiben (`physics.test.js`)
    - **Eigenschaft 8: Spieler-Spieler-Kollisionsregel**
    - **Validiert: Anforderungen 4.5**

  - [ ]* 2.6 Eigenschaftstest für Spieler-Hindernis-Kollision schreiben (`physics.test.js`)
    - **Eigenschaft 9: Spieler-Hindernis-Kollisionsregel**
    - **Validiert: Anforderungen 4.6**

  - [x] 2.7 `randomObstacles` und `safeStartPositions` implementieren
    - `randomObstacles(width, height)` implementieren: max. 20 Hindernisse, vollständig innerhalb der Kartengrenzen, kein gegenseitiges Überlappen (Mindestabstand 20 px)
    - `safeStartPositions(count, obstacles, width, height)` implementieren: kollisionsfreie Startpositionen für alle Spieler
    - _Anforderungen: 2.4, 3.1_

  - [ ]* 2.8 Eigenschaftstest für Hindernisgeneration schreiben (`physics.test.js`)
    - **Eigenschaft 3: Hindernisgeneration**
    - **Validiert: Anforderungen 2.4, 3.1**

- [ ] 3. Checkpoint – Alle Physik-Tests bestehen
  - Alle Tests in `physics.test.js` ausführen und sicherstellen, dass sie grün sind. Bei Fragen den Nutzer ansprechen.

- [x] 4. Matchmaking-Modul implementieren (`server/matchmaking.js`)
  - [x] 4.1 Warteschlange und `addPlayer` / `removePlayer` implementieren
    - Klasse oder Modul `Matchmaking` mit internem Array für wartende Spieler erstellen
    - `addPlayer(ws, playerId)`: Spieler hinzufügen, `queue_update` an alle wartenden Clients senden
    - `removePlayer(playerId)`: Spieler entfernen, `queue_update` an alle verbleibenden Clients senden; Zähler darf nie negativ werden
    - `getQueueCount()` implementieren
    - _Anforderungen: 2.1, 2.5_

  - [ ]* 4.2 Eigenschaftstest für Warteschlangen-Zähler-Invariante schreiben (`matchmaking.test.js`)
    - **Eigenschaft 1: Warteschlangen-Zähler-Invariante**
    - **Validiert: Anforderungen 2.1, 2.5**

  - [x] 4.3 Matchmaking-Schwellenwert und `onRoomReady`-Callback implementieren
    - Sobald 5 Spieler in der Warteschlange sind, `onRoomReady(players[])` auslösen und alle 5 Spieler aus der Warteschlange entfernen; Zähler danach 0
    - `onRoomReady(callback)` registrieren
    - _Anforderungen: 2.3_

  - [ ]* 4.4 Eigenschaftstest für Matchmaking-Schwellenwert schreiben (`matchmaking.test.js`)
    - **Eigenschaft 2: Matchmaking-Schwellenwert**
    - **Validiert: Anforderungen 2.3**

  - [ ]* 4.5 Eigenschaftstest für Raumisolation schreiben (`matchmaking.test.js`)
    - **Eigenschaft 16: Raumisolation**
    - **Validiert: Anforderungen 10.4, 10.5**

- [x] 5. Spielraum-Modul implementieren (`server/room.js`)
  - [x] 5.1 Zustandsmaschine und Konstruktor implementieren
    - Klasse `Room` mit Zuständen `waiting → countdown → active → finished` erstellen
    - Konstruktor nimmt `players`, `mapWidth`, `mapHeight`; ruft `randomObstacles` und `safeStartPositions` auf; sendet `game_init` an alle Clients
    - `getState()` implementieren
    - _Anforderungen: 3.1, 3.2_

  - [x] 5.2 Countdown-Sequenz implementieren
    - `start()` startet 3-Sekunden-Countdown; sendet `countdown`-Nachrichten mit Werten 3, 2, 1, 0 sekündlich an alle Clients
    - Bei Countdown-Wert 0: Zustand auf `active` setzen, Spielschleife starten
    - _Anforderungen: 3.3, 3.4_

  - [ ]* 5.3 Eigenschaftstest für Zustandsübergang nach Countdown schreiben (`room.test.js`)
    - **Eigenschaft 4: Zustandsübergang nach Countdown**
    - **Validiert: Anforderungen 3.4**

  - [x] 5.4 60-Hz-Spielschleife mit Eingabeverarbeitung implementieren
    - `setInterval`-Schleife mit 1000/60 ms Intervall; `dt` aus tatsächlicher Zeitdifferenz berechnen
    - Pro Tick: `lastInput` jedes lebenden Spielers anwenden (Standard `"none"`), `tickPlayer` aufrufen, `checkCollisions` aufrufen
    - Eingaben außerhalb des `active`-Zustands ignorieren; `lastInput` ausgeschiedener Spieler ignorieren
    - `game_state`-Nachricht an alle Clients (auch ausgeschiedene) senden
    - _Anforderungen: 4.1, 4.2, 4.3, 5.3, 6.1, 6.4_

  - [ ]* 5.5 Eigenschaftstest für Eingabe-Persistenz schreiben (`room.test.js`)
    - **Eigenschaft 10: Eingabe-Persistenz**
    - **Validiert: Anforderungen 5.3**

  - [ ]* 5.6 Eigenschaftstest für Eingaben nur im aktiven Zustand schreiben (`room.test.js`)
    - **Eigenschaft 5: Eingaben nur im aktiven Spielzustand**
    - **Validiert: Anforderungen 3.5, 5.2, 6.3**

  - [ ]* 5.7 Eigenschaftstest für Zustandsupdates an ausgeschiedene Spieler schreiben (`room.test.js`)
    - **Eigenschaft 11: Ausgeschiedene Spieler erhalten weiterhin Zustandsupdates**
    - **Validiert: Anforderungen 6.1, 6.4**

  - [x] 5.8 Spielende-Logik implementieren
    - Nach jedem Tick prüfen: genau 1 lebender Spieler → `game_over` mit dessen ID senden; 0 lebende Spieler → `game_over` mit `winnerId: null` senden
    - Spielschleife stoppen, Zustand auf `finished` setzen
    - _Anforderungen: 7.1, 7.2, 8.3_

  - [ ]* 5.9 Eigenschaftstest für Spielende bei einem aktiven Spieler schreiben (`room.test.js`)
    - **Eigenschaft 12: Spielende bei einem aktiven Spieler**
    - **Validiert: Anforderungen 7.1, 8.3**

  - [ ]* 5.10 Eigenschaftstest für Unentschieden-Bedingung schreiben (`room.test.js`)
    - **Eigenschaft 13: Unentschieden-Bedingung**
    - **Validiert: Anforderungen 7.2**

  - [x] 5.11 Verbindungsabbruch-Behandlung und `destroy` implementieren
    - Bei Verbindungsabbruch eines Spielers: Spieler als `alive: false` markieren, Spielende-Prüfung auslösen
    - `destroy()`: Spielschleife stoppen, alle Timer freigeben, alle Referenzen löschen
    - Wenn alle Spieler getrennt sind (auch im `waiting`-Zustand): `destroy()` aufrufen
    - _Anforderungen: 8.1, 8.2, 8.4_

  - [ ]* 5.12 Eigenschaftstest für Raumbereinigung bei vollständigem Verbindungsabbruch schreiben (`room.test.js`)
    - **Eigenschaft 14: Raumbereinigung bei vollständigem Verbindungsabbruch**
    - **Validiert: Anforderungen 8.4**

- [ ] 6. Checkpoint – Alle Server-Tests bestehen
  - Alle Tests in `matchmaking.test.js` und `room.test.js` ausführen und sicherstellen, dass sie grün sind. Bei Fragen den Nutzer ansprechen.

- [x] 7. Server-Einstiegspunkt implementieren (`server/index.js`)
  - [x] 7.1 HTTP-Server und WebSocket-Server verdrahten
    - `http.createServer` mit minimalem Request-Handler (statische Dateien aus `client/` und `game/` ausliefern) erstellen
    - `ws.Server` an den HTTP-Server anhängen
    - Port aus `process.env.PORT` lesen, Standardwert `8080`
    - _Anforderungen: 10.1, 10.3_

  - [x] 7.2 WebSocket-Verbindungshandler und Nachrichtenrouting implementieren
    - Bei neuer Verbindung: `playerId` per `uuid` generieren
    - Eingehende Nachrichten parsen und routen: `join_queue` → `matchmaking.addPlayer`, `leave_queue` → `matchmaking.removePlayer`, `input` → `lastInput` des Spielers im aktiven Raum setzen
    - Ungültige Nachrichten ignorieren (kein Verbindungsabbruch)
    - Bei Verbindungsabbruch: `matchmaking.removePlayer` und ggf. `room.handleDisconnect` aufrufen
    - _Anforderungen: 2.1, 2.5, 4.2, 5.1, 5.2_

  - [x] 7.3 Fehlerbehandlung pro Spielraum implementieren
    - Unbehandelte Fehler in einem Raum abfangen: `error`-Nachricht an alle Clients des Raums senden, Raum schließen, andere Räume unberührt lassen
    - _Anforderungen: 10.5_

  - [ ]* 7.4 Unit-Test für PORT-Umgebungsvariable schreiben (`server.test.js`)
    - Sicherstellen, dass der Server `process.env.PORT` liest und auf dem konfigurierten Port lauscht
    - _Anforderungen: 10.3_

- [x] 8. Multiplayer-Client implementieren (`client/multiplayer.html`)
  - [x] 8.1 Hauptmenü mit "Spiel suchen"-Button implementieren
    - HTML-Grundstruktur mit Canvas und UI-Overlays (Hauptmenü, Warteraum, Spielansicht, Ergebnisbildschirm) erstellen
    - "Spiel suchen"-Button: WebSocket-Verbindung herstellen, bei Fehler Fehlermeldung anzeigen und im Hauptmenü bleiben
    - _Anforderungen: 1.1, 1.2, 1.3_

  - [x] 8.2 Warteraum-Ansicht implementieren
    - `queue_update`-Nachrichten empfangen und Spielerzahl anzeigen (z. B. "3 / 5 Spieler")
    - "Abbrechen"-Button: `leave_queue` senden, WebSocket trennen, zum Hauptmenü zurückkehren
    - _Anforderungen: 2.2, 2.6_

  - [x] 8.3 Spielstart-Sequenz und Kartenvorschau implementieren
    - `game_init`-Nachricht verarbeiten: Karte mit Hindernissen und allen 5 Spielerpunkten auf Canvas rendern
    - `countdown`-Nachrichten empfangen und Countdown-Wert anzeigen; Eingaben während Countdown ignorieren
    - _Anforderungen: 3.2, 3.3, 3.5_

  - [x] 8.4 Spielzustand rendern und HUD implementieren
    - `game_state`-Nachrichten empfangen: alle Spielerpunkte, Trails und Hindernisse auf Canvas zeichnen
    - HUD anzeigen: eigene Geschwindigkeit, eigene Höchstgeschwindigkeit, vergangene Spielzeit (`elapsedMs`), Anzahl aktiver Spieler (`activeCount`)
    - Eingaben (Pfeiltasten) erfassen und `input`-Nachrichten senden; nur während `active`-Zustand
    - _Anforderungen: 4.7, 5.1, 5.2, 9.1, 9.2, 9.3, 9.4_

  - [x] 8.5 Ausscheiden und Zuschauer-Modus implementieren
    - Wenn eigener Spieler `alive: false`: Spielerpunkt als inaktiv darstellen, Hinweis "Du schaust zu" anzeigen, Eingaben ignorieren
    - _Anforderungen: 6.2, 6.3_

  - [x] 8.6 Ergebnisbildschirm implementieren
    - `game_over`-Nachricht verarbeiten: Gewinner-Name oder "Unentschieden" und Spielzeit anzeigen
    - "Erneut spielen"-Button: `join_queue` senden, zurück in Warteraum
    - "Hauptmenü"-Button: WebSocket trennen, zum Hauptmenü zurückkehren
    - _Anforderungen: 7.3, 7.4, 7.5_

  - [ ]* 8.7 Eigenschaftstest für HUD-Datenkorrektheit schreiben (`client.test.js`)
    - **Eigenschaft 15: HUD-Datenkorrektheit**
    - **Validiert: Anforderungen 9.1, 9.2, 9.3, 9.4**

  - [ ]* 8.8 Unit-Tests für Client-Interaktionen schreiben (`client.test.js`)
    - Hauptmenü-Button öffnet Warteraum bei erfolgreicher Verbindung
    - WebSocket-Verbindungsfehler zeigt Fehlermeldung und bleibt im Hauptmenü
    - Ergebnisbildschirm-Buttons ("Erneut spielen", "Hauptmenü") funktionieren korrekt
    - _Anforderungen: 1.2, 1.3, 7.4, 7.5_

- [x] 9. Deployment-Konfiguration erstellen
  - `render.yaml` mit Service-Definition erstellen: `type: web`, `env: node`, `buildCommand: npm install`, `startCommand: node server/index.js`, `envVars: PORT`
  - `.gitignore` für `node_modules/` anlegen
  - _Anforderungen: 10.2_

- [ ] 10. Abschluss-Checkpoint – Alle Tests bestehen und Komponenten sind verdrahtet
  - Alle Tests ausführen (`npm test`). Sicherstellen, dass Server, Matchmaking, Physik und Client korrekt zusammenarbeiten. Bei Fragen den Nutzer ansprechen.

## Hinweise

- Aufgaben mit `*` sind optional und können für ein schnelleres MVP übersprungen werden
- Jede Aufgabe referenziert spezifische Anforderungen zur Rückverfolgbarkeit
- Eigenschaftstests validieren universelle Korrektheitseigenschaften aus dem Design-Dokument
- Unit-Tests validieren konkrete Beispiele und Randfälle
- Checkpoints stellen inkrementelle Validierung sicher
