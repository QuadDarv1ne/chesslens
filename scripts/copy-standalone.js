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

for (const { from, to } of targets) {
  if (!fs.existsSync(from)) {
    console.warn(`Пропущено (нет источника): ${path.relative(root, from)}`);
    continue;
  }
  fs.rmSync(to, { recursive: true, force: true });
  fs.cpSync(from, to, { recursive: true });
  console.log(`Скопировано: ${path.relative(root, from)} -> ${path.relative(root, to)}`);
}
