// Bezpieczny dostęp do localStorage (w trybie prywatnym Safari może rzucać wyjątki)
export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* brak pamięci przeglądarki – aplikacja działa dalej bez zapisu */
  }
}
