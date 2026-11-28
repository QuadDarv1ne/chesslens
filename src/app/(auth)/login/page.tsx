'use client';

// Страница входа.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Crown, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Ошибка входа');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError('Не удалось подключиться к серверу');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-2 text-center">
          <Crown className="h-6 w-6 text-emerald-600" />
          <h1 className="text-2xl font-bold">ChessLens</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Вход</CardTitle>
            <CardDescription>Введите email и пароль для входа в аккаунт</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600">
                  {error}
                </div>
              )}
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              <Input
                type="password"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Вход...' : 'Войти'}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm">
              Нет аккаунта?{' '}
              <a href="/register" className="text-emerald-600 hover:underline">
                Зарегистрироваться
              </a>
            </div>
            <div className="mt-3 text-center">
              <a href="/" className="text-xs text-muted-foreground hover:underline flex items-center justify-center gap-1">
                <ArrowLeft className="h-3 w-3" />
                На главную
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
