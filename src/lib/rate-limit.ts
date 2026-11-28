// Простой in-memory rate limiter по IP.
// Для одного экземпляра приложения достаточно; при горизонтальном
// масштабировании стоит заменить на Redis/Upstash.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Очистка старых записей, чтобы карта не росла бесконечно.
function sweep(now: number) {
  if (buckets.size < 1000) return;
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Проверяет и увеличивает счётчик запросов для ключа.
 * @param key обычно IP клиента
 * @param limit макс. запросов в окне
 * @param windowMs размер окна в мс
 * @returns true, если запрос разрешён; false — превышен лимит.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  sweep(now);
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}
