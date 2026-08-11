// AlgorithmLibrary/MLP3D.js — MLP 感知机：2-2-1 网络解决 XOR（前向 + 反向传播）（function* 生成器驱动，全流程动画）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('MLP3D');

const scene = new Scene3D('scene', { cameraPos: [0, 330, 640], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, ROSE = 0xfb7185, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「运行演示」开始：多层感知机', x: 0, y: 255, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');

// 网络骨架：输入层 2 节点 → 隐藏层 2 节点 → 输出 1 节点
const i1 = new VBox(scene, { w: 56, h: 56, d: 56, x: -200, y: 90, z: 0, label: 'x₁ = 1', color: BLUE, emissive: BLUE });
const i2 = new VBox(scene, { w: 56, h: 56, d: 56, x: -200, y: -90, z: 0, label: 'x₂ = 1', color: BLUE, emissive: BLUE });
const h1 = new VBox(scene, { w: 56, h: 56, d: 56, x: 0, y: 90, z: 0, label: 'h₁', color: PALETTE.node, emissive: PALETTE.nodeEmissive });
const h2 = new VBox(scene, { w: 56, h: 56, d: 56, x: 0, y: -90, z: 0, label: 'h₂', color: PALETTE.node, emissive: PALETTE.nodeEmissive });
const out = new VBox(scene, { w: 56, h: 56, d: 56, x: 200, y: 0, z: 0, label: 'ŷ', color: GREEN, emissive: GREEN });

const link = (x1, y1, x2, y2) => {
  const b = new VBox(scene, { w: 200, h: 3, d: 3, x: 0, y: 0, z: 0, label: '', color: DIM, emissive: 0 });
  const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
  const len = Math.hypot(x2 - x1, y2 - y1);
  b.mesh.rotation.z = Math.atan2(y2 - y1, x2 - x1);
  b.mesh.scale.set(len / 200, 1, 1);
  b.mesh.position.set(cx, cy, 0);
  b.mesh.visible = false;
  return b;
};
const L1 = [link(-200, 90, 0, 90), link(-200, 90, 0, -90), link(-200, -90, 0, 90), link(-200, -90, 0, -90)];
const L2 = [link(0, 90, 200, 0), link(0, -90, 200, 0)];
new VText(scene, { text: '输入层', x: -260, y: 155, z: 0, color: PALETTE.textDim, scale: 0.55 });
new VText(scene, { text: '隐藏层（σ 激活）', x: 0, y: 155, z: 0, color: PALETTE.textDim, scale: 0.55 });
new VText(scene, { text: '输出层', x: 260, y: 155, z: 0, color: PALETTE.textDim, scale: 0.55 });
new VText(scene, { text: 'XOR：输入相同 → 0，不同 → 1（线性不可分）', x: 0, y: 215, z: 0, color: PALETTE.textDim, scale: 0.7 });

const eq1T = new VText(scene, { text: '', x: 0, y: 55, z: 0, color: PALETTE.textDim, scale: 0.68 });
const eq2T = new VText(scene, { text: '', x: 0, y: -55, z: 0, color: PALETTE.textDim, scale: 0.68 });
const stepT = new VText(scene, { text: '', x: 0, y: -165, z: 0, color: PALETTE.textGlow, scale: 0.75 });

function resetAll() {
  h1.setText('h₁'); h2.setText('h₂'); out.setText('ŷ');
  i1.setColor(BLUE, BLUE); i2.setColor(BLUE, BLUE);
  h1.setColor(PALETTE.node, PALETTE.nodeEmissive); h2.setColor(PALETTE.node, PALETTE.nodeEmissive);
  out.setColor(GREEN, GREEN);
  [...L1, ...L2].forEach(b => (b.mesh.visible = false));
  eq1T.setText(''); eq2T.setText(''); stepT.setText('');
}

function* mlpGen() {
  resetAll();
  yield S(() => hint.setText('MLP：前向算预测，反向算梯度，梯度下降更新权重 — 深度学习的三板斧'));
  yield S(() => { stepT.setText('网络：2 输入 → 2 隐藏（σ 激活）→ 1 输出。当前样本 (1,1)，目标 0'); });
  yield W(800);
  yield S(() => {
    L1.forEach(b => (b.mesh.visible = true));
    h1.setText('h₁ = 0.69'); h2.setText('h₂ = 0.75');
    eq1T.setText('前向①：z₁ = W₁x + b₁ = [0.8, 1.1] → σ 激活 → a₁ = [0.69, 0.75]');
    stepT.setText('输入沿连线传到隐藏层（连线点亮）');
  });
  yield W(900);
  yield S(() => {
    L2.forEach(b => (b.mesh.visible = true));
    out.setText('ŷ = 0.552');
    eq2T.setText('前向②：z₂ = 0.7×0.69 − 0.5×0.75 + 0.1 = 0.208 → ŷ = σ(z₂) = 0.552（目标 0，偏了）');
    stepT.setText('输出 ŷ = 0.552：离目标 0 有差距 → 损失误差开始反向传播');
  });
  yield W(1000);
  yield S(() => {
    [...L1, ...L2].forEach(b => b.setColor(ROSE, ROSE));
    stepT.setText('反向传播：δ₂ = (ŷ−y)·σ′(z₂) = 0.552×0.448×0.552 ≈ 0.1365（红）→ 误差沿原路摊回每个权重');
    eq1T.setText('隐藏层梯度 δ₁ = [0.0204, −0.0128] — 误差被权重分配');
  });
  yield W(1000);
  yield S(() => {
    [...L1, ...L2].forEach(b => b.setColor(DIM, 0));
    eq2T.setText('更新（lr = 0.5）：w₂ → [0.653, −0.551]；w₁ → [[0.490, 0.390],[0.606, 0.306]]');
    stepT.setText('梯度下降一步：误差小的权重微调、误差大的权重多调 → 下次预测更准');
  });
  yield W(900);
  yield S(() => {
    status.textContent = 'MLP 完成：XOR 前向 ŷ=0.552 → 反向 δ₂=0.1365 → 更新权重，多轮后 ŷ→0';
    hint.setText('一层感知机解不了 XOR，加隐藏层 + 非线性激活就能 — 深度学习兴起的关键洞察');
  });
  yield W(600);
}

panel.addButton('运行演示', () => engine.start(mlpGen()));
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；黄线=前向传播，红线=反向传播梯度）');

scene.start(engine);
