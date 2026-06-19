# Väderönskan 🌤️

En webbplats där kunder kan lägga in önskemål om väder för en specifik dag.
Kunden väljer en typisk vädertyp (sol, regn, snö, åska …) och ett datum.

## Pris

| Alternativ   | Pris            | Innehåll                          |
|--------------|-----------------|-----------------------------------|
| Per önskan   | **10 kr**       | En önskan för ett valt datum      |
| Abonnemang   | **50 kr/månad** | **Fritt antal** önskningar        |

Har kunden ett aktivt abonnemang blir varje önskan kostnadsfri (0 kr).
Annars kostar varje önskan 10 kr.

## Köra applikationen

Kräver **Node.js 22.5 eller senare** (använder den inbyggda
`node:sqlite`-modulen – inga npm-paket behöver installeras).

```bash
cd vaderonskningar
npm start
```

Surfa sedan till <http://localhost:8888>.

Databasfilen `vaderonskningar.db` skapas automatiskt första gången och
fylls på med vädertyper.

## Datamodell

Se [`schema.sql`](schema.sql). Tre tabeller:

- **vadertyp** – de vädertyper kunden kan välja mellan.
- **abonnemang** – tecknade månadsabonnemang (50 kr/mån).
- **onskan** – en väderönskan för ett datum, med pris och betalningstyp
  (`styck` = 10 kr, `abonnemang` = 0 kr).

## API

| Metod | Väg                            | Beskrivning                                  |
|-------|--------------------------------|----------------------------------------------|
| GET   | `/api/vadertyper`              | Lista alla vädertyper                        |
| GET   | `/api/priser`                  | Styckpris och månadspris                      |
| GET   | `/api/onskningar`              | Lista alla önskningar                         |
| POST  | `/api/onskningar`              | Lägg en önskan `{vadertyp, datum, epost}`     |
| GET   | `/api/abonnemang?epost=…`      | Kontrollera abonnemangsstatus                 |
| POST  | `/api/abonnemang`              | Teckna abonnemang `{epost}`                   |

## Filer

```
vaderonskningar/
├── server.js          # HTTP-server: statiska filer + JSON-API
├── db.js              # Databaslager (node:sqlite)
├── schema.sql         # Databasschema (dokumentation)
├── package.json
└── public/            # Frontend
    ├── index.html
    ├── styles.css
    └── app.js
```
