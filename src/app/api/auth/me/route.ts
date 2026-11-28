// Текущий пользователь и его подписка.
// GET /api/auth/me
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });

  const db = getDb();
  const subscription = await db.subscription.findUnique({ where: { userId: user.id } });
  return NextResponse.json({
    user,
    subscription: subscription
      ? {
          plan: subscription.plan,
          status: subscription.status,
          expiresAt: subscription.expiresAt,
        }
      : { plan: 'free', status: 'active', expiresAt: null },
  });
}
