## Alpha 5 – Material- und UI-Upgrade

- Originale prozedurale 32×32-Texturen für Blocktypen: **fertig, Pixeldaten getestet**
- Baumrinde und sichtbare Jahresringe: **fertig, Texturmuster getestet**
- Verschiedene Texturen für Gras-Ober-/Seite und Erdboden: **fertig, Zuordnung getestet**
- Materialgenaue 3D-Inventarsymbole (Hotbar, Inventar, Rezepte): **fertig, Icon-Geometrie geprüft; Browsertest offen**
- Animiertes Wasser mit Shader: **implementiert, WebGL-Grafiktest offen**
- Originaltexturen von Minecraft: **nicht enthalten**, eigenständige Assets

# Feature-Matrix – BLOCKBOUND ULTIMATE Alpha 4.0

**Referenz für die Annäherung:** Minecraft Java Edition 1.20.1. Alle Texturen/Modelle werden eigenständig erstellt. „Fertig“ bedeutet eine implementierte Funktion in dieser eigenständigen Alpha, keine 1:1-Parität mit Minecraft.

| Feature | Status | Einordnung |
|---|---|---|
| HTML-Webclient + Hauptmenü | Teilweise fertig | Client implementiert, visuell nicht vollständig getestet |
| Moduswahl Survival / Kreativ | Teilweise fertig | Beide Modi implementiert, aber nicht alle Originalregeln |
| Seedwahl / zufälliger Seed | Fertig | Gleicher Seed rekonstruiert deterministische Welt |
| Dynamische 16×16-Chunks | Fertig | Chunk-Caching, Nachladen, Entladen |
| Welt mit negativen Koordinaten | Fertig | Automatische Tests bestanden |
| 12 unterschiedliche Biome | Teilweise fertig | Biomzuordnung und Varianten vorhanden, Übergänge vereinfacht |
| Berge / Ozeane / Höhlen | Teilweise fertig | Prozedural, keine Vanilla-Parität |
| Erzadern, Bäume, Vegetation | Teilweise fertig | Einfache, seedbasierte Verfahren |
| Dörfer / Dungeons / Minen | Nicht umgesetzt | Noch offen |
| Blockabbau und Platzierung | Teilweise fertig | Implementiert, visueller Browsertest offen |
| Physik / Kollisionen / Springen | Teilweise fertig | AABB, Gravitation, Fixed-Timestep-Näherung |
| Kreativ-Flugmodus | Teilweise fertig | Vorhanden, grafisch nicht abgenommen |
| Gesundheit / Hunger / Fallschaden | Teilweise fertig | Lokal simuliert, Server noch nicht vollständig autoritativ |
| Schwimmen / Sauerstoff | Teilweise fertig | Vereinfachtes Modell |
| 9 Hotbar-Slots / Inventar | Teilweise fertig | 36 Slots, kein volles Drag-and-drop |
| Item-Drops als 3D-Entitäten | Teilweise fertig | Fallen sichtbar, Schweben/Rotation, Pickup nur bei Nähe; vereinfachte Physik |
| Serverautorisiertes Item-Pickup | Fertig | Nähe, Inventarplatz und einmaliges Einsammeln getestet; persistente Drops |
| Block-Rissanimation | Teilweise fertig | 10 prozedurale Stufen, visueller Browser-Smoke-Test offen |
| Materialtexturen, AO und Schatten | Teilweise fertig | Verbesserte eigene Texturen, per-Vertex-Eckabschattung, PCF-Sonnenschatten, Wolken |
| Werkzeuge / Haltbarkeit / Werkzeugstufen | Teilweise fertig | Grundstufen und Prüfung vorhanden |
| 2×2-/3×3-Crafting-Raster | Nicht umgesetzt | Stattdessen funktioniert eine Rezeptauswahl |
| Crafting/Rezepte | Teilweise fertig | Serverseitig geprüft, begrenztes Rezeptbuch |
| Ofen | Teilweise fertig | Vereinfachte Sofort-Schmelzrezepte |
| Tag/Nacht | Teilweise fertig | Sonne/Beleuchtung angenähert |
| Wetter | Nicht umgesetzt | Keine vollständige Simulation |
| Flüssigkeiten | Teilweise fertig | Stationäre Wasser- und Lavablöcke, keine Strömung |
| Fallender Sand/Kies | Teilweise fertig | Vereinfachte vertikale Block-Nachführung |
| Tiere, Gegner und KI | Nicht umgesetzt | Noch offen |
| Kampf/Rüstung/Erfahrung | Nicht umgesetzt | Noch offen |
| Redstone, Portale, Dimensionen | Nicht umgesetzt | Noch offen |
| Multiplayer über Node.js/WebSocket | Fertig | Verbindung zweier unabhängiger Clients getestet |
| Spielerpositionen + Chat | Fertig | Integrationstest erfolgreich |
| Gemeinsamer Bauzustand | Fertig | Placement/Mining getestet |
| Serverseitige Abbauzeit | Teilweise fertig | Grundcheck nach Startmeldung, noch nicht vollständig cheatfest |
| Serverseitiges Inventar + Crafting | Teilweise fertig | Abbau/Platzierung/Craften serverautorisiert, weitere Prüfungen offen |
| Speicherung nach Neustart | Fertig | Serverseitiger Integrationstest bestanden |
| Einzelspieler-Speicherung | Teilweise fertig | localStorage, Quota-Grenze |
| Mehrere Solo-Welten auswählen/löschen | Teilweise fertig | Weltliste im Hauptmenü |
| GitHub Pages-kompatibler Client | Teilweise fertig | Statisch strukturiert, Deployment noch nicht produktiv getestet |
| HTTPS / WSS in öffentlichem Hosting | Nicht getestet | Konfiguration dokumentiert, kein Live-Deployment |
| Browser-Grafiktest | Nicht getestet | Externes Three.js-CDN in dieser Umgebung nicht erreichbar |

## Priorität der nächsten Iteration

1. Echter Browser-Smoke-Test mit CDN-Zugriff einschließlich Rissanimation, Schatten und 3D-Drops.
2. Serverseitige Spielerphysik und vollständig autoritative Hunger-/Schadensregeln.
3. Raster-Crafting und Drag-and-drop mit sicheren Inventartransaktionen.
4. Speichern großer Welten in IndexedDB, optimierter Chunk-Cache und Greedy-Meshing.
5. Kreaturen und eine serververwaltete Spawn-/KI-Simulation.
6. Vollständige Wasser-/Lavasimulation, Wetter, Blöcke mit Zuständen und Redstone-Grundlagen.
