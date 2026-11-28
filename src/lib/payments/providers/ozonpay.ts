// Ozon Pay провайдер.
//
// ⚠️ Эндпоинты и формат ответов Ozon Pay (kassa.ozon.ru) следует сверить
// с актуальной документацией Ozon для мерчантов — ниже приведена типовая
// структура создания счёта, проверки статуса и подтверждения оплаты.
//
// Переменные окружения:
//   OZON_PAY_CLIENT_ID — Client ID мерчанта
//   OZON_PAY_API_KEY   — API-ключ мерчанта

import type { PaymentIntent, PaymentProvider, PaymentConfirmPayload } from './base';
import type { Tariff } from '../tariffs';
import { randomUUID } from 'crypto';

const OZON_PAY_CLIENT_ID = process.env.OZON_PAY_CLIENT_ID ?? '';
const OZON_PAY_API_KEY = process.env.OZON_PAY_API_KEY ?? '';
const OZON_PAY_BASE = process.env.OZON_PAY_BASE_URL ?? 'https://api.oxo.pay/api/v1';

function authHeader(): Record<string, string> {
  // Ozon Pay использует Client-Id + Api-Key в заголовках.
  return {
    'Client-Id': OZON_PAY_CLIENT_ID,
    'Api-Key': OZON_PAY_API_KEY,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

export class OzonPayProvider implements PaymentProvider {
  readonly name: PaymentProvider['name'] = 'ozonpay';

  async createIntent(tariff: Tariff, description: string, metadata?: Record<string, string>): Promise<PaymentIntent> {
    const id = `ozon_${randomUUID()}`;

    const res = await fetch(`${OZON_PAY_BASE}/payments`, {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify({
        amount: tariff.priceKopecks, // копейки
        currency: 'RUB',
        description,
        idempotency_key: id,
        success_url: `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3001'}/dashboard?payment=success`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3001'}/pricing`,
        metadata: { order_intent_id: id, tariff_id: tariff.id, ...metadata },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Ozon Pay createPayment failed ${res.status}: ${text}`);
    }

    const data = (await res.json()) as {
      id?: string;
      payment_id?: string;
      status?: string;
      confirmation?: { confirmation_url?: string };
      payment_url?: string;
    };
    const url = data.confirmation?.confirmation_url ?? data.payment_url;
    return {
      id,
      paymentUrl: url,
      confirmationUrl: url,
      status: data.status === 'succeeded' ? 'confirmed' : 'waiting_for_payment',
    };
  }

  async confirm(payload: PaymentConfirmPayload): Promise<{ succeeded: boolean; externalId?: string; metadata?: string }> {
    try {
      const res = await fetch(`${OZON_PAY_BASE}/payments/${payload.externalId ?? payload.id}`, {
        headers: authHeader(),
      });
      if (!res.ok) return { succeeded: false };
      const data = (await res.json()) as { status: string };
      return {
        succeeded: data.status === 'succeeded',
        externalId: payload.externalId ?? payload.id,
      };
    } catch (err) {
      console.error('Ozon Pay confirm error:', err);
      return { succeeded: false };
    }
  }

  async checkStatus(externalId: string): Promise<{ status: 'confirmed' | 'cancelled' | 'pending' }> {
    try {
      const res = await fetch(`${OZON_PAY_BASE}/payments/${externalId}`, {
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
