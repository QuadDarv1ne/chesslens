// Т-Банк (Т-Банк Платёж) провайдер.
// Документация: https://www.tinkoff.ru/kassa/
//
// Переменные окружения:
//   TBANK_TOKEN — токен магазина
//   TBANK_WEBHOOK_URL — URL webhook-адреса (обязательно HTTPS)

import type { PaymentIntent, PaymentProvider, PaymentConfirmPayload } from './base';
import type { Tariff } from '../tariffs';
import { randomUUID } from 'crypto';

const TBANK_TOKEN = process.env.TBANK_TOKEN ?? '';
const TBANK_MERCHANT_INN = process.env.TBANK_MERCHANT_INN ?? '';
const TBANK_MERCHANT_KPP = process.env.TBANK_MERCHANT_KPP ?? '';
const TBANK_BANK_BIC = process.env.TBANK_BANK_BIC ?? '';
const TBANK_CORRESPONDENT_ACCOUNT = process.env.TBANK_CORRESPONDENT_ACCOUNT ?? '';
const TBANK_ACCOUNT_NUMBER = process.env.TBANK_ACCOUNT_NUMBER ?? '';
const TBANK_CONTRACT_NUMBER = process.env.TBANK_CONTRACT_NUMBER ?? '';

function authHeader(): Record<string, string> {
  return { Authorization: `Bearer ${TBANK_TOKEN}`, 'Content-Type': 'application/json' };
}

export class TBankProvider implements PaymentProvider {
  readonly name: PaymentProvider['name'] = 'tbank';

  async createIntent(tariff: Tariff, description: string, metadata?: Record<string, string>): Promise<PaymentIntent> {
    const id = `tb_${randomUUID()}`;

    const res = await fetch('https://online.tbank.ru/invoices/v1/invoices', {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify({
        merchant_inn: TBANK_MERCHANT_INN,
        amount: {
          value: (tariff.priceKopecks / 100).toFixed(2),
          currency: 'RUB',
        },
        description,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 часа
        // Реквизиты получателя (Т-Банк) для платёжного поручения.
        recipient: {
          name: 'Дуплей Максим Игоревич',
          account: TBANK_ACCOUNT_NUMBER,
          bic: TBANK_BANK_BIC,
          correspondent_account: TBANK_CORRESPONDENT_ACCOUNT,
          inn: TBANK_MERCHANT_INN,
          kpp: TBANK_MERCHANT_KPP,
        },
        payment_purpose: `Перевод средств по договору №${TBANK_CONTRACT_NUMBER} НДС не облагается`,
        metadata: { tariff_id: tariff.id, contract: TBANK_CONTRACT_NUMBER, ...metadata },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Т-Банк createInvoice failed ${res.status}: ${text}`);
    }

    const data = (await res.json()) as { id: string; pay_url?: string; status?: string };
    return {
      id,
      paymentUrl: data.pay_url,
      confirmationUrl: data.pay_url,
      status: data.status === 'paid' ? 'confirmed' : 'waiting_for_payment',
    };
  }

  async confirm(payload: PaymentConfirmPayload): Promise<{ succeeded: boolean; externalId?: string; metadata?: string }> {
    try {
      // Т-Банк подтверждает через webhook; при ручном подтверждении — запрос статуса.
      const res = await fetch(`https://online.tbank.ru/invoices/v1/invoices/${payload.externalId ?? payload.id}`, {
        headers: authHeader(),
      });

      if (!res.ok) return { succeeded: false };

      const data = (await res.json()) as { status: string };
      return {
        succeeded: data.status === 'paid',
        externalId: payload.externalId ?? payload.id,
      };
    } catch (err) {
      console.error('Т-Банк confirm error:', err);
      return { succeeded: false };
    }
  }

  async checkStatus(externalId: string): Promise<{ status: 'confirmed' | 'cancelled' | 'pending' }> {
    try {
      const res = await fetch(`https://online.tbank.ru/invoices/v1/invoices/${externalId}`, {
        headers: authHeader(),
      });

      if (!res.ok) return { status: 'pending' };

      const data = (await res.json()) as { status: string };
      if (data.status === 'paid') return { status: 'confirmed' };
      if (data.status === 'canceled') return { status: 'cancelled' };
      return { status: 'pending' };
    } catch {
      return { status: 'pending' };
    }
  }
}
