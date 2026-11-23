import { ChevronRightIcon } from 'lucide-react';
import { LegalAct } from '../types/LegalAct';
import { TopicIcon } from '../lib/topicIcon';
import { CATEGORY_META, Highlight, dayHeading, effectiveLabel, fmt, publishedLabel } from '../lib/text';

interface Props {
  acts: LegalAct[];
  search: string;
  /** 'published' grupuje po dacie publikacji, 'effective' po dacie wejścia w życie */
  groupBy: 'published' | 'effective';
  onOpen: (act: LegalAct) => void;
  empty: { title: string; text: string };
}

export function ActList({ acts, search, groupBy, onOpen, empty }: Props) {
  if (acts.length === 0) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="font-medium text-gray-800 dark:text-[#e8ece9]">{empty.title}</p>
        <p className="text-sm mt-1 text-gray-500 dark:text-[#9aa59f]">{empty.text}</p>
      </div>
    );
  }

  const groups: { key: string; heading: string; items: LegalAct[] }[] = [];
  for (const a of acts) {
    const date = groupBy === 'effective' ? a.effectiveDate! : a.publicationDate;
    const key = date.slice(0, 10);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(a);
    else groups.push({ key, heading: dayHeading(date), items: [a] });
  }

  return (
    <div>
      {groups.map(g => (
        <section key={g.key} aria-label={g.heading}>
          <h2 className="sticky top-0 z-10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 bg-gray-50/95 backdrop-blur border-y border-gray-200 dark:bg-[#121916]/95 dark:text-[#9aa59f] dark:border-[#26302b]">
            {groupBy === 'effective' ? `Wchodzi w życie: ${g.heading.toLowerCase()}` : g.heading}
            <span className="ml-2 font-normal normal-case tracking-normal">· {g.items.length}</span>
          </h2>
          <ul className="divide-y divide-gray-200 dark:divide-[#26302b]">
            {g.items.map(a => (
              <li key={a.id}>
                <ActRow act={a} search={search} groupBy={groupBy} onOpen={onOpen} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ActRow({ act: a, search, groupBy, onOpen }: { act: LegalAct; search: string; groupBy: Props['groupBy']; onOpen: Props['onOpen'] }) {
  const cat = CATEGORY_META[a.category];
  return (
    <button
      onClick={() => onOpen(a)}
      className="w-full px-4 py-4 text-left flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-[#151d19] transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.cls}`}>{cat.label}</span>
          {a.isNew && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-[#e6f4ed] text-[#005130] dark:bg-[#143323] dark:text-[#6fd3a2]">Nowy</span>
          )}
          {a.tags[0] && a.tags[0] !== 'ogólne' && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-[#9aa59f] ml-1">
              <TopicIcon topic={a.tags[0]} className="w-3.5 h-3.5" />
              {a.tags[0]}
            </span>
          )}
        </div>
        <h3 className="font-semibold mt-1.5 leading-snug line-clamp-3 text-gray-900 dark:text-[#e8ece9]">
          <Highlight text={a.title} query={search} />
        </h3>
        <p className="text-sm text-gray-500 dark:text-[#9aa59f] mt-1.5 flex items-center gap-x-2 gap-y-0.5 flex-wrap">
          <span className="font-medium text-gray-700 dark:text-[#c9d1cc]">{a.journalNumber}</span>
          <span aria-hidden className="text-gray-300 dark:text-[#3a4640]">•</span>
          <span>{fmt(a.publicationDate)}, {publishedLabel(a.publicationDate)}</span>
          {a.effectiveDate && groupBy === 'published' && (
            <>
              <span aria-hidden className="text-gray-300 dark:text-[#3a4640]">•</span>
              <span>{effectiveLabel(a.effectiveDate)}</span>
            </>
          )}
        </p>
      </div>
      <ChevronRightIcon className="w-5 h-5 text-gray-300 dark:text-[#3a4640] flex-shrink-0 mt-2" />
    </button>
  );
}

export function ListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Ładowanie aktów prawnych">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="px-4 py-4 border-b border-gray-200 dark:border-[#26302b] animate-pulse">
          <div className="h-4 w-24 rounded-full bg-gray-200 dark:bg-[#1f2925]" />
          <div className="h-4 mt-3 w-11/12 rounded bg-gray-200 dark:bg-[#1f2925]" />
          <div className="h-4 mt-2 w-2/3 rounded bg-gray-200 dark:bg-[#1f2925]" />
          <div className="h-3 mt-3 w-40 rounded bg-gray-100 dark:bg-[#18201c]" />
        </div>
      ))}
    </div>
  );
}
