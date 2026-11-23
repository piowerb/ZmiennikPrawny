import {
  Building2Icon, BriefcaseIcon, CarIcon, CoinsIcon, CpuIcon, FileTextIcon, GlobeIcon, GraduationCapIcon,
  HeartPulseIcon, LandmarkIcon, LeafIcon, PaletteIcon, PlaneIcon, ReceiptIcon, ScaleIcon, ShieldIcon, ShipIcon,
  SirenIcon, StoreIcon, TagIcon, TrainFrontIcon, TrophyIcon, UsersIcon, UtensilsIcon, VoteIcon, WheatIcon, ZapIcon,
  type LucideIcon,
} from 'lucide-react';

// Kolejność ma znaczenie: pierwsza pasująca reguła wygrywa (np. „świadczenia lecznicze” → zdrowie, nie pomoc społeczna).
const RULES: [RegExp, LucideIcon][] = [
  [/podat|akcyz|\bcło|celn|skarbow|ordynacja/, ReceiptIcon],
  [/zdrow|lecznic|lekar|pielęg|farmac|\blek|medycz|pacjent|położn|krwiod|choroby|uzdrow|fizjoter|aptek|szpital|diagnost/, HeartPulseIcon],
  [/oświat|szkol|nauczyc|uczni|studen|studia|egzamin|nauk|stypend|przedszkol|żłob|harcer|kwalifikac/, GraduationCapIcon],
  [/żywn|spożyw|mięso/, UtensilsIcon],
  [/roln|nasien|ziemniak|owoce|hodowl|wiejsk|weteryn|ryb|zwierz/, WheatIcon],
  [/przyrod|środowisk|ekolog|\bwod|wody|las|odpad|zanieczyszcz|cieplarn|recykl|roślin|ścieki|opakowan/, LeafIcon],
  [/energ|paliw|atomow|jądrow|górnic|kopalin|geolog/, ZapIcon],
  [/teleinform|informaty|cyber|internet|elektroniczn|telekom|radio|telewiz|podpis|danych|aplikacja/, CpuIcon],
  [/lotni|powietrz/, PlaneIcon],
  [/morsk|statki|żegl|\bport|okręt|morza/, ShipIcon],
  [/kolej|transport|przew|komunikacj/, TrainFrontIcon],
  [/drog|kierow|samochod|pojazd|tablice rejestr/, CarIcon],
  [/bezpieczeństwo państwa|wojsk|żołnierz|obron|mundur|broń|amunic|niejawn/, ShieldIcon],
  [/ratownict|klęsk|powodz|pożar|straż/, SirenIcon],
  [/wybor|posł|poseł|senator/, VoteIcon],
  [/cudzoziem|\bwiz|azyl|granic|dyplomat|konsular|międzynarod|ratyfik|zagranic|import/, GlobeIcon],
  [/prac|zatrudn|bhp|urlop|związki zawod/, BriefcaseIcon],
  [/sąd|karn|prokurat|wykrocz|notar|adwokat|postępowan|więzien|skazan|prawna|egzekuc|kodeks|biegli|kurator/, ScaleIcon],
  [/emerytur|rent|zasił|świadczen|ubezpieczenia społ|pomoc społ|niepełnospr|inwalid|rodzin|alimenty|dziec|wolontar/, UsersIcon],
  [/opłat|stawk|wynagrodz|uposaż|finans|budżet|fundusz|dotacj|subwenc|bank|kredyt|walut|dewiz|giełd|papiery|instrument|inwestyc|lokat|makler|odsetki|należności|pomoc publiczna|rachunk|ubezpiecz/, CoinsIcon],
  [/budow|nieruchom|lokal|mieszkan|przestrzenn|geodez|hipotek|grunt/, Building2Icon],
  [/samorząd|gmin|miast|województw|administrac|urzęd|służba cywilna|region/, LandmarkIcon],
  [/dokument|rejestr|ewidencj|dowod|zaświadcz|formularz|sprawozd|statyst|archiw/, FileTextIcon],
  [/kultur|sztuk|muze|zabytk|bibliotek|kinematogr|wydawnict|pomnik/, PaletteIcon],
  [/sport|turyst|hotel|impre|wyścig/, TrophyIcon],
  [/przedsiębior|spółk|działalność gospodarcza|handl|konsument|towar|usług|sprzedaż|koncesj|licencj|zezwol/, StoreIcon],
];

export const iconForTopic = (topic: string): LucideIcon => {
  const t = topic.toLowerCase();
  return RULES.find(([re]) => re.test(t))?.[1] ?? TagIcon;
};

/** Mała, liniowa ikona tematu (np. kłos przy „rolnictwo”). */
export function TopicIcon({ topic, className = 'w-3.5 h-3.5' }: { topic: string; className?: string }) {
  const Icon = iconForTopic(topic);
  return <Icon aria-hidden className={`${className} flex-shrink-0`} strokeWidth={2} />;
}
