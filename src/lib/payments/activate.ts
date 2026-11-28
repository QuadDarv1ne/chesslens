// Активация/продление Pro-подписки после успешной оплаты.
import type { PrismaClient } from '@prisma/client';
import { findTariff, DEFAULT_TARIFF_ID } from './tariffs';

/** Публичное представление подписки для API и UI. */
export interface EffectiveSubscription {
  plan: 'free' | 'pro';
  status: 'active' | 'expired' | 'canceled';
  startsAt: Date | null;
  expiresAt: Date | null;
}

const FREE: EffectiveSubscription = {
  plan: 'free',
  status: 'active',
  startsAt: null,
  expiresAt: null,
};

/**
 * Возвращает подписку с учётом срока действия: истёкшая Pro не должна
 * оставаться активной только потому, что статус в БД не обновили.
 * Попутно помечает истёкшую запись как expired (один UPDATE).
 */
export async function getEffectiveSubscription(
  db: PrismaClient,
  userId: string,
): Promise<EffectiveSubscription> {
  const sub = await db.subscription.findUnique({ where: { userId } });
  if (!sub) return FREE;

  const expired = sub.expiresAt !== null && sub.expiresAt.getTime() <= Date.now();
  if (sub.plan === 'pro' && expired) {
    if (sub.status !== 'expired') {
      await db.subscription
        .update({ where: { id: sub.id }, data: { status: 'expired', plan: 'free' } })
        .catch(() => undefined);
    }
    return { plan: 'free', status: 'expired', startsAt: sub.startsAt, expiresAt: sub.expiresAt };
  }

  return {
    plan: sub.plan === 'pro' ? 'pro' : 'free',
    status: sub.status === 'canceled' ? 'canceled' : 'active',
    startsAt: sub.startsAt,
    expiresAt: sub.expiresAt,
  };
}

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
