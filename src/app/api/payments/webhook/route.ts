// Обработка вебхуков от платёжных провайдеров.
// POST /api/payments/webhook?token=<PAYMENT_WEBHOOK_SECRET>
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { activateProSubscription } from '@/lib/payments/activate';
import { getProvider } from '@/lib/payments/providers';
import { verifyWebhookSecret } from '@/lib/payments/webhook';

export const dynamic = 'force-dynamic';

/**
 * Вебхук-обработчик:
 * 1. Проверяет секрет (иначе кто угодно мог бы «подтвердить» свой заказ).
 * 2. Парсит payload в externalId + confirmStatus.
 * 3. Ищет PaymentOrder по внешнему ID.
 * 4. Определяет провайдера из заказа (не из env).
 * 5. Подтверждает платёж у провайдера.
 * 6. Обновляет PaymentOrder и Subscription.
 */
export async function POST(req: NextRequest) {
  const auth = verifyWebhookSecret(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Некорректный JSON' }, { status: 400 });
  }

  const db = getDb();

  // Извлекаем внешний ID и статус из payload провайдера.
  // Поддерживаем несколько форматов в зависимости от того, кто шлёт.
  const ykEvent = (body as Record<string, unknown>)?.event as string | undefined;
  const ykObject = (body as Record<string, unknown>)?.object as Record<string, unknown> | undefined;
  const tbStatus = (body as Record<string, unknown>)?.status as string | undefined;
  const tbInvoiceId = (body as Record<string, unknown>)?.invoice_id as string | undefined;
  const mockId = (body as Record<string, unknown>)?.id as string | undefined;
  const mockStatus = (body as Record<string, unknown>)?.status as string | undefined;

  let externalId: string | undefined;
  let confirmStatus: 'confirmed' | 'cancelled';

  if (ykEvent === 'payment.succeeded') {
    externalId = ykObject?.id as string | undefined;
    confirmStatus = 'confirmed';
  } else if (ykEvent === 'payment.canceled') {
    externalId = ykObject?.id as string | undefined;
    confirmStatus = 'cancelled';
  } else if (tbInvoiceId) {
    externalId = tbInvoiceId;
    confirmStatus = tbStatus === 'paid' ? 'confirmed' : 'cancelled';
  } else if (mockId) {
    externalId = mockId;
    confirmStatus = mockStatus === 'confirmed' ? 'confirmed' : 'cancelled';
  } else {
    return NextResponse.json({ error: 'Неизвестный webhook' }, { status: 400 });
  }

  if (!externalId) {
    return NextResponse.json({ error: 'Не указан внешний ID платежа' }, { status: 400 });
  }

  // Находим платёжное поручение по внешнему ID.
  const order = await db.paymentOrder.findFirst({ where: { externalId } });
  if (!order) {
    return NextResponse.json({ error: 'Платёжное поручение не найдено' }, { status: 404 });
  }

  // Идемпотентность: если уже оплачен — сразу OK.
  if (order.status === 'succeeded') {
    return NextResponse.json({ ok: true });
  }

  // Mock-провайдер не отправляет вебхуков: он активирует подписку сразу
  // при создании платежа. Разрешать ему подтверждение отсюда означало бы
  // «бесплатный Pro» при любой утечке секрета вебхука.
  if (order.provider === 'mock') {
    return NextResponse.json({ error: 'Mock-платежи не подтверждаются через вебхук' }, { status: 403 });
  }

  // Получаем провайдера из заказа (а не из env), чтобы корректно подтвердить.
  const provider = getProvider(order.provider as 'yookassa' | 'tbank' | 'sbp' | 'ozonpay');

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

  // Если платёж успешен — активируем подписку.
  if (confirmStatus === 'confirmed') {
    await activateProSubscription(db, order.userId, order.tariffId ?? null);
  }

  return NextResponse.json({ ok: true });
}
