// AlgorithmLibrary/TaskSched3D.js — 任务调度（贪心+并查集）：按利润降序，每个任务放入 ≤ 截止的最晚空槽 —— B(40)→槽3、C(35)→槽2、A(25)→槽1、D 放弃，总收益 100（function* 生成器驱动，步骤数组运行时预计算）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('TaskSched3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, ROSE = 0xfb7185, CYAN = 0x67e8f9, WHITE = 0xe2e8f0;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：任务调度 —— 单机排程，截止前做完任务拿利润', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');

const TASKS = [
  { id: 'A', p: 25, d: 1, y: 420 },
  { id: 'B', p: 40, d: 3, y: 345 },
  { id: 'C', p: 35, d: 3, y: 270 },
  { id: 'D', p: 20, d: 2, y: 195 }
];

const tsSteps = (() => {
  const sorted = [...TASKS].sort((x, y) => y.p - x.p);
  const parent = [0, 1, 2, 3, 4];
  const find = x => { if (parent[x] !== x) parent[x] = find(parent[x]); return parent[x]; };
  const steps = [];
  let total = 0;
  for (const t of sorted) {
    const slot = find(Math.min(t.d, 3));
    const ok = slot > 0;
    steps.push({ t, ok, slot, total });
    if (ok) { parent[slot] = find(slot - 1); total += t.p; }
  }
  steps.push({ type: 'final', total });
  return steps;
})();
const FIN = tsSteps[tsSteps.length - 1];

const tasksV = TASKS.map(t => ({
  box: new VBox(scene, { w: 130, h: 56, d: 40, x: -10, y: t.y, z: 0, label: t.id, color: DIM, emissive: DIM }),
  info: new VText(scene, { text: '利润 ' + t.p + ' · 截止 ' + t.d, x: -10, y: t.y - 42, z: 0, color: PALETTE.textDim, scale: 0.5 })
}));
const slotBox = [1, 2, 3].map(i =>
  new VBox(scene, { w: 90, h: 60, d: 60, x: 400 + (i - 1) * 110, y: 330, z: 0, label: '槽' + i, color: DIM, emissive: DIM }));
new VText(scene, { text: '时间槽 1…3（每个槽最多一个任务，必须在截止前完成）', x: 400, y: 388, z: 0, color: PALETTE.textDim, scale: 0.6 });
new VText(scene, { text: '4 个任务各带利润 p 和截止 d —— 总利润最大', x: 0, y: 528, z: 0, color: PALETTE.textDim, scale: 0.62 });
new VText(scene, { text: '贪心策略：按利润降序处理，每个任务放入「不超过截止的最晚空槽」—— 并查集快速找槽', x: 0, y: 95, z: 0, color: PALETTE.textDim, scale: 0.62 });
const stageT = new VText(scene, { text: '', x: 0, y: 562, z: 0, color: GOLD, scale: 0.68 });
const totalT = new VText(scene, { text: '', x: 0, y: 170, z: 0, color: GREEN, scale: 0.8 });
const outT = new VText(scene, { text: '', x: 0, y: 70, z: 0, color: PALETTE.textGlow, scale: 0.62 });

function* tsGen() {
  yield S(() => { hint.setText('排序是贪心的灵魂：先处理利润最高的任务，剩下的槽位留给低利润任务「捡漏」'); });
  yield W(700);
  yield S(() => {
    stageT.setText('按利润降序：B(40) → C(35) → A(25) → D(20)；每个任务尝试放入 ≤ 截止的最晚空槽');
    hint.setText('为什么放最晚的槽？把早的槽留给截止更早的任务 —— 预留弹性，避免「有任务无处可放」');
  });
  yield W(700);
  for (const s of tsSteps) {
    if (s.type === 'final') break;
    const t = tasksV.find(v => v.box.text === s.t.id);
    yield S(() => {
      t.box.setColor(CYAN, CYAN);
      if (s.ok) {
        slotBox[s.slot - 1].setColor(ROSE, ROSE);
        stageT.setText('任务 ' + s.t.id + '（利润 ' + s.t.p + '，截止 ' + s.t.d + '）→ 最晚空槽 = 槽' + s.slot);
        hint.setText('并查集 find(' + Math.min(s.t.d, 3) + ') 返回空槽 ' + s.slot + ' —— 已占用槽指向它的前一个，跳过已满区间');
      } else {
        stageT.setText('任务 ' + s.t.id + '（利润 ' + s.t.p + '，截止 ' + s.t.d + '）→ 槽' + Math.min(s.t.d, 3) + ' 及更早全部占满 → 放弃');
        hint.setText('并查集 find 返回 0 = 无空槽 —— 即使利润不低，截止约束也让 D 挤不进来');
      }
    });
    yield W(600);
    yield S(() => {
      if (s.ok) {
        slotBox[s.slot - 1].setColor(GOLD, GOLD);
        slotBox[s.slot - 1].setText(s.t.id + '(' + s.t.p + ')');
        t.box.setColor(GREEN, GREEN);
        t.box.setText('✓ 已排');
        totalT.setText('已排收益 = ' + s.total);
        stageT.setText('槽' + s.slot + ' ← ' + s.t.id + '！累计收益 ' + s.total + '（排好的槽位从右到左依次被填）');
      } else {
        t.box.setColor(ROSE, ROSE);
        t.box.setText('✗ 放弃');
        stageT.setText('D 放弃 —— 若把 C 换成 D：B(40)+D(20)+A(25) = 85，白白损失 15');
      }
    });
    yield W(600);
  }
  yield S(() => {
    totalT.setText('总收益 = ' + FIN.total + '：槽1 = A(25)，槽2 = C(35)，槽3 = B(40)');
    stageT.setText('贪心结果：B→槽3，C→槽2，A→槽1，D 无槽 → 收益 100 = 最优');
    hint.setText('验证最优性：任何 3 个任务的组合 —— B+C+A = 100 最大；B+C+D = 95，B+A+D = 85，都更少');
  });
  yield W(1000);
  yield S(() => {
    outT.setText('最优收益 = ' + FIN.total + ' —— 若先排低利润 D(20)，C(35) 就无处安放 → 85；利润降序排序保证了最优');
    status.textContent = '任务调度最大收益 = ' + FIN.total + '（B+C+A）';
    hint.setText('关键：每步只做「当前利润最大 + 最晚空槽」，但全局最优 —— 这是拟阵（matroid）结构的贪心性质');
  });
  yield W(1100);
  yield S(() => {
    outT.setText('复杂度 O(n log n) 排序 + O(n α(n)) 并查集找槽；应用：单机任务排程、离线任务清理、租约分配');
    hint.setText('变体：任务带执行时长 → 变成 01 背包/区间调度；带权重 → 贪心失效，上 DP');
  });
  yield W(1000);
}

engine.queue(() => tsGen());
panel.addButton('清空', () => {
  engine.clear();
  tasksV.forEach(t => { t.box.setColor(DIM, DIM); t.box.setText(t.box.text); });
  slotBox.forEach(b => { b.setColor(DIM, DIM); b.setText(b.text); });
  totalT.setText(''); stageT.setText(''); outT.setText('');
  hint.setText('已清空，可重新运行'); status.textContent = '';
});
panel.addLabel('（拖拽旋转视角，滚轮缩放；左侧 = 任务卡（利润·截止），右侧 = 时间槽 1..3，金色 = 已排）');

scene.start(engine);
