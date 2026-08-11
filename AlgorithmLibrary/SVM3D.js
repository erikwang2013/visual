// AlgorithmLibrary/SVM3D.js — 支持向量机：最大间隔超平面 + 支持向量
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('SVM3D');

const scene = new Scene3D('scene', { cameraPos: [0, 330, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, ROSE = 0xfb7185, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「训练模型」开始', x: 0, y: 255, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const POS = [[1, 1], [2, 2], [2, 1.5]], NEG = [[-1, -1], [-2, -2], [-1.5, -2]];
const PX = v => v * 55, PY = v => -v * 55;
const posBoxes = POS.map(([x, y]) => new VBox(scene, { w: 38, h: 38, d: 38, x: PX(x), y: PY(y), z: 0, label: '', color: GREEN, emissive: GREEN }));
const negBoxes = NEG.map(([x, y]) => new VBox(scene, { w: 38, h: 38, d: 38, x: PX(x), y: PY(y), z: 0, label: '', color: ROSE, emissive: ROSE }));
new VText(scene, { text: '训练集：正例 3 个（绿）+ 负例 3 个（红）', x: 0, y: 200, z: 0, color: PALETTE.textDim, scale: 0.7 });

const line = new VBox(scene, { w: 200, h: 4, d: 4, x: 0, y: 0, z: 0, label: '', color: YELLOW, emissive: YELLOW });
const m1 = new VBox(scene, { w: 200, h: 3, d: 3, x: 0, y: 0, z: 0, label: '', color: DIM, emissive: DIM });
const m2 = new VBox(scene, { w: 200, h: 3, d: 3, x: 0, y: 0, z: 0, label: '', color: DIM, emissive: DIM });
[line, m1, m2].forEach(b => (b.mesh.visible = false));
const stepT = new VText(scene, { text: '', x: 0, y: -140, z: 0, color: PALETTE.textGlow, scale: 0.75 });
const eqT = new VText(scene, { text: '', x: 0, y: -185, z: 0, color: PALETTE.textDim, scale: 0.7 });

function placeLine(c, box) {
  const p1 = { x: PX(-2), y: PY(c + 2) }, p2 = { x: PX(2), y: PY(c - 2) };
  const cx = (p1.x + p2.x) / 2, cy = (p1.y + p2.y) / 2;
  const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  box.mesh.rotation.z = Math.atan2(p2.y - p1.y, p2.x - p1.x);
  box.mesh.scale.set(len / 200, 1, 1);
  box.mesh.position.set(cx, cy, 0);
}

function resetAll() {
  engine.clear();
  for (const b of posBoxes) b.setColor(GREEN, GREEN);
  for (const b of negBoxes) b.setColor(ROSE, ROSE);
  [line, m1, m2].forEach(b => (b.mesh.visible = false));
  stepT.setText(''); eqT.setText('');
}

function runTrain() {
  resetAll();
  hint.setText('SVM：找一个超平面把两类分开，且到两侧最近点的距离（间隔）最大');
  C(300, () => {
    for (const b of posBoxes) b.setColor(GREEN, GREEN);
    for (const b of negBoxes) b.setColor(ROSE, ROSE);
    stepT.setText('问题：无数直线都能分开两类，哪条最好？— 间隔最大的那条');
  });
  C(900, () => {
    line.mesh.visible = true;
    placeLine(0, line);
    stepT.setText('候选超平面 w·x + b = 0，w = (1,1)，b = 0 → x + y = 0（旋转 45°）');
  });
  C(1000, () => {
    m1.mesh.visible = true; m2.mesh.visible = true;
    placeLine(1, m1); placeLine(-1, m2);
    stepT.setText('间隔边界 w·x + b = ±1：x+y = 1 与 x+y = −1（平行于超平面）');
  });
  C(1000, () => {
    posBoxes[0].setColor(YELLOW, YELLOW);
    negBoxes[0].setColor(YELLOW, YELLOW);
    stepT.setText('支持向量 (1,1)、(−1,−1)：恰好压在间隔边界上，唯一决定超平面位置');
    eqT.setText('间隔 = 2/‖w‖ = 2/√2 = √2 ≈ 1.41（最大化它 → 泛化最好）');
  });
  C(900, () => {
    status.textContent = 'SVM 完成：最大间隔 1.41，支持向量 (1,1)/(−1,−1)，超平面 x+y=0';
    hint.setText('SVM 核技巧可把非线性数据映射到高维再线性分割 — 文本分类/图像识别常用');
  });
}

panel.addButton('训练模型', runTrain);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；间隔 = 2/‖w‖，只有支持向量参与优化）');

scene.start(engine);
