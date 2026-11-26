import { useState } from 'react';
import { CheckIcon, ExternalLinkIcon, LandmarkIcon, LinkIcon } from 'lucide-react';
import { Project } from '../types/Project';
import { Highlight, fmt } from '../lib/text';
import { PHASE_META, capitalizeFirst } from '../lib/phases';
import { romanTerm, sejmProcessUrl, termOf } from '../services/projectsService';
import { ProjectBadges } from './ProjectList';

export function ProjectDetail({ project: p, search }: { project: Project; search: string }) {
  const [copied, setCopied] = useState(false);
  const meta = PHASE_META[p.phase];
  const term = termOf(p);
  const processUrl = sejmProcessUrl(p.number, term);
  const stages = [...p.stages].reverse(); // najnowszy etap na górze

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* schowek niedostępny */
    }
  };

  const askPrompt =
    `Wyjaśnij prostym językiem projekt ustawy (druk sejmowy nr ${p.number}) „${p.title}”. ` +
    `Przebieg prac: ${processUrl}. Na jakim jest etapie, co ma zmienić i kogo dotyczy? ` +
    `Zaznacz, że to projekt i jego treść może się jeszcze zmienić.`;
  const q = encodeURIComponent(askPrompt);

  const secondaryBtn =
    'flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-800 hover:border-[#005130] hover:text-[#005130] dark:border-[#26302b] dark:text-[#e8ece9] dark:hover:border-[#6fd3a2] dark:hover:text-[#6fd3a2] transition-colors';

  return (
    <article className="p-5 space-y-5">
      <div className="flex flex-wrap items-center gap-1.5">
        <ProjectBadges project={p} />
      </div>

      <h1 className="text-2xl font-bold leading-snug text-gray-900 dark:text-[#e8ece9]">
        <Highlight text={p.title} query={search} />
      </h1>

      <dl className="grid grid-cols-2 gap-3">
        <Info label="Etap" value={meta.label} note={meta.hint} className="col-span-2 sm:col-span-1" />
        <Info label="Ostatnia zmiana" value={p.lastStage ?? '—'} note={p.lastDate ? fmt(p.lastDate) : undefined} className="col-span-2 sm:col-span-1" />
        <Info label="Druk sejmowy" value={`nr ${p.number}`} note={`${romanTerm(term)} kadencja Sejmu`} />
        <Info label="Wpłynął do Sejmu" value={p.started ? fmt(p.started) : '—'} note={p.author ? `Projekt ${p.author.toLowerCase()}` : undefined} />
      </dl>

      {p.description && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-[#9aa59f] mb-1">O czym jest projekt</h2>
          <p className="text-gray-800 dark:text-[#c9d1cc] leading-relaxed">{capitalizeFirst(p.description)}</p>
          <p className="text-xs mt-1.5 text-gray-500 dark:text-[#7f8a84]">Opis: Kancelaria Sejmu. Treść projektu może się jeszcze zmienić w trakcie prac.</p>
        </div>
      )}

      {stages.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-[#9aa59f] mb-2">Przebieg prac</h2>
          <ol className="relative border-l-2 border-gray-200 dark:border-[#26302b] ml-1.5 space-y-3">
            {stages.map((s, i) => (
              <li key={i} className="pl-4 relative">
                <span
                  aria-hidden
                  className={`absolute -left-[7px] top-1.5 w-3 h-3 rounded-full border-2 ${i === 0
                    ? 'bg-[#005130] border-[#005130] dark:bg-[#6fd3a2] dark:border-[#6fd3a2]'
                    : 'bg-white border-gray-300 dark:bg-[#0e1311] dark:border-[#3a4640]'}`}
                />
                <p className={`text-sm ${i === 0 ? 'font-semibold text-gray-900 dark:text-[#e8ece9]' : 'text-gray-800 dark:text-[#c9d1cc]'}`}>{s.name}</p>
                <p className="text-xs text-gray-500 dark:text-[#9aa59f]">
                  {s.date ? fmt(s.date) : 'bez daty'}
                  {s.decision ? ` · ${s.decision}` : ''}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="space-y-2 pt-1">
        <a href={processUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full min-h-[48px] rounded-xl font-medium text-white bg-[#005130] hover:bg-[#003d24] dark:bg-[#1f7a52] dark:hover:bg-[#25905f] shadow-sm transition-colors">
          <LandmarkIcon className="w-5 h-5" /> Przebieg prac na sejm.gov.pl
        </a>
        <div className={`grid grid-cols-1 gap-2 ${p.rcl ? 'sm:grid-cols-2' : ''}`}>
          {p.rcl && (
            <a href={p.rcl} target="_blank" rel="noopener noreferrer" className={secondaryBtn}>
              <ExternalLinkIcon className="w-4 h-4" /> Projekt w RCL (prace rządu)
            </a>
          )}
          <button onClick={copyLink} className={secondaryBtn}>
            {copied ? <CheckIcon className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
            {copied ? 'Skopiowano' : 'Kopiuj link'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-[#cfe6da] bg-[#f4faf6] p-4 space-y-2 dark:border-[#1f3a2c] dark:bg-[#111a15]">
        <p className="text-sm font-medium text-gray-700 dark:text-[#c9d1cc]">Masz pytanie do tego projektu?</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <a href={`https://chatgpt.com/?q=${q}`} target="_blank" rel="noopener noreferrer" className={`${secondaryBtn} bg-white dark:bg-transparent`}>
            Zapytaj ChatGPT <ExternalLinkIcon className="w-4 h-4" aria-hidden />
          </a>
          <a href={`https://www.google.com/search?udm=50&q=${q}`} target="_blank" rel="noopener noreferrer" className={`${secondaryBtn} bg-white dark:bg-transparent`}>
            Zapytaj Google AI <ExternalLinkIcon className="w-4 h-4" aria-hidden />
          </a>
        </div>
        <p className="text-xs text-gray-500 dark:text-[#7f8a84]">Otworzy się nowa karta z gotowym pytaniem. Google AI (tryb AI w wyszukiwarce, oparty na Gemini) odpowiada od razu, także bez logowania.</p>
      </div>
    </article>
  );
}

function Info({ label, value, note, className = '' }: { label: string; value: string; note?: string; className?: string }) {
  return (
    <div className={`p-4 rounded-xl bg-gray-50 dark:bg-[#151d19] ${className}`}>
      <dt className="text-xs text-gray-500 dark:text-[#9aa59f] mb-1">{label}</dt>
      <dd className="font-semibold text-gray-900 dark:text-[#e8ece9]">{value}</dd>
      {note && <dd className="text-xs mt-0.5 text-gray-500 dark:text-[#9aa59f]">{note}</dd>}
    </div>
  );
}
