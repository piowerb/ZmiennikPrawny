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

/** Link do przebiegu prac na stronie Sejmu. */
export const sejmProcessUrl = (number: string) =>
  `https://www.sejm.gov.pl/Sejm10.nsf/PrzebiegProc.xsp?nr=${encodeURIComponent(number)}`;
