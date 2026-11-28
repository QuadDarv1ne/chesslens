// Метаданные страниц авторизации.
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Вход — ChessLens',
  robots: { index: false, follow: true },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
