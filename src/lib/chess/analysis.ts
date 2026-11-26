// Ядро анализа: модель перевеса, классификация ходов, точность игроков,
// острота позиций и генерация словесных комментариев.
import { Chess } from 'chess.js';
import { findOpening, OpeningMatch } from './openings';

// ---------- Типы ----------

export type Classification =
  | 'brilliant'
  | 'best'
  | 'excellent'
  | 'good'
  | 'book'
  | 'forced'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder'
  | 'miss';

export interface ClassificationMeta {
  label: string;
  symbol: string;
  color: string;
  /** Цвет подложки бейджа (rgba). */
  bg: string;
}

export const CLASSIFICATION_META: Record<Classification, ClassificationMeta> = {
  brilliant: { label: 'Триллиант', symbol: '!!', color: '#22d3ee', bg: 'rgba(34,211,238,0.15)' },
  best: { label: 'Лучший ход', symbol: '★', color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
  excellent: { label: 'Отличный ход', symbol: '!', color: '#a3e635', bg: 'rgba(163,230,53,0.15)' },
  good: { label: 'Хороший ход', symbol: '✓', color: '#9aa4b2', bg: 'rgba(154,164,178,0.15)' },
  book: { label: 'Теория', symbol: '', color: '#c08b5c', bg: 'rgba(192,139,92,0.15)' },
  forced: { label: 'Единственный ход', symbol: '=', color: '#6b7280', bg: 'rgba(107,114,128,0.15)' },
  inaccuracy: { label: 'Неточность', symbol: '?!', color: '#facc15', bg: 'rgba(250,204,21,0.15)' },
  mistake: { label: 'Ошибка', symbol: '?', color: '#fb923c', bg: 'rgba(251,146,60,0.15)' },
  blunder: { label: 'Зевок', symbol: '??', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  miss: { label: 'Упущенный мат', symbol: 'M', color: '#f43f5e', bg: 'rgba(244,63,94,0.15)' },
};

/** Оценка одной позиции (плюс = перевес белых). */
export interface PlyEval {
  cp: number | null;
  /** Мат в N полуходах с точки зрения белых (положительный — матируют белые). */
  mate: number | null;
  bestUci: string | null;
  pvUci: string[];
  pvSan: string[];
  depth: number;
  nodes: number;
  timeMs: number;
}

export interface MoveMeta {
  classification: Classification;
  /** Потерянный перевес в процентах выигрыша (модель lichess). */
  winLoss: number;
  /** Потеря в сантипешках (null, если в позиции мат). */
  cpLoss: number | null;
  comment: string;
  bestSan: string | null;
  accuracy: number;
}

export interface PlayerSummary {
  name: string;
  accuracy: number;
  counts: Partial<Record<Classification, number>>;
}

export interface GameSummary {
  white: PlayerSummary;
  black: PlayerSummary;
  opening: string | null;
  sharpness: number;
  volatility: number;
}

// ---------- Модель перевеса (k = 0.00368208, как у lichess) ----------

export function winPercent(cp: number): number {
  const c = Math.max(-4000, Math.min(4000, cp));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * c)) - 1);
}

/** Переводит оценку позиции в проценты выигрыша для цвета color ('w' | 'b'). */
export function evalToWin(e: PlyEval | undefined, color: 'w' | 'b'): number {
  if (!e) return 50;
  const sign = color === 'w' ? 1 : -1;
  if (e.mate !== null) return e.mate * sign > 0 ? 100 : 0;
  if (e.cp === null) return 50;
  return winPercent(e.cp * sign);
}

/** Точность одного хода по формуле lichess. */
function moveAccuracy(winLoss: number): number {
  const w = Math.max(0, winLoss);
  const acc = 103.1668 * Math.exp(-0.04354 * w) - 3.1669;
  return Math.max(0, Math.min(100, acc));
}

// ---------- Синтетическая оценка финальной позиции ----------

/** Если позиция уже конечна (мат/пат/ничья), оценку можно определить без движка. */
export function syntheticEval(fen: string): PlyEval | null {
  let c: Chess;
  try {
    c = new Chess(fen);
  } catch {
    return null;
  }
  if (!c.isGameOver()) return null;
  if (c.isCheckmate()) {
    // Ход у той стороны, которую заматовали => победа противоположной.
    const mated = c.turn();
    return { cp: null, mate: mated === 'w' ? -1 : 1, bestUci: null, pvUci: [], pvSan: [], depth: 0, nodes: 0, timeMs: 0 };
  }
  return { cp: 0, mate: null, bestUci: null, pvUci: [], pvSan: [], depth: 0, nodes: 0, timeMs: 0 };
}

// ---------- Форматирование ----------

export function formatEval(e: PlyEval | undefined): string {
  if (!e) return '?';
  if (e.mate !== null) return e.mate > 0 ? `+M${Math.abs(e.mate)}` : `-M${Math.abs(e.mate)}`;
  if (e.cp === null) return '0.0';
  const v = Math.max(-100, Math.min(100, e.cp / 100));
  return (v >= 0 ? '+' : '') + v.toFixed(1);
}

export function formatPawns(cpLoss: number | null): string {
  if (cpLoss === null) return '?';
  return (Math.abs(cpLoss) / 100).toFixed(1);
}

// ---------- Определение жертв ----------

const PIECE_VALUE: Record<string, number> = { p: 100, n: 300, b: 320, r: 500, q: 900, k: 0 };

/**
 * Грубая оценка того, сколько материала сможет «сожрать» соперник сразу после
 * хода (с учётом лучшего ответного взятия). Возвращает потерю в сантипешках.
 */
export function sacrificeSeverity(afterFen: string): number {
  let c: Chess;
  try {
    c = new Chess(afterFen);
  } catch {
    return 0;
  }
  let best = 0;
  for (const m of c.moves({ verbose: true })) {
    if (!m.captured) continue;
    const gain = PIECE_VALUE[m.captured] ?? 0;
    let recapture = 0;
    const c2 = new Chess(afterFen);
    try {
      c2.move(m);
    } catch {
      continue;
    }
    for (const r of c2.moves({ verbose: true })) {
      if (r.to === m.to && r.captured) {
        recapture = Math.max(recapture, PIECE_VALUE[r.captured] ?? 0);
      }
    }
    best = Math.max(best, gain - recapture);
  }
  return best;
}

// ---------- Построение комментария ----------

function evalStr(e: PlyEval | undefined, mover: 'w' | 'b'): string {
  if (!e) return '?';
  const sign = mover === 'w' ? 1 : -1;
  if (e.mate !== null) {
    const m = e.mate * sign;
    if (m > 0) return `мат в пользу ${mover === 'w' ? 'белых' : 'чёрных'}`;
    if (m < 0) return `мат в пользу ${mover === 'w' ? 'чёрных' : 'белых'}`;
  }
  const cp = (e.cp ?? 0) * sign;
  const v = Math.max(-100, Math.min(100, cp / 100));
  return (v >= 0 ? `+${v.toFixed(1)}` : v.toFixed(1)) + ' у ' + (mover === 'w' ? 'белых' : 'чёрных');
}

function sideName(color: 'w' | 'b'): string {
  return color === 'w' ? 'белых' : 'чёрных';
}

function buildComment(args: {
  classification: Classification;
  mover: 'w' | 'b';
  winLoss: number;
  cpLoss: number | null;
  evalBefore: PlyEval | undefined;
  evalAfter: PlyEval | undefined;
  bestSan: string | null;
  openingName: string | null;
  mateBeforeStm: number | null;
  severity: number;
}): string {
  const { classification, mover, cpLoss, evalBefore, evalAfter, bestSan, openingName, mateBeforeStm } = args;
  const loss = formatPawns(cpLoss);
  const bestPart = bestSan ? ` Лучшим ходом было ${bestSan}.` : '';
  switch (classification) {
    case 'book':
      return `Теоретический ход. Партия идёт по известной линии: ${openingName ?? 'известный дебют'}.`;
    case 'forced':
      return 'Единственный ход в позиции — выбора не было.';
    case 'miss':
      return `Упущенная победа! Был доступен форсированный мат в ${Math.max(1, Math.ceil(Math.abs(mateBeforeStm ?? 1) / 2))} ход(а).${bestPart}`;
    case 'brilliant':
      return `Триллиант! Жертва материала (~${formatPawns(args.severity)} п.), которая сохраняет решающий перевес (после хода ${evalStr(evalAfter, mover)}). Движок подтверждает: это сильнейший ход в позиции.`;
    case 'best':
      return `Лучший ход по оценке Stockfish 19. Оценка после хода: ${evalStr(evalAfter, mover)}.`;
    case 'excellent':
      return `Почти идеально: потери всего ${loss} п. перевеса.${bestPart}`;
    case 'good':
      return `Достойное продолжение, потеряно ~${loss} п. перевеса.${bestPart}`;
    case 'inaccuracy':
      return `Неточность. Позиция ${sideName(mover)} ослабла на ~${loss} пешки (было ${evalStr(evalBefore, mover)}, стало ${evalStr(evalAfter, mover)}).${bestPart}`;
    case 'mistake':
      return `Ошибка! Теряется ~${loss} пешки перевеса (оценка меняется с ${evalStr(evalBefore, mover)} на ${evalStr(evalAfter, mover)}).${bestPart}`;
    case 'blunder':
      return `Зевок! Оценка рушится с ${evalStr(evalBefore, mover)} до ${evalStr(evalAfter, mover)} — потеря ~${loss} пешки.${bestPart}`;
    default:
      return '';
  }
}

// ---------- Построение метаданных одного хода ----------

export interface BuildMetaArgs {
  fens: string[];
  sans: string[];
  analyses: (PlyEval | undefined)[];
  /** Номер полухода, 1-based (ход был из fens[ply-1] в fens[ply]). */
  ply: number;
  opening: OpeningMatch | null;
}

export function buildMoveMeta({ fens, sans, analyses, ply, opening }: BuildMetaArgs): MoveMeta | undefined {
  const evalBefore = analyses[ply - 1];
  const evalAfter = analyses[ply];
  if (!evalBefore || !evalAfter) return undefined;
  // Определяем сторону по FEN первой позиции — корректно и для начальной, и для FEN-задач.
  const startTurn = fens[0]?.split(' ')[1] === 'b' ? 'b' : 'w';
  const mover: 'w' | 'b' = (startTurn === 'w' ? (ply % 2 === 1 ? 'w' : 'b') : (ply % 2 === 1 ? 'b' : 'w'));
  const sign = mover === 'w' ? 1 : -1;

  // Сколько легальных ходов было в позиции (для пометки "вынужденный").
  let legalCount = 0;
  try {
    legalCount = new Chess(fens[ply - 1]).moves().length;
  } catch {
    legalCount = 0;
  }

  // Проверяем, совпадает ли сыгранный ход с лучшим ходом движка.
  let playedLan: string | null = null;
  try {
    playedLan = new Chess(fens[ply - 1]).move(sans[ply - 1])?.lan ?? null;
  } catch {
    playedLan = null;
  }
  const bestUci = evalBefore.bestUci;
  const playedIsBest = !!bestUci && !!playedLan && bestUci.startsWith(playedLan.slice(0, 4));

  // SAN лучшего хода — для текста рекомендаций.
  let bestSan: string | null = null;
  if (bestUci && bestUci.length >= 4) {
    try {
      const c = new Chess(fens[ply - 1]);
      const mv = c.move({ from: bestUci.slice(0, 2), to: bestUci.slice(2, 4), promotion: bestUci.slice(4, 5) || undefined });
      bestSan = mv?.san ?? null;
    } catch {
      bestSan = null;
    }
  }

  // Проценты выигрыша до/после (с точки зрения ходившего).
  const winBefore = evalToWin(evalBefore, mover);
  const winAfter = evalToWin(evalAfter, mover);
  const winLoss = Math.max(0, winBefore - winAfter);

  // Потеря в сантипешках (с точки зрения ходившего).
  const cpBefore = evalBefore.cp === null ? null : evalBefore.cp * sign;
  const cpAfter = evalAfter.cp === null ? null : evalAfter.cp * sign;
  const cpLoss = cpBefore !== null && cpAfter !== null ? cpBefore - cpAfter : null;

  // Мат-статусы с точки зрения ходившего.
  const mateBeforeStm = evalBefore.mate === null ? null : evalBefore.mate * sign;
  const mateAfterStm = evalAfter.mate === null ? null : evalAfter.mate * sign;

  const severity = sacrificeSeverity(fens[ply]);
  const inBook = !!opening && opening.prefixLen >= ply;

  let classification: Classification;
  if (inBook && winLoss < 5) {
    classification = 'book';
  } else if (legalCount === 1) {
    classification = 'forced';
  } else if (mateBeforeStm !== null && mateBeforeStm > 0 && mateAfterStm !== null && mateAfterStm <= 0) {
    classification = 'miss';
  } else if (playedIsBest && winLoss < 10) {
    // Сыгран ход, совпавший с лучшим ходом движка: независимо от шума оценок
    // между соседними поисками это лучший ход (или триллиант при жертве).
    if (severity >= 300 && winAfter >= 45 && cpAfter !== null && cpAfter >= -30) {
      classification = 'brilliant';
    } else {
      classification = 'best';
    }
  } else if (winLoss >= 10) {
    classification = 'blunder';
  } else if (winLoss >= 5) {
    classification = 'mistake';
  } else if (winLoss >= 2) {
    classification = 'inaccuracy';
  } else if (playedIsBest) {
    classification = 'best';
  } else if (winLoss <= 1) {
    classification = 'excellent';
  } else {
    classification = 'good';
  }

  const comment = buildComment({
    classification,
    mover,
    winLoss,
    cpLoss,
    evalBefore,
    evalAfter,
    bestSan,
    openingName: opening?.name ?? null,
    mateBeforeStm,
    severity,
  });

  return {
    classification,
    winLoss,
    cpLoss,
    comment,
    bestSan,
    accuracy: moveAccuracy(winLoss),
  };
}

// ---------- Итоги партии ----------

export function computeSummary(args: {
  fens: string[];
  sans: string[];
  moveMeta: (MoveMeta | undefined)[];
  analyses: (PlyEval | undefined)[];
  headers: Record<string, string>;
  opening: OpeningMatch | null;
}): GameSummary {
  const { fens, sans, moveMeta, analyses, headers, opening } = args;
  // Сторона первого полухода: у FEN-задач партия может начинаться с хода чёрных.
  const startTurn = fens[0]?.split(' ')[1] === 'b' ? 'b' : 'w';
  const isWhitePly = (p: number) => (startTurn === 'w' ? p % 2 === 1 : p % 2 === 0);

  const countsW: Partial<Record<Classification, number>> = {};
  const countsB: Partial<Record<Classification, number>> = {};
  let accSumW = 0;
  let accSumB = 0;
  let nW = 0;
  let nB = 0;

  for (let p = 1; p <= sans.length; p++) {
    const meta = moveMeta[p - 1];
    if (!meta) continue;
    const white = isWhitePly(p);
    const counts = white ? countsW : countsB;
    counts[meta.classification] = (counts[meta.classification] ?? 0) + 1;
    if (white) {
      accSumW += meta.accuracy;
      nW++;
    } else {
      accSumB += meta.accuracy;
      nB++;
    }
  }

  // Острота: насколько позиции близки к равенству и насколько сильно скачет оценка.
  const wins: number[] = [];
  for (const e of analyses) {
    if (!e) continue;
    wins.push(evalToWin(e, 'w'));
  }
  let avgSharp = 0;
  let volatility = 0;
  if (wins.length > 0) {
    avgSharp = wins.reduce((s, w) => s + (100 - Math.abs(w - 50) * 1.6), 0) / wins.length;
    let vol = 0;
    for (let i = 1; i < wins.length; i++) vol += Math.abs(wins[i] - wins[i - 1]);
    volatility = vol / (wins.length - 1 || 1);
  }
  const sharpness = Math.max(0, Math.min(100, 0.7 * avgSharp + 1.8 * volatility));

  const fallback = (key: string, def: string) => (headers[key] && headers[key] !== '?' ? headers[key] : def);

  return {
    white: {
      name: fallback('White', 'Белые'),
      accuracy: nW > 0 ? accSumW / nW : 0,
      counts: countsW,
    },
    black: {
      name: fallback('Black', 'Чёрные'),
      accuracy: nB > 0 ? accSumB / nB : 0,
      counts: countsB,
    },
    opening: opening?.name ?? null,
    sharpness,
    volatility,
  };
}

export { findOpening };
export type { OpeningMatch };
