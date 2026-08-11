// AlgorithmLibrary/AdaBoost3D.js — AdaBoost：弱学习器串行，错分样本权重放大（function* 生成器驱动，2 轮提升动画）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('AdaBoost3D');

const scene = new Scene3D('scene', { cameraPos: [0, 330, 640], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, ROSE = 0xfb7185;
const hint = new VText(scene, { text: '点击「运行演示」开始：AdaBoost 加权提升', x: 0, y: 255, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');

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

const markA = new VText(scene, { text: '', x: WX(PTS[2][0]), y: WY(PTS[2][1]) + 30, z: 0, color: ROSE, scale: 0.8 });
const markB = new VText(scene, { text: '', x: WX(PTS[3][0]), y: WY(PTS[3][1]) + 30, z: 0, color: ROSE, scale: 0.8 });
const markC = new VText(scene, { text: '', x: WX(PTS[1][0]), y: WY(PTS[1][1]) + 30, z: 0, color: ROSE, scale: 0.8 });
const markD = new VText(scene, { text: '', x: WX(PTS[2][0]), y: WY(PTS[2][1]) + 30, z: 0, color: ROSE, scale: 0.8 });

const R1W = [0.125, 0.125, 0.25, 0.25, 0.125, 0.125];
const R2W = [0.1, 0.1667, 0.3333, 0.2, 0.1, 0.1];
const stepT = new VText(scene, { text: '', x: 0, y: -130, z: 0, color: PALETTE.textGlow, scale: 0.75 });
const eqT = new VText(scene, { text: '', x: 0, y: -175, z: 0, color: PALETTE.textDim, scale: 0.7 });

const resetColor = () => PTS.forEach((p, i) => boxes[i].setColor(p[2] ? GREEN : ROSE, p[2] ? GREEN : ROSE));
function applyWeights(ws) {
  PTS.forEach((p, i) => {
    boxes[i].mesh.scale.set(ws[i] / 0.125, ws[i] / 0.125, ws[i] / 0.125);
    wTxt[i].setText(ws[i].toFixed(3));
  });
}

function* adaGen() {
  resetColor();
  boxes.forEach(b => b.mesh.scale.set(1, 1, 1));
  wTxt.forEach(t => t.setText('0.167'));
  [vLine, hLine].forEach(b => (b.mesh.visible = false));
  [markA, markB, markC, markD].forEach(m => m.setText(''));
  stepT.setText(''); eqT.setText('');
  yield S(() => hint.setText('AdaBoost：一个弱学习器只比瞎猜好一点，串行训练让它们互补成强分类器'));
  yield S(() => { stepT.setText('初始权重均等：每个样本 1/6（数字在点下方）'); });
  yield W(800);
  yield S(() => { vLine.mesh.visible = true; stepT.setText('弱学习器①：规则 x₁ > 1.5 → 正例（竖线），只能对 4/6'); });
  yield W(800);
  yield S(() => {
    markA.setText('✗'); markB.setText('✗');
    boxes[2].setColor(YELLOW, YELLOW); boxes[3].setColor(YELLOW, YELLOW);
    stepT.setText('错分 (1,0)、(2,0)：误差率 e₁ = 2/6 = 0.333');
  });
  yield W(1000);
  yield S(() => {
    eqT.setText('α₁ = ½·ln((1−e)/e) = 0.347 → 错分样本权重 ×2');
    applyWeights(R1W);
    stepT.setText('权重更新 [0.125, 0.125, 0.25, 0.25, 0.125, 0.125] — 错分点明显变大');
  });
  yield W(1000);
  yield S(() => {
    hLine.mesh.visible = true;
    resetColor();
    stepT.setText('弱学习器②：规则 x₂ > 0.5 → 正例（横线），专门照顾权重大的样本');
  });
  yield W(800);
  yield S(() => {
    markA.setText(''); markB.setText('');
    markC.setText('✗'); markD.setText('✗');
    boxes[1].setColor(YELLOW, YELLOW); boxes[2].setColor(YELLOW, YELLOW);
    stepT.setText('错分 (1,1)、(1,0)：e₂ = 0.375 → α₂ = 0.255');
  });
  yield W(1000);
  yield S(() => {
    eqT.setText('权重更新 [0.100, 0.167, 0.333, 0.200, 0.100, 0.100] — 连续错分的 (1,0) 权重最高');
    applyWeights(R2W);
    stepT.setText('集成输出：sign(0.347·h₁ + 0.255·h₂) — 两棵弱树互补 → 组合分类更强');
  });
  yield W(900);
  yield S(() => {
    [markC, markD].forEach(m => m.setText(''));
    resetColor();
    status.textContent = 'AdaBoost 完成：2 轮（e₁=0.333/α₁=0.347，e₂=0.375/α₂=0.255），错分权重逐轮放大';
    hint.setText('AdaBoost 加权投票聚合弱学习器 — 人脸检测（Viola-Jones）的经典引擎');
  });
  yield W(600);
}

panel.addButton('运行演示', () => engine.start(adaGen()));
panel.addButton('清空', () => {
  engine.clear();
  resetColor();
  boxes.forEach(b => b.mesh.scale.set(1, 1, 1));
  wTxt.forEach(t => t.setText('0.167'));
  [vLine, hLine].forEach(b => (b.mesh.visible = false));
  [markA, markB, markC, markD].forEach(m => m.setText(''));
  stepT.setText(''); eqT.setText('');
  hint.setText('已清空，可重新运行'); status.textContent = '';
});
panel.addLabel('（拖拽旋转视角，滚轮缩放；方块大小 = 样本权重，✗ = 本轮错分）');

scene.start(engine);
