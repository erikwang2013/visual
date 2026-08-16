// AlgorithmLibrary/Grover3D.js — Grover 搜索：均匀叠加 → Oracle 翻号 → 均值反转放大目标振幅 —— 8 项搜索 2 轮迭代，P(x=5) 从 12.5% → 78.1% → 94.5%（function* 生成器驱动，振幅快照运行时计算）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Grover3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, RED = 0xfb7185, GOLD = 0xfcd34d, DIM = 0x334155;
const status = panel.addStatus('就绪');

const N = 8, TARGET = 5, SPX = 70, SZ = 9;
const amps = Array(N).fill(1 / Math.sqrt(N));
const bars = [], ampT = [];
for (let i = 0; i < N; i++) {
  bars.push(new VBox(scene, { w: 46, h: 40, d: 40, x: 340 + (i - 3.5) * SPX, y: 380, z: 0, label: 'x=' + i, color: GREEN, emissive: GREEN }));
  ampT.push(new VText(scene, { text: '', x: 340 + (i - 3.5) * SPX, y: 445, z: 0, color: PALETTE.textDim, scale: 0.5 }));
}

function renderAmps() {
  amps.forEach((a, i) => {
    const sh = Math.max(Math.abs(a) * SZ, 0.04);
    bars[i].setScaleY(sh);
    bars[i].mesh.position.y = 360 + 20 * sh;
    bars[i].setColor(a < 0 ? RED : GREEN, a < 0 ? RED : GREEN);
    ampT[i].setText((a * a * 100).toFixed(1) + '%');
  });
}
const applyState = (arr) => { arr.forEach((v, i) => { amps[i] = v; }); renderAmps(); };
const P = (i) => (amps[i] * amps[i] * 100).toFixed(1);

function* groverGen() {
  yield S(() => { status.textContent = 'Grover 搜索：量子叠加态一次同时处理全部 8 项，目标 x=5 —— 经典平均需查 N/2 项，Grover 只需 O(√N) 次查询'; });
  yield W(700);
  yield S(() => { status.textContent = '初始均匀叠加：8 个状态等概率共存，每个振幅 1/√8 ≈ 0.35，P(x=5) = 12.5%'; });
  yield W(850);
  amps[TARGET] = -amps[TARGET]; applyState(amps);
  yield S(() => { status.textContent = 'Oracle 黑盒：能识别目标但不说它是谁，只翻转 x=5 的振幅符号（负振幅呈红色），总概率不变'; });
  yield W(950);
  const mu = amps.reduce((s, a) => s + a, 0) / N;
  amps.forEach((a, i) => { amps[i] = 2 * mu - amps[i]; }); applyState(amps);
  yield S(() => { status.textContent = '第 1 轮均值反转（绕平均振幅翻转）：目标放大到 0.88，干扰项压缩到 0.18 —— P(x=5) = ' + P(TARGET) + '%'; });
  yield W(950);
  amps[TARGET] = -amps[TARGET]; applyState(amps);
  yield S(() => { status.textContent = '第 2 轮 Oracle：再次翻转目标振幅，为第二轮扩散做准备'; });
  yield W(850);
  const mu2 = amps.reduce((s, a) => s + a, 0) / N;
  amps.forEach((a, i) => { amps[i] = 2 * mu2 - amps[i]; }); applyState(amps);
  yield S(() => { status.textContent = '第 2 轮均值反转后：P(x=5) = ' + P(TARGET) + '%（最优迭代 ≈ π/4·√N ≈ 2 次，继续会先降后升）'; });
  yield W(950);
  yield S(() => {
    bars.forEach((b, i) => { b.setColor(i === TARGET ? GOLD : DIM, i === TARGET ? GOLD : DIM); });
    ampT.forEach((t, i) => t.setText(i === TARGET ? '✓ ' + P(TARGET) + '%' : ''));
    status.textContent = '测量：以 ' + P(TARGET) + '% 概率得到 x = 5 —— 仅需约 2.8 次量子查询';
  });
  yield W(1000);
  yield S(() => { status.textContent = 'Grover 演示完成：P(x=5) 12.5% → 78.1% → 94.5%，量子查询约 2.8 次（经典平均 4 次），复杂度 O(√N) —— 对 100 万项只需约 1000 次查询的二次加速'; });
  yield W(800);
}

engine.queue(() => groverGen());
panel.addButton('清空', () => {
  engine.clear();
  amps.forEach((_, i) => { amps[i] = 1 / Math.sqrt(N); });
  bars.forEach((b, i) => { b.setColor(GREEN, GREEN); b.setText('x=' + i); });
  ampT.forEach(t => t.setText(''));
  renderAmps();
  status.textContent = '';
});

scene.start(engine);
