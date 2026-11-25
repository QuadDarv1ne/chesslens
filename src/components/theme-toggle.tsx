'use client';

// Переключатель темы оформления в шапке: системная + 5 фиксированных тем.
import { useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { Check, Monitor, Moon, Palette, Sun, Waves, Leaf, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { THEME_LIST } from '@/lib/theme';

const ICONS = {
  sun: Sun,
  moon: Moon,
  waves: Waves,
  leaf: Leaf,
  book: BookOpen,
} as const;

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  // До монтирования не показываем кнопку, чтобы не мигало (SSR-гидратация).
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" aria-label="Тема оформления" className="h-9 w-9 opacity-0">
        <Palette className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Тема оформления" title="Тема оформления" className="h-9 w-9">
          <Palette className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Тема оформления</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setTheme('system')} className="text-sm">
          <Monitor className="mr-2 h-4 w-4" />
          Системная
          {theme === 'system' ? <Check className="ml-auto h-3.5 w-3.5" /> : <span className="ml-auto text-[10px] text-muted-foreground">{resolvedTheme === 'light' ? 'светлая' : 'тёмная'}</span>}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {THEME_LIST.map((t) => {
          const Icon = ICONS[t.icon];
          return (
            <DropdownMenuItem key={t.value} onClick={() => setTheme(t.value)} className="text-sm">
              <Icon className="mr-2 h-4 w-4" />
              {t.label}
              {theme === t.value ? <Check className="ml-auto h-3.5 w-3.5" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
