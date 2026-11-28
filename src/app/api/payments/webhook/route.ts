// Обработка вебхуков от платёжных провайдеров.
// POST /api/payments/webhook
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getProviderFromEnv } from '@/lib/payments/providers';

export const dynamic = 'force-dynamic';

/**
 * Вебхук-обработчик:
 * 1. Получает payload от провайдера.
 * 2. Ищет PaymentOrder по внешнему ID.
 * 3. Подтверждает платёж у провайдера.
 * 4. Обновляет PaymentOrder и Subscription.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Некорректный JSON' }, { status: 400 });
  }

  const db = getDb();
  const provider = getProviderFromEnv();

  // ЮKassa шлёт webhook с полем "event" и данными в "object".
  // Т-Банк шлёт с полем "invoice_id" и "status".
  // Mock — с полем "id" и "status".

  const ykEvent = (body as Record<string, unknown>)?.event as string | undefined;
  const ykObject = (body as Record<string, unknown>)?.object as Record<string, unknown> | undefined;
  const tbStatus = (body as Record<string, unknown>)?.status as string | undefined;
  const tbInvoiceId = (body as Record<string, unknown>)?.invoice_id as string | undefined;
  const mockId = (body as Record<string, unknown>)?.id as string | undefined;
  const mockStatus = (body as Record<string, unknown>)?.status as string | undefined;

  let externalId: string | undefined;
  let confirmStatus: 'confirmed' | 'cancelled';

  if (provider.name === 'yookassa' && ykEvent === 'payment.succeeded') {
    externalId = ykObject?.id as string | undefined;
    confirmStatus = 'confirmed';
  } else if (provider.name === 'yookassa' && ykEvent === 'payment.canceled') {
    externalId = ykObject?.id as string | undefined;
    confirmStatus = 'cancelled';
  } else if (provider.name === 'tbank' && tbInvoiceId) {
    externalId = tbInvoiceId;
    confirmStatus = tbStatus === 'paid' ? 'confirmed' : 'cancelled';
  } else if (provider.name === 'mock' && mockId) {
    externalId = mockId;
    confirmStatus = mockStatus === 'confirmed' ? 'confirmed' : 'cancelled';
  } else {
    return NextResponse.json({ error: 'Неизвестный webhook' }, { status: 400 });
  }

  // Находим платёжное поручение по внешнему ID.
  const order = await db.paymentOrder.findFirst({
    where: { externalId: externalId ?? '' },
    include: { user: true },
  });

  if (!order) {
    return NextResponse.json({ error: 'Платёжное поручение не найдено' }, { status: 404 });
  }

  // Подтверждаем у провайдера.
  const result = await provider.confirm({
    id: order.id,
    status: confirmStatus,
    externalId,
    metadata: order.metadata ?? undefined,
  });

  if (!result.succeeded && confirmStatus === 'confirmed') {
    await db.paymentOrder.update({
      where: { id: order.id },
      data: { status: 'failed' },
    });
    return NextResponse.json({ error: 'Подтверждение не пройдено' }, { status: 500 });
  }

  // Обновляем платёжное поручение.
  const newStatus = confirmStatus === 'confirmed' ? 'succeeded' : 'canceled';
  await db.paymentOrder.update({
    where: { id: order.id },
    data: {
      status: newStatus,
      externalId: result.externalId ?? order.externalId,
      paidAt: confirmStatus === 'confirmed' ? new Date() : order.paidAt,
    },
  });

  // Если платёж успешен — обновляем подписку.
  if (confirmStatus === 'confirmed') {
    const sub = await db.subscription.findUnique({ where: { userId: order.userId } });
    // Если уже pro — продлеваем. Если free — создаём pro.
    if (sub) {
      const base = sub.expiresAt ?? new Date();
      const extended = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (extended > base) {
        await db.subscription.update({
          where: { id: sub.id },
          data: {
            plan: 'pro',
            status: 'active',
            expiresAt: extended,
          },
        });
      }
    } else {
      await db.subscription.create({
        data: {
          userId: order.userId,
          plan: 'pro',
          status: 'active',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
