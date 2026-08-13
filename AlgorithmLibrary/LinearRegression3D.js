// AlgorithmLibrary/LinearRegression3D.js — 线性回归：梯度下降最小化均方误差，直线逐步拟合数据（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('LinearRegression3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, DIM = 0x334155, RED = 0xf87171;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：线性回归', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');

const PTS = [[-240, -100], [-180, -60], [-120, -50], [-60, -5], [0, 25], [60, 55], [120, 70], [180, 115], [240, 145]];
const pts = PTS.map(p => new VBox(scene, { w: 24, h: 24, d: 24, x: p[0] + 320, y: p[1] + 330, z: 0, label: '', color: GREEN, emissive: GREEN }));
const line = new VBox(scene, { w: 560, h: 6, d: 6, x: 320, y: 330, z: 0, label: '', color: PALETTE.highlight, emissive: PALETTE.highlightEmissive });
const lossT = new VText(scene, { text: '', x: 700, y: 420, z: 0, color: PALETTE.textGlow, scale: 0.55, wrapChars: 8 });
const eqT = new VText(scene, { text: '', x: 700, y: 360, z: 0, color: PALETTE.textDim, scale: 0.5, wrapChars: 8 });

function setLine(w, b) {
  const x1 = 50, x2 = 590, y1 = w * (x1 - 320) + b + 330, y2 = w * (x2 - 320) + b + 330;
  const L = Math.hypot(x2 - x1, y2 - y1);
  line.mesh.scale.x = L / 560;
  line.mesh.rotation.z = Math.atan2(y2 - y1, x2 - x1);
  line.mesh.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0);
}

// 预计算梯度下降轨迹：坐标归一化到 [-1,1] 保证收敛，采样时还原为显示值
const X = PTS.map(([x, y]) => [x / 240, y / 240]);
let w = 0, b = 0;
const steps = [];
const LR = 0.3;
let lastMse = 0;
for (let i = 0; i < 300; i++) {
  let mse = 0, dw = 0, db = 0;
  for (const [x, y] of X) { const pred = w * x + b; mse += (pred - y) ** 2; dw += x * (pred - y); db += (pred - y); }
  mse /= X.length; dw = 2 * dw / X.length; db = 2 * db / X.length;
  if (i % 30 === 0) steps.push({ w, b: b * 240, mse: mse * 57600 });
  w -= LR * dw; b -= LR * db;
  lastMse = mse * 57600;
}
steps.push({ w, b: b * 240, mse: lastMse });
const FW = w, FB = b * 240;

let residuals = [];
function clearResiduals() {
  residuals.forEach(t => { scene.remove(t); if (t.geometry) t.geometry.dispose(); if (t.material) t.material.dispose(); });
  residuals = [];
}
function drawResiduals(ww, bb) {
  clearResiduals();
  for (const [x, y] of PTS) {
    residuals.push(tubeBetween(scene, new THREE.Vector3(x + 320, y + 330, 0), new THREE.Vector3(x + 320, ww * x + bb + 330, 0), { color: RED, opacity: 0.45, radius: 1.2 }));
  }
}

function resetAll() {
  clearResiduals();
  setLine(0, 0);
  lossT.setText('');
  eqT.setText('');
}

function* lrGen() {
  resetAll();
  yield S(() => hint.setText('线性回归：y = wx + b。用梯度下降反复微调 w、b，让均方误差 MSE 越来越小'));
  yield S(() => { eqT.setText('红色竖线 = 残差（预测值 - 真实值），MSE 即残差平方的平均'); });
  yield W(450);
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    yield S(() => {
      setLine(s.w, s.b);
      drawResiduals(s.w, s.b);
      lossT.setText('迭代 ' + i * 30 + '：MSE = ' + s.mse.toFixed(1) + '，w = ' + s.w.toFixed(3) + '，b = ' + s.b.toFixed(1));
      if (i > 0) hint.setText('MSE 从 ' + steps[0].mse.toFixed(0) + ' 降到 ' + s.mse.toFixed(1) + '：直线正逐步贴近数据');
    });
    yield W(500);
  }
  yield S(() => {
    status.textContent = '训练完成：y = ' + FW.toFixed(2) + 'x + ' + FB.toFixed(2) + '，MSE = ' + lastMse.toFixed(1) + '（从 ' + steps[0].mse.toFixed(0) + ' 下降）';
    hint.setText('梯度方向 = 误差曲面最陡上升方向，沿反方向走小步即可下降；学习率太大易震荡');
  });
  yield W(600);
}

engine.queue(() => lrGen());
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；多变量线性回归同理，只是参数更多）');

scene.start(engine);
