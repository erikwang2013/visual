// AlgorithmLibrary/FWT3D.js — 沃尔什-哈达玛变换：蝶形永远只有 (u+v, u−v) 两种运算 —— 异或卷积的专属加速器，连 ω 都不用（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('FWT3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155, ROSE = 0xfb7185, VIOLET = 0xa78bfa, AMBER = 0xfbbf24;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：FWT 沃尔什-哈达玛变换', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 320, y: 555, z: 0, color: GOLD, scale: 0.72, wrapChars: 7 });
const eqT = new VText(scene, { text: '', x: 700, y: 380, z: 0, color: PALETTE.textGlow, scale: 0.58, wrapChars: 8 });
const outT = new VText(scene, { text: '', x: 700, y: 420, z: 0, color: PALETTE.textGlow, scale: 0.62, wrapChars: 8 });

const a = [1, 2, 3, 4];
const L1 = [3, -1, 7, -1];
const out = ['10', '−2', '−4', '0'];

const box = (v, x, y, w = 74, color = DIM) => new VBox(scene, { w, h: 44, d: 44, x, y, z: 0, label: String(v), color, emissive: color });
const inBoxes = a.map((v, i) => box(v, 340 + (i - 1.5) * 85, 420));
const l1Boxes = L1.map((v, i) => box('', 340 + (i - 1.5) * 85, 320));
const outBoxes = out.map((v, i) => box('', 340 + (i - 1.5) * 85, 225));
new VText(scene, { text: '输入 a', x: 55, y: 420, z: 0, color: CYAN, scale: 0.46 });
new VText(scene, { text: '层 1 蝶形', x: 55, y: 320, z: 0, color: VIOLET, scale: 0.46 });
new VText(scene, { text: '输出 FWT(a)', x: 55, y: 225, z: 0, color: GOLD, scale: 0.46 });
new VText(scene, { text: 'FWT（沃尔什-哈达玛）：每一层把相邻两数变成 (u+v, u−v) —— 没有复数 ω，只有最纯的加减', x: 700, y: 480, z: 0, color: PALETTE.textDim, scale: 0.5, wrapChars: 8 });
new VText(scene, { text: '输入 [1,2,3,4] → 层 1 两对蝶形 → 层 2 两对蝶形 → [10, −2, −4, 0]。异或卷积 C[k] = Σ A[i]·B[k⊕i] 用它能做到 O(n log n)', x: 700, y: 300, z: 0, color: PALETTE.textDim, scale: 0.5, wrapChars: 8 });

function setCell(obj, v, color) { obj.setText(String(v)); if (color) obj.setColor(color, color); }
function clearView() {
  a.forEach((v, i) => setCell(inBoxes[i], v, DIM));
  l1Boxes.forEach(b => setCell(b, '', DIM));
  outBoxes.forEach(b => setCell(b, '', DIM));
  stageT.setText(''); eqT.setText(''); outT.setText('');
}

function* fwtGen() {
  yield S(() => { hint.setText('异或卷积：C[k] = Σ A[i]·B[k⊕i] —— 朴素 O(n²)。FWT 的魔法：变换后逐点相乘再逆变换，中间全是纯加减'); stageT.setText('输入 a = [1, 2, 3, 4]（n = 4）—— FWT 就绪'); });
  yield W(700);
  for (let i = 0; i < 4; i++) inBoxes[i].setColor(CYAN, CYAN);
  yield S(() => hint.setText('核心蝶形：对任意一对 (u, v) → (u+v, u−v)。4 点只要 2 层 × 2 对 = 4 个蝶形'));
  yield W(600);
  setCell(l1Boxes[0], '3', VIOLET);
  setCell(l1Boxes[1], '−1', VIOLET);
  eqT.setText('蝶形 1：(1, 2) → (1+2, 1−2) = (3, −1)', { color: VIOLET });
  yield S(() => { stageT.setText('层 1 蝶形 1：第一对 (1,2) —— 和放左，差放右（紫）'); hint.setText('为什么叫哈达玛？H₂ = [[1,1],[1,−1]] —— 这一对蝶形就是乘一个 2×2 哈达玛矩阵'); });
  yield W(750);
  setCell(l1Boxes[2], '7', AMBER);
  setCell(l1Boxes[3], '−1', AMBER);
  eqT.setText('蝶形 2：(3, 4) → (3+4, 3−4) = (7, −1)', { color: AMBER });
  yield S(() => stageT.setText('层 1 蝶形 2：第二对 (3,4)（琥珀）—— 两对互不干扰'));
  yield W(750);
  setCell(outBoxes[0], out[0], GOLD);
  setCell(outBoxes[2], out[2], GOLD);
  eqT.setText('蝶形 3：(3, 7) → (3+7, 3−7) = (10, −4)', { color: GOLD });
  yield S(() => { stageT.setText('层 2 蝶形 1：跨对合并 (3,7) —— 输出 0 号与 2 号落定'); hint.setText('层 1 的结果重新配对：H₄ = H₂ ⊗ H₂（Kronecker 积）—— 递归结构天然支持 log n 层'); });
  yield W(800);
  setCell(outBoxes[1], out[1], GOLD);
  setCell(outBoxes[3], out[3], GOLD);
  eqT.setText('蝶形 4：(−1, −1) → (−1−1, −1+1) = (−2, 0)', { color: GOLD });
  yield S(() => stageT.setText('层 2 蝶形 2：(−1,−1) —— 输出 1 号与 3 号落定，变换完成'));
  yield W(800);
  yield S(() => { outT.setText('FWT(a) = [10, −2, −4, 0] ✓ —— 4 个纯加减蝶形（朴素异或卷积要 16 次乘加）'); status.textContent = 'FWT：[1,2,3,4] → [10, −2, −4, 0]（2 层共 4 个蝶形）'; });
  yield W(1000);
  yield S(() => hint.setText('用武之地：A、B 各自 FWT → 逐点相乘 → 逆 FWT = 异或卷积 —— 集合覆盖计数、图同态计数都靠它'));
  yield W(400);
  yield S(() => { hint.setText('FWT 完成：4 点变换得 [10, −2, −4, 0]'); outT.setText('复杂度 O(n log n)，只用加减。应用：异或/与/或卷积、量子电路模拟（Hadamard 门）、布尔函数分析、图像沃尔什编码'); });
  yield W(1200);
  yield S(() => { hint.setText('家族图谱：FFT 用复数 ω，NTT 用整数 ω，FWT 连 ω 都不用 —— 越朴素，越是异或世界的天选之子'); outT.setText(''); });
  yield W(800);
}

function* runFWT() {
  clearView();
  hint.setText('FWT：纯加减蝶形');
  yield W(400);
  yield* fwtGen();
}

engine.queue(() => runFWT());
panel.addButton('清空', () => { engine.clear(); clearView(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；青 = 输入，紫/琥珀 = 层 1 两对蝶形，金 = 层 2 合并输出）');

scene.start(engine);
