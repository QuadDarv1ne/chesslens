// Mock-провайдер оплаты.
// Используется в dev-режиме и когда PROXY_MODE=mock.
// Имитирует успешный платёж: создаёт намерение со статусом "waiting",
// а при подтверждении сразу возвращает "confirmed".

import type { PaymentIntent, PaymentProvider, PaymentConfirmPayload } from './base';
import type { Tariff } from '../tariffs';
import { randomUUID } from 'crypto';

export class MockProvider implements PaymentProvider {
  readonly name: PaymentProvider['name'] = 'mock';

  async createIntent(tariff: Tariff, description: string, _metadata?: Record<string, string>): Promise<PaymentIntent> {
    const id = `mock_${randomUUID()}`;
    return {
      id,
      status: 'waiting_for_payment',
    };
  }

  async confirm(payload: PaymentConfirmPayload): Promise<{ succeeded: boolean; externalId?: string; metadata?: string }> {
    // Mock всегда успешен.
    return {
      succeeded: true,
      externalId: payload.id,
      metadata: payload.metadata,
    };
  }

  async checkStatus(_externalId: string): Promise<{ status: 'confirmed' | 'cancelled' | 'pending' }> {
    return { status: 'pending' };
  }
}
