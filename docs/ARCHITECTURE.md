# Architektur – Alpha 3.0

## Referenz und Grenzen

Konzeptionelle Referenz: Minecraft Java Edition 1.20.1. Das Spiel ist eine eigenständig programmierte Annäherung ohne Mojang-Quellcode und Original-Assets. Einige Regeln und Zahlen sind bewusst vereinfacht.

## Datenfluss

```text
Browser 1  ── WSS ──┐
                    ├── Node.js-Server ── Welt / Spieler-Profile ── Atomare JSON-Datei
Browser 2  ── WSS ──┘         │
                              └── shared/registry + shared/worldgen
Browser 1 ── shared/registry + shared/worldgen (identischer Seed)
Browser 2 ── shared/registry + shared/worldgen (identischer Seed)
```

Die **Weltgenerierung** ist in `shared/worldgen.js` definiert und wird sowohl im Browser als auch auf dem Server importiert. Der Algorithmus verwendet mehrere Seed-abhängige 2D-/3D-Noise-Funktionen, Kontinentalität, Höhe, Feuchtigkeit und Temperatur. Eine Chunkposition erzeugt unabhängig von der Generierungsreihenfolge denselben Chunk.

## Datenmodell

- `B`: numerische Block-IDs.
- `BLOCKS`: Härte, Werkzeugtyp, Stufe, Kollisionsverhalten und Texturindex.
- `RECIPES`, `TOOLS`, `MATERIALS`: gemeinsames Register für Crafting und Inventar.
- `seed`: signierter 32-Bit-Wert; Texteingaben werden deterministisch gehasht.
- `edits`: Map `x,y,z -> Block-ID`; unveränderte Blöcke werden aus dem Seed erzeugt.
- `profiles`: servergespeicherte Daten je Spielername pro Raum.

## Serverprotokoll

Alle Nachrichten sind JSON-Objekte mit Feld `t` über WebSocket `.../ws`.

| Nachricht von Client | Wirkung | Prüfung |
|---|---|---|
| `join` | Raum/Spieler betreten | Raum-/Name-Validierung, doppelte Namen nicht zulässig |
| `pos` | Positionsupdate | Wertebereich, Frequenz, grobe Bewegungsbegrenzung |
| `mine_start` | Abbau beginnt | Position, Slot, Reichweite, aktueller Block |
| `mine` | Abbau abschließen | Startzeit, Blockidentität, Dauer, Werkzeug und Reichweite |
| `place` | Block platzieren | Inventar, Reichweite, Kollision, Ersetzungsregeln |
| `craft` | Gegenstand herstellen | Rezept, Materialien, Nähe zur Werkbank |
| `smelt` | Vereinfachtes Schmelzen | Rezept, Kohle, Nähe zum Ofen |
| `swap` | Zwei Inventarplätze tauschen | Serverautoritatives Inventar |
| `eat` | Nahrung essen | Serverseitiger Inventarverbrauch |
| `state` | Gesundheits-/Hungerstatus speichern | Plausibilitätsgrenzen; noch clientautoritativ für diese Werte |
| `chat` | Nachricht | Länge/Spam-Limit |

Servernachrichten: `welcome`, `join`, `leave`, `pos`, `edit`, `inventory`, `chat`, `error`.

## Synchronisation

- Client berechnet aus demselben Seed initial dieselben Naturblöcke.
- Server sendet beim Beitritt alle bisherigen geänderten Blöcke.
- Blockabbau und Platzierung erfolgen erst nach Serverprüfung, anschließend wird `edit` an **alle** Teilnehmer einschließlich des Urhebers gesendet.
- Beim Crafting erhält der Client den neuen Inventar-Snapshot aus `inventory`.
- Der Server schreibt Weltänderungen zeitverzögert atomar über temporäre Datei + Umbenennung.
- Für Weltänderungen gelten Serverlimits. Extreme große Welten benötigen künftig eine Chunk-/Datenbank-Persistenz.

## Sicherheit / bekannte technische Schulden

1. Der Server hat noch keine sichere Nutzerauthentifizierung. Spieler-Profile sind durch den Namen adressiert.
2. Die Positionsphysik, Gesundheit und Hunger werden nicht vollständig auf dem Server simuliert.
3. Der WebSocket-Server implementiert bewusst nur unfragmentierte, maskierte Textframes plus Ping/Pong/Close; diese eingeschränkte Protokollimplementierung ist kein vollwertiger Ersatz für eine langjährig gepflegte Bibliothek.
4. Bei einem großflächigen öffentlichen Betrieb werden SQLite, serverseitige räumliche Abonnements, Bandbreitenbegrenzung und Authentifizierung benötigt.
5. Klimakarten, Erosion und Höhenfunktion sind eigene Näherungen, keine Minecraft-Originalalgorithmen.
6. Browser-3D-Rendering importiert Three.js von einem CDN. Offline-Build mit lokaler Assetkopie wäre eine zukünftige Verbesserung.
