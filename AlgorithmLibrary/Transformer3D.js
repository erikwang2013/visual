// AlgorithmLibrary/Transformer3D.js — 自注意力：Q 查询 K，加权聚合 V（Attention Is All You Need）
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Transformer3D');

const scene = new Scene3D('scene', { cameraPos: [0, 330, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, ROSE = 0xfb7185, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「自注意力」开始', x: 0, y: 255, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const TX = [-160, 0, 160];
const tk = TX.map((x, i) => new VBox(scene, { w: 60, h: 60, d: 60, x, y: 205, z: 0, label: '词' + (i + 1), color: BLUE, emissive: BLUE }));
new VText(scene, { text: '词向量', x: -260, y: 205, z: 0, color: PALETTE.textDim, scale: 0.5 });

// Q / K / V 三行：q₁=(1,0)；k₁=(1,0) k₂=(0,1) k₃=(2,1)；v 与 k 相同
const KV = [['(1,0)', '(0,1)', '(2,1)']];
const YROWS = [135, 75, 15];
const qkv = [
  ['(1,0)', '(?,?)', '(?,?)'].map((lab, c) => new VBox(scene, { w: 52, h: 52, d: 30, x: TX[c], y: YROWS[0], z: 0, label: lab, color: DIM, emissive: 0 })),
  KV[0].map((lab, c) => new VBox(scene, { w: 52, h: 52, d: 30, x: TX[c], y: YROWS[1], z: 0, label: lab, color: DIM, emissive: 0 })),
  KV[0].map((lab, c) => new VBox(scene, { w: 52, h: 52, d: 30, x: TX[c], y: YROWS[2], z: 0, label: lab, color: DIM, emissive: 0 }))
];
new VText(scene, { text: 'Q 查询', x: -260, y: 135, z: 0, color: PALETTE.textDim, scale: 0.5 });
new VText(scene, { text: 'K 键', x: -260, y: 75, z: 0, color: PALETTE.textDim, scale: 0.5 });
new VText(scene, { text: 'V 值', x: -260, y: 15, z: 0, color: PALETTE.textDim, scale: 0.5 });

const scoreBoxes = [0.71, 0, 1.41].map((v, i) => new VBox(scene, { w: 52, h: 52, d: 30, x: TX[i], y: -55, z: 0, label: '?', color: DIM, emissive: 0 }));
const attBoxes = [0.284, 0.14, 0.576].map((v, i) => new VBox(scene, { w: 52, h: 52, d: 30, x: TX[i], y: -115, z: 0, label: '?', color: DIM, emissive: 0 }));
new VText(scene, { text: '得分 s₁（缩放后）', x: -260, y: -55, z: 0, color: PALETTE.textDim, scale: 0.5 });
new VText(scene, { text: 'softmax 权重', x: -260, y: -115, z: 0, color: PALETTE.textDim, scale: 0.5 });

const ctx = new VBox(scene, { w: 64, h: 64, d: 64, x: 0, y: -185, z: 0, label: '输出₁ = (1.436, 0.716)', color: GREEN, emissive: GREEN });
ctx.mesh.visible = false;
new VText(scene, { text: '加权聚合 → 上下文向量', x: -260, y: -185, z: 0, color: PALETTE.textDim, scale: 0.5 });

const stepT = new VText(scene, { text: '', x: 0, y: -250, z: 0, color: PALETTE.textGlow, scale: 0.75 });

const sT = [0.71, 0, 1.41], aT = [0.284, 0.14, 0.576];

function resetAll() {
  engine.clear();
  tk.forEach(b => b.setColor(BLUE, BLUE));
  qkv.forEach((row, r) => row.forEach((b, c) => {
    b.setColor(DIM, 0);
    b.setText(r === 0 ? (c === 0 ? '(1,0)' : '(?,?)') : KV[0][c]);
  }));
  scoreBoxes.forEach(b => { b.setColor(DIM, 0); b.setText('?'); });
  attBoxes.forEach(b => { b.setColor(DIM, 0); b.setText('?'); });
  ctx.mesh.visible = false;
  stepT.setText('');
}

function runAttn() {
  resetAll();
  hint.setText('Transformer 自注意力：每个词生成 Q/K/V，Q 问所有 K，加权聚合 V — 长依赖的答案');
  C(300, () => { stepT.setText('只看词₁ 的计算：q₁ = (1,0)，与 3 个键 k₁ k₂ k₃ 做点积'); });
  C(800, () => {
    qkv[0][0].setColor(BLUE, BLUE);
    stepT.setText('q₁ = (1,0)（蓝色高亮）— 每个词生成自己的查询向量');
  });
  C(900, () => {
    qkv[1].forEach(b => b.setColor(BLUE, BLUE));
    stepT.setText('键 k = [(1,0), (0,1), (2,1)]：点积 q₁·k 衡量词₁ 与每个词的相关性');
  });
  C(900, () => {
    scoreBoxes.forEach((b, i) => { b.setColor(YELLOW, YELLOW); b.setText(String(sT[i])); });
    stepT.setText('得分 s₁ = q₁·k / √dₖ = [1, 0, 2] / 1.41 = [0.71, 0, 1.41] — 词₁ 最关注词₃！');
  });
  C(900, () => {
    attBoxes.forEach((b, i) => { b.setColor(YELLOW, YELLOW); b.setText(String(aT[i])); });
    stepT.setText('softmax 归一化 → [0.284, 0.14, 0.576] — 词₃ 分到 57.6% 的注意力');
  });
  C(900, () => {
    ctx.mesh.visible = true;
    stepT.setText('聚合：输出₁ = 0.284·v₁ + 0.14·v₂ + 0.576·v₃ = (1.436, 0.716) — 携带了词₃ 的信息');
  });
  C(900, () => {
    status.textContent = '自注意力完成：得分 [0.71,0,1.41] → softmax [0.284,0.14,0.576] → 输出 (1.436,0.716)';
    hint.setText('自注意力让每个词直接"看到"所有词 — GPT/BERT 的核心，一举解决 RNN 长序列遗忘');
  });
}

panel.addButton('自注意力', runAttn);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；蓝=Q/K/V 矩阵，黄=注意力得分与权重，绿=输出）');

scene.start(engine);
