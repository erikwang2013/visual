// AlgorithmLibrary/CNN3D.js — CNN：卷积核滑动提取特征 + 最大池化降维（function* 生成器驱动，4 窗口滑动动画）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('CNN3D');

const scene = new Scene3D('scene', { cameraPos: [0, 330, 640], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「运行演示」开始：卷积神经网络（3×3 输入）', x: 0, y: 265, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');

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
new VText(scene, { text: '卷积核 2×2（黄=1）', x: 220, y: 215, z: 0, color: PALETTE.textDim, scale: 0.6 });

// 2×2 特征图（初始暗，滑动后点亮）
const CONV_VAL = [[2, 0], [0, 2]];
const convBoxes = CONV_VAL.map((row, r) => row.map((v, c) => new VBox(scene, { w: 84, h: 84, d: 26, x: kcols[c], y: -130 + (r ? -40 : 0), z: 0, label: '?', color: DIM, emissive: 0 })));
new VText(scene, { text: '特征图 2×2（卷积结果）', x: 220, y: -145, z: 0, color: PALETTE.textDim, scale: 0.6 });

// 最大池化输出
const poolBox = new VBox(scene, { w: 84, h: 84, d: 26, x: 320, y: -85, z: 0, label: 'max = 2', color: BLUE, emissive: BLUE });
poolBox.mesh.visible = false;
new VText(scene, { text: '最大池化 → 1×1', x: 320, y: -185, z: 0, color: PALETTE.textDim, scale: 0.6 });

// 卷积窗口高亮（4 个 2×2 窗口）
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
  convBoxes[r][c].setColor(GREEN, GREEN);
  convBoxes[r][c].setText(String(CONV_VAL[r][c]));
}
function resetAll() {
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

function* cnnGen() {
  resetAll();
  yield S(() => hint.setText('CNN：卷积核滑动提取局部特征（卷积），再池化浓缩 — 图像识别的基石'));
  yield S(() => { stepT.setText('把 2×2 卷积核[[1,0],[0,1]] 放到图像左上角，逐位置滑动（黄色窗口）'); });
  yield W(800);
  yield S(() => { setWindow(0, 0); stepT.setText('位置①：元素相乘相加 1·1+0·0+0·0+1·1 = 2 → 特征图左上 = 2'); });
  yield W(800);
  yield S(() => { setWindow(0, 1); stepT.setText('位置②：1·0+0·1+0·1+1·0 = 0 → 特征图右上 = 0'); });
  yield W(800);
  yield S(() => { setWindow(1, 0); stepT.setText('位置③：0·1+1·0+1·0+0·1 = 0 → 特征图左下 = 0'); });
  yield W(800);
  yield S(() => { setWindow(1, 1); stepT.setText('位置④：0·0+1·1+1·1+0·0 = 2 → 特征图右下 = 2'); });
  yield W(800);
  yield S(() => {
    winBox.mesh.visible = false;
    setConv(0, 0); setConv(0, 1); setConv(1, 0); setConv(1, 1);
    stepT.setText('全部滑动完：特征图 [[2,0],[0,2]] — 亮像素间的对角关系被提取出来');
  });
  yield W(900);
  yield S(() => {
    poolBox.mesh.visible = true;
    stepT.setText('最大池化 2×2：取特征图最大值 max(2,0,0,2) = 2 → 图像浓缩为 1×1');
    eqT.setText('CNN 核心：卷积提特征（局部性+共享权重）+ 池化降维（抗平移）→ 全连接层分类');
  });
  yield W(900);
  yield S(() => {
    status.textContent = 'CNN 完成：3×3 图像 × 2×2 核 → 特征图 [[2,0],[0,2]] → 最大池化 → 2';
    hint.setText('CNN 参数少（核共享）、自动提特征 — LeNet 手写数字识别就是这套');
  });
  yield W(600);
}

panel.addButton('运行演示', () => engine.start(cnnGen()));
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；黄窗=卷积窗口滑动，特征图=卷积结果，池化=降维）');

scene.start(engine);
