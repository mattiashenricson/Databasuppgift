'use strict';

// ---------------------------------------------------------------------------
// Databaslager för Väderönskningar.
// Använder Nodes inbyggda SQLite (node:sqlite) så att applikationen är helt
// fristående och inte kräver någon extern databasserver eller npm-paket.
// ---------------------------------------------------------------------------

const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const STYCKPRIS = 10;        // kr per enstaka önskan
const MANADSPRIS = 50;       // kr per månad för abonnemang

const db = new DatabaseSync(path.join(__dirname, 'vaderonskningar.db'));

// ---------------- Skapa tabeller ----------------
db.exec(`
  CREATE TABLE IF NOT EXISTS vadertyp (
    id          INTEGER PRIMARY KEY,
    kod         TEXT    NOT NULL UNIQUE,
    namn        TEXT    NOT NULL,
    emoji       TEXT    NOT NULL,
    beskrivning TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS abonnemang (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    epost      TEXT    NOT NULL,
    startdatum TEXT    NOT NULL,
    slutdatum  TEXT    NOT NULL,
    manadspris INTEGER NOT NULL DEFAULT 50,
    aktiv      INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS onskan (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    vadertyp_id   INTEGER NOT NULL REFERENCES vadertyp(id),
    onskedatum    TEXT    NOT NULL,
    epost         TEXT    NOT NULL,
    betalningstyp TEXT    NOT NULL CHECK (betalningstyp IN ('styck', 'abonnemang')),
    pris          INTEGER NOT NULL,
    skapad        TEXT    NOT NULL
  );
`);

// ---------------- Fyll på vädertyper (en gång) ----------------
const VADERTYPER = [
  { id: 1, kod: 'sol',      namn: 'Strålande sol', emoji: '☀️', beskrivning: 'Klarblå himmel och sol från morgon till kväll.' },
  { id: 2, kod: 'lattmoln', namn: 'Lätt molnighet', emoji: '🌤️', beskrivning: 'Sol med inslag av fina vita moln.' },
  { id: 3, kod: 'moln',     namn: 'Molnigt',        emoji: '☁️', beskrivning: 'Mulet men torrt – mjukt ljus hela dagen.' },
  { id: 4, kod: 'regn',     namn: 'Regn',           emoji: '🌧️', beskrivning: 'Skönt sommarregn som vattnar trädgården.' },
  { id: 5, kod: 'sno',      namn: 'Snö',            emoji: '❄️', beskrivning: 'Mjuka snöflingor och vitt landskap.' },
  { id: 6, kod: 'aska',     namn: 'Åskväder',       emoji: '⛈️', beskrivning: 'Dramatisk himmel med blixt och dunder.' },
  { id: 7, kod: 'dimma',    namn: 'Dimma',          emoji: '🌫️', beskrivning: 'Stämningsfull dimma som lättar mot lunch.' },
  { id: 8, kod: 'regnbage', namn: 'Regnbåge',       emoji: '🌈', beskrivning: 'Lätta skurar som avslutas med en regnbåge.' }
];

const finnsVadertyper = db.prepare('SELECT COUNT(*) AS antal FROM vadertyp').get().antal;
if (finnsVadertyper === 0) {
  const insertTyp = db.prepare(
    'INSERT INTO vadertyp (id, kod, namn, emoji, beskrivning) VALUES (?, ?, ?, ?, ?)'
  );
  for (const t of VADERTYPER) {
    insertTyp.run(t.id, t.kod, t.namn, t.emoji, t.beskrivning);
  }
}

// ---------------- Förberedda satser ----------------
const stmtVadertyper = db.prepare('SELECT * FROM vadertyp ORDER BY id');
const stmtVadertypViaKod = db.prepare('SELECT * FROM vadertyp WHERE kod = ?');

const stmtAktivtAbonnemang = db.prepare(
  `SELECT * FROM abonnemang
   WHERE epost = ? AND aktiv = 1 AND slutdatum >= ?
   ORDER BY slutdatum DESC LIMIT 1`
);
const stmtSkapaAbonnemang = db.prepare(
  'INSERT INTO abonnemang (epost, startdatum, slutdatum, manadspris, aktiv) VALUES (?, ?, ?, ?, 1)'
);

const stmtSkapaOnskan = db.prepare(
  `INSERT INTO onskan (vadertyp_id, onskedatum, epost, betalningstyp, pris, skapad)
   VALUES (?, ?, ?, ?, ?, ?)`
);
const stmtAllaOnskningar = db.prepare(
  `SELECT o.id, o.onskedatum, o.epost, o.betalningstyp, o.pris, o.skapad,
          v.namn AS vadernamn, v.emoji AS vaderemoji
   FROM onskan o
   JOIN vadertyp v ON v.id = o.vadertyp_id
   ORDER BY o.skapad DESC, o.id DESC`
);

// ---------------- Publika funktioner ----------------

function hamtaVadertyper() {
  return stmtVadertyper.all();
}

// Returnerar ett aktivt abonnemang för e-postadressen, eller undefined.
function aktivtAbonnemang(epost, idag) {
  return stmtAktivtAbonnemang.get(epost, idag || new Date().toISOString().slice(0, 10));
}

// Tecknar ett abonnemang (50 kr/mån) som gäller en månad framåt.
function tecknaAbonnemang(epost) {
  const start = new Date();
  const slut = new Date(start);
  slut.setMonth(slut.getMonth() + 1);
  const startISO = start.toISOString().slice(0, 10);
  const slutISO = slut.toISOString().slice(0, 10);
  const res = stmtSkapaAbonnemang.run(epost, startISO, slutISO, MANADSPRIS);
  return { id: res.lastInsertRowid, epost, startdatum: startISO, slutdatum: slutISO, manadspris: MANADSPRIS };
}

// Lägger till en väderönskan. Om kunden har ett aktivt abonnemang blir
// önskan kostnadsfri (täcks av abonnemanget), annars kostar den 10 kr.
function laggOnskan({ vadertypKod, onskedatum, epost }) {
  const typ = stmtVadertypViaKod.get(vadertypKod);
  if (!typ) {
    throw new Error('Okänd vädertyp: ' + vadertypKod);
  }

  // Abonnemanget täcker önskningar som görs medan det är aktivt (idag),
  // oavsett vilket framtida datum vädret önskas för.
  const harAbonnemang = !!aktivtAbonnemang(epost);
  const betalningstyp = harAbonnemang ? 'abonnemang' : 'styck';
  const pris = harAbonnemang ? 0 : STYCKPRIS;
  const skapad = new Date().toISOString();

  const res = stmtSkapaOnskan.run(typ.id, onskedatum, epost, betalningstyp, pris, skapad);
  return {
    id: res.lastInsertRowid,
    vadernamn: typ.namn,
    vaderemoji: typ.emoji,
    onskedatum,
    epost,
    betalningstyp,
    pris,
    skapad
  };
}

function hamtaOnskningar() {
  return stmtAllaOnskningar.all();
}

module.exports = {
  STYCKPRIS,
  MANADSPRIS,
  hamtaVadertyper,
  aktivtAbonnemang,
  tecknaAbonnemang,
  laggOnskan,
  hamtaOnskningar
};
