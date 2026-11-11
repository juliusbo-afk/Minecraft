# Einladungslink: gemeinsam im Internet spielen

## Warum GitHub Pages allein nicht genügt

GitHub Pages stellt nur HTML/CSS/JS bereit. Ein gemeinsamer Spielstand braucht den laufenden Node.js-WebSocket-Server (`server/index.js`). Dieser braucht einen öffentlich erreichbaren HTTPS/WSS-Host.

## Render: Test-Deployment mit wenigen Klicks

[Projekt zu Render übertragen](https://render.com/deploy?repo=https://github.com/juliusbo-afk/Minecraft)

1. Bei Render anmelden und das Deployment des `render.yaml` aus dem GitHub-Repository bestätigen.
2. Den Start des Web Services und den `/health`-Endpunkt prüfen.
3. Die ausgegebene HTTPS-Adresse (z. B. `https://DEIN-SERVICE.onrender.com/`) im Browser öffnen.
4. Im Spiel **Multiplayer**, **Weltname** und **Survival/Kreativ** wählen. Die Serveradresse wird auf derselben Render-Webseite automatisch erkannt.
5. Nach dem Beitritt **🔗 Einladungslink kopieren** wählen und deinem Freund schicken.
6. Dein Freund öffnet den Link und wird automatisch mit demselben Raum, Modus und Server verbunden. Zum Steuern klickt er einmal auf das Spielfeld.

Eine alternative Möglichkeit: Den Client auf GitHub Pages geöffnet lassen und bei Multiplayer als Serveradresse `wss://DEIN-SERVICE.onrender.com/ws` eintragen. Der Einladungslink enthält diese öffentliche Adresse automatisch.

**Achtung!** Das kostenlose Render-Web-Service-Hosting hat **keinen dauerhaften lokalen Speicher**. Die Server-Weltdateien werden bei Sleep/Neustart/Neuveröffentlichung möglicherweise gelöscht. Teste nicht mit unersetzlichen Welten. Für langfristige Welten braucht der Node.js-Server einen Hostingdienst mit **persistentem Speicher**, z. B. eine kostenpflichtige Render-Instanz mit Disk-Mount und `SAVE_DIR` auf dem Datenträger, oder eine externe Datenbank und entsprechende Serveranpassung.

Render kostenlos kann nach Inaktivität einschlafen. Die erste Verbindung benötigt dann einen Neustart des Dienstes und kann verzögert sein. Der Gastgeber muss außerdem beachten, dass öffentliche Räume in dieser Alpha nicht durch Login/Einladungstoken geschützt sind. Der Link stellt eine **bequeme Verbindungsadresse, keine Zugangskontrolle** dar; verwende diese Alpha zunächst mit vertrauten Freunden.

## Lokal und über WLAN

Lokal: `npm start` und `http://localhost:3000/` öffnen; der Server wird automatisch erkannt. Der Link kopieren-Button verweigert ausdrücklich eine vermeintlich öffentliche Einladung über `localhost` oder private WLAN-Adressen.

## Änderungen v6

- Doppel-W-Sprint: zweimal rasch W drücken (max. 320 ms zwischen Loslassen und erneutem Drücken), W gedrückt halten. Loslassen beendet den Sprint.
- Weiterhin Shift-Sprint als alternative Eingabe.
- Beim Chunk-Meshing maximal ein Chunk pro Animationsframe; weniger Ambient-Occlusion-Nachbarabfragen für entfernte Chunks.
- Niedrigere maximale Pixelratio und adaptive Absenkung bei dauerhaft niedriger FPS; reduzierte Schattenkarte.
- Reiner URL-Parser und Generator für öffentliche Multiplayer-Einladungen inklusive Tests.
