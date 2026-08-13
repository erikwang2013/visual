// AlgorithmLibrary/MillerRabin3D.js — Miller–Rabin 素性测试：n−1 = d·2^s，取底数 b，先算 x = b^d，再连续平方 s 次撞 −1 —— 概率正确、多项式时间（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('MillerRabin3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：Miller–Rabin —— 97 两轮通过、91 一轮露馅', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 320, y: 555, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 700, y: 330, z: 0, color: PALETTE.textGlow, scale: 0.58, wrapChars: 8 });
const outT = new VText(scene, { text: '', x: 700, y: 420, z: 0, color: PALETTE.textGlow, scale: 0.62, wrapChars: 8 });

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
const xSeq = new VText(scene, { text: '', x: 700, y: 255, z: 0, color: PALETTE.textGlow, scale: 0.52, wrapChars: 8 });
const verdictT = new VText(scene, { text: '', x: 700, y: 215, z: 0, color: GOLD, scale: 0.7, wrapChars: 8 });

function setCell(obj, v, color) { obj.setText(String(v)); if (color) obj.setColor(color, color); }

function* roundGen(r, ri) {
  setCell(nBox, 'n = ' + r.n, CYAN);
  setCell(dBox, 'd = ' + r.d, DIM); setCell(sBox, 's = ' + r.s, DIM);
  setCell(baseBox, '底数 b = ' + r.b, DIM); setCell(xBox, 'x = ?', DIM);
  yield S(() => { stageT.setText('第 ' + (ri + 1) + ' 轮：' + r.label + ' —— 先分解 n−1'); eqT.setText(r.n + ' − 1 = ' + (r.n - 1) + ' = ' + r.d + ' × 2^' + r.s + ' —— 把 2 的因子全部提出来'); });
  yield W(700);
  setCell(xBox, 'x = ' + r.b + '^' + r.d + ' mod ' + r.n + ' = ' + r.xs[0], PUR);
  yield S(() => { stageT.setText('x = b^d mod n = ' + r.xs[0] + ' —— 快速幂一步到位'); eqT.setText('若这格就是 1 或 n−1（±1）直接通过；否则进入平方循环找 −1'); });
  yield W(700);
  for (let k = 1; k < r.xs.length; k++) {
    const v = r.xs[k];
    setCell(xBox, 'x = x² mod ' + r.n + ' = ' + v, v === r.n - 1 ? GOLD : v === 1 ? RED : PUR);
    xSeq.setText('平方序列：' + r.xs.map((t, i) => (i === k ? '[' : '') + t + (i === k ? ']' : '')).join(' → '));
    yield S(() => {
      stageT.setText(v === r.n - 1
        ? '平方 ' + k + '：x = ' + v + ' = n−1（即 −1）—— 素数才会有的「−1 平方根」'
        : v === 1
          ? '平方 ' + k + '：x 变成 1 却没先遇到 −1 —— 非平凡平方根，合数特征！'
          : '平方 ' + k + '：x = ' + v + ' —— 未到 −1，继续平方');
      eqT.setText(v === r.n - 1 ? '撞出 −1 ✓（跳过 1 直达 −1 是素数的专利）' : v === 1 ? 'x²≡1 的非平凡解 → n 必为合数' : 'x² mod ' + r.n + ' = ' + v);
    });
    yield W(600);
  }
  if (r.pass) {
    setCell(xBox, 'x = x² mod ' + r.n + ' = ' + r.xs[r.xs.length - 1], GOLD);
    verdictT.setText(r.n + ' 在底数 ' + r.b + ' 下：probably prime ✓（撞出 −1）', { color: GOLD });
    yield S(() => { stageT.setText('通过！只有素数才会出现这种 −1 平方根，合数几乎不可能'); eqT.setText('若 n 是素数，x²≡1 (mod n) 只有 ±1 两个解 —— 出现其他解 = n 必是合数'); });
  } else {
    setCell(xBox, 'x = x² mod ' + r.n + ' = ' + r.xs[r.xs.length - 1], RED);
    verdictT.setText(r.n + ' 在底数 ' + r.b + ' 下：composite ✗（底数 2 是证人）', { color: RED });
    yield S(() => { stageT.setText('抓到了！平方序列从未出现 −1 —— 底数 2 是合数证人'); eqT.setText('合数 n 中约 3/4 的底数都会暴露它 —— 这就是「概率正确」的来源'); });
  }
  yield W(800);
}

function* mrGen() {
  yield S(() => { hint.setText('Miller–Rabin：n−1 = d·2^s，先算 x = b^d，再连续平方 s 次 —— 只有「遇到 −1」或「第一格就是 ±1」才通过'); stageT.setText('三场测试：97 用底数 2、3 各测一轮（都通过）；91 用底数 2 测一轮（露馅）'); });
  yield W(700);
  for (let i = 0; i < data.length; i++) {
    yield* roundGen(data[i], i);
    xSeq.setText('');
    yield W(300);
  }
  yield S(() => { outT.setText('97 两轮全过（probably prime），91 一轮就被抓（composite）—— 单轮错误率 ≤ 1/4，30 轮 < 2⁻⁶⁰，比硬件故障率还低'); status.textContent = 'Miller–Rabin：97 通过（底数 2、3），91 在底数 2 下判定为合数'; hint.setText('反例：Carmichael 数（如 561）骗过底数 2 —— 但换底数 3 立刻暴露，所以多轮必抓'); });
  yield W(1100);
  yield S(() => { hint.setText('复杂度 O(k·log³n)：k 轮快速幂。应用：RSA 大素数生成、OpenSSL/GMP、密码学随机素数 —— 工程界事实标准'); outT.setText('对比：AKS 确定性但常数巨大；MR 概率可调 —— 测的轮数越多越稳，实践中从不失手'); });
  yield W(1100);
  yield S(() => { hint.setText('Miller–Rabin 演示完成：97 → probably prime；91 → composite'); outT.setText(''); verdictT.setText(''); });
  yield W(400);
}

function* runMR() {
  hint.setText('Miller–Rabin：平方找 −1');
  yield W(400);
  yield* mrGen();
}

engine.queue(() => runMR());
panel.addButton('清空', () => { engine.clear(); stageT.setText(''); eqT.setText(''); outT.setText(''); xSeq.setText(''); verdictT.setText(''); setCell(nBox, 'n = 97', DIM); setCell(dBox, 'd = 3', DIM); setCell(sBox, 's = 5', DIM); setCell(baseBox, '底数 b = 2', DIM); setCell(xBox, 'x = ?', DIM); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；紫 = 平方路径，金 = 撞出 −1（通过），红 = 合数证人（失败）；x² 连续平方即「试开根」）');

scene.start(engine);
