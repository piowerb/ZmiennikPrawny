import { Project } from '../types/Project';

/** Ten sam Cloudflare Worker co wyjaśnienia AI (worker/zp-ai-worker.js). */
const WORKER_URL = 'https://ai.zmiennikprawny.pl';

export interface ProjectsResponse {
  updated: string;
  projects: Project[];
}

export async function fetchProjects(): Promise<ProjectsResponse> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60000);
  try {
    const res = await fetch(`${WORKER_URL}/projects`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.projects)) throw new Error('Zła odpowiedź');
    return { updated: data.updated, projects: data.projects };
  } finally {
    clearTimeout(timer);
  }
}

export const DEFAULT_TERM = 10;
export const termOf = (p: { term?: number }) => p.term ?? DEFAULT_TERM;

/** Link do przebiegu prac na stronie Sejmu (adres zależy od kadencji). */
export const sejmProcessUrl = (number: string, term: number = DEFAULT_TERM) =>
  `https://www.sejm.gov.pl/Sejm${term}.nsf/PrzebiegProc.xsp?nr=${encodeURIComponent(number)}`;

/** Kadencja zapisana cyframi rzymskimi, np. 10 → "X". */
export const romanTerm = (n: number) => {
  const map: [number, string][] = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  for (const [v, s] of map) while (n >= v) { out += s; n -= v; }
  return out;
};
