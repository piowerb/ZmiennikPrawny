import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeftIcon, GithubIcon, MoonIcon, RefreshCwIcon, SearchIcon, SunIcon, XIcon } from 'lucide-react';
import { fetchActByEli, fetchRecentLegalActs } from './services/isapService';
import { LegalAct, LegalActCategory } from './types/LegalAct';
import { ActList, ListSkeleton } from './components/ActList';
import { ActDetail } from './components/ActDetail';
import { TopicsPanel } from './components/TopicsPanel';
import { daysFromToday, matches } from './lib/text';
import { load, save } from './lib/storage';
import { TopicIcon } from './lib/topicIcon';

// @ts-ignore
import logo from '../imports/logo_zmiennikprawny_96.png';

type Tab = 'latest' | 'soon' | 'watch';
type Refine = { kind: 'tag' | 'body'; value: string } | null;

const FILTERS: { id: 'all' | LegalActCategory; label: string }[] = [
  { id: 'all', label: 'Wszystkie' },
  { id: 'ustawa', label: 'Ustawy' },
  { id: 'rozporzadzenie', label: 'Rozporządzenia' },
  { id: 'ogloszenie', label: 'Obwieszczenia' },
];
const SOON_DAYS = 14;
const ELI_HASH = /^#\/(DU\/\d{4}\/\d+)$/;

export default function App() {
  const [acts, setActs] = useState<LegalAct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | LegalActCategory>('all');
  const [tab, setTab] = useState<Tab>('latest');
  const [refine, setRefine] = useState<Refine>(null);
  const [selected, setSelected] = useState<LegalAct | null>(null);
  const [topics, setTopics] = useState<string[]>(() => load('zp:topics', [] as string[]));
  const [dark, setDark] = useState<boolean>(() =>
    load('zp:theme', typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') === 'dark',
  );
  const lastVisit = useRef<number>(load('zp:lastVisit', 0));
  const mainRef = useRef<HTMLElement>(null);
  const listScroll = useRef(0);
  const openedFromList = useRef(false);

  // Motyw jasny/ciemny
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0e1311' : '#005130');
  }, [dark]);

  const loadData = async () => {
    setLoading(true);
    setError(false);
    try {
      setActs(await fetchRecentLegalActs());
      save('zp:lastVisit', Date.now());
    } catch (e) {
      console.error(e);
      setError(true);
    }
    setLoading(false);
  };
  useEffect(() => { loadData(); }, []);

  // Linki do aktów (#/DU/2026/1539) i przycisk „wstecz” w przeglądarce
  useEffect(() => {
    const sync = async () => {
      const m = window.location.hash.match(ELI_HASH);
      if (!m) {
        setSelected(null);
        requestAnimationFrame(() => mainRef.current?.scrollTo(0, listScroll.current));
        return;
      }
      const found = acts.find(a => a.id === m[1]);
      if (found) setSelected(found);
      else if (!loading) {
        try { setSelected(await fetchActByEli(m[1])); } catch { setSelected(null); }
      }
      mainRef.current?.scrollTo(0, 0);
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, [acts, loading]);

  const openAct = (a: LegalAct) => {
    listScroll.current = mainRef.current?.scrollTop ?? 0;
    openedFromList.current = true;
    window.location.hash = `/${a.id}`;
  };
  const closeAct = () => {
    if (openedFromList.current) { openedFromList.current = false; window.history.back(); }
    else window.location.hash = '';
  };
  const applyRefine = (kind: 'tag' | 'body', value: string) => {
    setRefine({ kind, value });
    setTab('latest');
    setFilter('all');
    closeAct();
  };

  const updateTopics = (next: string[]) => { setTopics(next); save('zp:topics', next); };
  const toggleDark = () => { setDark(d => { save('zp:theme', d ? 'light' : 'dark'); return !d; }); };

  // Wspólne filtry: kategoria, wyszukiwarka, kliknięty tag/organ
  const base = useMemo(() => acts
    .filter(a => filter === 'all' || a.category === filter)
    .filter(a => matches(a, search))
    .filter(a => !refine || (refine.kind === 'tag' ? a.tags.includes(refine.value) : a.issuingBody === refine.value)),
  [acts, filter, search, refine]);

  const soon = useMemo(() => base
    .filter(a => a.effectiveDate && daysFromToday(a.effectiveDate) >= 0 && daysFromToday(a.effectiveDate) <= SOON_DAYS)
    .sort((a, b) => a.effectiveDate!.localeCompare(b.effectiveDate!)),
  [base]);

  const topicCounts = useMemo(() => Object.fromEntries(topics.map(t => [t, acts.filter(a => matches(a, t)).length])), [acts, topics]);
  const watched = useMemo(() => base.filter(a => topics.some(t => matches(a, t))), [base, topics]);
  const watchedNew = useMemo(() => acts.filter(a => topics.some(t => matches(a, t)) &&
    (lastVisit.current ? new Date(a.publicationDate).getTime() > lastVisit.current - 86400000 : a.isNew)).length, [acts, topics]);

  const tabs: { id: Tab; label: string; count?: number; dot?: boolean }[] = [
    { id: 'latest', label: 'Najnowsze', count: base.length },
    { id: 'soon', label: 'Wkrótce', count: soon.length },
    { id: 'watch', label: 'Obserwowane', count: topics.length ? watched.length : undefined, dot: watchedNew > 0 },
  ];

  const pill = (active: boolean) => `px-4 min-h-[40px] rounded-full text-sm whitespace-nowrap transition-colors ${
    active ? 'bg-[#005130] text-white dark:bg-[#1f7a52]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-[#1a221e] dark:text-[#c9d1cc] dark:hover:bg-[#222c27]'}`;

  return (
    <div className="h-screen flex flex-col bg-white text-gray-900 dark:bg-[#0e1311] dark:text-[#e8ece9]">
      <header className="border-b border-gray-200 dark:border-[#26302b] safe-area-top">
        <div className="max-w-3xl mx-auto w-full flex items-center justify-between gap-2 px-4 pb-3">
          <div className="flex items-center gap-3 min-w-0">
            {selected && (
              <button onClick={closeAct} className="flex items-center gap-1.5 min-h-[44px] pr-3 mr-1 border-r border-gray-200 dark:border-[#26302b] text-[#005130] dark:text-[#6fd3a2] font-medium">
                <ArrowLeftIcon className="w-5 h-5" /> Wstecz
              </button>
            )}
            <button onClick={() => { setRefine(null); setSearch(''); window.location.hash = ''; }} className="flex items-center gap-3 min-w-0" aria-label="ZmiennikPrawny – lista aktów">
              <img src={logo} alt="" className="w-10 h-10 rounded-xl shadow-sm flex-shrink-0" />
              <span className={`font-bold text-xl tracking-tight truncate ${selected ? 'hidden sm:inline' : ''}`}>ZmiennikPrawny</span>
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={toggleDark} aria-label={dark ? 'Włącz jasny motyw' : 'Włącz ciemny motyw'} className="w-11 h-11 grid place-items-center rounded-full text-gray-600 hover:bg-gray-100 dark:text-[#9aa59f] dark:hover:bg-[#1a221e]">
              {dark ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            </button>
            {!selected && (
              <button onClick={loadData} disabled={loading} aria-label="Odśwież" className="w-11 h-11 grid place-items-center rounded-full text-gray-600 hover:bg-gray-100 dark:text-[#9aa59f] dark:hover:bg-[#1a221e]">
                <RefreshCwIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </div>
      </header>

      <main ref={mainRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full">
          {selected ? (
            <ActDetail act={selected} search={search} onTag={t => applyRefine('tag', t)} onBody={b => applyRefine('body', b)} />
          ) : (
            <>
              <div className="p-4 space-y-3">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="search"
                    placeholder="Szukaj aktów, organów, tematów…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#005130] dark:bg-[#121916] dark:border-[#26302b] dark:focus:ring-[#6fd3a2]"
                  />
                </div>
                <div role="tablist" className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-gray-100 dark:bg-[#151d19]">
                  {tabs.map(t => (
                    <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
                      className={`relative min-h-[40px] px-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-white shadow-sm text-[#005130] dark:bg-[#0e1311] dark:text-[#6fd3a2]' : 'text-gray-600 dark:text-[#9aa59f]'}`}>
                      {t.label}{t.count !== undefined && <span className="ml-1 opacity-60">{t.count}</span>}
                      {t.dot && <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-red-500" aria-label="nowe akty" />}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
                  {FILTERS.map(f => (
                    <button key={f.id} onClick={() => setFilter(f.id)} className={pill(filter === f.id)}>{f.label}</button>
                  ))}
                </div>
                {refine && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500 dark:text-[#9aa59f]">{refine.kind === 'tag' ? 'Temat:' : 'Organ:'}</span>
                    <span className="inline-flex items-center gap-1.5 pl-3 pr-1 min-h-[36px] rounded-full bg-[#e6f4ed] text-[#005130] dark:bg-[#143323] dark:text-[#6fd3a2]">
                      {refine.kind === 'tag' && <TopicIcon topic={refine.value} />}
                      {refine.value}
                      <button onClick={() => setRefine(null)} aria-label="Usuń filtr" className="w-8 h-8 grid place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"><XIcon className="w-3.5 h-3.5" /></button>
                    </span>
                  </div>
                )}
              </div>

              {tab === 'watch' && (
                <TopicsPanel topics={topics} counts={topicCounts}
                  onAdd={t => updateTopics([...topics, t])} onRemove={t => updateTopics(topics.filter(x => x !== t))} />
              )}

              {loading ? <ListSkeleton /> : error ? (
                <div className="p-8 text-center">
                  <p className="font-medium text-red-600 dark:text-red-400">Błąd pobierania danych</p>
                  <p className="text-sm mt-1 text-gray-500 dark:text-[#9aa59f]">Sprawdź połączenie z internetem i spróbuj ponownie.</p>
                  <button onClick={loadData} className="mt-4 px-4 min-h-[44px] rounded-xl text-sm text-white bg-[#005130] dark:bg-[#1f7a52]">Spróbuj ponownie</button>
                </div>
              ) : tab === 'latest' ? (
                <ActList acts={base} search={search} groupBy="published" onOpen={openAct}
                  empty={{ title: 'Brak wyników', text: 'Spróbuj zmienić filtry lub wyszukiwaną frazę.' }} />
              ) : tab === 'soon' ? (
                <ActList acts={soon} search={search} groupBy="effective" onOpen={openAct}
                  empty={{ title: 'Nic nie wchodzi w życie w ciągu 14 dni', text: 'Wśród aktów opublikowanych w ostatnich 30 dniach.' }} />
              ) : (
                <ActList acts={topics.length ? watched : []} search={search} groupBy="published" onOpen={openAct}
                  empty={topics.length
                    ? { title: 'Brak pasujących aktów', text: 'W ostatnich 30 dniach nie pojawiło się nic na obserwowane tematy.' }
                    : { title: 'Nie obserwujesz jeszcze żadnych tematów', text: 'Dodaj pierwszy temat powyżej.' }} />
              )}
            </>
          )}

          <footer className="px-4 pt-8 pb-[calc(2.5rem+env(safe-area-inset-bottom))] text-xs text-center text-gray-500 dark:text-[#7f8a84] space-y-2">
            <p>Dane: oficjalne API Sejmu RP (ELI). ZmiennikPrawny nie jest serwisem Sejmu RP, a informacje mają charakter pomocniczy i nie stanowią porady prawnej. Wiążący jest wyłącznie tekst opublikowany w Dzienniku Ustaw.</p>
            <p>Bez kont i ciasteczek. Motyw i obserwowane tematy zapisują się tylko w Twojej przeglądarce.</p>
            <a href="https://github.com/piowerb" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-full border border-gray-200 dark:border-[#26302b] hover:text-gray-900 dark:hover:text-[#e8ece9]">
              <GithubIcon className="w-3.5 h-3.5" /> Autor: Piotr Werbowy
            </a>
          </footer>
        </div>
      </main>
    </div>
  );
}
