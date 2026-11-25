/** Etap projektu ustawy – wyliczany przez Workera z przebiegu prac w Sejmie. */
export type ProjectPhase = 'signed' | 'president' | 'senate' | 'sejm' | 'veto' | 'tribunal';

export interface ProjectStage {
  name: string;
  date: string | null;
  decision: string | null;
}

/** Projekt ustawy w toku (endpoint /projects Workera, dane z API Sejmu). */
export interface Project {
  number: string;          // numer druku sejmowego
  title: string;
  author: string | null;   // Rządowy, Poselski, Senacki, Prezydencki…
  description: string | null; // opis Kancelarii Sejmu
  phase: ProjectPhase;
  lastStage: string | null;
  lastDate: string | null;
  started: string | null;
  changeDate: string;
  urgent: boolean;
  eu: boolean;
  rcl: string | null;
  stages: ProjectStage[];
}
