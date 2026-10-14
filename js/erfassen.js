// Startscreen. Zwei Taps bis zur gebuchten Strafe, kein Screenwechsel,
// kein Bestaetigungsdialog. Korrektur laeuft ueber Rueckgaengig und die Tagesliste.

import { el, leeren, blatt, blattSchliessen, toast, haptik, strichliste, anhaengen } from './ui.js';
import { S, aktiveSpieler, aktiveArten, spielerName, art, buchen, buchungLoeschen, buchungAendern } from './store.js';
import { eur, uhr, monatName, betragLesen } from './format.js';
import { saldo, monatsgrenzen, EINHEIT_KISTE } from './konto.js';

let modus = 'spieler';      // 'spieler' = Spieler zuerst, 'strafe' = Strafe zuerst
let gewaehlteArt = null;    // im Modus 'strafe'
let auswahl = new Set();    // im Modus 'strafe': markierte Spieler

const tagesbeginn = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
};

const heuteBuchungen = () => S.buchungen.filter(b => b.datum >= tagesbeginn() && b.art === 'strafe');

export function zeichnen(wurzel) {
  leeren(wurzel);
  const jetzt = new Date();
  const { von, bis } = monatsgrenzen(jetzt.getFullYear(), jetzt.getMonth() + 1);
  const monatSumme = S.buchungen
    .filter(b => b.datum >= von && b.datum < bis && (b.einheit ?? 'eur') === 'eur' && b.art === 'strafe')
    .reduce((s, b) => s + b.betrag, 0);

  anhaengen(wurzel, 
    el('header', { class: 'kopf' },
      el('div', {},
        el('h1', { class: 'kopf-titel', text: 'Strafenkasse' }),
        el('p', { class: 'kopf-zeile', text: `${monatName(jetzt.getFullYear(), jetzt.getMonth() + 1)} · ${eur(monatSumme)} Strafen` })
      ),
      el('div', { class: 'kopf-kasse' },
        el('span', { class: 'kopf-kasse-wert', text: eur(saldo(S.buchungen)) }),
        el('span', { class: 'kopf-kasse-label', text: 'offen' })
      )
    ),
    modusschalter(wurzel),
    modus === 'strafe' ? strafenwahlLeiste(wurzel) : null,
    raster(wurzel),
    tagesliste(wurzel)
  );
}

function modusschalter(wurzel) {
  const knopf = (wert, text) => el('button', {
    class: `schalter-knopf${modus === wert ? ' schalter-knopf--an' : ''}`,
    type: 'button',
    'aria-pressed': modus === wert,
    text,
    onclick: () => {
      modus = wert; gewaehlteArt = null; auswahl.clear(); zeichnen(wurzel);
      if (wert === 'strafe') strafenblatt(wurzel, a => { gewaehlteArt = a; zeichnen(wurzel); });
    }
  });
  return el('div', { class: 'schalter', role: 'group', 'aria-label': 'Erfassungsreihenfolge' },
    knopf('spieler', 'Spieler zuerst'),
    knopf('strafe', 'Strafe zuerst')
  );
}

function strafenwahlLeiste(wurzel) {
  return el('div', { class: 'wahlleiste' },
    el('button', {
      class: 'wahlleiste-knopf', type: 'button',
      onclick: () => strafenblatt(wurzel, a => { gewaehlteArt = a; zeichnen(wurzel); })
    },
      el('span', { class: 'wahlleiste-name', text: gewaehlteArt ? gewaehlteArt.name : 'Strafe wählen' }),
      gewaehlteArt && el('span', { class: 'wahlleiste-betrag', text: betragText(gewaehlteArt) })
    ),
    auswahl.size > 0 && el('button', {
      class: 'knopf knopf--voll', type: 'button',
      text: `${auswahl.size} ${auswahl.size === 1 ? 'Spieler' : 'Spieler'} buchen`,
      onclick: () => mehrfachBuchen(wurzel)
    })
  );
}

const betragText = a => a.einheit === EINHEIT_KISTE
  ? `${a.betrag > 1 ? a.betrag + ' ' : ''}Kiste`
  : (a.frei ? 'Betrag frei' : eur(a.betrag));

function raster(wurzel) {
  const spieler = aktiveSpieler();
  if (spieler.length === 0) {
    return el('div', { class: 'leer' },
      el('p', { text: 'Noch kein Kader angelegt.' }),
      el('button', { class: 'knopf knopf--voll', type: 'button', text: 'Kader anlegen', onclick: () => location.hash = '#verwaltung/spieler' })
    );
  }
  const heute = heuteBuchungen();
  const g = el('div', { class: 'raster' });
  for (const s of spieler) {
    const heuteZahl = heute.filter(b => b.spielerId === s.id).length;
    const stand = saldo(S.buchungen.filter(b => b.spielerId === s.id));
    const markiert = auswahl.has(s.id);
    g.append(el('button', {
      class: `kachel${markiert ? ' kachel--markiert' : ''}${heuteZahl ? ' kachel--aktiv' : ''}`,
      type: 'button',
      'aria-pressed': modus === 'strafe' ? markiert : null,
      onclick: () => kachelTap(wurzel, s)
    },
      el('span', { class: 'kachel-name', text: s.name }),
      el('span', { class: 'kachel-striche' }, strichliste(heuteZahl)),
      el('span', { class: `kachel-saldo${stand < 0 ? ' kachel-saldo--guthaben' : ''}`, text: eur(stand) })
    ));
  }
  return g;
}

function kachelTap(wurzel, spieler) {
  if (modus === 'spieler') {
    strafenblatt(wurzel, a => buchenEine(wurzel, spieler, a));
    return;
  }
  if (!gewaehlteArt) { strafenblatt(wurzel, a => { gewaehlteArt = a; zeichnen(wurzel); }); return; }
  auswahl.has(spieler.id) ? auswahl.delete(spieler.id) : auswahl.add(spieler.id);
  haptik();
  zeichnen(wurzel);
}

// --- Strafenblatt ----------------------------------------------------------

function strafenblatt(wurzel, gewaehlt) {
  const liste = el('div', { class: 'artenliste' });
  const suche = el('input', {
    class: 'suche', type: 'search', placeholder: 'Strafe suchen', 'aria-label': 'Strafe suchen',
    autocomplete: 'off', oninput: () => fuellen(suche.value)
  });

  function fuellen(filter = '') {
    leeren(liste);
    const norm = filter.trim().toLowerCase();
    const arten = aktiveArten().filter(a => !norm || a.name.toLowerCase().includes(norm));
    if (arten.length === 0) {
      liste.append(el('p', { class: 'blatt-text', text: 'Keine Strafe gefunden. Nimm „Sonstiges" mit freiem Betrag.' }));
      return;
    }
    arten.forEach((a, i) => {
      liste.append(el('button', {
        class: `artzeile${i < 6 && !norm ? ' artzeile--haeufig' : ''}`, type: 'button',
        onclick: () => { blattSchliessen(); gewaehlt(a); }
      },
        el('span', { class: 'artzeile-name', text: a.name }),
        el('span', { class: `artzeile-betrag${a.vorzeichen < 0 ? ' artzeile-betrag--gut' : ''}`, text: betragText(a) })
      ));
    });
  }

  fuellen();
  blatt({ titel: 'Welche Strafe?', inhalt: el('div', {}, suche, liste) });
}

// --- Buchen ---------------------------------------------------------------

async function buchenEine(wurzel, spieler, a) {
  if (a.frei) return freierBetrag(wurzel, spieler, a);
  const satz = await schreiben(spieler.id, a);
  haptik();
  zeichnen(wurzel);
  const rueckgaengig = async () => { await buchungLoeschen(satz.id); zeichnen(wurzel); };
  if (a.zitat) return zitatBlatt(wurzel, [satz], `${spieler.name} · ${a.name} · ${betragText(a)} ist gebucht.`, rueckgaengig);
  toast(`${spieler.name} · ${a.name} · ${betragText(a)}`, { rueckgaengig });
}

async function mehrfachBuchen(wurzel) {
  const a = gewaehlteArt;
  const ids = [...auswahl];
  if (a.frei) return freierBetrag(wurzel, null, a, ids);
  const saetze = [];
  for (const spielerId of ids) saetze.push(await schreiben(spielerId, a));
  auswahl.clear();
  haptik();
  zeichnen(wurzel);
  const rueckgaengig = async () => {
    for (const s of saetze) await buchungLoeschen(s.id);
    zeichnen(wurzel);
  };
  if (a.zitat) return zitatBlatt(wurzel, saetze, `${ids.length} × ${a.name} ist gebucht.`, rueckgaengig);
  toast(`${ids.length} × ${a.name} gebucht`, { rueckgaengig });
}

// --- Zitat ----------------------------------------------------------------
// Die Buchung steht schon, wenn dieses Blatt aufgeht. Das Zitat ist ein
// Nachtrag, kein Pflichtfeld - sonst kostet die haeufigste Strafe im Training
// jedes Mal eine Tastatur.

export function zitatBlatt(wurzel, saetze, hinweis, rueckgaengig) {
  const feld = el('input', {
    class: 'feld', type: 'text', placeholder: 'Wortlaut', 'aria-label': 'Was wurde gesagt?',
    autocapitalize: 'sentences', value: saetze[0]?.zitat ?? ''
  });
  const speichern = async () => {
    const text = feld.value.trim();
    blattSchliessen();
    if (text) for (const s of saetze) await buchungAendern(s.id, { zitat: text });
    zeichnen(wurzel);
    toast(text ? `„${text}" festgehalten` : hinweis, { rueckgaengig });
  };
  feld.addEventListener('keydown', e => { if (e.key === 'Enter') speichern(); });
  blatt({
    titel: 'Was wurde gesagt?',
    inhalt: el('div', { class: 'formular' }, el('p', { class: 'blatt-text', text: hinweis }), feld),
    aktion: el('div', { class: 'blatt-aktion' },
      el('button', {
        class: 'knopf knopf--still', type: 'button', text: 'Später',
        onclick: () => { blattSchliessen(); toast(hinweis, { rueckgaengig }); }
      }),
      el('button', { class: 'knopf knopf--voll', type: 'button', text: 'Festhalten', onclick: speichern })
    )
  });
  setTimeout(() => feld.focus(), 60);
}


function schreiben(spielerId, a, betrag = null, notiz = null) {
  const wert = betrag ?? a.betrag;
  return buchen({
    spielerId,
    art: 'strafe',
    strafenartId: a.id,
    bezeichnung: a.name,
    datum: new Date().toISOString(),
    betrag: a.einheit === EINHEIT_KISTE ? 0 : (a.vorzeichen ?? 1) * wert,
    menge: a.einheit === EINHEIT_KISTE ? wert : 1,
    einheit: a.einheit ?? 'eur',
    notiz
  });
}

function freierBetrag(wurzel, spieler, a, ids = null) {
  const feld = el('input', { class: 'feld', type: 'text', inputmode: 'decimal', placeholder: '0,00', 'aria-label': 'Betrag in Euro' });
  const notiz = el('input', { class: 'feld', type: 'text', placeholder: 'Wofür?', 'aria-label': 'Notiz' });
  const speichern = async () => {
    const betrag = betragLesen(feld.value);
    if (!Number.isFinite(betrag) || betrag === 0) { feld.classList.add('feld--fehler'); feld.focus(); return; }
    blattSchliessen();
    const ziele = ids ?? [spieler.id];
    const saetze = [];
    for (const z of ziele) saetze.push(await schreiben(z, a, betrag, notiz.value.trim() || null));
    auswahl.clear();
    haptik();
    zeichnen(wurzel);
    toast(`${ziele.length === 1 ? spielerName(ziele[0]) : ziele.length + ' Spieler'} · ${eur(betrag)}`, {
      rueckgaengig: async () => { for (const s of saetze) await buchungLoeschen(s.id); zeichnen(wurzel); }
    });
  };
  blatt({
    titel: a.name,
    inhalt: el('div', { class: 'formular' }, feld, notiz),
    aktion: el('div', { class: 'blatt-aktion' },
      el('button', { class: 'knopf knopf--still', type: 'button', text: 'Abbrechen', onclick: blattSchliessen }),
      el('button', { class: 'knopf knopf--voll', type: 'button', text: 'Buchen', onclick: speichern })
    )
  });
  setTimeout(() => feld.focus(), 60);
}

// --- Tagesliste -----------------------------------------------------------

function tagesliste(wurzel) {
  const heute = heuteBuchungen().slice().reverse();
  const abschnitt = el('section', { class: 'tagesliste' },
    el('h2', { class: 'abschnitt-titel' }, 'Heute', el('span', { class: 'abschnitt-zahl', text: heute.length })),
  );
  if (heute.length === 0) {
    abschnitt.append(el('p', { class: 'tagesliste-leer', text: 'Noch nichts erfasst. Tippe einen Spieler an.' }));
    return abschnitt;
  }
  for (const b of heute) {
    abschnitt.append(el('div', { class: 'zeile' },
      el('span', { class: 'zeile-zeit', text: uhr(b.datum) }),
      el('span', { class: 'zeile-text' },
        el('strong', { text: spielerName(b.spielerId) }), ' · ',
        b.bezeichnung ?? art(b.strafenartId)?.name ?? 'Strafe',
        b.notiz ? el('span', { class: 'zeile-notiz', text: ` (${b.notiz})` }) : null,
        b.zitat ? el('span', { class: 'zitat', text: `„${b.zitat}"` }) : null,
        !b.zitat && art(b.strafenartId)?.zitat
          ? el('button', {
              class: 'zitat-fehlt', type: 'button', text: 'Zitat nachtragen',
              onclick: () => zitatBlatt(wurzel, [b], `${spielerName(b.spielerId)} · ${b.bezeichnung}`, null)
            })
          : null
      ),
      el('span', { class: 'zeile-betrag', text: b.einheit === EINHEIT_KISTE ? `${b.menge} Kiste` : eur(b.betrag) }),
      el('button', {
        class: 'zeile-weg', type: 'button', 'aria-label': 'Buchung löschen', text: '✕',
        onclick: async () => { await buchungLoeschen(b.id); zeichnen(wurzel); toast('Buchung gelöscht'); }
      })
    ));
  }
  return abschnitt;
}
