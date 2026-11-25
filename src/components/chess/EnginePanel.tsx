'use client';

// Панель движка: статус, оценка, линия, управление анализом.
import { Play, Square, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAnalysisStore } from '@/lib/store';
import { formatEval } from '@/lib/chess/analysis';

const DEPTHS = [10, 12, 14, 16, 18];

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  off: { text: 'Выключен', color: 'bg-zinc-500' },
  loading: { text: 'Загрузка движка…', color: 'bg-amber-400 animate-pulse' },
  ready: { text: 'Stockfish 19 готов', color: 'bg-emerald-500' },
  analyzing: { text: 'Анализирует…', color: 'bg-emerald-400 animate-pulse' },
};

export function EnginePanel() {
  const engineStatus = useAnalysisStore((s) => s.engineStatus);
  const depth = useAnalysisStore((s) => s.depth);
  const analyzing = useAnalysisStore((s) => s.analyzing);
  const progressDone = useAnalysisStore((s) => s.progressDone);
  const progressTotal = useAnalysisStore((s) => s.progressTotal);
  const analyses = useAnalysisStore((s) => s.analyses);
  const currentPly = useAnalysisStore((s) => s.currentPly);
  const setDepth = useAnalysisStore((s) => s.setDepth);
  const startAnalysis = useAnalysisStore((s) => s.startAnalysis);
  const stopAnalysis = useAnalysisStore((s) => s.stopAnalysis);
  const deepenCurrent = useAnalysisStore((s) => s.deepenCurrent);

  const status = STATUS_LABEL[engineStatus] ?? STATUS_LABEL.off;
  const currentEval = analyses[currentPly];

  const nps =
    currentEval && currentEval.timeMs > 0
      ? Math.round((currentEval.nodes / currentEval.timeMs) * 1000)
      : null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-[#12151b] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-300">Движок</h3>
        <span className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span className={`h-2 w-2 rounded-full ${status.color}`} />
          {status.text}
          {analyzing && progressTotal > 1 ? ` ${progressDone}/${progressTotal}` : ''}
        </span>
      </div>

      {/* Оценка текущей позиции */}
      <div className="mb-3 flex items-baseline gap-3">
        <span className="font-mono text-2xl font-bold text-zinc-100">{formatEval(currentEval)}</span>
        {currentEval ? (
          <span className="text-xs text-zinc-500">
            глубина {currentEval.depth}
            {currentEval.nodes > 0 ? ` · ${currentEval.nodes.toLocaleString('ru-RU')} узлов` : ''}
            {nps ? ` · ${(nps / 1000).toFixed(0)} тыс. узлов/с` : ''}
          </span>
        ) : (
          <span className="text-xs text-zinc-500">позиция ещё не оценена</span>
        )}
      </div>

      {/* Линия */}
      {currentEval?.pvSan?.length ? (
        <div className="mb-3 rounded-lg bg-[#0d1015] px-3 py-2">
          <span className="text-[10px] uppercase tracking-wide text-zinc-600">Лучшая линия</span>
          <p className="mt-0.5 font-mono text-xs leading-relaxed text-emerald-300">
            {currentEval.pvSan.join(' ')}
          </p>
        </div>
      ) : null}

      {/* Управление */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={String(depth)} onValueChange={(v) => setDepth(parseInt(v, 10))}>
          <SelectTrigger className="h-9 w-[130px] border-zinc-700 bg-[#181d24] text-zinc-300" aria-label="Глубина анализа">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-zinc-700 bg-[#181d24] text-zinc-300">
            {DEPTHS.map((d) => (
              <SelectItem key={d} value={String(d)}>
                Глубина {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {analyzing ? (
          <Button
            variant="outline"
            className="h-9 border-zinc-700 bg-[#181d24] text-zinc-300 hover:bg-[#20262f]"
            onClick={stopAnalysis}
          >
            <Square className="mr-1.5 h-3.5 w-3.5" /> Стоп
          </Button>
        ) : (
          <Button
            className="h-9 bg-emerald-600 text-white hover:bg-emerald-500"
            onClick={() => startAnalysis(depth)}
          >
            <Play className="mr-1.5 h-3.5 w-3.5" /> Анализировать партию
          </Button>
        )}

        <Button
          variant="outline"
          className="h-9 border-zinc-700 bg-[#181d24] text-zinc-300 hover:bg-[#20262f]"
          disabled={analyzing}
          onClick={deepenCurrent}
          title="Углублённый поиск (глубина 18) для текущей позиции"
        >
          <Search className="mr-1.5 h-3.5 w-3.5" /> Углубить позицию
        </Button>
      </div>

      {analyzing && progressTotal > 0 ? (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#0d1015]">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-200"
              style={{ width: `${Math.round((progressDone / progressTotal) * 100)}%` }}
            />
          </div>
        </div>
      ) : null}

      {!analyzing && engineStatus === 'off' ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-600">
          <Loader2 className="h-3 w-3 animate-spin" /> Движок загрузится при первом анализе (~1.7 МБ WASM).
        </p>
      ) : null}
    </div>
  );
}
