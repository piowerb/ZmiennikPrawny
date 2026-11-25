/**
 * ZmiennikPrawny AI – podsumowania aktów prawnych (Cloudflare Worker, plan Free)
 *
 * GET /summary?eli=DU/2026/1527
 *   → { eli, czego, kogo, zmiany[], model, generated, truncated, cached }
 *
 * GET /projects
 *   → { updated, terms[], count, projects[] } – projekty ustaw w toku (bez AI, dane z API Sejmu);
 *     kadencja Sejmu ustalana automatycznie, więc po wyborach nic nie trzeba zmieniać.
 *
 * Bezpieczeństwo kosztów (plan Free = brak karty = brak rachunku):
 *  - każdy akt jest streszczany tylko raz, potem odpowiedź idzie z pamięci (KV),
 *  - tylko akty z Dziennika Ustaw z ostatnich MAX_DAYS dni,
 *  - dzienny limit nowych podsumowań (DAILY_LIMIT),
 *  - długie akty są przycinane do MAX_CHARS znaków.
 *
 * Wiązania (Settings → Bindings): AI = Workers AI, CACHE = KV namespace.
 * Harmonogram (Settings → Trigger events → Cron Triggers): co 15 minut,
 * czyli wyrażenie 0,15,30,45 * * * * – odświeżanie projektów ustaw.
 */

// Model główny (przetestowany na prawdziwych aktach: poprawny JSON i przepisy) + zapasowy.
// enable_thinking: false – bez „myślenia” odpowiedź trwa kilka sekund zamiast ~1,5 minuty.
const MODELS = [
  { id: '@cf/google/gemma-4-26b-a4b-it', label: 'Gemma 4 26B', maxTokens: 4000 },
  { id: '@cf/zai-org/glm-4.7-flash', label: 'GLM-4.7 Flash', maxTokens: 4000 }, // model „myślący” – potrzebuje więcej tokenów
];
const PROMPT_VERSION = 'v1';
const MAX_DAYS = 90;
const MAX_CHARS = 60000;
const DAILY_LIMIT = 150;
const CACHE_TTL = 60 * 60 * 24 * 180; // 180 dni
const SEJM = 'https://api.sejm.gov.pl/eli/acts';

const ALLOWED_ORIGINS = [
  'https://app.zmiennikprawny.pl',
  'https://zmiennikprawny.pl',
  'https://zmiennikprawny.vercel.app',
  'http://localhost:5173',
];

const SYSTEM_PROMPT = `Jesteś asystentem aplikacji ZmiennikPrawny. Streszczasz polskie akty prawne prostym językiem dla osób bez wykształcenia prawniczego.
Zasady:
1. Korzystaj WYŁĄCZNIE z tekstu aktu podanego przez użytkownika. Nie dodawaj wiedzy spoza tekstu.
2. Nie podawaj dat wejścia w życie ani terminów – aplikacja pokazuje je osobno.
3. Nie oceniaj aktu (także politycznie) i nie udzielaj porad.
4. Przy każdej zmianie podaj w nawiasie przepis, którego dotyczy, np. (art. 2) albo (§ 1).
5. Jeśli czegoś nie da się ustalić z tekstu, napisz "nie wynika z tekstu".
Odpowiedz WYŁĄCZNIE poprawnym obiektem JSON, bez komentarzy i bez bloków kodu:
{"czego":"1–2 zdania: czego dotyczy akt","kogo":"kogo bezpośrednio dotyczy, krótko","zmiany":["najważniejsze zmiany, maksymalnie 5, każda do 25 słów, z przepisem w nawiasie"]}`;

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'GET') return json({ error: 'method' }, 405, cors);

    const url = new URL(request.url);
    if (url.pathname === '/' || url.pathname === '/health') {
      return json({ ok: true, service: 'ZmiennikPrawny AI', models: MODELS.map(m => m.id) }, 200, cors);
    }
    if (url.pathname === '/projects') return handleProjects(env, ctx, cors, json);
    if (url.pathname !== '/summary') return json({ error: 'not_found' }, 404, cors);

    const t0 = Date.now();
    const log = (step, extra = '') => console.log(`[zp-ai] ${step} +${Date.now() - t0}ms ${extra}`);
    const eli = (url.searchParams.get('eli') || '').trim();
    const m = eli.match(/^DU\/(20\d{2})\/(\d{1,5})$/);
    if (!m) return json({ error: 'bad_eli' }, 400, cors);

    const key = `sum:${PROMPT_VERSION}:${eli}`;
    const cached = await env.CACHE.get(key, 'json');
    if (cached) return json({ ...cached, cached: true }, 200, cors, 3600);

    // 1. Metadane aktu – tylko świeże akty
    const metaRes = await fetch(`${SEJM}/${eli}`, { cf: { cacheTtl: 3600 } });
    if (!metaRes.ok) return json({ error: 'not_found' }, 404, cors);
    const meta = await metaRes.json();
    log('meta', eli);
    const published = new Date(meta.promulgation || meta.announcementDate || 0);
    const ageDays = (Date.now() - published.getTime()) / 864e5;
    if (!(ageDays <= MAX_DAYS)) return json({ error: 'too_old', maxDays: MAX_DAYS }, 403, cors);

    // 2. Dzienny limit nowych podsumowań
    const dayKey = `gen:${new Date().toISOString().slice(0, 10)}`;
    const used = parseInt((await env.CACHE.get(dayKey)) || '0', 10);
    if (used >= DAILY_LIMIT) return json({ error: 'limit' }, 429, cors);

    // 3. Tekst aktu z PDF
    const pdfRes = await fetch(`${SEJM}/${eli}/text.pdf`);
    if (!pdfRes.ok) return json({ error: 'no_text' }, 404, cors);
    let text;
    try {
      const blob = new Blob([await pdfRes.arrayBuffer()], { type: 'application/pdf' });
      const conv = await env.AI.toMarkdown({ name: 'akt.pdf', blob });
      const doc = Array.isArray(conv) ? conv[0] : conv;
      if (!doc || doc.format === 'error' || !doc.data) throw new Error(doc?.error || 'conversion');
      text = cleanText(doc.data);
      log('pdf->text', `${text.length} znaków`);
    } catch (e) {
      log('pdf->text BŁĄD', String(e && e.message || e));
      return json({ error: 'no_text' }, 502, cors);
    }
    if (text.length < 80) return json({ error: 'no_text' }, 404, cors);
    const truncated = text.length > MAX_CHARS;
    if (truncated) text = text.slice(0, MAX_CHARS);

    // 4. Model AI (główny, a gdy zawiedzie – zapasowy)
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Tytuł: ${meta.title}\n\nTEKST AKTU${truncated ? ' (początek – akt jest długi)' : ''}:\n${text}` },
    ];
    let parsed = null;
    let usedModel = null;
    let aiError = false;
    for (const model of MODELS) {
      try {
        const out = await env.AI.run(model.id, { messages, max_tokens: model.maxTokens, temperature: 0.2, chat_template_kwargs: { enable_thinking: false } });
        let raw = out?.response ?? out?.choices?.[0]?.message?.content ?? '';
        if (typeof raw !== 'string') raw = JSON.stringify(raw);
        parsed = parseSummary(raw);
        log(`model ${model.label}`, parsed ? 'OK' : `zła odpowiedź: ${raw.slice(0, 200)}`);
        if (parsed) { usedModel = model; break; }
      } catch (e) {
        log(`model ${model.label} BŁĄD`, String(e && e.message || e));
        aiError = true;
      }
    }
    if (!parsed) return json({ error: aiError ? 'ai_unavailable' : 'bad_output' }, aiError ? 503 : 502, cors);

    const result = {
      eli,
      ...parsed,
      model: `${usedModel.label} (Cloudflare Workers AI)`,
      generated: new Date().toISOString(),
      truncated,
    };
    ctx.waitUntil(Promise.all([
      env.CACHE.put(key, JSON.stringify(result), { expirationTtl: CACHE_TTL }),
      env.CACHE.put(dayKey, String(used + 1), { expirationTtl: 60 * 60 * 48 }),
    ]));
    return json({ ...result, cached: false }, 200, cors, 3600);
  },

  // Harmonogram (Cron Trigger) – odświeża projekty ustaw także wtedy, gdy nikt nie odwiedza aplikacji.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(refreshProjectsIfDue(env)
      .then(s => console.log('[zp-proj] cron:', s))
      .catch(e => console.log('[zp-proj] cron BŁĄD', String(e))));
  },
};

export function cleanText(s) {
  return s
    .replace(/Dziennik Ustaw\s*[–-]\s*\d+\s*[–-]\s*Poz\.\s*\d+/g, '')
    .replace(/(\p{L})-\n(\p{L})/gu, '$1$2')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function parseSummary(raw) {
  let s = String(raw).replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/```(?:json)?/gi, '').trim();
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a === -1 || b <= a) return null;
  let o;
  try { o = JSON.parse(s.slice(a, b + 1)); } catch { return null; }
  const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const czego = str(o.czego, 600);
  const kogo = str(o.kogo, 400);
  const zmiany = (Array.isArray(o.zmiany) ? o.zmiany : []).map(z => str(z, 300)).filter(Boolean).slice(0, 5);
  if (!czego) return null;
  return { czego, kogo, zmiany };
}

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(body, status, headers, maxAge = 0) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': maxAge && status === 200 ? `public, max-age=${maxAge}` : 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Projekty ustaw – „co nadchodzi” (GET /projects)
//
// Źródło: API Sejmu (procesy legislacyjne). Bieżącą kadencję Worker ustala sam
// (/sejm/term → "current": true), więc po wyborach nic nie trzeba zmieniać.
// Przez pierwsze PROJ_WINDOW_DAYS nowej kadencji dołącza też ustawy uchwalone
// w poprzedniej, które czekają jeszcze na Senat, Prezydenta albo publikację
// (niedokończone projekty poprzedniej kadencji wygasają – zasada dyskontynuacji).
//
// Lista jest składana w KV i odświeżana:
//  - przez harmonogram (Cron Trigger, np. co 15 minut) – niezależnie od ruchu,
//  - oraz przy odwiedzinach, gdy minęła godzina (w tle, bez czekania).
//
// Limity planu Free: maks. 50 zapytań na wywołanie → 1 (kadencje) + do 2 list
// + PROJ_DETAILS_PER_RUN szczegółów; brakujące dochodzą w kolejnych odświeżeniach.
// ─────────────────────────────────────────────────────────────────────────────

const SEJM_API = 'https://api.sejm.gov.pl/sejm';
const PROJ_KEY = 'projects:v2';
const PROJ_KEY_OLD = 'projects:v1';  // poprzedni format (tylko X kadencja) – przejmowany przy pierwszym odświeżeniu
const PROJ_TERM_FALLBACK = 10;       // gdy API kadencji chwilowo nie odpowiada i nie ma nic zapisanego
const PROJ_WINDOW_DAYS = 120;        // projekty z ruchem w ostatnich 120 dniach
const PROJ_DETAILS_PER_RUN = 40;     // 1 + 2 + 40 = 43 < 50
const PROJ_REFRESH_MS = 60 * 60 * 1000;
const PROJ_REFILL_MS = 60 * 1000;    // dociąganie brakujących szczegółów co minutę
let projRebuilding = false;          // blokada w obrębie jednej instancji

export async function handleProjects(env, ctx, cors, json) {
  const stored = await loadProjects(env);
  const now = Date.now();

  if (stored && stored.v === 2 && now < stored.nextRefresh) return json(publicView(stored), 200, cors, 600);

  if (stored) {
    // Mamy starszą wersję: oddajemy ją od razu, odświeżamy w tle.
    if (!projRebuilding) ctx.waitUntil(rebuildProjects(env, stored).catch(e => console.log('[zp-proj] BŁĄD', String(e))));
    return json(publicView(stored), 200, cors, 300);
  }

  // Pierwsze uruchomienie – trzeba poczekać na zbudowanie listy.
  try {
    const fresh = await rebuildProjects(env, null);
    return json(publicView(fresh), 200, cors, 300);
  } catch (e) {
    console.log('[zp-proj] BŁĄD', String(e));
    return json({ error: 'projects_unavailable' }, 503, cors);
  }
}

/** Wywoływane przez Cron Trigger: odświeża listę, gdy nadszedł czas. */
export async function refreshProjectsIfDue(env) {
  const stored = await loadProjects(env);
  if (stored && stored.v === 2 && Date.now() < stored.nextRefresh) return 'aktualne';
  await rebuildProjects(env, stored);
  return 'odświeżone';
}

async function loadProjects(env) {
  const v2 = await env.CACHE.get(PROJ_KEY, 'json');
  if (v2) return v2;
  const v1 = await env.CACHE.get(PROJ_KEY_OLD, 'json');
  if (!v1 || !v1.items) return null;
  // Stary format: klucz = numer druku, zawsze X kadencja.
  const items = {};
  for (const p of Object.values(v1.items)) items[`10/${p.number}`] = { ...p, term: 10 };
  return { v: 1, updated: v1.updated, nextRefresh: 0, terms: [10], items };
}

/** Bieżąca kadencja (+ poprzednia przez pierwsze PROJ_WINDOW_DAYS nowej). */
export async function activeTerms(prevTerms) {
  try {
    const res = await fetch(`${SEJM_API}/term`, { cf: { cacheTtl: 6 * 3600 } });
    if (!res.ok) throw new Error(`kadencje ${res.status}`);
    const terms = await res.json();
    const valid = (Array.isArray(terms) ? terms : []).filter(t => t && Number.isInteger(t.num));
    if (!valid.length) throw new Error('brak kadencji');
    const cur = valid.find(t => t.current) || valid.reduce((a, b) => (b.num > a.num ? b : a));
    const out = [{ num: cur.num, onlyPassed: false }];
    const since = cur.from ? (Date.now() - Date.parse(cur.from)) / 864e5 : Infinity;
    if (cur.num > 1 && since < PROJ_WINDOW_DAYS) out.push({ num: cur.num - 1, onlyPassed: true });
    return out;
  } catch (e) {
    console.log('[zp-proj] kadencje niedostępne, używam zapisanych', String(e));
    const nums = prevTerms && prevTerms.length ? prevTerms : [PROJ_TERM_FALLBACK];
    return nums.map((num, i) => ({ num, onlyPassed: i > 0 }));
  }
}

async function rebuildProjects(env, prev) {
  projRebuilding = true;
  try {
    const t0 = Date.now();
    const terms = await activeTerms(prev && prev.terms);

    const lists = await Promise.all(terms.map(async t => {
      const res = await fetch(`${SEJM_API}/term${t.num}/processes?documentType=projekt%20ustawy&limit=5000`, { cf: { cacheTtl: 600 } });
      if (!res.ok) throw new Error(`lista term${t.num}: ${res.status}`);
      return pickCandidates(await res.json(), Date.now(), t.num, t.onlyPassed);
    }));
    const cands = lists.flat().sort((a, b) => b.changeDate.localeCompare(a.changeDate));

    const prevItems = (prev && prev.items) || {};
    const stale = cands.filter(c => !prevItems[c.key] || prevItems[c.key].changeDate !== c.changeDate);
    const toFetch = stale.slice(0, PROJ_DETAILS_PER_RUN);

    const fetched = await Promise.all(toFetch.map(c =>
      fetch(`${SEJM_API}/term${c.term}/processes/${c.number}`)
        .then(r => (r.ok ? r.json() : null))
        .then(d => (d ? { c, d } : null))
        .catch(() => null)));

    const items = {};
    for (const c of cands) if (prevItems[c.key]) items[c.key] = prevItems[c.key];
    for (const f of fetched) {
      if (!f) continue;
      const p = slimProject(f.d, f.c.term);
      if (p) items[f.c.key] = p; else delete items[f.c.key]; // np. już opublikowany
    }

    const missing = stale.length - fetched.filter(Boolean).length;
    const blob = {
      v: 2,
      updated: new Date().toISOString(),
      nextRefresh: Date.now() + (missing > 0 ? PROJ_REFILL_MS : PROJ_REFRESH_MS),
      terms: terms.map(t => t.num),
      items,
    };
    await env.CACHE.put(PROJ_KEY, JSON.stringify(blob));
    console.log(`[zp-proj] kadencje ${blob.terms.join('+')}, kandydaci ${cands.length}, pobrano ${toFetch.length}, brakuje ${missing}, ${Date.now() - t0}ms`);
    return blob;
  } finally {
    projRebuilding = false;
  }
}

/**
 * Projekty „w drodze”: niezakończone albo uchwalone, ale jeszcze nieopublikowane.
 * onlyPassed – dla poprzedniej kadencji tylko ustawy już uchwalone przez Sejm.
 */
export function pickCandidates(list, now, term = PROJ_TERM_FALLBACK, onlyPassed = false) {
  const minDate = now - PROJ_WINDOW_DAYS * 864e5;
  return (Array.isArray(list) ? list : [])
    .filter(p => p && p.number && p.changeDate && new Date(p.changeDate).getTime() >= minDate)
    .filter(p => (!onlyPassed && !p.passed && !p.closureDate) || (p.passed && !p.ELI))
    .map(p => ({ key: `${term}/${p.number}`, term, number: String(p.number), changeDate: p.changeDate }));
}

/** Etap projektu w prostych kategoriach. */
export function phaseOf(stages) {
  const real = (stages || []).filter(s => s.stageType !== 'End');
  const types = real.map(s => s.stageType);
  const at = t => types.lastIndexOf(t);
  if (at('PresidentToTribunal') >= 0 && at('PresidentToTribunal') > at('PresidentSignature')) return 'tribunal';
  if (at('PresidentSignature') > at('Veto')) return 'signed';
  if (at('Veto') >= 0) return 'veto';
  if (at('ToPresident') >= 0) return 'president';
  if (real.some(s => /uchwalono/i.test(s.decision || ''))) return 'senate';
  return 'sejm';
}

const AUTHOR = /^(Rządowy|Poselski|Senacki|Obywatelski|Prezydencki|Komisyjny)\s+projekt\s+ustawy\s*/i;
const AUTHOR_PRESIDENT = /^Przedstawiony przez Prezydenta Rzeczypospolitej Polskiej projekt ustawy\s*/i;

export function slimProject(d, term = PROJ_TERM_FALLBACK) {
  if (!d || !d.number || d.ELI) return null; // opublikowany → jest już na liście aktów
  if (d.closureDate && !d.passed) return null; // odrzucony / wycofany
  const stages = (d.stages || [])
    .filter(s => s.stageType !== 'End' && s.stageName)
    .map(s => ({
      name: String(s.stageName).trim(),
      date: s.date || null,
      decision: s.decision ? String(s.decision).trim() : null,
    }));
  const dated = stages.filter(s => s.date);
  const last = dated[dated.length - 1] || stages[stages.length - 1] || null;
  const title = String(d.title || '').replace(/\s+/g, ' ').trim();
  const am = title.match(AUTHOR);
  const pm = !am && title.match(AUTHOR_PRESIDENT);
  const cut = am ? am[0].length : pm ? pm[0].length : 0;
  return {
    term: Number(d.term) || term,
    number: String(d.number),
    title: cut ? `Projekt ustawy ${title.slice(cut)}` : title,
    author: am ? am[1][0].toUpperCase() + am[1].slice(1).toLowerCase() : pm ? 'Prezydencki' : null,
    description: d.description ? String(d.description).trim().slice(0, 1500) : null,
    phase: phaseOf(d.stages),
    lastStage: last ? last.name : null,
    lastDate: last ? last.date : (d.processStartDate || null),
    started: d.processStartDate || null,
    changeDate: d.changeDate,
    urgent: d.urgencyStatus === 'URGENT',
    eu: !!d.UE && d.UE !== 'NO',
    rcl: d.rclLink || null,
    stages,
  };
}

// Najbliżej wejścia w życie na górze; zatrzymane (weto, TK) na końcu.
const PHASE_ORDER = { signed: 0, president: 1, senate: 2, sejm: 3, veto: 4, tribunal: 5 };

function publicView(blob) {
  const projects = Object.values(blob.items || {}).sort((a, b) =>
    (PHASE_ORDER[a.phase] - PHASE_ORDER[b.phase]) ||
    String(b.lastDate || '').localeCompare(String(a.lastDate || '')) ||
    ((b.term || 0) - (a.term || 0)) ||
    (+b.number - +a.number));
  return { updated: blob.updated, terms: blob.terms || [], count: projects.length, projects };
}
