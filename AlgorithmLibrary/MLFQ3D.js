// AlgorithmLibrary/MLFQ3D.js — 多级反馈队列：新进程进最高优先层，用完时间片就降级 —— 交互型进程留在顶层秒回，CPU 密集进程沉到底层跑长片（function* 生成器驱动，解说入状态栏）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VBox } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
applyTheme('MLFQ3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80;
const status = panel.addStatus('就绪');

// 三层队列：Q0 时间片 1 / Q1 时间片 2 / Q2 FCFS（长片）；Q0/Q1/Q2 徽章为结构标注
const LAYERS = [
  { name: 'Q0', y: 430, q: 1 },
  { name: 'Q1', y: 355, q: 2 },
  { name: 'Q2', y: 280, q: 99 }
];
const slotX = [10, 110, 210, 310];
const PROCS = [
  { name: 'P1', arrive: 0, burst: 8 },
  { name: 'P2', arrive: 1, burst: 4 },
  { name: 'P3', arrive: 2, burst: 9 },
  { name: 'P4', arrive: 3, burst: 5 }
];
// 步骤：t 时刻 p 在 q 层跑 run 个时间片；fin 表示完成时刻
const STEPS = [
  { t: 0, p: 'P1', q: 0, run: 1 }, { t: 1, p: 'P2', q: 0, run: 1 },
  { t: 2, p: 'P3', q: 0, run: 1 }, { t: 3, p: 'P4', q: 0, run: 1 },
  { t: 4, p: 'P1', q: 1, run: 2 }, { t: 6, p: 'P2', q: 1, run: 2 },
  { t: 8, p: 'P3', q: 1, run: 2 }, { t: 10, p: 'P4', q: 1, run: 2 },
  { t: 12, p: 'P1', q: 2, run: 5, fin: 17 }, { t: 17, p: 'P2', q: 2, run: 1, fin: 18 },
  { t: 18, p: 'P3', q: 2, run: 6, fin: 24 }, { t: 24, p: 'P4', q: 2, run: 2, fin: 26 }
];
const blockOf = {};
const left = {};
PROCS.forEach(p => {
  left[p.name] = p.burst;
  blockOf[p.name] = new VBox(scene, { w: 84, h: 38, d: 38, x: 670, y: 355, z: 0, label: p.name + ' ' + p.burst, color: BLUE, emissive: BLUE });
});
LAYERS.forEach((L, i) => {
  new VText(scene, { text: L.name, x: -40, y: L.y + 30, z: 0, color: i === 0 ? GOLD : 0x94a3b8, scale: 0.5 });
});

function* mlfqGen() {
  yield S(() => { status.textContent = 'MLFQ：新进程一律进 Q0 跑 1 个时间片 —— 用完没跑完就降级；Q0 非空时下层一律靠后。规则：①新进程进最高层；②用满时间片 → 降级；③上层非空先跑上层'; });
  yield W(800);
  for (let i = 0; i < STEPS.length; i++) {
    const st = STEPS[i];
    const b = blockOf[st.p];
    const L = LAYERS[st.q];
    b.moveTo(slotX[0] + 40, L.y, 0, 450);
    yield W(450);
    b.setColor(GOLD, GOLD);
    yield S(() => { status.textContent = 't=' + st.t + '：' + st.p + ' 在 ' + L.name + ' 跑 ' + st.run + ' 个时间片' + (st.q === 0 ? '（新进程秒回）' : st.q === 1 ? '（降级后片长加倍）' : '（沉到底层 FCFS）') + '；剩余 ' + left[st.p] + ' → ' + (left[st.p] - st.run); });
    yield W(850);
    left[st.p] -= st.run;
    b.setText(st.p + ' ' + left[st.p]);
    if (st.fin !== undefined) {
      b.setColor(GREEN, GREEN);
      yield S(() => { status.textContent = st.p + ' 完成于 t=' + st.fin + ' —— 在 Q2 沉底跑完，出队'; });
    } else {
      const nq = st.q + 1;
      b.setColor(BLUE, BLUE);
      b.moveTo(slotX[(i % 4)] + 40, LAYERS[nq].y, 0, 450);
      yield S(() => { status.textContent = st.p + ' 没跑完 → 降级到 ' + LAYERS[nq].name + '（片长翻倍，优先权降低）'; });
      yield W(450);
    }
    yield W(600);
  }
  yield S(() => { status.textContent = '完成：P1=17 P2=18 P3=24 P4=26 —— 交互进程 P2 抢先于 CPU 密集的 P1 完成；智能之处：IO 密集型进程主动让出 CPU（不触发降级），自然留在高层'; });
  yield W(1100);
  yield S(() => { status.textContent = '复杂度 O(1) 调度；应用：Linux CFS 思想的前身、Windows 多级队列。问题：老进程沉底可能挨饿 → 周期「老化」回升；参数（层数/片长）要调优'; });
  yield W(1100);
  yield S(() => { status.textContent = 'MLFQ 演示完成：4 进程 P1=17 P2=18 P3=24 P4=26，全部从 Q0 逐级降级沉底后按序完成，Q0 新进程永远最先跑'; });
  yield W(400);
}

function* runMLFQ() {
  yield S(() => { status.textContent = 'MLFQ：分层降级 —— 开始'; });
  yield W(400);
  yield* mlfqGen();
}

engine.queue(() => runMLFQ());
panel.addButton('清空', () => { engine.clear(); PROCS.forEach(p => { blockOf[p.name].setColor(BLUE, BLUE); blockOf[p.name].setText(p.name + ' ' + p.burst); blockOf[p.name].moveTo(670, 355, 0, 300); left[p.name] = p.burst; }); status.textContent = ''; });

scene.start(engine);
