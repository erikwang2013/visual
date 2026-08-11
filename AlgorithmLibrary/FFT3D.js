// AlgorithmLibrary/FFT3D.js — 快速傅里叶变换：分治 + 蝶形运算 —— 多项式求值从 O(n²) 压到 O(n log n)，ω 的对称性让「一半计算」变「零计算」
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('FFT3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, ROSE = 0xfb7185, CYAN = 0x67e8f9, VIOLET = 0xa78bfa, AMBER = 0xfbbf24;
const hint = new VText(scene, { text: '点击「运行 FFT」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const a = [1, 2, 3, 4];
const E = [4, -2], O = [6, -2];
const out = ['10', '−2−2i', '−2', '−2+2i'];
const bt1 = ['X0 = E0 + O0 = 4 + 6 = 10', 'X2 = E0 − O0 = 4 − 6 = −2'];
const bt2 = ['X1 = E1 + i·O1 = −2 + i·(−2) = −2−2i', 'X3 = E1 − i·O1 = −2 − i·(−2) = −2+2i'];

const box = (v, x, y, w = 80, color = DIM) => new VBox(scene, { w, h: 44, d: 44, x, y, z: 0, label: String(v), color, emissive: color });
const inBoxes = a.map((v, i) => box(v, -150 + i * 85, 160, 74));
const eBoxes = E.map((v, i) => box(v, -110 + i * 80, 55, 70));
const oBoxes = O.map((v, i) => box(v, -110 + i * 80, 10, 70));
const outBoxes = out.map((v, i) => box('', -150 + i * 85, -120, 74));
new VText(scene, { text: '输入 a', x: -310, y: 160, z: 0, color: CYAN, scale: 0.46 });
new VText(scene, { text: '偶部 2 点 FFT', x: -310, y: 55, z: 0, color: VIOLET, scale: 0.46 });
new VText(scene, { text: '奇部 2 点 FFT', x: -310, y: 10, z: 0, color: AMBER, scale: 0.46 });
new VText(scene, { text: '输出 X(k)', x: -310, y: -120, z: 0, color: GOLD, scale: 0.46 });
new VText(scene, { text: 'FFT：4 点输入 → 偶/奇两部 2 点 FFT → 蝶形合并。ω = e^{2πi/4} = i 的幂 ω⁰,ω¹,ω²,ω³ 决定「加或减」', x: 0, y: 225, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: '顶层 = 输入，中层 = 分治后的两路 2 点 FFT（偶部紫/奇部琥珀），底层 = 蝶形合并的输出 —— 每层 O(n)', x: 0, y: -205, z: 0, color: PALETTE.textDim, scale: 0.62 });
const stageT = new VText(scene, { text: '', x: 0, y: 255, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: 105, z: 0, color: PALETTE.textGlow, scale: 0.56 });
const outT = new VText(scene, { text: '', x: 0, y: -245, z: 0, color: PALETTE.textGlow, scale: 0.62 });

function setCell(obj, v, color) { obj.setText(String(v)); if (color) obj.setColor(color, color); }
function resetAll() {
  engine.clear();
  a.forEach((v, i) => setCell(inBoxes[i], v, DIM));
  E.forEach((v, i) => setCell(eBoxes[i], '', DIM));
  O.forEach((v, i) => setCell(oBoxes[i], '', DIM));
  outBoxes.forEach(b => setCell(b, '', DIM));
  stageT.setText(''); eqT.setText(''); outT.setText('');
}

function runFFT() {
  resetAll();
  hint.setText('朴素求值：在 n 个点上每个点做 n 次乘加 = O(n²)。FFT 的戏法：ω 的幂有对称性 —— ω^(k+n/2) = −ω^k');
  C(600, () => {
    a.forEach((v, i) => inBoxes[i].setColor(CYAN, CYAN));
    stageT.setText('输入 a = [1, 2, 3, 4]（n = 4）—— 目标：在 ω⁰, ω¹, ω², ω³ 四个点上求多项式值');
    hint.setText('X(k) = Σ a_j·ω^(jk)。直接算 16 次乘法 —— 但 ω 的周期性和对称性可以省一半以上');
  });
  C(750, () => {
    stageT.setText('分治：按下标奇偶拆分 —— 偶部 a0,a2 = [1,3]，奇部 a1,a3 = [2,4]');
    eqT.setText('关键代数：X(k) = E(k²) + ω^k·O(k²)，X(k+2) = E(k²) − ω^k·O(k²)', { color: PALETTE.textGlow });
    hint.setText('两个「半个」的 FFT 就能拼出整个：一半加 ω^k 的倍，一半减 —— 这就是蝶形的「翅膀」');
  });
  C(750, () => {
    E.forEach((v, i) => setCell(eBoxes[i], v, VIOLET));
    eqT.setText('偶部 2 点 FFT：[1+3, 1−3] = [4, −2]', { color: VIOLET });
    stageT.setText('2 点 FFT 就是一次加减：X(0) = 1+3 = 4，X(1) = 1−3 = −2');
  });
  C(750, () => {
    O.forEach((v, i) => setCell(oBoxes[i], v, AMBER));
    eqT.setText('奇部 2 点 FFT：[2+4, 2−4] = [6, −2]', { color: AMBER });
    stageT.setText('同款操作：X(0) = 2+4 = 6，X(1) = 2−4 = −2 —— 递归到这里深度为 0，直接算');
  });
  C(800, () => {
    setCell(outBoxes[0], out[0], GOLD);
    setCell(outBoxes[2], out[2], GOLD);
    eqT.setText(`${bt1[0]}；${bt1[1]}`, { color: GOLD });
    stageT.setText('蝶形对 1：E0 与 O0 用 ω⁰ = 1 —— X0 = E0+O0，X2 = E0−O0（ω² = −1 使减号免费）');
    hint.setText('ω² = −1：X2 和 X0 共用一次计算 —— 这就是「一半计算变零计算」的数学出处');
  });
  C(800, () => {
    setCell(outBoxes[1], out[1], GOLD);
    setCell(outBoxes[3], out[3], GOLD);
    eqT.setText(`${bt2[0]}；${bt2[1]}`, { color: GOLD });
    stageT.setText('蝶形对 2：E1 与 O1 用 ω¹ = i —— X1 = E1+i·O1，X3 = E1−i·O1');
    hint.setText('i² = −1 再次帮忙：乘一次 i，加出 X1 减出 X3 —— 一个蝶形出两个结果');
  });
  C(1000, () => {
    outT.setText(`FFT(a) = [10, −2−2i, −2, −2+2i] ✓ —— 4 点只做了 4 个蝶形共 8 次乘加（朴素 16 次）`);
    status.textContent = `FFT：[1,2,3,4] → [10, −2−2i, −2, −2+2i]（蝶形 4 个，乘法减半）`;
    hint.setText('验证：X(0) = 1+2+3+4 = 10 —— 直流分量。逆变换乘 1/n 再跑一遍 FFT 即还原');
  });
  C(1200, () => {
    outT.setText('复杂度 T(n) = 2T(n/2) + O(n) → O(n log n)。应用：卷积（多项式乘法）、信号频谱、大整数乘法（FFT×FFT 分治）');
    hint.setText('把卷积的两边 FFT → 逐点乘 → 逆 FFT：O(n log n) 顶替 O(n²) —— 音频均衡器每天都在跑它');
  });
}

panel.addButton('运行 FFT', runFFT);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；青 = 输入，紫/琥珀 = 偶/奇部，金 = 蝶形合并输出）');

scene.start(engine);
