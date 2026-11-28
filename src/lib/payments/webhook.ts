// Аутентификация входящих вебхуков от платёжных провайдеров.
//
// Вебхук — публичный эндпоинт: его может вызвать кто угодно, поэтому
// без проверки секрета любой авторизованный пользователь мог бы
// «подтвердить» свой pending-заказ и получить Pro бесплатно.
//
// Секрет передаётся провайдеру при настройке URL вебхука:
//   https://<host>/api/payments/webhook?token=<PAYMENT_WEBHOOK_SECRET>
// либо заголовком X-Webhook-Token (для провайдеров с настраиваемыми заголовками).

import type { NextRequest } from 'next/server';

export type WebhookAuthResult = { ok: true } | { ok: false; status: number; error: string };

export function verifyWebhookSecret(req: NextRequest): WebhookAuthResult {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  const isProd = process.env.NODE_ENV === 'production';

  // В production секрет обязателен: без него вебхук не принимаем вовсе.
  if (!secret) {
    return isProd
      ? { ok: false, status: 500, error: 'PAYMENT_WEBHOOK_SECRET не настроен' }
      : { ok: true };
  }

  const provided =
    req.nextUrl.searchParams.get('token') ?? req.headers.get('x-webhook-token') ?? '';
  // Сравнение постоянного времени, чтобы не давать тайминг-атаку на секрет.
  if (!timingSafeEqual(provided, secret)) {
    return { ok: false, status: 401, error: 'Неверный секрет вебхука' };
  }
  return { ok: true };
}

/** Сравнивает строки за постоянное время (длины тоже учитываются). */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
