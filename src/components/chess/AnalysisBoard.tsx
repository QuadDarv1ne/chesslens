'use client';

// Центральный компонент: доска + полоса оценки + игроки + навигация.
import { useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import type { PieceDropHandlerArgs, PieceHandlerArgs } from 'react-chessboard';
import {
  ChevronFirst,
  ChevronLeft,
  ChevronRight,
  ChevronLast,
  FlipHorizontal2,
  Copy,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAnalysisStore } from '@/lib/store';
import { evalToWin, formatEval } from '@/lib/chess/analysis';
import { toast } from 'sonner';

const PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function materialDiff(fen: string): number {
  try {
    const board = new Chess(fen).board();
    let diff = 0;
    for (const row of board) {
      for (const sq of row) {
        if (!sq) continue;
        diff += (sq.color === 'w' ? 1 : -1) * (PIECE_VALUE[sq.type] ?? 0);
      }
    }
    return diff;
  } catch {
    return 0;
  }
}

function PlayerStrip({
  color,
  name,
  rating,
  accuracy,
  material,
}: {
  color: 'white' | 'black';
  name: string;
  rating?: number | null;
  accuracy?: number | null;
  material: number;
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-1 py-1.5">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={`h-4 w-4 shrink-0 rounded-sm border ${color === 'white' ? 'bg-zinc-100 border-zinc-400' : 'bg-zinc-900 border-zinc-600'}`}
          aria-hidden
        />
        <span className="truncate text-sm font-medium text-foreground">
          {name}
          {rating ? <span className="ml-1 text-muted-foreground">({rating})</span> : null}
        </span>
        {accuracy !== null && accuracy !== undefined ? (
          <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-700 night:text-emerald-400">
            Точность {accuracy.toFixed(1)}%
          </span>
        ) : null}
      </div>
      {material > 0 ? (
        <span className="shrink-0 text-xs font-semibold text-muted-foreground">+{material}</span>
      ) : null}
    </div>
  );
}

export function AnalysisBoard() {
  const fens = useAnalysisStore((s) => s.fens);
  const fromTos = useAnalysisStore((s) => s.fromTos);
  const headers = useAnalysisStore((s) => s.headers);
  const analyses = useAnalysisStore((s) => s.analyses);
  const summary = useAnalysisStore((s) => s.summary);
  const sansCount = useAnalysisStore((s) => s.sans.length);
  const currentPly = useAnalysisStore((s) => s.currentPly);
  const orientation = useAnalysisStore((s) => s.orientation);
  const goTo = useAnalysisStore((s) => s.goTo);
  const step = useAnalysisStore((s) => s.step);
  const goToStart = useAnalysisStore((s) => s.goToStart);
  const goToEnd = useAnalysisStore((s) => s.goToEnd);
  const flip = useAnalysisStore((s) => s.flip);
  const addMove = useAnalysisStore((s) => s.addMove);

  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);
  // Выделение привязано к номеру позиции: при смене хода оно автоматически сбрасывается,
  // без setState в эффекте (подсветка не «залипает» на прошлом ходе).
  const [selection, setSelection] = useState<{ square: string; ply: number } | null>(null);
  const selectedSquare = selection && selection.ply === currentPly ? selection.square : null;
  const setSelectedSquare = (square: string | null) => setSelection(square ? { square, ply: currentPly } : null);

  const fen = fens[Math.min(currentPly, fens.length - 1)];
  const currentEval = analyses[currentPly];

  const whiteWin = evalToWin(currentEval, 'w');

  const squareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    const last = currentPly > 0 ? fromTos[currentPly - 1] : undefined;
    if (last) {
      const bg = 'rgba(16,185,129,0.35)';
      styles[last.from] = { backgroundColor: bg };
      styles[last.to] = { backgroundColor: bg };
    }
    // Выбранная фигура и её легальные ходы.
    if (selectedSquare) {
      styles[selectedSquare] = { ...styles[selectedSquare], boxShadow: 'inset 0 0 0 3px rgba(16,185,129,0.8)' };
      try {
        const probe = new Chess(fen);
        const moves = probe.moves({ square: selectedSquare as never, verbose: true });
        for (const m of moves) {
          styles[m.to] = {
            ...styles[m.to],
            background:
              'radial-gradient(circle, rgba(16,185,129,0.55) 18%, transparent 22%)',
          };
        }
      } catch {
        // пусто
      }
    }
    return styles;
  }, [currentPly, fromTos, selectedSquare, fen]);

  const arrows = useMemo(() => {
    const best = currentEval?.bestUci;
    if (!best || best.length < 4) return [];
    return [
      {
        startSquare: best.slice(0, 2),
        endSquare: best.slice(2, 4),
        color: 'rgba(16,185,129,0.85)',
      },
    ];
  }, [currentEval]);

  const topColor = orientation === 'white' ? 'black' : 'white';
  const bottomColor = orientation === 'white' ? 'white' : 'black';

  const playerName = (color: 'white' | 'black') => {
    const key = color === 'white' ? 'White' : 'Black';
    const h = headers[key];
    if (h && h !== '?' && h !== '') return h;
    return color === 'white' ? 'Белые' : 'Чёрные';
  };
  const playerRating = (color: 'white' | 'black') => {
    const key = color === 'white' ? 'WhiteElo' : 'BlackElo';
    const h = headers[key];
    const n = h ? parseInt(h, 10) : NaN;
    return Number.isFinite(n) ? n : null;
  };
  const playerAccuracy = (color: 'white' | 'black') => {
    if (!summary) return null;
    // Точность показываем только если в партии есть ходы.
    if (sansCount === 0) return null;
    return color === 'white' ? summary.white.accuracy : summary.black.accuracy;
  };

  const topMaterial = topColor === 'white' ? materialDiff(fen) : -materialDiff(fen);
  const bottomMaterial = bottomColor === 'white' ? materialDiff(fen) : -materialDiff(fen);

  // Общая логика попытки хода (для перетаскивания и кликов).
  const tryMove = (sourceSquare: string, targetSquare: string): boolean => {
    let probe: Chess;
    try {
      probe = new Chess(fen);
    } catch {
      return false;
    }
    // Проверка на превращение пешки.
    const moving = probe.get(sourceSquare as never);
    const isPawn = moving?.type === 'p';
    const toLastRank = targetSquare[1] === '8' || targetSquare[1] === '1';
    if (isPawn && toLastRank) {
      try {
        probe.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
        setPendingPromotion({ from: sourceSquare, to: targetSquare });
        return true;
      } catch {
        return false;
      }
    }
    return addMove(sourceSquare, targetSquare);
  };

  const handlePieceDrop = ({ piece, sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean => {
    if (!targetSquare) return false;
    const pieceColor = piece.pieceType[0] === 'w' ? 'w' : 'b';
    let turn: 'w' | 'b' = 'w';
    try {
      turn = new Chess(fen).turn();
    } catch {
      return false;
    }
    if (pieceColor !== turn) return false;
    return tryMove(sourceSquare, targetSquare);
  };

  // Клик по клетке: выбор фигуры и ход кликом (удобно на мобильных).
  const handleSquareClick = ({ square }: { square: string }): void => {
    let probe: Chess;
    try {
      probe = new Chess(fen);
    } catch {
      return;
    }
    if (!selectedSquare) {
      const piece = probe.get(square as never);
      if (piece && piece.color === probe.turn()) setSelectedSquare(square);
      return;
    }
    if (square === selectedSquare) {
      setSelectedSquare(null);
      return;
    }
    // Клик по другой своей фигуре — переключаем выбор, а не пытаемся "съесть" её.
    const target = probe.get(square as never);
    if (target && target.color === probe.turn()) {
      setSelectedSquare(square);
      return;
    }
    tryMove(selectedSquare, square);
    setSelectedSquare(null);
  };

  const evalLabel = formatEval(currentEval);

  return (
    <div className="rounded-xl border border-border bg-panel p-3 sm:p-4">
      {/* Игрок сверху */}
      <PlayerStrip
        color={topColor}
        name={playerName(topColor)}
        rating={playerRating(topColor)}
        accuracy={playerAccuracy(topColor)}
        material={Math.max(0, topMaterial)}
      />

      {/* Доска + полоса оценки */}
      <div className="flex items-stretch gap-2">
        {/* Полоса оценки */}
        <div
          className="relative w-6 shrink-0 overflow-hidden rounded-md sm:w-7"
          style={{ background: 'var(--eval-black)' }}
        >
          <div
            className="absolute inset-x-0 bottom-0 transition-all duration-500"
            style={{ height: `${whiteWin}%`, background: 'var(--eval-white)' }}
          />
          <div className="absolute inset-x-0 top-1/2 h-px bg-emerald-500/60" />
          <div
            className={`absolute inset-x-0 top-1 z-10 text-center text-[10px] font-bold leading-none ${whiteWin >= 50 ? 'text-zinc-700' : 'text-zinc-200'}`}
          >
            {evalLabel}
          </div>
        </div>

        {/* Доска */}
        <div className="relative min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[640px]">
            <Chessboard
              options={{
                id: 'analysis-board',
                position: fen,
                boardOrientation: orientation,
                animationDurationInMs: 180,
                allowDrawingArrows: true,
                arrows,
                squareStyles: squareStyles,
                darkSquareStyle: { backgroundColor: 'var(--board-dark)' },
                lightSquareStyle: { backgroundColor: 'var(--board-light)' },
                onPieceDrop: handlePieceDrop,
                onSquareClick: handleSquareClick,
                onPieceClick: ({ square }: PieceHandlerArgs) => {
                  if (square) handleSquareClick({ square });
                },
              }}
            />
          </div>

          {/* Диалог превращения */}
          {pendingPromotion ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70">
              <div className="rounded-lg border border-border bg-panel-input p-3 shadow-xl">
                <div className="mb-2 flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-foreground/90">Во что превратить пешку?</span>
                  <button
                    onClick={() => setPendingPromotion(null)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Отменить превращение"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex gap-2">
                  {(['q', 'r', 'b', 'n'] as const).map((p) => (
                    <button
                      key={p}
                      className="flex h-12 w-12 items-center justify-center rounded-md border border-border bg-panel-input text-3xl text-foreground hover:border-emerald-500 hover:bg-accent"
                      onClick={() => {
                        const pp = pendingPromotion;
                        setPendingPromotion(null);
                        addMove(pp.from, pp.to, p);
                      }}
                      aria-label={`Превратить в ${p === 'q' ? 'ферзя' : p === 'r' ? 'ладью' : p === 'b' ? 'слона' : 'коня'}`}
                    >
                      {p === 'q' ? '♕' : p === 'r' ? '♖' : p === 'b' ? '♗' : '♘'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Игрок снизу */}
      <PlayerStrip
        color={bottomColor}
        name={playerName(bottomColor)}
        rating={playerRating(bottomColor)}
        accuracy={playerAccuracy(bottomColor)}
        material={Math.max(0, bottomMaterial)}
      />

      {/* Навигация */}
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={goToStart} disabled={currentPly === 0} aria-label="В начало" title="В начало (Home)">
            <ChevronFirst className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => step(-1)} disabled={currentPly === 0} aria-label="Назад" title="Назад (←)">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => step(1)} disabled={currentPly >= fens.length - 1} aria-label="Вперёд" title="Вперёд (→)">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={goToEnd} disabled={currentPly >= fens.length - 1} aria-label="В конец" title="В конец (End)">
            <ChevronLast className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={flip} aria-label="Перевернуть доску" title="Перевернуть доску">
            <FlipHorizontal2 className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Позиция {currentPly} из {fens.length - 1}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              navigator.clipboard.writeText(fen).then(
                () => toast.success('FEN скопирован'),
                () => toast.error('Не удалось скопировать FEN'),
              );
            }}
            aria-label="Скопировать FEN"
            title="Скопировать FEN"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
