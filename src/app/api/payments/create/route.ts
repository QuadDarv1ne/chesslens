// Создание платежа.
// POST /api/payments/create  { tariffId?, provider? }
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { findTariff, DEFAULT_TARIFF_ID } from '@/lib/payments/tariffs';
import { getProviderFromEnv } from '@/lib/payments/providers';

export const dynamic = 'force-dynamic';

const schema = z.object({
  tariffId: z.string().optional(),
  provider: z.enum(['yookassa', 'tbank', 'sbp', 'ozonpay', 'mock']).optional(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

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

  const db = getDb();
  const tariffId = parsed.data.tariffId ?? DEFAULT_TARIFF_ID;
  const providerName = parsed.data.provider ?? 'mock';

  const tariff = findTariff(tariffId);
  if (!tariff) {
    return NextResponse.json({ error: `Тариф "${tariffId}" не найден` }, { status: 404 });
  }

  const provider = getProviderFromEnv();

  try {
    const intent = await provider.createIntent(tariff, `ChessLens Pro · ${tariff.name}`, {
      user_id: user.id,
    });

    // Сохраняем платёжное поручение.
    const order = await db.paymentOrder.create({
      data: {
        userId: user.id,
        provider: provider.name,
        plan: 'pro',
        amount: tariff.priceKopecks,
        currency: 'RUB',
        status: 'pending',
        externalId: intent.id,
        description: tariff.description,
      },
    });

    return NextResponse.json({
      orderId: order.id,
      intentId: intent.id,
      paymentUrl: intent.paymentUrl ?? intent.confirmationUrl,
      status: intent.status,
    });
  } catch (err) {
    console.error('Ошибка создания платежа:', err);
    return NextResponse.json({ error: 'Не удалось создать платёж' }, { status: 500 });
  }
}
