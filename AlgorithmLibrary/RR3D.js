// AlgorithmLibrary/RR3D.js — 时间片轮转：就绪队列按 FIFO 轮流执行，每人最多跑 q 个时间片就换人 —— 响应时间最优，交互系统的标准（function* 生成器驱动）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
applyTheme('RR3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80;
const status = panel.addStatus('就绪');

const Q = 3;
const PROCS = [
  { name: 'P1', arrive: 0, burst: 8 },
  { name: 'P2', arrive: 1, burst: 4 },
  { name: 'P3', arrive: 2, burst: 9 },
  { name: 'P4', arrive: 3, burst: 5 }
];
// 轮转序列（q=3）：P1 0-3 / P2 3-6 / P3 6-9 / P4 9-12 / P1 12-15 / P2 15-16 / P3 16-19 / P4 19-21 / P1 21-23 / P3 23-26
const SCHED = [
  { p: 'P1', s: 0, e: 3 }, { p: 'P2', s: 3, e: 6 }, { p: 'P3', s: 6, e: 9 }, { p: 'P4', s: 9, e: 12 },
  { p: 'P1', s: 12, e: 15 }, { p: 'P2', s: 15, e: 16 }, { p: 'P3', s: 16, e: 19 }, { p: 'P4', s: 19, e: 21 },
  { p: 'P1', s: 21, e: 23 }, { p: 'P3', s: 23, e: 26 }
];
const blockOf = {};
PROCS.forEach((p, i) => {
  blockOf[p.name] = new VBox(scene, { w: 140, h: 56, d: 44, x: 15 + i * 155, y: 460, z: 0, label: p.name + ' 剩余 ' + p.burst, color: BLUE, emissive: BLUE });
});
const FIN = { P1: 23, P2: 16, P3: 26, P4: 21 };
const left = {};
PROCS.forEach(p => { left[p.name] = p.burst; });

function* rrGen() {
  yield S(() => { status.textContent = 'RR（时间片轮转）q=' + Q + '：就绪队列 FIFO，每人最多跑 ' + Q + ' 个时间片就换人 —— 响应时间有界。进程：P1(0,8) P2(1,4) P3(2,9) P4(3,5)'; });
  yield W(700);
  for (let i = 0; i < SCHED.length; i++) {
    const seg = SCHED[i];
    const b = blockOf[seg.p];
    b.setColor(GOLD, GOLD);
    left[seg.p] -= seg.e - seg.s;
    const isLast = seg.e - seg.s < Q;
    yield S(() => { status.textContent = seg.p + ' 运行 ' + (seg.e - seg.s) + ' 个时间片：t=' + seg.s + ' → ' + seg.e + (isLast ? '（最后一片，跑完剩余）' : '（用完时间片，让出 CPU）'); });
    yield W(800);
    b.setText(seg.p + ' 剩余 ' + left[seg.p]);
    if (left[seg.p] === 0) {
      b.setColor(GREEN, GREEN);
      b.setText(seg.p + ' 剩余 0 · 完成于 t=' + seg.e);
      yield S(() => { status.textContent = seg.p + ' 剩余 0 —— 完成于 t=' + seg.e + '，离开轮转队列（甘特：' + SCHED.slice(0, i + 1).map(x => x.p + x.s + '-' + x.e).join(' ') + '）'; });
    } else {
      b.setColor(BLUE, BLUE);
      yield S(() => { status.textContent = seg.p + ' 剩余 ' + left[seg.p] + '，回到队列尾部 —— 下一轮再见（甘特：' + SCHED.slice(0, i + 1).map(x => x.p + x.s + '-' + x.e).join(' ') + '）'; });
    }
    yield W(650);
  }
  const wait = PROCS.map(p => FIN[p.name] - p.arrive - p.burst);
  const avg = wait.reduce((s, w) => s + w, 0) / PROCS.length;
  yield S(() => { status.textContent = '完成时刻：P2=16 P4=21 P1=23 P3=26；等待 ' + wait.join(' ') + ' → 平均 ' + avg.toFixed(2) + ' —— 每个进程至多等一轮 4×3=12 单位就轮到，响应快'; });
  yield W(1100);
  yield S(() => { status.textContent = 'q 调优：q→∞ 退化为 FCFS；q→0 全是上下文切换开销。复杂度 O(n·q)；应用：分时操作系统、终端响应，Linux 默认 q 约 4-10ms'; });
  yield W(1100);
  yield S(() => { status.textContent = 'RR 演示完成：10 段轮转（甘特：P1 0-3 P2 3-6 P3 6-9 P4 9-12 P1 12-15 P2 15-16 P3 16-19 P4 19-21 P1 21-23 P3 23-26），P2 最先完成(16)，P3 最后(26)，平均等待 13.50；复杂度 O(n·q)'; });
  yield W(400);
}

function* runRR() {
  PROCS.forEach(p => { left[p.name] = p.burst; blockOf[p.name].setColor(BLUE, BLUE); blockOf[p.name].setText(p.name + ' 剩余 ' + p.burst); });
  yield W(200);
  yield* rrGen();
}

engine.queue(() => runRR());
panel.addButton('清空', () => { engine.clear(); PROCS.forEach(p => { left[p.name] = p.burst; blockOf[p.name].setColor(BLUE, BLUE); blockOf[p.name].setText(p.name + ' 剩余 ' + p.burst); }); status.textContent = ''; });

scene.start(engine);
