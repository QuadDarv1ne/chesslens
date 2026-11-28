// Дебютный словарь: популярные теоретические линии (SAN, без номеров ходов).
// Используется для определения названия дебюта и пометки ходов как "теория".

export interface OpeningEntry {
  name: string;
  moves: string;
}

export const OPENINGS: OpeningEntry[] = [
  { name: 'Итальянская партия', moves: 'e4 e5 Nf3 Nc6 Bc4' },
  { name: 'Итальянская партия, тихая игра', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3' },
  { name: 'Испанская партия', moves: 'e4 e5 Nf3 Nc6 Bb5' },
  { name: 'Испанская партия, берлинская защита', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6' },
  { name: 'Испанская партия, разменный вариант', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6' },
  { name: 'Испанская партия, закрытый вариант', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5' },
  { name: 'Русская партия', moves: 'e4 e5 Nf3 Nf6' },
  { name: 'Шотландская партия', moves: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4' },
  { name: 'Шотландский гамбит', moves: 'e4 e5 Nf3 Nc6 d4 exd4 Bc4' },
  { name: 'Защита Филидора', moves: 'e4 e5 Nf3 d6' },
  { name: 'Дебют Понциани', moves: 'e4 e5 Nf3 Nc6 c3' },
  { name: 'Королевский гамбит', moves: 'e4 e5 f4' },
  { name: 'Венская партия', moves: 'e4 e5 Nc3' },
  { name: 'Дебют трёх коней', moves: 'e4 e5 Nf3 Nc6 Nc3' },
  { name: 'Дебют четырёх коней', moves: 'e4 e5 Nf3 Nc6 Nc3 Nf6' },
  { name: 'Защита Каро-Канн', moves: 'e4 c6 d4 d5' },
  { name: 'Каро-Канн, классическая система', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5' },
  { name: 'Французская защита', moves: 'e4 e6 d4 d5' },
  { name: 'Французская защита, вариант Тарраша', moves: 'e4 e6 d4 d5 Nd2' },
  { name: 'Французская защита, защита Винавера', moves: 'e4 e6 d4 d5 Nc3 Bb4' },
  { name: 'Сицилианская защита', moves: 'e4 c5' },
  { name: 'Сицилианская защита, дебют Алапина', moves: 'e4 c5 c3' },
  { name: 'Гамбит Смитта-Морра', moves: 'e4 c5 d4 cxd4 c3' },
  { name: 'Сицилианская защита, вариант Найдорфа', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6' },
  { name: 'Сицилианская защита, атака 6.Bg5 (Найдорф)', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5' },
  { name: 'Сицилианская защита, "Дракон"', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6' },
  { name: 'Сицилианская защита, схема Схевенинген', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6 Nc3 Qc7' },
  { name: 'Скандинавская защита', moves: 'e4 d5 exd5 Qxd5' },
  { name: 'Скандинавская защита, вариант Портиша-Сэма', moves: 'e4 d5 exd5 Nf6' },
  { name: 'Защита Алекина', moves: 'e4 Nf6' },
  { name: 'Защита Пирца-Уфимцева', moves: 'e4 g6' },
  { name: 'Дебют Нимцовича-Ларсена', moves: 'b3' },
  { name: 'Дебют Бёрда', moves: 'f4' },
  { name: 'Английское начало', moves: 'c4' },
  { name: 'Английское начало, симметричный вариант', moves: 'c4 c5' },
  { name: 'Дебют Рети', moves: 'Nf3' },
  { name: 'Королевская индийская атака', moves: 'Nf3 d5 g3' },
  { name: 'Ферзевый гамбит', moves: 'd4 d5 c4' },
  { name: 'Ферзевый гамбит, отказанный', moves: 'd4 d5 c4 e6' },
  { name: 'Ферзевый гамбит, славянская защита', moves: 'd4 d5 c4 c6' },
  { name: 'Ферзевый гамбит, принятый', moves: 'd4 d5 c4 dxc4' },
  { name: 'Защита Нимцовича', moves: 'd4 Nf6 c4 e6 Nc3 Bb4' },
  { name: 'Новоиндийская защита', moves: 'd4 Nf6 c4 e6 Nf3 b6' },
  { name: 'Защита Грюнфельда', moves: 'd4 Nf6 c4 g6 Nc3 d5' },
  { name: 'Защита Грюнфельда, разменный вариант', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7' },
  { name: 'Староиндийская защита', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6' },
  { name: 'Королевско-индийская защита', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5' },
  { name: 'Современный бенони', moves: 'd4 Nf6 c4 e6 Nf3 c5 d5' },
  { name: 'Будапештский гамбит', moves: 'd4 Nf6 c4 e5' },
  { name: 'Голландская защита', moves: 'd4 f5' },
  { name: 'Голландская защита, ленинградская система', moves: 'd4 f5 g3 Nf6 Bg2 g6' },
  { name: 'Каталонское начало', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2' },
  { name: 'Лондонская система', moves: 'd4 d5 Nf3 Nf6 Bf4' },
  { name: 'Дебют Тромпоуски', moves: 'd4 d5 Bf4' },
  { name: 'Дебют Рихтера-Вересова', moves: 'd4 d5 Nf3 Nf6 Bg5' },
];

export interface OpeningMatch {
  name: string;
  /** Сколько полуходов игры совпадает с теорией (1..N). */
  prefixLen: number;
}

/**
 * Ищет самую длинную теоретическую линию, совпадающую с началом партии.
 * Возвращает null, если совпадение меньше 2 полуходов.
 */
export function findOpening(sans: string[]): OpeningMatch | null {
  let best: OpeningMatch | null = null;
  let bestScore = -1;
  for (const o of OPENINGS) {
    const line = o.moves.split(' ');
    let i = 0;
    while (i < line.length && i < sans.length && line[i] === sans[i]) i++;
    if (i === 0) continue;
    const fullMatch = i === line.length;
    const score = i * 10 + (fullMatch ? 3 : 0);
    if (!best || score > bestScore) {
      best = { name: o.name, prefixLen: i };
      bestScore = score;
    }
  }
  if (!best || best.prefixLen < 2) return null;
  return best;
}
