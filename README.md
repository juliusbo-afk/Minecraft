# BLOCKBOUND ULTIMATE – Alpha 4.0

**Eigenständiges voxelbasiertes 3D-Browserspiel, inspiriert von den Spielprinzipien klassischer Sandbox-Spiele.** Der Code und die zur Laufzeit prozedural erzeugten Pixeltexturen sind eigenständig. Dies ist **kein offizielles Minecraft-Produkt** und **kein vollständiger 1:1-Nachbau**.

> **Status:** Nutzbare technische Alpha mit Rissanimationen und 3D-Item-Drops. Weltgenerator, dedizierter Multiplayer-Server und Protokoll wurden automatisiert getestet. Ein vollständiger grafischer Browsertest und vollständige Gameplay-Abnahme stehen noch aus. [Genaue Feature-Matrix](docs/FEATURES.md).

## Direkt starten – Windows

1. Das ZIP vollständig entpacken.
2. [Node.js 20 oder neuer](https://nodejs.org/) installieren.
3. `START_WINDOWS.bat` doppelklicken.
4. Im Browser **http://localhost:3000** öffnen.
5. Weltname und optionalen Seed eingeben, **Überleben** oder **Kreativ** auswählen, **Einzelspieler** wählen und **WELT SPIELEN** klicken.

Der erste Browserstart muss die Three.js-Bibliothek von einem CDN laden (mit Ersatz-CDN bei Ausfall); dazu wird Internet benötigt. Der Node.js-Server selbst benötigt keine weiteren npm-Abhängigkeiten.

### Linux / macOS

```bash
chmod +x START_LINUX.sh
./START_LINUX.sh
```

Oder plattformunabhängig:

```bash
node server/index.js
```

Die Clientdatei direkt über `file://` zu öffnen, ist nicht empfohlen: ES-Module können dort an den Browser-Sicherheitsregeln scheitern. Verwende den integrierten HTTP-Server.

## Spielmechaniken dieser Alpha

- Frei wählbare Seeds; ohne Eingabe wird ein zufälliger Seed erzeugt.
- Deterministische Weltgenerierung für positive und negative Koordinaten mit 16×16 horizontalen Chunks.
- Zwölf generierbare Biome mit variierender Landhöhe, Wüsten-/Schneeoberflächen, Bäumen, Höhlen und Erzvorkommen.
- Dynamisches Laden und Freigeben von Chunks; detailliertere eigene Pixeltexturen mit Materialmustern, zusätzlicher Eckabschattung, Wolken, verbessertem Sonnenlicht und weichen Schatten.
- Beim fortlaufenden Abbauen erscheint eine 10-stufige Rissanimation direkt auf dem Block; beim Zerstören entstehen Partikel.
- Survival-Drops werden als kleine 3D-Gegenstände in der Welt dargestellt, fallen sichtbar herab und drehen/schweben knapp über dem Boden.
- **Einsammeln:** Erst über den Drop laufen; erst danach erscheint das Item im Inventar. Volle Inventare lassen Drops liegen.
- Im Multiplayer werden Drops serverseitig verwaltet, bei Beitritt übertragen, beim Einsammeln nur einmal vergeben und zusammen mit der Welt gespeichert.
- Kreativmodus mit unbegrenzter Auswahl, schnellem Blockabbau und Fliegen.
- Survival-Grundmechaniken: Lebenspunkte, Hunger, Untertauchen, Fallschaden, Werkzeugstufen, Haltbarkeit, Crafting-Rezeptauswahl, einfache Ofen-Rezepte und Respawn.
- 36 Inventarplätze, 9 Hotbar-Slots, Welt-Speicherung im Browser, Anzeige und Löschen gespeicherter Welten.
- Node.js-Multiplayer mit Spielerpositionen, Chat, gemeinsamer Blockwelt, serverseitiger Abbauzeit-/Reichweitenkontrolle, serverseitigem Inventar für Abbau/Platzieren/Crafting, automatischem Speichern und Neustart-Wiederherstellung.

### Steuerung

| Taste | Aktion |
|---|---|
| W A S D | Bewegen |
| Maus | Umschauen |
| Leertaste | Springen; doppelt im Kreativmodus zum Flugwechsel |
| Shift | Sprinten (beim Fliegen nach unten) |
| Strg | Langsam bewegen |
| Linksklick halten | Block mit fortschreitenden Rissen abbauen |
| Über liegende Items laufen | Einsammeln ins Inventar |
| Rechtsklick | Block platzieren / interagieren |
| 1–9 / Mausrad | Hotbar |
| E | Inventar und Rezeptauswahl |
| R | Essen, falls Nahrung ausgewählt |
| T | Multiplayer-Chat |
| F | Flugmodus (nur Kreativ) |
| F3 | Zusatzinformationen |
| Esc | Pausenmenü |

**Hinweis zu Survival:** In dieser Alpha werden abgebauten Blöcke als 3D-Drops dargestellt und erst beim Darüberlaufen ins Inventar aufgenommen. Die Drop-Physik ist vereinfacht; es gibt noch keine vollständige Mob-Simulation. Die Werkbank muss in der Nähe aufgestellt sein, um Werkbank-Rezepte herzustellen. Der Ofen führt aktuell vereinfachte Sofort-Rezepte aus (keine laufende Brennstoffzeit-Simulation).

## Multiplayer im selben WLAN

1. Einen Computer als Server benutzen und `START_WINDOWS.bat` starten.
2. Auf allen Computern die Website öffnen: `http://SERVER-IP:3000`.
3. **Multiplayer** auswählen.
4. Als WebSocket-Adresse `ws://SERVER-IP:3000/ws` eingeben.
5. Auf allen Geräten denselben **Weltnamen** und **Spielmodus** verwenden; der Seed der zuerst erstellten Serverwelt gilt für alle.
6. Unterschiedliche Spielernamen benutzen.

Port 3000 muss in der Firewall für das lokale Netzwerk freigegeben sein. Die serverseitigen Speicherstände liegen standardmäßig unter `saves/`.

### Online-Multiplayer außerhalb des WLANs

GitHub Pages hostet **nur** die statische Client-Website, **nicht** den WebSocket-/Node.js-Server. Für weltweiten Mehrspielermodus brauchst du einen dauerhaft erreichbaren Node.js-Server oder einen Container-Host mit **WebSockets, dauerhaftem Dateispeicher und HTTPS**. Der Client verbindet sich dann mit `wss://DEINE-DOMAIN/ws`.

**Sicherheit:** Das Spiel besitzt derzeit **kein persönliches Kontosystem**, keine verifizierte Identität und nur grundlegende Missbrauchsbegrenzungen. Ein öffentlich erreichbarer Server sollte zunächst nur mit vertrauten Mitspielern genutzt werden. `ALLOWED_ORIGINS` ist lediglich ein Browser-Originfilter und ersetzt keine Authentifizierung. Für produktive öffentliche Communities sind Authentifizierung, Rollenverwaltung, Härtung, Backups und Monitoring noch zu entwickeln.

Umgebungsvariablen für den Server:

```bash
PORT=3000 HOST=0.0.0.0 SAVE_DIR=./saves node server/index.js
```

Optional kann `ALLOWED_ORIGINS` als kommaseparierte Liste zugelassener Browser-Origins gesetzt werden, z. B. `https://juliusbo-afk.github.io`.

### Beispiel mit Docker

```bash
docker build -t blockbound-ultimate .
docker run -d --name blockbound -p 3000:3000 -v blockbound-worlds:/data blockbound-ultimate
```

Ein HTTPS-Reverse-Proxy (etwa Caddy oder Nginx) muss WSS an den Node.js-Server weiterleiten. Ohne TLS kann eine über HTTPS geladene GitHub-Pages-Website keine reguläre unsichere `ws://`-Verbindung zu einem externen Host nutzen.

## GitHub Pages

Die Projektstruktur ist **bewusst statisch auslieferbar**. Falls das Projekt in deinem Repository `juliusbo-afk/Minecraft` liegt:

1. Alle Projektdateien ins Repository hochladen (Root `index.html`, Ordner `client`, `shared`, `server`, etc.).
2. GitHub **Settings → Pages → Deploy from a branch → main → /(root)** wählen.
3. Die Seite unter `https://juliusbo-afk.github.io/Minecraft/` öffnen (nach Aktivierung der Veröffentlichung).
4. Für Solo den Einzelspieler-Modus verwenden; für online Multiplayer zusätzlich einen separaten WSS-Server betreiben und dessen Adresse in der Spieloberfläche eingeben.

Der Root-`index.html` leitet auf `client/index.html` weiter. Die ES-Module laden gemeinsame Dateien aus `shared/`. Die Grafikeinbindung benötigt weiterhin das externe Three.js-CDN.

## Verzeichnisstruktur

```text
BLOCKBOUND_ULTIMATE/
  index.html           Weiterleitung für GitHub Pages
  client/
    index.html         Menü und HUD
    styles/main.css    Layout und responsive Darstellung
    src/main.js        Browser-Spielschleife/Rendering/Gameplay
  shared/
    registry.js        Blöcke, Werkzeuge, Rezepte, Biome
    worldgen.js        Gemeinsame deterministische Terrain-Logik
  server/
    index.js           Node HTTP + WebSocket + Welt-Persistenz
  tests/               Generator- und Multiplayer-Integrationstests
  docs/                Architektur und Status
  Dockerfile
  START_WINDOWS.bat
  START_LINUX.sh
  package.json
```

## Tests

```bash
npm run check
npm test
```

Tests laufen unter Node.js 20+. Eine Three.js-Browsertestsuite ist aktuell noch nicht abgeschlossen. Es wurde nur überprüft, dass die statischen Ressourcen über den HTTP-Server ausgeliefert werden.

## Bekannte Einschränkungen

- Kein vollständiges Crafting-Grid mit Drag-and-drop: die Crafting-Rezepte werden über eine interaktive Rezeptliste angewählt.
- Es fehlen Mobs, Tier-KI, Kampfsystem, Villages, Redstone-Schaltungen, Portale und mehrere Dimensionen.
- Kein vollständig simulierter Wasser-/Lavastrom; vereinfachte Schwerkraft für Sand/Kies.
- Keine vollständig autoritative serverseitige Physik für Spielerposition, Gesundheit und Hunger; der Server prüft für Bau- und Inventaraktionen mehr als die Vorversion.
- Keine Kontenauthentifizierung oder Server-Rollenverwaltung.
- Weltgenerierung, Blockwerte und Mechaniken sind eine eigene Annäherung an Minecraft Java Edition, **nicht identisch** mit dessen Welten, Updates oder Originalphysik.
- Einzelspieler-Speicherstände verwenden derzeit localStorage, nicht IndexedDB; bei sehr großen Welten kann das Speicherlimit erreicht werden.
- Die 3D-Bibliothek wird extern geladen. Ohne Browser-Internetzugang funktioniert das 3D-Spiel nicht.
- Die verbesserte Grafik ist stilisierte Voxel-Pixelgrafik, keine fotorealistische Grafik; große sichtbare Schatten können die Bildrate reduzieren.
- Der Browserstart wurde nicht vollständig visuell abgenommen; unter einzelnen Grafiktreibern oder Browsern können zusätzliche Fehler auftreten.

## Entwicklungsstand

Referenz für die konzeptionelle Ausrichtung ist **Minecraft Java Edition 1.20.1**; keine kommerzielle, technische oder markenrechtliche Verbindung. Genauere Statusangaben: [Feature-Matrix](docs/FEATURES.md), [Architektur](docs/ARCHITECTURE.md), [Testbericht](docs/TESTS.md).
