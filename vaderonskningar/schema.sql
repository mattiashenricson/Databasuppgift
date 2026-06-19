-- Databasschema för Väderhälsning
-- Skapas automatiskt av db.js när servern startar, men finns här
-- som dokumentation av datamodellen.

-- Typer av väder som kunden kan önska på kortet.
CREATE TABLE IF NOT EXISTS vadertyp (
    id          INTEGER PRIMARY KEY,
    kod         TEXT    NOT NULL UNIQUE,   -- t.ex. 'sol', 'regn'
    namn        TEXT    NOT NULL,          -- visningsnamn, t.ex. 'Strålande sol'
    emoji       TEXT    NOT NULL,
    beskrivning TEXT    NOT NULL
);

-- Ett skapat grattiskort med en väderönskan för någons bemärkelsedag.
CREATE TABLE IF NOT EXISTS kort (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    vadertyp_id INTEGER NOT NULL REFERENCES vadertyp(id),
    datum       TEXT    NOT NULL,          -- bemärkelsedagen
    mottagare   TEXT    NOT NULL,          -- vem kortet är till
    avsandare   TEXT    NOT NULL,          -- vem kortet är från
    halsning    TEXT,                      -- valfri personlig hälsning
    skapad      TEXT    NOT NULL           -- tidsstämpel
);
