# Anforderungsdokument: Curve Racer Multiplayer

## Einleitung

Curve Racer ist ein browserbasiertes Einzelspieler-Rennspiel, bei dem ein roter Spielerpunkt mit Pfeiltasten gesteuert wird. Ziel ist es, alle 15 Bots durch geschickte Kollisionen zu eliminieren. Die Physik basiert auf Geschwindigkeit: Beschleunigung ohne Tastendruck, Verlangsamung beim Lenken, und der Wendekreis wächst quadratisch mit der Geschwindigkeit.

Dieses Feature erweitert Curve Racer um einen Online-Mehrspielermodus. Spieler können über einen "Spiel suchen"-Button einer Warteschlange beitreten, auf 5 Mitspieler warten und dann in Echtzeit gegeneinander antreten. Die Spiellogik läuft server-autoritativ auf einem Node.js-Server; Clients senden nur Eingaben und empfangen den Spielzustand.

## Glossar

- **Client**: Der Browser des Spielers, der das Spiel darstellt und Eingaben sendet
- **Server**: Der Node.js-WebSocket-Server, der die autoritative Spiellogik ausführt
- **Spieler**: Ein menschlicher Teilnehmer im Mehrspielermodus
- **Spielraum**: Eine Instanz einer Mehrspielersitzung mit genau 5 Spielern
- **Warteschlange**: Der serverseitige Pool wartender Spieler vor Spielbeginn
- **Warteraum**: Die clientseitige Ansicht während des Wartens auf Mitspieler
- **Spielzustand**: Der vollständige, vom Server verwaltete Zustand aller Spielobjekte (Positionen, Geschwindigkeiten, Trails, Status)
- **Eingabe**: Die vom Client gesendete Steuerungsinformation (links/rechts/keine Taste)
- **Tick**: Ein einzelner Simulationsschritt des Servers (Zielrate: 60 Hz)
- **Trail**: Die leuchtende Spur, die jeder Spielerpunkt hinterlässt
- **Kollision**: Das Aufeinandertreffen zweier Spielerpunkte oder eines Punktes mit einem Hindernis
- **Hindernis**: Eines von 20 zufällig platzierten, nicht überlappenden Objekten auf der Karte
- **Matchmaking**: Der Prozess des Zusammenführens von Spielern zu einem Spielraum

## Anforderungen

### Anforderung 1: Hauptmenü-Einstiegspunkt

**User Story:** Als Spieler möchte ich vom Hauptmenü aus einen Mehrspielermodus starten können, damit ich gegen andere echte Spieler antreten kann.

#### Akzeptanzkriterien

1. THE Client SHALL einen "Spiel suchen"-Button im Hauptmenü anzeigen, der neben dem bestehenden Einzelspieler-Start sichtbar ist.
2. WHEN der Spieler den "Spiel suchen"-Button klickt, THE Client SHALL eine WebSocket-Verbindung zum Server herstellen und den Warteraum anzeigen.
3. IF die WebSocket-Verbindung fehlschlägt, THEN THE Client SHALL eine Fehlermeldung anzeigen und den Spieler im Hauptmenü belassen.

---

### Anforderung 2: Matchmaking und Warteraum

**User Story:** Als Spieler möchte ich in einem Warteraum warten, bis genug Mitspieler gefunden wurden, damit das Spiel mit einer vollständigen Gruppe startet.

#### Akzeptanzkriterien

1. WHEN ein Spieler die Warteschlange betritt, THE Server SHALL den Spieler der globalen Warteschlange hinzufügen.
2. WHILE ein Spieler in der Warteschlange wartet, THE Client SHALL die aktuelle Anzahl verbundener wartender Spieler anzeigen (z. B. "3 / 5 Spieler").
3. WHEN die Warteschlange genau 5 Spieler enthält, THE Server SHALL einen neuen Spielraum erstellen, alle 5 Spieler diesem Raum zuweisen und den Spielstart einleiten.
4. THE Server SHALL jedem Spielraum eine eindeutige Karte mit 20 zufällig platzierten, nicht überlappenden Hindernissen zuweisen.
5. WHEN ein wartender Spieler die Verbindung trennt, THE Server SHALL den Spieler aus der Warteschlange entfernen und die angezeigte Spielerzahl aktualisieren.
6. THE Client SHALL einen "Abbrechen"-Button im Warteraum anzeigen, der den Spieler aus der Warteschlange entfernt und zum Hauptmenü zurückführt.

---

### Anforderung 3: Spielstart-Sequenz

**User Story:** Als Spieler möchte ich vor dem Spielstart eine Vorschau der Karte und einen Countdown sehen, damit ich mich auf das Spiel vorbereiten kann.

#### Akzeptanzkriterien

1. WHEN ein Spielraum erstellt wird, THE Server SHALL die Startpositionen aller 5 Spieler berechnen und an alle Clients im Raum senden.
2. WHEN der Client die Startdaten empfängt, THE Client SHALL die Kartenvorschau mit allen 5 Spielerpunkten und Hindernissen anzeigen.
3. THE Server SHALL nach dem Senden der Startdaten einen 3-Sekunden-Countdown starten und den aktuellen Countdown-Wert sekündlich an alle Clients senden.
4. WHEN der Countdown abläuft, THE Server SHALL den Spielzustand auf "aktiv" setzen und die Spielsimulation starten.
5. WHILE der Countdown läuft, THE Client SHALL Eingaben des Spielers ignorieren und den Countdown-Wert anzeigen.

---

### Anforderung 4: Server-autoritative Spielsimulation

**User Story:** Als Spieler möchte ich, dass die Spiellogik fair und manipulationssicher auf dem Server läuft, damit kein Spieler durch Client-seitige Manipulation Vorteile erlangt.

#### Akzeptanzkriterien

1. THE Server SHALL die Spielsimulation mit einer Rate von 60 Ticks pro Sekunde ausführen.
2. WHEN ein Client eine Eingabe sendet, THE Server SHALL die Eingabe dem entsprechenden Spieler zuordnen und im nächsten Tick anwenden.
3. THE Server SHALL nach jedem Tick den vollständigen Spielzustand (Positionen, Geschwindigkeiten, Trail-Längen, Spielerstatus) an alle Clients im Raum senden.
4. THE Server SHALL die Physikregeln des Einzelspielermodus anwenden: Beschleunigung verdoppelt sich alle 8 Sekunden ohne Tastendruck, Geschwindigkeit halbiert sich alle 5 Sekunden beim Lenken, Wendekreis wächst quadratisch mit der Geschwindigkeit.
5. THE Server SHALL Kollisionen zwischen Spielerpunkten nach der Geschwindigkeitsregel auflösen: der schnellere Spieler überlebt, der langsamere scheidet aus.
6. WHEN ein Spielerpunkt ein Hindernis berührt, THE Server SHALL diesen Spieler als ausgeschieden markieren.
7. THE Client SHALL ausschließlich den vom Server empfangenen Spielzustand rendern und keine eigene Physikberechnung durchführen.

---

### Anforderung 5: Eingabeübertragung

**User Story:** Als Spieler möchte ich, dass meine Tastatureingaben zuverlässig zum Server übertragen werden, damit mein Spielerpunkt korrekt gesteuert wird.

#### Akzeptanzkriterien

1. WHEN der Spieler die linke oder rechte Pfeiltaste drückt oder loslässt, THE Client SHALL eine Eingabenachricht mit dem aktuellen Tastenzustand (links/rechts/keine) über WebSocket an den Server senden.
2. THE Client SHALL Eingaben nur während eines aktiven Spiels senden (nicht während Countdown, Warteraum oder Ergebnisbildschirm).
3. THE Server SHALL die zuletzt empfangene Eingabe eines Spielers verwenden, wenn innerhalb eines Ticks keine neue Eingabe eintrifft.

---

### Anforderung 6: Spieler-Ausscheiden und Zuschauen

**User Story:** Als ausgeschiedener Spieler möchte ich das laufende Spiel weiter beobachten können, damit ich den Ausgang mitverfolgen kann.

#### Akzeptanzkriterien

1. WHEN ein Spieler ausscheidet, THE Server SHALL den Spieler als "ausgeschieden" markieren und weiterhin den Spielzustand an diesen Client senden.
2. WHEN ein Spieler ausscheidet, THE Client SHALL den eigenen Spielerpunkt als inaktiv darstellen und einen Hinweis anzeigen, dass der Spieler zuschaut.
3. WHILE ein ausgeschiedener Spieler zuschaut, THE Client SHALL die Eingaben des Spielers ignorieren.
4. THE Server SHALL den Spielzustand weiterhin an ausgeschiedene Spieler senden, bis das Spiel endet.

---

### Anforderung 7: Spielende und Ergebnisbildschirm

**User Story:** Als Spieler möchte ich nach dem Spielende einen Ergebnisbildschirm sehen und die Möglichkeit haben, erneut zu spielen, damit das Spielerlebnis flüssig weitergeht.

#### Akzeptanzkriterien

1. WHEN nur noch ein Spieler aktiv ist, THE Server SHALL das Spiel beenden, den verbleibenden Spieler als Gewinner markieren und das Spielergebnis an alle Clients senden.
2. WHEN alle Spieler ausgeschieden sind ohne einen Überlebenden (z. B. gleichzeitige Kollision), THE Server SHALL das Spiel als unentschieden beenden und alle Clients informieren.
3. WHEN der Client das Spielergebnis empfängt, THE Client SHALL einen Ergebnisbildschirm mit dem Namen des Gewinners (oder "Unentschieden") und der Spielzeit anzeigen.
4. THE Client SHALL auf dem Ergebnisbildschirm einen "Erneut spielen"-Button anzeigen, der den Spieler zurück in die Warteschlange führt.
5. THE Client SHALL auf dem Ergebnisbildschirm einen "Hauptmenü"-Button anzeigen, der den Spieler zum Hauptmenü zurückführt und die WebSocket-Verbindung trennt.

---

### Anforderung 8: Verbindungsabbruch während des Spiels

**User Story:** Als Spieler möchte ich, dass das Spiel mit einem Verbindungsabbruch eines Mitspielers umgehen kann, damit das Spiel nicht für alle anderen abbricht.

#### Akzeptanzkriterien

1. WHEN ein Spieler während eines aktiven Spiels die Verbindung verliert, THE Server SHALL diesen Spieler sofort als ausgeschieden markieren.
2. WHEN ein Spieler die Verbindung verliert, THE Server SHALL alle verbleibenden Clients über das Ausscheiden dieses Spielers informieren.
3. IF nach einem Verbindungsabbruch nur noch ein aktiver Spieler verbleibt, THEN THE Server SHALL diesen Spieler als Gewinner erklären und das Spiel beenden.
4. IF alle verbleibenden Spieler die Verbindung verlieren, THEN THE Server SHALL den Spielraum schließen und alle Ressourcen freigeben.

---

### Anforderung 9: HUD im Mehrspielermodus

**User Story:** Als Spieler möchte ich während des Spiels relevante Informationen sehen, damit ich meinen Spielstand einschätzen kann.

#### Akzeptanzkriterien

1. WHILE ein Spiel aktiv ist, THE Client SHALL die aktuelle Geschwindigkeit des eigenen Spielers anzeigen.
2. WHILE ein Spiel aktiv ist, THE Client SHALL die Höchstgeschwindigkeit des eigenen Spielers in dieser Runde anzeigen.
3. WHILE ein Spiel aktiv ist, THE Client SHALL die vergangene Spielzeit anzeigen.
4. WHILE ein Spiel aktiv ist, THE Client SHALL die Anzahl der noch aktiven Spieler anzeigen.

---

### Anforderung 10: Server-Infrastruktur und Deployment

**User Story:** Als Entwickler möchte ich den Multiplayer-Server einfach deployen können, damit der Dienst für Spieler erreichbar ist.

#### Akzeptanzkriterien

1. THE Server SHALL als Node.js-Anwendung mit dem `ws`-Paket für WebSocket-Kommunikation implementiert werden.
2. THE Server SHALL auf Plattformen wie Railway, Render oder Fly.io deploybar sein.
3. THE Server SHALL den Port aus der Umgebungsvariable `PORT` lesen, mit einem Standardwert von `8080`.
4. THE Server SHALL mehrere gleichzeitige Spielräume verwalten können, ohne dass sich diese gegenseitig beeinflussen.
5. IF ein unbehandelter Fehler in einem Spielraum auftritt, THEN THE Server SHALL den betroffenen Spielraum schließen und alle Clients dieses Raums benachrichtigen, ohne andere Spielräume zu beeinträchtigen.
