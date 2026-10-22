// AlgorithmLibrary/RR3D.js — 时间片轮转：就绪队列 FIFO，每个作业最多跑 q 片就回队尾。
// CPU 甘特图逐段生长，实时读就绪队列、剩余时间和上下文切换次数；镜头跟随轮转节拍。
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { applyTheme } from '../3D/Glow.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
import { CpuStage } from '../3D/director/OSStage.js';
applyTheme('RR3D');

const GOLD = 0xfcd34d, GREEN = 0x4ade80, BLUE = 0x3b82f6;
const PRESETS = {
  '经典 4 作业': [
    { name: 'P1', arrive: 0, burst: 8 }, { name: 'P2', arrive: 1, burst: 4 },
    { name: 'P3', arrive: 2, burst: 9 }, { name: 'P4', arrive: 3, burst: 5 },
  ],
  '混合 5 作业': [
    { name: 'P1', arrive: 0, burst: 9 }, { name: 'P2', arrive: 0, burst: 5 },
    { name: 'P3', arrive: 1, burst: 4 }, { name: 'P4', arrive: 2, burst: 6 },
    { name: 'P5', arrive: 3, burst: 7 },
  ],
};
const NARROW = typeof matchMedia !== 'undefined' && matchMedia('(max-width: 900px)').matches;
const zs = (s) => NARROW ? { ...s, pos: s.target.map((v, i) => v + (s.pos[i] - v) * 0.42) } : s;
const SHOT_WIDE = zs({ pos: [320, 650, 1050], target: [320, 460, 0], ms: 900 });
const SHOT_CPU = zs({ pos: [560, 780, 620], target: [470, 610, 0], ms: 800 });
const SHOT_QUEUE = zs({ pos: [320, 560, 620], target: [320, 315, 0], ms: 820 });
const SHOT_GANTT = zs({ pos: [320, 610, 720], target: [320, 435, 0], ms: 850 });

const clone = (jobs) => jobs.map((p) => ({ ...p }));
const scene = new Scene3D('scene', { cameraPos: [320, 660, 1000], lookAt: [320, 460, 0], fov: 50 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const input = new InputKit(panel);
const status = panel.addStatus('就绪');
const stage = new CpuStage(scene, { x: 470, y: 620, queueY: 295, ganttY: 455 });

let presetName = '经典 4 作业';
let current = clone(PRESETS[presetName]);
let quantum = 3;
let runJobs = [];
let queue = [];
let left = [];
let finish = [];
let segs = [];

const director = new StoryDirector(scene, {
  title: 'RR · 时间片轮转',
  total: 8,
  legend: [
    { label: '就绪队列', color: '#60a5fa' },
    { label: '时间片执行', color: '#fcd34d' },
    { label: '已切换', color: '#22d3ee' },
    { label: '已完成', color: '#4ade80' },
  ],
  onReplay: () => restart(current, quantum, true),
});
const beat = (cfg) => director.beat(NARROW ? { ...cfg, annotations: cfg.annotations?.slice(0, 2) } : cfg);

function rrSchedule(jobs, q) {
  const ps = jobs.slice().sort((a, b) => a.arrive - b.arrive);
  const n = ps.length;
  const rem = ps.map((p) => p.burst);
  const fin = Array(n).fill(null);
  let t = 0, i = 0, qi = [], events = [];
  while (fin.some((v) => v === null)) {
    while (i < n && ps[i].arrive <= t) qi.push(i++);
    if (!qi.length) { if (i < n) t = Math.max(t, ps[i].arrive); continue; }
    const idx = qi.shift();
    const run = Math.min(q, rem[idx]);
    const start = t;
    const queueBefore = qi.map((j) => ps[j].name);
    t += run;
    rem[idx] -= run;
    while (i < n && ps[i].arrive <= t) qi.push(i++);
    const done = rem[idx] === 0;
    if (!done) qi.push(idx); else fin[idx] = t;
    events.push({
      name: ps[idx].name, start, end: t, run, leftBefore: rem[idx] + run, done,
      queueBefore, queueAfter: qi.map((j) => ps[j].name),
      left: rem.slice(), finish: fin.slice(),
    });
  }
  const total = Math.max(...fin);
  let switches = 0;
  for (let k = 1; k < events.length; k++) if (events[k].name !== events[k - 1].name) switches++;
  return { jobs: ps, events, total, switches, finish: fin, rem };
}
function fcfsAvg(jobs) {
  let t = 0, sum = 0;
  jobs.slice().sort((a, b) => a.arrive - b.arrive).forEach((p) => {
    t = Math.max(t, p.arrive);
    sum += t - p.arrive;
    t += p.burst;
  });
  return sum / Math.max(jobs.length, 1);
}
function switchCount() {
  let n = 0;
  for (let i = 1; i < segs.length; i++) if (segs[i].name !== segs[i - 1].name) n++;
  return n;
}
function avgWait() {
  const done = runJobs.map((p, i) => finish[i] === null ? null : finish[i] - p.arrive - p.burst).filter((v) => v !== null);
  return done.length ? (done.reduce((a, b) => a + b, 0) / done.length).toFixed(2) : '—';
}
function baseBlocks(cpu) {
  const row = runJobs.findIndex((p) => p.name === cpu);
  return [
    {
      type: 'chips', label: '就绪队列', hint: '队首 → 队尾',
      items: queue.map((n, i) => ({ text: n, cls: i === 0 ? 'queue head' : 'queue' })),
      empty: '空',
    },
    {
      type: 'kv', label: 'RR 状态',
      items: [
        { k: '时间片 q', v: quantum },
        { k: '上下文切换', v: switchCount() },
        { k: '已完成', v: finish.filter((v) => v !== null).length + '/' + runJobs.length },
        { k: '平均等待', v: avgWait() },
      ],
    },
    {
      type: 'table', label: '剩余 / 完成', hint: '按到达顺序',
      rows: [['进程', '剩余', '完成']].concat(runJobs.map((p, i) => [p.name, left[i], finish[i] === null ? '—' : finish[i]])),
      current: row >= 0 ? [row + 1, 0] : undefined,
    },
  ];
}
function sync(cpu, note) {
  director.stateUpdate({ blocks: baseBlocks(cpu), footerText: 'RR：时间片用完即让出 CPU，未完成作业回到队尾' });
  director.setBeatState(note);
}

function* runEvent(ev, idx) {
  const si = stage.addSegment(ev.name, ev.start, ev.end, GOLD);
  segs.push({ name: ev.name, start: ev.start, end: ev.end, done: false });
  queue = ev.queueBefore.slice();
  stage.setQueue(queue);
  stage.setCpu(ev.name, '剩余 ' + ev.leftBefore + ' 片');
  sync(ev.name, ev.name + ' 拿到时间片：还剩 ' + ev.leftBefore + ' 片');
  status.textContent = ev.name + ' 运行 t=' + ev.start + '→' + ev.end + '（' + ev.run + ' 片）' + (ev.done ? '，这一片后完成' : '，时间片用完将让出');
  yield W(500);
  segs[segs.length - 1].done = true;
  if (ev.done) stage.settleSegment(si, GREEN);
  else stage.settleSegment(si, BLUE, 0x1e40af);
  left = ev.left.slice();
  finish = ev.finish.slice();
  queue = ev.queueAfter.slice();
  stage.setQueue(queue);
  stage.setCpu('空闲', '等待下一次调度');
  sync('空闲', ev.done ? ev.name + ' 完成于 t=' + ev.end : ev.name + ' 剩余 ' + left[idx] + '，回到队尾');
  status.textContent = ev.done
    ? ev.name + ' 完成于 t=' + ev.end + ' · 队列 ' + (queue.join(' → ') || '空')
    : ev.name + ' 时间片用完，剩余 ' + left[idx] + ' 片，回到队尾 · 队列 ' + queue.join(' → ');
  yield W(300);
}

function* runRR() {
  const sched = rrSchedule(current, quantum);
  runJobs = sched.jobs;
  const n = runJobs.length;
  let total = sched.total;
  queue = [];
  left = runJobs.map((p) => p.burst);
  finish = Array(n).fill(null);
  segs = [];
  stage.reset();
  stage.beginTimeline(total);
  queue = [runJobs[0].name];
  stage.setQueue(queue);
  stage.setCpu('空闲', 'q=' + quantum);

  // 1 · 舞台
  director.chapter('舞台');
  yield S(() => {
    beat({
      title: '时间片轮转：每人 q 片，轮流上 CPU',
      why: 'RR 把 CPU 时间切成固定大小的 q 片。队首最多跑 q 片，没跑完就回队尾，让后面的作业尽快得到响应。',
      stateText: 'q=' + quantum + ' · ' + n + ' 个作业',
      progress: 1,
      camera: SHOT_WIDE,
      annotations: [
        { id: 'cpu', text: 'CPU 核心：每次只跑一个作业', anchor: () => stage.cpuPos(), offset: [0, -54], className: 'gold' },
        { id: 'q', text: '就绪队列：FIFO，队首上 CPU', anchor: () => stage.queuePos(0), offset: [0, -44] },
        { id: 'g', text: '甘特图：每次时间片一段', anchor: () => stage.ganttPos(), offset: [0, -46] },
      ],
    });
    sync('空闲', 'q=' + quantum + '，等待作业到达');
    status.textContent = 'RR：时间片 q=' + quantum + '，就绪队列 FIFO；每个作业最多连续运行 ' + quantum + ' 个时间片。';
  });
  yield W(900);

  // 2 · 到达
  director.chapter('到达');
  yield S(() => {
    beat({
      title: '到达并入队：先来先排',
      why: '新到达的作业加入队尾；已经在队列里的作业按 FIFO 顺序等待自己的时间片。',
      stateText: '队列将随到达增长',
      progress: 2,
      camera: SHOT_QUEUE,
      annotations: [{ id: 'q', text: '新作业从队尾加入', anchor: () => stage.queuePos(1), offset: [0, -42] }],
    });
    queue = [runJobs[0].name];
    stage.setQueue(queue);
    sync('空闲', 'P1 已在队列');
  });
  for (let i = 1; i < n; i++) {
    yield S(() => {
      queue.push(runJobs[i].name);
      stage.setQueue(queue);
      sync('空闲', runJobs[i].name + ' 到达（t=' + runJobs[i].arrive + '）');
      status.textContent = runJobs[i].name + ' 到达并入队；队列 ' + queue.join(' → ');
    });
    yield W(260);
  }
  yield W(260);

  // 3 · 第一个时间片
  director.chapter('轮转');
  const ev = sched.events;
  const groups = [
    ev.slice(0, 1),
    ev.slice(1, 4),
    ev.slice(4, 6),
  ];
  const rest = ev.slice(6);
  const cut = rest.length > 5 ? Math.ceil(rest.length / 2) : Math.max(1, rest.length - 1);
  groups.push(ev.slice(6, 6 + cut), ev.slice(6 + cut));
  const meta = [
    { title: 'P1 上 CPU：第一片开始', why: '队首 P1 先跑一个时间片。跑满 q 片后，不管还剩多少，都要把 CPU 交给下一位。', progress: 3, camera: SHOT_CPU },
    { title: '第一轮轮转：P2 → P3 → P4', why: '每次时间片结束都发生一次上下文切换；未完成的作业回到队尾，等待下一轮。', progress: 4, camera: SHOT_CPU },
    { title: '第二轮：队列滚动起来', why: '短作业先跑完离开队列；长作业继续回到队尾。响应时间被限制在一个轮转周期左右。', progress: 5, camera: SHOT_QUEUE },
    { title: '收尾：一个个完成', why: '完成时刻取决于 burst 和排队位置，而不是到达顺序；时间片大小会改变轮转长度。', progress: 6, camera: SHOT_GANTT },
    { title: '最后一片与总账', why: '所有作业完成。比较 RR 与 FCFS 的平均等待，并观察 q 对响应和切换开销的影响。', progress: 7, camera: SHOT_GANTT },
  ];
  for (let g = 0; g < groups.length; g++) {
    const m = meta[g];
    yield S(() => {
      beat({
        title: m.title, why: m.why,
        stateText: g === 0 ? 'q=' + quantum + ' · 队首 ' + queue[0] : '当前队列：' + (queue.join(' → ') || '空'),
        progress: m.progress,
        camera: m.camera,
        annotations: [
          { id: 'cpu', text: 'q=' + quantum + '：每次最多跑 ' + quantum + ' 片', anchor: () => stage.cpuPos(), offset: [0, -54], className: 'gold' },
          { id: 'q', text: '未完成 → 队尾', anchor: () => stage.queuePos(Math.max(0, queue.length - 1)), offset: [0, -42] },
        ],
      });
      sync(queue[0] || '空闲', '准备执行第 ' + (g + 1) + ' 组时间片');
    });
    yield W(260);
    if (!groups[g].length) {
      yield S(() => { status.textContent = '所有时间片已执行完；队列 ' + (queue.join(' → ') || '空'); });
      yield W(300);
      continue;
    }
    for (let k = 0; k < groups[g].length; k++) {
      const e = groups[g][k];
      yield* runEvent(e, runJobs.findIndex((p) => p.name === e.name));
      yield W(120);
    }
  }

  // 7 · 总账（如果最后组已执行完，更新对比状态）
  const firstDone = sched.finish.indexOf(Math.min(...sched.finish.filter((v) => v !== null)));
  const avgRR = avgWait();
  const avgF = fcfsAvg(runJobs).toFixed(2);
  yield S(() => {
    director.stateUpdate({
      blocks: baseBlocks('空闲').concat([{
        type: 'table', label: '平均等待对比', hint: '同一批作业',
        rows: [['策略', '平均等待'], ['RR q=' + quantum, avgRR], ['FCFS', avgF]],
      }]),
      footerText: 'q 越大越像 FCFS；q 越小响应越快，但上下文切换更多',
    });
    director.setBeatState('RR 平均等待 ' + avgRR + ' · FCFS ' + avgF);
    status.textContent = 'RR(q=' + quantum + ') 完成：' + sched.events.length + ' 段时间片 · 切换 ' + sched.switches +
      ' 次 · 最先完成 ' + runJobs[firstDone].name + ' t=' + sched.finish[firstDone] + ' · 平均等待 ' + avgRR + ' · FCFS ' + avgF;
  });
  yield W(700);

  // 8 · 复盘
  director.chapter('复盘');
  yield S(() => {
    beat({
      title: 'RR：响应有界，切换有价',
      why: '就绪队列 FIFO + 固定时间片，让每个作业至多等一个轮转周期；q 太大退化 FCFS，q 太小则上下文切换开销上升。',
      stateText: 'q=' + quantum + ' · 平均等待 ' + avgRR + ' · 切换 ' + sched.switches + ' 次',
      progress: 8,
      camera: SHOT_WIDE,
      annotations: [],
    });
    director.stateUpdate({ blocks: baseBlocks('空闲'), footerText: '应用：分时系统、交互终端；q 常取 4–10ms 量级' });
    director.setProgress(8);
    status.textContent = 'RR 演示完成：q=' + quantum + ' · ' + sched.events.length + ' 段轮转 · ' + runJobs.map((p) => p.name + '=' + sched.finish[runJobs.indexOf(p)]).join(' ') + ' · 平均等待 ' + avgRR;
  });
  yield W(800);
}

function restart(jobs, q, autoPlay = true) {
  current = clone(jobs);
  quantum = q;
  engine.clear();
  director.reset();
  stage.reset();
  queue = [];
  left = [];
  finish = [];
  segs = [];
  status.textContent = '';
  engine.queue(() => runRR());
  if (autoPlay) engine.toggle();
}

const presetSel = input.addSelect('作业集', Object.keys(PRESETS), presetName, (v) => {
  presetName = v;
  restart(PRESETS[v], quantum, true);
});
const qSel = input.addSelect('时间片 q', ['2', '3', '4'], String(quantum), (v) => {
  restart(current, Number(v), true);
});
input.addButton('重播', () => restart(current, quantum, true));
input.addButton('清空', () => {
  engine.clear();
  director.reset();
  stage.reset();
  queue = [];
  left = [];
  finish = [];
  segs = [];
  presetName = '经典 4 作业';
  quantum = 3;
  presetSel.value = presetName;
  qSel.value = String(quantum);
  current = clone(PRESETS[presetName]);
  stage.setQueue(current.slice().sort((a, b) => a.arrive - b.arrive).map((p) => p.name));
  status.textContent = '';
});

stage.setQueue(current.slice().sort((a, b) => a.arrive - b.arrive).map((p) => p.name));
engine.queue(() => runRR());
scene.start(engine);
window.addEventListener('pagehide', () => stage.remove(), { once: true });
