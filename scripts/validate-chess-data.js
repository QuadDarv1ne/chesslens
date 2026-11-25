// Валидация дебютного словаря и примеров партий через chess.js
const { Chess } = require('/home/z/my-project/node_modules/chess.js');
const fs = require('fs');

const src = fs.readFileSync('/home/z/my-project/src/lib/chess/openings.ts', 'utf8');
const re = /\{ name: '([^']+)', moves: '([^']+)' \}/g;
let m, errors = 0, count = 0;
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

// Примеры партий
const samples = fs.readFileSync('/home/z/my-project/src/lib/chess/samples.ts', 'utf8');
const sampleRe = /pgn: `([\s\S]*?)`,/g;
let sm, sCount = 0, sErrors = 0;
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

// Проверка синтетической оценки финальной позиции бессмертной партии (мат)
const c2 = new Chess();
c2.loadPgn(samplePgns[0]);
console.log('Финал бессмертной: isCheckmate =', c2.isCheckmate(), 'turn =', c2.turn());
