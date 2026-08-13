// AlgorithmLibrary/GBDT3D.js — GBDT：逐棵决策树拟合残差（梯度提升回归）（function* 生成器驱动，4 步动画）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VBar, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('GBDT3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, ROSE = 0xfb7185, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：梯度提升树', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');

const Y = [5.1, 4.9, 8.2, 7.8];
const XS = [170, 270, 370, 470];
const yBars = [], yVals = [];
Y.forEach((v, i) => {
  yBars.push(new VBar(scene, { w: 52, d: 52, x: XS[i], y: 300, z: 0, height: v * 8, color: GREEN, emissive: GREEN }));
  yVals.push(new VText(scene, { text: String(v), x: XS[i], y: v * 8 + 314, z: 0, color: PALETTE.textGlow, scale: 0.55 }));
});
new VBox(scene, { w: 640, h: 2, d: 2, x: 320, y: 300, z: 0, label: '', color: DIM, emissive: 0 });
new VText(scene, { text: '样本 y₁ ~ y₄', x: 90, y: 286, z: 0, color: PALETTE.textDim, scale: 0.55 });

const f0 = new VBox(scene, { w: 620, h: 3, d: 3, x: 320, y: 352, z: 0, label: '', color: BLUE, emissive: BLUE });
f0.mesh.visible = false;
const f0T = new VText(scene, { text: '', x: 0, y: 372, z: 0, color: BLUE, scale: 0.6 });

// 残差条：挂在 f₀ 线上（正上负下），x 向右偏移
const R1 = [-1.4, -1.6, 1.7, 1.3];
const rBars = R1.map((r, i) => {
  const b = new VBar(scene, { w: 30, d: 30, x: XS[i] + 34, z: 0, height: Math.abs(r) * 8, color: ROSE, emissive: ROSE });
  b.mesh.position.y = 352 + r * 4;
  b.mesh.visible = false;
  return b;
});
const rT = new VText(scene, { text: '', x: 0, y: 282, z: 0, color: ROSE, scale: 0.6 });

const leafL = new VBox(scene, { w: 180, h: 36, d: 36, x: 215, y: 245, z: 0, label: '', color: YELLOW, emissive: YELLOW });
const leafR = new VBox(scene, { w: 180, h: 36, d: 36, x: 425, y: 245, z: 0, label: '', color: YELLOW, emissive: YELLOW });
[leafL, leafR].forEach(b => (b.mesh.visible = false));
const leafLt = new VText(scene, { text: '', x: 215, y: 245, z: 22, color: PALETTE.textGlow, scale: 0.55 });
const leafRt = new VText(scene, { text: '', x: 425, y: 245, z: 22, color: PALETTE.textGlow, scale: 0.55 });

const F1 = [6.35, 6.35, 6.65, 6.65];
const f1Bars = F1.map((v, i) => {
  const b = new VBar(scene, { w: 34, d: 34, x: XS[i] - 34, y: 300, z: 0, height: v * 8, color: YELLOW, emissive: YELLOW });
  b.mesh.visible = false;
  return b;
});

const stepT = new VText(scene, { text: '', x: 0, y: 180, z: 0, color: PALETTE.textGlow, scale: 0.75 });
const eqT = new VText(scene, { text: '', x: 0, y: 140, z: 0, color: PALETTE.textDim, scale: 0.7 });

function resetAll() {
  Y.forEach((v, i) => { yBars[i].setHeight(v * 8); yVals[i].setText(String(v)); });
  rBars.forEach(b => (b.mesh.visible = false));
  f0.mesh.visible = false; f0T.setText('');
  rT.setText('');
  [leafL, leafR].forEach(b => (b.mesh.visible = false));
  leafLt.setText(''); leafRt.setText('');
  f1Bars.forEach(b => (b.mesh.visible = false));
  stepT.setText(''); eqT.setText('');
}

function* gbdtGen() {
  resetAll();
  yield S(() => hint.setText('GBDT：先用均值预测，再一棵棵决策树拟合残差（梯度下降的方向）'));
  yield S(() => { stepT.setText('回归问题：预测 y = [5.1, 4.9, 8.2, 7.8]（绿条为真实值）'); });
  yield W(800);
  yield S(() => {
    f0.mesh.visible = true;
    f0T.setText('f₀ = 均值 = (5.1+4.9+8.2+7.8)/4 = 6.5');
    stepT.setText('第 1 步：初始预测 f₀ = 6.5（蓝线）— 全部样本的均值');
  });
  yield W(900);
  yield S(() => {
    rBars.forEach(b => (b.mesh.visible = true));
    rT.setText('残差 r = y − f₀ = [−1.4, −1.6, +1.7, +1.3]（红条：真实值与蓝线的差距）');
    stepT.setText('第 2 步：算残差 — 决策树的目标从 y 换成 r');
  });
  yield W(1000);
  yield S(() => {
    [leafL, leafR].forEach(b => (b.mesh.visible = true));
    leafLt.setText('叶 L = −1.5'); leafRt.setText('叶 R = +1.5');
    stepT.setText('第 3 步：树按 x 分裂 → 左叶（残差 −1.4,−1.6）均值 −1.5；右叶（+1.7,+1.3）均值 +1.5');
  });
  yield W(1000);
  yield S(() => {
    f1Bars.forEach(b => (b.mesh.visible = true));
    stepT.setText('第 4 步：f₁ = f₀ + lr × 叶值（lr = 0.1）→ [6.35, 6.35, 6.65, 6.65]（黄条贴近真实值）');
    eqT.setText('新残差 [−1.25, −1.45, +1.55, +1.15] 更小 → 下一棵树继续拟合');
  });
  yield W(900);
  yield S(() => {
    status.textContent = 'GBDT 完成：f₀=6.5 → 拟合残差（叶 −1.5/+1.5）→ f₁ 更贴近 y（梯度提升）';
    hint.setText('GBDT 每棵树拟合残差/梯度方向，XGBoost 是其加正则化的加速版 — 推荐系统/风控之王');
  });
  yield W(600);
}

engine.queue(() => gbdtGen());
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；绿=真实值，蓝=f₀，红=残差，黄=更新后的预测）');

scene.start(engine);
