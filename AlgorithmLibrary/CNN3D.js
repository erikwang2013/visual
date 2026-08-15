// AlgorithmLibrary/CNN3D.js — CNN：卷积核在输入上滑动提取特征 + 最大池化降维（function* 生成器驱动，4 窗口滑动动画）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('CNN3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, DIM = 0x334155;
const status = panel.addStatus('就绪');
const ease = p => p * p * (3 - 2 * p);

// 输入 3×3 图像（0=暗，1=亮）：X 形十字 1 0 1 / 0 1 0 / 1 0 1
const IMG = [[1, 0, 1], [0, 1, 0], [1, 0, 1]];
const KER = [[1, 0], [0, 1]];
const CONV_VAL = [[2, 0], [0, 2]];
const SZ = 56, GAP = 66, INX = 115, MIDX = 330, OUTX = 545, CY = 460;

// ---- 模块级预建全部对象（峰值=池），运行期仅改文字/颜色/显隐/位置 ----
const cols = [INX - GAP, INX, INX + GAP], rows = [CY + GAP, CY, CY - GAP];
const imgBoxes = [];
for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
  const v = IMG[r][c];
  imgBoxes.push(new VBox(scene, { w: SZ, h: SZ, d: 24, x: cols[c], y: rows[r], z: 0, label: String(v), color: v ? GREEN : DIM, emissive: v ? GREEN : 0 }));
}
new VText(scene, { text: '输入 3×3', x: INX, y: CY + 150, z: 0, color: PALETTE.textDim, scale: 0.5 });

const kcols = [MIDX - 28, MIDX + 28], krows = [CY + 28, CY - 28];
const kerBoxes = KER.map((row, r) => row.map((v, c) => new VBox(scene, { w: 50, h: 50, d: 20, x: kcols[c], y: krows[r], z: 0, label: String(v), color: v ? YELLOW : DIM, emissive: v ? YELLOW : 0 })));
new VText(scene, { text: '卷积核 2×2', x: MIDX, y: CY + 150, z: 0, color: PALETTE.textDim, scale: 0.5 });

const fcols = [OUTX - 28, OUTX + 28], frows = [CY + 28, CY - 28];
const convBoxes = CONV_VAL.map((row, r) => row.map((v, c) => new VBox(scene, { w: 50, h: 50, d: 20, x: fcols[c], y: frows[r], z: 0, label: '?', color: DIM, emissive: 0 })));
new VText(scene, { text: '特征图 2×2', x: OUTX, y: CY + 150, z: 0, color: PALETTE.textDim, scale: 0.5 });

const poolBox = new VBox(scene, { w: 54, h: 54, d: 20, x: OUTX, y: CY - 175, z: 0, label: 'max=2', color: BLUE, emissive: BLUE });
poolBox.mesh.visible = false;
new VText(scene, { text: '池化 1×1', x: OUTX, y: CY - 245, z: 0, color: PALETTE.textDim, scale: 0.5 });

// 卷积窗口高亮（池 1，滑动复用）
const winBox = new VBox(scene, { w: 2 * SZ + 12, h: 2 * SZ + 12, d: 6, x: 0, y: 0, z: 14, label: '', color: YELLOW, emissive: YELLOW });
winBox.mesh.visible = false;

// 2×2 窗口 4 个位置（左上/右上/左下/右下）的中心
const WPOS = [[0, 0], [0, 1], [1, 0], [1, 1]].map(([r, c]) => [(cols[c] + cols[c + 1]) / 2, (rows[r] + rows[r + 1]) / 2]);
const WIN_TXT = [
  '窗口①（左上）：1·1+0·0+0·0+1·1 = 2 → 特征图左上 = 2',
  '窗口②（右上）：1·0+0·1+0·1+1·0 = 0 → 特征图右上 = 0',
  '窗口③（左下）：0·1+1·0+1·0+0·1 = 0 → 特征图左下 = 0',
  '窗口④（右下）：0·0+1·1+1·1+0·0 = 2 → 特征图右下 = 2'
];

function resetAll() {
  imgBoxes.forEach((b, i) => { const v = IMG[Math.floor(i / 3)][i % 3]; b.setColor(v ? GREEN : DIM, v ? GREEN : 0); b.setText(String(v)); });
  kerBoxes.forEach((row, r) => row.forEach((b, c) => { const v = KER[r][c]; b.setColor(v ? YELLOW : DIM, v ? YELLOW : 0); }));
  convBoxes.forEach(row => row.forEach(b => { b.setColor(DIM, 0); b.setText('?'); }));
  winBox.mesh.visible = false;
  poolBox.mesh.visible = false;
  poolBox.mesh.scale.setScalar(1);
}

function* runCnn() {
  resetAll();
  let wx = WPOS[0][0] - 220, wy = WPOS[0][1];
  yield S(() => { status.textContent = 'CNN：卷积核（黄色 2×2）在输入图像上逐位置滑动，相乘求和提取局部特征，最后最大池化降维'; });
  yield W(800);
  for (let i = 0; i < 4; i++) {
    const tx = WPOS[i][0], ty = WPOS[i][1];
    yield S(() => { winBox.mesh.visible = true; status.textContent = '卷积：' + WIN_TXT[i]; });
    yield A(430, p => { const e = ease(p); winBox.mesh.position.set(wx + (tx - wx) * e, wy + (ty - wy) * e, 14); });
    wx = tx; wy = ty;
    yield W(420);
  }
  yield S(() => {
    winBox.mesh.visible = false;
    convBoxes.forEach((row, r) => row.forEach((b, c) => { b.setColor(GREEN, GREEN); b.setText(String(CONV_VAL[r][c])); }));
    status.textContent = '4 个窗口全部滑完：特征图 [[2,0],[0,2]] —— X 形对角关系被提取出来';
  });
  yield W(800);
  yield S(() => {
    poolBox.mesh.visible = true;
    poolBox.mesh.scale.setScalar(0.2);
    status.textContent = '最大池化：取 2×2 特征图最大值 max(2,0,0,2) = 2 → 图像浓缩为 1×1 输出';
  });
  yield A(420, p => { poolBox.mesh.scale.setScalar(0.2 + 0.8 * ease(p)); });
  yield W(800);
  yield S(() => {
    status.textContent = 'CNN 演示完成：3×3 输入 × 2×2 核 → 特征图 [[2,0],[0,2]] → 池化输出 2；复杂度：卷积 O(n²·k²) + 池化 O(n²)';
  });
  yield W(800);
}

engine.queue(() => runCnn());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
