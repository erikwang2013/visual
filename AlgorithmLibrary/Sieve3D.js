// AlgorithmLibrary/Sieve3D.js — 埃氏筛 / 线性筛：质数筛选
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Sieve3D');

const scene = new Scene3D('scene', { cameraPos: [0, 380, 620], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const N = 30, COLS = 6;
const GREEN = 0x4ade80, DIM = 0x334155;
const boxes = new Map();
for (let n = 1; n <= N; n++) {
  const c = (n - 1) % COLS, r = Math.floor((n - 1) / COLS);
  const b = new VBox(scene, { w: 44, h: 44, d: 44, x: -150 + c * 60, y: 130 - r * 65, z: 0, label: String(n), color: PALETTE.node, emissive: PALETTE.nodeEmissive });
  boxes.set(n, b);
}
const hint = new VText(scene, { text: '点击「运行埃氏筛」或「运行线性筛」开始', x: 0, y: 250, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

function resetAll() {
  engine.clear();
  for (let n = 1; n <= N; n++) boxes.get(n).setColor(PALETTE.node, PALETTE.nodeEmissive);
  C(200, () => { boxes.get(1).setColor(DIM, DIM); }, () => {});
}

function runEratosthenes() {
  resetAll();
  hint.setText('埃氏筛：从 2 开始，未被筛去的数即质数，再筛去其所有倍数');
  const comp = Array(N + 1).fill(false);
  const steps = [];
  for (let p = 2; p * p <= N; p++) {
    if (comp[p]) continue;
    steps.push({ t: 'prime', n: p });
    for (let m = 2 * p; m <= N; m += p) {
      if (!comp[m]) { comp[m] = true; steps.push({ t: 'comp', n: m }); }
    }
  }
  for (let p = 2; p <= N; p++) if (!comp[p]) steps.push({ t: 'prime', n: p });
  let i = 0;
  const step = () => {
    if (i >= steps.length) {
      const primes = [];
      for (let p = 2; p <= N; p++) if (!comp[p]) primes.push(p);
      status.textContent = '埃氏筛完成：30 以内质数 ' + primes.length + ' 个';
      hint.setText('质数（绿色）：' + primes.join(' '));
      return;
    }
    const e = steps[i]; i++;
    if (e.t === 'prime') {
      C(300, () => boxes.get(e.n).setColor(GREEN, GREEN));
      hint.setText('质数 ' + e.n + '，筛去其倍数');
      C(380, step);
    } else {
      C(220, () => boxes.get(e.n).setColor(DIM, DIM));
      hint.setText('筛去 ' + e.n + '（' + e.n + ' 的倍数）');
      C(240, step);
    }
  };
  step();
}

function runLinearSieve() {
  resetAll();
  hint.setText('线性筛：每个合数只被其最小质因子筛去一次，先闪烁再变暗');
  const comp = Array(N + 1).fill(false);
  const primes = [];
  const steps = [];
  for (let i = 2; i <= N; i++) {
    if (!comp[i]) { primes.push(i); steps.push({ t: 'prime', n: i }); }
    for (const p of primes) {
      const m = i * p;
      if (m > N) break;
      if (!comp[m]) { comp[m] = true; steps.push({ t: 'comp', n: m }); }
      if (i % p === 0) break;
    }
  }
  let i = 0;
  const step = () => {
    if (i >= steps.length) {
      status.textContent = '线性筛完成：每个合数恰被其最小质因子标记一次';
      hint.setText('质数（绿色）：' + primes.join(' '));
      return;
    }
    const e = steps[i]; i++;
    if (e.t === 'prime') {
      C(300, () => boxes.get(e.n).setColor(GREEN, GREEN));
      hint.setText('质数 ' + e.n);
      C(300, step);
    } else {
      C(150, () => boxes.get(e.n).setColor(PALETTE.highlight, PALETTE.highlightEmissive));
      C(150, () => boxes.get(e.n).setColor(DIM, DIM));
      hint.setText('用最小质因子筛去 ' + e.n);
      C(240, step);
    }
  };
  step();
}

panel.addButton('运行埃氏筛', runEratosthenes);
panel.addButton('运行线性筛', runLinearSieve);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
