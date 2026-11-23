<div align="center">
  <img src="src/imports/squircle_zmiennikprawny.png" width="200" alt="ZmiennikPrawny Logo" />
  <h1>ZmiennikPrawny</h1>
  <p>Aplikacja do monitorowania nowych ustaw z Dziennika Ustaw Rzeczypospolitej Polskiej w czasie rzeczywistym.</p>

  <img src="https://img.shields.io/badge/React-18-blue?logo=react" />
  <img src="https://img.shields.io/badge/TypeScript-blue?logo=typescript" />
  <img src="https://img.shields.io/badge/Tailwind-CSS-38bdf8?logo=tailwind-css" />
  <img src="https://img.shields.io/badge/PWA-Ready-green" />

  <br><br>

  <a href="https://zmiennikprawny.vercel.app/" target="_blank">
    <img src="https://img.shields.io/badge/🌐-Zobacz_Live_Demo-brightgreen?style=for-the-badge" alt="Live Demo" />
  </a>
  
  <br><br>

  <img src="src/imports/screenshot.png" width="600" alt="Podgląd aplikacji" />
</div>

## 📋 Spis treści
- [Historia Projektu](#-historia-projektu)
- [Funkcje](#-funkcje)
- [Technologie](#-technologie)
- [Instalacja](#-instalacja)
- [Struktura projektu](#-struktura-projektu)
- [Optymalizacja iOS](#-optymalizacja-dla-iosiphone)
- [Licencja](#-licencja-i-prawa-autorskie)

---

## Historia Projektu
* **Wrzesień 2025 (Alfa):** Początek prac rozwojowych, wewnętrzna faza testów i budowanie fundamentów aplikacji.
* **Listopad 2025 (Beta):** Pierwsza publicznie dostępna wersja aplikacji. Otwarcie na opinie użytkowników i pierwsze szersze testy w środowisku produkcyjnym.
* **Maj 2026 (Stabilna v1.0):** Premiera pierwszej wersji stabilnej. Wprowadzenie pełnego, dopracowanego interfejsu (GUI), optymalizacja UX oraz wdrożenie wszystkich niezbędnych funkcji.
* **Listopad 2026 (v1.1):** Aktualizacja stabilności i danych. Naprawa wyszukiwarki, data wejścia w życie, organ wydający i słowa kluczowe z ISAP, pełne wsparcie PWA, ok. 4× mniej pobieranych danych.
* **Listopad 2026 (v1.2):** Zakładki „Wkrótce” i „Obserwowane”, grupowanie aktów po dniach, linki do pojedynczych aktów, klikalne tematy i organy, tryb ciemny.

## Funkcje

✅ **Monitorowanie w czasie rzeczywistym** - Pobieranie aktów prawnych z ISAP  
✅ **Inteligentne wyszukiwanie** - Szybkie filtrowanie po tytule z dynamicznym podświetlaniem (highlighting) trafionych fraz na zielono  
✅ **Kategorie** - Ustawy, rozporządzenia, ogłoszenia  
✅ **Szczegóły** - Pełne metadane aktu  
✅ **PDF** - Bezpośredni link do oficjalnego dokumentu  
✅ **Mobilne** - Responsywne, safe areas dla iOS oraz natywne wsparcie dla favicon w formacie PNG  
✅ **Wkrótce w życie** - Akty, które zaczną obowiązywać w ciągu 14 dni, pogrupowane według daty wejścia w życie  
✅ **Obserwowane tematy** - Własna lista słów (zapis w przeglądarce, bez konta) z oznaczeniem nowych aktów od ostatniej wizyty  
✅ **Linki do aktów** - Każdy akt ma własny adres (np. `/#/DU/2026/1539`), działa przycisk „wstecz”  
✅ **Klikalne tematy i organy** - Jedno kliknięcie pokazuje wszystkie akty z danym tematem lub od danego organu  
✅ **Tryb ciemny** - Automatycznie według ustawień systemu albo ręcznie  

## Technologie

- **React 18** + TypeScript
- **Tailwind CSS v4** - Nowoczesny styling
- **Vite** - Szybkie budowanie i hot reload
- **Lucide React** - Ikony wektorowe
- **ISAP API** - Oficjalne API Dziennika Ustaw

## Wymagania

- **Node.js** w wersji 18 lub wyższej
- **pnpm** (menedżer pakietów)

## Instalacja

### 1. Sklonuj repozytorium

```bash
git clone <url-repozytorium>
cd code

```

### 2. Zainstaluj zależności

```bash
# Jeśli nie masz pnpm, zainstaluj globalnie:
npm install -g pnpm

# Zainstaluj zależności projektu:
pnpm install

```

### 3. Uruchom aplikację w trybie deweloperskim

```bash

# Jeśli uruchamiasz lokalnie:
pnpm run dev

```

Aplikacja będzie dostępna pod adresem: `http://localhost:5173`

## Budowanie dla produkcji

Jeśli budujesz lokalnie:

```bash
pnpm run build

```

Zbudowana aplikacja znajdzie się w folderze `dist/`.

## Struktura projektu

**Minimalistyczna architektura - tylko niezbędne pliki:**

```text
src/
├── app/
│   ├── services/
│   │   └── isapService.ts   # API (70 linii)
│   ├── types/
│   │   └── LegalAct.ts      # Typy (15 linii)
│   └── App.tsx              # Cała aplikacja (~410 linii)
├── imports/
│   └── squircle_zmiennikprawny.png
└── styles/
    └── theme.css            # Minimalne style (10 linii)

```

> 📖 Zobacz [SIMPLE.md](https://www.google.com/search?q=./SIMPLE.md) dla szczegółów o architekturze minimalistycznej

## Jak korzystać z aplikacji

### 1. Przeglądanie aktów prawnych

Na głównym ekranie zobaczysz listę najnowszych aktów prawnych z Dziennika Ustaw. Akty są automatycznie pobierane z oficjalnego API ISAP.

### 2. Wyszukiwanie

Użyj paska wyszukiwania na górze ekranu, aby szybko znaleźć interesujące Cię akty. Wpisana fraza zostanie automatycznie podświetlona na zielono w wynikach wyszukiwania.

### 3. Filtrowanie

Użyj przycisków filtrów, aby wyświetlić tylko:

* Ustawy
* Rozporządzenia
* Ogłoszenia

### 4. Szczegóły aktu

Kliknij na dowolny akt, aby zobaczyć:

* Pełny tytuł i opis
* Datę ogłoszenia i wejścia w życie
* Organ wydający
* Tagi tematyczne
* Możliwość pobrania PDF

## API - Dziennik Ustaw (ISAP)

Aplikacja korzysta z oficjalnego API Internetowego Systemu Aktów Prawnych prowadzonego przez Sejm RP:

* **Base URL**: `https://api.sejm.gov.pl/eli/acts`
* **Endpoint używany w aplikacji**: `https://api.sejm.gov.pl/eli/acts/search?publisher=DU&pubDateFrom={data}` (akty z ostatnich 30 dni, z datą wejścia w życie, organem i słowami kluczowymi)
* **Endpoint dla Dziennika Ustaw**: `https://api.sejm.gov.pl/eli/acts/DU/{year}`
* **Dokumentacja API**: [https://api.sejm.gov.pl/](https://www.google.com/search?q=https://api.sejm.gov.pl/)
* **Dokumentacja ELI**: [https://api.sejm.gov.pl/eli_pl.html](https://www.google.com/search?q=https://api.sejm.gov.pl/eli_pl.html)
* **Portal ISAP**: [https://isap.sejm.gov.pl/](https://www.google.com/search?q=https://isap.sejm.gov.pl/)

### Jak działa API

API zwraca dane w formacie JSON zawierające:

* Tytuł aktu prawnego
* Rok i pozycję w dzienniku
* Datę ogłoszenia i publikacji
* Datę wejścia w życie
* Status aktu
* Linki do pełnych tekstów (PDF/HTML)

Przykładowe zapytanie:

```bash
curl [https://api.sejm.gov.pl/eli/acts/DU/2026?limit=10](https://api.sejm.gov.pl/eli/acts/DU/2026?limit=10)

```

### Zakres danych

Baza danych zawiera akty prawne od 1918 roku do chwili obecnej (ponad 96,000 aktów). Aplikacja automatycznie pobiera najnowsze akty z bieżącego i poprzedniego roku.
Dane są pobierane w czasie rzeczywistym bezpośrednio z oficjalnych źródeł.

## Optymalizacja dla iOS/iPhone

Aplikacja została w pełni zoptymalizowana pod urządzenia iOS:

### ✅ Safe Areas

* Automatyczne dopasowanie do notch/Dynamic Island
* Bezpieczne obszary dla dolnej nawigacji
* Wsparcie dla wszystkich rozmiarów iPhone

### ✅ Touch Targets

* Wszystkie przyciski mają minimum 44x44px (standard iOS)
* Większe obszary klikalne dla lepszej ergonomii
* Optymalne odstępy między elementami

### ✅ iOS UX Patterns

* Płynne animacje i przejścia
* iOS-style toggle switches
* Zaokrąglone rogi (border-radius zgodny z iOS)
* Smooth scrolling z `-webkit-overflow-scrolling`

### ✅ Typography

* Font size minimum 16px (zapobiega auto-zoom w iOS)
* Czytelne fonty i odpowiednie wagi
* Optymalne line-height dla czytelności

### ✅ PWA Support

* Manifest.json dla "Add to Home Screen"
* Theme color: #005130 (zielony motyw)
* Standalone mode - pełnoekranowa aplikacja
* Własna ikona widoczna na ekranie głównym i w kartach przeglądarki

### 📱 Instalacja jako PWA na iPhone

1. Otwórz aplikację w Safari
2. Kliknij ikonę "Udostępnij" (kwadrat ze strzałką)
3. Wybierz "Dodaj do ekranu początkowego"
4. Aplikacja pojawi się jako ikona na ekranie głównym
5. Uruchom jak natywną aplikację!

### Jak dodać nową funkcję

1. Utwórz nowy branch: `git checkout -b feature/nazwa-funkcji`
2. Wprowadź zmiany
3. Przetestuj lokalnie
4. Utwórz Pull Request

## Wsparcie

W razie problemów lub pytań:

* Zgłoś issue na GitHubie
* Sprawdź dokumentację API: https://api.sejm.gov.pl/

## Licencja i Prawa Autorskie

**Wszelkie prawa zastrzeżone (All Rights Reserved)**

Kod źródłowy, projekt interfejsu oraz cała architektura aplikacji ZmiennikPrawny są moją wyłączną własnością.

* Masz prawo przeglądać ten kod (np. w repozytorium na GitHubie) wyłącznie w celach edukacyjnych i poglądowych.
* **Kategorycznie zabrania się** kopiowania, modyfikowania, dystrybuowania oraz wykorzystywania tego kodu (w całości lub w jakichkolwiek fragmentach) we własnych projektach komercyjnych i niekomercyjnych bez uzyskania mojej uprzedniej, wyraźnej zgody.

Jeśli chcesz użyć tego projektu, zmodyfikować go, rozwinąć lub wdrożyć do własnych celów – **musisz najpierw skontaktować się ze mną**, aby uzyskać na to pozwolenie.


### Licencje komponentów zewnętrznych

Prawa zastrzeżone dotyczą mojego kodu i projektu aplikacji. Projekt korzysta też z bibliotek open source na ich własnych licencjach, m.in. React (MIT), Radix UI (MIT), komponenty shadcn/ui (MIT), Tailwind CSS (MIT) i ikony Lucide (ISC). Ich prawa należą do autorów tych bibliotek.

### Źródło danych

Dane pochodzą z publicznego API Sejmu RP (ELI, https://api.sejm.gov.pl). Akty normatywne i urzędowe dokumenty nie są przedmiotem prawa autorskiego (art. 4 ustawy o prawie autorskim i prawach pokrewnych). ZmiennikPrawny nie jest serwisem Sejmu RP; wiążący jest wyłącznie tekst opublikowany w Dzienniku Ustaw.

## Autor

**Autor:** [@piowerb](https://github.com/piowerb)

Aplikacja stworzona w celu monitorowania polskiego prawa w przystępny i nowoczesny sposób.

---

**ZmiennikPrawny** - Bądź na bieżąco z prawem! 📚⚖️

[↑ Wróć na górę](#-spis-treści)
