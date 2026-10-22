// AlgorithmLibrary/FCFS3D.js — 先来先服务：就绪队列按到达顺序非抢占执行，CPU 甘特图逐段生长。
// 导演层讲解「到达 → 上 CPU → 完成」，并用同一批作业对比 FCFS 与 SJF 的平均等待。
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { applyTheme } from '../3D/Glow.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
import { CpuStage } from '../3D/director/OSStage.js';
applyTheme('FCFS3D');

const GOLD = 0xfcd34d, GREEN = 0x4ade80;
const PRESETS = {
  '经典 4 作业': [
    { name: 'P1', arrive: 0, burst: 8 }, { name: 'P2', arrive: 1, burst: 4 },
    { name: 'P3', arrive: 2, burst: 9 }, { name: 'P4', arrive: 3, burst: 5 },
  ],
  '短作业先到': [
    { name: 'P1', arrive: 0, burst: 7 }, { name: 'P2', arrive: 1, burst: 2 },
    { name: 'P3', arrive: 2, burst: 2 }, { name: 'P4', arrive: 3, burst: 3 },
  ],
  '长作业堵头': [
    { name: 'P1', arrive: 0, burst: 12 }, { name: 'P2', arrive: 1, burst: 2 },
    { name: 'P3', arrive: 2, burst: 2 }, { name: 'P4', arrive: 3, burst: 4 },
  ],
};
const NARROW = typeof matchMedia !== 'undefined' && matchMedia('(max-width: 900px)').matches;
const zs = (s) => NARROW ? { ...s, pos: s.target.map((v, i) => v + (s.pos[i] - v) * 0.42) } : s;
const SHOT_WIDE = zs({ pos: [320, 650, 1050], target: [320, 460, 0], ms: 900 });
const SHOT_CPU = zs({ pos: [560, 780, 620], target: [470, 610, 0], ms: 850 });
const SHOT_QUEUE = zs({ pos: [320, 560, 620], target: [320, 315, 0], ms: 850 });
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
let queue = [];
let segs = [];

const director = new StoryDirector(scene, {
  title: 'FCFS · 先来先服务',
  total: 8,
  legend: [
    { label: '等待作业', color: '#60a5fa' },
    { label: 'CPU 执行', color: '#fcd34d' },
    { label: '已完成', color: '#4ade80' },
    { label: '队头阻塞', color: '#fb7185' },
  ],
  onReplay: () => restart(current, true),
});
const beat = (cfg) => director.beat(NARROW ? { ...cfg, annotations: cfg.annotations?.slice(0, 2) } : cfg);

function fcfs(jobs) {
  let t = 0;
  return jobs.slice().sort((a, b) => a.arrive - b.arrive).map((p) => {
    t = Math.max(t, p.arrive);
    const start = t;
    t += p.burst;
    return { ...p, start, end: t };
  });
}
function sjf(jobs) {
  const pool = jobs.slice().sort((a, b) => a.arrive - b.arrive);
  const out = [];
  let t = 0;
  while (pool.length) {
    const ready = pool.filter((p) => p.arrive <= t);
    if (!ready.length) { t = pool[0].arrive; continue; }
    ready.sort((a, b) => a.burst - b.burst || a.arrive - b.arrive);
    const p = ready[0];
    out.push({ ...p, start: t, end: t + p.burst });
    t += p.burst;
    pool.splice(pool.indexOf(p), 1);
  }
  return out;
}
function avgWait(sched) {
  return sched.reduce((sum, s) => sum + s.start - s.arrive, 0) / Math.max(sched.length, 1);
}
function finishedAvg() {
  const done = segs.filter((s) => s.done);
  if (!done.length) return '—';
  const sum = done.reduce((acc, s) => {
    const p = current.find((x) => x.name === s.name);
    return acc + s.start - p.arrive;
  }, 0);
  return (sum / done.length).toFixed(2);
}
function jobRows(cpu) {
  return [['进程', '到达', '运行', '完成', '等待']].concat(current.map((p) => {
    const s = segs.find((x) => x.name === p.name);
    return [p.name, p.arrive, p.burst,
      s && s.done ? s.end : '—',
      s && s.done ? s.start - p.arrive : '—'];
  }));
}
function baseBlocks(cpu) {
  const doneCount = segs.filter((s) => s.done).length;
  const row = current.findIndex((p) => p.name === cpu);
  return [
    {
      type: 'chips', label: '就绪队列', hint: '队首 → 队尾',
      items: queue.map((n, i) => ({ text: n, cls: i === 0 ? 'queue head' : 'queue' })),
      empty: '空',
    },
    {
      type: 'kv', label: '调度状态',
      items: [
        { k: 'CPU', v: cpu || '空闲' },
        { k: '已完成', v: doneCount + '/' + current.length },
        { k: '平均等待', v: finishedAvg() },
      ],
    },
    {
      type: 'table', label: '作业表', hint: '完成 / 等待',
      rows: jobRows(cpu), current: row >= 0 ? [row + 1, 0] : undefined,
    },
  ];
}
function sync(cpu, note) {
  director.stateUpdate({ blocks: baseBlocks(cpu), footerText: 'FCFS：按到达顺序非抢占执行，跑完才换人' });
  director.setBeatState(note);
}

function* jobBeat(seg, cfg) {
  const si = stage.addSegment(seg.name, seg.start, seg.end, GOLD);
  segs.push({ name: seg.name, start: seg.start, end: seg.end, done: false });
  yield S(() => {
    beat(cfg);
    queue = queue.filter((n) => n !== seg.name);
    stage.setQueue(queue);
    stage.setCpu(seg.name, '剩余 ' + seg.burst + ' 片');
    sync(seg.name, cfg.stateText);
    status.textContent = seg.name + ' 于 t=' + seg.start + ' 上 CPU，运行 ' + seg.burst + ' 个时间片（非抢占）';
  });
  yield W(700);
  yield S(() => {
    segs[segs.length - 1].done = true;
    stage.settleSegment(si, GREEN);
    stage.setCpu('空闲', '下一位');
    sync('空闲', seg.name + ' 完成于 t=' + seg.end);
    status.textContent = seg.name + ' 完成于 t=' + seg.end + ' · 队列还剩 ' + queue.length + ' 个作业';
  });
  yield W(340);
}

function* runFCFS() {
  const jobs = current.slice().sort((a, b) => a.arrive - b.arrive);
  const sched = fcfs(jobs);
  const total = sched[sched.length - 1].end;
  queue = [jobs[0].name];
  segs = [];
  stage.reset();
  stage.beginTimeline(total);
  stage.setQueue(queue);
  stage.setCpu('空闲', '等待调度');

  // 1 · 舞台
  director.chapter('舞台');
  yield S(() => {
    beat({
      title: '一台 CPU，一条就绪队列',
      why: 'FCFS 像排队办事：谁先到，谁先占用 CPU，并一直跑到结束；后来者只能在队列里等。',
      stateText: 't=0 · P1 已到达',
      progress: 1,
      camera: SHOT_WIDE,
      annotations: [
        { id: 'cpu', text: '单核 CPU：一次只跑一个作业', anchor: () => stage.cpuPos(), offset: [0, -54], className: 'gold' },
        { id: 'q', text: '就绪队列：按到达顺序排队', anchor: () => stage.queuePos(0), offset: [0, -44] },
        { id: 'g', text: '甘特图：执行段会画在这里', anchor: () => stage.ganttPos(), offset: [0, -46] },
      ],
    });
    sync('空闲', 'P1 在 t=0 到达，进入队首');
    status.textContent = 'FCFS：先到先服务，非抢占。P1 已在 t=0 到达，其余作业陆续到达。';
  });
  yield W(1000);

  // 2 · 到达
  director.chapter('到达');
  yield S(() => {
    beat({
      title: '陆续到达：先到先排',
      why: '到达时间决定入队顺序。FCFS 不比较作业长短，也不中途切换。',
      stateText: 'P1 → P2 → P3 → P4',
      progress: 2,
      camera: SHOT_QUEUE,
      annotations: [{ id: 'arr', text: 'P2 / P3 / P4 在 t=1/2/3 依次入队', anchor: () => stage.queuePos(1), offset: [0, -42] }],
    });
    sync('空闲', '作业按到达时间入队');
  });
  for (let i = 1; i < jobs.length; i++) {
    yield S(() => {
      queue.push(jobs[i].name);
      stage.setQueue(queue);
      sync('空闲', jobs[i].name + ' 在 t=' + jobs[i].arrive + ' 到达');
      status.textContent = jobs[i].name + ' 到达（t=' + jobs[i].arrive + '），排到队尾；队列 ' + queue.join(' → ');
    });
    yield W(340);
  }
  yield W(300);

  // 3-6 · 逐个执行
  director.chapter('执行');
  yield* jobBeat(sched[0], {
    title: 'P1 上 CPU：先来先跑',
    why: 'P1 最早到达，直接占用 CPU。只要它没跑完，P2/P3/P4 都不能抢——这就是非抢占。',
    stateText: 'P1 运行中，t=0 → ' + sched[0].end,
    progress: 3,
    camera: SHOT_CPU,
    annotations: [
      { id: 'cpu', text: 'P1 独占 CPU，剩余 ' + sched[0].burst + ' 片', anchor: () => stage.cpuPos(), offset: [0, -54], className: 'gold' },
      { id: 'wait', text: 'P2/P3/P4 已到达，只能等', anchor: () => stage.queuePos(0), offset: [0, -42] },
    ],
  });
  yield* jobBeat(sched[1], {
    title: 'P1 完成，P2 接着跑',
    why: '非抢占调度只在作业结束时换人；P2 虽然运行时间更短，也只能排在 P1 后面。',
    stateText: 'P2 运行中，t=' + sched[1].start + ' → ' + sched[1].end,
    progress: 4,
    camera: SHOT_CPU,
    annotations: [
      { id: 'cpu', text: 'P2 获得 CPU（剩余 ' + sched[1].burst + ' 片）', anchor: () => stage.cpuPos(), offset: [0, -54], className: 'gold' },
      { id: 'wait', text: 'P3/P4 继续排队', anchor: () => stage.queuePos(0), offset: [0, -42] },
    ],
  });
  const third = sched[2], fourth = sched[3];
  const thirdLong = third.burst >= 5;
  const thirdBlocked = !!fourth && fourth.arrive < third.start;
  yield* jobBeat(third, {
    title: thirdLong
      ? '长作业 ' + third.name + (thirdBlocked ? '：队头阻塞开始' : '：连续执行')
      : third.name + ' 上 CPU：' + (thirdBlocked ? fourth.name + ' 已到达也只能等' : '按顺序轮到它'),
    why: third.name + ' 要跑 ' + third.burst + ' 个时间片，' + (thirdBlocked
      ? fourth.name + ' 早已到达却只能干等。FCFS 下前面每个作业都要跑完才轮到后面。'
      : '当前没有更晚到达的作业在等它。'),
    stateText: third.name + ' 运行中' + (thirdBlocked ? '，' + fourth.name + ' 已等待 ' + (third.start - fourth.arrive) + ' 片' : ''),
    progress: 5,
    camera: SHOT_CPU,
    annotations: [
      { id: 'cpu', text: third.name + (thirdLong ? ' 长作业' : '') + '：连续跑 ' + third.burst + ' 片', anchor: () => stage.cpuPos(), offset: [0, -54], className: 'warn' },
      { id: 'wait', text: thirdBlocked ? fourth.name + ' 已等到 t=' + third.start + '，仍不能上 CPU' : '当前没有等待中的作业', anchor: () => stage.queuePos(0), offset: [0, -42], className: thirdBlocked ? 'warn' : '' },
    ],
  });
  yield* jobBeat(sched[3], {
    title: '最后一位：P4 才上 CPU',
    why: 'P4 在 t=3 到达，却直到 t=' + sched[3].start + ' 才运行。FCFS 公平地按到达排序，但会产生队头阻塞。',
    stateText: 'P4 运行中，t=' + sched[3].start + ' → ' + sched[3].end,
    progress: 6,
    camera: SHOT_CPU,
    annotations: [
      { id: 'cpu', text: 'P4 是最后一个作业', anchor: () => stage.cpuPos(), offset: [0, -54], className: 'gold' },
    ],
  });

  // 7 · 指标对比
  const avgF = avgWait(sched);
  const sjfSched = sjf(jobs);
  const avgS = avgWait(sjfSched);
  const finish = sched.map((s) => s.name + '=' + s.end).join('  ');
  director.chapter('队头阻塞');
  yield S(() => {
    beat({
      title: '队头阻塞：FCFS 平均等待 ' + avgF.toFixed(2),
      why: '同一批作业改用 SJF（短作业优先）平均等待为 ' + avgS.toFixed(2) + '。FCFS 不比较作业长度，长作业排前面会拖累后面所有短作业。',
      stateText: '完成时刻：' + finish,
      progress: 7,
      camera: SHOT_GANTT,
      annotations: [
        { id: 'g', text: '甘特图：P4 的等待空档最长', anchor: () => stage.ganttPos(), offset: [0, -48], className: 'warn' },
      ],
    });
    director.stateUpdate({
      blocks: baseBlocks('空闲').concat([{
        type: 'table', label: '平均等待对比', hint: '同一批作业',
        rows: [['策略', '平均等待'], ['FCFS', avgF.toFixed(2)], ['SJF', avgS.toFixed(2)]],
      }]),
      footerText: 'FCFS 实现简单、无饥饿；代价是长作业可能堵住短作业',
    });
    director.setBeatState('平均等待 FCFS ' + avgF.toFixed(2) + ' vs SJF ' + avgS.toFixed(2));
    status.textContent = 'FCFS 完成时刻 ' + finish + ' · 平均等待 ' + avgF.toFixed(2) + '（SJF 同作业集 ' + avgS.toFixed(2) + '）· 队头阻塞明显';
  });
  yield W(1100);

  // 8 · 复盘
  director.chapter('复盘');
  yield S(() => {
    beat({
      title: 'FCFS：公平但不智能',
      why: '按到达顺序执行、实现最简单、不会饥饿；但长作业会堵住后面的短作业，平均等待和响应时间不稳定。',
      stateText: 'O(n) 入队 / 出队 · 非抢占 · CPU 利用率看作业到达节奏',
      progress: 8,
      camera: SHOT_WIDE,
      annotations: [],
    });
    director.stateUpdate({ blocks: baseBlocks('空闲'), footerText: '应用：打印队列、批处理、简单请求缓冲；改进方向：SJF / RR / 优先级调度' });
    director.setProgress(8);
    status.textContent = 'FCFS 完成：顺序 ' + sched.map((s) => s.name).join(' → ') + ' · 完成时刻 ' + finish + ' · 平均等待 ' + avgF.toFixed(2) + ' · 队头阻塞：P4 等到 t=' + sched[3].start;
  });
  yield W(800);
}

function restart(jobs, autoPlay = true) {
  current = clone(jobs);
  engine.clear();
  director.reset();
  stage.reset();
  queue = [];
  segs = [];
  status.textContent = '';
  engine.queue(() => runFCFS());
  if (autoPlay) engine.toggle();
}

const presetSel = input.addSelect('作业集', Object.keys(PRESETS), presetName, (v) => {
  presetName = v;
  restart(PRESETS[v], true);
});
input.addButton('重播', () => restart(current, true));
input.addButton('清空', () => {
  engine.clear();
  director.reset();
  stage.reset();
  queue = [];
  segs = [];
  presetName = '经典 4 作业';
  presetSel.value = presetName;
  current = clone(PRESETS[presetName]);
  stage.setQueue(current.slice().sort((a, b) => a.arrive - b.arrive).map((p) => p.name));
  status.textContent = '';
});

stage.setQueue(current.slice().sort((a, b) => a.arrive - b.arrive).map((p) => p.name));
engine.queue(() => runFCFS());
scene.start(engine);
window.addEventListener('pagehide', () => stage.remove(), { once: true });
