// Метаданные личного кабинета: приватная страница, не индексируется.
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Личный кабинет — ChessLens',
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
