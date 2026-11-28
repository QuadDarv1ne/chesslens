// Тарифы ChessLens.
// Все цены — в копейках (₽ × 100).

export interface Tariff {
  id: string;
  name: string;
  priceKopecks: number; // ₽ × 100
  durationDays: number;
  description: string;
}

export const TARIFFS: Tariff[] = [
  {
    id: 'pro_monthly',
    name: 'Pro · 1 месяц',
    priceKopecks: 29_900, // 299 ₽
    durationDays: 30,
    description: 'Расширенный анализ партий и приоритетная поддержка',
  },
  {
    id: 'pro_quarterly',
    name: 'Pro · 3 месяца',
    priceKopecks: 74_700, // 747 ₽ (скидка 15%)
    durationDays: 90,
    description: 'Расширенный анализ партий и приоритетная поддержка',
  },
  {
    id: 'pro_annual',
    name: 'Pro · 1 год',
    priceKopecks: 179_400, // 1794 ₽ (скидка 50%)
    durationDays: 365,
    description: 'Расширенный анализ партий и приоритетная поддержка',
  },
];

export function findTariff(id: string): Tariff | undefined {
  return TARIFFS.find((t) => t.id === id);
}

/** Стоимость Pro-подписки на один месяц (для дефолтной оплаты). */
export const DEFAULT_TARIFF_ID = 'pro_monthly';
