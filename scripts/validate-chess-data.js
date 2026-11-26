// Валидация дебютного словаря и примеров партий через chess.js.
// Запуск: npm run validate:chess
// Пути считаются от корня проекта — скрипт работает в любом окружении.
const { Chess } = require('chess.js');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const openingsPath = path.join(root, 'src', 'lib', 'chess', 'openings.ts');
const samplesPath = path.join(root, 'src', 'lib', 'chess', 'samples.ts');

let failed = false;

// --- Дебюты ---
const src = fs.readFileSync(openingsPath, 'utf8');
const re = /\{ name: '([^']+)', moves: '([^']+)' \}/g;
let m;
let count = 0;
let errors = 0;
while ((m = re.exec(src)) !== null) {
  count++;
  const moves = m[2].split(' ');
  const c = new Chess();
  for (const mv of moves) {
    try {
      c.move(mv);
    } catch (e) {
      console.log(`ОШИБКА [${m[1]}] на ходу ${mv}: ${e.message}`);
      errors++;
      break;
    }
  }
}
console.log(`Дебютов проверено: ${count}, ошибок: ${errors}`);
if (errors > 0) failed = true;

// --- Примеры партий ---
const samples = fs.readFileSync(samplesPath, 'utf8');
const sampleRe = /pgn: `([\s\S]*?)`,/g;
let sm;
let sCount = 0;
let sErrors = 0;
const samplePgns = [];
while ((sm = sampleRe.exec(samples)) !== null) {
  sCount++;
  const c = new Chess();
  try {
    c.loadPgn(sm[1].trim());
    const h = c.history();
    console.log(`Пример ${sCount}: OK, ходов ${h.length}, результат ${c.getHeaders().Result || '?'}`);
    samplePgns.push(sm[1].trim());
  } catch (e) {
    console.log(`ПРИМЕР ${sCount} ОШИБКА: ${e.message}`);
    sErrors++;
  }
}
console.log(`Примеров проверено: ${sCount}, ошибок: ${sErrors}`);
if (sErrors > 0) failed = true;

// --- Синтетическая оценка финальной позиции бессмертной партии (мат) ---
if (samplePgns.length > 0) {
  const c2 = new Chess();
  c2.loadPgn(samplePgns[0]);
  const isMate = c2.isCheckmate();
  console.log('Финал бессмертной: isCheckmate =', isMate, 'turn =', c2.turn());
  if (!isMate) {
    console.log('ОШИБКА: ожидался мат в финале бессмертной партии');
    failed = true;
  }
}

if (failed) {
  console.error('Валидация не пройдена.');
  process.exit(1);
}
console.log('Валидация пройдена.');
