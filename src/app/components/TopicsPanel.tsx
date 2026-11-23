import { useState, type FormEvent } from 'react';
import { BellIcon, PlusIcon, XIcon } from 'lucide-react';
import { TopicIcon } from '../lib/topicIcon';

interface Props {
  topics: string[];
  counts: Record<string, number>;
  onAdd: (topic: string) => void;
  onRemove: (topic: string) => void;
}

const SUGGESTIONS = ['podatku', 'pracy', 'zdrowia', 'energii', 'cyfryzacji'];

export function TopicsPanel({ topics, counts, onAdd, onRemove }: Props) {
  const [value, setValue] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = value.trim().toLowerCase();
    if (v.length >= 2 && !topics.includes(v)) onAdd(v);
    setValue('');
  };

  return (
    <div className="p-4 space-y-3 border-b border-gray-200 dark:border-[#26302b]">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl grid place-items-center bg-[#e6f4ed] text-[#005130] dark:bg-[#143323] dark:text-[#6fd3a2] flex-shrink-0">
          <BellIcon className="w-5 h-5" />
        </div>
        <p className="text-sm text-gray-600 dark:text-[#9aa59f]">
          Dodaj tematy, a zobaczysz pasujące akty i kropkę przy nowych od ostatniej wizyty. Lista zapisuje się tylko w tej przeglądarce.
        </p>
      </div>

      <form onSubmit={submit} className="flex gap-2">
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="np. podatku, pracy, energii…"
          aria-label="Nowy temat do obserwowania"
          className="flex-1 min-w-0 px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#005130] dark:bg-[#121916] dark:border-[#26302b] dark:text-[#e8ece9] dark:focus:ring-[#6fd3a2]"
        />
        <button type="submit" className="flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl font-medium text-white bg-[#005130] hover:bg-[#003d24] dark:bg-[#1f7a52] dark:hover:bg-[#25905f]">
          <PlusIcon className="w-4 h-4" /> Dodaj
        </button>
      </form>

      {topics.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {topics.map(t => (
            <span key={t} className="inline-flex items-center gap-1.5 pl-3 pr-1 min-h-[36px] rounded-full text-sm bg-[#e6f4ed] text-[#005130] dark:bg-[#143323] dark:text-[#6fd3a2]">
              <TopicIcon topic={t} />
              {t}
              <span className="text-xs opacity-70">({counts[t] ?? 0})</span>
              <button onClick={() => onRemove(t)} aria-label={`Usuń temat ${t}`} className="w-8 h-8 grid place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10">
                <XIcon className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-[#9aa59f]">
          Podpowiedzi:
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => onAdd(s)} className="min-h-[36px] px-3 rounded-full border border-dashed border-gray-300 hover:border-[#005130] hover:text-[#005130] dark:border-[#3a4640] dark:hover:border-[#6fd3a2] dark:hover:text-[#6fd3a2]">
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
