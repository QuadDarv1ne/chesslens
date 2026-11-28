// Абстрактный интерфейс платёжного провайдера.
// Каждый провайдер (ЮKassa, Т-Банк, СБП, mock) реализует этот контракт.

import type { Tariff } from '../tariffs';

export interface PaymentIntent {
  /** Уникальный ID платёжного намерения (внешний ID для провайдера). */
  id: string;
  /** URL для редиректа на страницу оплаты (может быть пустым для inline-платёжек). */
  confirmationUrl?: string;
  /** Ссылка на страницу оплаты (для редиректа). */
  paymentUrl?: string;
  /** Состояние платежа у провайдера: confirmed / waiting_for_payment / cancelled. */
  status: 'confirmed' | 'waiting_for_payment' | 'cancelled';
  /** Квитанция (если есть). */
  receiptUrl?: string;
}

export interface PaymentConfirmPayload {
  /** Внешний ID платежа. */
  id: string;
  /** Статус от провайдера. */
  status: 'confirmed' | 'cancelled';
  /** Необязательный внешний ID. */
  externalId?: string;
  /** Метаданные провайдера (JSON-строка). */
  metadata?: string;
}

export interface PaymentProvider {
  /** Название провайдера для записи в БД. */
  name: 'yookassa' | 'tbank' | 'sbp' | 'ozonpay' | 'mock';

  /** Создать платёжное намерение. */
  createIntent(tariff: Tariff, description: string, metadata?: Record<string, string>): Promise<PaymentIntent>;

  /** Подтвердить платёж (вызывается из webhook или poll). */
  confirm(payload: PaymentConfirmPayload): Promise<{ succeeded: boolean; externalId?: string; metadata?: string }>;

  /** Проверить статус существующего платежа. */
  checkStatus(externalId: string): Promise<{ status: 'confirmed' | 'cancelled' | 'pending' }>;
}
