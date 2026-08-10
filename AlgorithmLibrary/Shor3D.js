// AlgorithmLibrary/Shor3D.js — Shor 质因数分解：量子求 a^x mod N 的周期 → 经典 gcd 提取因子
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Shor3D');

const scene = new Scene3D('scene', { cameraPos: [0, 380, 720], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GREEN = 0x4ade80, GOLD = 0xfcd34d, BLUE = 0x60a5fa, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「运行分解」开始', x: 0, y: 330, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const NV = 15, A = 7, CNT = 8, SPX = 70;
const fvals = [];
for (let i = 0; i < CNT; i++) fvals.push(Math.pow(A, i) % NV); // 1,7,4,13,1,7,4,13
const R = fvals.findIndex((v, i) => i > 0 && v === fvals[0]);   // 周期 r = 4

const xboxes = [], fboxes = [];
for (let i = 0; i < CNT; i++) {
  xboxes.push(new VBox(scene, { w: 40, h: 28, d: 28, x: (i - 3.5) * SPX, y: 150, z: 0, label: 'x=' + i, color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
  fboxes.push(new VBox(scene, { w: 40, h: 36, d: 36, x: (i - 3.5) * SPX, y: 40, z: 0, label: '' + fvals[i], color: DIM, emissive: DIM }));
}
new VText(scene, { text: '量子并行计算 f(x) = 7ˣ mod 15：8 个 x 一次算出', x: 0, y: 240, z: 0, color: PALETTE.textDim, scale: 0.7 });
const cycleT = new VText(scene, { text: '', x: 0, y: -50, z: 0, color: PALETTE.textGlow, scale: 0.75 });
const gcdT1 = new VText(scene, { text: '', x: 0, y: -120, z: 0, color: PALETTE.textDim, scale: 0.65 });
const gcdT2 = new VText(scene, { text: '', x: 0, y: -155, z: 0, color: PALETTE.textDim, scale: 0.65 });
const f3 = new VBox(scene, { w: 60, h: 44, d: 30, x: -80, y: -240, z: 0, label: '3', color: DIM, emissive: DIM });
const f5 = new VBox(scene, { w: 60, h: 44, d: 30, x: 80, y: -240, z: 0, label: '5', color: DIM, emissive: DIM });
new VText(scene, { text: '提取出的因子', x: 0, y: -190, z: 0, color: PALETTE.textDim, scale: 0.6 });
const resT = new VText(scene, { text: '', x: 0, y: -320, z: 0, color: PALETTE.textGlow, scale: 0.9 });

function resetAll() {
  engine.clear();
  xboxes.forEach(b => b.setColor(PALETTE.node, PALETTE.nodeEmissive));
  fboxes.forEach(b => b.setColor(DIM, DIM));
  f3.setColor(DIM, DIM);
  f5.setColor(DIM, DIM);
  cycleT.setText('');
  gcdT1.setText('');
  gcdT2.setText('');
  resT.setText('');
}

function runShor() {
  resetAll();
  hint.setText('RSA 的安全性依赖大数分解的困难性：经典算法需要指数级时间');
  C(600, () => {
    hint.setText('分解 N=15 用试除即可，但对 RSA 的 3072 位大数，经典算法在宇宙寿命内也跑不完');
  });
  C(900, () => {
    fboxes.forEach((b, i) => { b.setColor(BLUE, BLUE); });
    cycleT.setText('f(0)=1, f(1)=7, f(2)=4, f(3)=13, f(4)=1, … —— 发现周期性');
    hint.setText('量子寄存器处于叠加态，一次同时算出了 8 个 f(x) 的值');
  });
  C(900, () => {
    fboxes.forEach((b, i) => { b.setColor(i < R ? GOLD : BLUE, i < R ? GOLD : BLUE); });
    cycleT.setText('序列 1,7,4,13 每 4 个值循环一次 → 周期 r = ' + R);
    hint.setText('对叠加态做量子傅里叶变换，测量出周期 r = 4');
  });
  C(800, () => {
    gcdT1.setText('经典后处理：r 为偶数 → 求 7^(4/2) − 1 = 48 与 15 的最大公约数');
    f3.setColor(GREEN, GREEN);
    f3.pulse(0.4);
    hint.setText('gcd(48, 15) = 3 → 找到第一个因子 3');
  });
  C(800, () => {
    gcdT2.setText('再求 7^(4/2) + 1 = 50 与 15 的最大公约数');
    f5.setColor(GREEN, GREEN);
    f5.pulse(0.4);
    hint.setText('gcd(50, 15) = 5 → 找到第二个因子 5');
  });
  C(900, () => {
    resT.setText('15 = 3 × 5 ✓  分解成功');
    status.textContent = 'Shor 完成：量子求周期 r=4 → gcd 后处理得到 3 和 5，15 = 3 × 5';
    hint.setText('对 RSA 大数 N 同样成立：量子部分多项式时间，经典部分 gcd 极快——RSA 因此可被破解');
  });
}

panel.addButton('运行分解', runShor);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；1994 年 Shor 提出，首个证明量子优势的重大算法）');

scene.start(engine);
