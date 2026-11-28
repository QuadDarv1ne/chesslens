'use client';

// Личный кабинет.
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, CheckCircle, XCircle, Loader2, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUserState } from '@/components/auth/user-menu';
import { TARIFFS } from '@/lib/payments/tariffs';

interface Order {
  id: string;
  provider: string;
  plan: string;
  tariffId: string | null;
  amount: number;
  currency: string;
  status: string;
  paidAt: string | null;
  createdAt: string;
}

function getTariffName(tariffId: string | null): string {
  if (!tariffId) return 'Pro';
  return TARIFFS.find((t) => t.id === tariffId)?.name ?? tariffId;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, subscription, loaded, refresh } = useUserState();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'processing' | 'success' | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const ordersRes = await fetch('/api/payments/orders');
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setOrders(data.orders ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    // Читаем ?payment=... без useSearchParams (не требует Suspense boundary).
    const p = new URLSearchParams(window.location.search).get('payment');
    if (!p) return;
    setPaymentStatus(p === 'success' ? 'success' : 'processing');
    refresh();
    loadOrders();
    const t = setTimeout(() => setPaymentStatus(null), 10000);
    return () => clearTimeout(t);
  }, [refresh, loadOrders]);

  const isPro = subscription?.plan === 'pro' && subscription?.status === 'active';

  const formatPrice = (amount: number) => {
    return `${(amount / 100).toFixed(0)} ₽`;
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('ru-RU');
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <Badge variant="default" className="bg-emerald-600">Оплачен</Badge>;
      case 'pending':
        return <Badge variant="secondary">Ожидает</Badge>;
      case 'canceled':
        return <Badge variant="outline">Отменён</Badge>;
      case 'failed':
        return <Badge variant="destructive">Ошибка</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!loaded) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <h1 className="mb-4 text-2xl font-bold">Доступ запрещён</h1>
        <p className="mb-6 text-muted-foreground">Войдите в аккаунт для доступа к личному кабинету</p>
        <Button onClick={() => router.push('/login')}>
          <CreditCard className="mr-2 h-4 w-4" />
          Войти
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <a href="/" className="text-sm text-muted-foreground hover:underline flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" />
          На главную
        </a>
        <h1 className="text-2xl font-bold">Личный кабинет</h1>
      </div>

      {/* Статус оплаты */}
      {paymentStatus === 'processing' && (
        <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-center gap-2 text-amber-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Оплата обрабатывается. Обновляем данные...</span>
        </div>
      )}

      {paymentStatus === 'success' && (
        <div className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 flex items-center gap-2 text-emerald-700">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm">Оплата успешно проведена!</span>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Профиль */}
        <Card>
          <CardHeader>
            <CardTitle>Профиль</CardTitle>
            <CardDescription>Информация об аккаунте</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-sm text-muted-foreground">Имя:</span>
              <p className="font-medium">{user.name || 'Не указано'}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Email:</span>
              <p className="font-medium">{user.email}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Дата регистрации:</span>
              <p className="font-medium">{formatDate(user.createdAt)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Подписка */}
        <Card>
          <CardHeader>
            <CardTitle>Подписка</CardTitle>
            <CardDescription>Текущий тариф и статус</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Тариф:</span>
              <span className="font-medium">{isPro ? 'Pro' : 'Free'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Статус:</span>
              {isPro ? (
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Истекает:</span>
              <span className="font-medium">{formatDate(subscription?.expiresAt ?? null)}</span>
            </div>
            <Button className="w-full" variant={isPro ? 'outline' : 'default'} onClick={() => router.push('/pricing')}>
              {isPro ? 'Продлить Pro' : 'Перейти на Pro'}
            </Button>
          </CardContent>
        </Card>

        {/* История платежей */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>История платежей</CardTitle>
              <CardDescription>Все ваши транзакции</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { loadOrders(); refresh(); }}
              title="Обновить"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : orders.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                У вас пока нет платежей
                <Button className="ml-4" variant="link" onClick={() => router.push('/pricing')}>
                  Перейти к тарифам
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-2 text-left font-medium text-muted-foreground">Дата</th>
                      <th className="pb-2 text-left font-medium text-muted-foreground">Тариф</th>
                      <th className="pb-2 text-left font-medium text-muted-foreground">Сумма</th>
                      <th className="pb-2 text-left font-medium text-muted-foreground">Провайдер</th>
                      <th className="pb-2 text-left font-medium text-muted-foreground">Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-b last:border-0">
                        <td className="py-3">{formatDate(order.createdAt)}</td>
                        <td className="py-3">{getTariffName(order.tariffId)}</td>
                        <td className="py-3">{formatPrice(order.amount)}</td>
                        <td className="py-3 capitalize">{order.provider === 'ozonpay' ? 'Ozon Pay' : order.provider}</td>
                        <td className="py-3">{statusBadge(order.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
