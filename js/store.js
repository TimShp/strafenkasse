// Gemeinsamer Zustand. Alle Daten liegen zusaetzlich im Speicher, damit das
// Spielerraster ohne Datenbankzugriff neu zeichnen kann - in der Halle zaehlt
// jede Zehntelsekunde zwischen Tap und Rueckmeldung.

import * as db from './db.js';
import { VORGABEN } from './seed.js';

export const S = {
  spieler: [],
  arten: [],
  aemter: [],
  buchungen: [],
  einstellungen: { jahresbeitrag: VORGABEN.jahresbeitrag, kistenpreis: VORGABEN.kistenpreis, iban: '', inhaber: '', saison: '', letzteSicherung: null, eingerichtet: false }
};

const hoerer = new Set();
export function abonnieren(fn) { hoerer.add(fn); return () => hoerer.delete(fn); }
export function melden() { for (const fn of hoerer) fn(); }

export async function laden() {
  const [spieler, arten, aemter, buchungen, metaSaetze] = await Promise.all([
    db.alle('spieler'), db.alle('strafenarten'), db.alle('aemter'),
    db.buchungenAlle(), db.alle('meta')
  ]);
  S.spieler = spieler.sort((a, b) => (a.sortierung ?? 0) - (b.sortierung ?? 0) || a.name.localeCompare(b.name, 'de'));
  S.arten = arten.sort((a, b) => (b.rang ?? 0) - (a.rang ?? 0) || a.name.localeCompare(b.name, 'de'));
  S.aemter = aemter.sort((a, b) => a.name.localeCompare(b.name, 'de'));
  S.buchungen = buchungen.sort((a, b) => a.datum.localeCompare(b.datum));
  for (const satz of metaSaetze) S.einstellungen[satz.key] = satz.wert;
}

export const aktiveSpieler = () => S.spieler.filter(s => s.aktiv !== false);
export const aktiveArten = () => S.arten.filter(a => a.aktiv !== false);
export const spielerName = id => S.spieler.find(s => s.id === id)?.name ?? 'Unbekannt';
export const art = id => S.arten.find(a => a.id === id);

export const buchungenVon = spielerId => S.buchungen.filter(b => b.spielerId === spielerId);

export async function einstellung(key, wert) {
  S.einstellungen[key] = wert;
  await db.metaSetzen(key, wert);
}

export async function buchen(buchung) {
  const satz = await db.buchen(buchung);
  S.buchungen.push(satz);
  S.buchungen.sort((a, b) => a.datum.localeCompare(b.datum));
  melden();
  return satz;
}

export async function buchungLoeschen(id) {
  await db.buchungLoeschen(id);
  S.buchungen = S.buchungen.filter(b => b.id !== id);
  melden();
}

export async function buchungAendern(id, felder) {
  await db.buchungAendern(id, felder);
  const b = S.buchungen.find(x => x.id === id);
  if (b) Object.assign(b, felder);
  melden();
}
