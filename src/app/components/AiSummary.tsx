import { useState } from 'react';
import { ExternalLinkIcon, SparklesIcon } from 'lucide-react';
import { LegalAct } from '../types/LegalAct';

/** Adres Cloudflare Workera z podsumowaniami AI (worker/zp-ai-worker.js). */
const AI_URL = 'https://ai.zmiennikprawny.pl';

interface Summary {
  czego: string;
  kogo: string;
  zmiany: string[];
  model: string;
  truncated?: boolean;
}

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'done'; data: Summary }
  | { kind: 'error'; message: string };

const ERRORS: Record<string, string> = {
  limit: 'Darmowy dzienny limit podsumowań AI się wyczerpał. Spróbuj jutro albo zapytaj ChatGPT lub Google AI poniżej.',
  ai_unavailable: 'Podsumowania AI są chwilowo niedostępne. Spróbuj później albo zapytaj ChatGPT lub Google AI poniżej.',
  too_old: 'Podsumowania AI są dostępne dla aktów z ostatnich 90 dni.',
  no_text: 'Tekst tego aktu nie jest jeszcze dostępny w ISAP. Spróbuj za kilka godzin.',
  bad_output: 'Nie udało się przygotować podsumowania tego aktu. Spróbuj ponownie później.',
};

export function AiSummary({ act }: { act: LegalAct }) {
  const [state, setState] = useState<State>({ kind: 'idle' });
  const eli = `DU/${act.year}/${act.position}`;

  const load = async () => {
    setState({ kind: 'loading' });
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 120000);
      const res = await fetch(`${AI_URL}/summary?eli=${encodeURIComponent(eli)}`, { signal: ctrl.signal });
      clearTimeout(timer);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.czego) {
        setState({ kind: 'error', message: ERRORS[data.error] ?? ERRORS.ai_unavailable });
        return;
      }
      setState({ kind: 'done', data });
    } catch {
      setState({ kind: 'error', message: ERRORS.ai_unavailable });
    }
  };

  const askPrompt =
    `Przeczytaj akt prawny ${act.journalNumber} „${act.title}”` +
    (act.pdfUrl ? ` (tekst w PDF: ${act.pdfUrl})` : '') +
    `. Streść go w 3 zdaniach prostym językiem. Potem odpowiadaj na moje pytania wyłącznie na podstawie treści tego aktu i przy każdej odpowiedzi podawaj przepis (artykuł, ustęp).`;
  const q = encodeURIComponent(askPrompt);

  const askBtn =
    'flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-800 hover:border-[#005130] hover:text-[#005130] dark:bg-transparent dark:border-[#26302b] dark:text-[#e8ece9] dark:hover:border-[#6fd3a2] dark:hover:text-[#6fd3a2] transition-colors';

  return (
    <section className="rounded-2xl border border-[#cfe6da] bg-[#f4faf6] p-4 sm:p-5 space-y-4 dark:border-[#1f3a2c] dark:bg-[#111a15]" aria-labelledby="ai-title">
      <div className="flex items-center gap-2">
        <SparklesIcon className="w-5 h-5 text-[#005130] dark:text-[#6fd3a2]" aria-hidden />
        <h2 id="ai-title" className="font-semibold text-gray-900 dark:text-[#e8ece9]">Wyjaśnienie AI</h2>
        <span className="ml-auto text-[11px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full bg-white text-[#005130] border border-[#cfe6da] dark:bg-transparent dark:text-[#6fd3a2] dark:border-[#1f3a2c]">beta</span>
      </div>

      {state.kind === 'idle' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-[#9aa59f]">Krótkie streszczenie prostym językiem: czego dotyczy akt, kogo dotyczy i co zmienia.</p>
          <button onClick={load} className="flex items-center justify-center gap-2 w-full min-h-[48px] rounded-xl font-medium text-white bg-[#005130] hover:bg-[#003d24] dark:bg-[#1f7a52] dark:hover:bg-[#25905f] transition-colors">
            <SparklesIcon className="w-5 h-5" aria-hidden /> Wyjaśnij prostym językiem
          </button>
        </div>
      )}

      {state.kind === 'loading' && (
        <div className="space-y-2" role="status" aria-live="polite">
          <div className="h-3 rounded bg-[#dcefe4] dark:bg-[#1a2a21] animate-pulse w-11/12" />
          <div className="h-3 rounded bg-[#dcefe4] dark:bg-[#1a2a21] animate-pulse w-9/12" />
          <div className="h-3 rounded bg-[#dcefe4] dark:bg-[#1a2a21] animate-pulse w-10/12" />
          <p className="text-sm text-gray-600 dark:text-[#9aa59f] pt-1">AI czyta tekst aktu… przy pierwszym otwarciu może to potrwać do minuty.</p>
        </div>
      )}

      {state.kind === 'error' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-700 dark:text-[#c9d1cc]">{state.message}</p>
          {!/90 dni/.test(state.message) && (
            <button onClick={load} className="text-sm font-medium text-[#005130] dark:text-[#6fd3a2] hover:underline underline-offset-2">Spróbuj ponownie</button>
          )}
        </div>
      )}

      {state.kind === 'done' && (
        <div className="space-y-4 text-gray-800 dark:text-[#c9d1cc]">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-[#9aa59f] mb-1">Czego dotyczy</h3>
            <p>{state.data.czego}</p>
          </div>
          {state.data.kogo && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-[#9aa59f] mb-1">Kogo dotyczy</h3>
              <p>{state.data.kogo}</p>
            </div>
          )}
          {state.data.zmiany.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-[#9aa59f] mb-1">Najważniejsze zmiany</h3>
              <ul className="list-disc pl-5 space-y-1.5 marker:text-[#005130] dark:marker:text-[#6fd3a2]">
                {state.data.zmiany.map((z, i) => <li key={i}>{z}</li>)}
              </ul>
            </div>
          )}
          <p className="text-xs leading-relaxed text-gray-500 dark:text-[#7f8a84]">
            Wygenerowane automatycznie przez AI ({state.data.model}) na podstawie tekstu aktu{state.data.truncated ? ' (akt jest długi – AI przeczytała jego początek)' : ''}. Może zawierać błędy i nie jest poradą prawną. Daty powyżej pochodzą bezpośrednio z ISAP, a wiążący jest wyłącznie tekst w Dzienniku Ustaw.
          </p>
        </div>
      )}

      <div className="pt-3 border-t border-[#cfe6da] dark:border-[#1f3a2c] space-y-2">
        <p className="text-sm font-medium text-gray-700 dark:text-[#c9d1cc]">Masz pytanie do tego aktu?</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <a href={`https://chatgpt.com/?q=${q}`} target="_blank" rel="noopener noreferrer" className={askBtn}>
            Zapytaj ChatGPT <ExternalLinkIcon className="w-4 h-4" aria-hidden />
          </a>
          <a href={`https://www.google.com/search?udm=50&q=${q}`} target="_blank" rel="noopener noreferrer" className={askBtn}>
            Zapytaj Google AI <ExternalLinkIcon className="w-4 h-4" aria-hidden />
          </a>
        </div>
        <p className="text-xs text-gray-500 dark:text-[#7f8a84]">Otworzy się nowa karta z gotowym pytaniem. Google AI (tryb AI w wyszukiwarce, oparty na Gemini) odpowiada od razu, także bez logowania.</p>
      </div>
    </section>
  );
}
