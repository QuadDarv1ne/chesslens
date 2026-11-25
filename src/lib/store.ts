// Хранилище состояния анализа партии (Zustand).
'use client';

import { create } from 'zustand';
import { Chess } from 'chess.js';
import { engine } from '@/lib/engine/engine';
import {
  buildMoveMeta,
  computeSummary,
  findOpening,
  syntheticEval,
  GameSummary,
  MoveMeta,
  PlyEval,
} from '@/lib/chess/analysis';

export type EngineUiStatus = 'off' | 'loading' | 'ready' | 'analyzing';

interface AnalysisStore {
  // Данные партии
  fens: string[];
  sans: string[];
  fromTos: { from: string; to: string }[];
  headers: Record<string, string>;
  opening: string | null;
  openingPrefixLen: number;

  // Результаты анализа
  analyses: (PlyEval | undefined)[];
  moveMeta: (MoveMeta | undefined)[];
  summary: GameSummary | null;

  // UI-состояние
  currentPly: number; // 0 — начальная позиция, fens.length - 1 — последняя
  orientation: 'white' | 'black';
  engineStatus: EngineUiStatus;
  depth: number;
  analyzing: boolean;
  progressDone: number;
  progressTotal: number;
  error: string | null;

  // Действия
  loadFromPgn: (pgn: string) => boolean;
  loadFen: (fen: string) => boolean;
  goTo: (ply: number) => void;
  goToStart: () => void;
  goToEnd: () => void;
  step: (delta: number) => void;
  flip: () => void;
  addMove: (from: string, to: string, promotion?: string) => boolean;
  setDepth: (d: number) => void;
  startAnalysis: (depth?: number) => void;
  stopAnalysis: () => void;
  deepenCurrent: () => void;
  clearError: () => void;
}

// Токен для отмены анализа: любое изменение партии делает прошлый цикл неактуальным.
let runToken = 0;

function computeOpeningMeta(sans: string[]) {
  const m = findOpening(sans);
  return { opening: m?.name ?? null, openingPrefixLen: m?.prefixLen ?? 0 };
}

export const useAnalysisStore = create<AnalysisStore>((set, get) => ({
  fens: [new Chess().fen()],
  sans: [],
  fromTos: [],
  headers: {},
  opening: null,
  openingPrefixLen: 0,
  analyses: [],
  moveMeta: [],
  summary: null,
  currentPly: 0,
  orientation: 'white',
  engineStatus: 'off',
  depth: 12,
  analyzing: false,
  progressDone: 0,
  progressTotal: 0,
  error: null,

  loadFromPgn: (pgn) => {
    let chess: Chess;
    try {
      chess = new Chess();
      chess.loadPgn(pgn.trim());
    } catch (e) {
      set({ error: e instanceof Error ? e.message.replace(/^Invalid /, 'Ошибка PGN: ') : 'Не удалось разобрать PGN' });
      return false;
    }
    const history = chess.history({ verbose: true });
    if (history.length === 0) {
      set({ error: 'В PGN нет ходов' });
      return false;
    }
    const startFen = history[0].before;
    const fens = [startFen, ...history.map((h) => h.after)];
    const sans = history.map((h) => h.san);
    const fromTos = history.map((h) => ({ from: h.from, to: h.to }));
    const openingMeta = computeOpeningMeta(sans);
    const headers = chess.getHeaders();
    runToken++;
    set({
      fens,
      sans,
      fromTos,
      headers,
      ...openingMeta,
      analyses: new Array(fens.length),
      moveMeta: new Array(sans.length),
      summary: null,
      currentPly: 0,
      analyzing: false,
      progressDone: 0,
      progressTotal: 0,
      error: null,
    });
    get().startAnalysis();
    return true;
  },

  loadFen: (fen) => {
    try {
      new Chess(fen);
    } catch {
      set({ error: 'Некорректный FEN' });
      return false;
    }
    runToken++;
    set({
      fens: [fen],
      sans: [],
      fromTos: [],
      headers: {},
      opening: null,
      openingPrefixLen: 0,
      analyses: [undefined],
      moveMeta: [],
      summary: null,
      currentPly: 0,
      analyzing: false,
      progressDone: 0,
      progressTotal: 0,
      error: null,
    });
    get().startAnalysis();
    return true;
  },

  goTo: (ply) => {
    const { fens } = get();
    const clamped = Math.max(0, Math.min(fens.length - 1, ply));
    set({ currentPly: clamped });
  },
  goToStart: () => set({ currentPly: 0 }),
  goToEnd: () => set({ currentPly: Math.max(0, get().fens.length - 1) }),
  step: (delta) => {
    const { currentPly, fens } = get();
    const next = Math.max(0, Math.min(fens.length - 1, currentPly + delta));
    set({ currentPly: next });
  },
  flip: () => set({ orientation: get().orientation === 'white' ? 'black' : 'white' }),

  addMove: (from, to, promotion) => {
    const { fens, sans, fromTos, currentPly, analyses, moveMeta, headers, openingPrefixLen, opening } = get();
    // Если мы не в конце партии — обрезаем дальнейшие ходы (вариация поверх).
    const truncated = currentPly < fens.length - 1;
    const baseFen = fens[currentPly];
    let chess: Chess;
    try {
      chess = new Chess(baseFen);
    } catch {
      return false;
    }
    let move;
    try {
      move = chess.move({ from, to, promotion: promotion || 'q' });
    } catch {
      return false;
    }
    if (!move) return false;

    const newFens = (truncated ? fens.slice(0, currentPly + 1) : fens).concat(move.after);
    const newSans = (truncated ? sans.slice(0, currentPly) : sans).concat(move.san);
    const newFromTos = (truncated ? fromTos.slice(0, currentPly) : fromTos).concat({ from: move.from, to: move.to });
    const newAnalyses = (truncated ? analyses.slice(0, currentPly + 1) : analyses).concat(undefined);
    const newMeta = (truncated ? moveMeta.slice(0, currentPly) : moveMeta).concat(undefined);

    // Пересчитываем дебют, если добавленные ходы попадают в теорию.
    let openingMeta = { opening, openingPrefixLen };
    if (newSans.length <= 12) {
      openingMeta = computeOpeningMeta(newSans);
    }

    runToken++;
    set({
      fens: newFens,
      sans: newSans,
      fromTos: newFromTos,
      analyses: newAnalyses,
      moveMeta: newMeta,
      headers,
      ...openingMeta,
      currentPly: newFens.length - 1,
      summary: null,
      analyzing: false,
      progressDone: 0,
      progressTotal: 0,
    });
    // Анализируем только новые позиции (начиная с позиции перед добавленным ходом).
    get().startAnalysis(undefined, currentPly);
    return true;
  },

  setDepth: (d) => set({ depth: d }),

  startAnalysis: (depthOverride, fromPly = 0) => {
    const { fens, analyses, depth, analyzing } = get();
    const useDepth = depthOverride ?? depth;
    let startFrom = fromPly;
    if (depthOverride !== undefined && depthOverride !== depth) {
      set({ depth: depthOverride });
    }
    if (depthOverride !== undefined) {
      // Явный перезапуск — сбрасываем все оценки.
      runToken++;
      set({ analyses: new Array(fens.length).fill(undefined) });
      startFrom = 0;
    }
    const currentAnalyses = get().analyses;
    // Находим первую неанализированную позицию (не раньше startFrom).
    let firstUnanalyzed = -1;
    for (let i = startFrom; i < fens.length; i++) {
      if (!currentAnalyses[i]) {
        firstUnanalyzed = i;
        break;
      }
    }
    if (firstUnanalyzed === -1) {
      finishSummary(set, get);
      return;
    }
    const token = ++runToken;
    const total = fens.length - firstUnanalyzed;
    set({
      analyzing: true,
      engineStatus: 'analyzing',
      progressDone: 0,
      progressTotal: total,
      error: null,
    });

    const analyzeSequentially = async (): Promise<void> => {
      // Асинхронная инициализация движка.
      set({ engineStatus: 'loading' });
      try {
        await engine.ensureReady();
      } catch {
        if (token === runToken) {
          set({ analyzing: false, engineStatus: 'off', error: 'Не удалось загрузить движок Stockfish' });
        }
        return;
      }
      if (token !== runToken) return;

      for (let i = firstUnanalyzed; i < fens.length; i++) {
        if (token !== runToken) return;
        let result: PlyEval;
        const synth = syntheticEval(fens[i]);
        if (synth) {
          result = synth;
        } else {
          try {
            const r = await engine.evalPosition(fens[i], useDepth);
            if (token !== runToken) return;
            result = {
              cp: r.cp,
              mate: r.mate,
              bestUci: r.bestUci,
              pvUci: r.pvUci,
              pvSan: uciToSan(fens[i], r.pvUci),
              depth: r.depth,
              nodes: r.nodes,
              timeMs: r.timeMs,
            };
          } catch {
            if (token !== runToken) return;
            result = { cp: null, mate: null, bestUci: null, pvUci: [], pvSan: [], depth: 0, nodes: 0, timeMs: 0 };
          }
        }
        if (token !== runToken) return;
        set((state) => {
          const next = state.analyses.slice();
          next[i] = result;
          const nextMeta = state.moveMeta.slice();
          // Как только есть обе оценки, строим комментарий для хода, ведущего в эту позицию.
          if (i >= 1 && next[i - 1]) {
            const meta = buildMoveMeta({ fens: state.fens, sans: state.sans, analyses: next, ply: i, opening: state.opening ? { name: state.opening, prefixLen: state.openingPrefixLen } : null });
            if (meta) nextMeta[i - 1] = meta;
          }
          return { analyses: next, moveMeta: nextMeta, progressDone: i - firstUnanalyzed + 1 };
        });
        await new Promise((r) => setTimeout(r, 0)); // даём UI обновиться
      }
      if (token !== runToken) return;
      finishSummary(set, get);
      set({ analyzing: false, engineStatus: 'ready' });
    };

    void analyzeSequentially();
  },

  stopAnalysis: () => {
    runToken++;
    engine.stop();
    set({ analyzing: false, engineStatus: 'ready', progressTotal: 0 });
    finishSummary(set, get);
  },

  deepenCurrent: () => {
    const { fens, currentPly, analyzing, sans, analyses } = get();
    if (analyzing) return;
    const token = ++runToken;
    set({ analyzing: true, engineStatus: 'analyzing', progressTotal: 1, progressDone: 0 });
    (async () => {
      set({ engineStatus: 'loading' });
      try {
        await engine.ensureReady();
      } catch {
        set({ analyzing: false, engineStatus: 'off', error: 'Не удалось загрузить движок Stockfish' });
        return;
      }
      if (token !== runToken) return;
      const synth = syntheticEval(fens[currentPly]);
      let result: PlyEval;
      if (synth) {
        result = synth;
      } else {
        try {
          const r = await engine.evalPosition(fens[currentPly], 18);
          if (token !== runToken) return;
          result = {
            cp: r.cp,
            mate: r.mate,
            bestUci: r.bestUci,
            pvUci: r.pvUci,
            pvSan: uciToSan(fens[currentPly], r.pvUci),
            depth: r.depth,
            nodes: r.nodes,
            timeMs: r.timeMs,
          };
        } catch {
          set({ analyzing: false, engineStatus: 'ready', error: 'Движок не ответил на запрос' });
          return;
        }
      }
      if (token !== runToken) return;
      set((state) => {
        const next = state.analyses.slice();
        next[currentPly] = result;
        const nextMeta = state.moveMeta.slice();
        if (currentPly >= 1 && next[currentPly - 1]) {
          const meta = buildMoveMeta({ fens: state.fens, sans: state.sans, analyses: next, ply: currentPly, opening: state.opening ? { name: state.opening, prefixLen: state.openingPrefixLen } : null });
          if (meta) nextMeta[currentPly - 1] = meta;
        }
        if (currentPly + 1 < next.length && next[currentPly + 1]) {
          const meta = buildMoveMeta({ fens: state.fens, sans: state.sans, analyses: next, ply: currentPly + 1, opening: state.opening ? { name: state.opening, prefixLen: state.openingPrefixLen } : null });
          if (meta) nextMeta[currentPly] = meta;
        }
        return { analyses: next, moveMeta: nextMeta };
      });
      finishSummary(set, get);
      set({ analyzing: false, engineStatus: 'ready', progressTotal: 0 });
    })();
    void analyses;
    void sans;
  },

  clearError: () => set({ error: null }),
}));

// ---------- Вспомогательные функции ----------

type Setter = (partial: Partial<AnalysisStore> | ((s: AnalysisStore) => Partial<AnalysisStore>)) => void;
type Getter = () => AnalysisStore;

function finishSummary(set: Setter, get: Getter): void {
  const { sans, analyses, moveMeta, headers, opening, openingPrefixLen } = get();
  const analyzedCount = analyses.filter(Boolean).length;
  if (analyzedCount === 0) return;
  const summary = computeSummary({
    sans,
    moveMeta,
    analyses,
    headers,
    opening: opening ? { name: opening, prefixLen: openingPrefixLen } : null,
  });
  set({ summary });
}

/** Переводит PV из UCI в SAN (насколько получается). */
function uciToSan(fen: string, pvUci: string[]): string[] {
  if (!pvUci.length) return [];
  const chess = new Chess(fen);
  const out: string[] = [];
  for (const uci of pvUci.slice(0, 6)) {
    if (uci.length < 4) break;
    try {
      const mv = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4, 5) || undefined });
      if (!mv) break;
      out.push(mv.san);
    } catch {
      break;
    }
  }
  return out;
}
