/**
 * ZmiennikPrawny AI – podsumowania aktów prawnych (Cloudflare Worker, plan Free)
 *
 * GET /summary?eli=DU/2026/1527
 *   → { eli, czego, kogo, zmiany[], model, generated, truncated, cached }
 *
 * Bezpieczeństwo kosztów (plan Free = brak karty = brak rachunku):
 *  - każdy akt jest streszczany tylko raz, potem odpowiedź idzie z pamięci (KV),
 *  - tylko akty z Dziennika Ustaw z ostatnich MAX_DAYS dni,
 *  - dzienny limit nowych podsumowań (DAILY_LIMIT),
 *  - długie akty są przycinane do MAX_CHARS znaków.
 *
 * Wiązania (Settings → Bindings): AI = Workers AI, CACHE = KV namespace.
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
