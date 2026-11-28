// Метаданные страницы тарифов.
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Тарифы — ChessLens',
  description:
    'Тарифы ChessLens Pro: месяц, квартал или год. Оплата через СБП, Т-Банк, Ozon Pay и ЮKassa. Расширенный анализ шахматных партий.',
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
