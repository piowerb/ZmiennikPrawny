import { LegalAct, LegalActCategory } from '../types/LegalAct';

const DAY = 86400000;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Ile dni od dziś do daty (ujemne = w przeszłości). */
export const daysFromToday = (iso: string) =>
  Math.round((startOfDay(new Date(iso)) - startOfDay(new Date())) / DAY);

export const fmt = (iso: string) => new Date(iso).toLocaleDateString('pl-PL');

const dni = (n: number) => (n === 1 ? '1 dzień' : `${n} dni`);

export const publishedLabel = (iso: string) => {
  const d = -daysFromToday(iso);
  if (d <= 0) return 'dzisiaj';
  if (d === 1) return 'wczoraj';
  return `${dni(d)} temu`;
};

export const effectiveLabel = (iso: string) => {
  const d = daysFromToday(iso);
  if (d === 0) return 'wchodzi w życie dziś';
  if (d === 1) return 'wchodzi w życie jutro';
  if (d > 1) return `wchodzi w życie za ${dni(d)}`;
  return `obowiązuje od ${fmt(iso)}`;
};

export const effectiveShort = (iso: string) => {
  const d = daysFromToday(iso);
  if (d === 0) return 'od dziś';
  if (d === 1) return 'od jutra';
  if (d > 1) return `za ${dni(d)}`;
  return 'już obowiązuje';
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Nagłówek grupy: "Dzisiaj", "Wczoraj", "Jutro" albo "Piątek, 20 listopada". */
export const dayHeading = (iso: string) => {
  const d = daysFromToday(iso);
  if (d === 0) return 'Dzisiaj';
  if (d === -1) return 'Wczoraj';
  if (d === 1) return 'Jutro';
  return capitalize(
    new Date(iso).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' }),
  );
};

export const CATEGORY_META: Record<LegalActCategory, { label: string; cls: string }> = {
  ustawa: { label: 'Ustawa', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' },
  rozporzadzenie: { label: 'Rozporządzenie', cls: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200' },
  ogloszenie: { label: 'Obwieszczenie', cls: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200' },
  komunikat: { label: 'Inne', cls: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
};

/** Czy akt pasuje do frazy (tytuł, sygnatura, organ, tagi). */
export const matches = (a: LegalAct, query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    a.title.toLowerCase().includes(q) ||
    a.journalNumber.toLowerCase().includes(q) ||
    a.issuingBody.toLowerCase().includes(q) ||
    a.tags.some(t => t.toLowerCase().includes(q))
  );
};

// Znaki specjalne (np. "(", "+", "?") trzeba zabezpieczyć, inaczej RegExp rzuca błąd
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark key={i} className="bg-[#e6f4ed] text-[#005130] dark:bg-[#143323] dark:text-[#6fd3a2] rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}
