'use strict';

// ---------------------------------------------------------------------------
// Väderhälsning – webbserver
// Kunden skapar ett grattiskort med en väderönskan för någons bemärkelsedag,
// och kan skriva ut kortet direkt. Använd när man inte kan närvara men ändå
// vill skicka en hälsning. (Betaltjänst är inte påkopplad i denna version –
// man får ett kort direkt.)
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

function giltigtDatum(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v));
}
function ickeTomText(v, maxlangd) {
  return typeof v === 'string' && v.trim().length > 0 && v.length <= maxlangd;
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

    // Lista alla skapade kort
    if (req.method === 'GET' && pathname === '/api/kort') {
      return skickaJson(resp, 200, db.hamtaKort());
    }

    // Skapa ett grattiskort
    if (req.method === 'POST' && pathname === '/api/kort') {
      const body = await lasBody(req);
      if (!body.vadertyp) {
        return skickaJson(resp, 400, { fel: 'Välj en vädertyp.' });
      }
      if (!giltigtDatum(body.datum)) {
        return skickaJson(resp, 400, { fel: 'Välj ett giltigt datum (ÅÅÅÅ-MM-DD).' });
      }
      if (!ickeTomText(body.mottagare, 80)) {
        return skickaJson(resp, 400, { fel: 'Ange vem kortet är till.' });
      }
      if (!ickeTomText(body.avsandare, 80)) {
        return skickaJson(resp, 400, { fel: 'Ange vem kortet är från.' });
      }
      if (body.halsning && body.halsning.length > 500) {
        return skickaJson(resp, 400, { fel: 'Hälsningen är för lång (max 500 tecken).' });
      }
      try {
        const kort = db.skapaKort({
          vadertypKod: body.vadertyp,
          datum: body.datum,
          mottagare: body.mottagare.trim(),
          avsandare: body.avsandare.trim(),
          halsning: body.halsning ? body.halsning.trim() : ''
        });
        return skickaJson(resp, 201, kort);
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
  console.log(`Väderhälsning kör på http://localhost:${PORT}`);
});

module.exports = server;
