import { useState, useEffect } from 'react';
import { SearchIcon, RefreshCwIcon, ChevronRightIcon, GithubIcon } from 'lucide-react';
import { fetchRecentLegalActs } from './services/isapService';
import { LegalAct } from './types/LegalAct';

// @ts-ignore
import logo from '../imports/squircle_zmiennikprawny.png';

export default function App() {
  const [acts, setActs] = useState<LegalAct[]>([]);
  const [selected, setSelected] = useState<LegalAct | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchRecentLegalActs();
      setActs(data);
    } catch (e) {
      console.error(e);
      setError(true);
    }
    setLoading(false);
  };

  const filtered = acts
    .filter(a => filter === 'all' || a.category === filter)
    .filter(a => !search || a.title.toLowerCase().includes(search.toLowerCase()));

  const fmt = (date: string) => new Date(date).toLocaleDateString('pl');

  const getDaysAgo = (date: string) => {
    const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
    
    if (days === 0) return 'dzisiaj';
    if (days === 1) return 'wczoraj';
    if (days < 0) {
      const futureDays = Math.abs(days); 
      return futureDays === 1 ? 'jutro' : `za ${futureDays} dni`;
    }
    
    return `${days} dni temu`;
  };

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <span key={i} className="bg-[#e6f4ed] text-[#005130] rounded-sm px-0.5">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-white relative">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b safe-area-top">
        <div className="flex items-center gap-4">
          {selected && (
            <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-[#005130] min-h-[44px] border-r pr-4 border-gray-200">
              <span className="text-xl">←</span> Wstecz
            </button>
          )}
          
          {/* ZMIANA TUTAJ: Większe logo (w-10 h-10) i większy tekst (text-xl) */}
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="w-10 h-10 rounded-xl shadow-sm" />
            <span className="font-bold text-xl text-gray-900 tracking-tight">ZmiennikPrawny</span>
          </div>

        </div>

        {!selected && (
          <button onClick={loadData} disabled={loading} className="p-2 min-w-[44px] min-h-[44px] text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <RefreshCwIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {!selected ? (
          <>
            {/* Search & Filters */}
            <div className="p-4 border-b space-y-3">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="search"
                  placeholder="Szukaj..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005130]"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
                {['all', 'ustawa', 'rozporzadzenie', 'ogloszenie'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${
                      filter === f ? 'bg-[#005130] text-white' : 'bg-gray-100'
                    }`}
                  >
                    {f === 'all' ? 'Wszystkie' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* List with Error & Empty States */}
            {loading ? (
              <div className="p-8 text-center text-gray-500">Ładowanie danych...</div>
            ) : error ? (
              <div className="p-8 text-center text-red-600">
                <p className="font-medium">Błąd pobierania danych</p>
                <p className="text-sm mt-1">Sprawdź połączenie z internetem i spróbuj ponownie.</p>
                <button onClick={loadData} className="mt-4 px-4 py-2 bg-[#005130] text-white rounded-lg text-sm">
                  Spróbuj ponownie
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p className="font-medium text-gray-700">Brak wyników</p>
                <p className="text-sm mt-1">Spróbuj zmienić filtry lub wyszukiwaną frazę.</p>
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map(a => (
                  <button
                    key={a.id}
                    onClick={() => setSelected(a)}
                    className="w-full p-4 text-left hover:bg-gray-50 flex items-start gap-3"
                  >
                    <div className="flex-1">
                      {a.isNew && <span className="text-xs bg-[#e6f4ed] text-[#005130] px-2 py-0.5 rounded-full font-medium">Nowy</span>}
                      
                      <h3 className="font-semibold mt-1 line-clamp-2">
                        {highlightText(a.title, search)}
                      </h3>
                      
                      <p className="text-sm text-gray-600 mt-2 flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-700">{a.journalNumber}</span>
                        <span className="text-gray-300">•</span>
                        <span>{fmt(a.publicationDate)}</span>
                        <span className="text-gray-300">•</span>
                        <span>{getDaysAgo(a.publicationDate)}</span>
                      </p>
                    </div>
                    <ChevronRightIcon className="w-5 h-5 text-gray-300 flex-shrink-0 mt-2" />
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          /* Detail */
          <div className="p-5 space-y-4 max-w-4xl mx-auto">
            {selected.isNew && <span className="text-xs bg-[#e6f4ed] text-[#005130] px-3 py-1 rounded-full font-medium">Nowy</span>}
            
            <h1 className="text-2xl font-bold">{highlightText(selected.title, search)}</h1>
            
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">Sygnatura</p>
              <p className="font-semibold">{selected.journalNumber}</p>
            </div>
            <div className="space-y-2 text-sm">
              <div><span className="text-gray-500">Publikacja:</span> <strong>{fmt(selected.publicationDate)}</strong></div>
              {selected.effectiveDate && <div><span className="text-gray-500">Wejście w życie:</span> <strong>{fmt(selected.effectiveDate)}</strong></div>}
              <div><span className="text-gray-500">Organ:</span> <strong>{selected.issuingBody}</strong></div>
            </div>
            <div>
              <h2 className="font-bold mb-2">Opis</h2>
              <p className="text-gray-700">{selected.summary}</p>
            </div>
            {selected.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selected.tags.map((t, i) => (
                  <span key={i} className="px-3 py-1 bg-[#e6f4ed] text-[#005130] text-sm rounded-full">{t}</span>
                ))}
              </div>
            )}
            {selected.pdfUrl && (
              <button
                onClick={() => window.open(selected.pdfUrl, '_blank')}
                className="w-full py-3 bg-[#005130] text-white rounded-xl font-medium shadow-sm hover:bg-[#003d24] transition-colors"
              >
                Pobierz PDF
              </button>
            )}
          </div>
        )}
      </main>

      {/* Znak wodny / Podpis autora */}
      <a
        href="https://github.com/piowerb"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 flex items-center gap-2 bg-white border border-gray-200 shadow-sm rounded-full px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 hover:shadow-md transition-all z-50"
      >
        <GithubIcon className="w-4 h-4" />
        <span>Autor: @piowerb</span>
      </a>
    </div>
  );
}