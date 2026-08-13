// AlgorithmLibrary/SJF3D.js — 最短作业优先（非抢占）：每当 CPU 空闲，从就绪队列挑运行时间最短的进程 —— 平均等待最优但需要预知运行时间（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('SJF3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：SJF —— 每步都挑最短的作业', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 562, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: 240, z: 0, color: PALETTE.textGlow, scale: 0.56 });
const outT = new VText(scene, { text: '', x: 0, y: 70, z: 0, color: PALETTE.textGlow, scale: 0.62 });

const PROCS = [
  { name: 'P1', arrive: 0, burst: 8 },
  { name: 'P2', arrive: 1, burst: 4 },
  { name: 'P3', arrive: 2, burst: 9 },
  { name: 'P4', arrive: 3, burst: 5 }
];
// 非抢占 SJF 执行顺序：t=0 只有 P1；t=8 就绪 P2(4)/P3(9)/P4(5) → P2；t=12 就绪 P4(5)/P3(9) → P4；t=17 → P3
const ORDER = ['P1', 'P2', 'P4', 'P3'];
const UNIT = 28;
const TOTAL = PROCS.reduce((s, p) => s + p.burst, 0);
const startX = -TOTAL * UNIT / 2;
let acc = 0;
const blockOf = {};
const blocks = ORDER.map(name => {
  const p = PROCS.find(x => x.name === name);
  const b = new VBox(scene, { w: p.burst * UNIT - 6, h: 52, d: 40, x: startX + acc * UNIT + (p.burst * UNIT - 6) / 2 + 320, y: 340, z: 0, label: p.name + ' (到达 ' + p.arrive + ', ' + p.burst + ')', color: BLUE, emissive: BLUE });
  blockOf[p.name] = b;
  acc += p.burst;
  return { p, b, tStart: acc - p.burst };
});
const timeT = new VText(scene, { text: '', x: 0, y: 400, z: 0, color: PALETTE.textGlow, scale: 0.5 });
const doneT = new VText(scene, { text: '', x: 0, y: 290, z: 0, color: GOLD, scale: 0.6 });

function* sjfGen() {
  yield S(() => { hint.setText('SJF（最短作业优先）：CPU 空闲时选运行时间最短的就绪进程 —— 平均等待理论最优，但需预知 burst'); stageT.setText('进程：P1(0,8) P2(1,4) P3(2,9) P4(3,5) —— 关键：P1 先到先占 CPU'); });
  yield W(700);
  for (let i = 0; i < blocks.length; i++) {
    const { p, b, tStart } = blocks[i];
    const ready = PROCS.filter(x => x.arrive <= tStart).map(x => x.name + '(' + x.burst + ')').join(' ');
    b.setColor(GOLD, GOLD);
    yield S(() => { stageT.setText('t=' + tStart + '：就绪 = {' + ready + '} → 选 ' + p.name + '（最短）'); eqT.setText('执行 ' + p.name + '：' + tStart + ' → ' + (tStart + p.burst)); timeT.setText('时间轴：0 → ' + (tStart + p.burst)); });
    yield W(900);
    b.setColor(GREEN, GREEN);
    doneT.setText(p.name + ' 完成于 t = ' + (tStart + p.burst), { color: GREEN });
    yield W(550);
  }
  const finishMap = { P1: 8, P2: 12, P4: 17, P3: 26 };
  const wait = PROCS.map(p => finishMap[p.name] - p.arrive - p.burst);
  const avg = wait.reduce((s, w) => s + w, 0) / PROCS.length;
  yield S(() => { outT.setText('顺序 P1→P2→P4→P3，完成 8/12/17/26；等待 ' + wait.join(' ') + ' → 平均 ' + avg.toFixed(2) + '（FCFS 8.75）'); status.textContent = 'SJF 平均等待 ' + avg.toFixed(2); hint.setText('短作业 P2、P4 被提前 —— 平均等待从 8.75 降到 7.75'); });
  yield W(1100);
  yield S(() => { hint.setText('复杂度 O(n log n)（每次选最短可用堆/排序）。应用：批处理系统、离线调度 —— 现实中 burst 只能估计（预测法）'); outT.setText('代价：长作业被无限推迟 → 「饥饿」。贪心策略的最优性只在非抢占 + 全部到达已知时成立'); });
  yield W(1100);
  yield S(() => { hint.setText('SJF 演示完成：短作业优先执行，平均等待 7.75 < FCFS 8.75'); outT.setText(''); doneT.setText(''); });
  yield W(400);
}

function* runSJF() {
  hint.setText('SJF：挑最短的跑');
  yield W(400);
  yield* sjfGen();
}

engine.queue(() => runSJF());
panel.addButton('清空', () => { engine.clear(); stageT.setText(''); eqT.setText(''); outT.setText(''); timeT.setText(''); doneT.setText(''); blocks.forEach(({ b }) => b.setColor(BLUE, BLUE)); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；蓝 = 就绪等待，金 = 当前选中执行，绿 = 已完成；每步「就绪集合 → 最短 → 执行」）');

scene.start(engine);
