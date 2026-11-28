// Layout группы (main): публичные и приватные страницы.
// Авторизация проверяется на самих страницах (dashboard показывает
// "Доступ запрещён"), поэтому тарифы (/pricing) доступны без входа.
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ChessLens',
};

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return children;
}
