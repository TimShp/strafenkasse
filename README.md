# Strafenkasse

Strafen der Handballmannschaft **in der Halle** erfassen und am Monatsende
abrechnen. Installierbare Web-App (PWA), läuft offline, alle Daten bleiben auf
dem Gerät. Kein Server, kein Login, keine Fremdabrufe zur Laufzeit.

Entwurf und Begründungen: [docs/mindCoder/specs/2026-10-14-strafenkasse-design.md](docs/mindCoder/specs/2026-10-14-strafenkasse-design.md)

## Bedienung

**Erfassen** — Tap auf den Spieler, Tap auf die Strafe, fertig. Häufige Strafen
stehen oben. Umschalter „Strafe zuerst" für den Fall, dass dieselbe Strafe
mehrere trifft: Strafe wählen, Spieler antippen, gemeinsam buchen. Jede Buchung
lässt sich fünf Sekunden lang rückgängig machen, danach über die Tagesliste
löschen. Die Striche auf den Kacheln zeigen, was heute schon erfasst ist.

**Erfassungstag** — Über der Umschaltleiste steht, für welchen Tag gerade erfasst
wird. Beim Abtippen aus dem Notizbuch stellt man ihn auf den Trainingstag, erfasst
den Block und stellt weiter; die Uhrzeit kommt vom Moment der Eingabe. Ein
zurückgestellter Tag ist farbig markiert und beim nächsten Start der App wieder
auf heute — ein unbemerkt falsches Datum auf jeder Buchung wäre der teuerste
Fehler, den dieser Schalter machen kann.

**Phrasen** — Strafenarten können den Wortlaut abfragen; beim Katalog aus der
Saison 25/26 ist das für „Phrase" gesetzt. Die Buchung ist gespeichert, bevor das
Feld aufgeht, und „Später" überspringt es — im Training darf das Tippen nichts
aufhalten. Fehlende Zitate stehen mit „Zitat nachtragen" in der Tagesliste und im
Phrasenbuch. Das Phrasenbuch unter „Mehr" sammelt alle Zitate nach Monaten; sie
hängen an ihren Buchungen und überdauern jeden Monatsabschluss.

**Kisten** — „Kopftreffer", „30. oder 40. Tor" und „Verweigern" sind
Naturalstrafen: kein Eurobetrag, kein Anteil an irgendeiner Geldsumme. Sie stehen
als „Offen: 1 Kiste" im Kontoauszug und werden dort abgehakt, wenn die Kiste
kommt, oder zum hinterlegten Kistenpreis in Geld abgelöst.

**Konten** — Saldo je Spieler, absteigend. Im Kontoauszug werden Zahlungseingang,
Gutschrift und Verzug gebucht; offene Kisten lassen sich als geliefert abhaken
oder in Geld ablösen.

**Abschluss** — Monat wählen, „Abrechnung erstellen". Es entsteht ein Dokument mit
Mannschaftsübersicht und Einzelauflistung je Spieler, das über den Druckdialog
als PDF geteilt wird.

**Mehr** — Kader, Strafenarten, Ämter, Saison, Beitrag, IBAN und die Sicherung.

## Sicherung

Alle Daten liegen ausschließlich auf dem Gerät. Wird das Icon vom
Home-Bildschirm gelöscht oder das Handy ersetzt, sind sie weg. Deshalb:

- Nach jedem Monatsabschluss fragt die App nach einer Sicherung.
- Ist die letzte Sicherung älter als 14 Tage, erinnert die App beim Start.
- „Sicherung teilen" legt eine vollständige JSON-Datei ab; „Sicherung einlesen"
  stellt sie wieder her und ersetzt dabei den gesamten Bestand.

## Betrieb

Die App ist statisch — HTML, CSS, JavaScript als Module, keine Abhängigkeiten,
kein Build. Sie braucht nur HTTPS, sonst arbeitet der Service Worker nicht und
iOS bietet die Installation nicht an.

**Lokal ansehen**

```bash
python serve.py 8778
```

`serve.py` schickt `Cache-Control: no-store`. Der eingebaute `http.server` tut
das nicht, und Safari haelt dann auf dem iPhone an der alten Fassung fest —
eine Änderung scheint dann wirkungslos, obwohl sie längst auf dem Server liegt.
Unter „Mehr" steht unten die ausgelieferte Fassung; daran lässt sich das prüfen.

**Veröffentlicht** unter <https://timshp.github.io/strafenkasse/> (GitHub Pages,
Repository `TimShp/strafenkasse`, Branch `main`, Ordner `/`). Ein `git push` auf
`main` verteilt jede Änderung; der Bau dauert etwa eine Minute.

**Auf dem iPhone installieren** — Adresse in Safari öffnen, Teilen-Symbol, „Zum
Home-Bildschirm". Erst damit läuft sie im Vollbild und ist vom
7-Tage-Aufräumen des Safari-Speichers ausgenommen.

Nach jeder Änderung am Code muss `CACHE` in `sw.js` hochgezählt werden, sonst
liefert der Service Worker die alte Fassung weiter.

## Tests

```bash
npm test
```

Geprüft wird der Rechenkern (`js/konto.js`): Salden, Übertrag, Vorzeichen,
Gutschriften, Naturalstrafen, Verzugsvorschlag, Zitate, Rundung. Oberfläche und
Offline-Betrieb werden am Gerät geprüft — Installation, Flugmodus, buchen,
App schließen, erneut öffnen.

## Aufbau

| Datei | Aufgabe |
| --- | --- |
| `js/konto.js` | Rechenkern, reine Funktionen, ohne Datenbank und Oberfläche |
| `js/db.js` | IndexedDB, Transaktionen, Sicherungsbestand |
| `js/store.js` | geladener Zustand, Schreibwege |
| `js/erfassen.js` | Startscreen |
| `js/konten.js` | Kontenliste und Kontoauszug |
| `js/abschluss.js` | Monatsabrechnung als Druckdokument |
| `js/sicherung.js` | Export und Import |
| `js/verwaltung.js` | Stammdaten und Einrichtung |
| `js/ui.js` | Elemente, Blatt, Toast, Strichliste |
| `js/seed.js` | Strafenkatalog aus der Saison 25/26 |
