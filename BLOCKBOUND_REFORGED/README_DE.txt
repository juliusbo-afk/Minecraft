BLOCKBOUND REFORGED 2.0
======================
Ein eigenständig entwickeltes 3D-Voxel-Sandboxspiel als HTML-Datei mit einem optionalen Multiplayer-Server.

WICHTIG
-------
Dies ist KEIN offizielles Minecraft-Produkt und KEIN 1:1-Nachbau. Der Code, die Spieloberfläche und
sämtliche Texturen sind neu erstellt. Umfangreiche Systeme wie Redstone, das volle Kreaturen-/Kampfsystem,
Verzauberungen, die gesamte Original-Blockpalette, komplexe Flüssigkeitsphysik und andere Dimensionen
sind nicht enthalten. Der Umfang ist eine spielbare Annäherung an die Grundmechanik.

INHALT
------
index.html          Komplettes Browser-Spiel mit eingebetteten Spiel- und Grafikoberflächen-Dateien
server.js           Multiplayer mit reinem Node.js; keine zusätzlichen npm-Pakete nötig
START_HIER.bat      Serverstart unter Windows
START_HIER.sh       Serverstart unter Linux/Mac
package.json        Optional: npm start
README_DE.txt       Diese Anleitung

GRAFIK UND INTERNET
------------------
Die einzige externe Abhängigkeit ist Three.js (3D-Bibliothek), das beim Laden per Internet von
cdn.jsdelivr.net geladen wird. Zum Starten der HTML-Datei ist deshalb zunächst Internet nötig.
Die generierten Welt- und Spielstandsdaten selbst werden lokal bzw. serverseitig gespeichert.
Empfohlen: aktuelles Microsoft Edge oder Google Chrome mit WebGL-Unterstützung und Maus/Tastatur.

EINZELSPIELER
------------
1. Ordner komplett entpacken.
2. index.html mit Edge oder Chrome öffnen.
3. Kreativ oder Survival wählen.
4. Einen Weltnamen angeben und optional einen Seed (Zahl oder Text).
5. Auf WELT SPIELEN klicken.

Weltname und Spielmodus bestimmen den lokalen Speicherplatz (Browser-localStorage).
Bei gleicher Welt und gleichem Seed entsteht die gleiche Landschaft. Blockänderungen, Inventar,
Lebenspunkte, Hunger und Spielerposition werden im Browser gespeichert.
Wenn die Browserdaten gelöscht werden, kann der Spielstand verloren gehen.
Im Kreativmodus sind Materialien unbegrenzt vorhanden, Flugmodus ist verfügbar und Abbauen ist sofort.
Im Überlebensmodus müssen Rohstoffe gewonnen, Gegenstände gesammelt und Werkzeuge hergestellt werden.

MULTIPLAYER (IM HEIMNETZ)
------------------------
1. Auf dem Computer, der als Server dient, Node.js 18+ von https://nodejs.org/ installieren.
2. Unter Windows START_HIER.bat doppelklicken (sonst node server.js / npm start ausführen).
3. Der Server startet unter http://localhost:3000.
4. Alle Spieler öffnen diese Adresse, bei anderen PCs im selben Netzwerk die lokale IP des Server-PCs,
   zum Beispiel http://192.168.1.20:3000 (nur ein BEISPIEL, IP auf dem Server-PC nachsehen).
5. In der Spielauswahl Multiplayer auswählen; Standard-Serveradresse ist ws://localhost:3000.
   Wird das Spiel von der Serveradresse im Browser geöffnet, die Verbindungsadresse passend ändern:
   ws://SERVER-IP:3000
6. Denselben Raumnamen und denselben Modus auswählen, um gemeinsam zu spielen.

Der zuerst angelegte Raum legt seinen Welt-Seed fest. Alle weiteren Besucher erhalten den Seed
und die gespeicherten Änderungen vom Server. Kreativ- und Survivalräume sind getrennt.
Der Server speichert unter saves/*.json. Serverfenster offen lassen, während Freunde spielen.
Die Speicherdateien sollten regelmäßig gesichert werden. Nicht offen ohne Zugangsschutz im Internet hosten.

STEUERUNG
---------
W, A, S, D      Bewegen
Maus           Blickrichtung
Linke Maustaste gedrückt halten  Block abbauen
Rechte Maustaste               Block platzieren / Werkbank oder Ofen benutzen
Leertaste      Springen (Kreativ: doppelt drücken = Flugmodus umschalten)
F              Flugmodus ein/aus im Kreativmodus
Shift          Sprinten; im Flugmodus sinken
Strg           Langsam gehen
E              Inventar / Kreativ-Blockauswahl
1 bis 9        Hotbar-Slot auswählen
Mausrad        Hotbar durchblättern
T              Multiplayer-Chat (auch im Einzelspieler)
R              Nahrung aus gewähltem Slot essen
ESC            Pause / Menüs schließen
F3             Erweiterte FPS- und Chunk-Anzeige

SURVIVAL: ERSTE SCHRITTE
-----------------------
1. Einen Stamm suchen und linke Maustaste beim Anschauen mehrere Sekunden gedrückt halten.
2. Mit E Inventar öffnen und unter Herstellung aus einem Stamm Holzbretter herstellen.
3. Aus vier Brettern eine Werkbank herstellen und aufstellen.
4. Die Werkbank in der Nähe haben, um Spitzhacken, Äxte und einen Ofen herstellen zu können.
5. Mit der Holzspitzhacke Stein abbauen. Aus Bruchstein eine Steinspitzhacke herstellen.
6. Kohle und Eisenerz in Höhlen und unter Tage abbauen. Roheisen im Ofen mit Kohle schmelzen.
7. Auf Hunger, Gesundheit, Wasser und tiefe Stürze achten.

WELT / SPIELMECHANIK
-------------------
- Seed-basierte prozedurale Chunks; Landschaft wird beim Erkunden fortlaufend generiert.
- Kontinenten, Küsten, Ozeanen, Ebenen, Wäldern, Wüsten, Taiga und Gebirge.
- Höhenraster mit mehreren Noise-Stufen; Bäume, Höhlen, Erze, Sand, Kies, Wasser.
- Tag/Nacht-Zyklus (etwa 20 Minuten); Pixeltexturen werden vollständig im Browser generiert.
- Erkundbare Welt, Setzen und Abbauen, Werkzeugstufen und Werkzeug-Haltbarkeit.
- Erzwungene Schwerkraft, blockgenaue Kollisionen, Springen, Sprinten und Schwimmen.
- Hunger, Leben, Fallschaden, Ertrinken, Lava und Respawn.
- Kreativinventar, 36-Slot-Survival-Inventar, Crafting-Rezepte, vereinfachtes Schmelzen.
- Sand und Kies rutschen beim Entfernen der Stütze automatisch nach unten (vereinfacht/sofort).
- Minimap, Koordinaten, Biome, Chat, Multiplayer-Spielerfiguren und Namensschilder.

TECHNISCHE GRENZEN
------------------
- Three.js wird über ein CDN geladen. Kein vollständiger Offline-Modus ohne externes Bibliothekspaket.
- Die HTML-3D-Darstellung wurde im bereitstellenden System nicht vollautomatisch grafisch getestet.
- Gegenstandsinventare im Multiplayer werden serverseitig nach Spielernamen gesichert, nicht
  fälschungssicher authentifiziert. Eine öffentliche, nicht geschützte Serverinstanz ist nicht empfohlen.
- Gegenüber Minecraft sind viele Regeln bewusst vereinfacht, insbesondere Crafting-Menüs, Flüssigkeiten,
  Kreaturen, Beleuchtung, Blockphysik und Kampfsystem. Es handelt sich um ein Hobby-Spielprojekt.