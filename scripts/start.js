// Кроссплатформенный запуск standalone-сервера с NODE_ENV=production.
// Заменяет `NODE_ENV=production bun ... | tee server.log`, который не работает
// в стандартном Windows cmd. Логи пишутся и в консоль, и в server.log.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const server = path.join(root, '.next', 'standalone', 'server.js');

if (!fs.existsSync(server)) {
  console.error('Не найден .next/standalone/server.js — сначала выполните npm run build.');
  process.exit(1);
}

const logStream = fs.createWriteStream(path.join(root, 'server.log'), { flags: 'a' });

const child = spawn(process.execPath, [server], {
  env: { ...process.env, NODE_ENV: 'production' },
  stdio: ['ignore', 'pipe', 'pipe'],
});

function forward(chunk) {
  process.stdout.write(chunk);
  logStream.write(chunk);
}
child.stdout.on('data', forward);
child.stderr.on('data', forward);

child.on('exit', (code) => {
  logStream.end();
  process.exit(code ?? 0);
});

// Пробрасываем сигнал остановки дочернему процессу.
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => child.kill(sig));
}
