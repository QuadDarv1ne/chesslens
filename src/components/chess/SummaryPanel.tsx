'use client';

// Сводка по партии: точность игроков, счётчики ходов, дебют, острота.
import { useAnalysisStore } from '@/lib/store';
import { CLASSIFICATION_META, Classification } from '@/lib/chess/analysis';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

const SHOWN: Classification[] = ['brilliant', 'best', 'inaccuracy', 'mistake', 'blunder', 'miss'];

function PlayerRow({
  label,
  name,
  accuracy,
  counts,
}: {
  label: string;
  name: string;
  accuracy: number | null;
  counts: Partial<Record<Classification, number>> | null;
}) {
  return (
    <div className="flex-1">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 truncate text-sm font-medium text-zinc-200">
          <span
            className={`h-3 w-3 shrink-0 rounded-sm border ${label === 'white' ? 'border-zinc-400 bg-zinc-100' : 'border-zinc-600 bg-zinc-900'}`}
          />
          {name}
        </span>
        {accuracy !== null ? (
          <span className="font-mono text-sm font-bold text-emerald-400">{accuracy.toFixed(1)}%</span>
        ) : (
          <Skeleton className="h-4 w-10" />
        )}
      </div>
      {accuracy !== null ? (
        <Progress value={accuracy} className="h-1.5 bg-[#0d1015] [&>div]:bg-emerald-500" />
      ) : null}
      {counts ? (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {SHOWN.map((cls) => {
            const n = counts[cls] ?? 0;
            if (!n) return null;
            const meta = CLASSIFICATION_META[cls];
            return (
              <span
                key={cls}
                className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                style={{ color: meta.color, backgroundColor: meta.bg }}
                title={meta.label}
              >
                {meta.symbol}
                {n}
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function SummaryPanel() {
  const summary = useAnalysisStore((s) => s.summary);
  const opening = useAnalysisStore((s) => s.opening);
  const headers = useAnalysisStore((s) => s.headers);
  const analyzing = useAnalysisStore((s) => s.analyzing);
  const hasMoves = useAnalysisStore((s) => s.sans.length > 0);

  const result = headers.Result ?? '';
  const resultLabel =
    result === '1-0' ? '1–0' : result === '0-1' ? '0–1' : result === '½-½' || result === '1/2-1/2' ? '½–½' : '';

  return (
    <div className="rounded-xl border border-zinc-800 bg-[#12151b] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-300">Итоги партии</h3>
        {resultLabel ? <span className="text-sm font-bold text-zinc-400">{resultLabel}</span> : null}
      </div>

      {opening ? (
        <div className="mb-3 rounded-lg bg-[#0d1015] px-3 py-2 text-sm">
          <span className="text-[10px] uppercase tracking-wide text-zinc-600">Дебют</span>
          <p className="mt-0.5 text-amber-300/90">{opening}</p>
        </div>
      ) : null}

      <div className="flex gap-6">
        <PlayerRow
          label="white"
          name={summary?.white.name ?? 'Белые'}
          accuracy={summary && hasMoves ? summary.white.accuracy : null}
          counts={summary && hasMoves ? summary.white.counts : null}
        />
        <PlayerRow
          label="black"
          name={summary?.black.name ?? 'Чёрные'}
          accuracy={summary && hasMoves ? summary.black.accuracy : null}
          counts={summary && hasMoves ? summary.black.counts : null}
        />
      </div>

      {summary ? (
        <div className="mt-3 border-t border-zinc-800 pt-3">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-zinc-400">Острота партии</span>
            <span className="font-mono font-semibold text-zinc-200">{Math.round(summary.sharpness)}/100</span>
          </div>
          <Progress value={summary.sharpness} className="h-1.5 bg-[#0d1015] [&>div]:bg-amber-500" />
          <p className="mt-1.5 text-[10px] leading-relaxed text-zinc-600">
            Оценивает, насколько позиции были взвинчены: близость оценки к равенству и размах колебаний оценки по ходам.
          </p>
        </div>
      ) : analyzing ? (
        <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          Движок считает позиции — итоги появятся после анализа…
        </div>
      ) : null}
    </div>
  );
}
