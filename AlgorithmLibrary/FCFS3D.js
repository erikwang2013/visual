// AlgorithmLibrary/FCFS3D.js — 先来先服务：就绪队列谁先到谁先跑 —— 公平无抢占，但长作业会堵住短作业（队头阻塞）（function* 生成器驱动，解说入状态栏）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
applyTheme('FCFS3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80;
const status = panel.addStatus('就绪');

// 进程：到达时间 / 运行时间（块宽 ∝ 运行时间，时间轴自左向右推进）
const PROCS = [
  { name: 'P1', arrive: 0, burst: 8 },
  { name: 'P2', arrive: 1, burst: 4 },
  { name: 'P3', arrive: 2, burst: 9 },
  { name: 'P4', arrive: 3, burst: 5 }
];
const UNIT = 24;
const TOTAL = PROCS.reduce((s, p) => s + p.burst, 0);
const startX = 320 - TOTAL * UNIT / 2;
let acc = 0;
const blocks = PROCS.map(p => {
  const b = new VBox(scene, { w: p.burst * UNIT - 6, h: 52, d: 40, x: startX + acc * UNIT + (p.burst * UNIT - 6) / 2, y: 400, z: 0, label: p.name + ' (到达 ' + p.arrive + ', ' + p.burst + ')', color: BLUE, emissive: BLUE });
  acc += p.burst;
  return { p, b, tStart: acc - p.burst };
});

function* fcfsGen() {
  blocks.forEach(({ b }) => b.setColor(BLUE, BLUE));
  yield S(() => { status.textContent = 'FCFS（先来先服务）：就绪队列 FIFO —— 先到的进程先执行完，执行期间不被打断；4 个进程按到达顺序排队'; });
  yield W(700);
  for (let i = 0; i < PROCS.length; i++) {
    const { p, b, tStart } = blocks[i];
    const fin = tStart + p.burst;
    b.setColor(GOLD, GOLD);
    yield S(() => { status.textContent = p.name + ' 从 t=' + tStart + ' 运行到 t=' + fin + ' —— 它最早到，直接上 CPU（剩余 ' + p.burst + ' 个时间片）'; });
    yield W(900);
    b.setColor(GREEN, GREEN);
    yield S(() => { status.textContent = p.name + ' 完成于 t = ' + fin; });
    yield W(550);
  }
  const finish = blocks.map(b => b.tStart + b.p.burst);
  const wait = PROCS.map((p, i) => finish[i] - p.arrive - p.burst);
  const avg = wait.reduce((s, w) => s + w, 0) / PROCS.length;
  yield S(() => { status.textContent = '完成时间：P1=8 P2=12 P3=21 P4=26；等待时间：' + wait.join(' ') + ' → 平均 ' + avg.toFixed(2) + ' —— 弱点：P2/P3/P4 已到却干等 P1 跑完 8 片（队头阻塞）'; });
  yield W(1100);
  yield S(() => { status.textContent = '复杂度 O(n)（就绪队列进出队）。应用：打印机队列、请求缓冲 —— 简单公平但平均等待差'; });
  yield W(1100);
  yield S(() => { status.textContent = 'FCFS 演示完成：P1→P2→P3→P4 顺序执行，完成时间 8/12/21/26，平均等待 8.75'; });
  yield W(400);
}

engine.queue(() => fcfsGen());
panel.addButton('清空', () => { engine.clear(); blocks.forEach(({ b }) => b.setColor(BLUE, BLUE)); status.textContent = ''; });

scene.start(engine);
