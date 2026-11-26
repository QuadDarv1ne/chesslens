// Менеджер движка Stockfish 19 (WASM, lite single-threaded сборка).
// Работает в браузере через Web Worker, общение по UCI через postMessage.

export interface EngineResult {
  cp: number | null;
  /** Мат в N полуходах: положительный — матирует сторона, чей был ход. */
  mate: number | null;
  bestUci: string | null;
  pvUci: string[];
  depth: number;
  nodes: number;
  timeMs: number;
}

type EvalResolve = (r: EngineResult) => void;

interface ActiveSearch {
  resolve: EvalResolve;
  /** 'w' или 'b' — чей ход в анализируемой позиции. */
  turn: 'w' | 'b';
  last: {
    cp: number | null;
    mate: number | null;
    pvUci: string[];
    depth: number;
    nodes: number;
    timeMs: number;
  };
  timer: ReturnType<typeof setTimeout>;
}

class StockfishEngine {
  private worker: Worker | null = null;
  private readyPromise: Promise<void> | null = null;
  private active: ActiveSearch | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  getStatus(): 'off' | 'loading' | 'ready' | 'thinking' {
    if (this.active) return 'thinking';
    if (this.readyPromise) return 'ready';
    return 'off';
  }

  ensureReady(): Promise<void> {
    if (this.readyPromise) return this.readyPromise;
    this.readyPromise = new Promise<void>((resolve, reject) => {
      let settled = false;
      const w = new Worker('/engine/stockfish.js');
      this.worker = w;
      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error('Движок не отвечает'));
        }
      }, 30000);
      w.onmessage = (e: MessageEvent) => {
        if (typeof e.data !== 'string') return;
        const line = e.data;
        if (!settled) {
          if (line.includes('uciok')) {
            w.postMessage('isready');
          } else if (line.includes('readyok')) {
            settled = true;
            clearTimeout(timeout);
            resolve();
          }
          return;
        }
        this.handleLine(line);
      };
      w.onerror = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          reject(new Error('Не удалось загрузить движок'));
        }
      };
      w.postMessage('uci');
    });
    this.readyPromise.catch(() => {
      this.readyPromise = null;
      this.worker = null;
    });
    return this.readyPromise;
  }

  private handleLine(line: string): void {
    const active = this.active;
    if (!active) return;
    if (line.startsWith('info')) {
      if (line.includes(' lowerbound') || line.includes(' upperbound')) return;
      const depth = parseNum(line, 'depth');
      if (depth === null) return;
      if (active.last.depth > 0 && depth < active.last.depth) return;
      const score = parseScore(line);
      if (!score) return;
      const pvMatch = line.match(/\bpv\s+([a-h1-8qnbrq\s]+)$/);
      const pvUci = pvMatch ? pvMatch[1].trim().split(/\s+/) : active.last.pvUci;
      const nodes = parseNum(line, 'nodes') ?? active.last.nodes;
      const timeMs = parseNum(line, 'time') ?? active.last.timeMs;
      active.last = {
        cp: score.cp,
        mate: score.mate,
        pvUci,
        depth,
        nodes,
        timeMs,
      };
    } else if (line.startsWith('bestmove')) {
      const parts = line.split(/\s+/);
      const best = parts[1] && parts[1] !== '(none)' ? parts[1] : null;
      clearTimeout(active.timer);
      this.active = null;
      // UCI: score — с точки зрения стороны, чей был ход. Переводим в перспективу белых.
      const sign = active.turn === 'w' ? 1 : -1;
      active.resolve({
        cp: active.last.cp === null ? null : active.last.cp * sign,
        mate: active.last.mate === null ? null : active.last.mate * sign,
        bestUci: best,
        pvUci: active.last.pvUci,
        depth: active.last.depth,
        nodes: active.last.nodes,
        timeMs: active.last.timeMs,
      });
    }
  }

  /** Оценивает одну позицию на заданную глубину. Последовательный вызов (очередь). */
  evalPosition(fen: string, depth: number): Promise<EngineResult> {
    const run = () =>
      this.ensureReady().then(
        () =>
          new Promise<EngineResult>((resolve, reject) => {
            if (!this.worker) {
              reject(new Error('Движок не инициализирован'));
              return;
            }
            const timer = setTimeout(() => {
              this.stop();
              // Если bestmove не пришёл за 5 секунд после stop — отклоняем промис,
              // чтобы не заблокировать очередь навсегда.
              setTimeout(() => {
                if (this.active?.resolve === resolve) {
                  this.active = null;
                  reject(new Error('Таймаут: движок не ответил'));
                }
              }, 5000);
            }, 45000);
            const turn = fen.split(' ')[1] === 'b' ? 'b' : 'w';
            this.active = {
              resolve,
              turn,
              last: { cp: null, mate: null, pvUci: [], depth: 0, nodes: 0, timeMs: 0 },
              timer,
            };
            this.worker.postMessage('position fen ' + fen);
            this.worker.postMessage('go depth ' + depth);
          }),
      );
    const chained = this.queue.then(run, run);
    this.queue = chained.catch(() => undefined);
    return chained;
  }

  stop(): void {
    this.worker?.postMessage('stop');
  }

  /** Проверяет, можно ли двигать ходы: движок свободен? */
  isBusy(): boolean {
    return this.active !== null;
  }
}

function parseNum(line: string, key: string): number | null {
  const m = line.match(new RegExp(`\\b${key}\\s+(\\d+)`));
  return m ? parseInt(m[1], 10) : null;
}

function parseScore(line: string): { cp: number | null; mate: number | null } | null {
  const m = line.match(/\bscore (cp|mate) (-?\d+)/);
  if (!m) return null;
  if (m[1] === 'cp') return { cp: parseInt(m[2], 10), mate: null };
  // Мат с точки зрения стороны, чей был ход => приводим к перспективе белых позже.
  return { cp: null, mate: parseInt(m[2], 10) };
}

export const engine = new StockfishEngine();
