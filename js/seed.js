// Strafenkatalog aus der Abrechnung Saison 25/26.
// rang = Haeufigkeit in der Bestandsdatei; bestimmt die Sortierung im Strafenblatt.
// vorzeichen: 1 = Belastung, -1 = Gutschrift.
// einheit: 'eur' = Geldstrafe, 'kiste' = Naturalstrafe (zaehlt Stueck, kein Geld).

export const STRAFENARTEN = [
  { name: 'Phrase',                        betrag: 0.75, einheit: 'eur',   vorzeichen: 1, rang: 57 },
  { name: 'Verspätung Training ≤ 10 min',  betrag: 5,    einheit: 'eur',   vorzeichen: 1, rang: 25 },
  { name: 'Modestrafe',                    betrag: 1,    einheit: 'eur',   vorzeichen: 1, rang: 11 },
  { name: 'Amt vernachlässigt',            betrag: 10,   einheit: 'eur',   vorzeichen: 1, rang: 9 },
  { name: 'Roter 5er',                     betrag: 2.5,  einheit: 'eur',   vorzeichen: 1, rang: 4 },
  { name: 'Bier bunkern',                  betrag: 1,    einheit: 'eur',   vorzeichen: 1, rang: 3 },
  { name: 'Unentschuldigt gefehlt (Training)', betrag: 10, einheit: 'eur', vorzeichen: 1, rang: 3 },
  { name: 'Bierfrevel',                    betrag: 1,    einheit: 'eur',   vorzeichen: 1, rang: 2 },
  { name: 'Sachen vergessen (Training)',   betrag: 5,    einheit: 'eur',   vorzeichen: 1, rang: 2 },
  { name: 'Pauschale keine Phrase',        betrag: 5,    einheit: 'eur',   vorzeichen: 1, rang: 2 },
  { name: 'Verspätung Training > 10 min',  betrag: 10,   einheit: 'eur',   vorzeichen: 1, rang: 0 },
  { name: 'Verspätung Spiel ≤ 10 min',     betrag: 15,   einheit: 'eur',   vorzeichen: 1, rang: 0 },
  { name: 'Verspätung Spiel > 10 min',     betrag: 30,   einheit: 'eur',   vorzeichen: 1, rang: 0 },
  { name: 'Unentschuldigt gefehlt (Spiel)', betrag: 50,  einheit: 'eur',   vorzeichen: 1, rang: 0 },
  { name: 'Sachen vergessen (Spiel)',      betrag: 10,   einheit: 'eur',   vorzeichen: 1, rang: 0 },
  { name: 'Telefon im Training',           betrag: 5,    einheit: 'eur',   vorzeichen: 1, rang: 0 },
  { name: 'Telefon im Spiel',              betrag: 15,   einheit: 'eur',   vorzeichen: 1, rang: 0 },
  { name: 'Dienst nicht angetreten',       betrag: 100,  einheit: 'eur',   vorzeichen: 1, rang: 0 },
  { name: 'Thoumy-Frage',                  betrag: 1,    einheit: 'eur',   vorzeichen: 1, rang: 0 },
  { name: 'Gelbe Karte (Meckern)',         betrag: 5,    einheit: 'eur',   vorzeichen: 1, rang: 0 },
  { name: 'Zwei Minuten (Meckern)',        betrag: 15,   einheit: 'eur',   vorzeichen: 1, rang: 0 },
  { name: 'Rote Karte (Meckern)',          betrag: 50,   einheit: 'eur',   vorzeichen: 1, rang: 0 },
  { name: 'Blaue Karte',                   betrag: 75,   einheit: 'eur',   vorzeichen: 1, rang: 0 },
  { name: 'Restschluck im Bier',           betrag: 5,    einheit: 'eur',   vorzeichen: 1, rang: 0 },
  { name: 'Parken im Durchgang',           betrag: 10,   einheit: 'eur',   vorzeichen: 1, rang: 0 },
  { name: 'Kacken in eigener Kabine',      betrag: 15,   einheit: 'eur',   vorzeichen: 1, rang: 0 },
  { name: 'Kacken in Gegnerkabine',        betrag: 5,    einheit: 'eur',   vorzeichen: -1, rang: 0 },
  { name: 'Kopftreffer bei Mitspieler',    betrag: 1,    einheit: 'kiste', vorzeichen: 1, rang: 0 },
  { name: '30. oder 40. Tor',              betrag: 1,    einheit: 'kiste', vorzeichen: 1, rang: 0 },
  { name: 'Verweigern 30./40. Tor',        betrag: 1,    einheit: 'kiste', vorzeichen: 1, rang: 0 },
  { name: 'Sonstiges',                     betrag: 0,    einheit: 'eur',   vorzeichen: 1, rang: 1, frei: true }
];

export const AEMTER = [
  'Bier', 'Harz', 'Musikbox', 'Öl', 'Leibchen', 'Kasse', 'Events', 'Tape',
  'Eisbox', 'Playlist', 'Fußball', 'Shampoo', 'Phrasen', 'Schreiberling',
  'Mode', 'Captain', 'Mannschaftsrat', 'Geburtstage'
];

export const VORGABEN = {
  jahresbeitrag: 150,
  kistenpreis: 15
};
