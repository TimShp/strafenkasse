// Einstieg und Navigation. Vier Reiter, Zustand in der Adresszeile, damit der
// Zurueck-Wisch auf dem iPhone tut, was er soll.

import { $, el, toast } from './ui.js';
import { S, laden } from './store.js';
import * as erfassen from './erfassen.js';
import * as konten from './konten.js';
import * as abschluss from './abschluss.js';
import * as verwaltung from './verwaltung.js';
import { sicherungAlter } from './sicherung.js';

const REITER = [
  { id: 'erfassen', text: 'Erfassen', modul: erfassen },
  { id: 'konten', text: 'Konten', modul: konten },
  { id: 'abschluss', text: 'Abschluss', modul: abschluss },
  { id: 'verwaltung', text: 'Mehr', modul: verwaltung }
];

const buehne = () => $('#buehne');

function route() {
  const roh = location.hash.replace(/^#/, '') || 'erfassen';
  const [id, unter] = roh.split('/');
  return { id: REITER.some(r => r.id === id) ? id : 'erfassen', unter };
}

function zeichnen() {
  const { id, unter } = route();
  const reiter = REITER.find(r => r.id === id);
  if (id !== 'konten') konten.zuruecksetzen();
  if (id === 'verwaltung') verwaltung.oeffne(unter);
  reiter.modul.zeichnen(buehne());
  for (const knopf of document.querySelectorAll('.reiter-knopf')) {
    const an = knopf.dataset.ziel === id;
    knopf.classList.toggle('reiter-knopf--an', an);
    knopf.setAttribute('aria-current', an ? 'page' : 'false');
  }
  window.scrollTo(0, 0);
}

function reiterleiste() {
  const leiste = el('nav', { class: 'reiter', 'aria-label': 'Bereiche' });
  for (const r of REITER) {
    leiste.append(el('button', {
      class: 'reiter-knopf', type: 'button', dataset: { ziel: r.id }, text: r.text,
      onclick: () => { location.hash = '#' + r.id; }
    }));
  }
  return leiste;
}

async function start() {
  try {
    await laden();
  } catch (e) {
    buehne().append(el('div', { class: 'leer' },
      el('p', { text: 'Der Speicher ist nicht erreichbar. Im privaten Modus von Safari kann die App nichts speichern.' }),
      el('p', { class: 'fussnote', text: String(e?.message ?? e) })
    ));
    return;
  }

  if (!S.einstellungen.eingerichtet || S.spieler.length === 0) {
    verwaltung.einrichtung(buehne(), async () => {
      await laden();
      document.body.append(reiterleiste());
      window.addEventListener('hashchange', zeichnen);
      location.hash = '#erfassen';
      zeichnen();
    });
    return;
  }

  document.body.append(reiterleiste());
  window.addEventListener('hashchange', zeichnen);
  zeichnen();

  const alter = sicherungAlter();
  if (alter.faellig) {
    toast('Letzte Sicherung ist älter als 14 Tage. Unter „Mehr" ablegen.', { dauer: 9000, ton: 'warn' });
  }
}

start();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
