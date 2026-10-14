// IndexedDB-Zugriff. Alles laeuft ueber Transaktionen, damit ein Abbruch mitten
// im Buchen keinen halben Zustand hinterlaesst.

const NAME = 'strafenkasse';
const VERSION = 1;

const STORES = {
  spieler: { keyPath: 'id' },
  strafenarten: { keyPath: 'id' },
  aemter: { keyPath: 'id' },
  buchungen: { keyPath: 'id', indices: [['spielerId', 'spielerId'], ['datum', 'datum']] },
  meta: { keyPath: 'key' }
};

let dbPromise = null;

export function id() {
  return (crypto.randomUUID?.() ?? String(Date.now()) + Math.random().toString(16).slice(2));
}

export function oeffnen() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((ok, fehler) => {
    const anfrage = indexedDB.open(NAME, VERSION);
    anfrage.onupgradeneeded = () => {
      const db = anfrage.result;
      for (const [name, cfg] of Object.entries(STORES)) {
        if (db.objectStoreNames.contains(name)) continue;
        const store = db.createObjectStore(name, { keyPath: cfg.keyPath });
        for (const [idxName, feld] of cfg.indices ?? []) store.createIndex(idxName, feld);
      }
    };
    anfrage.onsuccess = () => ok(anfrage.result);
    anfrage.onerror = () => fehler(anfrage.error);
    anfrage.onblocked = () => fehler(new Error('Die App ist in einem anderen Tab offen.'));
  });
  return dbPromise;
}

function tx(db, stores, modus) {
  const t = db.transaction(stores, modus);
  const fertig = new Promise((ok, fehler) => {
    t.oncomplete = () => ok();
    t.onerror = () => fehler(t.error);
    t.onabort = () => fehler(t.error ?? new Error('Schreibvorgang abgebrochen'));
  });
  return { t, fertig };
}

const anfrage = req => new Promise((ok, fehler) => {
  req.onsuccess = () => ok(req.result);
  req.onerror = () => fehler(req.error);
});

export async function alle(store) {
  const db = await oeffnen();
  const { t } = tx(db, [store], 'readonly');
  return anfrage(t.objectStore(store).getAll());
}

export async function holen(store, key) {
  const db = await oeffnen();
  const { t } = tx(db, [store], 'readonly');
  return anfrage(t.objectStore(store).get(key));
}

export async function setzen(store, werte) {
  const db = await oeffnen();
  const liste = Array.isArray(werte) ? werte : [werte];
  const { t, fertig } = tx(db, [store], 'readwrite');
  const s = t.objectStore(store);
  for (const w of liste) s.put(w);
  await fertig;
  return liste;
}

export async function loeschen(store, key) {
  const db = await oeffnen();
  const { t, fertig } = tx(db, [store], 'readwrite');
  t.objectStore(store).delete(key);
  await fertig;
}

export async function leeren(stores) {
  const db = await oeffnen();
  const { t, fertig } = tx(db, stores, 'readwrite');
  for (const s of stores) t.objectStore(s).clear();
  await fertig;
}

// --- Meta: einzelne Einstellungen ------------------------------------------

export async function meta(key, standard = null) {
  const satz = await holen('meta', key);
  return satz ? satz.wert : standard;
}

export const metaSetzen = (key, wert) => setzen('meta', { key, wert });

// --- Buchungen -------------------------------------------------------------

export async function buchen(buchung) {
  const satz = { id: id(), menge: 1, ...buchung };
  await setzen('buchungen', satz);
  return satz;
}

export const buchungenAlle = () => alle('buchungen');

export async function buchungenVon(spielerId) {
  const db = await oeffnen();
  const { t } = tx(db, ['buchungen'], 'readonly');
  const liste = await anfrage(t.objectStore('buchungen').index('spielerId').getAll(spielerId));
  return liste.sort((a, b) => a.datum.localeCompare(b.datum));
}

export const buchungLoeschen = key => loeschen('buchungen', key);

export async function buchungAendern(key, felder) {
  const alt = await holen('buchungen', key);
  if (!alt) throw new Error('Buchung nicht gefunden');
  return setzen('buchungen', { ...alt, ...felder });
}

/** Alles in einem Objekt - Grundlage fuer Sicherung und Export. */
export async function gesamtbestand() {
  const [spieler, strafenarten, aemter, buchungen, metaSaetze] = await Promise.all([
    alle('spieler'), alle('strafenarten'), alle('aemter'), alle('buchungen'), alle('meta')
  ]);
  return { version: VERSION, erstellt: new Date().toISOString(), spieler, strafenarten, aemter, buchungen, meta: metaSaetze };
}

export async function bestandErsetzen(bestand) {
  await leeren(['spieler', 'strafenarten', 'aemter', 'buchungen', 'meta']);
  await Promise.all([
    setzen('spieler', bestand.spieler ?? []),
    setzen('strafenarten', bestand.strafenarten ?? []),
    setzen('aemter', bestand.aemter ?? []),
    setzen('buchungen', bestand.buchungen ?? []),
    setzen('meta', bestand.meta ?? [])
  ]);
}
