// AlgorithmLibrary/SJF3D.js — 最短作业优先（非抢占）：每当 CPU 空闲，从就绪队列挑运行时间最短的进程 —— 平均等待最优但需要预知运行时间（解说入状态栏）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
applyTheme('SJF3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80;
const status = panel.addStatus('就绪');

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
const blocks = ORDER.map(name => {
  const p = PROCS.find(x => x.name === name);
  const b = new VBox(scene, { w: p.burst * UNIT - 6, h: 52, d: 40, x: startX + acc * UNIT + (p.burst * UNIT - 6) / 2 + 320, y: 340, z: 0, label: p.name + ' (到达 ' + p.arrive + ', ' + p.burst + ')', color: BLUE, emissive: BLUE });
  acc += p.burst;
  return { p, b, tStart: acc - p.burst };
});

function* sjfGen() {
  yield S(() => { status.textContent = 'SJF（最短作业优先）：CPU 空闲时选运行时间最短的就绪进程 —— 平均等待理论最优，但需预知 burst'; });
  yield W(700);
  for (let i = 0; i < blocks.length; i++) {
    const { p, b, tStart } = blocks[i];
    const ready = PROCS.filter(x => x.arrive <= tStart).map(x => x.name + '(' + x.burst + ')').join(' ');
    b.setColor(GOLD, GOLD);
    yield S(() => { status.textContent = 't=' + tStart + '：就绪 = {' + ready + '} → 选 ' + p.name + '（最短，金色）'; });
    yield W(900);
    b.setColor(GREEN, GREEN);
    yield S(() => { status.textContent = p.name + ' 完成于 t = ' + (tStart + p.burst) + '（绿色）'; });
    yield W(550);
  }
  const finishMap = { P1: 8, P2: 12, P4: 17, P3: 26 };
  const wait = PROCS.map(p => finishMap[p.name] - p.arrive - p.burst);
  const avg = wait.reduce((s, w) => s + w, 0) / PROCS.length;
  yield S(() => { status.textContent = '执行顺序 P1→P2→P4→P3，完成 8/12/17/26；等待 ' + wait.join(' ') + '，平均 ' + avg.toFixed(2) + '（FCFS 8.75）'; });
  yield W(1100);
  yield S(() => { status.textContent = '代价：长作业被无限推迟 → 饥饿；复杂度 O(n log n)，现实中 burst 只能预测'; });
  yield W(1100);
  yield S(() => { status.textContent = 'SJF 演示完成：顺序 P1→P2→P4→P3，完成时刻 8/12/17/26，平均等待 ' + avg.toFixed(2) + '（FCFS 8.75，短作业优先更优）'; });
  yield W(400);
}

function* runSJF() {
  yield S(() => { status.textContent = 'SJF：每步都挑最短的作业执行'; });
  yield W(400);
  yield* sjfGen();
}

engine.queue(() => runSJF());
panel.addButton('清空', () => { engine.clear(); blocks.forEach(({ b }) => b.setColor(BLUE, BLUE)); status.textContent = ''; });

scene.start(engine);
