// Тесты ядра анализа: классификация ходов (упущенный мат, cpLoss, реализованный мат).
// Компилирует analysis.ts/openings.ts через tsc во временную папку и запускает проверки.
// Запуск: npm run test
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
// Собираем внутри проекта, чтобы require('chess.js') находил node_modules.
const outDir = path.join(root, '.test-build');

try {
  execSync(
    `npx tsc src/lib/chess/analysis.ts src/lib/chess/openings.ts --outDir "${outDir}" --module commonjs --target ES2020 --esModuleInterop --skipLibCheck --moduleResolution node --strict false`,
    { cwd: root, stdio: 'inherit' },
  );

  const { buildMoveMeta } = require(path.join(outDir, 'analysis.js'));

  let pass = 0;
  let fail = 0;
  const check = (name, cond, extra) => {
    if (cond) {
      pass++;
      console.log('OK  ', name);
    } else {
      fail++;
      console.log('FAIL', name, extra ?? '');
    }
  };

  // 1. Упущенный мат: был мат в 1, после хода мата нет (mateAfter === null).
  {
    const fens = [
      '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1',
      '6k1/5ppp/8/8/8/8/5PPP/6KR b - - 1 1',
    ];
    const analyses = [
      { cp: null, mate: 1, bestUci: 'a1a8', pvUci: ['a1a8'], pvSan: ['Ra8#'], depth: 10, nodes: 1, timeMs: 1 },
      { cp: 0, mate: null, bestUci: null, pvUci: [], pvSan: [], depth: 10, nodes: 1, timeMs: 1 },
    ];
    const meta = buildMoveMeta({ fens, sans: ['Kh1'], analyses, ply: 1, opening: null });
    check('miss: упущенный мат при mateAfter=null', meta && meta.classification === 'miss', meta && meta.classification);
  }

  // 2. cpLoss не отрицательный, если ход улучшил позицию.
  {
    const fens = [
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    ];
    const analyses = [
      { cp: 0, mate: null, bestUci: 'e2e4', pvUci: ['e2e4'], pvSan: ['e4'], depth: 10, nodes: 1, timeMs: 1 },
      { cp: 50, mate: null, bestUci: null, pvUci: [], pvSan: [], depth: 10, nodes: 1, timeMs: 1 },
    ];
    const meta = buildMoveMeta({ fens, sans: ['e4'], analyses, ply: 1, opening: null });
    check('cpLoss >= 0 при улучшении', meta && (meta.cpLoss === null || meta.cpLoss >= 0), meta && meta.cpLoss);
  }

  // 3. Мат реализован: не должен классифицироваться как miss.
  {
    const fens = [
      '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1',
      'R5k1/5ppp/8/8/8/8/5PPP/6K1 b - - 1 1',
    ];
    const analyses = [
      { cp: null, mate: 1, bestUci: 'a1a8', pvUci: ['a1a8'], pvSan: ['Ra8#'], depth: 10, nodes: 1, timeMs: 1 },
      { cp: null, mate: 1, bestUci: null, pvUci: [], pvSan: [], depth: 10, nodes: 1, timeMs: 1 },
    ];
    const meta = buildMoveMeta({ fens, sans: ['Ra8#'], analyses, ply: 1, opening: null });
    check('мат реализован (не miss)', meta && meta.classification !== 'miss', meta && meta.classification);
  }

  console.log(`\nИтог: ${pass} ok, ${fail} fail`);
  process.exitCode = fail ? 1 : 0;
} finally {
  fs.rmSync(outDir, { recursive: true, force: true });
}
