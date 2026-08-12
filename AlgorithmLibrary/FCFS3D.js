// AlgorithmLibrary/FCFS3D.js — 先来先服务：就绪队列谁先到谁先跑 —— 公平无抢占，但长作业会堵住短作业（队头阻塞）（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('FCFS3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：FCFS —— 4 个进程按到达顺序排队', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 262, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: -60, z: 0, color: PALETTE.textGlow, scale: 0.56 });
const outT = new VText(scene, { text: '', x: 0, y: -235, z: 0, color: PALETTE.textGlow, scale: 0.62 });

// 进程：到达时间 / 运行时间
const PROCS = [
  { name: 'P1', arrive: 0, burst: 8 },
  { name: 'P2', arrive: 1, burst: 4 },
  { name: 'P3', arrive: 2, burst: 9 },
  { name: 'P4', arrive: 3, burst: 5 }
];
const UNIT = 28;
const TOTAL = PROCS.reduce((s, p) => s + p.burst, 0);
const startX = -TOTAL * UNIT / 2;
let acc = 0;
const blocks = PROCS.map(p => {
  const b = new VBox(scene, { w: p.burst * UNIT - 6, h: 52, d: 40, x: startX + acc * UNIT + (p.burst * UNIT - 6) / 2, y: 40, z: 0, label: p.name + ' (到达 ' + p.arrive + ', ' + p.burst + ')', color: BLUE, emissive: BLUE });
  acc += p.burst;
  return { p, b, tStart: acc - p.burst };
});
const timeT = new VText(scene, { text: '', x: 0, y: 100, z: 0, color: PALETTE.textGlow, scale: 0.5 });
const doneT = new VText(scene, { text: '', x: 0, y: -10, z: 0, color: GOLD, scale: 0.6 });

function* fcfsGen() {
  yield S(() => { hint.setText('FCFS（先来先服务）：就绪队列 FIFO —— 先到的进程先执行完，执行期间不被打断'); stageT.setText('4 个进程按到达顺序：P1(0) → P2(1) → P3(2) → P4(3) —— 到达时间 = 入队时间'); });
  yield W(700);
  for (let i = 0; i < PROCS.length; i++) {
    const { p, b, tStart } = blocks[i];
    b.setColor(GOLD, GOLD);
    const fin = tStart + p.burst;
    yield S(() => { stageT.setText(p.name + ' 从 t=' + tStart + ' 运行到 t=' + fin + ' —— 它最早到，直接上 CPU'); eqT.setText('运行中：' + p.name + '（剩余 ' + p.burst + ' 个时间片）'); timeT.setText('时间轴：0 → ' + fin + '，已执行 ' + (i + 1) + '/' + PROCS.length + ' 个进程'); });
    yield W(900);
    b.setColor(GREEN, GREEN);
    doneT.setText(p.name + ' 完成于 t = ' + fin + '（完成时间）', { color: GREEN });
    yield W(550);
  }
  const finish = blocks.map(b => b.tStart + b.p.burst);
  const wait = PROCS.map((p, i) => finish[i] - p.arrive - p.burst);
  const avg = wait.reduce((s, w) => s + w, 0) / PROCS.length;
  yield S(() => { outT.setText('完成时间：P1=8 P2=12 P3=21 P4=26；等待时间：' + wait.join(' ') + ' → 平均 ' + avg.toFixed(2)); status.textContent = 'FCFS 平均等待 ' + avg.toFixed(2); hint.setText('弱点：P2、P3、P4 明明都到了，只能干等 P1 跑完 8 个时间片 —— 队头阻塞'); });
  yield W(1100);
  yield S(() => { hint.setText('复杂度 O(n)（就绪队列进出队）。应用：打印机队列、请求缓冲 —— 简单公平但平均等待差'); outT.setText('对比：SJF 在此例平均等待 7.75，FCFS 8.75 —— 短作业吃亏'); });
  yield W(1100);
  yield S(() => { hint.setText('FCFS 演示完成：P1→P2→P3→P4 顺序执行，完成时间 8/12/21/26'); outT.setText(''); doneT.setText(''); });
  yield W(400);
}

function* runFCFS() {
  hint.setText('FCFS：先到先跑');
  yield W(400);
  yield* fcfsGen();
}

engine.queue(() => runFCFS());
panel.addButton('清空', () => { engine.clear(); stageT.setText(''); eqT.setText(''); outT.setText(''); timeT.setText(''); doneT.setText(''); blocks.forEach(({ b }) => b.setColor(BLUE, BLUE)); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；蓝 = 等待，金 = 运行中，绿 = 已完成；块宽 ∝ 运行时间，时间轴自左向右推进）');

scene.start(engine);
