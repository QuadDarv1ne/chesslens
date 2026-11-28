// Фабрика платёжных провайдеров.
// В dev-режиме (NODE_ENV !== 'production') — по умолчанию mock.
// В production — выбирает по переменной PAYMENT_PROVIDER.

import type { PaymentProvider } from './base';
import { MockProvider } from './mock';
import { YooKassaProvider } from './yookassa';
import { TBankProvider } from './tbank';
import { SbpProvider } from './sbp';
import { OzonPayProvider } from './ozonpay';

export function getProvider(name: PaymentProvider['name'] = 'mock'): PaymentProvider {
  switch (name) {
    case 'yookassa':
      if (!process.env.YOOKASSA_SHOP_ID || !process.env.YOOKASSA_API_KEY) {
        throw new Error('YOOKASSA_SHOP_ID и YOOKASSA_API_KEY обязательны для ЮKassa');
      }
      return new YooKassaProvider();
    case 'tbank':
      if (!process.env.TBANK_TOKEN) {
        throw new Error('TBANK_TOKEN обязателен для Т-Банк');
      }
      return new TBankProvider();
    case 'sbp':
      return new SbpProvider();
    case 'ozonpay':
      if (!process.env.OZON_PAY_CLIENT_ID || !process.env.OZON_PAY_API_KEY) {
        throw new Error('OZON_PAY_CLIENT_ID и OZON_PAY_API_KEY обязательны для Ozon Pay');
      }
      return new OzonPayProvider();
    case 'mock':
    default:
      return new MockProvider();
  }
}

/** Получить провайдер по env-переменной PAYMENT_PROVIDER. */
export function getProviderFromEnv(): PaymentProvider {
  const env = process.env.PAYMENT_PROVIDER;
  if (!env) {
    // В dev — mock, в production — требуем явно.
    if (process.env.NODE_ENV === 'production') {
      throw new Error('PAYMENT_PROVIDER не задана');
    }
    return new MockProvider();
  }
  return getProvider(env as PaymentProvider['name']);
}
