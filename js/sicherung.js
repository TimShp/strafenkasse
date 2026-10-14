// Sicherung. Alle Daten liegen nur auf diesem Geraet - ohne Sicherung ist die
// Mannschaftskasse weg, wenn das Handy weg ist. Deshalb Teil der App, nicht Zubehoer.

import * as db from './db.js';
import { S, laden, einstellung, melden } from './store.js';
import { toast, fragen } from './ui.js';

const TAG = 86400000;

export async function sicherungTeilen() {
  const bestand = await db.gesamtbestand();
  const text = JSON.stringify(bestand, null, 1);
  const name = `strafenkasse-${new Date().toISOString().slice(0, 10)}.json`;
  const datei = new File([text], name, { type: 'application/json' });

  try {
    if (navigator.canShare?.({ files: [datei] })) {
      await navigator.share({ files: [datei], title: 'Sicherung Strafenkasse' });
    } else {
      const url = URL.createObjectURL(datei);
      const a = Object.assign(document.createElement('a'), { href: url, download: name });
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
    await einstellung('letzteSicherung', new Date().toISOString());
    melden();
    toast('Sicherung abgelegt');
  } catch (e) {
    if (e?.name === 'AbortError') return;
    toast('Sicherung fehlgeschlagen: ' + (e?.message ?? 'unbekannter Fehler'), { ton: 'warn' });
  }
}

export async function sicherungEinlesen(datei) {
  let bestand;
  try {
    bestand = JSON.parse(await datei.text());
  } catch {
    toast('Die Datei ist keine gültige Sicherung.', { ton: 'warn' });
    return false;
  }
  if (!Array.isArray(bestand?.spieler) || !Array.isArray(bestand?.buchungen)) {
    toast('In der Datei fehlen Spieler oder Buchungen.', { ton: 'warn' });
    return false;
  }
  const ok = await fragen({
    titel: 'Sicherung einlesen?',
    text: `Der aktuelle Bestand wird ersetzt: ${bestand.spieler.length} Spieler, ${bestand.buchungen.length} Buchungen vom ${new Date(bestand.erstellt ?? Date.now()).toLocaleDateString('de-DE')}.`,
    knopf: 'Ersetzen', ton: 'warn'
  });
  if (!ok) return false;
  await db.bestandErsetzen(bestand);
  await laden();
  melden();
  toast('Sicherung eingelesen');
  return true;
}

/** Erinnert, wenn die letzte Sicherung zu lange her ist. */
export function sicherungAlter() {
  const letzte = S.einstellungen.letzteSicherung;
  if (!letzte) return { tage: Infinity, faellig: S.buchungen.length > 0 };
  const tage = Math.floor((Date.now() - new Date(letzte).getTime()) / TAG);
  return { tage, faellig: tage >= 14 };
}
