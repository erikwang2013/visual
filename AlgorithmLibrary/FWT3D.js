// AlgorithmLibrary/FWT3D.js — 沃尔什-哈达玛变换：蝶形永远只有 (u+v, u−v) 两种运算 —— 异或卷积的专属加速器，连 ω 都不用
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('FWT3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, ROSE = 0xfb7185, CYAN = 0x67e8f9, VIOLET = 0xa78bfa, AMBER = 0xfbbf24;
const hint = new VText(scene, { text: '点击「运行 FWT」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const a = [1, 2, 3, 4];
const L1 = [3, -1, 7, -1];
const out = ['10', '−2', '−4', '0'];

const box = (v, x, y, w = 74, color = DIM) => new VBox(scene, { w, h: 44, d: 44, x, y, z: 0, label: String(v), color, emissive: color });
const inBoxes = a.map((v, i) => box(v, -150 + i * 85, 160));
const l1Boxes = L1.map((v, i) => box('', -150 + i * 85, 55));
const outBoxes = out.map((v, i) => box('', -150 + i * 85, -120));
new VText(scene, { text: '输入 a', x: -310, y: 160, z: 0, color: CYAN, scale: 0.46 });
new VText(scene, { text: '层 1 蝶形', x: -310, y: 55, z: 0, color: VIOLET, scale: 0.46 });
new VText(scene, { text: '输出 FWT(a)', x: -310, y: -120, z: 0, color: GOLD, scale: 0.46 });
new VText(scene, { text: 'FWT（沃尔什-哈达玛）：每一层把相邻两数变成 (u+v, u−v) —— 没有复数 ω，只有最纯的加减', x: 0, y: 225, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: '输入 [1,2,3,4] → 层 1 两对蝶形 → 层 2 两对蝶形 → [10, −2, −4, 0]。异或卷积 C[k] = Σ A[i]·B[k⊕i] 用它能做到 O(n log n)', x: 0, y: -205, z: 0, color: PALETTE.textDim, scale: 0.62 });
const stageT = new VText(scene, { text: '', x: 0, y: 255, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: 105, z: 0, color: PALETTE.textGlow, scale: 0.58 });
const outT = new VText(scene, { text: '', x: 0, y: -245, z: 0, color: PALETTE.textGlow, scale: 0.62 });

function setCell(obj, v, color) { obj.setText(String(v)); if (color) obj.setColor(color, color); }
function resetAll() {
  engine.clear();
  a.forEach((v, i) => setCell(inBoxes[i], v, DIM));
  l1Boxes.forEach(b => setCell(b, '', DIM));
  outBoxes.forEach(b => setCell(b, '', DIM));
  stageT.setText(''); eqT.setText(''); outT.setText('');
}

function runFWT() {
  resetAll();
  hint.setText('异或卷积：C[k] = Σ A[i]·B[k⊕i] —— 朴素 O(n²)。FWT 的魔法：变换后逐点相乘再逆变换，中间全是纯加减');
  C(600, () => {
    a.forEach((v, i) => inBoxes[i].setColor(CYAN, CYAN));
    stageT.setText('输入 a = [1, 2, 3, 4]（n = 4）—— FWT 就绪');
    hint.setText('核心蝶形：对任意一对 (u, v) → (u+v, u−v)。4 点只要 2 层 × 2 对 = 4 个蝶形');
  });
  C(750, () => {
    setCell(l1Boxes[0], '3', VIOLET);
    setCell(l1Boxes[1], '−1', VIOLET);
    eqT.setText('蝶形 1：(1, 2) → (1+2, 1−2) = (3, −1)', { color: VIOLET });
    stageT.setText('层 1 蝶形 1：第一对 (1,2) —— 和放左，差放右（紫）');
    hint.setText('为什么叫哈达玛？H₂ = [[1,1],[1,−1]] —— 这一对蝶形就是乘一个 2×2 哈达玛矩阵');
  });
  C(750, () => {
    setCell(l1Boxes[2], '7', AMBER);
    setCell(l1Boxes[3], '−1', AMBER);
    eqT.setText('蝶形 2：(3, 4) → (3+4, 3−4) = (7, −1)', { color: AMBER });
    stageT.setText('层 1 蝶形 2：第二对 (3,4)（琥珀）—— 两对互不干扰');
  });
  C(800, () => {
    setCell(outBoxes[0], out[0], GOLD);
    setCell(outBoxes[2], out[2], GOLD);
    eqT.setText('蝶形 3：(3, 7) → (3+7, 3−7) = (10, −4)', { color: GOLD });
    stageT.setText('层 2 蝶形 1：跨对合并 (3,7) —— 输出 0 号与 2 号落定');
    hint.setText('层 1 的结果重新配对：H₄ = H₂ ⊗ H₂（Kronecker 积）—— 递归结构天然支持 log n 层');
  });
  C(800, () => {
    setCell(outBoxes[1], out[1], GOLD);
    setCell(outBoxes[3], out[3], GOLD);
    eqT.setText('蝶形 4：(−1, −1) → (−1−1, −1+1) = (−2, 0)', { color: GOLD });
    stageT.setText('层 2 蝶形 2：(−1,−1) —— 输出 1 号与 3 号落定，变换完成');
  });
  C(1000, () => {
    outT.setText(`FWT(a) = [10, −2, −4, 0] ✓ —— 4 个纯加减蝶形（朴素异或卷积要 16 次乘加）`);
    status.textContent = `FWT：[1,2,3,4] → [10, −2, −4, 0]（2 层共 4 个蝶形）`;
    hint.setText('用武之地：A、B 各自 FWT → 逐点相乘 → 逆 FWT = 异或卷积 —— 集合覆盖计数、图同态计数都靠它');
  });
  C(1200, () => {
    outT.setText('复杂度 O(n log n)，只用加减。应用：异或/与/或卷积、量子电路模拟（Hadamard 门）、布尔函数分析、图像沃尔什编码');
    hint.setText('家族图谱：FFT 用复数 ω，NTT 用整数 ω，FWT 连 ω 都不用 —— 越朴素，越是异或世界的天选之子');
  });
}

panel.addButton('运行 FWT', runFWT);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；青 = 输入，紫/琥珀 = 层 1 两对蝶形，金 = 层 2 合并输出）');

scene.start(engine);
