'use client';

// Список ходов с иконками классификации (как в известных сервисах анализа).
import { useEffect, useMemo, useRef } from 'react';
import { BookOpen } from 'lucide-react';
import { useAnalysisStore } from '@/lib/store';
import { Classification } from '@/lib/chess/analysis';
import { useClassificationMeta } from '@/lib/theme';

function ClassBadge({ cls }: { cls: Classification }) {
  const metaMap = useClassificationMeta();
  const meta = metaMap[cls];
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
  const fens = useAnalysisStore((s) => s.fens);
  const moveMeta = useAnalysisStore((s) => s.moveMeta);
  const currentPly = useAnalysisStore((s) => s.currentPly);
  const headers = useAnalysisStore((s) => s.headers);
  const opening = useAnalysisStore((s) => s.opening);
  const goTo = useAnalysisStore((s) => s.goTo);

  const listRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Прокручиваем только внутренний контейнер списка.
    // scrollIntoView здесь нельзя: он прокручивает и саму страницу,
    // из-за чего при каждом ходе страница «дёргалась» вниз к списку ходов.
    const list = listRef.current;
    const el = currentRef.current;
    if (!list || !el) return;
    const listRect = list.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    if (elRect.top < listRect.top) {
      list.scrollTop += elRect.top - listRect.top;
    } else if (elRect.bottom > listRect.bottom) {
      list.scrollTop += elRect.bottom - listRect.bottom;
    }
  }, [currentPly]);

  // Группируем полуходы в строки по номеру хода — пересчитываем только при изменении партии.
  // startTurn/startMoveNo вычисляются внутри, чтобы зависимости useMemo (sans, fens)
  // совпадали с фактическими.
  const rows = useMemo(() => {
    const startTurn: 'w' | 'b' = fens[0]?.split(' ')[1] === 'b' ? 'b' : 'w';
    const parsedNo = parseInt(fens[0]?.split(' ')[5] ?? '1', 10);
    const startMoveNo = Number.isFinite(parsedNo) && parsedNo > 0 ? parsedNo : 1;
    const isWhitePly = (p: number) => (startTurn === 'w' ? p % 2 === 1 : p % 2 === 0);
    const moveNo = (p: number) =>
      startMoveNo + (startTurn === 'w' ? Math.floor((p - 1) / 2) : Math.floor(p / 2));

    const rowMap = new Map<number, { no: number; whitePly?: number; blackPly?: number }>();
    for (let p = 1; p <= sans.length; p++) {
      const no = moveNo(p);
      const row = rowMap.get(no) ?? { no };
      if (isWhitePly(p)) row.whitePly = p;
      else row.blackPly = p;
      rowMap.set(no, row);
    }
    return Array.from(rowMap.values()).sort((a, b) => a.no - b.no);
  }, [sans, fens]);

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
          active ? 'bg-emerald-600/20 text-emerald-700 night:text-emerald-300' : 'text-foreground/90 hover:bg-accent'
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
      <div className="rounded-xl border border-border bg-panel p-4">
        <h3 className="mb-2 text-sm font-semibold text-foreground/90">Ходы партии</h3>
        <p className="text-sm text-muted-foreground">
          Загрузите партию (PGN, lichess, chess.com) или сделайте ходы на доске.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-1 border-b border-border px-3 py-2">
        <h3 className="text-sm font-semibold text-foreground/90">Ходы партии</h3>
        <div className="flex items-center gap-1.5">
          {opening ? (
            <span className="max-w-[220px] truncate rounded-full bg-accent px-2 py-0.5 text-xs text-opening" title={opening}>
              {opening}
            </span>
          ) : null}
          {resultLabel ? (
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-muted-foreground">{resultLabel}</span>
          ) : null}
        </div>
      </div>
      <div ref={listRef} className="scroll-slim max-h-[300px] overflow-y-auto p-2">
        <div className="grid grid-cols-[2.2rem_1fr_1fr] items-center gap-x-1 gap-y-0.5">
          {rows.map((row) => (
            <div key={row.no} className="contents">
              <span className="select-none pr-1 text-right text-xs text-muted-foreground/70">{row.no}.</span>
              {row.whitePly ? moveButton(row.whitePly, true) : <span />}
              {row.blackPly ? moveButton(row.blackPly, false) : <span />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
