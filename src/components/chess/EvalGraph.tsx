'use client';

// График оценки партии (кликабельный): чем выше — тем лучше для белых.
import { useMemo, useRef, useState } from 'react';
import { useAnalysisStore } from '@/lib/store';
import { evalToWin, formatEval } from '@/lib/chess/analysis';

const W = 600;
const H = 130;
const MID = H / 2;

export function EvalGraph() {
  const analyses = useAnalysisStore((s) => s.analyses);
  const fens = useAnalysisStore((s) => s.fens);
  const sans = useAnalysisStore((s) => s.sans);
  const currentPly = useAnalysisStore((s) => s.currentPly);
  const goTo = useAnalysisStore((s) => s.goTo);
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverPly, setHoverPly] = useState<number | null>(null);

  const points = useMemo(() => {
    const n = analyses.length;
    if (n < 2) return [];
    const arr: { x: number; y: number; win: number; ply: number; defined: boolean }[] = [];
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * W;
      const e = analyses[i];
      const win = e ? evalToWin(e, 'w') : 50;
      arr.push({ x, y: H - (win / 100) * H, win, ply: i, defined: !!e });
    }
    return arr;
  }, [analyses]);

  const segments = useMemo(() => {
    const segs: { d: string; fill: string }[] = [];
    const pts = points.filter((p) => p.defined);
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const avg = (a.win + b.win) / 2;
      const yMid = H - MID;
      // Область между кривой и средней линией: выше середины — территория белых.
      // Цвета берутся из темы оформления (var(--graph-white/black)).
      const fill = avg >= 50 ? 'var(--graph-white)' : 'var(--graph-black)';
      const d =
        `M ${a.x} ${yMid} L ${a.x} ${a.y} L ${b.x} ${b.y} L ${b.x} ${yMid} Z`;
      segs.push({ d, fill });
    }
    return segs;
  }, [points]);

  const linePath = useMemo(() => {
    const pts = points.filter((p) => p.defined);
    if (pts.length === 0) return '';
    return 'M ' + pts.map((p) => `${p.x} ${p.y}`).join(' L ');
  }, [points]);

  const plyFromEvent = (clientX: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const n = analyses.length;
    if (n < 2) return null;
    return Math.round(ratio * (n - 1));
  };

  const handlePointer = (e: React.PointerEvent, click: boolean) => {
    const ply = plyFromEvent(e.clientX);
    if (ply === null) return;
    setHoverPly(ply);
    if (click) goTo(ply);
  };

  const markerPly = hoverPly ?? currentPly;
  const markerPoint = points[markerPly];
  const markerEval = analyses[markerPly];
  const hasData = points.some((p) => p.defined);

  return (
    <div className="rounded-xl border border-border bg-panel p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground/90">График оценки</h3>
        {hasData && markerEval ? (
          <span className="text-xs text-muted-foreground">
            {markerPly > 0 && sans[markerPly - 1] ? (
              <span className="font-mono">
                {Math.ceil(markerPly / 2)}
                {markerPly % 2 === 1 ? '.' : '...'} {sans[markerPly - 1]} ·{' '}
              </span>
            ) : null}
            <span className="font-semibold text-foreground">{formatEval(markerEval)}</span>
          </span>
        ) : null}
      </div>
      <div
        className="relative cursor-crosshair select-none"
        onPointerDown={(e) => handlePointer(e, true)}
        onPointerMove={(e) => handlePointer(e, false)}
        onPointerLeave={() => setHoverPly(null)}
        role="slider"
        aria-label="Навигация по графику оценки"
        aria-valuenow={currentPly}
        aria-valuemin={0}
        aria-valuemax={Math.max(0, fens.length - 1)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') goTo(Math.max(0, currentPly - 1));
          if (e.key === 'ArrowRight') goTo(Math.min(fens.length - 1, currentPly + 1));
        }}
      >
        {hasData ? (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="block h-[130px] w-full rounded-md bg-panel-soft"
          >
            {/* середина */}
            <line x1={0} y1={MID} x2={W} y2={MID} style={{ stroke: 'var(--graph-mid)' }} strokeWidth={1} strokeDasharray="4 4" />
            {/* области перевеса */}
            {segments.map((s, i) => (
              <path key={i} d={s.d} style={{ fill: s.fill }} opacity={0.9} />
            ))}
            {/* кривая */}
            <path d={linePath} fill="none" stroke="#10b981" strokeWidth={2} />
            {/* текущая позиция */}
            {markerPoint ? (
              <>
                <line x1={markerPoint.x} y1={0} x2={markerPoint.x} y2={H} stroke="#10b981" strokeWidth={1} opacity={0.6} />
                <circle cx={markerPoint.x} cy={markerPoint.y} r={4} fill="#10b981" style={{ stroke: 'var(--panel-soft)' }} strokeWidth={1.5} />
              </>
            ) : null}
          </svg>
        ) : (
          <div className="flex h-[130px] items-center justify-center rounded-md bg-panel-soft text-sm text-muted-foreground/70">
            График появится после анализа партии
          </div>
        )}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground/70">
        <span>▲ перевес белых</span>
        <span>▼ перевес чёрных</span>
      </div>
    </div>
  );
}
