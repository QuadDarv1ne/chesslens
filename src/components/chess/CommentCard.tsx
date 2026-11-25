'use client';

// Карточка комментария к текущему ходу: значок, объяснение словами, потери.
import { BookOpen } from 'lucide-react';
import { useAnalysisStore } from '@/lib/store';
import { formatPawns } from '@/lib/chess/analysis';
import { useClassificationMeta } from '@/lib/theme';

export function CommentCard() {
  const metaMap = useClassificationMeta();
  const currentPly = useAnalysisStore((s) => s.currentPly);
  const sans = useAnalysisStore((s) => s.sans);
  const moveMeta = useAnalysisStore((s) => s.moveMeta);
  const analyzing = useAnalysisStore((s) => s.analyzing);
  const fens = useAnalysisStore((s) => s.fens);
  const opening = useAnalysisStore((s) => s.opening);

  const meta = currentPly >= 1 ? moveMeta[currentPly - 1] : undefined;
  const moveNo = Math.ceil(currentPly / 2);
  const isWhite = currentPly % 2 === 1;

  return (
    <div className="rounded-xl border border-border bg-panel p-4">
      <h3 className="mb-2 text-sm font-semibold text-foreground/90">Разбор хода словами</h3>
      {currentPly === 0 ? (
        <p className="text-sm text-muted-foreground">
          Начальная позиция. Дебют: <span className="text-opening">{opening ?? 'не определён'}</span>.
          Перемещайтесь по ходам стрелками ← → — для каждого хода будет объяснение.
        </p>
      ) : meta ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold"
              style={{ color: metaMap[meta.classification].color, backgroundColor: metaMap[meta.classification].bg }}
            >
              {meta.classification === 'book' ? <BookOpen className="h-3 w-3" /> : metaMap[meta.classification].symbol}
              {metaMap[meta.classification].label}
            </span>
            <span className="font-mono text-sm text-foreground">
              {moveNo}
              {isWhite ? '.' : '...'} {sans[currentPly - 1]}
            </span>
            <span className="ml-auto text-xs text-muted-foreground">
              Точность хода: {meta.accuracy.toFixed(1)}%
            </span>
          </div>
          <p className="text-sm leading-relaxed text-foreground/90">{meta.comment}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {meta.cpLoss !== null ? <span>Потеря перевеса: {formatPawns(meta.cpLoss)} п.</span> : null}
            {meta.bestSan ? <span>Рекомендация движка: <span className="font-mono text-foreground/90">{meta.bestSan}</span></span> : null}
          </div>
        </div>
      ) : analyzing ? (
        <p className="text-sm text-muted-foreground">Движок считает эту позицию — комментарий появится через пару секунд…</p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Для этого хода ещё нет оценки. Запустите анализ партии в панели движка.
        </p>
      )}
      {currentPly === fens.length - 1 && fens.length > 1 && sans.length > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground/70">Это последняя позиция. Вы можете продолжить партию, сделав ход на доске.</p>
      ) : null}
    </div>
  );
}
