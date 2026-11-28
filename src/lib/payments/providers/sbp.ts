// СБП (Система быстрых платежей) провайдер.
// Использует ЮKassa или Т-Банк как бэкенд для генерации QR/ссылок СБП.
// В mock-режиме — просто возвращает подтверждённый платёж.

import type { PaymentIntent, PaymentProvider, PaymentConfirmPayload } from './base';
import type { Tariff } from '../tariffs';
import { randomUUID } from 'crypto';
import { MockProvider } from './mock';

// Для продакшена: проксируем к Т-Банк или ЮKassa с параметром sbp.
// В текущей реализации — mock, так как нативный СБП требует интеграции с конкретным банком-эквайером.

export class SbpProvider implements PaymentProvider {
  readonly name: PaymentProvider['name'] = 'sbp';

  async createIntent(tariff: Tariff, description: string, metadata?: Record<string, string>): Promise<PaymentIntent> {
    const id = `sbp_${randomUUID()}`;

    // Если включён production-режим — используем Т-Банк с флагом sbp.
    if (process.env.TBANK_TOKEN) {
      const { TBankProvider } = await import('./tbank');
      const provider = new TBankProvider();
      return provider.createIntent(tariff, `${description} (СБП)`, { ...metadata, payment_method: 'sbp' });
    }

    // Иначе — mock.
    const mock = new MockProvider();
    return mock.createIntent(tariff, description, metadata);
  }

  async confirm(payload: PaymentConfirmPayload): Promise<{ succeeded: boolean; externalId?: string; metadata?: string }> {
    if (process.env.TBANK_TOKEN) {
      const { TBankProvider } = await import('./tbank');
      const provider = new TBankProvider();
      return provider.confirm(payload);
    }

    const mock = new MockProvider();
    return mock.confirm(payload);
  }

  async checkStatus(externalId: string): Promise<{ status: 'confirmed' | 'cancelled' | 'pending' }> {
    if (process.env.TBANK_TOKEN) {
      const { TBankProvider } = await import('./tbank');
      const provider = new TBankProvider();
      return provider.checkStatus(externalId);
    }
    return { status: 'pending' };
  }
}
