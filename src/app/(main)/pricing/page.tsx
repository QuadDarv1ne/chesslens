'use client';

// Страница тарифов.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Crown, Loader2, ArrowLeft, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TARIFFS } from '@/lib/payments/tariffs';
import { useUserState } from '@/components/auth/user-menu';

interface ProviderOption {
  id: string;
  label: string;
}

export default function PricingPage() {
  const router = useRouter();
  const { user, loaded, refresh } = useUserState();
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [provider, setProvider] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/payments/providers')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.providers?.length) return;
        setProviders(data.providers);
        setProvider((prev) => prev ?? data.default ?? data.providers[0].id);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const handlePay = async (tariffId: string) => {
    if (!loaded) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (!provider) {
      setError('Не удалось определить способ оплаты');
      return;
    }
    setLoading(tariffId);
    setError('');
    setSuccess(null);
    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tariffId, provider }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Ошибка создания платежа');
        return;
      }
      const data = await res.json();
      if (data.paymentUrl) {
        window.open(data.paymentUrl, '_blank');
      } else if (data.activated) {
        // Mock-режим: оплата имитируется мгновенно, подписка активирована.
        const tariff = TARIFFS.find((t) => t.id === tariffId);
        setSuccess(`Тариф "${tariff?.name ?? tariffId}" активирован (демо-режим)`);
        refresh();
      } else {
        setError('URL оплаты не получен');
      }
    } catch {
      setError('Не удалось создать платёж');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-8 text-center">
        <a href="/" className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline">
          <ArrowLeft className="h-3 w-3" />
          На главную
        </a>
        <h1 className="mb-2 text-3xl font-bold">Тарифы ChessLens</h1>
        <p className="text-muted-foreground">
          Выберите план, который подходит именно вам
        </p>
      </div>

      {/* Выбор способа оплаты */}
      {providers.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
          <span className="text-sm text-muted-foreground">Способ оплаты:</span>
          {providers.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setProvider(p.id)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                provider === p.id
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-border bg-panel text-foreground/80 hover:bg-accent'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-3">
        {TARIFFS.map((tariff) => (
          <Card key={tariff.id} className="relative flex flex-col">
            {tariff.id === 'pro_annual' && (
              <Badge className="absolute right-3 top-3 bg-emerald-600" variant="default">
                Выгодно
              </Badge>
            )}
            <CardHeader>
              <CardTitle>{tariff.name}</CardTitle>
              <CardDescription>{tariff.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              <div className="text-3xl font-bold">
                {(tariff.priceKopecks / 100).toFixed(0)} ₽
              </div>
              <ul className="flex-1 space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  Расширенный анализ партий
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  Глубокая оценка ходов
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  Приоритетная поддержка
                </li>
              </ul>
              <Button
                className="w-full"
                onClick={() => handlePay(tariff.id)}
                disabled={loading === tariff.id || !loaded}
              >
                {loading === tariff.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Обработка...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Оплатить
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {success && (
        <div className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600">
          {success}
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {loaded && !user && (
        <div className="mt-8 text-center">
          <p className="mb-2 text-sm text-muted-foreground">Нужен аккаунт?</p>
          <Button variant="outline" onClick={() => router.push('/login')}>
            <Crown className="mr-2 h-4 w-4" />
            Войти или зарегистрироваться
          </Button>
        </div>
      )}
    </div>
  );
}
