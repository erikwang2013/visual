// AlgorithmLibrary/LinearRegression3D.js — 线性回归：梯度下降最小化均方误差，直线逐迭代拟合数据（function* 生成器驱动，解说入状态栏）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('LinearRegression3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const status = panel.addStatus('就绪');

const GREEN = 0x4ade80, RED = 0xf87171;
const ease = p => p * p * (3 - 2 * p);
const PTS = [[-240, -100], [-180, -60], [-120, -50], [-60, -5], [0, 25], [60, 55], [120, 70], [180, 115], [240, 145]];
const N = PTS.length;

// 数据点（常驻）
const pts = PTS.map(p => new VNode(scene, { radius: 13, x: p[0] + 320, y: p[1] + 330, z: 0, label: '', color: GREEN, emissive: GREEN }));
// 拟合线：预建 X 向细管（长 540），运行期仅改 scale/rotation/position
const lineCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(-270, 0, 0), new THREE.Vector3(270, 0, 0)]);
const line = new THREE.Mesh(new THREE.TubeGeometry(lineCurve, 4, 3, 6, false), new THREE.MeshBasicMaterial({ color: PALETTE.highlight }));
line.visible = false;
scene.add(line);
// 残差虚线池：每点 4 段（段为 Y 向细管长 40），峰值 9×4 = 36、池 37
const SEGS = 4, SEG_LEN = 40, FRAC = [0.125, 0.375, 0.625, 0.875];
const resPool = [];
for (let i = 0; i < N; i++) {
  for (let s = 0; s < SEGS; s++) {
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, -SEG_LEN / 2, 0), new THREE.Vector3(0, SEG_LEN / 2, 0)]);
    const t = new THREE.Mesh(new THREE.TubeGeometry(curve, 3, 1.4, 5, false), new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.5 }));
    t.visible = false;
    scene.add(t);
    resPool.push(t);
  }
}
{
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, -SEG_LEN / 2, 0), new THREE.Vector3(0, SEG_LEN / 2, 0)]);
  const t = new THREE.Mesh(new THREE.TubeGeometry(curve, 3, 1.4, 5, false), new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.5 }));
  t.visible = false;
  scene.add(t);
  resPool.push(t);
}
// 参数徽标（数据标签）
const eqT = new VText(scene, { text: '', x: 60, y: 570, z: 0, color: PALETTE.textGlow, scale: 0.55 });
const lossT = new VText(scene, { text: '', x: 60, y: 520, z: 0, color: PALETTE.textDim, scale: 0.5 });

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

function setLine(ww, bb, grow = 1) {
  const x1 = 50, x2 = 590;
  const y1 = ww * (x1 - 320) + bb + 330, y2 = ww * (x2 - 320) + bb + 330;
  const L = Math.hypot(x2 - x1, y2 - y1);
  line.scale.x = (L / 540) * grow;
  line.rotation.z = Math.atan2(y2 - y1, x2 - x1);
  line.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0);
}

function updateResiduals(ww, bb) {
  for (let i = 0; i < N; i++) {
    const [x, y] = PTS[i];
    const dy = ww * x + bb - y;
    const L = Math.abs(dy);
    for (let s = 0; s < SEGS; s++) {
      const t = resPool[i * SEGS + s];
      if (L < 24) { t.visible = false; continue; }
      t.visible = true;
      t.position.set(x + 320, y + 330 + dy * FRAC[s], 0);
      t.scale.y = (0.25 * L) / SEG_LEN;
    }
  }
}

function resetAll() {
  resPool.forEach(t => { t.visible = false; t.scale.y = 1; });
  line.visible = true;
  line.scale.x = 0.001;
  line.rotation.z = 0;
  line.position.set(320, 330, 0);
  eqT.setText('');
  lossT.setText('');
}

function* runLR() {
  resetAll();
  yield S(() => { status.textContent = '线性回归：y = wx + b。梯度下降反复微调 w、b 使均方误差 MSE 最小 —— 演示 9 个数据点的最小二乘拟合'; });
  yield W(900);
  yield S(() => { status.textContent = '初始：w = 0、b = 0（水平线），MSE = ' + steps[0].mse.toFixed(1) + ' —— 开始梯度下降'; });
  yield W(700);
  for (let i = 1; i < steps.length; i++) {
    const a = steps[i - 1], s = steps[i];
    yield A(560, p => {
      const e = ease(p);
      setLine(a.w + (s.w - a.w) * e, a.b + (s.b - a.b) * e, i === 1 ? e : 1);
      updateResiduals(a.w + (s.w - a.w) * e, a.b + (s.b - a.b) * e);
    });
    yield W(300);
    if (i === 1 || i === 2 || i === 5 || i === steps.length - 1) {
      const desc = i === 1 ? ' —— 一步大梯度直抵最优附近' : (i === 2 ? ' —— 已收敛（梯度≈0），继续微调' : (i === 5 ? ' —— 残差平方均值已最小' : ' —— 最终参数'));
      yield S(() => {
        eqT.setText('y = ' + s.w.toFixed(2) + 'x + ' + s.b.toFixed(1));
        lossT.setText('MSE = ' + s.mse.toFixed(1));
        status.textContent = '迭代 ' + (i * 30) + '：w = ' + s.w.toFixed(3) + '、b = ' + s.b.toFixed(1) + '，MSE = ' + s.mse.toFixed(1) + desc;
      });
      yield W(650);
    }
  }
  yield S(() => { status.textContent = 'LinearRegression 演示完成：y = ' + FW.toFixed(2) + 'x + ' + FB.toFixed(2) + '，MSE 从 ' + steps[0].mse.toFixed(1) + ' 降至 ' + lastMse.toFixed(1) + '；复杂度：每轮梯度 O(n)，收敛轮数取决于学习率'; });
  yield W(1000);
}

engine.queue(() => runLR());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
