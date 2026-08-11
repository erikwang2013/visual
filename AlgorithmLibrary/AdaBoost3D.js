// AlgorithmLibrary/AdaBoost3D.js — AdaBoost：弱学习器串行，错分样本权重放大
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('AdaBoost3D');

const scene = new Scene3D('scene', { cameraPos: [0, 330, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, ROSE = 0xfb7185, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「AdaBoost」开始', x: 0, y: 255, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

// 6 个二维样本 (x₁, x₂, 标签)：绿=1，红=0
const PTS = [[0, 0, 0], [1, 1, 0], [1, 0, 1], [2, 0, 0], [2, 1, 1], [3, 1, 1]];
const WX = v => v * 70 - 105, WY = v => -v * 70;
const boxes = [], wTxt = [];
PTS.forEach((p, i) => {
  boxes.push(new VBox(scene, { w: 36, h: 36, d: 36, x: WX(p[0]), y: WY(p[1]), z: 0, label: '', color: p[2] ? GREEN : ROSE, emissive: p[2] ? GREEN : ROSE }));
  wTxt.push(new VText(scene, { text: '0.167', x: WX(p[0]), y: WY(p[1]) - 32, z: 0, color: PALETTE.textDim, scale: 0.45 }));
});
new VText(scene, { text: '6 个样本，初始权重均等 1/6', x: 0, y: 200, z: 0, color: PALETTE.textDim, scale: 0.7 });

// 弱学习器分界线：① x₁=1.5 竖线；② x₂=0.5 横线
const vLine = new VBox(scene, { w: 3, h: 200, d: 3, x: 0, y: -35, z: 0, label: '', color: YELLOW, emissive: YELLOW });
const hLine = new VBox(scene, { w: 250, h: 3, d: 3, x: 0, y: -35, z: 0, label: '', color: YELLOW, emissive: YELLOW });
[vLine, hLine].forEach(b => (b.mesh.visible = false));

const wrongMark = i => new VText(scene, { text: '', x: WX(PTS[i][0]), y: WY(PTS[i][1]) + 30, z: 0, color: ROSE, scale: 0.8 });
const markA = wrongMark(2), markB = wrongMark(3), markC = wrongMark(1), markD = wrongMark(2);

const R1W = [0.125, 0.125, 0.25, 0.25, 0.125, 0.125];
const R2W = [0.1, 0.1667, 0.3333, 0.2, 0.1, 0.1];
const stepT = new VText(scene, { text: '', x: 0, y: -130, z: 0, color: PALETTE.textGlow, scale: 0.75 });
const eqT = new VText(scene, { text: '', x: 0, y: -175, z: 0, color: PALETTE.textDim, scale: 0.7 });

function applyWeights(ws) {
  PTS.forEach((p, i) => {
    boxes[i].mesh.scale.set(ws[i] / 0.125, ws[i] / 0.125, ws[i] / 0.125);
    wTxt[i].setText(ws[i].toFixed(3));
  });
}

function resetAll() {
  engine.clear();
  PTS.forEach((p, i) => {
    boxes[i].setColor(p[2] ? GREEN : ROSE, p[2] ? GREEN : ROSE);
    boxes[i].mesh.scale.set(1, 1, 1);
    wTxt[i].setText('0.167');
  });
  [vLine, hLine].forEach(b => (b.mesh.visible = false));
  [markA, markB, markC, markD].forEach(m => m.setText(''));
  stepT.setText(''); eqT.setText('');
}

function runAda() {
  resetAll();
  hint.setText('AdaBoost：一个弱学习器只比瞎猜好一点，串行训练让它们互补成强分类器');
  C(300, () => { stepT.setText('初始权重均等：每个样本 1/6（数字在点下方）'); });
  C(800, () => {
    vLine.mesh.visible = true;
    stepT.setText('弱学习器①：规则 x₁ > 1.5 → 正例（竖线），只能对 4/6');
  });
  C(800, () => {
    markA.setText('✗'); markB.setText('✗');
    boxes[2].setColor(YELLOW, YELLOW); boxes[3].setColor(YELLOW, YELLOW);
    stepT.setText('错分 (1,0)、(2,0)：误差率 e₁ = 2/6 = 0.333');
  });
  C(1000, () => {
    eqT.setText('α₁ = ½·ln((1−e)/e) = 0.347 → 错分样本权重 ×2，正确样本权重降低');
    applyWeights(R1W);
    stepT.setText('权重更新 [0.125, 0.125, 0.25, 0.25, 0.125, 0.125] — 错分点明显变大');
  });
  C(800, () => {
    hLine.mesh.visible = true;
    boxes[2].setColor(PTS[2][2] ? GREEN : ROSE, PTS[2][2] ? GREEN : ROSE);
    boxes[3].setColor(PTS[3][2] ? GREEN : ROSE, PTS[3][2] ? GREEN : ROSE);
    stepT.setText('弱学习器②：规则 x₂ > 0.5 → 正例（横线），专门照顾权重大的样本');
  });
  C(800, () => {
    markA.setText(''); markB.setText('');
    markC.setText('✗'); markD.setText('✗');
    boxes[1].setColor(YELLOW, YELLOW); boxes[2].setColor(YELLOW, YELLOW);
    stepT.setText('错分 (1,1)、(1,0)：e₂ = 0.375 → α₂ = 0.255，权重再调整');
  });
  C(1000, () => {
    eqT.setText('权重更新 [0.100, 0.167, 0.333, 0.200, 0.100, 0.100] — 连续错分的 (1,0) 权重最高');
    applyWeights(R2W);
    stepT.setText('集成输出：sign(0.347·h₁ + 0.255·h₂) — 两棵弱树互补 → 组合分类更强');
  });
  C(900, () => {
    [markC, markD].forEach(m => m.setText(''));
    boxes[1].setColor(PTS[1][2] ? GREEN : ROSE, PTS[1][2] ? GREEN : ROSE);
    boxes[2].setColor(PTS[2][2] ? GREEN : ROSE, PTS[2][2] ? GREEN : ROSE);
    status.textContent = 'AdaBoost 完成：2 轮（e₁=0.333/α₁=0.347，e₂=0.375/α₂=0.255），错分权重逐轮放大';
    hint.setText('AdaBoost 加权投票聚合弱学习器 — 人脸检测（Viola-Jones）的经典引擎');
  });
}

panel.addButton('AdaBoost', runAda);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；方块大小 = 样本权重，✗ = 本轮错分）');

scene.start(engine);
