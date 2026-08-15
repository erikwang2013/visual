// AlgorithmLibrary/GBDT3D.js — GBDT：均值起步，逐棵决策树拟合残差（梯度提升回归）（function* 生成器驱动）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VBar } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('GBDT3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const status = panel.addStatus('就绪');
const ease = p => p * p * (3 - 2 * p);

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, ROSE = 0xfb7185, DIM = 0x334155;

const Y = [5.1, 4.9, 8.2, 7.8];
const XS = [170, 270, 370, 470];
const R1 = [-1.4, -1.6, 1.7, 1.3];
const F1 = [6.35, 6.35, 6.65, 6.65];

// ---- 模块级对象池：运行期仅改文字/颜色/显隐/尺寸，绝不 new ----
const yBars = [], yVals = [];
Y.forEach((v, i) => {
  yBars.push(new VBar(scene, { w: 52, d: 52, x: XS[i], y: 300, z: 0, height: 0, color: GREEN, emissive: GREEN }));
  yVals.push(new VText(scene, { text: String(v), x: XS[i], y: v * 8 + 318, z: 0, color: PALETTE.textGlow, scale: 0.55 }));
});
yBars.forEach((b, i) => b.setHeight(Y[i] * 8));  // 初始化默认演示体：真实值绿条
const axis = new VBox(scene, { w: 640, h: 2, d: 2, x: 320, y: 300, z: 0, label: '', color: DIM, emissive: 0 });

const f0Line = new VBox(scene, { w: 620, h: 3, d: 3, x: 320, y: 352, z: 0, label: '', color: BLUE, emissive: BLUE });
f0Line.mesh.visible = false;
const f0Lbl = new VText(scene, { text: 'f₀ = 6.5', x: 655, y: 356, z: 0, color: BLUE, scale: 0.6 });
f0Lbl.sprite.visible = false;

const rBars = R1.map((r, i) => {
  const b = new VBar(scene, { w: 30, d: 30, x: XS[i] + 34, z: 0, height: 0, color: ROSE, emissive: ROSE });
  b.mesh.position.y = 352 + r * 4;
  b.mesh.visible = false;
  return b;
});
const rVals = R1.map((r, i) => {
  const t = new VText(scene, { text: String(r), x: XS[i] + 34, y: 352 + r * 4 + (r >= 0 ? 16 : -22), z: 0, color: ROSE, scale: 0.45 });
  t.sprite.visible = false;
  return t;
});
const leafL = new VBox(scene, { w: 180, h: 36, d: 36, x: 215, y: 245, z: 0, label: '', color: YELLOW, emissive: YELLOW });
const leafR = new VBox(scene, { w: 180, h: 36, d: 36, x: 425, y: 245, z: 0, label: '', color: YELLOW, emissive: YELLOW });
[leafL, leafR].forEach(b => (b.mesh.visible = false));
const leafLt = new VText(scene, { text: '叶 L = −1.5', x: 215, y: 245, z: 24, color: PALETTE.textGlow, scale: 0.5 });
const leafRt = new VText(scene, { text: '叶 R = +1.5', x: 425, y: 245, z: 24, color: PALETTE.textGlow, scale: 0.5 });
leafLt.sprite.visible = false; leafRt.sprite.visible = false;

const f1Bars = F1.map((v, i) => {
  const b = new VBar(scene, { w: 34, d: 34, x: XS[i] - 34, y: 300, z: 0, height: 0, color: YELLOW, emissive: YELLOW });
  b.mesh.visible = false;
  return b;
});

function resetAll() {
  yBars.forEach(b => b.setHeight(0));
  f0Line.mesh.visible = false; f0Lbl.sprite.visible = false;
  rBars.forEach(b => { b.mesh.visible = false; b.setHeight(0); });
  rVals.forEach(t => (t.sprite.visible = false));
  [leafL, leafR].forEach(b => { b.mesh.visible = false; b.mesh.scale.setScalar(1); });
  leafLt.sprite.visible = false; leafRt.sprite.visible = false;
  f1Bars.forEach(b => { b.mesh.visible = false; b.setHeight(0); });
}

function* runGBDT() {
  resetAll();
  yield S(() => { status.textContent = 'GBDT（梯度提升回归）：4 个样本 y = [5.1, 4.9, 8.2, 7.8]，先给均值预测，再逐棵决策树拟合残差（梯度方向）'; });
  yield W(600);
  yield A(700, p => { const e = ease(p); yBars.forEach((b, i) => b.setHeight(Y[i] * 8 * e)); });
  yield S(() => { status.textContent = '第 1 步：真实值绿条就位 —— 目标是学一个函数 f，让预测尽量贴近 y'; });
  yield W(800);
  yield S(() => {
    f0Line.mesh.visible = true;
    f0Lbl.sprite.visible = true;
    status.textContent = '第 2 步：初始预测 f₀(x) = 均值 = (5.1+4.9+8.2+7.8)/4 = 6.5（蓝线）—— 最简单的起点';
  });
  yield W(900);
  yield S(() => {
    rBars.forEach(b => (b.mesh.visible = true));
    status.textContent = '第 3 步：决策树的目标换成残差 r = y − f₀（红条：真实值超出/低于蓝线的差距）';
  });
  yield W(300);
  yield A(600, p => { const e = ease(p); rBars.forEach((b, i) => b.setHeight(Math.abs(R1[i]) * 8 * e)); });
  yield S(() => {
    rVals.forEach(t => (t.sprite.visible = true));
    status.textContent = '残差 r = [−1.4, −1.6, +1.7, +1.3] —— 提升 = 沿梯度方向修错，一树一步';
  });
  yield W(900);
  yield S(() => {
    [leafL, leafR].forEach(b => (b.mesh.visible = true));
    leafLt.sprite.visible = true; leafRt.sprite.visible = true;
    status.textContent = '第 4 步：回归树按 x 分裂：左叶拟合 {−1.4, −1.6} → 均值 −1.5；右叶拟合 {+1.7, +1.3} → 均值 +1.5';
  });
  yield W(1000);
  yield S(() => {
    f1Bars.forEach(b => (b.mesh.visible = true));
    status.textContent = '第 5 步：f₁ = f₀ + lr × 叶值（lr = 0.1）→ 预测更新为 [6.35, 6.35, 6.65, 6.65]（黄条贴近绿条）';
  });
  yield W(300);
  yield A(650, p => { const e = ease(p); f1Bars.forEach((b, i) => b.setHeight(F1[i] * 8 * e)); });
  yield S(() => { status.textContent = '新残差 [−1.25, −1.45, +1.55, +1.15] 明显更小 —— 再叠一棵树继续拟合，多树相加逼近真实函数'; });
  yield W(900);
  yield S(() => { status.textContent = 'GBDT 演示完成：4 样本均值 f₀=6.5，残差树叶 −1.5/+1.5，f₁=[6.35,6.35,6.65,6.65] 显著贴近 y，多树叠加逼近真实函数；训练 O(N·T·D)、预测 O(T·D)'; });
  yield W(800);
}

engine.queue(() => runGBDT());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
