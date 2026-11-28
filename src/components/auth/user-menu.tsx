'use client';

// Меню пользователя в шапке.
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User, LogOut, CreditCard, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UserState {
  user: { id: string; email: string; name: string | null; role: string; createdAt: string } | null;
  subscription: { plan: string; status: string; expiresAt: string | null } | null;
}

let cachedUser: UserState | null = null;
let listeners: Set<() => void> = new Set();

function getUserState(): UserState {
  return cachedUser ?? { user: null, subscription: { plan: 'free', status: 'active', expiresAt: null } };
}

export function useUserState() {
  const [state, setState] = useState<UserState>(getUserState);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        cachedUser = data;
      } else {
        cachedUser = { user: null, subscription: { plan: 'free', status: 'active', expiresAt: null } };
      }
      setState(getUserState());
    } catch {
      cachedUser = { user: null, subscription: { plan: 'free', status: 'active', expiresAt: null } };
      setState(getUserState());
    }
  }, []);

  useEffect(() => {
    listeners.add(refresh);
    let active = true;
    // Загружаем пользователя при первом рендере; setState — только после await.
    (async () => {
      try {
        const res = await fetch('/api/auth/me');
        cachedUser = res.ok
          ? await res.json()
          : { user: null, subscription: { plan: 'free', status: 'active', expiresAt: null } };
      } catch {
        cachedUser = { user: null, subscription: { plan: 'free', status: 'active', expiresAt: null } };
      }
      if (active) setState(getUserState());
    })();
    return () => {
      active = false;
      listeners.delete(refresh);
    };
  }, [refresh]);

  return { ...state, refresh };
}

function UserAvatar({ name, email }: { name: string | null; email: string }) {
  const initial = name?.[0]?.toUpperCase() ?? email[0].toUpperCase();
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
      {initial}
    </div>
  );
}

export function UserMenu() {
  const router = useRouter();
  const { user, subscription, refresh } = useUserState();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    cachedUser = null;
    refresh();
    router.push('/');
  };

  if (!user) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 text-xs"
        onClick={() => router.push('/login')}
      >
        <User className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Войти</span>
      </Button>
    );
  }

  const isPro = subscription?.plan === 'pro' && subscription?.status === 'active';

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full p-1 hover:bg-accent/50 transition-colors">
          <UserAvatar name={user.name} email={user.email} />
          {isPro && (
            <span className="hidden rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 sm:inline">
              PRO
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="truncate text-sm font-medium">{user.name || user.email}</div>
          <div className="truncate text-xs text-muted-foreground">{user.email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/dashboard')}>
          <Settings className="mr-2 h-4 w-4" />
          Личный кабинет
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push('/pricing')}>
          <CreditCard className="mr-2 h-4 w-4" />
          Тарифы
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Выйти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
