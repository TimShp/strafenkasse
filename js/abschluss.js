// Monatsabschluss: ein Dokument mit Mannschaftsübersicht und Einzelauflistung
// je Spieler. Ausgabe ueber den Druckdialog - auf dem iPhone fuehrt der zu
// "Als PDF teilen" und damit direkt in die Mannschaftsgruppe.

import { el, leeren, toast, fragen, anhaengen } from './ui.js';
import { S, aktiveSpieler, buchungenVon, einstellung } from './store.js';
import { eur, datum, monatName } from './format.js';
import { abrechnung, monatsgrenzen, EINHEIT_KISTE } from './konto.js';
import { sicherungTeilen } from './sicherung.js';

const jetzt = new Date();
let jahr = jetzt.getFullYear();
let monat = jetzt.getMonth() + 1;

export function zeichnen(wurzel) {
  leeren(wurzel);
  const { von, bis } = monatsgrenzen(jahr, monat);
  const daten = aktiveSpieler().map(s => ({ spieler: s, a: abrechnung(buchungenVon(s.id), von, bis) }));
  const posten = daten.reduce((n, d) => n + d.a.posten.length, 0);
  const forderung = daten.reduce((n, d) => n + d.a.saldo, 0);

  anhaengen(wurzel, 
    el('header', { class: 'kopf' },
      el('div', {},
        el('h1', { class: 'kopf-titel', text: 'Abschluss' }),
        el('p', { class: 'kopf-zeile', text: `${posten} Buchungen im Zeitraum` })
      ),
      el('div', { class: 'kopf-kasse' },
        el('span', { class: 'kopf-kasse-wert', text: eur(forderung) }),
        el('span', { class: 'kopf-kasse-label', text: 'Forderung danach' })
      )
    ),
    monatswahl(wurzel),
    el('section', { class: 'vorschau' },
      el('h2', { class: 'abschnitt-titel', text: monatName(jahr, monat) }),
      ...daten.map(d => el('div', { class: 'vorschau-zeile' },
        el('span', { text: d.spieler.name }),
        el('span', { class: 'vorschau-mitte', text: `${d.a.posten.length} Posten` }),
        el('span', { class: `zeile-betrag${d.a.saldo < 0 ? ' zeile-betrag--gut' : ''}`, text: eur(d.a.saldo) })
      ))
    ),
    el('div', { class: 'aktionsreihe aktionsreihe--unten' },
      el('button', {
        class: 'knopf knopf--voll knopf--breit', type: 'button', text: 'Abrechnung erstellen',
        onclick: () => erstellen(daten, von, bis, posten)
      })
    )
  );
}

function monatswahl(wurzel) {
  const schieben = richtung => {
    const d = new Date(jahr, monat - 1 + richtung, 1);
    jahr = d.getFullYear(); monat = d.getMonth() + 1;
    zeichnen(wurzel);
  };
  return el('div', { class: 'monatswahl' },
    el('button', { class: 'knopf-still', type: 'button', 'aria-label': 'Vormonat', text: '‹', onclick: () => schieben(-1) }),
    el('span', { class: 'monatswahl-text', text: monatName(jahr, monat) }),
    el('button', { class: 'knopf-still', type: 'button', 'aria-label': 'Folgemonat', text: '›', onclick: () => schieben(1) })
  );
}

async function erstellen(daten, von, bis, posten) {
  if (posten === 0) {
    toast('Im gewählten Monat gibt es keine Buchungen.', { ton: 'warn' });
    return;
  }
  dokumentBauen(daten, von, bis);
  await einstellung('letzterAbschluss', { jahr, monat, erstellt: new Date().toISOString() });
  window.print();
  if (await fragen({
    titel: 'Sicherung teilen?',
    text: 'Alle Daten liegen nur auf diesem Handy. Lege jetzt eine Sicherung ab.',
    knopf: 'Sicherung teilen'
  })) await sicherungTeilen();
}

function dokumentBauen(daten, von, bis) {
  const ziel = leeren(document.getElementById('druck'));
  const e = S.einstellungen;
  const bisAnzeige = new Date(new Date(bis).getTime() - 86400000).toISOString();

  ziel.append(
    el('h1', { class: 'd-titel', text: `Strafenabrechnung ${monatName(jahr, monat)}` }),
    el('p', { class: 'd-unter', text: `${e.saison ? e.saison + ' · ' : ''}Zeitraum ${datum(von)} bis ${datum(bisAnzeige)} · erstellt am ${datum(new Date().toISOString())}` })
  );

  // Uebersicht
  const kopfzeile = ['Spieler', 'Übertrag', 'Strafen', 'Beitrag', 'Zahlungen', 'Saldo'];
  const tabelle = el('table', { class: 'd-tabelle' },
    el('thead', {}, el('tr', {}, ...kopfzeile.map((t, i) => el('th', { class: i ? 'r' : '', text: t })))),
  );
  const koerper = el('tbody');
  let summe = { uebertrag: 0, strafen: 0, beitrag: 0, zahlungen: 0, saldo: 0 };
  for (const { spieler, a } of daten) {
    const zahlungen = a.zahlungen + a.gutschriften;
    const strafen = a.strafen + a.verzug;
    summe = {
      uebertrag: summe.uebertrag + a.uebertrag, strafen: summe.strafen + strafen,
      beitrag: summe.beitrag + a.beitrag, zahlungen: summe.zahlungen + zahlungen,
      saldo: summe.saldo + a.saldo
    };
    koerper.append(el('tr', {},
      el('td', { text: spieler.name }),
      el('td', { class: 'r', text: eur(a.uebertrag) }),
      el('td', { class: 'r', text: eur(strafen) }),
      el('td', { class: 'r', text: a.beitrag ? eur(a.beitrag) : '–' }),
      el('td', { class: 'r', text: zahlungen ? eur(zahlungen) : '–' }),
      el('td', { class: 'r b', text: eur(a.saldo) })
    ));
  }
  koerper.append(el('tr', { class: 'd-summe' },
    el('td', { text: 'Mannschaft' }),
    el('td', { class: 'r', text: eur(summe.uebertrag) }),
    el('td', { class: 'r', text: eur(summe.strafen) }),
    el('td', { class: 'r', text: eur(summe.beitrag) }),
    el('td', { class: 'r', text: eur(summe.zahlungen) }),
    el('td', { class: 'r b', text: eur(summe.saldo) })
  ));
  tabelle.append(koerper);
  ziel.append(tabelle);

  ziel.append(el('p', { class: 'd-hinweis' },
    'Positiver Wert: zu zahlen. Negativer Wert: Guthaben.',
    e.iban ? el('span', {}, ` Überweisung an ${e.inhaber || ''} · ${e.iban}`) : null
  ));

  // Offene Naturalstrafen
  const kisten = daten.filter(d => d.a.kistenOffen > 0);
  if (kisten.length) {
    ziel.append(
      el('h2', { class: 'd-h2', text: 'Offene Kisten' }),
      el('ul', { class: 'd-liste' }, ...kisten.map(d =>
        el('li', { text: `${d.spieler.name}: ${d.a.kistenOffen} Kiste${d.a.kistenOffen > 1 ? 'n' : ''}` })))
    );
  }

  // Einzelauflistung
  ziel.append(el('h2', { class: 'd-h2 d-h2--trenner', text: 'Einzelposten' }));
  for (const { spieler, a } of daten) {
    const block = el('section', { class: 'd-block' },
      el('h3', { class: 'd-h3' }, spieler.name,
        el('span', { class: 'd-h3-saldo', text: eur(a.saldo) }))
    );
    if (a.posten.length === 0 && a.uebertrag === 0) {
      block.append(el('p', { class: 'd-leer', text: 'Keine Buchungen in diesem Monat.' }));
    } else {
      const t = el('table', { class: 'd-tabelle d-tabelle--klein' });
      const tb = el('tbody');
      if (a.uebertrag !== 0) tb.append(el('tr', {}, el('td', { text: '' }), el('td', { text: 'Übertrag aus dem Vormonat' }), el('td', { class: 'r', text: eur(a.uebertrag) })));
      for (const b of a.posten) {
        tb.append(el('tr', {},
          el('td', { class: 'd-datum', text: datum(b.datum) }),
          el('td', {}, (b.bezeichnung ?? 'Buchung') + (b.notiz ? ` (${b.notiz})` : '')),
          el('td', { class: 'r', text: b.einheit === EINHEIT_KISTE ? `${b.menge} Kiste` : eur(b.betrag) })
        ));
      }
      tb.append(el('tr', { class: 'd-summe' }, el('td', {}), el('td', { text: 'Saldo' }), el('td', { class: 'r b', text: eur(a.saldo) })));
      t.append(tb);
      block.append(t);
    }
    ziel.append(block);
  }
}
