-- Databasschema för Väderönskningar
-- Skapas automatiskt av db.js när servern startar, men finns här
-- som dokumentation av datamodellen.

-- Typer av väder som kunden kan önska sig.
CREATE TABLE IF NOT EXISTS vadertyp (
    id          INTEGER PRIMARY KEY,
    kod         TEXT    NOT NULL UNIQUE,   -- t.ex. 'sol', 'regn'
    namn        TEXT    NOT NULL,          -- visningsnamn, t.ex. 'Strålande sol'
    emoji       TEXT    NOT NULL,
    beskrivning TEXT    NOT NULL
);

-- Abonnemang ger fritt antal önskningar för 50 kr/månad.
CREATE TABLE IF NOT EXISTS abonnemang (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    epost      TEXT    NOT NULL,
    startdatum TEXT    NOT NULL,           -- ISO-datum då abonnemanget tecknades
    slutdatum  TEXT    NOT NULL,           -- giltigt t.o.m. (start + 1 månad)
    manadspris INTEGER NOT NULL DEFAULT 50,
    aktiv      INTEGER NOT NULL DEFAULT 1
);

-- En önskan om väder för ett specifikt datum.
-- betalningstyp = 'styck'      -> kunden betalar 10 kr (pris = 10)
-- betalningstyp = 'abonnemang' -> täcks av aktivt abonnemang (pris = 0)
CREATE TABLE IF NOT EXISTS onskan (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    vadertyp_id  INTEGER NOT NULL REFERENCES vadertyp(id),
    onskedatum   TEXT    NOT NULL,         -- vilket datum vädret önskas
    epost        TEXT    NOT NULL,
    betalningstyp TEXT   NOT NULL CHECK (betalningstyp IN ('styck', 'abonnemang')),
    pris         INTEGER NOT NULL,         -- kostnad i kronor för denna önskan
    skapad       TEXT    NOT NULL          -- tidsstämpel
);
