// Konten: wer steht wie da, und die Buchungen, die nicht in der Halle entstehen -
// Zahlungseingang, Gutschrift, Verzug.

import { el, leeren, blatt, blattSchliessen, toast, fragen, anhaengen } from './ui.js';
import { S, aktiveSpieler, spielerName, buchungenVon, buchen, buchungLoeschen, buchungAendern } from './store.js';
import { eur, datum, betragLesen } from './format.js';
import { saldo, offeneKisten, verzugVorschlag, EINHEIT_KISTE } from './konto.js';

let offenerSpieler = null;

export function zeichnen(wurzel) {
  leeren(wurzel);
  if (offenerSpieler) return kontoauszug(wurzel, offenerSpieler);

  const spieler = aktiveSpieler()
    .map(s => ({ ...s, stand: saldo(buchungenVon(s.id)), kisten: offeneKisten(buchungenVon(s.id)) }))
    .sort((a, b) => b.stand - a.stand);

  const gesamt = spieler.reduce((s, p) => s + p.stand, 0);
  const schuldner = spieler.filter(p => p.stand > 0).length;

  anhaengen(wurzel, 
    el('header', { class: 'kopf' },
      el('div', {},
        el('h1', { class: 'kopf-titel', text: 'Konten' }),
        el('p', { class: 'kopf-zeile', text: `${schuldner} von ${spieler.length} offen` })
      ),
      el('div', { class: 'kopf-kasse' },
        el('span', { class: 'kopf-kasse-wert', text: eur(gesamt) }),
        el('span', { class: 'kopf-kasse-label', text: 'Forderung' })
      )
    )
  );

  if (spieler.length === 0) {
    anhaengen(wurzel, el('div', { class: 'leer' }, el('p', { text: 'Noch kein Kader angelegt.' })));
    return;
  }

  const liste = el('section', { class: 'kontenliste' });
  for (const p of spieler) {
    liste.append(el('button', { class: 'kontozeile', type: 'button', onclick: () => { offenerSpieler = p.id; zeichnen(wurzel); } },
      el('span', { class: 'kontozeile-name', text: p.name }),
      p.kisten > 0 ? el('span', { class: 'merker', text: `${p.kisten} Kiste${p.kisten > 1 ? 'n' : ''}` }) : null,
      el('span', { class: `kontozeile-stand${p.stand < 0 ? ' kontozeile-stand--guthaben' : ''}${p.stand === 0 ? ' kontozeile-stand--null' : ''}`, text: eur(p.stand) })
    ));
  }
  anhaengen(wurzel, liste,
    el('p', { class: 'fussnote', text: 'Positiver Wert: zu zahlen. Negativer Wert: Guthaben.' })
  );
}

export function zuruecksetzen() { offenerSpieler = null; }

// --- Kontoauszug ----------------------------------------------------------

function kontoauszug(wurzel, spielerId) {
  const buchungen = buchungenVon(spielerId).slice().reverse();
  const stand = saldo(buchungenVon(spielerId));
  const kisten = offeneKisten(buchungenVon(spielerId));
  const aemter = S.aemter.filter(a => (a.inhaber ?? []).includes(spielerId)).map(a => a.name);

  anhaengen(wurzel, 
    el('header', { class: 'kopf kopf--zurueck' },
      el('button', { class: 'knopf-still knopf-zurueck', type: 'button', onclick: () => { offenerSpieler = null; zeichnen(wurzel); } }, '‹ Konten'),
      el('div', { class: 'kopf-person' },
        el('h1', { class: 'kopf-titel', text: spielerName(spielerId) }),
        aemter.length ? el('p', { class: 'kopf-zeile', text: `Ämter: ${aemter.join(', ')}` }) : null
      ),
      el('div', { class: 'kopf-kasse' },
        el('span', { class: `kopf-kasse-wert${stand < 0 ? ' guthaben' : ''}`, text: eur(stand) }),
        el('span', { class: 'kopf-kasse-label', text: stand < 0 ? 'Guthaben' : 'zu zahlen' })
      )
    ),
    el('div', { class: 'aktionsreihe' },
      el('button', { class: 'knopf knopf--voll', type: 'button', text: 'Zahlung', onclick: () => zahlungBuchen(wurzel, spielerId, stand) }),
      el('button', { class: 'knopf knopf--rand', type: 'button', text: 'Gutschrift', onclick: () => gutschriftBuchen(wurzel, spielerId) }),
      el('button', { class: 'knopf knopf--rand', type: 'button', text: 'Verzug', onclick: () => verzugBuchen(wurzel, spielerId) })
    )
  );

  if (kisten > 0) {
    anhaengen(wurzel, el('section', { class: 'kisten' },
      el('h2', { class: 'abschnitt-titel', text: `Offen: ${kisten} Kiste${kisten > 1 ? 'n' : ''}` }),
      el('div', { class: 'kisten-aktion' },
        el('button', {
          class: 'knopf knopf--rand', type: 'button', text: `Mit ${eur(S.einstellungen.kistenpreis)} ablösen`,
          onclick: () => kisteAbloesen(wurzel, spielerId)
        }),
        el('button', { class: 'knopf knopf--still', type: 'button', text: 'Geliefert', onclick: () => kisteErledigt(wurzel, spielerId) })
      )
    ));
  }

  const liste = el('section', { class: 'auszug' },
    el('h2', { class: 'abschnitt-titel' }, 'Buchungen', el('span', { class: 'abschnitt-zahl', text: buchungen.length }))
  );
  if (buchungen.length === 0) liste.append(el('p', { class: 'tagesliste-leer', text: 'Noch keine Buchung.' }));
  for (const b of buchungen) {
    liste.append(el('div', { class: `zeile${b.einheit === EINHEIT_KISTE ? ' zeile--natural' : ''}` },
      el('span', { class: 'zeile-zeit', text: datum(b.datum) }),
      el('span', { class: 'zeile-text' },
        b.bezeichnung ?? bezeichnungFuer(b.art),
        b.notiz ? el('span', { class: 'zeile-notiz', text: ` (${b.notiz})` }) : null,
        b.einheit === EINHEIT_KISTE && b.erledigt ? el('span', { class: 'zeile-notiz', text: ' · erledigt' }) : null
      ),
      el('span', { class: `zeile-betrag${b.betrag < 0 ? ' zeile-betrag--gut' : ''}`, text: b.einheit === EINHEIT_KISTE ? `${b.menge} Kiste` : eur(b.betrag) }),
      el('button', {
        class: 'zeile-weg', type: 'button', 'aria-label': 'Buchung löschen', text: '✕',
        onclick: async () => {
          if (!await fragen({ titel: 'Buchung löschen?', text: `${b.bezeichnung ?? bezeichnungFuer(b.art)} über ${eur(b.betrag)} vom ${datum(b.datum)}.`, knopf: 'Löschen', ton: 'warn' })) return;
          await buchungLoeschen(b.id); zeichnen(wurzel); toast('Buchung gelöscht');
        }
      })
    ));
  }
  anhaengen(wurzel, liste);
}

const bezeichnungFuer = art => ({
  zahlung: 'Zahlung eingegangen', gutschrift: 'Gutschrift',
  verzug: 'Verzug', jahresbeitrag: 'Jahresbeitrag', strafe: 'Strafe'
}[art] ?? art);

// --- Buchungsformulare ----------------------------------------------------

function betragsblatt({ titel, vorbelegt, knopf, hinweis, speichern }) {
  const feld = el('input', { class: 'feld feld--gross', type: 'text', inputmode: 'decimal', value: vorbelegt ?? '', 'aria-label': 'Betrag in Euro' });
  const notiz = el('input', { class: 'feld', type: 'text', placeholder: 'Notiz (optional)', 'aria-label': 'Notiz' });
  const ab = async () => {
    const betrag = betragLesen(feld.value);
    if (!Number.isFinite(betrag) || betrag <= 0) { feld.classList.add('feld--fehler'); feld.focus(); return; }
    blattSchliessen();
    await speichern(betrag, notiz.value.trim() || null);
  };
  blatt({
    titel,
    inhalt: el('div', { class: 'formular' }, hinweis ? el('p', { class: 'blatt-text', text: hinweis }) : null, feld, notiz),
    aktion: el('div', { class: 'blatt-aktion' },
      el('button', { class: 'knopf knopf--still', type: 'button', text: 'Abbrechen', onclick: blattSchliessen }),
      el('button', { class: 'knopf knopf--voll', type: 'button', text: knopf, onclick: ab })
    )
  });
  setTimeout(() => { feld.focus(); feld.select(); }, 60);
}

function zahlungBuchen(wurzel, spielerId, stand) {
  betragsblatt({
    titel: 'Zahlung eingegangen',
    vorbelegt: stand > 0 ? String(stand).replace('.', ',') : '',
    knopf: 'Buchen',
    hinweis: stand > 0 ? `Offen sind ${eur(stand)}.` : null,
    speichern: async (betrag, notiz) => {
      await buchen({ spielerId, art: 'zahlung', bezeichnung: 'Zahlung eingegangen', datum: new Date().toISOString(), betrag: -betrag, einheit: 'eur', notiz });
      zeichnen(wurzel);
      toast(`${spielerName(spielerId)} · ${eur(betrag)} verbucht`);
    }
  });
}

function gutschriftBuchen(wurzel, spielerId) {
  betragsblatt({
    titel: 'Gutschrift',
    knopf: 'Buchen',
    hinweis: 'Auslagen, Getränkekauf, Rückerstattung.',
    speichern: async (betrag, notiz) => {
      await buchen({ spielerId, art: 'gutschrift', bezeichnung: 'Gutschrift', datum: new Date().toISOString(), betrag: -betrag, einheit: 'eur', notiz });
      zeichnen(wurzel);
      toast(`Gutschrift ${eur(betrag)} für ${spielerName(spielerId)}`);
    }
  });
}

function verzugBuchen(wurzel, spielerId) {
  const jetzt = new Date();
  const vorschlag = verzugVorschlag(buchungenVon(spielerId), jetzt.getFullYear(), jetzt.getMonth() + 1);
  betragsblatt({
    titel: 'Verzug',
    vorbelegt: vorschlag > 0 ? String(vorschlag).replace('.', ',') : '',
    knopf: 'Buchen',
    hinweis: vorschlag > 0
      ? `Vorschlag: doppelte Strafsumme des Vormonats (${eur(vorschlag)}). Änderbar.`
      : 'Im Vormonat gab es keine Strafen, also kein Vorschlag.',
    speichern: async (betrag, notiz) => {
      await buchen({ spielerId, art: 'verzug', bezeichnung: 'Verzug', datum: new Date().toISOString(), betrag, einheit: 'eur', notiz });
      zeichnen(wurzel);
      toast(`Verzug ${eur(betrag)} für ${spielerName(spielerId)}`);
    }
  });
}

async function kisteAbloesen(wurzel, spielerId) {
  const preis = S.einstellungen.kistenpreis ?? 15;
  const offen = buchungenVon(spielerId).filter(b => b.einheit === EINHEIT_KISTE && !b.erledigt);
  if (!await fragen({ titel: 'Kiste ablösen?', text: `Eine Kiste wird mit ${eur(preis)} belastet und als erledigt markiert.`, knopf: 'Ablösen' })) return;
  const erste = offen[0];
  await buchen({ spielerId, art: 'strafe', bezeichnung: 'Kiste in Geld abgelöst', datum: new Date().toISOString(), betrag: preis, einheit: 'eur', notiz: null });
  await buchungAendern(erste.id, { erledigt: true });
  zeichnen(wurzel);
  toast(`Kiste mit ${eur(preis)} abgelöst`);
}

async function kisteErledigt(wurzel, spielerId) {
  const offen = buchungenVon(spielerId).filter(b => b.einheit === EINHEIT_KISTE && !b.erledigt);
  await buchungAendern(offen[0].id, { erledigt: true });
  zeichnen(wurzel);
  toast('Kiste als geliefert vermerkt');
}
