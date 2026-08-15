// AlgorithmLibrary/Shor3D.js — Shor 质因数分解：量子求 aˣ mod N 的周期 → 经典 gcd 提取因子 —— N=15, a=7, 周期 r=4, gcd(7²−1,15)=3, gcd(7²+1,15)=5（function* 生成器驱动，幂模与 gcd 全部运行时计算）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Shor3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, GOLD = 0xfcd34d, BLUE = 0x60a5fa, DIM = 0x334155;
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
const f3 = new VBox(scene, { w: 60, h: 44, d: 30, x: 240, y: 128, z: 0, label: '3', color: DIM, emissive: DIM });
const f5 = new VBox(scene, { w: 60, h: 44, d: 30, x: 400, y: 128, z: 0, label: '5', color: DIM, emissive: DIM });

function* shorGen() {
  yield S(() => { status.textContent = 'Shor 算法：量子求 f(x) = 7ˣ mod 15 的周期来分解 N = 15 —— 经典试除对 RSA 大数不可行（指数级时间）'; });
  yield W(600);
  yield S(() => {
    fboxes.forEach((b, i) => { b.setColor(BLUE, BLUE); });
    status.textContent = '量子寄存器处于叠加态，一次同时算出 8 个 f(x)：1, 7, 4, 13, 1, 7, 4, 13 —— 发现周期性';
  });
  yield W(900);
  yield S(() => {
    fboxes.forEach((b, i) => { b.setColor(i < R ? GOLD : BLUE, i < R ? GOLD : BLUE); });
    status.textContent = '序列 1, 7, 4, 13 每 4 个值循环一次：对叠加态做量子傅里叶变换，测量出周期 r = ' + R;
  });
  yield W(800);
  yield S(() => {
    f3.setColor(GREEN, GREEN);
    status.textContent = '经典后处理：r 为偶数 → gcd(7^(4/2) − 1, 15) = gcd(48, 15) = ' + G1 + ' → 找到第一个因子 3';
  });
  yield W(800);
  yield S(() => {
    f5.setColor(GREEN, GREEN);
    status.textContent = '再求 gcd(7^(4/2) + 1, 15) = gcd(50, 15) = ' + G2 + ' → 找到第二个因子 5';
  });
  yield W(900);
  yield S(() => { status.textContent = '15 = ' + G1 + ' × ' + G2 + ' ✓ 分解成功（量子部分多项式时间，经典 gcd 极快）'; });
  yield W(1000);
  yield S(() => { status.textContent = 'Shor 演示完成：N=15 分解为 3 × 5（量子求周期 r=4 + 经典 gcd 后处理），量子部分 O((log N)³)，RSA 依赖大数分解困难，因此可被破解'; });
  yield W(800);
}

engine.queue(() => shorGen());
panel.addButton('清空', () => {
  engine.clear();
  xboxes.forEach(b => b.setColor(PALETTE.node, PALETTE.nodeEmissive));
  fboxes.forEach(b => b.setColor(DIM, DIM));
  f3.setColor(DIM, DIM);
  f5.setColor(DIM, DIM);
  status.textContent = '';
});

scene.start(engine);
