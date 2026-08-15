// AlgorithmLibrary/MLP3D.js — MLP 多层感知机：4-4-2 网络前向传播 + 反向传播梯度更新（function* 生成器驱动）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('MLP3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, RED = 0xfb7185, GREEN = 0x4ade80, DIM = 0x334155;
const status = panel.addStatus('就绪');

// 网络拓扑：输入 4 → 隐藏 4（σ 激活）→ 输出 2（softmax）
const LX = 120, HX = 320, OX = 520;
const NODE_Y = i => 460 + (i - 1.5) * 132;
const OUT_Y = i => 460 + (i - 0.5) * 66;
const X_VAL = [0.5, 0.8, 0.2, 0.9];   // 样本输入 x
const HID_A = [0.58, 0.64, 0.51, 0.71]; // 前向① 激活值
const OUT_P = [0.32, 0.68];            // 前向② softmax 输出

// 节点池：输入/隐藏/输出 10 球，运行期仅改文字/颜色
const inN = X_VAL.map((v, i) => new VNode(scene, { radius: 22, x: LX, y: NODE_Y(i), z: 0, label: 'x' + (i + 1) + '=' + v, color: BLUE, emissive: BLUE }));
const hidN = HID_A.map((v, i) => new VNode(scene, { radius: 22, x: HX, y: NODE_Y(i), z: 0, label: 'h' + (i + 1), color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
const outN = OUT_P.map((v, i) => new VNode(scene, { radius: 22, x: OX, y: OUT_Y(i), z: 0, label: 'ŷ' + (i + 1), color: PALETTE.node, emissive: PALETTE.nodeEmissive }));

// 连线池：4×4 + 4×2 = 24 条，运行期仅改显隐/颜色
const mkLink = (x1, y1, x2, y2) => {
  const b = new VBox(scene, { w: 200, h: 4, d: 4, x: 0, y: 0, z: 0, label: '', color: DIM, emissive: 0 });
  b.mesh.rotation.z = Math.atan2(y2 - y1, x2 - x1);
  b.mesh.scale.set(Math.hypot(x2 - x1, y2 - y1) / 200, 1, 1);
  b.mesh.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0);
  b.mesh.visible = false;
  return b;
};
const L1 = [], L2 = [];
for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) L1.push(mkLink(LX, NODE_Y(i), HX, NODE_Y(j)));
for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) L2.push(mkLink(HX, NODE_Y(i), OX, OUT_Y(j)));

function resetAll() {
  [...L1, ...L2].forEach(b => { b.mesh.visible = false; b.setColor(DIM, 0); });
  inN.forEach((n, i) => { n.setColor(BLUE, BLUE); n.setText('x' + (i + 1) + '=' + X_VAL[i]); });
  hidN.forEach((n, i) => { n.setColor(PALETTE.node, PALETTE.nodeEmissive); n.setText('h' + (i + 1)); });
  outN.forEach((n, i) => { n.setColor(PALETTE.node, PALETTE.nodeEmissive); n.setText('ŷ' + (i + 1)); });
}

function* runMLP() {
  resetAll();
  yield S(() => { status.textContent = 'MLP 多层感知机 4-4-2：前向传播算预测，反向传播算梯度，梯度下降更新权重。样本 x = (0.5, 0.8, 0.2, 0.9)，目标类别 2'; });
  yield W(900);
  yield S(() => {
    L1.forEach(b => { b.mesh.visible = true; });
    hidN.forEach((n, i) => n.setText('h' + (i + 1) + '=' + HID_A[i].toFixed(1)));
    status.textContent = '前向①：z₁ = W₁x + b₁ → σ 激活 → a₁ = (0.58, 0.64, 0.51, 0.71)，输入→隐藏 16 条连线点亮';
  });
  yield W(1100);
  yield S(() => {
    L2.forEach(b => { b.mesh.visible = true; });
    outN.forEach((n, i) => { n.setText('ŷ' + (i + 1) + '=' + OUT_P[i].toFixed(1)); n.setColor(GREEN, GREEN); });
    status.textContent = '前向②：z₂ = W₂a₁ + b₂ = (−0.35, 0.42) → softmax → ŷ = (0.32, 0.68)，argmax = 类别 2，命中目标';
  });
  yield W(1100);
  yield S(() => {
    L2.forEach(b => b.setColor(RED, RED));
    status.textContent = '反向①：交叉熵损失 L = −ln ŷ₂ ≈ 0.39；输出层梯度 δ₂ = ŷ − y = (0.32, −0.32)（红）沿 8 条连线回传';
  });
  yield W(1000);
  yield S(() => {
    L1.forEach(b => b.setColor(RED, RED));
    status.textContent = '反向②：δ₁ = (W₂ᵀδ₂) ⊙ σ′(z₁) ≈ (−0.013, 0.008, −0.007, 0.011)，误差经全部 16 条连线摊回输入层';
  });
  yield W(1000);
  yield S(() => {
    [...L1, ...L2].forEach(b => b.setColor(DIM, 0));
    status.textContent = '更新：w ← w − lr·δ·a（lr = 0.5）— 误差越大的权重调整越多，24 条权重同步微调，多轮后损失下降';
  });
  yield W(900);
  yield S(() => { status.textContent = 'MLP 演示完成：样本 x=(0.5,0.8,0.2,0.9) 前向 ŷ=(0.32,0.68) 命中类别 2；反向 δ₂=(0.32,−0.32) 回传更新 4×4+4×2 权重；前向/反向各 O(L·N²)'; });
  yield W(800);
}

engine.queue(() => runMLP());
panel.addButton('清空', () => {
  engine.clear();
  resetAll();
  status.textContent = '';
});

scene.start(engine);
