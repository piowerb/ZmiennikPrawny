import { LegalAct, LegalActCategory } from '../types/LegalAct';

const API = 'https://api.sejm.gov.pl/eli/acts';

interface ApiAct {
  ELI: string;
  year: number;
  pos: number;
  title: string;
  promulgation?: string;
  publicationDate?: string;
  announcementDate?: string;
  entryIntoForce?: string;
}

const mapType = (title: string): LegalActCategory => {
  const t = title.toLowerCase();
  if (t.includes('ustawa')) return 'ustawa';
  if (t.includes('rozporządzenie')) return 'rozporzadzenie';
  if (t.includes('obwieszczenie') || t.includes('ogłoszenie')) return 'ogloszenie';
  return 'komunikat';
};

const getTags = (title: string) => {
  const t = title.toLowerCase();
  const tags = [];
  if (t.includes('pracy') || t.includes('urlop')) tags.push('prawo pracy');
  if (t.includes('podatek') || t.includes('vat')) tags.push('podatki');
  if (t.includes('transport')) tags.push('transport');
  return tags.length ? tags : ['ogólne'];
};

const getBody = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes('marszałek')) return 'Marszałek Sejmu';
  if (t.includes('minister')) return 'Minister';
  if (t.includes('prezes rady')) return 'Prezes Rady Ministrów';
  if (t.includes('ustawa')) return 'Sejm RP';
  return 'Organ państwowy';
};

const convert = (a: ApiAct): LegalAct => {
  let rawDateString = a.promulgation || a.publicationDate || a.announcementDate || new Date().toISOString();
  
  if (rawDateString.includes('2206')) {
    rawDateString = rawDateString.replace('2206', '2026');
  }

  const date = new Date(rawDateString);
  let days = Math.floor((Date.now() - date.getTime()) / 86400000);
  
  // Zabezpieczenie nałożone na sam znacznik "Nowy"
  if (days < 0) {
    days = 0; 
  }
  
  const fixedYear = a.year === 2206 ? 2026 : a.year;

  return {
    id: a.ELI || `${fixedYear}-${a.pos}`,
    title: a.title,
    category: mapType(a.title),
    journalNumber: `Dz.U. ${fixedYear} poz. ${a.pos}`,
    year: fixedYear,
    position: a.pos,
    publicationDate: date.toISOString(), 
    effectiveDate: a.entryIntoForce,
    issuingBody: getBody(a.title),
    summary: 'Akt prawny opublikowany w Dzienniku Ustaw RP.',
    tags: getTags(a.title),
    pdfUrl: `https://isap.sejm.gov.pl/isap.nsf/download.xsp/WDU${fixedYear}${String(a.pos).padStart(7, '0')}/O/D${fixedYear}${String(a.pos).padStart(4, '0')}.pdf`,
    isNew: days <= 7, 
  };
};

export async function fetchRecentLegalActs(): Promise<LegalAct[]> {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  
  // Pobieramy dane z obecnego roku
  const res = await fetch(`${API}/DU/${currentYear}?limit=500`);
  const data = await res.json();
  let allItems = [...data.items];

  // Zabezpieczenie na styczeń (dociągamy końcówkę poprzedniego roku, aby zachować 30 dni)
  if (currentDate.getMonth() === 0) { 
    const resPrev = await fetch(`${API}/DU/${currentYear - 1}?limit=500`);
    const dataPrev = await resPrev.json();
    allItems = [...allItems, ...dataPrev.items];
  }
  
  return allItems
    .map(convert)
    // Zostawia tylko wpisy z ostatnich 30 dni (oraz te z przyszłości)
    .filter((act: LegalAct) => {
      const actDate = new Date(act.publicationDate).getTime();
      const daysAgo = Math.floor((Date.now() - actDate) / 86400000);
      return daysAgo <= 30; 
    })
    .sort((a: LegalAct, b: LegalAct) => {
      const timeA = new Date(a.publicationDate).getTime();
      const timeB = new Date(b.publicationDate).getTime();
      
      if (timeA === timeB) {
        return b.position - a.position;
      }
      return timeB - timeA;
    });
}