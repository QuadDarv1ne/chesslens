// Создание платежа.
// POST /api/payments/create  { tariffId?, provider? }
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { findTariff, DEFAULT_TARIFF_ID } from '@/lib/payments/tariffs';
import { getProvider, isProviderAvailable } from '@/lib/payments/providers';
import { activateProSubscription } from '@/lib/payments/activate';

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
  const providerName = (parsed.data.provider ?? 'mock') as 'yookassa' | 'tbank' | 'sbp' | 'ozonpay' | 'mock';

  // Нельзя использовать провайдер, который не настроен в этом окружении.
  // Это защищает от бесплатной активации Pro через mock на боевом сервере.
  if (!isProviderAvailable(providerName)) {
    return NextResponse.json({ error: 'Этот способ оплаты недоступен' }, { status: 400 });
  }

  const tariff = findTariff(tariffId);
  if (!tariff) {
    return NextResponse.json({ error: `Тариф "${tariffId}" не найден` }, { status: 404 });
  }

  const provider = getProvider(providerName);

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
        tariffId: tariffId,
        amount: tariff.priceKopecks,
        currency: 'RUB',
        status: 'pending',
        externalId: intent.id,
        description: tariff.description,
      },
    });

    // Mock-режим: оплата имитируется мгновенно.
    if (providerName === 'mock') {
      await db.paymentOrder.update({
        where: { id: order.id },
        data: { status: 'succeeded', paidAt: new Date() },
      });
      await activateProSubscription(db, user.id, tariffId);
      return NextResponse.json({
        orderId: order.id,
        intentId: intent.id,
        paymentUrl: null,
        status: 'succeeded',
        activated: true,
      });
    }

    return NextResponse.json({
      orderId: order.id,
      intentId: intent.id,
      paymentUrl: intent.paymentUrl ?? intent.confirmationUrl,
      status: intent.status,
      activated: false,
    });
  } catch (err) {
    console.error('Ошибка создания платежа:', err);
    return NextResponse.json({ error: 'Не удалось создать платёж' }, { status: 500 });
  }
}
