// AlgorithmLibrary/LogisticRegression3D.js — 逻辑回归：sigmoid 概率 + 交叉熵损失 + 梯度下降求决策边界（function* 生成器驱动，解说入状态栏）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('LogisticRegression3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, ROSE = 0xfb7185, GOLD = 0xfcd34d, BLUE = 0x60a5fa;
const status = panel.addStatus('就绪');
const E = p => p * p * (3 - 2 * p);
const sig = t => 1 / (1 + Math.exp(-t));

// ---- 样本点池：6 个 (x, y, label)，绿=正例 1、红=负例 0（静态演示体） ----
const PTS = [[-3, 1, 1], [-2, 2, 1], [-1, 0.5, 1], [1, -1, 0], [2, -2, 0], [3, -0.5, 0]];
const PX = v => v * 62 + 320, PY = v => -v * 55 + 300;
const pts = PTS.map(([x, y, lab]) => new VNode(scene, { radius: 22, x: PX(x), y: PY(y), z: 0, label: '', color: lab ? GREEN : ROSE, emissive: lab ? GREEN : ROSE }));

// ---- sigmoid 曲线：26 段折线（模块级预建，静态），横轴为分数 t、纵轴为概率 p=σ(t) ----
const CX = 645, CY = 340, TX = 22, TY = 360, T0 = -4.5, T1 = 4.5, SEGS = 26;
const curvePts = [];
for (let i = 0; i <= SEGS; i++) {
  const t = T0 + (T1 - T0) * i / SEGS;
  curvePts.push({ x: CX + t * TX, y: CY - (sig(t) - 0.5) * TY });
}
for (let i = 0; i < SEGS; i++) {
  const a = curvePts[i], b = curvePts[i + 1];
  const dx = b.x - a.x, dy = b.y - a.y;
  const seg = new VBox(scene, { w: 200, h: 3, d: 3, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: 0, label: '', color: BLUE, emissive: BLUE });
  seg.mesh.rotation.z = Math.atan2(dy, dx);
  seg.mesh.scale.set(Math.max(Math.hypot(dx, dy) / 200, 0.05), 1, 1);
}
new VText(scene, { text: 'p=0.5', x: CX, y: CY + 16, z: 0, color: PALETTE.textDim, scale: 0.42 });

// ---- 概率标记池：黄点沿曲线滑动 + p 值标签 ----
const markers = [], pLabels = [];
for (let i = 0; i < PTS.length; i++) {
  const m = new VNode(scene, { radius: 9, x: CX, y: CY, z: 0, label: '', color: GOLD, emissive: GOLD });
  m.mesh.visible = false;
  markers.push(m);
  const pl = new VText(scene, { text: '', x: CX, y: CY - 26, z: 0, color: GOLD, scale: 0.42 });
  pl.sprite.visible = false;
  pLabels.push(pl);
}

// ---- 决策边界线：w₁x + w₂y + b = 0（黄→绿） ----
const boundary = new VBox(scene, { w: 200, h: 5, d: 5, x: 320, y: 300, z: 0, label: '', color: GOLD, emissive: GOLD });
boundary.mesh.visible = false;

const W_ROUNDS = [[0, -0.6, 0.35], [0.002, -0.779, 0.462], [0.005, -0.898, 0.538]];
const LOSS = [0.204, 0.143, 0.114];

function linePose(w) {
  const [b, w1, w2] = w;
  const y1 = -(w1 * -3 + b) / w2, y2 = -(w1 * 3 + b) / w2;
  const p1 = { x: PX(-3), y: PY(y1) }, p2 = { x: PX(3), y: PY(y2) };
  return { cx: (p1.x + p2.x) / 2, cy: (p1.y + p2.y) / 2, rot: Math.atan2(p2.y - p1.y, p2.x - p1.x), len: Math.hypot(p2.x - p1.x, p2.y - p1.y) };
}
function applyPose(pose) {
  boundary.mesh.rotation.z = pose.rot;
  boundary.mesh.scale.set(Math.max(pose.len / 200, 0.02), 1, 1);
  boundary.mesh.position.set(pose.cx, pose.cy, 0);
}
function lerpPose(a, b, e) {
  return { cx: a.cx + (b.cx - a.cx) * e, cy: a.cy + (b.cy - a.cy) * e, rot: a.rot + (b.rot - a.rot) * e, len: a.len + (b.len - a.len) * e };
}
function setMarkers(w, showLbl) {
  const [b, w1, w2] = w;
  for (let i = 0; i < PTS.length; i++) {
    const [x, y] = PTS[i];
    const t = b + w1 * x + w2 * y;
    const p = sig(t);
    const mx = CX + t * TX, my = CY - (p - 0.5) * TY;
    markers[i].mesh.visible = true;
    markers[i].moveTo(mx, my, 0, 700);
    pLabels[i].sprite.visible = showLbl;
    if (showLbl) {
      pLabels[i].moveTo(mx, my - 26, 0, 700);
      pLabels[i].setText('p=' + p.toFixed(2));
    }
  }
}
function resetAll() {
  for (let i = 0; i < PTS.length; i++) pts[i].setColor(PTS[i][2] ? GREEN : ROSE, PTS[i][2] ? GREEN : ROSE);
  boundary.mesh.visible = false;
  setMarkers([0, 0, 0], false);
}

function* runLogistic() {
  resetAll();
  yield S(() => { status.textContent = 'LogisticRegression：逻辑回归二分类 —— 6 个样本（绿=正例 1，红=负例 0），用 sigmoid 概率 p=σ(w₁x+w₂y+b) 与交叉熵损失学习决策边界'; });
  yield W(800);
  yield S(() => { status.textContent = '初始化 w=[b,w₁,w₂]=[0,0,0]：每个样本 p=σ(0)=0.5（黄点全部压在曲线中点），平均交叉熵损失 = 0.693（最大熵，完全无法区分）'; });
  yield W(950);
  let prevPose = null;
  for (let k = 0; k < W_ROUNDS.length; k++) {
    const pose = linePose(W_ROUNDS[k]);
    if (k === 0) {
      yield S(() => { boundary.mesh.visible = true; applyPose(pose); setMarkers(W_ROUNDS[k], true); status.textContent = '第 1 轮梯度下降：w ← w − lr·∂L/∂w，样本概率沿 sigmoid 滑动，决策边界旋转逼近分界'; });
    } else {
      yield A(700, p => { const e = E(p); applyPose(lerpPose(prevPose, pose, e)); });
      yield S(() => { setMarkers(W_ROUNDS[k], true); status.textContent = '第 ' + (k + 1) + ' 轮梯度下降：w ← w − lr·∂L/∂w，样本概率沿 sigmoid 滑动，决策边界旋转逼近分界'; });
    }
    yield W(800);
    yield S(() => { status.textContent = '本轮平均交叉熵损失 = ' + LOSS[k].toFixed(3) + '（从初始化 0.693 持续下降，概率趋于 0/1）：w = [' + W_ROUNDS[k].map(v => v.toFixed(3)).join(', ') + ']'; });
    yield W(650);
    prevPose = pose;
  }
  yield S(() => {
    boundary.setColor(GREEN, GREEN);
    status.textContent = 'LogisticRegression 演示完成：6 样本 3 轮梯度下降，损失 0.204→0.143→0.114 持续下降，决策边界 w₁x+w₂y+b=0（绿）正确分离正负例；复杂度：每轮 O(n·d)，n=样本数、d=特征数';
  });
  yield W(900);
}

engine.queue(() => runLogistic());
panel.addButton('清空', () => {
  engine.clear();
  boundary.mesh.visible = false;
  markers.forEach(m => { m.mesh.visible = false; });
  pLabels.forEach(t => { t.sprite.visible = false; t.setText(''); });
  status.textContent = '';
});

scene.start(engine);
