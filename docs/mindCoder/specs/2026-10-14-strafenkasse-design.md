# Strafenkasse — Design

Stand: 14.10.2026 · Auftraggeber und Nutzer: Tim Schoppe (Kassenwart) · privat

## Problem

Die Strafen der Handballmannschaft werden heute im Training in ein Notizbuch
geschrieben und am Monatsende in eine Excel-Matrix übertragen (35 Strafenarten
als Zeilen, 19 Spieler als Spalten, Anzahl in der Zelle). Die Übertragung kostet
mehrere Stunden pro Monat.

Drei Befunde aus der Bestandsdatei `Abrechnung_Vorbereitung_25u26 2.xlsx`
(gelesen 14.10.2026):

1. **Die Summenformel ist handgebaut und unvollständig.** Sie addiert jede Zeile
   einzeln (`$C5*E5+$C6*E6+…`). Zeile 36 („Kiste", 15 €) kommt in keiner der 19
   Formeln vor und wird nie berechnet. Eine neue Strafenart einzufügen heißt, 19
   Formeln zu ändern.
2. **„Flo S." existiert zweimal** (Spalten T und W) mit verschiedenen Summen —
   zwei Personen, gleicher Anzeigename.
3. **Es werden faktisch Konten geführt, nicht Monatslisten.** Es gibt eine Zeile
   „Letzter Monat" (Übertrag), Gutschriften und die Regel „Verzug = doppelte
   Vormonatsstrafe". Der Übertrag ist heute ein abgetippter Wert.

## Ziel

Die Erfassung passiert dort, wo die Strafe anfällt — live in der Halle, auf dem
iPhone, offline. Die Monatsabrechnung fällt als Nebenprodukt an, statt am
Monatsende aus dem Notizbuch rekonstruiert zu werden.

**Erfolgskriterium:** Eine Strafe erfassen dauert zwei Taps. Die
Monatsabrechnung entsteht mit einem Tap und muss nicht nachgerechnet werden.

## Entscheidungen

| Frage | Entscheidung | Begründung |
| --- | --- | --- |
| Erfassungszeitpunkt | live in der Halle, die App ersetzt das Notizbuch | Abtippen am Monatsende würde nur das Werkzeug tauschen, nicht die Stunden sparen |
| Nutzerkreis | nur der Kassenwart | kein Server, kein Login, keine Diskussion im Gruppenchat über jeden Einzeleintrag |
| Umfang | Strafen **und** Zahlungseingänge/Gutschriften | sonst bleibt der Übertrag Handarbeit, also genau der fehleranfällige Teil |
| Export | **ein** Dokument: Mannschaftsübersicht plus Einzelauflistung je Spieler | geht in die Mannschaftsgruppe, keine Einzelnachrichten |
| Technik | installierbare PWA | kostenlos, kein App Store, offline, in Minuten änderbar |
| Plattform | iPhone (Safari, Home-Bildschirm) | Gerät des Kassenwarts |
| Kader | wird beim ersten Start erfasst, nicht aus der Excel übernommen | neue Saison, Kader hat sich geändert (Angabe von Tim, 14.10.2026) |

Verworfen: native App (99 $/Jahr, Store-Review, langsame Änderungen — kein
Gegenwert für ein Ein-Personen-Werkzeug) und Google Forms plus Tabelle (fünf bis
sechs Taps pro Strafe, braucht Netz, löst die Abrechnung nicht).

## Datenmodell

Vier Stammdatenlisten und **eine** Buchungstabelle.

```
Spieler      { id, anzeigename, vollname?, aktiv, sortierung }
Strafenart   { id, name, betrag, vorzeichen, einheit, aktiv, haeufigkeit }
Amt          { id, name, inhaber[] }            // Spieler-ids
Saison       { id, bezeichnung, von, bis, jahresbeitrag }

Buchung      { id, spielerId, art, strafenartId?, bezeichnung, datum, betrag,
               menge, einheit, notiz?, erledigt? }
```

- `art` ∈ `strafe` · `jahresbeitrag` · `zahlung` · `gutschrift` · `verzug`
- `einheit` ∈ `eur` · `kiste` — Naturalstrafen („Kiste", „Kopftreffer",
  „30. und 40. Tor") sind **keine** Euro und werden getrennt gezählt. In der
  Excel stehen sie in derselben Spalte wie Preise und fallen deshalb aus jeder
  Summe heraus.
- `betrag` wird **beim Buchen kopiert**, nicht zur Laufzeit aus der Strafenart
  gelesen. Eine Preisänderung verändert alte Monate nicht.
- `vorzeichen` deckt Strafenarten ab, die Guthaben erzeugen („Kacken in
  Gegnerkabine", 5 € Gutschrift).

**Der Saldo ist immer die Summe der Buchungen, nie ein gespeicherter Wert.**
Damit kann die Lücke aus der Excel strukturell nicht entstehen: Was gebucht ist,
ist in der Summe.

## Screens

### Einrichtung (einmalig, beim ersten Start)

1. **Kader erfassen.** Namen zeilenweise eingeben oder einfügen, Reihenfolge
   später änderbar. Doppelte Anzeigenamen werden beim Speichern gemeldet
   (Lehre aus „Flo S.").
2. **Strafenarten.** Vorbelegt mit den benannten Arten und Preisen aus der
   Bestandsdatei, jede einzeln änder- und abwählbar. Die Positionen „Verzug"
   und „Sonstiges" werden nicht als Strafenart übernommen: „Verzug" ist eine
   eigene Buchungsart, „Sonstiges" eine Strafe mit freiem Betrag und Notiz.
3. **Saison und Jahresbeitrag.** Bezeichnung, Zeitraum, Beitrag (Vorschlag
   150 €). Der Beitrag wird je Spieler als Buchung angelegt; einzelne Spieler
   sind abwählbar (in der Bestandsdatei hatten zwei den Beitrag auf 0).
4. **IBAN und Kontoinhaber** für den Fuß der Abrechnung.

Die Einrichtung ist später über „Verwaltung" jederzeit erreichbar — Spieler
kommen und gehen, Preise ändern sich.

### Erfassen (Startscreen)

- Raster mit Spielerkacheln, Anzeigename groß, Fläche mindestens 44×44 pt.
- Tap auf Spieler → Blatt mit Strafenarten, sortiert nach tatsächlicher
  Häufigkeit (aus der Bestandsdatei: Phrase, Verspätung bis 10 Minuten,
  Modestrafe, Amt vernachlässigt, Roter 5er, Bier bunkern), Rest darunter,
  Suchfeld oben.
- Tap auf Strafenart → gebucht, Blatt schließt, Haptik, Toast
  „Nelson · Phrase · 0,75 € — Rückgängig" für 5 Sekunden.
- **Umschaltbarer zweiter Modus:** erst Strafenart, dann mehrere Spieler
  antippen, dann „3 Spieler buchen". Für „die drei kamen zu spät".
- Darunter die Buchungen des heutigen Tages mit Uhrzeit, jede einzeln löschbar.

Keine Bestätigungsdialoge. Korrektur läuft über Rückgängig und die Tagesliste.

### Konten

- Alle Spieler mit Saldo, absteigend. Guthaben erkennbar abgesetzt.
- Tap auf Spieler → Kontoauszug, chronologisch, alle Buchungen, löschbar.
- Dort buchen: **Zahlung** (Betrag vorbelegt mit offenem Saldo), **Gutschrift**
  (freier Betrag plus Notiz), **Verzug** (Betrag vorgeschlagen als doppelte
  Strafsumme des Vormonats, **von Tim bestätigt, nicht automatisch**).
- Offene Naturalstrafen je Spieler als eigene Zeile („1 Kiste offen"). Sie wird
  abgehakt, wenn die Kiste kommt, oder zum hinterlegten Kistenpreis in Geld
  abgelöst — dann entsteht eine Eurobuchung und die Kiste gilt als erledigt.

### Abschluss

„Monat abschließen" erzeugt ein Dokument und merkt sich den Abschluss als
Einstellung (Monat und Zeitpunkt). Die Buchungen selbst werden nicht markiert:
Die Zuordnung zu einem Monat ergibt sich aus dem Datum, eine zweite Markierung
wäre eine zweite Wahrheit.

Inhalt, in einem Dokument:

1. **Mannschaftsübersicht:** je Spieler Übertrag aus dem Vormonat, Strafen des
   Monats, Zahlungen, neuer Saldo. Darunter Gesamtsumme, Kassenstand, IBAN und
   die Lesehilfe aus der Bestandsdatei („positiver Wert = zu zahlen, negativer
   Wert = Guthaben").
2. **Je Spieler ein Block** mit jeder Einzelbuchung: Datum, Strafenart, Menge,
   Betrag.
3. **Offene Naturalstrafen** als kurze Liste.

Ausgabe als PDF über die iOS-Teilen-Funktion, direkt in die Mannschaftsgruppe.

### Sicherung

- Knopf „Sicherung teilen": vollständige JSON-Datei über die Teilen-Funktion.
- Nach jedem Monatsabschluss erscheint die Aufforderung dazu.
- Beim Öffnen der App: Hinweis, wenn die letzte Sicherung älter als 14 Tage ist.
- Import einer Sicherung in der Verwaltung, mit Bestätigung vor dem Überschreiben.

**Begründung:** Alle Daten liegen ausschließlich lokal. iOS räumt den Speicher
von Websites auf, die nur im Safari-Tab benutzt werden; eine auf dem
Home-Bildschirm installierte PWA ist davon ausgenommen, aber beim Löschen des
Icons sind die Daten weg. Die Sicherung ist deshalb Teil des Entwurfs, kein
Komfort.

## Technik

- Einzelne statische Seite, HTML/CSS/JavaScript ohne Framework, keine CDN-Abrufe
  zur Laufzeit.
- Speicher: IndexedDB. Jede Schreiboperation in einer Transaktion, damit ein
  Abbruch mitten im Buchen keinen halben Zustand hinterlässt.
- Service Worker für vollständigen Offline-Betrieb; App-Shell wird beim ersten
  Besuch gecacht.
- `manifest.webmanifest` mit `display: standalone`, Icon, Name.
- Gehostet als kostenlose statische Seite unter fester URL (GitHub Pages oder
  Netlify). Ohne HTTPS kein Service Worker und keine Installation.
- Projektordner `C:\Users\TimSchoppe\Projekte\strafenkasse`, **außerhalb** des
  Obsidian-Vaults. Im Vault nur eine Notiz, die auf das Projekt zeigt.

### Module

| Modul | Aufgabe | Abhängigkeiten |
| --- | --- | --- |
| `db.js` | IndexedDB öffnen, Migrationen, Lesen und Schreiben der vier Listen und der Buchungen | — |
| `konto.js` | Salden, Monatsabgrenzung, Übertrag, Naturalstrafen-Zählung | keine |
| `erfassen.js` | Startscreen, Spielerraster, Strafenblatt, Mehrfachmodus, Rückgängig | `db.js` |
| `konten.js` | Kontenliste, Kontoauszug, Zahlung/Gutschrift/Verzug | `db.js`, `konto.js` |
| `abschluss.js` | Dokument erzeugen, Abschluss markieren | `konto.js` |
| `sicherung.js` | Export und Import der JSON-Sicherung, Altersprüfung | `db.js` |
| `verwaltung.js` | Stammdaten, Einrichtungsassistent | `db.js` |

Jedes Modul ist ohne Kenntnis der Innereien der anderen benutzbar. `konto.js`
rechnet über übergebene Buchungslisten und kennt weder Datenbank noch
Oberfläche — deshalb ist er der Teil, der automatisiert geprüft wird.
`store.js` hält den geladenen Bestand im Speicher, damit das Spielerraster ohne
Datenbankzugriff neu zeichnen kann.

## Fehlerfälle

| Fall | Verhalten |
| --- | --- |
| Doppelter Anzeigename beim Anlegen | Hinweis, Speichern erst nach Unterscheidung |
| Buchung auf gelöschten Spieler | Spieler werden nie gelöscht, nur auf `aktiv: false` gesetzt |
| Preisänderung | gilt nur für neue Buchungen |
| Schreibfehler in IndexedDB | sichtbare Fehlermeldung statt stiller Verlust; Buchung bleibt im Eingabezustand |
| Speicher voll oder gesperrt (privater Modus) | Warnung beim Start, App bleibt lesbar |
| Monatsabschluss ohne Buchungen | Hinweis statt leeres Dokument |

## Tests

Automatisiert prüfbar sind die Rechenregeln — dort sitzt der Schaden:

- Saldo eines Spielers über mehrere Monate mit Strafen, Beitrag, Zahlung und
  Gutschrift.
- Übertrag: Saldo am Monatsende = Übertrag des Folgemonats.
- Preisänderung verändert abgeschlossene Monate nicht.
- Naturalstrafen erscheinen nicht in Eurosummen.
- Gutschrift-Strafenarten werden abgezogen, nicht addiert.
- Löschen einer Buchung korrigiert den Saldo vollständig.

Oberfläche und Offline-Betrieb werden am Gerät geprüft: Installation auf dem
Home-Bildschirm, Flugmodus, Buchen, App schließen, erneut öffnen.

## Bewusst nicht enthalten

Keine Spielerzugänge, keine Push-Nachrichten, keine Trainingsanwesenheit, keine
Auswertungen oder Ranglisten, kein Mehrgerätebetrieb, keine Fotobelege, keine
Zahlungsanbindung. Jedes davon kann später kommen; keins spart die Stunden am
Monatsende.
