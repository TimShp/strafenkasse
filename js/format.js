const EUR = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
const DATUM = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
const UHR = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' });
const MONAT = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' });
const NUR_MONAT = new Intl.DateTimeFormat('de-DE', { month: 'long' });

export const eur = n => EUR.format(n ?? 0);
export const datum = iso => DATUM.format(new Date(iso));
export const uhr = iso => UHR.format(new Date(iso));
export const monatName = (jahr, monat) => MONAT.format(new Date(jahr, monat - 1, 1));
export const monatOhneJahr = (jahr, monat) => NUR_MONAT.format(new Date(jahr, monat - 1, 1));

// "1.234,5" und "1234.5" sollen beide gehen - in der Halle tippt niemand sauber.
export function betragLesen(text) {
  if (typeof text === 'number') return text;
  const s = String(text ?? '').trim().replace(/\s|€/g, '');
  if (!s) return NaN;
  const norm = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  const n = Number(norm);
  return Number.isFinite(n) ? n : NaN;
}

export const heuteIso = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
};
