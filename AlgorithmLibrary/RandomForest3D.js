// AlgorithmLibrary/RandomForest3D.js — 随机森林：多棵决策树并行投票（水果分类）
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('RandomForest3D');

const scene = new Scene3D('scene', { cameraPos: [0, 340, 660], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, ROSE = 0xfb7185, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「森林投票」开始', x: 0, y: 265, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

// 三棵树：规则卡片 + 决策路径 chips（YELLOW 高亮 → GREEN 落定）
const TREES = [
  { title: '树 1 · 颜色主导', rule: ['颜色 = 红 → 橙子', '绿 → 椭圆→橙子 · 圆→苹果'], path: ['红', '橙子'] },
  { title: '树 2 · 形状主导', rule: ['椭圆 → 看颜色；圆 → 苹果', '红 → 大→橙子 · 小→苹果'], path: ['椭圆', '红', '大', '橙子'] },
  { title: '树 3 · 大小主导', rule: ['大 → 看形状；小 → 看颜色', '椭圆→橙子 · 圆→苹果 / 绿→橙子·红→苹果'], path: ['大', '椭圆', '橙子'] },
];
const cardBoxes = [], cardT1 = [], chips = [], voteBoxes = [];
TREES.forEach((t, ti) => {
  const x = -230 + ti * 230;
  cardBoxes.push(new VBox(scene, { w: 210, h: 56, d: 40, x, y: 140, z: 0, label: '', color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
  cardT1.push(new VText(scene, { text: t.title, x, y: 192, z: 0, color: PALETTE.textGlow, scale: 0.55 }));
  new VText(scene, { text: t.rule[0], x, y: 152, z: 23, color: PALETTE.textDim, scale: 0.42 });
  new VText(scene, { text: t.rule[1], x, y: 128, z: 23, color: PALETTE.textDim, scale: 0.42 });
  const row = [];
  t.path.forEach((p, i) => {
    const chip = new VBox(scene, { w: 92, h: 26, d: 26, x, y: 112 - i * 28, z: 0, label: p, color: DIM, emissive: 0 });
    chip.mesh.visible = false;
    row.push(chip);
  });
  chips.push(row);
  voteBoxes.push(new VBox(scene, { w: 120, h: 40, d: 40, x, y: -95, z: 0, label: '树 ' + (ti + 1), color: DIM, emissive: 0 }));
});

const testBox = new VBox(scene, { w: 300, h: 44, d: 44, x: 0, y: -30, z: 0, label: '', color: PALETTE.node, emissive: PALETTE.nodeEmissive });
new VText(scene, { text: '测试水果：红 · 大 · 椭圆', x: 0, y: -30, z: 26, color: PALETTE.textGlow, scale: 0.55 });
const resultT = new VText(scene, { text: '', x: 0, y: -155, z: 0, color: PALETTE.textGlow, scale: 0.8 });
const stepT = new VText(scene, { text: '', x: 0, y: -205, z: 0, color: PALETTE.textDim, scale: 0.72 });

function resetAll() {
  engine.clear();
  for (let ti = 0; ti < TREES.length; ti++) {
    for (const chip of chips[ti]) { chip.mesh.visible = false; chip.setColor(DIM, 0); }
    voteBoxes[ti].setColor(DIM, 0); voteBoxes[ti].setText('树 ' + (ti + 1));
  }
  resultT.setText(''); stepT.setText('');
}

function lightPath(ti) {
  chips[ti].forEach((chip, i) => {
    C(120, () => { chip.mesh.visible = true; chip.setColor(YELLOW, YELLOW); });
    C(120, () => { chip.setColor(GREEN, GREEN); });
  });
}

function runForest() {
  resetAll();
  hint.setText('随机森林：Bagging 采样 + 随机特征选树，多数表决 — 抗过拟合的集成方法');
  C(400, () => {
    for (let ti = 0; ti < TREES.length; ti++) {
      cardBoxes[ti].setColor(BLUE, BLUE);
      voteBoxes[ti].setColor(ROSE, ROSE);
    }
    stepT.setText('3 棵决策树（每棵看不同特征组合），各自独立判断 → 投票定结果');
  });
  C(900, () => {
    testBox.setColor(YELLOW, YELLOW);
    stepT.setText('测试水果：红 · 大 · 椭圆 → 每棵树沿自己的规则走到底');
  });
  C(400, () => { lightPath(0); });
  C(600, () => {
    voteBoxes[0].setColor(GREEN, GREEN); voteBoxes[0].setText('橙子 ✓');
    stepT.setText('树1（颜色主导）：颜色=红 → 叶节点「橙子」');
  });
  C(400, () => { lightPath(1); });
  C(700, () => {
    voteBoxes[1].setColor(GREEN, GREEN); voteBoxes[1].setText('橙子 ✓');
    stepT.setText('树2（形状主导）：椭圆 → 红 → 大 → 叶节点「橙子」');
  });
  C(400, () => { lightPath(2); });
  C(700, () => {
    voteBoxes[2].setColor(GREEN, GREEN); voteBoxes[2].setText('橙子 ✓');
    stepT.setText('树3（大小主导）：大 → 椭圆 → 叶节点「橙子」');
  });
  C(900, () => {
    resultT.setText('投票结果：3 : 0 → 判定「橙子」✓');
    stepT.setText('多数表决：3 票全投橙子 → 集成比单棵树更稳，降低过拟合');
    hint.setText('随机森林：每棵树随机抽样本+随机选特征，投票聚合 — 金融风控/生物信息学常用');
  });
  C(400, () => {
    status.textContent = '随机森林完成：3 棵树 3:0 投票，测试水果（红·大·椭圆）判为橙子';
  });
}

panel.addButton('森林投票', runForest);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；黄色=决策路径，绿色=叶节点落定，投票多数胜）');

scene.start(engine);
