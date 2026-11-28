// ЮKassa провайдер.
// Документация: https://yookassa.ru/developers/api
//
// Переменные окружения:
//   YOOKASSA_SHOP_ID — ID магазина
//   YOOKASSA_API_KEY — API-ключ (для production — секретный ключ, для test — test ключ)

import type { PaymentIntent, PaymentProvider, PaymentConfirmPayload } from './base';
import type { Tariff } from '../tariffs';
import { randomUUID } from 'crypto';

const YOOKASSA_SHOP_ID = process.env.YOOKASSA_SHOP_ID ?? '';
const YOOKASSA_API_KEY = process.env.YOOKASSA_API_KEY ?? '';

function authHeader(): Record<string, string> {
  return { Authorization: `Basic ${Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_API_KEY}`).toString('base64')}` };
}

export class YooKassaProvider implements PaymentProvider {
  readonly name: PaymentProvider['name'] = 'yookassa';

  async createIntent(tariff: Tariff, description: string, metadata?: Record<string, string>): Promise<PaymentIntent> {
    const id = `yk_${randomUUID()}`;

    // Создаём платёж через API ЮKassa.
    const res = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        ...authHeader(),
        'Idempotence-Key': randomUUID(),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        amount: {
          value: (tariff.priceKopecks / 100).toFixed(2),
          currency: 'RUB',
        },
        capture: false, // требуется подтверждение webhook
        confirmation: {
          type: 'redirect',
          return_url: `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/payments/callback`,
        },
        description,
        metadata: { tariff_id: tariff.id, ...metadata },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`ЮKassa createPayment failed ${res.status}: ${text}`);
    }

    const data = (await res.json()) as { id: string; confirmation?: { confirmation_url?: string }; status: string };
    return {
      id,
      confirmationUrl: data.confirmation?.confirmation_url,
      paymentUrl: data.confirmation?.confirmation_url,
      status: data.status === 'pending' ? 'waiting_for_payment' : 'cancelled',
    };
  }

  async confirm(payload: PaymentConfirmPayload): Promise<{ succeeded: boolean; externalId?: string; metadata?: string }> {
    // Для типа confirmation=redirect ЮKassa сам шлёт webhook.
    // Если вызван подтверждение вручную — подтверждаем платёж.
    try {
      const res = await fetch(`https://api.yookassa.ru/v3/payments/${payload.externalId ?? payload.id}/confirm`, {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ capture: true }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('ЮKassa confirm failed:', text);
        return { succeeded: false };
      }

      const data = (await res.json()) as { status: string; metadata?: Record<string, string> };
      return {
        succeeded: data.status === 'succeeded',
        externalId: payload.externalId ?? payload.id,
        metadata: JSON.stringify(data.metadata ?? {}),
      };
    } catch (err) {
      console.error('ЮKassa confirm error:', err);
      return { succeeded: false };
    }
  }

  async checkStatus(externalId: string): Promise<{ status: 'confirmed' | 'cancelled' | 'pending' }> {
    try {
      const res = await fetch(`https://api.yookassa.ru/v3/payments/${externalId}`, {
        headers: authHeader(),
      });

      if (!res.ok) return { status: 'pending' };

      const data = (await res.json()) as { status: string };
      if (data.status === 'succeeded') return { status: 'confirmed' };
      if (data.status === 'cancelled') return { status: 'cancelled' };
      return { status: 'pending' };
    } catch {
      return { status: 'pending' };
    }
  }
}
