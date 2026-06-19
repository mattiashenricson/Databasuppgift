# Väderhälsning 🌤️

En webbplats där man skapar ett **grattiskort med en väderönskan** för någons
bemärkelsedag och skriver ut det direkt. Tanken är att kunna skicka en varm
hälsning även när man inte kan närvara på dagen.

Kunden väljer en typisk vädertyp (sol, regn, snö, åska …), ett datum,
mottagare och avsändare samt en valfri hälsning – och får ett färdigt,
utskrivbart kort på skärmen.

> **Obs:** Betaltjänsten är inte påkopplad i denna version. Man får ett kort
> direkt.

## Köra applikationen

Kräver **Node.js 22.5 eller senare** (använder den inbyggda
`node:sqlite`-modulen – inga npm-paket behöver installeras).

```bash
cd vaderonskningar
npm start
```

Surfa sedan till <http://localhost:8888>.

1. Välj en vädertyp.
2. Fyll i bemärkelsedag, mottagare och avsändare samt en valfri hälsning.
3. Klicka **Skapa kort** – kortet visas direkt.
4. Klicka **Skriv ut kort** för att skriva ut det (endast kortet skrivs ut).

Databasfilen `vaderonskningar.db` skapas automatiskt första gången och
fylls på med vädertyper.

## Datamodell

Se [`schema.sql`](schema.sql). Två tabeller:

- **vadertyp** – de vädertyper kunden kan välja mellan.
- **kort** – ett skapat grattiskort med vädertyp, datum, mottagare,
  avsändare och en valfri hälsning.

## API

| Metod | Väg               | Beskrivning                                                   |
|-------|-------------------|---------------------------------------------------------------|
| GET   | `/api/vadertyper` | Lista alla vädertyper                                         |
| GET   | `/api/kort`       | Lista alla skapade kort                                       |
| POST  | `/api/kort`       | Skapa ett kort `{vadertyp, datum, mottagare, avsandare, halsning?}` |

## Filer

```
vaderonskningar/
├── server.js          # HTTP-server: statiska filer + JSON-API
├── db.js              # Databaslager (node:sqlite)
├── schema.sql         # Databasschema (dokumentation)
├── package.json
└── public/            # Frontend
    ├── index.html
    ├── styles.css     # inkl. utskriftsstil för kortet
    └── app.js
```
