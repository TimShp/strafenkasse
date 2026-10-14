// Verwaltung: Kader, Strafenarten, Ämter, Saison, Sicherung.
// Gleichzeitig der Einrichtungsassistent beim ersten Start - Spieler kommen und
// gehen, deshalb ist die Einrichtung kein Einmalvorgang, sondern ein Screen.

import { el, leeren, blatt, blattSchliessen, toast, fragen, anhaengen } from './ui.js';
import * as db from './db.js';
import { S, laden, melden, einstellung, buchen, buchungenVon, aktiveSpieler } from './store.js';
import { eur, betragLesen, datum } from './format.js';
import { STRAFENARTEN, AEMTER, VORGABEN } from './seed.js';
import { sicherungTeilen, sicherungEinlesen, sicherungAlter } from './sicherung.js';
import { EINHEIT_KISTE, zitate } from './konto.js';
import { zitatBlatt } from './erfassen.js';

let unterseite = 'index';
export function oeffne(seite) { unterseite = seite ?? 'index'; }

export function zeichnen(wurzel) {
  leeren(wurzel);
  const seiten = { index, spieler, arten, aemter, saison, phrasen };
  (seiten[unterseite] ?? index)(wurzel);
}

function kopf(wurzel, titel, zeile) {
  return el('header', { class: unterseite === 'index' ? 'kopf' : 'kopf kopf--zurueck' },
    unterseite !== 'index' ? el('button', {
      class: 'knopf-still knopf-zurueck', type: 'button', text: '‹ Mehr',
      onclick: () => { unterseite = 'index'; zeichnen(wurzel); }
    }) : null,
    el('div', {},
      el('h1', { class: 'kopf-titel', text: titel }),
      zeile ? el('p', { class: 'kopf-zeile', text: zeile }) : null
    )
  );
}

// --- Übersicht ------------------------------------------------------------

function index(wurzel) {
  const alter = sicherungAlter();
  const eintrag = (titel, zeile, ziel) => el('button', {
    class: 'menuezeile', type: 'button',
    onclick: typeof ziel === 'function' ? ziel : () => { unterseite = ziel; zeichnen(wurzel); }
  },
    el('span', {}, el('strong', { text: titel }), zeile ? el('span', { class: 'menuezeile-zeile', text: zeile }) : null),
    el('span', { class: 'menuezeile-pfeil', text: '›' })
  );

  anhaengen(wurzel, 
    kopf(wurzel, 'Mehr'),
    el('section', { class: 'menue' },
      eintrag('Kader', `${aktiveSpieler().length} Spieler`, 'spieler'),
      eintrag('Strafenarten', `${S.arten.filter(a => a.aktiv !== false).length} aktiv`, 'arten'),
      eintrag('Ämter', `${S.aemter.length} Ämter`, 'aemter'),
      eintrag('Saison und Beitrag', S.einstellungen.saison || 'nicht gesetzt', 'saison'),
      eintrag('Phrasenbuch', `${zitate(S.buchungen).length} festgehalten`, 'phrasen')
    ),
    el('section', { class: 'menue' },
      eintrag('Sicherung teilen',
        alter.tage === Infinity ? 'noch keine Sicherung' : `letzte vor ${alter.tage} Tagen`,
        () => sicherungTeilen()),
      eintrag('Sicherung einlesen', 'ersetzt den Bestand', () => dateiWaehlen())
    ),
    alter.faellig ? el('p', { class: 'warnhinweis', text: 'Die letzte Sicherung ist älter als 14 Tage. Alles liegt nur auf diesem Handy.' }) : null,
    el('p', { class: 'fussnote', text: `${S.buchungen.length} Buchungen gespeichert · Version 1.0` })
  );
}

function dateiWaehlen() {
  const eingabe = el('input', { type: 'file', accept: '.json,application/json', class: 'versteckt' });
  eingabe.addEventListener('change', async () => {
    const datei = eingabe.files?.[0];
    eingabe.remove();
    if (datei) await sicherungEinlesen(datei);
  });
  document.body.append(eingabe);
  eingabe.click();
}

// --- Kader ----------------------------------------------------------------

function spieler(wurzel) {
  const liste = el('section', { class: 'menue' });
  for (const s of S.spieler) {
    liste.append(el('div', { class: `menuezeile${s.aktiv === false ? ' menuezeile--aus' : ''}` },
      el('span', {},
        el('strong', { text: s.name }),
        el('span', { class: 'menuezeile-zeile', text: s.aktiv === false ? 'nicht im Kader' : eur(buchungenVon(s.id).filter(b => (b.einheit ?? 'eur') === 'eur').reduce((n, b) => n + b.betrag, 0)) })
      ),
      el('span', { class: 'menuezeile-knoepfe' },
        el('button', { class: 'knopf-still', type: 'button', text: 'Umbenennen', onclick: () => umbenennen(wurzel, s) }),
        el('button', {
          class: 'knopf-still', type: 'button', text: s.aktiv === false ? 'Zurück' : 'Raus',
          onclick: async () => {
            await db.setzen('spieler', { ...s, aktiv: s.aktiv === false });
            await laden(); zeichnen(wurzel); melden();
          }
        })
      )
    ));
  }

  anhaengen(wurzel, 
    kopf(wurzel, 'Kader', 'Spieler werden nie gelöscht, nur aus dem Kader genommen — ihre Buchungen bleiben.'),
    el('div', { class: 'aktionsreihe' },
      el('button', { class: 'knopf knopf--voll knopf--breit', type: 'button', text: 'Spieler hinzufügen', onclick: () => spielerAnlegen(wurzel) })
    ),
    S.spieler.length ? liste : el('div', { class: 'leer' }, el('p', { text: 'Noch kein Spieler angelegt.' }))
  );
}

function spielerAnlegen(wurzel) {
  const feld = el('textarea', { class: 'feld feld--mehrzeilig', rows: 8, placeholder: 'Ein Name pro Zeile:\n\nTizi\nNoel\nHaas', 'aria-label': 'Namen, ein Name pro Zeile' });
  const speichern = async () => {
    const namen = feld.value.split('\n').map(n => n.trim()).filter(Boolean);
    if (namen.length === 0) { feld.classList.add('feld--fehler'); return; }
    const vorhanden = new Set(S.spieler.map(s => s.name.toLowerCase()));
    const doppelt = [];
    const neu = [];
    namen.forEach((name, i) => {
      const key = name.toLowerCase();
      if (vorhanden.has(key) || neu.some(n => n.name.toLowerCase() === key)) { doppelt.push(name); return; }
      neu.push({ id: db.id(), name, aktiv: true, sortierung: S.spieler.length + i });
    });
    if (neu.length) await db.setzen('spieler', neu);
    await laden();
    blattSchliessen();
    zeichnen(wurzel); melden();
    toast(doppelt.length
      ? `${neu.length} angelegt. Doppelt und übersprungen: ${doppelt.join(', ')}`
      : `${neu.length} Spieler angelegt`, { dauer: doppelt.length ? 8000 : 4000, ton: doppelt.length ? 'warn' : 'normal' });
  };
  blatt({
    titel: 'Spieler hinzufügen',
    inhalt: el('div', { class: 'formular' },
      el('p', { class: 'blatt-text', text: 'Gleiche Namen werden abgewiesen. Zwei Flo brauchen zwei unterscheidbare Namen.' }),
      feld),
    aktion: el('div', { class: 'blatt-aktion' },
      el('button', { class: 'knopf knopf--still', type: 'button', text: 'Abbrechen', onclick: blattSchliessen }),
      el('button', { class: 'knopf knopf--voll', type: 'button', text: 'Anlegen', onclick: speichern })
    )
  });
  setTimeout(() => feld.focus(), 60);
}

function umbenennen(wurzel, s) {
  const feld = el('input', { class: 'feld', type: 'text', value: s.name, 'aria-label': 'Name' });
  blatt({
    titel: 'Spieler umbenennen',
    inhalt: el('div', { class: 'formular' }, feld),
    aktion: el('div', { class: 'blatt-aktion' },
      el('button', { class: 'knopf knopf--still', type: 'button', text: 'Abbrechen', onclick: blattSchliessen }),
      el('button', {
        class: 'knopf knopf--voll', type: 'button', text: 'Speichern', onclick: async () => {
          const name = feld.value.trim();
          if (!name) { feld.classList.add('feld--fehler'); return; }
          await db.setzen('spieler', { ...s, name });
          await laden(); blattSchliessen(); zeichnen(wurzel); melden();
        }
      })
    )
  });
}

// --- Strafenarten ---------------------------------------------------------

function arten(wurzel) {
  const liste = el('section', { class: 'menue' });
  for (const a of S.arten) {
    liste.append(el('div', { class: `menuezeile${a.aktiv === false ? ' menuezeile--aus' : ''}` },
      el('span', {},
        el('strong', { text: a.name }),
        el('span', { class: 'menuezeile-zeile', text: a.einheit === EINHEIT_KISTE ? 'Naturalstrafe' : (a.frei ? 'freier Betrag' : eur((a.vorzeichen ?? 1) * a.betrag)) })
      ),
      el('span', { class: 'menuezeile-knoepfe' },
        el('button', { class: 'knopf-still', type: 'button', text: 'Ändern', onclick: () => artAendern(wurzel, a) }),
        el('button', {
          class: 'knopf-still', type: 'button', text: a.aktiv === false ? 'An' : 'Aus',
          onclick: async () => { await db.setzen('strafenarten', { ...a, aktiv: a.aktiv === false }); await laden(); zeichnen(wurzel); melden(); }
        })
      )
    ));
  }
  anhaengen(wurzel, 
    kopf(wurzel, 'Strafenarten', 'Eine Preisänderung gilt nur für neue Buchungen. Abgeschlossene Monate bleiben, wie sie waren.'),
    el('div', { class: 'aktionsreihe' },
      el('button', { class: 'knopf knopf--voll knopf--breit', type: 'button', text: 'Strafenart hinzufügen', onclick: () => artAendern(wurzel, null) })
    ),
    liste
  );
}

function artAendern(wurzel, a) {
  const name = el('input', { class: 'feld', type: 'text', value: a?.name ?? '', placeholder: 'Bezeichnung', 'aria-label': 'Bezeichnung' });
  const betrag = el('input', { class: 'feld', type: 'text', inputmode: 'decimal', value: a && !a.frei ? String(a.betrag).replace('.', ',') : '', placeholder: '0,00', 'aria-label': 'Betrag' });
  const kiste = el('input', { type: 'checkbox', id: 'f-kiste', checked: a?.einheit === EINHEIT_KISTE });
  const gut = el('input', { type: 'checkbox', id: 'f-gut', checked: (a?.vorzeichen ?? 1) < 0 });
  const zit = el('input', { type: 'checkbox', id: 'f-zitat', checked: !!a?.zitat });
  blatt({
    titel: a ? 'Strafenart ändern' : 'Neue Strafenart',
    inhalt: el('div', { class: 'formular' }, name, betrag,
      el('label', { class: 'kasten', for: 'f-kiste' }, kiste, el('span', { text: 'Naturalstrafe (Kiste, kein Geld)' })),
      el('label', { class: 'kasten', for: 'f-gut' }, gut, el('span', { text: 'Gutschrift statt Belastung' })),
      el('label', { class: 'kasten', for: 'f-zitat' }, zit, el('span', { text: 'Wortlaut abfragen (Phrasenbuch)' }))
    ),
    aktion: el('div', { class: 'blatt-aktion' },
      el('button', { class: 'knopf knopf--still', type: 'button', text: 'Abbrechen', onclick: blattSchliessen }),
      el('button', {
        class: 'knopf knopf--voll', type: 'button', text: 'Speichern', onclick: async () => {
          const wert = betragLesen(betrag.value);
          if (!name.value.trim()) { name.classList.add('feld--fehler'); return; }
          if (!a?.frei && (!Number.isFinite(wert) || wert <= 0)) { betrag.classList.add('feld--fehler'); return; }
          await db.setzen('strafenarten', {
            id: a?.id ?? db.id(),
            name: name.value.trim(),
            betrag: a?.frei ? 0 : wert,
            einheit: kiste.checked ? EINHEIT_KISTE : 'eur',
            vorzeichen: gut.checked ? -1 : 1,
            rang: a?.rang ?? 0,
            frei: a?.frei ?? false,
            zitat: zit.checked,
            aktiv: a?.aktiv ?? true
          });
          await laden(); blattSchliessen(); zeichnen(wurzel); melden();
        }
      })
    )
  });
}

// --- Ämter ----------------------------------------------------------------

function aemter(wurzel) {
  const liste = el('section', { class: 'menue' });
  for (const amt of S.aemter) {
    const namen = (amt.inhaber ?? []).map(id => S.spieler.find(s => s.id === id)?.name).filter(Boolean);
    liste.append(el('button', { class: 'menuezeile', type: 'button', onclick: () => amtBesetzen(wurzel, amt) },
      el('span', {}, el('strong', { text: amt.name }), el('span', { class: 'menuezeile-zeile', text: namen.length ? namen.join(', ') : 'unbesetzt' })),
      el('span', { class: 'menuezeile-pfeil', text: '›' })
    ));
  }
  anhaengen(wurzel, 
    kopf(wurzel, 'Ämter', 'Wer welches Amt hält — sichtbar im Kontoauszug, wenn „Amt vernachlässigt" fällig wird.'),
    liste
  );
}

function amtBesetzen(wurzel, amt) {
  const gewaehlt = new Set(amt.inhaber ?? []);
  const liste = el('div', { class: 'wahlliste' });
  for (const s of aktiveSpieler()) {
    const kasten = el('input', { type: 'checkbox', checked: gewaehlt.has(s.id) });
    kasten.addEventListener('change', () => kasten.checked ? gewaehlt.add(s.id) : gewaehlt.delete(s.id));
    liste.append(el('label', { class: 'kasten' }, kasten, el('span', { text: s.name })));
  }
  blatt({
    titel: amt.name,
    inhalt: liste,
    aktion: el('div', { class: 'blatt-aktion' },
      el('button', { class: 'knopf knopf--still', type: 'button', text: 'Abbrechen', onclick: blattSchliessen }),
      el('button', {
        class: 'knopf knopf--voll', type: 'button', text: 'Speichern', onclick: async () => {
          await db.setzen('aemter', { ...amt, inhaber: [...gewaehlt] });
          await laden(); blattSchliessen(); zeichnen(wurzel); melden();
        }
      })
    )
  });
}

// --- Phrasenbuch ----------------------------------------------------------
// Die Zitate haengen an ihren Buchungen und ueberdauern damit jeden
// Monatsabschluss. Hier stehen sie als eigene Sammlung, nach Monaten.

function phrasen(wurzel) {
  const alle = zitate(S.buchungen);
  const offen = S.buchungen.filter(b => !b.zitat && S.arten.find(a => a.id === b.strafenartId)?.zitat);

  anhaengen(wurzel, kopf(wurzel, 'Phrasenbuch', `${alle.length} ${alle.length === 1 ? 'Zitat' : 'Zitate'} seit Beginn`));

  if (offen.length) {
    anhaengen(wurzel, el('p', { class: 'warnhinweis', text: `${offen.length} ${offen.length === 1 ? 'Buchung wartet' : 'Buchungen warten'} noch auf den Wortlaut.` }));
    const liste = el('section', { class: 'menue' });
    for (const b of offen.slice().reverse().slice(0, 20)) {
      liste.append(el('button', {
        class: 'menuezeile', type: 'button',
        onclick: () => zitatBlatt(wurzel, [b], `${spielerNameVon(b.spielerId)} · ${b.bezeichnung} vom ${datum(b.datum)}`, null)
      },
        el('span', {}, el('strong', { text: spielerNameVon(b.spielerId) }), el('span', { class: 'menuezeile-zeile', text: datum(b.datum) })),
        el('span', { class: 'menuezeile-pfeil', text: 'nachtragen' })
      ));
    }
    anhaengen(wurzel, liste);
  }

  if (alle.length === 0) {
    anhaengen(wurzel, el('div', { class: 'leer' }, el('p', { text: 'Noch kein Zitat festgehalten. Die erste Phrase kommt bestimmt.' })));
    return;
  }

  let letzterMonat = '';
  const sammlung = el('section', {});
  for (const b of alle) {
    const d = new Date(b.datum);
    const monat = d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
    if (monat !== letzterMonat) {
      sammlung.append(el('h2', { class: 'abschnitt-titel', text: monat }));
      letzterMonat = monat;
    }
    sammlung.append(el('div', { class: 'phrasenzeile', onclick: () => zitatBlatt(wurzel, [b], `${spielerNameVon(b.spielerId)} · ${datum(b.datum)}`, null) },
      el('span', { class: 'phrasen-wort', text: `„${b.zitat}"` }),
      el('span', { class: 'phrasen-quelle', text: `${spielerNameVon(b.spielerId)} · ${datum(b.datum)}` })
    ));
  }
  anhaengen(wurzel, sammlung);
}

const spielerNameVon = id => S.spieler.find(s => s.id === id)?.name ?? 'Unbekannt';

// --- Saison, Beitrag, Konto ----------------------------------------------

function saison(wurzel) {
  const e = S.einstellungen;
  const feld = (wert, platzhalter, label, inputmode) =>
    el('input', { class: 'feld', type: 'text', value: wert ?? '', placeholder: platzhalter, 'aria-label': label, inputmode });

  const saisonFeld = feld(e.saison, 'Saison 2026/27', 'Saison');
  const beitragFeld = feld(String(e.jahresbeitrag ?? VORGABEN.jahresbeitrag).replace('.', ','), '150', 'Jahresbeitrag', 'decimal');
  const kisteFeld = feld(String(e.kistenpreis ?? VORGABEN.kistenpreis).replace('.', ','), '15', 'Kistenpreis', 'decimal');
  const ibanFeld = feld(e.iban, 'DE…', 'IBAN');
  const inhaberFeld = feld(e.inhaber, 'Kontoinhaber', 'Kontoinhaber');

  const sichern = async () => {
    await einstellung('saison', saisonFeld.value.trim());
    await einstellung('jahresbeitrag', betragLesen(beitragFeld.value) || VORGABEN.jahresbeitrag);
    await einstellung('kistenpreis', betragLesen(kisteFeld.value) || VORGABEN.kistenpreis);
    await einstellung('iban', ibanFeld.value.trim());
    await einstellung('inhaber', inhaberFeld.value.trim());
    toast('Gespeichert');
    melden();
  };

  const schonGebucht = id => buchungenVon(id).some(b => b.art === 'jahresbeitrag');

  anhaengen(wurzel, 
    kopf(wurzel, 'Saison und Beitrag'),
    el('section', { class: 'formular formular--seite' },
      el('label', { class: 'etikett' }, 'Saison', saisonFeld),
      el('label', { class: 'etikett' }, 'Jahresbeitrag in Euro', beitragFeld),
      el('label', { class: 'etikett' }, 'Preis einer Kiste in Euro', kisteFeld),
      el('label', { class: 'etikett' }, 'IBAN für die Abrechnung', ibanFeld),
      el('label', { class: 'etikett' }, 'Kontoinhaber', inhaberFeld),
      el('button', { class: 'knopf knopf--voll knopf--breit', type: 'button', text: 'Speichern', onclick: sichern })
    ),
    el('section', { class: 'menue' },
      el('div', { class: 'menuezeile' },
        el('span', {},
          el('strong', { text: 'Jahresbeitrag buchen' }),
          el('span', { class: 'menuezeile-zeile', text: `${aktiveSpieler().filter(s => !schonGebucht(s.id)).length} Spieler ohne Beitragsbuchung` })
        ),
        el('button', { class: 'knopf knopf--rand', type: 'button', text: 'Buchen', onclick: () => beitragBuchen(wurzel) })
      )
    ),
    e.letzterAbschluss ? el('p', { class: 'fussnote', text: `Letzter Abschluss: ${datum(e.letzterAbschluss.erstellt)}` }) : null
  );
}

function beitragBuchen(wurzel) {
  const betrag = S.einstellungen.jahresbeitrag ?? VORGABEN.jahresbeitrag;
  const offen = aktiveSpieler().filter(s => !buchungenVon(s.id).some(b => b.art === 'jahresbeitrag'));
  if (offen.length === 0) {
    toast('Alle aktiven Spieler haben den Beitrag schon gebucht.');
    return;
  }
  const gewaehlt = new Set(offen.map(s => s.id));
  const liste = el('div', { class: 'wahlliste' });
  for (const s of offen) {
    const kasten = el('input', { type: 'checkbox', checked: true });
    kasten.addEventListener('change', () => kasten.checked ? gewaehlt.add(s.id) : gewaehlt.delete(s.id));
    liste.append(el('label', { class: 'kasten' }, kasten, el('span', { text: s.name })));
  }
  blatt({
    titel: `Jahresbeitrag ${eur(betrag)}`,
    inhalt: el('div', {},
      el('p', { class: 'blatt-text', text: 'Wer den Beitrag nicht zahlt, wird abgewählt. Spieler mit bestehender Buchung stehen nicht in der Liste.' }),
      liste),
    aktion: el('div', { class: 'blatt-aktion' },
      el('button', { class: 'knopf knopf--still', type: 'button', text: 'Abbrechen', onclick: blattSchliessen }),
      el('button', {
        class: 'knopf knopf--voll', type: 'button', text: `${gewaehlt.size} buchen`, onclick: async () => {
          blattSchliessen();
          for (const id of gewaehlt) {
            await buchen({ spielerId: id, art: 'jahresbeitrag', bezeichnung: 'Jahresbeitrag', datum: new Date().toISOString(), betrag, einheit: 'eur' });
          }
          zeichnen(wurzel);
          toast(`Jahresbeitrag für ${gewaehlt.size} Spieler gebucht`);
        }
      })
    )
  });
}

// --- Einrichtung beim ersten Start ---------------------------------------

export async function grunddatenAnlegen() {
  await db.setzen('strafenarten', STRAFENARTEN.map((a, i) => ({
    id: db.id(), aktiv: true, frei: false, ...a, sortierung: i
  })));
  await db.setzen('aemter', AEMTER.map(name => ({ id: db.id(), name, inhaber: [] })));
  await einstellung('jahresbeitrag', VORGABEN.jahresbeitrag);
  await einstellung('kistenpreis', VORGABEN.kistenpreis);
  await einstellung('eingerichtet', true);
  await laden();
}

export function einrichtung(wurzel, fertig) {
  leeren(wurzel);
  const feld = el('textarea', {
    class: 'feld feld--mehrzeilig', rows: 12, 'aria-label': 'Kader, ein Name pro Zeile',
    placeholder: 'Ein Name pro Zeile:\n\nTizi\nNoel\nHaas\nNelson\n…'
  });
  const hinweis = el('p', { class: 'warnhinweis versteckt' });

  const weiter = async () => {
    const namen = feld.value.split('\n').map(n => n.trim()).filter(Boolean);
    if (namen.length < 2) {
      hinweis.textContent = 'Trage mindestens zwei Namen ein, einen pro Zeile.';
      hinweis.classList.remove('versteckt');
      return;
    }
    const kleinbuchstaben = namen.map(n => n.toLowerCase());
    const doppelt = [...new Set(kleinbuchstaben.filter((n, i) => kleinbuchstaben.indexOf(n) !== i))];
    if (doppelt.length) {
      hinweis.textContent = `Diese Namen kommen doppelt vor: ${doppelt.join(', ')}. Zwei Spieler brauchen zwei unterscheidbare Namen.`;
      hinweis.classList.remove('versteckt');
      return;
    }
    await db.setzen('spieler', namen.map((name, i) => ({ id: db.id(), name, aktiv: true, sortierung: i })));
    await grunddatenAnlegen();
    const beitrag = await fragen({
      titel: `Jahresbeitrag buchen?`,
      text: `${namen.length} Spieler sind angelegt. Soll der Jahresbeitrag von ${eur(VORGABEN.jahresbeitrag)} gleich für alle gebucht werden? Einzelne kannst du danach löschen.`,
      knopf: 'Beitrag buchen'
    });
    if (beitrag) {
      for (const s of S.spieler) {
        await buchen({ spielerId: s.id, art: 'jahresbeitrag', bezeichnung: 'Jahresbeitrag', datum: new Date().toISOString(), betrag: VORGABEN.jahresbeitrag, einheit: 'eur' });
      }
    }
    fertig();
  };

  anhaengen(wurzel, 
    el('header', { class: 'kopf kopf--gross' },
      el('div', {},
        el('h1', { class: 'kopf-titel kopf-titel--gross', text: 'Strafenkasse' }),
        el('p', { class: 'kopf-zeile', text: 'Einmal einrichten, dann nie wieder abtippen.' })
      )
    ),
    el('section', { class: 'formular formular--seite' },
      el('h2', { class: 'abschnitt-titel', text: 'Wer ist im Kader?' }),
      el('p', { class: 'blatt-text', text: 'Spitznamen genügen — sie stehen später auf den Kacheln. Strafenarten und Preise aus der letzten Saison sind schon hinterlegt und in der Verwaltung änderbar.' }),
      feld, hinweis,
      el('button', { class: 'knopf knopf--voll knopf--breit', type: 'button', text: 'Kader anlegen', onclick: weiter }),
      el('button', {
        class: 'knopf knopf--still knopf--breit', type: 'button', text: 'Sicherung einlesen',
        onclick: () => {
          const eingabe = el('input', { type: 'file', accept: '.json,application/json', class: 'versteckt' });
          eingabe.addEventListener('change', async () => {
            const d = eingabe.files?.[0]; eingabe.remove();
            if (d && await sicherungEinlesen(d)) fertig();
          });
          document.body.append(eingabe); eingabe.click();
        }
      })
    )
  );
}
