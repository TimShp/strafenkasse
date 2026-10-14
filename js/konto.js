// Rechenkern. Reine Funktionen ueber Buchungs-Arrays, kennt weder Datenbank
// noch Oberflaeche - deshalb ist er der einzige Teil, der automatisiert geprueft wird.
//
// Vorzeichenregel, wie in der Excel: positiver Saldo = der Spieler zahlt,
// negativer Saldo = der Spieler hat Guthaben.
//   strafe / jahresbeitrag / verzug   -> betrag positiv (Gutschrift-Strafenarten negativ)
//   zahlung / gutschrift              -> betrag negativ
//
// Eine Buchung hat immer eine einheit: 'eur' zaehlt in Geld, 'kiste' zaehlt in Stueck.
// Naturalstrafen tauchen damit in keiner Eurosumme auf - genau der Fehler, der in
// der Excel dazu fuehrte, dass "Kiste" in keiner Summenformel vorkam.

export const EINHEIT_EUR = 'eur';
export const EINHEIT_KISTE = 'kiste';

const istEur = b => (b.einheit ?? EINHEIT_EUR) === EINHEIT_EUR;
const istKiste = b => b.einheit === EINHEIT_KISTE;

export const rund = n => Math.round((n + Number.EPSILON) * 100) / 100;

export function saldo(buchungen) {
  return rund(buchungen.filter(istEur).reduce((s, b) => s + b.betrag, 0));
}

export function offeneKisten(buchungen) {
  return buchungen.filter(b => istKiste(b) && !b.erledigt)
    .reduce((s, b) => s + (b.menge ?? 1), 0);
}

export function monatsgrenzen(jahr, monat) {
  return {
    von: new Date(jahr, monat - 1, 1).toISOString(),
    bis: new Date(jahr, monat, 1).toISOString()
  };
}

export const imZeitraum = (b, von, bis) => b.datum >= von && b.datum < bis;

/**
 * Abrechnung eines Spielers fuer einen Zeitraum.
 * uebertrag = Saldo aus allem, was vor dem Zeitraum liegt. Er ist damit immer
 * errechnet und nie ein abgetippter Wert.
 */
export function abrechnung(buchungen, von, bis) {
  const vorher = buchungen.filter(b => b.datum < von);
  const drin = buchungen.filter(b => imZeitraum(b, von, bis))
    .sort((a, b) => a.datum.localeCompare(b.datum));

  const summeVon = arten => rund(drin
    .filter(b => istEur(b) && arten.includes(b.art))
    .reduce((s, b) => s + b.betrag, 0));

  const uebertrag = saldo(vorher);
  const strafen = summeVon(['strafe']);
  const beitrag = summeVon(['jahresbeitrag']);
  const verzug = summeVon(['verzug']);
  const zahlungen = summeVon(['zahlung']);
  const gutschriften = summeVon(['gutschrift']);

  return {
    uebertrag,
    strafen,
    beitrag,
    verzug,
    zahlungen,
    gutschriften,
    bewegung: rund(strafen + beitrag + verzug + zahlungen + gutschriften),
    saldo: rund(uebertrag + strafen + beitrag + verzug + zahlungen + gutschriften),
    kistenNeu: drin.filter(istKiste).reduce((s, b) => s + (b.menge ?? 1), 0),
    kistenOffen: offeneKisten(buchungen.filter(b => b.datum < bis)),
    posten: drin
  };
}

/**
 * Alle festgehaltenen Zitate, neueste zuerst. Optional auf einen Zeitraum
 * begrenzt. Zitate ueberdauern den Monatsabschluss - die Buchungen bleiben.
 */
export function zitate(buchungen, von = null, bis = null) {
  return buchungen
    .filter(b => b.zitat && (!von || b.datum >= von) && (!bis || b.datum < bis))
    .sort((a, b) => b.datum.localeCompare(a.datum));
}

/** Nach Spieler gruppieren, damit die Oberflaeche nicht n-mal filtern muss. */
export function nachSpieler(buchungen) {
  const map = new Map();
  for (const b of buchungen) {
    if (!map.has(b.spielerId)) map.set(b.spielerId, []);
    map.get(b.spielerId).push(b);
  }
  return map;
}

/**
 * Vorschlag fuer die Strafenart "Verzug": die doppelte Strafsumme des Vormonats.
 * Nur ein Vorschlag - gebucht wird er erst nach Bestaetigung.
 */
export function verzugVorschlag(buchungen, jahr, monat) {
  const vor = monat === 1 ? monatsgrenzen(jahr - 1, 12) : monatsgrenzen(jahr, monat - 1);
  const a = abrechnung(buchungen, vor.von, vor.bis);
  return rund(Math.max(0, a.strafen + a.verzug) * 2);
}
