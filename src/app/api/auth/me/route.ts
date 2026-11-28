// Текущий пользователь и его подписка.
// GET /api/auth/me
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { getEffectiveSubscription } from '@/lib/payments/activate';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });

  const db = getDb();
  const subscription = await getEffectiveSubscription(db, user.id);
  return NextResponse.json({
    user,
    subscription: {
      plan: subscription.plan,
      status: subscription.status,
      expiresAt: subscription.expiresAt,
    },
  });
}
