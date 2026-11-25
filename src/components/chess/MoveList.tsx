'use client';

// Список ходов с иконками классификации (как в известных сервисах анализа).
import { useEffect, useRef } from 'react';
import { BookOpen } from 'lucide-react';
import { useAnalysisStore } from '@/lib/store';
import { CLASSIFICATION_META, Classification } from '@/lib/chess/analysis';

function ClassBadge({ cls }: { cls: Classification }) {
  const meta = CLASSIFICATION_META[cls];
  return (
    <span
      className="inline-flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[9px] font-bold leading-none"
      style={{ color: meta.color, backgroundColor: meta.bg }}
      title={meta.label}
    >
      {cls === 'book' ? <BookOpen className="h-2.5 w-2.5" /> : meta.symbol}
    </span>
  );
}

export function MoveList() {
  const sans = useAnalysisStore((s) => s.sans);
  const moveMeta = useAnalysisStore((s) => s.moveMeta);
  const currentPly = useAnalysisStore((s) => s.currentPly);
  const headers = useAnalysisStore((s) => s.headers);
  const opening = useAnalysisStore((s) => s.opening);
  const goTo = useAnalysisStore((s) => s.goTo);

  const listRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'nearest' });
  }, [currentPly]);

  // Строим строки: номер, ход белых, ход чёрных.
  const rows: { no: number; whitePly?: number; blackPly?: number }[] = [];
  for (let p = 1; p <= sans.length; p++) {
    const no = Math.ceil(p / 2);
    if (p % 2 === 1) {
      rows.push({ no, whitePly: p, blackPly: p + 1 <= sans.length ? p + 1 : undefined });
    } else if (p === sans.length) {
      // чёрный ход без пары после обрезки — пропускаем, добавится в предыдущую строку
    }
  }

  const result = headers.Result ?? '';
  const resultLabel =
    result === '1-0' ? 'Победа белых' : result === '0-1' ? 'Победа чёрных' : result === '½-½' || result === '1/2-1/2' ? 'Ничья' : '';

  const moveButton = (ply: number, isWhite: boolean) => {
    const meta = moveMeta[ply - 1];
    const active = currentPly === ply;
    return (
      <button
        key={ply}
        ref={active ? currentRef : undefined}
        onClick={() => goTo(ply)}
        className={`group flex items-center gap-1 rounded px-1.5 py-0.5 text-left text-sm font-medium transition-colors ${
          active ? 'bg-emerald-600/25 text-emerald-300' : 'text-zinc-300 hover:bg-zinc-800/80'
        }`}
      >
        <span>{sans[ply - 1]}</span>
        {meta ? <ClassBadge cls={meta.classification} /> : null}
        <span className="sr-only">{isWhite ? 'ход белых' : 'ход чёрных'}</span>
      </button>
    );
  };

  if (sans.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-[#12151b] p-4">
        <h3 className="mb-2 text-sm font-semibold text-zinc-300">Ходы партии</h3>
        <p className="text-sm text-zinc-500">
          Загрузите партию (PGN, lichess, chess.com) или сделайте ходы на доске.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-[#12151b]">
      <div className="flex flex-wrap items-center justify-between gap-1 border-b border-zinc-800 px-3 py-2">
        <h3 className="text-sm font-semibold text-zinc-300">Ходы партии</h3>
        <div className="flex items-center gap-1.5">
          {opening ? (
            <span className="max-w-[220px] truncate rounded-full bg-[#1d232c] px-2 py-0.5 text-xs text-amber-300/90" title={opening}>
              {opening}
            </span>
          ) : null}
          {resultLabel ? (
            <span className="rounded-full bg-[#1d232c] px-2 py-0.5 text-xs text-zinc-400">{resultLabel}</span>
          ) : null}
        </div>
      </div>
      <div className="scroll-slim max-h-[300px] overflow-y-auto p-2">
        <div className="grid grid-cols-[2.2rem_1fr_1fr] items-center gap-x-1 gap-y-0.5">
          {rows.map((row) => (
            <div key={row.no} className="contents">
              <span className="select-none pr-1 text-right text-xs text-zinc-600">{row.no}.</span>
              {row.whitePly ? moveButton(row.whitePly, true) : <span />}
              {row.blackPly ? moveButton(row.blackPly, false) : <span />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
