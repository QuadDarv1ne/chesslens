// Сессии пользователя на основе БД: в cookie хранится только непрозрачный токен,
// сам объект сессии и привязка к пользователю — в SQLite.
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import { getDb } from '@/lib/db';

export const SESSION_COOKIE = 'chesslens_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 дней

/** Публичное представление пользователя (без хеша пароля). */
export interface SafeUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: Date;
}

function toSafeUser(u: {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: Date;
}): SafeUser {
  return { id: u.id, email: u.email, name: u.name, role: u.role, createdAt: u.createdAt };
}

async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

/** Возвращает текущего пользователя по cookie-сессии или null. */
export async function getCurrentUser(): Promise<SafeUser | null> {
  const token = await getSessionToken();
  if (!token) return null;
  const db = getDb();
  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    // Протухшую сессию убираем из БД (удалить cookie здесь нельзя — только в роут-хендлере).
    await db.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  return toSafeUser(session.user);
}

/**
 * Создаёт сессию в БД и ставит cookie. Вызывать только из route handler
 * или server action (здесь разрешена запись cookie).
 */
export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const db = getDb();
  // Чистим протухшие сессии этого пользователя, чтобы таблица не росла.
  await db.session
    .deleteMany({ where: { userId, expiresAt: { lt: new Date() } } })
    .catch(() => undefined);
  await db.session.create({ data: { token, userId, expiresAt } });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });
  return token;
}

/** Удаляет текущую сессию (БД + cookie). */
export async function destroySession(): Promise<void> {
  const token = await getSessionToken();
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  if (!token) return;
  const db = getDb();
  await db.session.deleteMany({ where: { token } }).catch(() => undefined);
}
