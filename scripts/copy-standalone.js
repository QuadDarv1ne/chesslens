// Кроссплатформенное копирование ассетов в standalone-сборку Next.js.
// Заменяет `cp -r`, который не работает в стандартном Windows cmd.
// Запуск: node scripts/copy-standalone.js (после `next build`).
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const standalone = path.join(root, '.next', 'standalone');

if (!fs.existsSync(standalone)) {
  console.error('Не найден .next/standalone — сначала выполните next build.');
  process.exit(1);
}

const targets = [
  { from: path.join(root, '.next', 'static'), to: path.join(standalone, '.next', 'static') },
  { from: path.join(root, 'public'), to: path.join(standalone, 'public') },
];

/** Удаляет каталог с несколькими попытками — на Windows файлы могут быть кратко заблокированы. */
function removeWithRetry(dir) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      return;
    } catch (e) {
      if (attempt === 4) throw e;
      // Короткая синхронная пауза между попытками.
      const until = Date.now() + 150 * (attempt + 1);
      while (Date.now() < until) {
        // busy-wait
      }
    }
  }
}

for (const { from, to } of targets) {
  if (!fs.existsSync(from)) {
    console.warn(`Пропущено (нет источника): ${path.relative(root, from)}`);
    continue;
  }
  removeWithRetry(to);
  fs.cpSync(from, to, { recursive: true });
  console.log(`Скопировано: ${path.relative(root, from)} -> ${path.relative(root, to)}`);
}
