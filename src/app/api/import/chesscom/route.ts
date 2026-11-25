// Импорт последних партий пользователя с chess.com.
// GET /api/import/chesscom?username=hikaru&max=15
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export interface ImportedGame {
  source: 'chesscom';
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

const SPEED_RU: Record<string, string> = {
  bullet: 'Буллет',
  blitz: 'Блиц',
  rapid: 'Рапид',
  daily: 'По переписке',
  classical: 'Классика',
};

interface ChessComGame {
  url: string;
  pgn?: string;
  time_class?: string;
  rated?: boolean;
  end_time?: number;
  white?: { username?: string; rating?: number; result?: string };
  black?: { username?: string; rating?: number; result?: string };
}

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username')?.trim() ?? '';
  const max = Math.min(30, Math.max(1, parseInt(req.nextUrl.searchParams.get('max') ?? '15', 10) || 15));

  if (!/^[a-zA-Z0-9_-]{3,30}$/.test(username)) {
    return NextResponse.json({ error: 'Укажите корректный ник на chess.com' }, { status: 400 });
  }

  const fetchJson = async (url: string): Promise<unknown> => {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'ChessLens/1.0 (analysis service)' },
        signal: controller.signal,
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(String(res.status));
      return await res.json();
    } finally {
      clearTimeout(t);
    }
  };

  try {
    const archivesData = (await fetchJson(
      `https://api.chess.com/pub/player/${encodeURIComponent(username.toLowerCase())}/games/archives`,
    )) as { archives?: string[] };

    const archives = archivesData.archives ?? [];
    if (archives.length === 0) {
      return NextResponse.json({ error: `Пользователь «${username}» на chess.com не найден` }, { status: 404 });
    }

    // Собираем игры из последних 2 архивов (обычно это 1-2 месяца).
    const games: ImportedGame[] = [];
    for (const archiveUrl of archives.slice(-2).reverse()) {
      const data = (await fetchJson(archiveUrl)) as { games?: ChessComGame[] };
      for (const g of (data.games ?? []).reverse()) {
        if (games.length >= max) break;
        const result =
          g.white?.result === 'win' ? '1-0' : g.black?.result === 'win' ? '0-1' : '½-½';
        games.push({
          source: 'chesscom',
          id: g.url,
          white: g.white?.username ?? 'Аноним',
          black: g.black?.username ?? 'Аноним',
          whiteRating: g.white?.rating ?? null,
          blackRating: g.black?.rating ?? null,
          result,
          speed: SPEED_RU[g.time_class ?? ''] ?? g.time_class ?? '',
          date: g.end_time ? new Date(g.end_time * 1000).toLocaleDateString('ru-RU') : '',
          pgn: g.pgn ?? '',
        });
      }
      if (games.length >= max) break;
    }

    if (games.length === 0) {
      return NextResponse.json({ error: 'У пользователя пока нет партий' }, { status: 404 });
    }
    return NextResponse.json({ games: games.slice(0, max) });
  } catch (e) {
    const msg = e instanceof Error && e.message === '404' ? `Пользователь «${username}» на chess.com не найден` : 'Не удалось связаться с chess.com';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
