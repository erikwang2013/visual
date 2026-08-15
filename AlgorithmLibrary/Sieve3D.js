// AlgorithmLibrary/Sieve3D.js — 埃氏筛 / 线性筛：1..30 网格逐数标记，质数绿色锁定、合数暗灰，线性筛强调「每个合数恰被最小质因子筛去一次」（function* 生成器驱动）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
applyTheme('Sieve3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GREEN = 0x4ade80, RED = 0xfb7185, CYAN = 0x22d3ee, DIM = 0x334155;
const status = panel.addStatus('就绪');

const N = 30, COLS = 6;
const boxes = new Map();
for (let n = 1; n <= N; n++) {
  const c = (n - 1) % COLS, r = Math.floor((n - 1) / COLS);
  boxes.set(n, new VBox(scene, { w: 44, h: 44, d: 44, x: 170 + c * 60, y: 590 - r * 65, z: 0, label: String(n), color: BLUE, emissive: BLUE }));
}
function clearView() { boxes.forEach(b => b.setColor(BLUE, BLUE)); }
function box(n) { return boxes.get(n); }

function* eratGen() {
  yield S(() => { status.textContent = '埃氏筛：从 2 开始，凡是「未被筛去」的数就是质数，然后把它所有的倍数筛掉 —— 一个数可能被多个质数筛多次（红=当前质数，绿=质数锁定，青=正在筛掉的合数，暗灰=已筛去）'; });
  yield W(650);
  const comp = Array(N + 1).fill(false);
  for (let p = 2; p * p <= N; p++) {
    if (comp[p]) continue;
    box(p).setColor(RED, RED);
    yield S(() => { status.textContent = '质数 ' + p + '（√30≈5.5，筛到 p²>30 即可停）→ 筛去 2p, 3p, …'; });
    yield W(420);
    box(p).setColor(GREEN, GREEN);
    for (let m = 2 * p; m <= N; m += p) {
      if (comp[m]) continue;
      comp[m] = true;
      box(m).setColor(CYAN, CYAN);
      yield S(() => { status.textContent = '筛去 ' + m + ' = ' + p + ' × ' + (m / p) + '（' + p + ' 的倍数）'; });
      yield W(120);
      box(m).setColor(DIM, DIM);
    }
  }
  for (let p = 2; p <= N; p++) if (!comp[p] && p * p > N) {
    box(p).setColor(RED, RED);
    yield S(() => { status.textContent = '剩余未筛去的都是质数：' + p + '（无更小质数整除它）'; });
    yield W(250);
    box(p).setColor(GREEN, GREEN);
  }
  const allPrimes = [];
  for (let p = 2; p <= N; p++) if (!comp[p]) allPrimes.push(p);
  yield S(() => { status.textContent = '30 以内质数 ' + allPrimes.length + ' 个：' + allPrimes.join('、') + '；复杂度 O(n log log n)，缺点：12 被 2、3 各筛一次，重复工作'; });
  yield W(800);
  yield S(() => { status.textContent = '埃氏筛演示完成：30 以内质数 ' + allPrimes.length + ' 个（' + allPrimes.join(' ') + '），复杂度 O(n log log n)'; });
  yield W(500);
}

function* linearGen() {
  yield S(() => { status.textContent = '线性筛：每个合数只被它的「最小质因子」筛去一次 —— i×p 中保证 p 是 m 的最小质因子（i%p==0 就停）（红=当前质数，绿=质数锁定，青=正在筛掉的合数，暗灰=已筛去）'; });
  yield W(700);
  const comp = Array(N + 1).fill(false);
  const primes = [];
  for (let i = 2; i <= N; i++) {
    if (!comp[i]) {
      primes.push(i);
      box(i).setColor(RED, RED);
      yield S(() => { status.textContent = 'i=' + i + ' 未被标记 → 质数，加入质数表'; });
      yield W(300);
      box(i).setColor(GREEN, GREEN);
    } else {
      yield S(() => { status.textContent = 'i=' + i + ' 已被标记 → 合数，跳过（关键：它之前已被最小质因子筛过）'; });
      yield W(180);
    }
    for (const p of primes) {
      const m = i * p;
      if (m > N) break;
      if (!comp[m]) {
        comp[m] = true;
        box(m).setColor(CYAN, CYAN);
        yield S(() => { status.textContent = 'i=' + i + ' × p=' + p + ' = ' + m + '（p=' + p + ' 是 ' + m + ' 的最小质因子，只筛这一次）'; });
        yield W(180);
        box(m).setColor(DIM, DIM);
      }
      if (i % p === 0) {
        yield S(() => { status.textContent = 'i % p == 0 → break：再乘更大的 p 就不是最小质因子了（如 4×3=12 的最小质因子是 2，留给 i=6×2）'; });
        yield W(260);
        break;
      }
    }
  }
  yield S(() => { status.textContent = '30 以内质数：' + primes.join('、') + '；复杂度 O(n)：每个合数恰被筛一次 —— 12 只被 6×2 筛，不再被 4×3 筛'; });
  yield W(800);
  yield S(() => { status.textContent = '线性筛演示完成：30 以内质数 ' + primes.length + ' 个（' + primes.join(' ') + '），每个合数恰被最小质因子筛去一次，复杂度 O(n)'; });
  yield W(500);
}

function* runEra() {
  clearView();
  yield W(400);
  yield* eratGen();
}
function* runLin() {
  clearView();
  yield W(400);
  yield* linearGen();
}

panel.addButton('运行埃氏筛', () => engine.start(runEra()));
panel.addButton('运行线性筛', () => engine.start(runLin()));
engine.queue(() => runEra());
panel.addButton('清空', () => { engine.clear(); clearView(); status.textContent = ''; });

scene.start(engine);
