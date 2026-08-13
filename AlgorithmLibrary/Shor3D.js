// AlgorithmLibrary/Shor3D.js — Shor 质因数分解：量子求 aˣ mod N 的周期 → 经典 gcd 提取因子 —— N=15, a=7, 周期 r=4, gcd(7²−1,15)=3, gcd(7²+1,15)=5（function* 生成器驱动，幂模与 gcd 全部运行时计算）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Shor3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, GOLD = 0xfcd34d, BLUE = 0x60a5fa, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：Shor —— 用量子周期性分解大数', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');

const NV = 15, A0 = 7, CNT = 8, SPX = 70;
const powmod = (b, e, m) => { let r = 1, base = b % m; while (e) { if (e & 1) r = (r * base) % m; base = (base * base) % m; e >>= 1; } return r; };
const gcd = (x, y) => { while (y) { const t = y; y = x % y; x = t; } return x; };
const fvals = [];
for (let i = 0; i < CNT; i++) fvals.push(powmod(A0, i, NV));
const R = fvals.findIndex((v, i) => i > 0 && v === fvals[0]);
const G1 = gcd(Math.pow(A0, R / 2) - 1, NV), G2 = gcd(Math.pow(A0, R / 2) + 1, NV);

const xboxes = [], fboxes = [];
for (let i = 0; i < CNT; i++) {
  xboxes.push(new VBox(scene, { w: 40, h: 28, d: 28, x: (i - 3.5) * SPX + 320, y: 450, z: 0, label: 'x=' + i, color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
  fboxes.push(new VBox(scene, { w: 40, h: 36, d: 36, x: (i - 3.5) * SPX + 320, y: 340, z: 0, label: '' + fvals[i], color: DIM, emissive: DIM }));
}
new VText(scene, { text: '量子并行计算 f(x) = 7ˣ mod 15：8 个 x 一次算出', x: 0, y: 540, z: 0, color: PALETTE.textDim, scale: 0.7 });
const cycleT = new VText(scene, { text: '', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.75 });
const gcdT1 = new VText(scene, { text: '', x: 0, y: 255, z: 0, color: PALETTE.textDim, scale: 0.65 });
const gcdT2 = new VText(scene, { text: '', x: 0, y: 215, z: 0, color: PALETTE.textDim, scale: 0.65 });
const f3 = new VBox(scene, { w: 60, h: 44, d: 30, x: 240, y: 128, z: 0, label: '3', color: DIM, emissive: DIM });
const f5 = new VBox(scene, { w: 60, h: 44, d: 30, x: 400, y: 128, z: 0, label: '5', color: DIM, emissive: DIM });
new VText(scene, { text: '提取出的因子', x: 0, y: 174, z: 0, color: PALETTE.textDim, scale: 0.6 });
const resT = new VText(scene, { text: '', x: 0, y: 80, z: 0, color: PALETTE.textGlow, scale: 0.9 });

function* shorGen() {
  yield S(() => { hint.setText('RSA 的安全性依赖大数分解的困难性：经典算法需要指数级时间'); });
  yield W(600);
  yield S(() => { hint.setText('分解 N=15 用试除即可，但对 RSA 的 3072 位大数，经典算法在宇宙寿命内也跑不完'); });
  yield W(900);
  yield S(() => {
    fboxes.forEach((b, i) => { b.setColor(BLUE, BLUE); });
    cycleT.setText('f(0)=1, f(1)=7, f(2)=4, f(3)=13, f(4)=1, … —— 发现周期性');
    hint.setText('量子寄存器处于叠加态，一次同时算出了 8 个 f(x) 的值');
  });
  yield W(900);
  yield S(() => {
    fboxes.forEach((b, i) => { b.setColor(i < R ? GOLD : BLUE, i < R ? GOLD : BLUE); });
    cycleT.setText('序列 1,7,4,13 每 4 个值循环一次 → 周期 r = ' + R);
    hint.setText('对叠加态做量子傅里叶变换，测量出周期 r = 4');
  });
  yield W(800);
  yield S(() => {
    gcdT1.setText('经典后处理：r 为偶数 → 求 7^(4/2) − 1 = 48 与 15 的最大公约数 = ' + G1);
    f3.setColor(GREEN, GREEN);
    hint.setText('gcd(48, 15) = 3 → 找到第一个因子 3');
  });
  yield W(800);
  yield S(() => {
    gcdT2.setText('再求 7^(4/2) + 1 = 50 与 15 的最大公约数 = ' + G2);
    f5.setColor(GREEN, GREEN);
    hint.setText('gcd(50, 15) = 5 → 找到第二个因子 5');
  });
  yield W(900);
  yield S(() => {
    resT.setText('15 = ' + G1 + ' × ' + G2 + ' ✓  分解成功');
    status.textContent = 'Shor 完成：量子求周期 r=4 → gcd 后处理得到 3 和 5，15 = 3 × 5';
    hint.setText('对 RSA 大数 N 同样成立：量子部分多项式时间，经典部分 gcd 极快——RSA 因此可被破解');
  });
  yield W(1000);
  yield S(() => { hint.setText('Shor 演示完成：f(x)=7ˣ mod 15 的周期 r=4 → gcd 提取因子 3 和 5'); });
  yield W(400);
}

engine.queue(() => shorGen());
panel.addButton('清空', () => {
  engine.clear();
  xboxes.forEach(b => b.setColor(PALETTE.node, PALETTE.nodeEmissive));
  fboxes.forEach(b => b.setColor(DIM, DIM));
  f3.setColor(DIM, DIM);
  f5.setColor(DIM, DIM);
  cycleT.setText(''); gcdT1.setText(''); gcdT2.setText(''); resT.setText('');
  hint.setText('已清空，可重新运行'); status.textContent = '';
});
panel.addLabel('（拖拽旋转视角，滚轮缩放；1994 年 Shor 提出，首个证明量子优势的重大算法）');

scene.start(engine);
