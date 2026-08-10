// AlgorithmLibrary/Grover3D.js — Grover 搜索：均匀叠加 → Oracle 翻号 → 均值反转放大目标振幅
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Grover3D');

const scene = new Scene3D('scene', { cameraPos: [0, 380, 720], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GREEN = 0x4ade80, RED = 0xf87171, GOLD = 0xfcd34d, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「运行搜索」开始', x: 0, y: 330, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const N = 8, TARGET = 5, SPX = 70, S = 9;
const amps = Array(N).fill(1 / Math.sqrt(N));
const bars = [];
const ampT = [];
for (let i = 0; i < N; i++) {
  bars.push(new VBox(scene, { w: 46, h: 40, d: 40, x: (i - 3.5) * SPX, y: 0, z: 0, label: 'x=' + i, color: GREEN, emissive: GREEN }));
  ampT.push(new VText(scene, { text: '', x: (i - 3.5) * SPX, y: 175, z: 0, color: PALETTE.textDim, scale: 0.55 }));
}
new VText(scene, { text: '★ 目标 x=5（金色文本）', x: 0, y: 232, z: 0, color: GOLD, scale: 0.65 });
new VText(scene, { text: '数据集 8 项 —— 柱高 = |振幅|，绿=正 红=负', x: 0, y: 265, z: 0, color: PALETTE.textDim, scale: 0.7 });
const probT = new VText(scene, { text: '', x: 0, y: -190, z: 0, color: PALETTE.textGlow, scale: 0.8 });

function renderAmps() {
  amps.forEach((a, i) => {
    const sh = Math.max(Math.abs(a) * S, 0.04);
    bars[i].mesh.scale.y = sh;
    bars[i].mesh.position.y = 20 * sh - 20;
    bars[i].setColor(a < 0 ? RED : GREEN, a < 0 ? RED : GREEN);
    ampT[i].setText((a * a * 100).toFixed(1) + '%');
  });
}

// 预计算两轮 Grover 迭代的振幅快照（Oracle 翻号 + 均值反转）
const states = [];
states.push(amps.slice());
amps[TARGET] = -amps[TARGET]; states.push(amps.slice());
const mu = amps.reduce((s, a) => s + a, 0) / N;
amps.forEach((a, i) => { amps[i] = 2 * mu - amps[i]; }); states.push(amps.slice());
amps[TARGET] = -amps[TARGET]; states.push(amps.slice());
const mu2 = amps.reduce((s, a) => s + a, 0) / N;
amps.forEach((a, i) => { amps[i] = 2 * mu2 - amps[i]; }); states.push(amps.slice());

function applyState(arr) {
  amps.forEach((v, i) => { amps[i] = arr[i]; });
  renderAmps();
}

function resetAll() {
  engine.clear();
  bars.forEach((b, i) => { b.setColor(GREEN, GREEN); b.setText('x=' + i); });
  ampT.forEach(t => t.setText(''));
  probT.setText('');
  applyState(states[0]);
}

function runGrover() {
  resetAll();
  hint.setText('经典搜索：平均查 N/2 项；Grover 用量子叠加与振幅放大，只需 O(√N) 次查询');
  C(600, () => {
    applyState(states[0]);
    probT.setText('初始：8 个状态等概率共存，P(x=5) = 12.5%');
    hint.setText('量子叠加态：每个状态振幅 1/√8 ≈ 0.35，一次操作同时处理全部 8 项');
  });
  C(900, () => {
    applyState(states[1]);
    probT.setText('Oracle 翻转 x=5 的振幅符号（负振幅呈红色）');
    hint.setText('Oracle 黑盒：能识别目标但不说它是谁，只把它的振幅翻转——总概率不变');
  });
  C(900, () => {
    applyState(states[2]);
    probT.setText('第 1 轮均值反转后：P(x=5) = 78.1%，其余被压缩');
    hint.setText('以平均振幅为轴翻转所有振幅：目标从 0.35 放大到 0.88，干扰项缩到 0.18');
  });
  C(900, () => {
    applyState(states[3]);
    hint.setText('重复：Oracle 再次翻转目标振幅，为第二轮扩散做准备');
  });
  C(900, () => {
    applyState(states[4]);
    probT.setText('第 2 轮后：P(x=5) = 94.5%（最优迭代 ≈ π/4·√N ≈ 2 次）');
    hint.setText('两次迭代达到峰值；继续会先降后升，因此恰好在最佳次数停止');
  });
  C(900, () => {
    bars.forEach((b, i) => { b.setColor(i === TARGET ? GOLD : DIM, i === TARGET ? GOLD : DIM); });
    ampT.forEach((t, i) => t.setText(i === TARGET ? '✓ 94.5%' : ''));
    probT.setText('测量：以 94.5% 概率得到 x = 5 —— 只需约 2.8 次量子查询');
    status.textContent = 'Grover 完成：约 2.8 次量子查询命中 x=5（经典平均需 4 次）——二次加速';
    hint.setText('Grover 是二次加速：经典查 100 万项平均 50 万次，Grover 约 1000 次即可');
  });
}

panel.addButton('运行搜索', runGrover);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；Oracle 需能判定"是否是目标"，如数据库搜索、破解哈希）');

scene.start(engine);
