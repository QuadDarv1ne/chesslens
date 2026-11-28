// Вход в аккаунт.
// POST /api/auth/login  { email, password }
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1, 'Введите пароль'),
});

// Валидный bcrypt-хеш-заглушка: используется, чтобы проверка пароля для
// несуществующего email занимала столько же времени, как и для существующего
// (иначе по времени ответа можно перебирать зарегистрированные адреса).
const DUMMY_HASH = '$2b$12$K3J8m0dQ5oQ9Yq0gZ1xW9uJ5H2k4y7lP8sN6rT1vB3cD5eF7gH9iK';

function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

export async function POST(req: NextRequest) {
  // Защита от брутфорса: не более 10 попыток входа за 5 минут с одного IP.
  if (!rateLimit(`login:${clientIp(req)}`, 10, 5 * 60 * 1000)) {
    return NextResponse.json({ error: 'Слишком много попыток. Попробуйте позже.' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Некорректный JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const db = getDb();
  const user = await db.user.findUnique({ where: { email } });
  // Всегда выполняем bcrypt-проверку: для отсутствующего пользователя — по
  // заглушке, чтобы время ответа не выдавало существование аккаунта.
  // Единый ответ для "нет такого юзера" и "неверный пароль".
  const passwordOk = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !passwordOk) {
    return NextResponse.json({ error: 'Неверный email или пароль' }, { status: 401 });
  }

  await createSession(user.id);
  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}
