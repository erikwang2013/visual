// AlgorithmLibrary/SSTF3D.js — 最短寻道时间优先：每步选择离磁头最近的请求，贪心移动。
// 盘面 + 磁道尺 + 磁头，实时显示剩余请求距离、累计寻道与已服务顺序；最后对比 FCFS 顺序与 SCAN。
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { applyTheme } from '../3D/Glow.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
import { DiskStage } from '../3D/director/OSStage.js';
applyTheme('SSTF3D');

const GOLD = 0xfcd34d;
const PRESETS = {
  '经典 8 请求': { start: 53, reqs: [98, 183, 37, 122, 14, 124, 65, 67] },
  '边缘等待': { start: 53, reqs: [55, 56, 57, 58, 59, 199] },
  '均匀 10 请求': { start: 100, reqs: [10, 30, 50, 70, 90, 110, 130, 150, 170, 190] },
};
const NARROW = typeof matchMedia !== 'undefined' && matchMedia('(max-width: 900px)').matches;
const zs = (s) => NARROW ? { ...s, pos: s.target.map((v, i) => v + (s.pos[i] - v) * 0.42) } : s;
const SHOT_WIDE = zs({ pos: [320, 720, 1150], target: [320, 470, 0], ms: 950 });
const SHOT_AXIS = zs({ pos: [320, 530, 640], target: [320, 310, 0], ms: 820 });
const SHOT_HEAD = zs({ pos: [320, 510, 560], target: [320, 300, 0], ms: 780 });

const scene = new Scene3D('scene', { cameraPos: [320, 700, 1120], lookAt: [320, 470, 0], fov: 50 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const input = new InputKit(panel);
const status = panel.addStatus('就绪');
const stage = new DiskStage(scene, { y: 300 });

let presetName = '经典 8 请求';
let reqs = PRESETS[presetName].reqs.slice();
let start = PRESETS[presetName].start;
let head = start;
let total = 0;
let servedSet = new Set();
let servedOrder = [];

const director = new StoryDirector(scene, {
  title: 'SSTF · 最短寻道优先',
  total: 8,
  legend: [
    { label: '请求磁道', color: '#22d3ee' },
    { label: '当前最近', color: '#fcd34d' },
    { label: '已服务', color: '#4ade80' },
    { label: '磁头', color: '#f59e0b' },
  ],
  onReplay: () => restart(reqs, start, true),
});
const beat = (cfg) => director.beat(NARROW ? { ...cfg, annotations: cfg.annotations?.slice(0, 2) } : cfg);

function orderFor(r, from) {
  const rem = r.map((c, i) => ({ c, i }));
  let cur = from, sum = 0;
  const order = [];
  while (rem.length) {
    let bi = 0, bd = Math.abs(rem[0].c - cur);
    for (let j = 1; j < rem.length; j++) {
      const d = Math.abs(rem[j].c - cur);
      if (d < bd) { bd = d; bi = j; }
    }
    const it = rem.splice(bi, 1)[0];
    sum += bd;
    order.push({ c: it.c, idx: it.i, from: cur, d: bd, total: sum });
    cur = it.c;
  }
  return { order, total: sum };
}
function fifoTotal(r, from) {
  let cur = from, sum = 0;
  r.forEach((c) => { sum += Math.abs(c - cur); cur = c; });
  return sum;
}
function scanTotal(r, from) {
  if (!r.length) return 0;
  const hi = Math.max(...r), lo = Math.min(...r);
  if (lo >= from) return hi - from;
  if (hi <= from) return from - lo;
  return (hi - from) + (hi - lo);
}
function queueInfo() {
  const q = reqs.map((c, i) => ({ c, i, d: Math.abs(c - head) })).filter((o) => !servedSet.has(o.i));
  let near = q[0];
  q.forEach((o) => { if (o.d < near.d) near = o; });
  return { q, near };
}
function baseBlocks(extra = [], highlight = true) {
  const { q, near } = queueInfo();
  return [
    {
      type: 'kv', label: '磁头状态',
      items: [
        { k: '当前磁道', v: head },
        { k: '累计寻道', v: total },
        { k: '已服务', v: servedSet.size + '/' + reqs.length },
        { k: '最近请求', v: near ? near.c + '（距离 ' + near.d + '）' : '—' },
      ],
    },
    {
      type: 'chips', label: '请求队列', hint: '柱面 · 到磁头距离',
      items: q.map((o) => ({ text: o.c + ' · ' + o.d, cls: highlight && near && o.i === near.i ? 'current' : 'queue' })),
      empty: '全部服务完',
    },
    {
      type: 'chips', label: '已服务顺序', hint: '先 → 后',
      items: servedOrder.map((c) => ({ text: c, cls: 'done' })),
      empty: '—',
    },
  ].concat(extra);
}
function sync(note, highlight = true) {
  director.stateUpdate({ blocks: baseBlocks([], highlight), footerText: 'SSTF：每一步贪心选择离当前磁头最近的请求' });
  director.setBeatState(note);
}

function* service(ev) {
  const ms = 380 + Math.min(ev.d * 5, 520);
  stage.markRequest(ev.idx, GOLD);
  stage.moveHead(ev.c, ms);
  yield W(ms + 80);
  stage.serveRequest(ev.idx);
  servedSet.add(ev.idx);
  servedOrder.push(ev.c);
  head = ev.c;
  total = ev.total;
  sync('服务柱面 ' + ev.c + '（+ ' + ev.d + '）· 累计 ' + total, true);
  status.textContent = '磁头 ' + ev.from + ' → ' + ev.c + '，寻道 ' + ev.d + '；服务后累计 ' + total + ' 柱面，剩余 ' + (reqs.length - servedSet.size) + ' 个请求';
  yield W(280);
}

function* runSSTF() {
  const r = reqs.slice();
  const begin = start;
  const { order, total: grand } = orderFor(r, begin);
  head = begin;
  total = 0;
  servedSet = new Set();
  servedOrder = [];
  stage.reset();
  stage.setRequests(r, begin);

  // 1 · 舞台
  director.chapter('舞台');
  yield S(() => {
    beat({
      title: '磁盘盘面：磁头与请求磁道',
      why: '每个请求是一个柱面号。磁头移动的距离就是寻道时间；SSTF 每一步都选择离当前位置最近的请求。',
      stateText: '磁头 ' + begin + ' · ' + r.length + ' 个请求',
      progress: 1,
      camera: SHOT_WIDE,
      annotations: [
        { id: 'platter', text: '盘面 / 磁道：越往外柱面号越大', anchor: () => stage.platterPos(), offset: [0, -40] },
        { id: 'head', text: '磁头起始于柱面 ' + begin, anchor: () => stage.headPos(), offset: [0, -62], className: 'gold' },
        { id: 'axis', text: '磁道尺：请求按柱面号排开', anchor: () => stage.axisPos(), offset: [0, -42] },
      ],
    });
    sync('所有请求都在队列中，等待选择');
    status.textContent = 'SSTF：磁头在 ' + begin + '，请求 ' + r.join(', ') + '；每一步选最近的请求。';
  });
  yield W(950);

  // 2 · 选择最近的请求
  const first = order[0];
  director.chapter('选最近');
  yield S(() => {
    if (first) stage.markRequest(first.idx, GOLD);
    beat({
      title: first ? '贪心第一步：最近的请求是 ' + first.c : '没有请求',
      why: first ? '从磁头 ' + begin + ' 看，' + first.c + ' 的距离只有 ' + first.d + '，比其它请求都近，因此先服务它。' : '请求队列为空。',
      stateText: first ? '最近：' + first.c + ' · 距离 ' + first.d : '—',
      progress: 2,
      camera: SHOT_AXIS,
      annotations: first ? [{ id: 'near', text: '最近请求 ' + first.c + '（距离 ' + first.d + '）', anchor: () => stage.requestPos(first.idx), offset: [0, -44], className: 'gold' }] : [],
    });
    sync(first ? '候选 ' + first.c + '，距离 ' + first.d : '—', true);
    status.textContent = first ? '扫描剩余请求：' + r.map((c) => c + '(' + Math.abs(c - begin) + ')').join('  ') + ' → 选 ' + first.c : '没有请求';
  });
  yield W(850);

  // 3 · 移动并服务第一个请求
  director.chapter('移动');
  yield S(() => {
    beat({
      title: first ? '磁头移动：' + begin + ' → ' + first.c : '无请求',
      why: first ? '磁头沿盘面径向移动到目标柱面，距离 ' + first.d + '；到达后服务并点亮该请求。' : '—',
      stateText: first ? '寻道 ' + first.d + ' · 累计 ' + first.d : '—',
      progress: 3,
      camera: SHOT_HEAD,
      annotations: first ? [{ id: 'head', text: '移动 ' + first.d + ' 个柱面', anchor: () => stage.headPos(), offset: [0, -62], className: 'gold' }] : [],
    });
    sync(first ? '服务 ' + first.c + '…' : '—', false);
  });
  if (first) yield* service(first);
  yield W(280);

  // 4-6 · 继续服务
  const groups = [
    { list: order.slice(1, 3), title: '下一批：仍然选最近的', why: '每服务完一个请求，磁头位置改变，距离要重新计算；最近的可能在反方向。', progress: 4, camera: SHOT_HEAD },
    { list: order.slice(3, 5), title: '距离变大：贪心还能省多少', why: '有时最近的请求也在很远的磁道上；SSTF 仍会选它，因为其余请求更远。', progress: 5, camera: SHOT_AXIS },
    { list: order.slice(5), title: '收尾：服务剩余请求', why: '所有请求完成后统计总寻道。SSTF 总寻道通常较短，但边缘请求可能长期等待。', progress: 6, camera: SHOT_WIDE },
  ];
  for (const g of groups) {
    const nxt = g.list[0];
    director.chapter(g.title);
    yield S(() => {
      if (nxt) stage.markRequest(nxt.idx, GOLD);
      beat({
        title: g.title,
        why: g.why,
        stateText: nxt ? '下一个：' + nxt.c + ' · 距离 ' + nxt.d : '全部服务完',
        progress: g.progress,
        camera: g.camera,
        annotations: nxt ? [{ id: 'next', text: '下一目标 ' + nxt.c + '（距离 ' + nxt.d + '）', anchor: () => stage.requestPos(nxt.idx), offset: [0, -44], className: 'gold' }] : [],
      });
      sync(nxt ? '下一个 ' + nxt.c + '，距离 ' + nxt.d : '全部服务完', true);
    });
    for (const ev of g.list) {
      yield* service(ev);
      yield W(120);
    }
  }

  // 7 · 对比与饥饿
  const fifo = fifoTotal(r, begin), scan = scanTotal(r, begin);
  const last = order[order.length - 1];
  const lastWait = order.length - 1;
  director.chapter('贪心总账');
  const cmp = grand < fifo ? '短' : grand > fifo ? '长' : '持平';
  const cmpPhrase = grand < fifo ? '短于' : grand > fifo ? '长于' : '等于';
  yield S(() => {
    beat({
      title: 'SSTF 总寻道 ' + grand + '：' + (grand === fifo ? '与 FCFS 持平' : '比 FCFS ' + cmp) + '，不保证公平',
      why: '总寻道' + cmpPhrase + '按请求顺序（FCFS ' + fifo + '），但每次只看最近请求，边缘请求可能一直被更近的请求插队，出现饥饿；SCAN/电梯算法用方向约束保证公平。',
      stateText: '最后服务 ' + last.c + '，前面已服务 ' + lastWait + ' 个请求',
      progress: 7,
      camera: SHOT_WIDE,
      annotations: [
        { id: 'h', text: '总寻道 ' + grand + ' 柱面', anchor: () => stage.headPos(), offset: [0, -62], className: 'final' },
      ],
    });
    director.stateUpdate({
      blocks: baseBlocks([{
        type: 'table', label: '总寻道对比', hint: '同一请求集',
        rows: [['策略', '总寻道'], ['SSTF', grand], ['FCFS 顺序', fifo], ['SCAN', scan]],
      }], false),
      footerText: 'SSTF 每步选最近，本次总寻道' + cmpPhrase + ' FCFS；SCAN 以方向约束换取公平，避免边缘请求饥饿',
    });
    director.setBeatState('SSTF ' + grand + ' · FCFS 顺序 ' + fifo + ' · SCAN ' + scan);
    status.textContent = 'SSTF 完成：顺序 ' + order.map((o) => o.c).join(' → ') + ' · 总寻道 ' + grand + ' 柱面 · 最后服务 ' + last.c + '（排第 ' + order.length + ' 位）· 平均 ' + (grand / Math.max(order.length, 1)).toFixed(1) + ' 柱面/次';
  });
  yield W(1100);

  // 8 · 复盘
  director.chapter('复盘');
  yield S(() => {
    beat({
      title: 'SSTF：单步最近，全局未必最公平',
      why: '每步扫描剩余请求找最近，O(n²)；总寻道短、实现直观，但边缘磁道可能饥饿，真实系统多用 SCAN/C-SCAN 或 LOOK。',
      stateText: '总寻道 ' + grand + ' · 平均 ' + (grand / Math.max(order.length, 1)).toFixed(1) + ' / 次',
      progress: 8,
      camera: SHOT_WIDE,
      annotations: [],
    });
    director.stateUpdate({ blocks: baseBlocks([], false), footerText: '应用：小型磁盘控制器；对比：SCAN 电梯调度、C-SCAN 循环扫描' });
    director.setProgress(8);
    status.textContent = 'SSTF 演示完成：' + r.length + ' 个请求 · 顺序 ' + order.map((o) => o.c).join('→') + ' · 总寻道 ' + grand + ' 柱面';
  });
  yield W(700);
}

function restart(nextReqs, from, autoPlay = true) {
  reqs = nextReqs.slice();
  start = from;
  engine.clear();
  director.reset();
  stage.reset();
  stage.setRequests(reqs, start);
  head = start;
  total = 0;
  servedSet = new Set();
  servedOrder = [];
  status.textContent = '';
  engine.queue(() => runSSTF());
  if (autoPlay) engine.toggle();
}

function parseReqs(text) {
  const s = String(text).trim();
  if (!s || !/^[0-9,\s]+$/.test(s)) return null;
  const arr = s.split(/[,\s]+/).filter(Boolean).map(Number);
  if (!arr.length || arr.length > 10 || arr.some((v) => !Number.isInteger(v) || v < 0 || v > 199)) return null;
  return arr;
}

const presetSel = input.addSelect('请求集', Object.keys(PRESETS).concat(['自定义']), presetName, (v) => {
  if (v === '自定义') { status.textContent = '在输入框输入 1–10 个 0–199 的柱面号（逗号或空格分隔），回车开始。'; return; }
  presetName = v;
  reqs = PRESETS[v].reqs.slice();
  start = PRESETS[v].start;
  startSel.value = String(start);
  restart(reqs, start, true);
});
const startSel = input.addSelect('起始磁头', ['0', '53', '100', '150', '199'], String(start), (v) => {
  start = Number(v);
  restart(reqs, start, true);
});
input.addInput('自定义请求，如 98,183,37', (v) => {
  const arr = parseReqs(v);
  if (!arr) { status.textContent = '输入无效：请输入 1–10 个 0–199 的整数，用逗号或空格分隔。'; return; }
  presetName = '自定义';
  presetSel.value = '自定义';
  restart(arr, start, true);
}, 60);
input.addButton('重播', () => restart(reqs, start, true));
input.addButton('清空', () => {
  engine.clear();
  director.reset();
  presetName = '经典 8 请求';
  reqs = PRESETS[presetName].reqs.slice();
  start = PRESETS[presetName].start;
  presetSel.value = presetName;
  startSel.value = String(start);
  stage.reset();
  stage.setRequests(reqs, start);
  head = start;
  total = 0;
  servedSet = new Set();
  servedOrder = [];
  status.textContent = '';
});

stage.setRequests(reqs, start);
engine.queue(() => runSSTF());
scene.start(engine);
window.addEventListener('pagehide', () => stage.remove(), { once: true });
