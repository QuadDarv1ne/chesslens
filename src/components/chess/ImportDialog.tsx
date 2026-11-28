'use client';

// Диалог импорта партии: PGN, lichess, chess.com, FEN, примеры.
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Search, FileText, Globe, Swords } from 'lucide-react';
import { toast } from 'sonner';
import { useAnalysisStore } from '@/lib/store';
import { SAMPLE_GAMES } from '@/lib/chess/samples';

interface ImportedGame {
  source: string;
  id: string;
  white: string;
  black: string;
  whiteRating: number | null;
  blackRating: number | null;
  result: string;
  speed: string;
  date: string;
  pgn: string;
}

function GameList({ games, onPick }: { games: ImportedGame[]; onPick: (g: ImportedGame) => void }) {
  if (games.length === 0) return <p className="text-sm text-muted-foreground">Партий не найдено.</p>;
  return (
    <div className="scroll-slim max-h-[320px] space-y-1 overflow-y-auto pr-1">
      {games.map((g, i) => (
        <button
          key={g.id + '_' + i}
          onClick={() => onPick(g)}
          className="group flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-panel-soft px-3 py-2 text-left transition-colors hover:border-emerald-600/50 hover:bg-accent"
        >
          <span className="min-w-0">
            <span className="block truncate text-sm text-foreground">
              {g.white} <span className="text-muted-foreground">против</span> {g.black}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {g.speed} · {g.date} · {g.result}
            </span>
          </span>
          <span className="shrink-0 text-xs text-emerald-600 night:text-emerald-500 opacity-0 transition-opacity group-hover:opacity-100">
            Загрузить
          </span>
        </button>
      ))}
    </div>
  );
}

// Партии chess.com: напрямую из браузера (CORS у api.chess.com разрешён, а IP пользователя — не датацентр).
interface ChessComGameJson {
  url?: string;
  pgn?: string;
  time_class?: string;
  end_time?: number;
  white?: { username?: string; rating?: number; result?: string };
  black?: { username?: string; rating?: number; result?: string };
}

const SPEED_RU_LOCAL: Record<string, string> = {
  bullet: 'Буллет',
  blitz: 'Блиц',
  rapid: 'Рапид',
  daily: 'По переписке',
  classical: 'Классика',
};

/** Читает JSON-ответ прокси, не падая на не-JSON (HTML ошибки, пустой ответ). */
async function readJson(res: Response): Promise<{ error?: string; games?: ImportedGame[] }> {
  try {
    return (await res.json()) as { error?: string; games?: ImportedGame[] };
  } catch {
    return { error: `Сервер вернул неожиданный ответ (${res.status})` };
  }
}

async function fetchChesscomDirect(username: string, max: number): Promise<ImportedGame[]> {
  const u = username.toLowerCase();
  const archRes = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(u)}/games/archives`);
  if (!archRes.ok) throw new Error(`Пользователь "${username}" на chess.com не найден`);
  const archData = (await archRes.json()) as { archives?: string[] };
  const archives = archData.archives ?? [];
  const games: ImportedGame[] = [];
  for (const url of archives.slice(-2).reverse()) {
    const res = await fetch(url);
    if (!res.ok) continue;
    const data = (await res.json()) as { games?: ChessComGameJson[] };
    for (const g of (data.games ?? []).reverse()) {
      if (games.length >= max) break;
      const result = g.white?.result === 'win' ? '1-0' : g.black?.result === 'win' ? '0-1' : '½-½';
      games.push({
        source: 'chesscom',
        id: g.url ?? '',
        white: g.white?.username ?? 'Аноним',
        black: g.black?.username ?? 'Аноним',
        whiteRating: g.white?.rating ?? null,
        blackRating: g.black?.rating ?? null,
        result,
        speed: SPEED_RU_LOCAL[g.time_class ?? ''] ?? g.time_class ?? '',
        date: g.end_time ? new Date(g.end_time * 1000).toLocaleDateString('ru-RU') : '',
        pgn: g.pgn ?? '',
      });
    }
    if (games.length >= max) break;
  }
  if (games.length === 0) throw new Error('У пользователя пока нет партий');
  return games;
}

function SourceImport({ source, onLoaded }: { source: 'lichess' | 'chesscom'; onLoaded: () => void }) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [games, setGames] = useState<ImportedGame[]>([]);
  const loadFromPgn = useAnalysisStore((s) => s.loadFromPgn);

  const search = async () => {
    if (!username.trim()) return;
    setLoading(true);
    setError(null);
    setGames([]);
    try {
      let games: ImportedGame[] = [];
      if (source === 'chesscom') {
        try {
          games = await fetchChesscomDirect(username.trim(), 15);
        } catch {
          // Фолбэк на серверный прокси (если прямой запрос из браузера не прошёл).
          const res = await fetch(`/api/import/chesscom?username=${encodeURIComponent(username.trim())}&max=15`);
          const data = await readJson(res);
          if (!res.ok) throw new Error(data.error ?? 'Не удалось получить партии');
          games = data.games ?? [];
        }
      } else {
        const res = await fetch(`/api/import/lichess?username=${encodeURIComponent(username.trim())}&max=15`);
        const data = await readJson(res);
        if (!res.ok) throw new Error(data.error ?? 'Не удалось получить партии');
        games = data.games ?? [];
      }
      setGames(games);
      if (games.length === 0) setError('Партий не найдено');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Сетевая ошибка. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  const pick = (g: ImportedGame) => {
    if (!g.pgn) {
      toast.error('У этой партии нет PGN');
      return;
    }
    if (loadFromPgn(g.pgn)) {
      toast.success('Партия загружена, идёт анализ');
      onLoaded();
    } else {
      toast.error('Не удалось разобрать PGN партии');
    }
  };

  const hint =
    source === 'lichess'
      ? 'Ник аккаунта на lichess.org, например: drnykterstein'
      : 'Ник аккаунта на chess.com, например: hikaru';

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') search();
          }}
          placeholder={hint}
          className="h-9 border-border bg-panel-input text-foreground placeholder:text-muted-foreground/70"
          aria-label="Ник игрока"
        />
        <Button className="h-9 bg-emerald-600 text-white hover:bg-emerald-500" onClick={search} disabled={loading}>
          {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Search className="mr-1.5 h-4 w-4" />}
          Найти
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <GameList games={games} onPick={pick} />
    </div>
  );
}

export function ImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const loadFromPgn = useAnalysisStore((s) => s.loadFromPgn);
  const loadFen = useAnalysisStore((s) => s.loadFen);
  const [pgn, setPgn] = useState('');
  const [fen, setFen] = useState('');
  const [pgnError, setPgnError] = useState<string | null>(null);

  const submitPgn = () => {
    setPgnError(null);
    if (!pgn.trim()) {
      setPgnError('Вставьте текст PGN');
      return;
    }
    if (loadFromPgn(pgn)) {
      toast.success('Партия загружена, идёт анализ');
      onOpenChange(false);
    } else {
      setPgnError('Не удалось разобрать PGN — проверьте текст');
    }
  };

  const submitFen = () => {
    if (loadFen(fen.trim())) {
      toast.success('Позиция загружена');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-border bg-panel text-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground">Загрузить партию</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Вставьте PGN, найдите игры по нику с lichess или chess.com, задайте позицию по FEN или выберите знаменитую партию.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="pgn">
          <TabsList className="grid w-full grid-cols-5 bg-accent text-muted-foreground">
            <TabsTrigger value="pgn" title="PGN"><FileText className="h-4 w-4" /></TabsTrigger>
            <TabsTrigger value="lichess" title="Lichess"><Globe className="h-4 w-4" /></TabsTrigger>
            <TabsTrigger value="chesscom" title="Chess.com"><Globe className="h-4 w-4" /></TabsTrigger>
            <TabsTrigger value="fen" title="FEN">FEN</TabsTrigger>
            <TabsTrigger value="samples" title="Примеры"><Swords className="h-4 w-4" /></TabsTrigger>
          </TabsList>

          <TabsContent value="pgn" className="space-y-2 pt-3">
            <Textarea
              value={pgn}
              onChange={(e) => setPgn(e.target.value)}
              placeholder={'[Event "..."]\n1. e4 e5 2. Nf3 ...'}
              className="scroll-slim h-40 resize-none border-border bg-panel-input font-mono text-xs text-foreground placeholder:text-muted-foreground/70"
              aria-label="Текст PGN"
            />
            {pgnError ? <p className="text-sm text-destructive">{pgnError}</p> : null}
            <Button className="h-9 w-full bg-emerald-600 text-white hover:bg-emerald-500" onClick={submitPgn}>
              Загрузить и проанализировать
            </Button>
          </TabsContent>

          <TabsContent value="lichess" className="pt-3">
            <SourceImport source="lichess" onLoaded={() => onOpenChange(false)} />
          </TabsContent>

          <TabsContent value="chesscom" className="pt-3">
            <SourceImport source="chesscom" onLoaded={() => onOpenChange(false)} />
          </TabsContent>

          <TabsContent value="fen" className="space-y-2 pt-3">
            <Input
              value={fen}
              onChange={(e) => setFen(e.target.value)}
              placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
              className="h-9 border-border bg-panel-input font-mono text-xs text-foreground placeholder:text-muted-foreground/70"
              aria-label="FEN позиции"
            />
            <Button className="h-9 w-full bg-emerald-600 text-white hover:bg-emerald-500" onClick={submitFen}>
              Загрузить позицию
            </Button>
          </TabsContent>

          <TabsContent value="samples" className="space-y-2 pt-3">
            {SAMPLE_GAMES.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  if (loadFromPgn(s.pgn)) {
                    toast.success('Партия загружена, идёт анализ');
                    onOpenChange(false);
                  }
                }}
                className="flex w-full items-center justify-between rounded-lg border border-border bg-panel-soft px-3 py-2.5 text-left transition-colors hover:border-emerald-600/50 hover:bg-accent"
              >
                <span>
                  <span className="block text-sm font-medium text-foreground">{s.title}</span>
                  <span className="block text-xs text-muted-foreground">{s.subtitle}</span>
                </span>
                <span className="text-xs text-emerald-600 night:text-emerald-500">Загрузить</span>
              </button>
            ))}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
