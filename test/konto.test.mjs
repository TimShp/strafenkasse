// Geprueft wird der Rechenkern, denn dort sitzt der Schaden: ein falscher Saldo
// faellt niemandem auf, eine schiefe Kachel schon.
//
//   node --test test/

import test from 'node:test';
import assert from 'node:assert/strict';
import { saldo, offeneKisten, abrechnung, monatsgrenzen, verzugVorschlag, zitate, rund } from '../js/konto.js';

const iso = (j, m, t, h = 12) => new Date(j, m - 1, t, h).toISOString();

const strafe = (datum, betrag, extra = {}) => ({ id: Math.random().toString(16), spielerId: 's1', art: 'strafe', datum, betrag, menge: 1, einheit: 'eur', ...extra });
const zahlung = (datum, betrag) => ({ ...strafe(datum, -betrag), art: 'zahlung' });
const beitrag = (datum, betrag) => ({ ...strafe(datum, betrag), art: 'jahresbeitrag' });
const gutschrift = (datum, betrag) => ({ ...strafe(datum, -betrag), art: 'gutschrift' });
const kiste = (datum, extra = {}) => ({ ...strafe(datum, 0), einheit: 'kiste', menge: 1, ...extra });

test('Saldo addiert Strafen, Beitrag und Zahlungen mit richtigem Vorzeichen', () => {
  const b = [beitrag(iso(2026, 9, 1), 150), strafe(iso(2026, 9, 12), 0.75), strafe(iso(2026, 9, 12), 5), zahlung(iso(2026, 9, 30), 100)];
  assert.equal(saldo(b), 55.75);
});

test('Guthaben ist ein negativer Saldo', () => {
  assert.equal(saldo([strafe(iso(2026, 9, 2), 5), gutschrift(iso(2026, 9, 3), 48.5)]), -43.5);
});

test('Gutschrift-Strafenarten werden abgezogen, nicht addiert', () => {
  // "Kacken in Gegnerkabine": 5 Euro zugunsten des Spielers, vorzeichen -1
  assert.equal(saldo([strafe(iso(2026, 9, 9), 10), strafe(iso(2026, 9, 9), -5)]), 5);
});

test('Naturalstrafen tauchen in keiner Eurosumme auf', () => {
  const b = [strafe(iso(2026, 9, 9), 10), kiste(iso(2026, 9, 9))];
  assert.equal(saldo(b), 10);
  assert.equal(offeneKisten(b), 1);
});

test('Erledigte Kisten gelten nicht mehr als offen', () => {
  assert.equal(offeneKisten([kiste(iso(2026, 9, 9)), kiste(iso(2026, 9, 10), { erledigt: true })]), 1);
});

test('Uebertrag des Folgemonats ist der Saldo am Monatsende', () => {
  const b = [beitrag(iso(2026, 9, 1), 150), strafe(iso(2026, 9, 14), 5), strafe(iso(2026, 10, 2), 10)];
  const sep = monatsgrenzen(2026, 9);
  const okt = monatsgrenzen(2026, 10);
  const a9 = abrechnung(b, sep.von, sep.bis);
  const a10 = abrechnung(b, okt.von, okt.bis);
  assert.equal(a9.saldo, 155);
  assert.equal(a10.uebertrag, a9.saldo);
  assert.equal(a10.saldo, 165);
});

test('Abrechnung trennt Strafen, Beitrag und Zahlungen', () => {
  const { von, bis } = monatsgrenzen(2026, 10);
  const a = abrechnung([
    strafe(iso(2026, 9, 20), 20),             // Vormonat -> Uebertrag
    strafe(iso(2026, 10, 3), 0.75),
    strafe(iso(2026, 10, 3), 5),
    beitrag(iso(2026, 10, 1), 150),
    zahlung(iso(2026, 10, 28), 25),
    gutschrift(iso(2026, 10, 29), 10)
  ], von, bis);
  assert.equal(a.uebertrag, 20);
  assert.equal(a.strafen, 5.75);
  assert.equal(a.beitrag, 150);
  assert.equal(a.zahlungen, -25);
  assert.equal(a.gutschriften, -10);
  assert.equal(a.saldo, 140.75);
  assert.equal(a.posten.length, 5);
});

test('Buchungen am Monatsersten gehoeren in den neuen Monat', () => {
  const { von, bis } = monatsgrenzen(2026, 10);
  const a = abrechnung([strafe(iso(2026, 10, 1, 0), 5), strafe(iso(2026, 9, 30, 23), 7)], von, bis);
  assert.equal(a.strafen, 5);
  assert.equal(a.uebertrag, 7);
});

test('Loeschen einer Buchung korrigiert den Saldo vollstaendig', () => {
  const b = [strafe(iso(2026, 10, 1), 5), strafe(iso(2026, 10, 2), 0.75)];
  const ohne = b.filter(x => x !== b[1]);
  assert.equal(saldo(ohne), 5);
});

test('Verzug schlaegt die doppelte Strafsumme des Vormonats vor', () => {
  const b = [strafe(iso(2026, 9, 5), 5), strafe(iso(2026, 9, 6), 2.5), zahlung(iso(2026, 9, 7), 100)];
  assert.equal(verzugVorschlag(b, 2026, 10), 15);
});

test('Verzug im Januar schaut in den Dezember des Vorjahres', () => {
  assert.equal(verzugVorschlag([strafe(iso(2025, 12, 5), 3)], 2026, 1), 6);
});

test('Ohne Strafen im Vormonat gibt es keinen Verzugsvorschlag', () => {
  assert.equal(verzugVorschlag([zahlung(iso(2026, 9, 7), 100)], 2026, 10), 0);
});

test('Krumme Centbetraege runden sauber', () => {
  const b = Array.from({ length: 7 }, (_, i) => strafe(iso(2026, 10, i + 1), 0.75));
  assert.equal(saldo(b), 5.25);
  assert.equal(rund(0.1 + 0.2), 0.3);
});

test('Zitate kommen neueste zuerst und ohne leere', () => {
  const b = [
    strafe(iso(2026, 10, 1), 0.75, { zitat: 'Der Ball muss ins Tor' }),
    strafe(iso(2026, 10, 2), 0.75),
    strafe(iso(2026, 10, 3), 0.75, { zitat: 'Wir nehmen Spiel für Spiel' })
  ];
  const z = zitate(b);
  assert.equal(z.length, 2);
  assert.equal(z[0].zitat, 'Wir nehmen Spiel für Spiel');
});

test('Zitate lassen sich auf einen Monat eingrenzen, bleiben aber erhalten', () => {
  const b = [
    strafe(iso(2026, 9, 20), 0.75, { zitat: 'alte Phrase' }),
    strafe(iso(2026, 10, 2), 0.75, { zitat: 'neue Phrase' })
  ];
  const okt = monatsgrenzen(2026, 10);
  assert.equal(zitate(b, okt.von, okt.bis).length, 1);
  assert.equal(zitate(b).length, 2, 'ohne Zeitraum bleibt die alte Phrase sichtbar');
});

test('Ein Zitat aendert den Saldo nicht', () => {
  assert.equal(saldo([strafe(iso(2026, 10, 1), 0.75, { zitat: 'teuer' })]), 0.75);
});
