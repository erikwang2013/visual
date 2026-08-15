// AlgorithmLibrary/AdaBoost3D.js — AdaBoost 加权提升：弱学习器串行迭代，错分样本权重逐轮放大，加权投票成强分类器（function* 生成器驱动，解说入状态栏）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VNode, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('AdaBoost3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, ROSE = 0xfb7185, YELLOW = 0xfacc15;
const status = panel.addStatus('就绪');

// 6 个二维样本 (x₁, x₂, 标签)：绿=正例 1，红=负例 0
const PTS = [[0, 0, 0], [1, 1, 0], [1, 0, 1], [2, 0, 0], [2, 1, 1], [3, 1, 1]];
const PX = v => 130 + v * 110, PY = v => 700 - v * 180;

// 节点池 + 权重标签池（峰值 6，池 6）：运行期仅改 text/color/scale/visible
const nodePool = [], wPool = [];
PTS.forEach((p, i) => {
  nodePool.push(new VNode(scene, { radius: 17, x: PX(p[0]), y: PY(p[1]), z: 0, label: String(i), color: p[2] ? GREEN : ROSE, emissive: p[2] ? GREEN : ROSE }));
  wPool.push(new VText(scene, { text: '0.167', x: PX(p[0]), y: PY(p[1]) - 42, z: 0, color: PALETTE.textDim, scale: 0.5 }));
});
const lblPos = new VText(scene, { text: '正样本', x: 66, y: 640, z: 0, color: GREEN, scale: 0.5 });
const lblNeg = new VText(scene, { text: '负样本', x: 66, y: 600, z: 0, color: ROSE, scale: 0.5 });

// 弱学习器分界线池：① x₁=1.5 竖线（黄）；② x₂=0.5 横线（黄）
const vLine = new VBox(scene, { w: 5, h: 230, d: 5, x: 295, y: 610, z: 0, label: '', color: YELLOW, emissive: YELLOW });
const hLine = new VBox(scene, { w: 390, h: 5, d: 5, x: 295, y: 610, z: 0, label: '', color: YELLOW, emissive: YELLOW });
vLine.mesh.visible = false; hLine.mesh.visible = false;

// 错分标记池（峰值 2，池 2）
const markPool = [], markFree = [];
for (let i = 0; i < 2; i++) {
  const m = new VText(scene, { text: '', x: 0, y: -600, z: 0, color: ROSE, scale: 0.8 });
  m.sprite.visible = false;
  markPool.push(m);
}
markFree.push(...markPool);
function markPoint(i) {
  const m = markFree.pop();
  m.sprite.position.set(PX(PTS[i][0]) + 40, PY(PTS[i][1]) + 40, 0);
  m.setText('✗');
  m.sprite.visible = true;
}
function clearMarks() {
  markPool.forEach(m => { m.setText(''); m.sprite.visible = false; });
  markFree.length = 0; markFree.push(...markPool);
}

const R1W = [0.125, 0.125, 0.25, 0.25, 0.125, 0.125];
const R2W = [0.1, 0.1667, 0.3333, 0.2, 0.1, 0.1];
function resetColors() { PTS.forEach((p, i) => nodePool[i].setColor(p[2] ? GREEN : ROSE, p[2] ? GREEN : ROSE)); }
function applyWeights(ws) {
  PTS.forEach((p, i) => {
    nodePool[i].mesh.scale.setScalar(ws[i] / 0.167);
    wPool[i].setText(ws[i].toFixed(3));
  });
}
function resetAll() {
  clearMarks();
  resetColors();
  nodePool.forEach(n => n.mesh.scale.setScalar(1));
  wPool.forEach(t => t.setText('0.167'));
  vLine.mesh.visible = false; hLine.mesh.visible = false;
}

function* runAdaBoost() {
  resetAll();
  yield S(() => { status.textContent = 'AdaBoost：弱学习器只比瞎猜好一点，串行训练让它们互补成强分类器。6 个样本（绿=正例 0~5 编号，数字下方=权重），初始权重均等 1/6'; });
  yield W(900);
  yield S(() => { vLine.mesh.visible = true; status.textContent = '第 1 轮 弱学习器①（黄竖线）：规则 x₁ > 1.5 → 正例，只能对 4/6 —— 这就是「弱」'; });
  yield W(900);
  yield S(() => {
    markPoint(2); markPoint(3);
    status.textContent = '错分 (1,0) 号 2、(2,0) 号 3（✗）：误差率 e₁ = 2/6 = 0.333 → 权重 α₁ = ½·ln((1−e)/e) = 0.347';
  });
  yield W(1000);
  yield S(() => {
    applyWeights(R1W);
    status.textContent = '权重更新 [0.125, 0.125, 0.25, 0.25, 0.125, 0.125]：错分点 2、3 权重放大，球体变大';
  });
  yield W(1000);
  yield S(() => {
    clearMarks();
    hLine.mesh.visible = true;
    resetColors();
    status.textContent = '第 2 轮 弱学习器②（黄横线）：规则 x₂ > 0.5 → 正例，专门照顾大权重样本，仍会错分 2 个';
  });
  yield W(900);
  yield S(() => {
    markPoint(1); markPoint(2);
    status.textContent = '错分 (1,1) 号 1、(1,0) 号 2（✗）：加权误差 e₂ = 0.125+0.25 = 0.375 → α₂ = ½·ln((1−e)/e) = 0.255';
  });
  yield W(1000);
  yield S(() => {
    applyWeights(R2W);
    status.textContent = '权重更新 [0.100, 0.167, 0.333, 0.200, 0.100, 0.100]：连续错分的 2 号权重最高';
  });
  yield W(900);
  yield S(() => {
    clearMarks();
    resetColors();
    status.textContent = '集成：sign(0.347·h₁ + 0.255·h₂) —— 单学习器各错 2 个，加权投票互补后 6/6 全对';
  });
  yield W(1100);
  yield S(() => { status.textContent = 'AdaBoost 演示完成：6 样本 2 轮提升（e₁=0.333/α₁=0.347，e₂=0.375/α₂=0.255），4/6 → 加权集成 6/6 正确；复杂度：每轮 O(n)，T 轮共 O(T·n)'; });
  yield W(900);
}

engine.queue(() => runAdaBoost());
panel.addButton('清空', () => {
  engine.clear();
  resetAll();
  status.textContent = '';
});

scene.start(engine);
