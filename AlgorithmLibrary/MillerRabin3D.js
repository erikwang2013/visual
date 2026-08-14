// AlgorithmLibrary/MillerRabin3D.js — Miller–Rabin 素性测试：n−1 = d·2^s，取底数 b，先算 x = b^d，再连续平方 s 次撞 −1 —— 概率正确、多项式时间（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('MillerRabin3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const status = panel.addStatus('就绪');

const ROUNDS = [
  { n: 97, b: 2, label: '97（素数）· 底数 2' },
  { n: 97, b: 3, label: '97（素数）· 底数 3' },
  { n: 91, b: 2, label: '91（合数）· 底数 2' }
];
function modPow(b, e, m) {
  let r = 1; b %= m;
  while (e > 0) { if (e & 1) r = (r * b) % m; b = (b * b) % m; e >>= 1; }
  return r;
}
function mrRound(n, b) {
  let d = n - 1, s = 0;
  while (d % 2 === 0) { d /= 2; s++; }
  let x = modPow(b, d, n);
  const xs = [x];
  for (let k = 0; k < s; k++) { x = (x * x) % n; xs.push(x); if (x === n - 1) break; }
  const pass = xs.some((v, i) => v === n - 1 || (i === 0 && v === 1));
  return { n, b, d, s, xs, pass };
}
const data = ROUNDS.map(r => ({ ...r, ...mrRound(r.n, r.b) }));

const nBox = new VBox(scene, { w: 130, h: 50, d: 50, x: 230, y: 470, z: 0, label: 'n = 97', color: DIM, emissive: DIM });
const dBox = new VBox(scene, { w: 90, h: 44, d: 44, x: 360, y: 470, z: 0, label: 'd = 3', color: DIM, emissive: DIM });
const sBox = new VBox(scene, { w: 90, h: 44, d: 44, x: 490, y: 470, z: 0, label: 's = 5', color: DIM, emissive: DIM });
const baseBox = new VBox(scene, { w: 110, h: 44, d: 44, x: 230, y: 360, z: 0, label: '底数 b = 2', color: DIM, emissive: DIM });
const xBox = new VBox(scene, { w: 240, h: 52, d: 52, x: 450, y: 360, z: 0, label: 'x = ?', color: DIM, emissive: DIM });
const xSeq = new VText(scene, { text: '', x: 320, y: 310, z: 0, color: PALETTE.textGlow, scale: 0.45, wrapChars: 32 });
const verdictT = new VText(scene, { text: '', x: 320, y: 700, z: 0, color: GOLD, scale: 0.7, wrapChars: 20 });

function setCell(obj, v, color) { obj.setText(String(v)); if (color) obj.setColor(color, color); }

function* roundGen(r, ri) {
  setCell(nBox, 'n = ' + r.n, CYAN);
  setCell(dBox, 'd = ' + r.d, DIM); setCell(sBox, 's = ' + r.s, DIM);
  setCell(baseBox, '底数 b = ' + r.b, DIM); setCell(xBox, 'x = ?', DIM);
  verdictT.setText('');
  yield S(() => { status.textContent = '第 ' + (ri + 1) + ' 轮：' + r.label + ' —— 先分解 n−1：' + r.n + ' − 1 = ' + (r.n - 1) + ' = ' + r.d + ' × 2^' + r.s + '，把 2 的因子全部提出来'; });
  yield W(700);
  setCell(xBox, 'x = ' + r.b + '^' + r.d + ' mod ' + r.n + ' = ' + r.xs[0], PUR);
  yield S(() => { status.textContent = 'x = b^d mod n = ' + r.xs[0] + '（快速幂一步到位）—— 若第一格就是 1 或 n−1（±1）直接通过，否则进入平方循环找 −1'; });
  yield W(700);
  for (let k = 1; k < r.xs.length; k++) {
    const v = r.xs[k];
    setCell(xBox, 'x = x² mod ' + r.n + ' = ' + v, v === r.n - 1 ? GOLD : v === 1 ? RED : PUR);
    xSeq.setText('平方序列：' + r.xs.map((t, i) => (i === k ? '[' : '') + t + (i === k ? ']' : '')).join(' → '));
    yield S(() => {
      status.textContent = v === r.n - 1
        ? '平方 ' + k + '：x = ' + v + ' = n−1（即 −1）—— 素数才会有的「−1 平方根」'
        : v === 1
          ? '平方 ' + k + '：x 变成 1 却没先遇到 −1 —— 非平凡平方根，合数特征！'
          : '平方 ' + k + '：x = ' + v + ' —— 未到 −1，继续平方';
    });
    yield W(600);
  }
  if (r.pass) {
    setCell(xBox, 'x = x² mod ' + r.n + ' = ' + r.xs[r.xs.length - 1], GOLD);
    verdictT.setText(r.n + ' 在底数 ' + r.b + ' 下：probably prime ✓（撞出 −1）', { color: GOLD });
    yield S(() => { status.textContent = '第 ' + (ri + 1) + ' 轮通过：' + r.n + ' 撞出 −1 —— 只有素数才会出现这种 −1 平方根，合数几乎不可能'; });
  } else {
    setCell(xBox, 'x = x² mod ' + r.n + ' = ' + r.xs[r.xs.length - 1], RED);
    verdictT.setText(r.n + ' 在底数 ' + r.b + ' 下：composite ✗（底数 2 是证人）', { color: RED });
    yield S(() => { status.textContent = '第 ' + (ri + 1) + ' 轮露馅：' + r.n + ' 的平方序列从未出现 −1 —— 底数 2 是合数证人'; });
  }
  yield W(800);
}

function* mrGen() {
  yield S(() => { status.textContent = 'Miller–Rabin 素性测试：n−1 = d·2^s，先算 x = b^d，再连续平方 s 次 —— 只有「遇到 −1」或「第一格就是 ±1」才通过'; });
  yield W(700);
  yield S(() => { status.textContent = '三场测试：97 用底数 2、3 各测一轮（都通过）；91 用底数 2 测一轮（露馅）'; });
  yield W(700);
  for (let i = 0; i < data.length; i++) {
    yield* roundGen(data[i], i);
    xSeq.setText('');
    yield W(300);
  }
  yield S(() => { status.textContent = '结果：97 两轮全过（probably prime），91 一轮就被抓（composite）—— 单轮错误率 ≤ 1/4，多轮叠加后低于硬件故障率'; });
  yield W(1100);
  yield S(() => { status.textContent = '反例：Carmichael 数（如 561）能骗过底数 2 —— 换底数 3 立刻暴露，所以多轮必抓；应用：RSA 大素数生成、OpenSSL/GMP'; });
  yield W(1100);
  yield S(() => { status.textContent = '复杂度 O(k·log³n)：k 轮快速幂 —— 对比 AKS 确定性但常数巨大，MR 概率可调、工程界事实标准'; });
  yield W(1100);
}

function* runMR() {
  yield W(400);
  yield* mrGen();
  yield S(() => { status.textContent = 'Miller–Rabin 演示完成：97 → probably prime（底数 2、3 两轮通过），91 → composite（底数 2 一轮露馅）'; });
  yield W(400);
}

engine.queue(() => runMR());
panel.addButton('清空', () => { engine.clear(); verdictT.setText(''); xSeq.setText(''); setCell(nBox, 'n = 97', DIM); setCell(dBox, 'd = 3', DIM); setCell(sBox, 's = 5', DIM); setCell(baseBox, '底数 b = 2', DIM); setCell(xBox, 'x = ?', DIM); status.textContent = ''; });

scene.start(engine);
