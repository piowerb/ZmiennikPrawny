import { ChevronRightIcon } from 'lucide-react';
import { Project } from '../types/Project';
import { Highlight, fmt } from '../lib/text';
import { PHASE_META, PHASE_ORDER } from '../lib/phases';
import { termOf } from '../services/projectsService';

interface Props {
  projects: Project[];
  search: string;
  onOpen: (p: Project) => void;
  empty: { title: string; text: string };
}

export function ProjectList({ projects, search, onOpen, empty }: Props) {
  if (projects.length === 0) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="font-medium text-gray-800 dark:text-[#e8ece9]">{empty.title}</p>
        <p className="text-sm mt-1 text-gray-500 dark:text-[#9aa59f]">{empty.text}</p>
      </div>
    );
  }

  const groups = PHASE_ORDER
    .map(phase => ({ phase, items: projects.filter(p => p.phase === phase) }))
    .filter(g => g.items.length > 0);

  return (
    <div>
      {groups.map(g => {
        const meta = PHASE_META[g.phase];
        return (
          <section key={g.phase} aria-label={meta.label}>
            <h2 className="sticky top-0 z-10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 bg-gray-50/95 backdrop-blur border-y border-gray-200 dark:bg-[#121916]/95 dark:text-[#9aa59f] dark:border-[#26302b]">
              {meta.label}
              <span className="ml-2 font-normal normal-case tracking-normal">· {g.items.length}</span>
              <span className="block font-normal normal-case tracking-normal text-[11px] mt-0.5">{meta.hint}</span>
            </h2>
            <ul className="divide-y divide-gray-200 dark:divide-[#26302b]">
              {g.items.map(p => (
                <li key={`${termOf(p)}/${p.number}`}>
                  <ProjectRow project={p} search={search} onOpen={onOpen} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export function ProjectBadges({ project: p }: { project: Project }) {
  const meta = PHASE_META[p.phase];
  const badge = 'text-xs px-2 py-0.5 rounded-full font-medium';
  return (
    <>
      <span className={`${badge} ${meta.cls}`}>{meta.chip}</span>
      {p.urgent && <span className={`${badge} bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200`}>Pilny</span>}
      {p.eu && <span className={`${badge} bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200`} title="Projekt wykonuje prawo Unii Europejskiej">Prawo UE</span>}
      {p.author && <span className="text-xs text-gray-500 dark:text-[#9aa59f] ml-1">{p.author}</span>}
    </>
  );
}

function ProjectRow({ project: p, search, onOpen }: { project: Project; search: string; onOpen: Props['onOpen'] }) {
  return (
    <button
      onClick={() => onOpen(p)}
      className="w-full px-4 py-4 text-left flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-[#151d19] transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <ProjectBadges project={p} />
        </div>
        <h3 className="font-semibold mt-1.5 leading-snug line-clamp-3 text-gray-900 dark:text-[#e8ece9]">
          <Highlight text={p.title} query={search} />
        </h3>
        <p className="text-sm text-gray-500 dark:text-[#9aa59f] mt-1.5">
          <span className="font-medium text-gray-700 dark:text-[#c9d1cc]">Druk nr {p.number}</span>
          {p.lastStage && (
            <>
              <span aria-hidden className="inline-block w-1 h-1 mx-2 align-middle rounded-full bg-gray-300 dark:bg-[#3a4640]" />
              {p.lastStage}{p.lastDate ? `, ${fmt(p.lastDate)}` : ''}
            </>
          )}
        </p>
      </div>
      <ChevronRightIcon className="w-5 h-5 text-gray-300 dark:text-[#3a4640] flex-shrink-0 mt-2" />
    </button>
  );
}
