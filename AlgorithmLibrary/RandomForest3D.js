// AlgorithmLibrary/RandomForest3D.js — 随机森林：3 棵决策树并行判断，多数投票集成分类（function* 生成器驱动，全部对象模块级预建）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('RandomForest3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, ROSE = 0xfb7185, DIM = 0x334155, GOLD = 0xfcd34d;
const status = panel.addStatus('就绪');

// 三棵树：各自的主导特征 + 决策路径（chip 自顶向下 = 判断顺序，末位为叶结论）
const TREES = [
  { title: '树 1 · 颜色主导', path: ['红', '橙子'] },
  { title: '树 2 · 形状主导', path: ['椭圆', '红', '大', '橙子'] },
  { title: '树 3 · 大小主导', path: ['大', '椭圆', '橙子'] },
];
const cardBoxes = [], cardTitles = [], chips = [], voteBoxes = [];
TREES.forEach((t, ti) => {
  const x = 90 + ti * 230;
  cardBoxes.push(new VBox(scene, { w: 210, h: 56, d: 40, x, y: 470, z: 0, label: '', color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
  cardTitles.push(new VText(scene, { text: t.title, x, y: 525, z: 0, color: PALETTE.textGlow, scale: 0.55 }));
  const row = [];
  t.path.forEach((p, i) => {
    const chip = new VBox(scene, { w: 92, h: 26, d: 26, x, y: 425 - i * 34, z: 0, label: p, color: DIM, emissive: 0 });
    chip.mesh.visible = false;
    row.push(chip);
  });
  chips.push(row);
  voteBoxes.push(new VBox(scene, { w: 120, h: 40, d: 40, x, y: 240, z: 0, label: '树 ' + (ti + 1), color: DIM, emissive: 0 }));
});
const testBox = new VBox(scene, { w: 300, h: 44, d: 44, x: 320, y: 585, z: 0, label: '', color: PALETTE.node, emissive: PALETTE.nodeEmissive });
const testLbl = new VText(scene, { text: '测试水果：红 · 大 · 椭圆', x: 320, y: 625, z: 0, color: GOLD, scale: 0.55 });
const resultT = new VText(scene, { text: '', x: 320, y: 160, z: 0, color: PALETTE.textGlow, scale: 0.7 });

function resetAll() {
  for (let ti = 0; ti < TREES.length; ti++) {
    for (const chip of chips[ti]) { chip.mesh.visible = false; chip.setColor(DIM, 0); }
    voteBoxes[ti].setColor(DIM, 0); voteBoxes[ti].setText('树 ' + (ti + 1));
  }
  testBox.setColor(PALETTE.node, PALETTE.nodeEmissive);
  resultT.setText('');
}

function* lightPath(ti) {
  for (const chip of chips[ti]) {
    yield S(() => { chip.mesh.visible = true; chip.setColor(YELLOW, YELLOW); });
    yield W(140);
    yield S(() => { chip.setColor(GREEN, GREEN); });
    yield W(140);
  }
}

function* runRandomForest() {
  resetAll();
  yield S(() => { status.textContent = '随机森林：3 棵决策树（Bagging 随机抽样 + 随机特征子集）各自独立判断，多数投票集成分类'; });
  yield W(800);
  yield S(() => {
    cardBoxes.forEach(b => b.setColor(BLUE, BLUE));
    voteBoxes.forEach(b => b.setColor(ROSE, ROSE));
    testBox.setColor(YELLOW, YELLOW);
    status.textContent = '测试水果「红 · 大 · 椭圆」（黄色）送入 3 棵树，每棵沿自己的规则路径走到叶结论';
  });
  yield W(900);
  yield S(() => { status.textContent = '树 1（颜色主导）：颜色=红 → 叶结论「橙子」（路径逐格点亮：黄 → 绿）'; });
  yield* lightPath(0);
  yield S(() => { voteBoxes[0].setColor(GREEN, GREEN); voteBoxes[0].setText('橙子 ✓'); status.textContent = '树 1 判断完成：橙子 ✓'; });
  yield W(700);
  yield S(() => { status.textContent = '树 2（形状主导）：椭圆 → 红 → 大 → 叶结论「橙子」'; });
  yield* lightPath(1);
  yield S(() => { voteBoxes[1].setColor(GREEN, GREEN); voteBoxes[1].setText('橙子 ✓'); status.textContent = '树 2 判断完成：橙子 ✓'; });
  yield W(700);
  yield S(() => { status.textContent = '树 3（大小主导）：大 → 椭圆 → 叶结论「橙子」'; });
  yield* lightPath(2);
  yield S(() => { voteBoxes[2].setColor(GREEN, GREEN); voteBoxes[2].setText('橙子 ✓'); status.textContent = '树 3 判断完成：橙子 ✓'; });
  yield W(700);
  yield S(() => {
    resultT.setText('橙子 3 : 0 苹果');
    status.textContent = '投票汇总：橙子 3 票、苹果 0 票 → 多数表决判定「橙子」';
  });
  yield W(900);
  yield S(() => { status.textContent = 'RandomForest 演示完成：3 棵树（颜色/形状/大小主导）独立判断、3:0 投票，测试水果 红·大·椭圆 判定为 橙子；复杂度 训练 O(T·m·n·log n)、预测 O(T·树深)'; });
  yield W(800);
}

engine.queue(() => runRandomForest());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
