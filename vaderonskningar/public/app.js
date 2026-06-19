'use strict';

// Frontend för Väderhälsning. Pratar med JSON-API:t i server.js.

let valdVadertyp = null;

// Tema (gradient + en kort fras) per vädertyp till det färdiga kortet.
const VADER_TEMA = {
  sol:      { grad: 'linear-gradient(160deg,#fde68a,#fbbf24)', frase: 'Strålande sol till dig!' },
  lattmoln: { grad: 'linear-gradient(160deg,#bae6fd,#7dd3fc)', frase: 'Sol och lätta moln på din dag!' },
  moln:     { grad: 'linear-gradient(160deg,#e2e8f0,#cbd5e1)', frase: 'Mjukt ljus hela dagen!' },
  regn:     { grad: 'linear-gradient(160deg,#93c5fd,#60a5fa)', frase: 'Ett skönt regn just för dig!' },
  sno:      { grad: 'linear-gradient(160deg,#e0f2fe,#bae6fd)', frase: 'Mjuka snöflingor till dig!' },
  aska:     { grad: 'linear-gradient(160deg,#a5b4fc,#818cf8)', frase: 'Blixt och dunder på din dag!' },
  dimma:    { grad: 'linear-gradient(160deg,#e5e7eb,#d1d5db)', frase: 'Stämningsfull dimma till dig!' },
  regnbage: { grad: 'linear-gradient(160deg,#fbcfe8,#a7f3d0)', frase: 'En regnbåge bara för dig!' }
};

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
  return new Date(iso).toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Enkel HTML-escaping för text som användaren skrivit.
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text == null ? '' : String(text);
  return div.innerHTML;
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
        <span class="namn">${escapeHtml(t.namn)}</span>
        <span class="besk">${escapeHtml(t.beskrivning)}</span>`;
      label.querySelector('input').addEventListener('change', () => {
        valdVadertyp = t.kod;
      });
      behallare.appendChild(label);
    }
  } catch (e) {
    behallare.innerHTML = `<p class="form-message err">Kunde inte ladda vädertyper: ${escapeHtml(e.message)}</p>`;
  }
}

// ---------------- Rendera det färdiga kortet ----------------
function renderaKort(kort) {
  const tema = VADER_TEMA[kort.vaderkod] || { grad: 'linear-gradient(160deg,#7dd3fc,#38bdf8)', frase: 'En väderhälsning till dig!' };
  const halsningHtml = kort.halsning
    ? `<p class="kort-halsning">${escapeHtml(kort.halsning)}</p>`
    : '';

  const el = document.getElementById('grattiskort');
  el.style.setProperty('--kort-grad', tema.grad);
  el.innerHTML = `
    <div class="kort-scen">
      <div class="kort-emoji" aria-hidden="true">${kort.vaderemoji}</div>
      <p class="kort-tagline">${escapeHtml(tema.frase)}</p>
    </div>
    <div class="kort-kropp">
      <p class="kort-till">Till ${escapeHtml(kort.mottagare)}</p>
      <span class="kort-datum">${formateraDatum(kort.datum)}</span>
      ${halsningHtml}
      <p class="kort-onskan">Jag önskar dig ${escapeHtml(kort.vadernamn.toLowerCase())} på din dag. ${kort.vaderemoji}</p>
      <div class="kort-fran">Varma hälsningar,<br><strong>${escapeHtml(kort.avsandare)}</strong></div>
    </div>`;

  const visning = document.getElementById('kortvisning');
  visning.hidden = false;
  visning.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---------------- Galleri ----------------
async function laddaGalleri() {
  const galleri = document.getElementById('kortgalleri');
  try {
    const kort = await api('GET', '/api/kort');
    if (kort.length === 0) {
      galleri.innerHTML = '<p class="muted">Inga kort ännu – skapa det första!</p>';
      return;
    }
    galleri.innerHTML = kort.map((k) => `
      <div class="galleri-kort">
        <span class="gk-emoji" aria-hidden="true">${k.vaderemoji}</span>
        <div>
          <div class="gk-namn">Till ${escapeHtml(k.mottagare)}</div>
          <div class="gk-meta">${escapeHtml(k.vadernamn)} · ${formateraDatum(k.datum)}</div>
          <div class="gk-meta">Från ${escapeHtml(k.avsandare)}</div>
        </div>
      </div>`).join('');
  } catch (e) {
    galleri.innerHTML = `<p class="form-message err">Kunde inte ladda kort: ${escapeHtml(e.message)}</p>`;
  }
}

// ---------------- Formulärhantering ----------------
function kopplaFormular() {
  const form = document.getElementById('kortform');
  const meddelande = document.getElementById('formmeddelande');
  const datumfalt = document.getElementById('datum');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!valdVadertyp) {
      return visaMeddelande(meddelande, 'Välj en vädertyp först.', 'err');
    }
    const payload = {
      vadertyp: valdVadertyp,
      datum: datumfalt.value,
      mottagare: document.getElementById('mottagare').value.trim(),
      avsandare: document.getElementById('avsandare').value.trim(),
      halsning: document.getElementById('halsning').value.trim()
    };
    visaMeddelande(meddelande, 'Skapar kort…', '');
    try {
      const kort = await api('POST', '/api/kort', payload);
      visaMeddelande(meddelande, '', '');
      renderaKort(kort);
      laddaGalleri();
    } catch (err) {
      visaMeddelande(meddelande, err.message, 'err');
    }
  });

  // Skriv ut det färdiga kortet.
  document.getElementById('skrivutknapp').addEventListener('click', () => {
    window.print();
  });

  // Börja om: dölj kortet och nollställ formuläret.
  document.getElementById('nyttkortknapp').addEventListener('click', () => {
    document.getElementById('kortvisning').hidden = true;
    form.reset();
    valdVadertyp = null;
    document.getElementById('skapa').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

// ---------------- Start ----------------
laddaVadertyper();
laddaGalleri();
kopplaFormular();
