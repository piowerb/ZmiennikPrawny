import { useState } from 'react';
import { CheckIcon, CopyIcon, ExternalLinkIcon, FileTextIcon, LinkIcon } from 'lucide-react';
import { LegalAct } from '../types/LegalAct';
import { TopicIcon } from '../lib/topicIcon';
import { AiSummary } from './AiSummary';
import { CATEGORY_META, Highlight, effectiveShort, fmt, publishedLabel } from '../lib/text';

interface Props {
  act: LegalAct;
  search: string;
  onTag: (tag: string) => void;
  onBody: (body: string) => void;
}

const isapPage = (a: LegalAct) =>
  `https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU${a.year}${String(a.position).padStart(7, '0')}`;

export function ActDetail({ act: a, search, onTag, onBody }: Props) {
  const [copied, setCopied] = useState<'sig' | 'link' | null>(null);
  const cat = CATEGORY_META[a.category];

  const copy = async (text: string, what: 'sig' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      /* schowek niedostępny – nic nie robimy */
    }
  };

  const secondaryBtn =
    'flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-800 hover:border-[#005130] hover:text-[#005130] dark:border-[#26302b] dark:text-[#e8ece9] dark:hover:border-[#6fd3a2] dark:hover:text-[#6fd3a2] transition-colors';

  return (
    <article className="p-5 space-y-5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cat.cls}`}>{cat.label}</span>
        {a.isNew && (
          <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-[#e6f4ed] text-[#005130] dark:bg-[#143323] dark:text-[#6fd3a2]">Nowy</span>
        )}
      </div>

      <h1 className="text-2xl font-bold leading-snug text-gray-900 dark:text-[#e8ece9]">
        <Highlight text={a.title} query={search} />
      </h1>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Info label="Sygnatura" value={a.journalNumber} />
        <Info label="Publikacja" value={`${fmt(a.publicationDate)} (${publishedLabel(a.publicationDate)})`} />
        <Info
          label="Wejście w życie"
          value={a.effectiveDate ? `${fmt(a.effectiveDate)} (${effectiveShort(a.effectiveDate)})` : 'brak danych w ISAP'}
        />
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#151d19]">
          <dt className="text-xs text-gray-500 dark:text-[#9aa59f] mb-1">Organ wydający</dt>
          <dd>
            <button onClick={() => onBody(a.issuingBody)} className="font-semibold text-left text-[#005130] dark:text-[#6fd3a2] hover:underline underline-offset-2" title="Pokaż wszystkie akty tego organu">
              {a.issuingBody}
            </button>
          </dd>
        </div>
      </dl>

      <div>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-[#9aa59f] mb-1">Rodzaj i status</h2>
        <p className="text-gray-800 dark:text-[#c9d1cc]">{a.summary}</p>
      </div>

      {a.tags.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-[#9aa59f] mb-2">Tematy</h2>
          <div className="flex flex-wrap gap-2">
            {a.tags.map(t => (
              <button key={t} onClick={() => onTag(t)} className="inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-full text-sm bg-[#e6f4ed] text-[#005130] hover:bg-[#d3ecdf] dark:bg-[#143323] dark:text-[#6fd3a2] dark:hover:bg-[#1a4430]" title="Pokaż akty z tym tematem">
                <TopicIcon topic={t} />
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      <AiSummary key={a.id} act={a} />

      <div className="space-y-2 pt-1">
        {a.pdfUrl && (
          <a href={a.pdfUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full min-h-[48px] rounded-xl font-medium text-white bg-[#005130] hover:bg-[#003d24] dark:bg-[#1f7a52] dark:hover:bg-[#25905f] shadow-sm transition-colors">
            <FileTextIcon className="w-5 h-5" /> Pobierz PDF
          </a>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <a href={isapPage(a)} target="_blank" rel="noopener noreferrer" className={secondaryBtn}>
            <ExternalLinkIcon className="w-4 h-4" /> Strona w ISAP
          </a>
          <button onClick={() => copy(a.journalNumber, 'sig')} className={secondaryBtn}>
            {copied === 'sig' ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
            {copied === 'sig' ? 'Skopiowano' : 'Kopiuj sygnaturę'}
          </button>
          <button onClick={() => copy(window.location.href, 'link')} className={secondaryBtn}>
            {copied === 'link' ? <CheckIcon className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
            {copied === 'link' ? 'Skopiowano' : 'Kopiuj link'}
          </button>
        </div>
      </div>
    </article>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#151d19]">
      <dt className="text-xs text-gray-500 dark:text-[#9aa59f] mb-1">{label}</dt>
      <dd className="font-semibold text-gray-900 dark:text-[#e8ece9]">{value}</dd>
    </div>
  );
}
