// AlgorithmLibrary/PCA3D.js — PCA：协方差矩阵特征分解找主成分方向（function* 生成器驱动）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('PCA3D');

const scene = new Scene3D('scene', { cameraPos: [0, 330, 640], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, ROSE = 0xfb7185, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「运行演示」开始：PCA 降维', x: 0, y: 255, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');

const PTS = [[1, 2], [2, 1], [3, 4], [4, 3], [5, 6]]; // (x, y)
const WX = v => (v - 3) * 55, WY = v => -(v - 3.2) * 55;
const pts = PTS.map(([x, y], i) => new VBox(scene, { w: 32, h: 32, d: 32, x: WX(x), y: WY(y), z: 0, label: 'p' + i, color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
const mean = new VBox(scene, { w: 40, h: 40, d: 40, x: 0, y: 0, z: 0, label: '均值', color: YELLOW, emissive: YELLOW });
new VText(scene, { text: '5 个样本点，均值 (3, 3.2)（黄块）', x: 0, y: 200, z: 0, color: PALETTE.textDim, scale: 0.7 });

// 主成分 1：特征向量 (0.619, 0.785) × 长度 95
const E1 = [0.619, -0.785];
const AXIS_LEN = 95;
const axis = new VBox(scene, { w: 200, h: 4, d: 4, x: 0, y: 0, z: 0, label: '', color: BLUE, emissive: BLUE });
axis.mesh.rotation.z = Math.atan2(E1[1], E1[0]);
axis.mesh.scale.set(AXIS_LEN / 200, 1, 1);
axis.mesh.position.set((E1[0] * AXIS_LEN) / 2, (E1[1] * AXIS_LEN) / 2, 0);
axis.mesh.visible = false;
const axisT = new VText(scene, { text: '', x: E1[0] * (AXIS_LEN + 28), y: E1[1] * (AXIS_LEN + 28), z: 0, color: BLUE, scale: 0.55 });

const covT = new VText(scene, { text: '', x: 0, y: 160, z: 0, color: PALETTE.textDim, scale: 0.7 });

// 投影：p0、p4 到主成分轴的连线 + 投影点
const PROJ = { 0: -2.18, 4: 3.436 };
const projPts = [], projLines = [];
[0, 4].forEach(i => {
  const t = PROJ[i];
  const px = t * 0.619 * 55, py = -t * 0.785 * 55;
  const src = { x: WX(PTS[i][0]), y: WY(PTS[i][1]) };
  const line = new VBox(scene, { w: 200, h: 2, d: 2, x: 0, y: 0, z: 0, label: '', color: ROSE, emissive: ROSE });
  const cx = (src.x + px) / 2, cy = (src.y + py) / 2;
  const len = Math.hypot(px - src.x, py - src.y);
  line.mesh.rotation.z = Math.atan2(py - src.y, px - src.x);
  line.mesh.scale.set(Math.max(len / 200, 0.05), 1, 1);
  line.mesh.position.set(cx, cy, 0);
  line.mesh.visible = false;
  projLines.push(line);
  const pp = new VBox(scene, { w: 22, h: 22, d: 22, x: px, y: py, z: 0, label: '', color: YELLOW, emissive: YELLOW });
  pp.mesh.visible = false;
  projPts.push(pp);
});
const stepT = new VText(scene, { text: '', x: 0, y: -205, z: 0, color: PALETTE.textGlow, scale: 0.75 });

function resetAll() {
  pts.forEach(b => b.setColor(PALETTE.node, PALETTE.nodeEmissive));
  mean.setColor(YELLOW, YELLOW);
  axis.mesh.visible = false; axisT.setText('');
  covT.setText('');
  projLines.forEach(b => (b.mesh.visible = false));
  projPts.forEach(b => (b.mesh.visible = false));
  stepT.setText('');
}

function* pcaGen() {
  resetAll();
  yield S(() => hint.setText('PCA：找方差最大的方向（信息最多的方向），把数据投影过去降维'));
  yield S(() => { stepT.setText('原始数据：5 个二维点，想压成一条线（一维）'); });
  yield W(500);
  yield S(() => {
    covT.setText('去中心化后：协方差矩阵 [[2.5, 2.5],[2.5, 3.7]] → 特征分解求主方向');
    stepT.setText('协方差矩阵描述数据沿各方向的波动幅度');
  });
  yield W(650);
  yield S(() => {
    axis.mesh.visible = true;
    axisT.setText('主成分 1');
    stepT.setText('特征分解：λ₁ = 5.67，特征向量 (0.619, 0.785) → 数据最分散的方向（蓝轴）');
  });
  yield W(700);
  yield S(() => {
    projLines.forEach(b => (b.mesh.visible = true));
    projPts.forEach(b => (b.mesh.visible = true));
    stepT.setText('把每个点投影到蓝轴（红虚线 = 投影误差）→ 二维降成一维坐标');
  });
  yield W(700);
  yield S(() => {
    status.textContent = 'PCA 完成：主成分 1 保留 91.5% 方差（λ₁=5.67，λ₂=0.53），二维→一维';
    hint.setText('λ₁/(λ₁+λ₂) = 91.5%：只丢 8.5% 信息就降一维 — 人脸识别/数据可视化常用');
  });
  yield W(600);
}

panel.addButton('运行演示', () => engine.start(pcaGen()));
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；蓝轴 = 主成分方向，红虚线 = 投影误差）');

scene.start(engine);
