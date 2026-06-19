'use strict';

// Frontend för Väderönskan. Pratar med JSON-API:t i server.js.

const STYCKPRIS = 10;
let valdVadertyp = null;

// ---------------- Hjälp ----------------
async function api(metod, vag, kropp) {
  const svar = await fetch(vag, {
    method: metod,
    headers: kropp ? { 'Content-Type': 'application/json' } : undefined,
    body: kropp ? JSON.stringify(kropp) : undefined
  });
  const data = await svar.json().catch(() => ({}));
  if (!svar.ok) throw new Error(data.fel || 'Något gick fel.');
  return data;
}

function visaMeddelande(el, text, typ) {
  el.textContent = text;
  el.className = 'form-message ' + (typ || '');
}

function formateraDatum(iso) {
  // iso kan vara 'ÅÅÅÅ-MM-DD' eller full tidsstämpel.
  return new Date(iso).toLocaleDateString('sv-SE', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ---------------- Vädertyper ----------------
async function laddaVadertyper() {
  const behallare = document.getElementById('vadertyper');
  try {
    const typer = await api('GET', '/api/vadertyper');
    behallare.innerHTML = '';
    for (const t of typer) {
      const label = document.createElement('label');
      label.className = 'weather-option';
      label.innerHTML = `
        <input type="radio" name="vadertyp" value="${t.kod}">
        <span class="emoji" aria-hidden="true">${t.emoji}</span>
        <span class="namn">${t.namn}</span>
        <span class="besk">${t.beskrivning}</span>`;
      label.querySelector('input').addEventListener('change', () => {
        valdVadertyp = t.kod;
      });
      behallare.appendChild(label);
    }
  } catch (e) {
    behallare.innerHTML = `<p class="form-message err">Kunde inte ladda vädertyper: ${e.message}</p>`;
  }
}

// ---------------- Priser ----------------
async function laddaPriser() {
  try {
    const p = await api('GET', '/api/priser');
    document.getElementById('prisbelopp').textContent = p.styckpris + ' kr';
  } catch (e) { /* standardvärde står redan i HTML */ }
}

// Uppdaterar prisrutan beroende på om e-postadressen har ett abonnemang.
async function uppdateraPris() {
  const epost = document.getElementById('epost').value.trim();
  const ruta = document.getElementById('prisruta');
  const belopp = document.getElementById('prisbelopp');

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(epost)) {
    try {
      const status = await api('GET', '/api/abonnemang?epost=' + encodeURIComponent(epost));
      if (status.aktivt) {
        ruta.classList.add('free');
        belopp.textContent = '0 kr (abonnemang)';
        return;
      }
    } catch (e) { /* faller igenom till styckpris */ }
  }
  ruta.classList.remove('free');
  belopp.textContent = STYCKPRIS + ' kr';
}

// ---------------- Önskningar ----------------
async function laddaOnskningar() {
  const tabell = document.getElementById('onskningstabell');
  try {
    const rader = await api('GET', '/api/onskningar');
    if (rader.length === 0) {
      tabell.innerHTML = '<tr><td colspan="5" class="muted">Inga önskningar ännu – bli först!</td></tr>';
      return;
    }
    tabell.innerHTML = rader.map((r) => {
      const prisText = r.pris === 0 ? '0 kr' : r.pris + ' kr';
      const pillKlass = r.betalningstyp === 'abonnemang' ? 'abonnemang' : 'styck';
      const pillText = r.betalningstyp === 'abonnemang' ? 'Abonnemang' : 'Styck';
      return `<tr>
        <td><span class="weather-cell"><span class="emoji">${r.vaderemoji}</span>${r.vadernamn}</span></td>
        <td>${formateraDatum(r.onskedatum)}</td>
        <td>${maskeraEpost(r.epost)}</td>
        <td><span class="pill ${pillKlass}">${pillText}</span></td>
        <td class="num">${prisText}</td>
      </tr>`;
    }).join('');
  } catch (e) {
    tabell.innerHTML = `<tr><td colspan="5" class="form-message err">Kunde inte ladda önskningar: ${e.message}</td></tr>`;
  }
}

// Visa bara början av e-postadressen av integritetsskäl.
function maskeraEpost(epost) {
  const [namn, domän] = epost.split('@');
  if (!domän) return epost;
  const synligt = namn.slice(0, 2);
  return `${synligt}${'*'.repeat(Math.max(1, namn.length - 2))}@${domän}`;
}

// ---------------- Formulärhantering ----------------
function kopplaFormular() {
  const form = document.getElementById('onskeform');
  const meddelande = document.getElementById('formmeddelande');
  const epostfalt = document.getElementById('epost');

  // Sätt minsta datum till idag.
  const datumfalt = document.getElementById('datum');
  datumfalt.min = new Date().toISOString().slice(0, 10);

  epostfalt.addEventListener('input', uppdateraPris);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!valdVadertyp) {
      return visaMeddelande(meddelande, 'Välj en vädertyp först.', 'err');
    }
    const datum = datumfalt.value;
    const epost = epostfalt.value.trim();
    visaMeddelande(meddelande, 'Skickar…', '');
    try {
      const onskan = await api('POST', '/api/onskningar', { vadertyp: valdVadertyp, datum, epost });
      const prisText = onskan.pris === 0
        ? 'Den täcks av ditt abonnemang – ingen kostnad!'
        : `Kostnad: ${onskan.pris} kr.`;
      visaMeddelande(meddelande, `${onskan.vaderemoji} Önskan registrerad för ${formateraDatum(onskan.onskedatum)}. ${prisText}`, 'ok');
      form.reset();
      valdVadertyp = null;
      uppdateraPris();
      laddaOnskningar();
    } catch (err) {
      visaMeddelande(meddelande, err.message, 'err');
    }
  });
}

function kopplaAbonnemang() {
  const form = document.getElementById('abonnemangsform');
  const meddelande = document.getElementById('abonnemangsmeddelande');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const epost = document.getElementById('abonnemangsepost').value.trim();
    visaMeddelande(meddelande, 'Tecknar…', '');
    try {
      const ab = await api('POST', '/api/abonnemang', { epost });
      visaMeddelande(meddelande, `Abonnemang tecknat! Giltigt t.o.m. ${formateraDatum(ab.slutdatum)}. Dina önskningar är nu kostnadsfria.`, 'ok');
      form.reset();
      uppdateraPris();
    } catch (err) {
      visaMeddelande(meddelande, err.message, 'err');
    }
  });
}

// ---------------- Start ----------------
laddaVadertyper();
laddaPriser();
laddaOnskningar();
kopplaFormular();
kopplaAbonnemang();
