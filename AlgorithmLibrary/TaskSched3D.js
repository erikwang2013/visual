// AlgorithmLibrary/TaskSched3D.js — 任务调度（贪心+并查集）：按利润降序，每个任务放入 ≤ 截止的最晚空槽 —— B(40)→槽3、C(35)→槽2、A(25)→槽1、D 放弃，总收益 100（function* 生成器驱动，步骤数组运行时预计算）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('TaskSched3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, ROSE = 0xfb7185, CYAN = 0x67e8f9;
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
  box: new VBox(scene, { w: 130, h: 56, d: 40, x: -10, y: t.y, z: 0, label: t.id, color: DIM, emissive: DIM })
}));
const slotBox = [1, 2, 3].map(i =>
  new VBox(scene, { w: 90, h: 60, d: 60, x: 400 + (i - 1) * 110, y: 330, z: 0, label: '槽' + i, color: DIM, emissive: DIM }));

function* tsGen() {
  yield S(() => { status.textContent = '任务调度：单机排程，截止前做完任务拿利润 — 按利润降序贪心 + 并查集快速找最晚空槽'; });
  yield W(700);
  yield S(() => { status.textContent = '排序是贪心的灵魂：先处理利润最高的任务，剩下的槽位留给低利润任务「捡漏」'; });
  yield W(700);
  yield S(() => { status.textContent = '按利润降序：B(40) → C(35) → A(25) → D(20)；每个任务放入不超过截止的最晚空槽，把早的槽留给截止更早的任务'; });
  yield W(700);
  for (const s of tsSteps) {
    if (s.type === 'final') break;
    const t = tasksV.find(v => v.box.text === s.t.id);
    yield S(() => {
      t.box.setColor(CYAN, CYAN);
      if (s.ok) {
        slotBox[s.slot - 1].setColor(ROSE, ROSE);
        status.textContent = '任务 ' + s.t.id + '（利润 ' + s.t.p + '，截止 ' + s.t.d + '）→ 最晚空槽 = 槽' + s.slot + '（并查集 find(' + Math.min(s.t.d, 3) + ') 跳过已占满区间）';
      } else {
        status.textContent = '任务 ' + s.t.id + '（利润 ' + s.t.p + '，截止 ' + s.t.d + '）→ 槽' + Math.min(s.t.d, 3) + ' 及更早全部占满 → 放弃';
      }
    });
    yield W(600);
    yield S(() => {
      if (s.ok) {
        slotBox[s.slot - 1].setColor(GOLD, GOLD);
        slotBox[s.slot - 1].setText(s.t.id + '(' + s.t.p + ')');
        t.box.setColor(GREEN, GREEN);
        t.box.setText('✓ 已排');
        status.textContent = '槽' + s.slot + ' ← ' + s.t.id + '！累计收益 ' + s.total + '（排好的槽位从右到左依次被填）';
      } else {
        t.box.setColor(ROSE, ROSE);
        t.box.setText('✗ 放弃');
        status.textContent = 'D 放弃 —— 若把 C 换成 D：B(40)+D(20)+A(25) = 85，白白损失 15';
      }
    });
    yield W(600);
  }
  yield S(() => {
    status.textContent = '总收益 = ' + FIN.total + '：槽1 = A(25)，槽2 = C(35)，槽3 = B(40) — 贪心结果即最优（B+C+A=100 最大，B+C+D=95、B+A+D=85 都更少）';
  });
  yield W(1000);
  yield S(() => {
    status.textContent = '任务调度演示完成：最大收益 = ' + FIN.total + '（B→槽3、C→槽2、A→槽1、D 放弃）；复杂度 O(n log n) 排序 + O(n α(n)) 并查集；应用：单机排程、离线任务清理、租约分配';
  });
  yield W(1100);
}

engine.queue(() => tsGen());
panel.addButton('清空', () => {
  engine.clear();
  tasksV.forEach((t, i) => { t.box.setColor(DIM, DIM); t.box.setText(TASKS[i].id); });
  slotBox.forEach((b, i) => { b.setColor(DIM, DIM); b.setText('槽' + (i + 1)); });
  status.textContent = '';
});

scene.start(engine);
