// Статус подписки пользователя.
// GET /api/payments/subscription
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  const db = getDb();
  const sub = await db.subscription.findUnique({ where: { userId: user.id } });

  return NextResponse.json({
    subscription: sub
      ? {
          plan: sub.plan,
          status: sub.status,
          startsAt: sub.startsAt,
          expiresAt: sub.expiresAt,
          updatedAt: sub.updatedAt,
        }
      : { plan: 'free', status: 'active', startsAt: null, expiresAt: null, updatedAt: null },
  });
}
