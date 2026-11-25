'use client';

// ChessLens — анализ шахматных партий в браузере (Stockfish 19 WASM).
import { useEffect, useRef, useState } from 'react';
import { Crown, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { AnalysisBoard } from '@/components/chess/AnalysisBoard';
import { MoveList } from '@/components/chess/MoveList';
import { EvalGraph } from '@/components/chess/EvalGraph';
import { EnginePanel } from '@/components/chess/EnginePanel';
import { SummaryPanel } from '@/components/chess/SummaryPanel';
import { CommentCard } from '@/components/chess/CommentCard';
import { ImportDialog } from '@/components/chess/ImportDialog';
import { useAnalysisStore } from '@/lib/store';
import { SAMPLE_GAMES } from '@/lib/chess/samples';
import { toast } from 'sonner';

export default function Home() {
  const [importOpen, setImportOpen] = useState(false);
  const loadFromPgn = useAnalysisStore((s) => s.loadFromPgn);
  const error = useAnalysisStore((s) => s.error);
  const clearError = useAnalysisStore((s) => s.clearError);
  const sampleLoaded = useRef(false);

  // Автозагрузка примера партии при первом открытии страницы.
  useEffect(() => {
    if (!sampleLoaded.current) {
      sampleLoaded.current = true;
      loadFromPgn(SAMPLE_GAMES[0].pgn);
    }
  }, [loadFromPgn]);

  // Ошибки хранилища -> тосты.
  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  // Клавиатурная навигация по партии.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      const store = useAnalysisStore.getState();
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        store.step(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        store.step(1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        store.goToStart();
      } else if (e.key === 'End') {
        e.preventDefault();
        store.goToEnd();
      } else if (e.key === 'f' || e.key === 'F' || e.key === 'а' || e.key === 'А') {
        store.flip();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Шапка */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-3 py-2.5 sm:px-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600/15 text-emerald-700 night:text-emerald-400">
              <Crown className="h-4.5 w-4.5" />
            </span>
            <div>
              <span className="block text-sm font-bold leading-tight text-foreground">ChessLens</span>
              <span className="block text-[11px] leading-tight text-muted-foreground">анализ шахматных партий</span>
            </div>
            <span className="ml-2 hidden rounded-full border border-emerald-600/30 bg-emerald-600/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 night:text-emerald-400 sm:inline">
              Stockfish 19 · WASM · в браузере
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <Button className="h-9 bg-emerald-600 text-white hover:bg-emerald-500" onClick={() => setImportOpen(true)}>
              <Upload className="mr-1.5 h-4 w-4" />
              Загрузить партию
            </Button>
          </div>
        </div>
      </header>

      {/* Основной контент */}
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-3 py-4 sm:px-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,400px)]">
          {/* Левая колонка: доска, разбор, график */}
          <div className="flex min-w-0 flex-col gap-4">
            <AnalysisBoard />
            <CommentCard />
            <EvalGraph />
          </div>

          {/* Правая колонка: итоги, движок, ходы */}
          <div className="flex min-w-0 flex-col gap-4">
            <SummaryPanel />
            <EnginePanel />
            <MoveList />
          </div>
        </div>

        {/* Подсказки */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-panel p-3.5">
            <p className="text-xs font-semibold text-foreground/90">Значки ходов</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              !! — триллиант (жертва с перевесом), ★ — лучший ход, ! — отличный, ?! — неточность, ? — ошибка, ?? — зевок, M — упущенный мат.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-panel p-3.5">
            <p className="text-xs font-semibold text-foreground/90">Клавиатура</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              ← → — по ходам, Home/End — начало/конец партии, F — перевернуть доску. Можно тянуть фигуры и продолжить партию с любой позиции.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-panel p-3.5">
            <p className="text-xs font-semibold text-foreground/90">Точность и острота</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Точность считается по модели перевеса (как на lichess), острота — по близости оценок к равной борьбе и размаху колебаний.
            </p>
          </div>
        </div>
      </main>

      {/* Подвал */}
      <footer className="mt-auto border-t border-border">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2 px-3 py-3 text-xs text-muted-foreground/80 sm:px-4">
          <span>ChessLens — разбор партий словами, а не только стрелками. Вдохновлено сервисами анализа ArslanovChess, lichess и chess.com.</span>
          <span>Движок Stockfish 19 работает локально в вашем браузере через WebAssembly.</span>
        </div>
      </footer>

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
