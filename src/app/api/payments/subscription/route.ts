// Статус подписки пользователя.
// GET /api/payments/subscription
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { getEffectiveSubscription } from '@/lib/payments/activate';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  const db = getDb();
  const sub = await getEffectiveSubscription(db, user.id);

  return NextResponse.json({
    subscription: {
      plan: sub.plan,
      status: sub.status,
      startsAt: sub.startsAt,
      expiresAt: sub.expiresAt,
    },
  });
}
