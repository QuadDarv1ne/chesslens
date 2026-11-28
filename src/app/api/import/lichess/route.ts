// Импорт последних партий пользователя с lichess.org.
// GET /api/import/lichess?username=drnykterstein&max=15
import { NextRequest, NextResponse } from 'next/server';
import { cacheGet, cacheSet } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export interface ImportedGame {
  source: 'lichess';
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
  ultrabullet: 'Ультрабуллет',
  bullet: 'Буллет',
  blitz: 'Блиц',
  rapid: 'Рапид',
  classical: 'Классика',
  correspondence: 'По переписке',
  puzzle: 'Задачи',
};

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username')?.trim() ?? '';
  const max = Math.min(30, Math.max(1, parseInt(req.nextUrl.searchParams.get('max') ?? '15', 10) || 15));

  if (!/^[a-zA-Z0-9_-]{2,30}$/.test(username)) {
    return NextResponse.json({ error: 'Укажите корректный ник на lichess' }, { status: 400 });
  }

  const cacheKey = `lichess:${username.toLowerCase()}:${max}`;
  const cached = cacheGet<ImportedGame[]>(cacheKey);
  if (cached) {
    return NextResponse.json({ games: cached, cached: true });
  }

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 20000);
    let res: Response;
    try {
      res = await fetch(
        `https://lichess.org/api/games/user/${encodeURIComponent(username)}?max=${max}&pgnInJson=true&clocks=false&evals=false&opening=false`,
        {
          headers: { Accept: 'application/x-ndjson' },
          signal: controller.signal,
          cache: 'no-store',
        },
      );
    } finally {
      clearTimeout(t);
    }

    if (res.status === 404) {
      return NextResponse.json({ error: `Пользователь "${username}" на lichess не найден` }, { status: 404 });
    }
    if (!res.ok) {
      return NextResponse.json({ error: `lichess вернул ошибку ${res.status}` }, { status: 502 });
    }

    const text = await res.text();
    const games: ImportedGame[] = [];
    for (const line of text.split('\n')) {
      const l = line.trim();
      if (!l) continue;
      try {
        const g = JSON.parse(l);
        const result = g.winner === 'white' ? '1-0' : g.winner === 'black' ? '0-1' : '½-½';
        const pgn: string = g.pgn ?? '';
        const tag = (name: string) => {
          const m = pgn.match(new RegExp(`\\[${name} "([^"]*)"\\]`));
          return m ? m[1] : '';
        };
        games.push({
          source: 'lichess',
          id: String(g.id ?? ''),
          white: g.white?.user?.name || tag('White') || 'Аноним',
          black: g.black?.user?.name || tag('Black') || 'Аноним',
          whiteRating: g.white?.rating ?? (parseInt(tag('WhiteElo'), 10) || null),
          blackRating: g.black?.rating ?? (parseInt(tag('BlackElo'), 10) || null),
          result: (() => {
            const r = tag('Result');
            return !r || r === '*' ? result : r;
          })(),
          speed: SPEED_RU[g.speed] ?? g.speed ?? '',
          date: g.createdAt ? new Date(g.createdAt).toLocaleDateString('ru-RU') : '',
          pgn,
        });
      } catch {
        // пропускаем некорректные строки
      }
    }
    if (games.length > 0) cacheSet(cacheKey, games, 5 * 60 * 1000);
    return NextResponse.json({ games });
  } catch {
    return NextResponse.json({ error: 'Не удалось связаться с lichess.org' }, { status: 502 });
  }
}
