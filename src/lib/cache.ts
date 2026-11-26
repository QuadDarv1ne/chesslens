// Простой TTL-кэш в памяти процесса для ответов прокси импорта.
// Уменьшает нагрузку на внешние API (lichess/chess.com) и ускоряет повторные
// запросы. Кэш ограничен по размеру, чтобы не расти бесконечно.

interface Entry<T> {
  value: T;
  expires: number;
}

const store = new Map<string, Entry<unknown>>();
const MAX_ENTRIES = 200;

/** Возвращает закэшированное значение или undefined, если истекло/нет. */
export function cacheGet<T>(key: string): T | undefined {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (hit.expires < Date.now()) {
    store.delete(key);
    return undefined;
  }
  return hit.value as T;
}

/** Кладёт значение в кэш на ttlMs. При переполнении вытесняет самую старую запись. */
export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  if (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }
  store.set(key, { value, expires: Date.now() + ttlMs });
}
