// Kleine Oberflaechenhelfer: Elemente bauen, Blatt von unten, Toast mit
// Rueckgaengig, Strichliste. Kein Framework, keine Abhaengigkeiten.

export function el(tag, attrs = {}, ...kinder) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(n.dataset, v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const kind of kinder.flat()) {
    if (kind === null || kind === undefined || kind === false) continue;
    n.append(kind.nodeType ? kind : document.createTextNode(String(kind)));
  }
  return n;
}

export const $ = sel => document.querySelector(sel);

/** Wie append, ueberspringt aber null und false - sonst landet "null" als Text im DOM. */
export function anhaengen(ziel, ...kinder) {
  for (const k of kinder.flat()) {
    if (k === null || k === undefined || k === false) continue;
    ziel.append(k);
  }
  return ziel;
}
export const leeren = n => { while (n.firstChild) n.removeChild(n.firstChild); return n; };

// --- Strichliste ------------------------------------------------------------
// Gruppen aus vier Strichen mit Querstrich, wie im Notizbuch. Ab 25 wird gezaehlt,
// weil 30 Striche auf einer Kachel niemand mehr liest.

export function strichliste(anzahl) {
  if (anzahl <= 0) return el('span', { class: 'striche striche--leer' });
  if (anzahl > 24) return el('span', { class: 'striche striche--zahl', text: `${anzahl}×` });
  const gruppen = Math.floor(anzahl / 5);
  const rest = anzahl % 5;
  const breite = gruppen * 26 + (rest ? rest * 5 + 4 : 0);
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'striche');
  svg.setAttribute('viewBox', `0 0 ${Math.max(breite, 1)} 20`);
  svg.setAttribute('height', '18');
  svg.setAttribute('aria-label', `${anzahl} Strafen heute`);
  let x = 0;
  const strich = (x1, y1, x2, y2) => {
    const l = document.createElementNS(ns, 'line');
    l.setAttribute('x1', x1); l.setAttribute('y1', y1);
    l.setAttribute('x2', x2); l.setAttribute('y2', y2);
    svg.append(l);
  };
  for (let g = 0; g < gruppen; g++) {
    for (let i = 0; i < 4; i++) strich(x + i * 5 + 2, 2, x + i * 5 + 2, 18);
    strich(x, 15, x + 21, 5);
    x += 26;
  }
  for (let i = 0; i < rest; i++) strich(x + i * 5 + 2, 2, x + i * 5 + 2, 18);
  return svg;
}

// --- Blatt von unten -------------------------------------------------------

let offenesBlatt = null;

export function blatt({ titel, inhalt, aktion }) {
  blattSchliessen();
  const hintergrund = el('div', { class: 'hintergrund', onclick: blattSchliessen });
  const kopf = el('header', { class: 'blatt-kopf' },
    el('h2', { text: titel }),
    el('button', { class: 'knopf-still', type: 'button', onclick: blattSchliessen, 'aria-label': 'Schließen', text: '✕' })
  );
  const b = el('section', { class: 'blatt', role: 'dialog', 'aria-modal': 'true', 'aria-label': titel },
    el('div', { class: 'blatt-griff' }), kopf, inhalt, aktion
  );
  document.body.append(hintergrund, b);
  requestAnimationFrame(() => b.classList.add('blatt--offen'));
  offenesBlatt = { hintergrund, b };
  // Kein automatischer Fokus: sonst faehrt auf dem iPhone bei jeder Strafe die
  // Tastatur hoch. Formulare setzen den Fokus selbst, Auswahllisten nicht.
  return b;
}

export function blattSchliessen() {
  if (!offenesBlatt) return;
  const { hintergrund, b } = offenesBlatt;
  offenesBlatt = null;
  b.classList.remove('blatt--offen');
  hintergrund.remove();
  setTimeout(() => b.remove(), 180);
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') blattSchliessen(); });

// --- Toast mit Rueckgaengig ------------------------------------------------

let toastTimer = null;

export function toast(text, { rueckgaengig, dauer = 5000, ton = 'normal' } = {}) {
  clearTimeout(toastTimer);
  const alt = $('.toast');
  alt?.remove();
  const t = el('div', { class: `toast toast--${ton}`, role: 'status' },
    el('span', { class: 'toast-text', text }),
    rueckgaengig && el('button', {
      class: 'toast-knopf', type: 'button', text: 'Rückgängig',
      onclick: async () => { t.remove(); clearTimeout(toastTimer); await rueckgaengig(); }
    })
  );
  document.body.append(t);
  requestAnimationFrame(() => t.classList.add('toast--offen'));
  toastTimer = setTimeout(() => {
    t.classList.remove('toast--offen');
    setTimeout(() => t.remove(), 200);
  }, dauer);
}

export function haptik() {
  navigator.vibrate?.(12);
}

// --- Bestaetigung ----------------------------------------------------------

export function fragen({ titel, text, knopf = 'Ja', ton = 'normal' }) {
  return new Promise(ok => {
    const schliessen = antwort => { blattSchliessen(); ok(antwort); };
    blatt({
      titel,
      inhalt: el('p', { class: 'blatt-text', text }),
      aktion: el('div', { class: 'blatt-aktion' },
        el('button', { class: 'knopf knopf--still', type: 'button', text: 'Abbrechen', onclick: () => schliessen(false) }),
        el('button', { class: `knopf knopf--${ton === 'warn' ? 'warn' : 'voll'}`, type: 'button', text: knopf, onclick: () => schliessen(true) })
      )
    });
  });
}
