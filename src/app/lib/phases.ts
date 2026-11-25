import { Project, ProjectPhase } from '../types/Project';

/** Kolejność: najbliżej wejścia w życie na górze, zatrzymane na końcu. */
export const PHASE_ORDER: ProjectPhase[] = ['signed', 'president', 'senate', 'sejm', 'veto', 'tribunal'];

export const PHASE_META: Record<ProjectPhase, { label: string; chip: string; filter: string; hint: string; cls: string }> = {
  signed: {
    filter: 'Podpisane',
    label: 'Podpisane przez Prezydenta',
    chip: 'Podpisana',
    hint: 'Czekają na publikację w Dzienniku Ustaw',
    cls: 'bg-[#e6f4ed] text-[#005130] dark:bg-[#143323] dark:text-[#6fd3a2]',
  },
  president: {
    filter: 'U Prezydenta',
    label: 'U Prezydenta',
    chip: 'U Prezydenta',
    hint: 'Prezydent ma 21 dni na podpis, weto lub skierowanie do TK',
    cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  },
  senate: {
    filter: 'W Senacie',
    label: 'W Senacie',
    chip: 'W Senacie',
    hint: 'Uchwalone przez Sejm; Senat ma 30 dni na stanowisko',
    cls: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
  },
  sejm: {
    filter: 'W Sejmie',
    label: 'W Sejmie',
    chip: 'W Sejmie',
    hint: 'Czytania i prace w komisjach',
    cls: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
  },
  veto: {
    filter: 'Weto',
    label: 'Weto Prezydenta',
    chip: 'Weto',
    hint: 'Sejm może je odrzucić większością 3/5 głosów',
    cls: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  },
  tribunal: {
    filter: 'W TK',
    label: 'W Trybunale Konstytucyjnym',
    chip: 'W TK',
    hint: 'Prezydent skierował ustawę do TK przed podpisaniem',
    cls: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
};

export const capitalizeFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Czy projekt pasuje do frazy (tytuł, numer druku, opis, wnioskodawca). */
export const matchesProject = (p: Project, query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    p.title.toLowerCase().includes(q) ||
    p.number === q.replace(/^(druk\s*(nr)?\s*)/, '') ||
    (p.description || '').toLowerCase().includes(q) ||
    (p.author || '').toLowerCase().includes(q)
  );
};
