// Фабрика платёжных провайдеров.
// В dev-режиме (NODE_ENV !== 'production') — по умолчанию mock.
// В production — выбирает по переменной PAYMENT_PROVIDER.

import type { PaymentProvider } from './base';
import { MockProvider } from './mock';
import { YooKassaProvider } from './yookassa';
import { TBankProvider } from './tbank';
import { SbpProvider } from './sbp';
import { OzonPayProvider } from './ozonpay';

/** Проверяет, можно ли использовать данный провайдер в текущем окружении. */
export function isProviderAvailable(name: string): boolean {
  switch (name) {
    case 'mock':
      return process.env.NODE_ENV !== 'production' || process.env.PAYMENT_PROVIDER === 'mock';
    case 'yookassa':
      return !!(process.env.YOOKASSA_SHOP_ID && process.env.YOOKASSA_API_KEY);
    case 'tbank':
      return !!process.env.TBANK_TOKEN;
    case 'ozonpay':
      return !!(process.env.OZON_PAY_CLIENT_ID && process.env.OZON_PAY_API_KEY);
    case 'sbp':
      // СБП работает только если настроен Т-Банк как бэкенд.
      return !!process.env.TBANK_TOKEN;
    default:
      return false;
  }
}

/** Список доступных провайдеров с метаданными для UI. */
export function listAvailableProviders(): { id: string; label: string }[] {
  return [
    { id: 'mock', label: 'Демо-оплата' },
    { id: 'sbp', label: 'СБП' },
    { id: 'tbank', label: 'Т-Банк' },
    { id: 'ozonpay', label: 'Ozon Pay' },
    { id: 'yookassa', label: 'ЮKassa' },
  ].filter((p) => isProviderAvailable(p.id));
}

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
