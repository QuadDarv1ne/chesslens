// История платежей пользователя.
// GET /api/payments/orders
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  const db = getDb();
  const orders = await db.paymentOrder.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({
    orders: orders.map((o) => ({
      id: o.id,
      provider: o.provider,
      plan: o.plan,
      tariffId: o.tariffId,
      amount: o.amount,
      currency: o.currency,
      status: o.status,
      externalId: o.externalId,
      description: o.description,
      paidAt: o.paidAt,
      createdAt: o.createdAt,
    })),
  });
}
