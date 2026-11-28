// Активация/продление Pro-подписки после успешной оплаты.
import type { PrismaClient } from '@prisma/client';
import { findTariff, DEFAULT_TARIFF_ID } from './tariffs';

/**
 * Продлевает Pro-подписку на длительность купленного тарифа.
 * Если подписка ещё активна — отсчёт от текущей даты окончания,
 * иначе — от текущего момента. Идемпотентность обеспечивается
 * проверкой order.paidAt на стороне вызывающего кода.
 */
export async function activateProSubscription(
  db: PrismaClient,
  userId: string,
  tariffId: string | null,
): Promise<void> {
  const tariff = (tariffId ? findTariff(tariffId) : null) ?? findTariff(DEFAULT_TARIFF_ID)!;
  const durationMs = tariff.durationDays * 24 * 60 * 60 * 1000;

  const sub = await db.subscription.findUnique({ where: { userId } });
  if (sub) {
    // Активная ещё подписка — продлеваем от её окончания; истёкшая — от сейчас.
    const now = Date.now();
    const base = sub.expiresAt && sub.expiresAt.getTime() > now ? sub.expiresAt.getTime() : now;
    await db.subscription.update({
      where: { id: sub.id },
      data: { plan: 'pro', status: 'active', expiresAt: new Date(base + durationMs) },
    });
  } else {
    await db.subscription.create({
      data: {
        userId,
        plan: 'pro',
        status: 'active',
        expiresAt: new Date(Date.now() + durationMs),
      },
    });
  }
}
