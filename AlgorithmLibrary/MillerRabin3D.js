// AlgorithmLibrary/MillerRabin3D.js — Miller–Rabin 素性测试：n−1 = d·2^s，取底数 b，看 b^d 连续平方 s 次能否撞出 −1 —— 概率正确、多项式时间
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('MillerRabin3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, ROSE = 0xfb7185, CYAN = 0x67e8f9, VIOLET = 0xa78bfa, AMBER = 0xfbbf24;
const hint = new VText(scene, { text: '点击「运行 Miller–Rabin」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

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
  let m = n - 1, d = m, s = 0;
  while (d % 2 === 0) { d /= 2; s++; }
  let x = modPow(b, d, n);
  const xs = [x];
  for (let k = 0; k < s; k++) { x = (x * x) % n; xs.push(x); if (x === n - 1) break; }
  const pass = xs.some((v, i) => v === n - 1 || (i === 0 && v === 1));
  return { n, b, d, s, xs, pass };
}
const data = ROUNDS.map(r => ({ ...r, ...mrRound(r.n, r.b) }));

const nBox = new VBox(scene, { w: 130, h: 50, d: 50, x: -190, y: 150, z: 0, label: 'n = 97', color: DIM, emissive: DIM });
const dBox = new VBox(scene, { w: 90, h: 44, d: 44, x: -60, y: 150, z: 0, label: 'd = 3', color: DIM, emissive: DIM });
const sBox = new VBox(scene, { w: 90, h: 44, d: 44, x: 70, y: 150, z: 0, label: 's = 5', color: DIM, emissive: DIM });
const eqT = new VText(scene, { text: '', x: 0, y: 112, z: 0, color: GOLD, scale: 0.6 });
const baseBox = new VBox(scene, { w: 110, h: 44, d: 44, x: -190, y: 40, z: 0, label: '底数 b = 2', color: DIM, emissive: DIM });
const xBox = new VBox(scene, { w: 220, h: 52, d: 52, x: 20, y: 40, z: 0, label: 'x = ?', color: DIM, emissive: DIM });
const verdictT = new VText(scene, { text: '', x: 0, y: -40, z: 0, color: GOLD, scale: 0.72 });
new VText(scene, { text: 'Miller–Rabin：把 n−1 写成 d·2^s，先算 x = b^d，再连续平方 s 次 —— 只有「遇到 −1」或「第一格就是 ±1」才通过', x: 0, y: 225, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: '三场测试：97 用底数 2、3 各测一轮（都通过）；91 用底数 2 测一轮（露馅）—— 每个底数都有 3/4 概率抓到合数', x: 0, y: -205, z: 0, color: PALETTE.textDim, scale: 0.62 });
const stageT = new VText(scene, { text: '', x: 0, y: 255, z: 0, color: GOLD, scale: 0.72 });
const outT = new VText(scene, { text: '', x: 0, y: -245, z: 0, color: PALETTE.textGlow, scale: 0.62 });

function setCell(obj, v, color) { obj.setText(String(v)); if (color) obj.setColor(color, color); }
function resetAll() {
  engine.clear();
  setCell(nBox, 'n = 97', DIM);
  setCell(dBox, 'd = ?', DIM); setCell(sBox, 's = ?', DIM);
  setCell(baseBox, '底数 b = ?', DIM); setCell(xBox, 'x = ?', DIM);
  eqT.setText(''); verdictT.setText(''); stageT.setText(''); outT.setText('');
}

function runMR() {
  resetAll();
  hint.setText('为什么平方？素数模下 x²≡1 只有 ±1 两个解 —— 连续平方等于反复「试开根」，非平凡平方根暴露合数');
  data.forEach((r, ri) => {
    C(600, () => {
      setCell(nBox, `n = ${r.n}`, CYAN);
      setCell(dBox, `d = ${r.d}`, DIM); setCell(sBox, `s = ${r.s}`, DIM);
      setCell(baseBox, `底数 b = ${r.b}`, DIM); setCell(xBox, 'x = ?', DIM);
      eqT.setText(`n−1 = ${r.n - 1} = ${r.d} × 2^${r.s} —— 把 2 的因子全部提出来`, { color: GOLD });
      stageT.setText(`第 ${ri + 1} 轮：${r.label} —— 分解 n−1 完成`);
      hint.setText('d 是奇数部分，s 是 2 的幂次：b^d 平方 s 次，路径上每一格都可能是「−1」');
      verdictT.setText('');
    });
    C(650, () => {
      setCell(xBox, `x = ${r.b}^${r.d} mod ${r.n} = ${r.xs[0]}`, VIOLET);
      stageT.setText(`x = b^d mod n = ${r.xs[0]} —— 快速幂一步到位`);
      hint.setText(`若这一步就是 1 或 n−1（±1），直接通过；否则进入平方循环找 −1`);
    });
    for (let k = 1; k < r.xs.length; k++) {
      const v = r.xs[k];
      C(600, () => {
        setCell(xBox, `x = x² mod ${r.n} = ${v}`, v === r.n - 1 ? GOLD : v === 1 ? ROSE : VIOLET);
        eqT.setText(`平方 ${k}：x = ${v}${v === r.n - 1 ? ' = n−1 → 是 −1！' : v === 1 ? ' = 1' : ' —— 未到 −1，继续'}`,
          { color: v === r.n - 1 ? GOLD : v === 1 ? ROSE : PALETTE.textGlow });
        stageT.setText(v === r.n - 1
          ? `x = n−1（即 −1）—— 素数才会有的「−1 平方根」，这一轮通过！`
          : v === 1 ? 'x 变成 1 却没先遇到 −1 —— 非平凡平方根，合数特征！' : '继续平方，看能否撞出 −1');
      });
    }
    C(800, () => {
      if (r.pass) {
        setCell(xBox, `x = x² mod ${r.n} = ${r.xs[r.xs.length - 1]}`, GOLD);
        verdictT.setText(`${r.n} 在底数 ${r.b} 下：probably prime ✓（撞出了 −1）`, { color: GOLD });
        stageT.setText(`通过！—— 只有素数才会出现这种 −1 平方根，合数几乎不可能`);
        hint.setText('若 n 是素数，x²≡1 (mod n) 只有 ±1 两个解 —— 出现其他解 = n 必是合数');
      } else {
        setCell(xBox, `x = x² mod ${r.n} = ${r.xs[r.xs.length - 1]}`, ROSE);
        verdictT.setText(`${r.n} 在底数 ${r.b} 下：composite ✗（底数 2 是证人）`, { color: ROSE });
        stageT.setText(`抓到了！平方序列从未出现 −1 也没回到 1 —— 底数 2 是合数证人`);
        hint.setText('合数 n 中约 3/4 的底数都会暴露它 —— 这就是「概率正确」的来源');
      }
    });
  });
  C(1000, () => {
    outT.setText(`97 两轮全过（probably prime），91 一轮就被抓（composite）—— 单轮错误率 ≤ 1/4，30 轮 < 2⁻⁶⁰，比硬件故障率还低`);
    status.textContent = `Miller–Rabin：97 通过（底数 2、3），91 在底数 2 下判定为合数`;
    hint.setText('反例：Carmichael 数（如 561）骗过底数 2 —— 但换底数 3 立刻暴露，所以多轮必抓');
  });
  C(1200, () => {
    outT.setText('复杂度 O(k·log³n)：k 轮快速幂。应用：RSA 大素数生成、OpenSSL/GMP、密码学随机素数 —— 工程界事实标准');
    hint.setText('对比：AKS 确定性但常数巨大；MR 概率可调 —— 测的轮数越多越稳，实践中从不失手');
  });
}

panel.addButton('运行 Miller–Rabin', runMR);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；金色 = 撞出 −1（通过），玫瑰 = 合数证人（失败），紫色 = 平方路径）');

scene.start(engine);
