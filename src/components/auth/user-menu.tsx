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
  /** true, когда данные о пользователе уже загружены (для отличия "не залогинен" от "ещё грузится"). */
  loaded: boolean;
}

let cachedUser: UserState | null = null;
/** Подписчики на обновления пользователя — все смонтированные useUserState. */
const subscribers = new Set<(s: UserState) => void>();
/** Текущий запрос /api/auth/me, чтобы несколько компонентов не дублировали его. */
let inflight: Promise<UserState> | null = null;

const EMPTY_STATE: UserState = {
  user: null,
  subscription: { plan: 'free', status: 'active', expiresAt: null },
  loaded: false,
};

function getUserState(): UserState {
  return cachedUser ?? EMPTY_STATE;
}

function setCachedUser(next: UserState): void {
  cachedUser = next;
  for (const fn of subscribers) fn(next);
}

async function fetchUser(): Promise<UserState> {
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      const data = await res.json();
      return { ...data, loaded: true };
    }
  } catch {
    // сеть недоступна — считаем неавторизованным
  }
  return { user: null, subscription: { plan: 'free', status: 'active', expiresAt: null }, loaded: true };
}

/** Загружает пользователя один раз, деля запрос между всеми подписчиками. */
function ensureLoaded(): Promise<UserState> {
  if (!inflight) {
    inflight = fetchUser().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

/** Сбрасывает кэш и перезагружает данные — нужен после входа/регистрации,
 * чтобы шапка сразу показала актуальное состояние вместо «Войти». */
export function invalidateUser(): void {
  cachedUser = null;
  inflight = null;
  // Запускаем запрос сразу: даже если layout не перемонтируется,
  // подписчики получат свежее состояние.
  void ensureLoaded().then(setCachedUser);
}

export function useUserState() {  const [state, setState] = useState<UserState>(getUserState);

  const refresh = useCallback(async () => {
    setCachedUser(await ensureLoaded());
  }, []);

  useEffect(() => {
    subscribers.add(setState);
    // Начальное состояние уже взято из кэша; здесь только сверяемся с сервером.
    ensureLoaded().then(setCachedUser);
    return () => {
      subscribers.delete(setState);
    };
  }, []);

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
  const { user, subscription, loaded, refresh } = useUserState();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    // Сбрасываем кэш, чтобы шапка сразу показала "Войти", затем сверяемся с сервером.
    setCachedUser({ user: null, subscription: { plan: 'free', status: 'active', expiresAt: null }, loaded: true });
    refresh();
    router.push('/');
  };

  // Пока данные не загружены — держим заглушку того же размера, чтобы шапка не прыгала.
  if (!loaded) {
    return <div className="h-8 w-8 animate-pulse rounded-full bg-muted" aria-hidden />;
  }

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
