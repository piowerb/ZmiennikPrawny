import { LegalAct, LegalActCategory } from '../types/LegalAct';

const API = 'https://api.sejm.gov.pl/eli/acts';
const DAYS_BACK = 30;

// Pola zwracane przez /eli/acts/search (pełne dane aktu, w tym data wejścia w życie)
interface ApiAct {
  ELI: string;
  year: number;
  pos: number;
  title: string;
  type?: string;
  status?: string;
  promulgation?: string;
  announcementDate?: string;
  entryIntoForce?: string;
  releasedBy?: string[];
  keywords?: string[];
}

// Kategoria z pola `type` (np. "Rozporządzenie", "Obwieszczenie"), a nie z tytułu
const mapType = (type = '', title = ''): LegalActCategory => {
  const t = (type || title).toLowerCase();
  if (t.startsWith('ustawa')) return 'ustawa';
  if (t.startsWith('rozporządzenie')) return 'rozporzadzenie';
  if (t.startsWith('obwieszczenie') || t.startsWith('ogłoszenie')) return 'ogloszenie';
  return 'komunikat';
};

// "MIN. ROLNICTWA I ROZWOJU WSI" -> "Minister Rolnictwa i Rozwoju Wsi"
const LOWER_WORDS = new Set(['i', 'w', 'z', 'do', 'na', 'oraz', 'od', 'ds.', 'dla']);
const prettifyBody = (raw: string): string => {
  if (raw.trim().toUpperCase() === 'SEJM') return 'Sejm RP';
  const expanded = raw
    .replace(/^MIN\.\s*/i, 'MINISTER ')
    .replace(/^PREZ\.\s*/i, 'PREZES ')
    .replace(/\s+/g, ' ')
    .trim();
  return expanded
    .toLowerCase()
    .split(' ')
    .map((w, i) => (i > 0 && LOWER_WORDS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
};

// Zapasowo, gdy API nie poda organu: odczyt z tytułu ("Rozporządzenie Ministra Zdrowia z dnia…")
const bodyFromTitle = (title: string): string => {
  const t = title.toLowerCase();
  if (t.startsWith('ustawa')) return 'Sejm RP';
  if (t.includes('prezesa rady ministrów')) return 'Prezes Rady Ministrów';
  if (t.includes('rady ministrów')) return 'Rada Ministrów';
  if (t.includes('marszałka sejmu')) return 'Marszałek Sejmu';
  if (t.includes('prezydenta')) return 'Prezydent RP';
  const m = title.match(/Ministra (.+?) z dnia/);
  if (m) return `Minister ${m[1].trim()}`;
  return 'Organ państwowy';
};

const pad = (n: number, len: number) => String(n).padStart(len, '0');

const convert = (a: ApiAct): LegalAct => {
  const dateStr = a.promulgation || a.announcementDate || new Date().toISOString().slice(0, 10);
  const date = new Date(dateStr);
  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));

  const issuingBody = a.releasedBy && a.releasedBy.length
    ? a.releasedBy.map(prettifyBody).join(', ')
    : bodyFromTitle(a.title);

  const tags = (a.keywords || []).filter(Boolean).slice(0, 5);

  return {
    id: a.ELI || `${a.year}-${a.pos}`,
    title: a.title,
    category: mapType(a.type, a.title),
    journalNumber: `Dz.U. ${a.year} poz. ${a.pos}`,
    year: a.year,
    position: a.pos,
    publicationDate: date.toISOString(),
    effectiveDate: a.entryIntoForce || undefined,
    issuingBody,
    summary: [a.type, a.status].filter(Boolean).join(' · ') || 'Akt prawny opublikowany w Dzienniku Ustaw RP.',
    tags: tags.length ? tags : ['ogólne'],
    pdfUrl: `https://isap.sejm.gov.pl/isap.nsf/download.xsp/WDU${a.year}${pad(a.pos, 7)}/O/D${a.year}${pad(a.pos, 4)}.pdf`,
    isNew: days <= 7,
  };
};

export async function fetchRecentLegalActs(): Promise<LegalAct[]> {
  // Jedno zapytanie o akty z ostatnich 30 dni (działa też na przełomie roku).
  // Zwraca ok. 200 KB zamiast ~800 KB całego rocznika.
  const from = new Date(Date.now() - DAYS_BACK * 86400000).toISOString().slice(0, 10);
  const res = await fetch(`${API}/search?publisher=DU&pubDateFrom=${from}&limit=500`);
  if (!res.ok) throw new Error(`API Sejmu: HTTP ${res.status}`);
  const data = await res.json();
  const items: ApiAct[] = Array.isArray(data.items) ? data.items : [];

  return items
    .map(convert)
    .sort((a, b) => {
      const diff = new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime();
      return diff !== 0 ? diff : b.position - a.position;
    });
}

/** Pojedynczy akt po adresie ELI, np. "DU/2026/1539" (dla linków do starszych aktów). */
export async function fetchActByEli(eli: string): Promise<LegalAct> {
  const res = await fetch(`${API}/${eli}`);
  if (!res.ok) throw new Error(`API Sejmu: HTTP ${res.status}`);
  return convert(await res.json());
}
