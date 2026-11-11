# Testbericht – BLOCKBOUND ULTIMATE Alpha 4.0

## Automatisierte Tests

Testumgebung: Node.js 22 unter Linux. Ausführung: `npm run check` und `npm test`.

| Test | Ergebnis |
|---|---|
| JavaScript-Syntaxprüfung (Browser/Generator/Server) | Bestanden |
| Gleicher Seed + unterschiedliche Chunk-Ladereihenfolge | Bestanden |
| Unterschiedliche Seeds | Bestanden |
| Negative Chunkkoordinaten / Grundgestein / Höhenlimits | Bestanden |
| Unterschiedliche Terrainhöhen / mehrere Biome | Bestanden |
| HTTP-Seite und statische Ressourcen | Bestanden |
| Schutz vor direktem HTTP-Zugriff auf `saves/` | Bestanden |
| Zwei unabhängige WebSocket-Clients | Bestanden |
| Gleiches Welt-Seed für alle Raumteilnehmer | Bestanden |
| Positionsupdate / Chat | Bestanden |
| Blockänderung an beiden Clients | Bestanden |
| Abgewiesene Änderung zu weit vom Spieler | Bestanden |
| Kreativ-Abbau nach `mine_start` | Bestanden |
| Survival-Abbau erzeugt Drop statt Sofort-Inventar | Bestanden |
| Serverseitiger Pickup nach Spieler-Nähe | Bestanden |
| Kein Pickup aus großer Entfernung | Bestanden |
| Drop kann nicht doppelt eingesammelt werden | Bestanden |
| Späterer Spieler erhält bestehende Drops beim Betreten | Bestanden |
| Speicherung auf Datenträger und Neustart-Wiederherstellung | Bestanden |

**Einschränkung:** Diese Tests prüfen Netzwerklogik und Generator in einem automatisierten Kontext, keine vollständige grafische Durchspielbarkeit.

## Manuelle Browsertests – noch offen

- [ ] Externes Three.js-Modul erfolgreich laden.
- [ ] Menü und Weltenliste mit Maus bedienen.
- [ ] Neue Survivalwelt erzeugen, bewegen, abbauen, bauen.
- [ ] Eine Werkbank platzieren, Werkzeuge craften.
- [ ] Kreativmodus, Fliegen, Sichtweitenregler.
- [ ] 10 Rissstufen auf einem anvisierten Block.
- [ ] Blockpartikel, Item-Fallanimation, Schweben, Pickup durch Darüberlaufen.
- [ ] Selbst erzeugte Texturen, Wolken, Eckabschattung und Schatten im Browser.
- [ ] Oberfläche bei Nacht / Beleuchtung.
- [ ] Zwei sichtbare Spielermodelle im Browser.
- [ ] Survival-Synchronisierung, Inventar nach reconnect.
- [ ] GitHub Pages mit tatsächlichem Live-Deployment.

In dieser Entwicklungsumgebung ließ sich die externe CDN-Domain nicht auflösen. Ein erfolgreicher visueller Browser-3D-Test kann deshalb derzeit nicht behauptet werden.
