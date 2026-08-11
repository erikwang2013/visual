// AlgorithmLibrary/TaskSched3D.js — 任务调度（贪心+并查集）：按利润降序，每个任务放入最晚的空闲截止槽
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('TaskSched3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, ROSE = 0xfb7185, CYAN = 0x67e8f9, WHITE = 0xe2e8f0;
const hint = new VText(scene, { text: '点击「运行任务调度」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

function taskSched() {
  const tasks = [
    { id: 'A', d: 1, p: 25 },
    { id: 'B', d: 3, p: 40 },
    { id: 'C', d: 3, p: 35 },
    { id: 'D', d: 2, p: 20 }
  ];
  const n = 3;
  const parent = [0, 1, 2, 3, 4];
  const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const sorted = [...tasks].sort((a, b) => b.p - a.p);
  const steps = [];
  const slots = new Array(n + 1).fill(null);
  let total = 0;
  for (const t of sorted) {
    const s = find(Math.min(t.d, n));
    if (s > 0) {
      slots[s] = t.id;
      parent[s] = find(s - 1);
      total += t.p;
      steps.push({ t, slot: s, ok: true, total, slots: [...slots] });
    } else {
      steps.push({ t, slot: 0, ok: false, total, slots: [...slots] });
    }
  }
  steps.push({ type: 'final', total, slots });
  return steps;
}
const tsSteps = taskSched();

const taskX = -330;
const tasksV = ['A', 'B', 'C', 'D'].map((id, i) => {
  const y = 120 - i * 75;
  return {
    box: new VBox(scene, { w: 120, h: 46, d: 46, x: taskX, y, z: 0, label: id, color: DIM, emissive: DIM }),
    info: new VText(scene, { text: `利润 ${[25, 40, 35, 20][i]} · 截止 ${[1, 3, 3, 2][i]}`, x: taskX, y: y + 40, z: 0, color: PALETTE.textDim, scale: 0.5 })
  };
});
const slotBox = [1, 2, 3].map(i =>
  new VBox(scene, { w: 80, h: 46, d: 46, x: 80 + (i - 1) * 110, y: 30, z: 0, label: '槽' + i, color: DIM, emissive: DIM }));
const slotT = [1, 2, 3].map(i =>
  new VText(scene, { text: '截止 ' + i, x: 80 + (i - 1) * 110, y: 70, z: 0, color: PALETTE.textDim, scale: 0.5 }));
new VText(scene, { text: '时间 →', x: 440, y: 30, z: 0, color: PALETTE.textGlow, scale: 0.55 });
new VText(scene, { text: '4 个任务各占 1 个时间单位，必须在截止时间前完成 —— 怎么排收益最大？', x: 0, y: 248, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: '贪心：按利润从高到低，每个任务放到「最晚的空闲截止槽」—— 用并查集快速找空槽', x: 0, y: -150, z: 0, color: PALETTE.textDim, scale: 0.62 });
const totalT = new VText(scene, { text: '', x: 180, y: -60, z: 0, color: GOLD, scale: 0.8 });
const stageT = new VText(scene, { text: '', x: 0, y: 265, z: 0, color: GOLD, scale: 0.72 });
const outT = new VText(scene, { text: '', x: 0, y: -200, z: 0, color: PALETTE.textGlow, scale: 0.62 });

function resetAll() {
  engine.clear();
  tasksV.forEach(t => { t.box.setColor(DIM, DIM); t.box.setText(t.box.text); });
  slotBox.forEach(s => { s.setColor(DIM, DIM); s.setText(s.text); });
  totalT.setText(''); stageT.setText(''); outT.setText('');
}

function runTaskSched() {
  resetAll();
  hint.setText('排序是贪心的灵魂：先处理利润最高的任务，剩下的槽位留给低利润任务「捡漏」');
  C(700, () => {
    stageT.setText('按利润降序：B(40) → C(35) → A(25) → D(20)；每个任务尝试放入 ≤ 截止的最晚空槽');
    hint.setText('为什么放最晚的槽？把早的槽留给截止更早的任务 —— 预留弹性，避免「有任务无处可放」');
  });
  for (const s of tsSteps) {
    if (s.type === 'final') break;
    const t = tasksV.find(v => v.box.text === s.t.id);
    C(600, () => {
      t.box.setColor(CYAN, CYAN);
      if (s.ok) {
        slotBox[s.slot - 1].setColor(ROSE, ROSE);
        stageT.setText(`任务 ${s.t.id}（利润 ${s.t.p}，截止 ${s.t.d}）→ 最晚空槽 = 槽${s.slot}`);
        hint.setText(`并查集 find(${Math.min(s.t.d, 3)}) 返回空槽 ${s.slot} —— 已占用槽指向它的前一个，跳过已满区间`);
      } else {
        stageT.setText(`任务 ${s.t.id}（利润 ${s.t.p}，截止 ${s.t.d}）→ 槽${Math.min(s.t.d, 3)} 及更早全部占满 → 放弃`);
        hint.setText(`并查集 find 返回 0 = 无空槽 —— 即使利润不低，截止约束也让 D 挤不进来`);
      }
    });
    C(600, () => {
      if (s.ok) {
        slotBox[s.slot - 1].setColor(GOLD, GOLD);
        slotBox[s.slot - 1].setText(s.t.id + '(' + s.t.p + ')');
        t.box.setColor(GREEN, GREEN);
        t.box.setText('✓ 已排');
        totalT.setText('已排收益 = ' + s.total);
        stageT.setText(`槽${s.slot} ← ${s.t.id}！累计收益 ${s.total}（排好的槽位从右到左依次被填）`);
      } else {
        t.box.setColor(ROSE, ROSE);
        t.box.setText('✗ 放弃');
        stageT.setText(`D 放弃 —— 若把 C 换成 D：B(40)+D(20)+A(25) = 85，白白损失 15`);
      }
    });
  }
  const fin = tsSteps[tsSteps.length - 1];
  C(1000, () => {
    totalT.setText('总收益 = ' + fin.total + '：槽1 = A(25)，槽2 = C(35)，槽3 = B(40)');
    stageT.setText('贪心结果：B→槽3，C→槽2，A→槽1，D 无槽 → 收益 100 = 最优');
    hint.setText('验证最优性：任何 3 个任务的组合 —— B+C+A = 100 最大；B+C+D = 95，B+A+D = 85，都更少');
  });
  C(1100, () => {
    outT.setText('最优收益 = ' + fin.total + ' —— 若先排低利润 D(20)，C(35) 就无处安放 → 85；利润降序排序保证了最优');
    status.textContent = '任务调度最大收益 = ' + fin.total + '（B+C+A）';
    hint.setText('关键：每步只做「当前利润最大 + 最晚空槽」，但全局最优 —— 这是拟阵（matroid）结构的贪心性质');
  });
  C(1300, () => {
    outT.setText('复杂度 O(n log n) 排序 + O(n α(n)) 并查集找槽；应用：单机任务排程、离线任务清理、租约分配');
    hint.setText('变体：任务带执行时长 → 变成 01 背包/区间调度；带权重 → 贪心失效，上 DP');
  });
}

panel.addButton('运行任务调度', runTaskSched);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；左侧 = 任务卡（利润·截止），右侧 = 时间槽 1..3，金色 = 已排）');

scene.start(engine);
