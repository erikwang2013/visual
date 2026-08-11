// AlgorithmLibrary/CNN3D.js — CNN：卷积核滑动提取特征 + 最大池化降维
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('CNN3D');

const scene = new Scene3D('scene', { cameraPos: [0, 330, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, ROSE = 0xfb7185, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「卷积识别」开始', x: 0, y: 255, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

// 输入 3×3 图像（0=暗，1=亮）：1 0 1 / 0 1 0 / 1 0 1（X 形十字）
const IMG = [[1, 0, 1], [0, 1, 0], [1, 0, 1]];
const cols = [-130, 0, 130], rows = [130, 0, -130];
const imgBoxes = [];
for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
  const v = IMG[r][c];
  imgBoxes.push(new VBox(scene, { w: 92, h: 92, d: 30, x: cols[c], y: rows[r], z: 0, label: String(v), color: v ? GREEN : DIM, emissive: v ? GREEN : 0 }));
}
new VText(scene, { text: '输入图像 3×3（X 形十字）', x: 0, y: 215, z: 0, color: PALETTE.textDim, scale: 0.6 });

// 2×2 卷积核 [[1,0],[0,1]]
const KER = [[1, 0], [0, 1]];
const kcols = [280, 370], krows = [130, 40];
const kerBoxes = KER.map((row, r) => row.map((v, c) => new VBox(scene, { w: 84, h: 84, d: 26, x: kcols[c], y: krows[r], z: 0, label: String(v), color: v ? YELLOW : DIM, emissive: v ? YELLOW : 0 })));
new VText(scene, { text: '卷积核 2×2（黄=1）', x: 325, y: 215, z: 0, color: PALETTE.textDim, scale: 0.6 });

// 2×2 特征图（初始暗，滑动后点亮）
const CONV_VAL = [[2, 0], [0, 2]];
const convBoxes = CONV_VAL.map((row, r) => row.map((v, c) => new VBox(scene, { w: 84, h: 84, d: 26, x: kcols[c], y: -130 + (r ? -40 : 0), z: 0, label: '?', color: DIM, emissive: 0 })));
new VText(scene, { text: '特征图 2×2（卷积结果）', x: 325, y: -156, z: 0, color: PALETTE.textDim, scale: 0.6 });

// 最大池化输出
const poolBox = new VBox(scene, { w: 84, h: 84, d: 26, x: 520, y: -85, z: 0, label: 'max = 2', color: BLUE, emissive: BLUE });
poolBox.mesh.visible = false;
new VText(scene, { text: '最大池化 → 1×1', x: 520, y: -165, z: 0, color: PALETTE.textDim, scale: 0.6 });

// 卷积窗口高亮（4 个 2×2 窗口）
const WINDOWS = [[0, 1, 3, 4], [1, 2, 4, 5], [3, 4, 6, 7], [4, 5, 7, 8]];
const winBox = new VBox(scene, { w: 196, h: 196, d: 10, x: 0, y: 0, z: 0, label: '', color: YELLOW, emissive: YELLOW });
winBox.mesh.visible = false;
const stepT = new VText(scene, { text: '', x: 0, y: -250, z: 0, color: PALETTE.textGlow, scale: 0.75 });
const eqT = new VText(scene, { text: '', x: 0, y: -295, z: 0, color: PALETTE.textDim, scale: 0.68 });

const idx = (r, c) => r * 3 + c;
function setWindow(r0, c0) {
  winBox.mesh.position.set(cols[c0], rows[r0], 10);
  winBox.mesh.visible = true;
}
function setConv(r, c) {
  const b = convBoxes[r][c];
  b.setColor(GREEN, GREEN);
  b.setText(String(CONV_VAL[r][c]));
}

function resetAll() {
  engine.clear();
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const v = IMG[r][c], i = idx(r, c);
    imgBoxes[i].setColor(v ? GREEN : DIM, v ? GREEN : 0);
    imgBoxes[i].setText(String(v));
  }
  kerBoxes.forEach((row, r) => row.forEach((b, c) => { const v = KER[r][c]; b.setColor(v ? YELLOW : DIM, v ? YELLOW : 0); }));
  convBoxes.forEach(row => row.forEach(b => { b.setColor(DIM, 0); b.setText('?'); }));
  winBox.mesh.visible = false;
  poolBox.mesh.visible = false;
  stepT.setText(''); eqT.setText('');
}

function runCNN() {
  resetAll();
  hint.setText('CNN：卷积核滑动提取局部特征（卷积），再池化浓缩 — 图像识别的基石');
  C(300, () => { stepT.setText('把 2×2 卷积核[[1,0],[0,1]] 放到图像左上角，逐位置滑动（黄色窗口）'); });
  C(800, () => { setWindow(0, 0); stepT.setText('位置①：元素相乘相加 1·1+0·0+0·0+1·1 = 2 → 特征图左上 = 2'); });
  C(800, () => { setWindow(0, 1); stepT.setText('位置②：1·0+0·1+0·1+1·0 = 0 → 特征图右上 = 0'); });
  C(800, () => { setWindow(1, 0); stepT.setText('位置③：0·1+1·0+1·0+0·1 = 0 → 特征图左下 = 0'); });
  C(800, () => { setWindow(1, 1); stepT.setText('位置④：0·0+1·1+1·1+0·0 = 2 → 特征图右下 = 2'); });
  C(800, () => {
    winBox.mesh.visible = false;
    setConv(0, 0); setConv(0, 1); setConv(1, 0); setConv(1, 1);
    stepT.setText('全部滑动完：特征图 [[2,0],[0,2]] — 亮像素间的对角关系被提取出来');
  });
  C(900, () => {
    poolBox.mesh.visible = true;
    stepT.setText('最大池化 2×2：取特征图最大值 max(2,0,0,2) = 2 → 图像浓缩为 1×1');
    eqT.setText('CNN 核心：卷积提特征（局部性+共享权重）+ 池化降维（抗平移）→ 全连接层分类');
  });
  C(900, () => {
    status.textContent = 'CNN 完成：3×3 图像 × 2×2 核 → 特征图 [[2,0],[0,2]] → 最大池化 → 2';
    hint.setText('CNN 参数少（核共享）、自动提特征 — LeNet 手写数字识别就是这套');
  });
}

panel.addButton('卷积识别', runCNN);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；黄窗=卷积窗口滑动，特征图=卷积结果，池化=降维）');

scene.start(engine);
