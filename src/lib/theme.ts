'use client';

// Хелперы тем оформления: определения тем и адаптация цветов ходов.
import { useMemo } from 'react';
import { useTheme } from 'next-themes';
import { CLASSIFICATION_META, Classification, ClassificationMeta } from '@/lib/chess/analysis';

// Все доступные темы (должны совпадать с ThemeProvider в layout.tsx).
export const THEME_LIST = [
  { value: 'light', label: 'Светлая', icon: 'sun' },
  { value: 'dark', label: 'Тёмная', icon: 'moon' },
  { value: 'blue', label: 'Синяя ночь', icon: 'waves' },
  { value: 'green', label: 'Изумрудная', icon: 'leaf' },
  { value: 'sepia', label: 'Сепия', icon: 'book' },
] as const;

export type ThemeValue = (typeof THEME_LIST)[number]['value'] | 'system';

const NIGHT_THEMES = new Set(['dark', 'blue', 'green']);

/** true, если активна тема с тёмным фоном (для ярких значков ходов). */
export function useIsNight(): boolean {
  const { resolvedTheme } = useTheme();
  // До гидратации считаем тему тёмной — она стоит по умолчанию.
  return resolvedTheme ? NIGHT_THEMES.has(resolvedTheme) : true;
}

/** Светлые варианты цветов классификаций ходов (читаемо на светлых темах). */
const CLASSIFICATION_META_LIGHT: Record<Classification, ClassificationMeta> = {
  brilliant: { label: 'Бриллиант', symbol: '!!', color: '#0e7490', bg: 'rgba(14,116,144,0.12)' },
  best: { label: 'Лучший ход', symbol: '★', color: '#059669', bg: 'rgba(5,150,105,0.12)' },
  excellent: { label: 'Отличный ход', symbol: '!', color: '#4d7c0f', bg: 'rgba(77,124,15,0.12)' },
  good: { label: 'Хороший ход', symbol: '✓', color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
  book: { label: 'Теория', symbol: '', color: '#92400e', bg: 'rgba(146,64,14,0.12)' },
  forced: { label: 'Единственный ход', symbol: '=', color: '#4b5563', bg: 'rgba(75,85,99,0.12)' },
  inaccuracy: { label: 'Неточность', symbol: '?!', color: '#a16207', bg: 'rgba(161,98,7,0.12)' },
  mistake: { label: 'Ошибка', symbol: '?', color: '#c2410c', bg: 'rgba(194,65,12,0.12)' },
  blunder: { label: 'Зевок', symbol: '??', color: '#dc2626', bg: 'rgba(220,38,38,0.12)' },
  miss: { label: 'Упущенный мат', symbol: 'M', color: '#be123c', bg: 'rgba(190,18,60,0.12)' },
};

/** Набор цветов классификаций, адаптированный к текущей теме. */
export function useClassificationMeta(): Record<Classification, ClassificationMeta> {
  const night = useIsNight();
  return useMemo(() => (night ? CLASSIFICATION_META : CLASSIFICATION_META_LIGHT), [night]);
}
