'use strict';

// ---------------------------------------------------------------------------
// Väderönskningar – webbserver
// Kunder kan önska väder för ett specifikt datum. Det kostar 10 kr per
// önskan, eller 50 kr/månad som abonnemang med fritt antal önskningar.
//
// Servern levererar dels en statisk frontend (mappen public/), dels ett
// litet JSON-API som frontend pratar med.
// ---------------------------------------------------------------------------

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const db = require('./db');

const PORT = process.env.PORT || 8888;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// ---------------- Hjälpfunktioner ----------------

function skickaJson(resp, status, data) {
  const body = JSON.stringify(data);
  resp.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  resp.end(body);
}

function lasBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) {
        req.destroy();
        reject(new Error('För stor begäran'));
      }
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(new Error('Ogiltig JSON'));
      }
    });
    req.on('error', reject);
  });
}

// Enkel validering av e-post och datum (frontend validerar också).
function giltigEpost(v) {
  return typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
function giltigtDatum(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v));
}

// ---------------- Statiska filer ----------------

function skickaStatisk(resp, pathname) {
  let filnamn = pathname === '/' ? '/index.html' : pathname;
  // Förhindra katalogtraversering.
  const filsokvag = path.join(PUBLIC_DIR, path.normalize(filnamn).replace(/^(\.\.[/\\])+/, ''));
  if (!filsokvag.startsWith(PUBLIC_DIR)) {
    resp.writeHead(403);
    return resp.end('Förbjudet');
  }
  fs.readFile(filsokvag, (err, innehall) => {
    if (err) {
      resp.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return resp.end('<h1>404 – sidan hittades inte</h1>');
    }
    const ext = path.extname(filsokvag).toLowerCase();
    resp.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    resp.end(innehall);
  });
}

// ---------------- API ----------------

async function hanteraApi(req, resp, pathname) {
  try {
    // Lista alla vädertyper
    if (req.method === 'GET' && pathname === '/api/vadertyper') {
      return skickaJson(resp, 200, db.hamtaVadertyper());
    }

    // Priser
    if (req.method === 'GET' && pathname === '/api/priser') {
      return skickaJson(resp, 200, { styckpris: db.STYCKPRIS, manadspris: db.MANADSPRIS });
    }

    // Lista alla önskningar
    if (req.method === 'GET' && pathname === '/api/onskningar') {
      return skickaJson(resp, 200, db.hamtaOnskningar());
    }

    // Kontrollera abonnemangsstatus för en e-postadress
    if (req.method === 'GET' && pathname === '/api/abonnemang') {
      const epost = url.parse(req.url, true).query.epost;
      if (!giltigEpost(epost)) {
        return skickaJson(resp, 400, { fel: 'Ange en giltig e-postadress.' });
      }
      const ab = db.aktivtAbonnemang(epost);
      return skickaJson(resp, 200, { aktivt: !!ab, abonnemang: ab || null });
    }

    // Teckna abonnemang (50 kr/mån, fritt antal önskningar)
    if (req.method === 'POST' && pathname === '/api/abonnemang') {
      const body = await lasBody(req);
      if (!giltigEpost(body.epost)) {
        return skickaJson(resp, 400, { fel: 'Ange en giltig e-postadress.' });
      }
      if (db.aktivtAbonnemang(body.epost)) {
        return skickaJson(resp, 409, { fel: 'Den här e-postadressen har redan ett aktivt abonnemang.' });
      }
      const ab = db.tecknaAbonnemang(body.epost);
      return skickaJson(resp, 201, ab);
    }

    // Lägg en väderönskan
    if (req.method === 'POST' && pathname === '/api/onskningar') {
      const body = await lasBody(req);
      if (!body.vadertyp) {
        return skickaJson(resp, 400, { fel: 'Välj en vädertyp.' });
      }
      if (!giltigtDatum(body.datum)) {
        return skickaJson(resp, 400, { fel: 'Välj ett giltigt datum (ÅÅÅÅ-MM-DD).' });
      }
      if (!giltigEpost(body.epost)) {
        return skickaJson(resp, 400, { fel: 'Ange en giltig e-postadress.' });
      }
      try {
        const onskan = db.laggOnskan({
          vadertypKod: body.vadertyp,
          onskedatum: body.datum,
          epost: body.epost
        });
        return skickaJson(resp, 201, onskan);
      } catch (e) {
        return skickaJson(resp, 400, { fel: e.message });
      }
    }

    return skickaJson(resp, 404, { fel: 'Okänd API-väg: ' + pathname });
  } catch (e) {
    return skickaJson(resp, 400, { fel: e.message || 'Något gick fel.' });
  }
}

// ---------------- Router ----------------

const server = http.createServer((req, resp) => {
  const pathname = url.parse(req.url).pathname;

  if (pathname.startsWith('/api/')) {
    hanteraApi(req, resp, pathname);
  } else {
    skickaStatisk(resp, pathname);
  }
});

server.listen(PORT, () => {
  console.log(`Väderönskningar kör på http://localhost:${PORT}`);
});

module.exports = server;
