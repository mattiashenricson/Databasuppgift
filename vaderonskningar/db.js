'use strict';

// ---------------------------------------------------------------------------
// Databaslager för Väderhälsning.
// Kunden skapar ett grattiskort med en väderönskan för någons bemärkelsedag
// och skriver ut det direkt. (Betaltjänst är inte påkopplad i denna version.)
//
// Använder Nodes inbyggda SQLite (node:sqlite) så att applikationen är helt
// fristående och inte kräver någon extern databasserver eller npm-paket.
// ---------------------------------------------------------------------------

const { DatabaseSync } = require('node:sqlite');
const path = require('path');

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

  CREATE TABLE IF NOT EXISTS kort (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    vadertyp_id INTEGER NOT NULL REFERENCES vadertyp(id),
    datum       TEXT    NOT NULL,   -- bemärkelsedagen
    mottagare   TEXT    NOT NULL,   -- vem kortet är till
    avsandare   TEXT    NOT NULL,   -- vem kortet är från
    halsning    TEXT,               -- valfri personlig hälsning
    skapad      TEXT    NOT NULL
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

const stmtSkapaKort = db.prepare(
  `INSERT INTO kort (vadertyp_id, datum, mottagare, avsandare, halsning, skapad)
   VALUES (?, ?, ?, ?, ?, ?)`
);
const stmtAllaKort = db.prepare(
  `SELECT k.id, k.datum, k.mottagare, k.avsandare, k.halsning, k.skapad,
          v.kod AS vaderkod, v.namn AS vadernamn, v.emoji AS vaderemoji
   FROM kort k
   JOIN vadertyp v ON v.id = k.vadertyp_id
   ORDER BY k.skapad DESC, k.id DESC`
);

// ---------------- Publika funktioner ----------------

function hamtaVadertyper() {
  return stmtVadertyper.all();
}

// Skapar ett grattiskort med en väderönskan.
function skapaKort({ vadertypKod, datum, mottagare, avsandare, halsning }) {
  const typ = stmtVadertypViaKod.get(vadertypKod);
  if (!typ) {
    throw new Error('Okänd vädertyp: ' + vadertypKod);
  }
  const skapad = new Date().toISOString();
  const res = stmtSkapaKort.run(
    typ.id, datum, mottagare, avsandare, halsning || null, skapad
  );
  return {
    id: res.lastInsertRowid,
    vaderkod: typ.kod,
    vadernamn: typ.namn,
    vaderemoji: typ.emoji,
    datum,
    mottagare,
    avsandare,
    halsning: halsning || '',
    skapad
  };
}

function hamtaKort() {
  return stmtAllaKort.all();
}

module.exports = {
  hamtaVadertyper,
  skapaKort,
  hamtaKort
};
