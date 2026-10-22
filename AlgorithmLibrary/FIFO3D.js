// AlgorithmLibrary/FIFO3D.js — 先进先出页面置换：先装入的页最先被换出。
// 页框架逐次点亮命中/缺页，引用串记录历史；最后用 3 帧 vs 4 帧演示 Belady 异常。
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { applyTheme } from '../3D/Glow.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
import { MemoryStage } from '../3D/director/OSStage.js';
applyTheme('FIFO3D');

const GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, BLUE = 0x3b82f6, BLUE_EM = 0x1d4ed8;
const REFS = {
  '经典 20 次': [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1],
  'Belady 12 次': [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5],
  '局部性 12 次': [1, 2, 3, 1, 2, 4, 1, 2, 5, 1, 2, 3],
};
const BELADY = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5];
const NARROW = typeof matchMedia !== 'undefined' && matchMedia('(max-width: 900px)').matches;
const zs = (s, z) => NARROW ? { ...s, pos: s.target.map((v, i) => v + (s.pos[i] - v) * z) } : s;
const SHOT_WIDE = zs({ pos: [320, 650, 1000], target: [320, 470, 0], ms: 900 }, 0.72);
const SHOT_FRAMES = zs({ pos: [320, 650, 620], target: [320, 505, 0], ms: 820 }, 0.55);
const SHOT_REFS = zs({ pos: [320, 500, 620], target: [320, 290, 0], ms: 820 }, 0.55);

const scene = new Scene3D('scene', { cameraPos: [320, 660, 1000], lookAt: [320, 460, 0], fov: 50 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const input = new InputKit(panel);
const status = panel.addStatus('就绪');
const stage = new MemoryStage(scene, { y: 520 });

let presetName = '经典 20 次';
let ref = REFS[presetName].slice();
let frames = 3;
let slots = [];
let faults = 0, hits = 0;
let history = [];

const director = new StoryDirector(scene, {
  title: 'FIFO · 先进先出置换',
  total: 8,
  legend: [
    { label: '页框', color: '#60a5fa' },
    { label: '当前引用', color: '#fcd34d' },
    { label: '命中', color: '#4ade80' },
    { label: '缺页/换出', color: '#fb7185' },
  ],
  onReplay: () => restart(ref, frames, true),
});
const beat = (cfg) => director.beat(NARROW ? { ...cfg, annotations: cfg.annotations?.slice(0, 2) } : cfg);

function simFIFO(r, n) {
  const sl = Array(n).fill(null);
  const load = Array(n).fill(-1);
  let f = 0, h = 0;
  const events = [];
  const hist = [];
  r.forEach((page, i) => {
    let fi = sl.indexOf(page);
    let victim = null;
    const hit = fi >= 0;
    if (hit) h++;
    else {
      f++;
      const empty = sl.indexOf(null);
      if (empty >= 0) fi = empty;
      else {
        fi = 0;
        for (let j = 1; j < n; j++) if (load[j] < load[fi]) fi = j;
        victim = sl[fi];
        hist.push(victim);
      }
      sl[fi] = page;
      load[fi] = i;
    }
    events.push({
      i, page, hit, fi, victim, slots: sl.slice(), loads: load.slice(),
      faults: f, hits: h, history: hist.slice(),
    });
  });
  return { events, faults: f, hits: h, history: hist };
}
function notesFor(sl, load) {
  const occ = sl.map((v, i) => v === null ? -1 : i).filter((i) => i >= 0)
    .sort((a, b) => load[a] - load[b]);
  const notes = sl.map((v) => v === null ? '空' : '');
  occ.forEach((fi, rank) => {
    notes[fi] = rank === 0 ? '最老 ← 换出' : rank === occ.length - 1 ? '最新' : '第 ' + (rank + 1) + ' 老';
  });
  return notes;
}
function rate() { return ref.length ? ((faults / ref.length) * 100).toFixed(1) : '0.0'; }
function baseBlocks(extra = []) {
  return [
    {
      type: 'chips', label: '页框', hint: frames + ' 帧',
      items: slots.map((v, i) => ({ text: '帧' + i + ': ' + (v === null ? '空' : v), cls: v === null ? '' : 'queue' })),
      empty: '空',
    },
    {
      type: 'kv', label: '缺页统计',
      items: [
        { k: '缺页', v: faults }, { k: '命中', v: hits },
        { k: '缺页率', v: rate() + '%' }, { k: '引用', v: ref.length + ' 次' },
      ],
    },
    {
      type: 'chips', label: '置换历史', hint: '最新在后',
      items: history.slice(-6).map((v) => ({ text: '换出 ' + v, cls: 'reject' })),
      empty: '尚未换出',
    },
  ].concat(extra);
}
function sync(note) {
  director.stateUpdate({ blocks: baseBlocks(), footerText: 'FIFO：缺页时换出最早装入的页（没有命中则不改变队列）' });
  director.setBeatState(note);
}

function* stepEvent(ev, slow = true) {
  stage.markRef(ev.i, 'current');
  if (ev.hit) {
    stage.flashFrame(ev.fi, GOLD);
    yield W(slow ? 300 : 180);
    stage.flashFrame(ev.fi, GREEN);
    stage.markRef(ev.i, 'hit');
    status.textContent = 't=' + (ev.i + 1) + ' 引用 ' + ev.page + '：命中帧 ' + ev.fi + '，页框和 FIFO 队列都不变';
  } else if (ev.victim !== null) {
    stage.flashFrame(ev.fi, RED);
    stage.sinkFrame(ev.fi);
    yield W(slow ? 330 : 200);
    stage.setFrames(ev.slots, notesFor(ev.slots, ev.loads));
    stage.flashFrame(ev.fi, GOLD);
    stage.markRef(ev.i, 'fault');
    status.textContent = 't=' + (ev.i + 1) + ' 引用 ' + ev.page + '：缺页，换出最早装入的 ' + ev.victim + '（帧 ' + ev.fi + '）';
  } else {
    stage.setFrames(ev.slots, notesFor(ev.slots, ev.loads));
    stage.flashFrame(ev.fi, GOLD);
    stage.markRef(ev.i, 'fault');
    status.textContent = 't=' + (ev.i + 1) + ' 引用 ' + ev.page + '：缺页，装入空帧 ' + ev.fi;
  }
  slots = ev.slots.slice();
  faults = ev.faults;
  hits = ev.hits;
  history = ev.history.slice();
  sync(ev.hit ? '命中：' + ev.page + ' 已在帧 ' + ev.fi : '缺页：装入页 ' + ev.page + (ev.victim !== null ? '，换出 ' + ev.victim : ''));
  yield W(slow ? 320 : 190);
  if (!ev.hit) stage.flashFrame(ev.fi, BLUE, BLUE_EM);
}

function* runFIFO() {
  const r = ref.slice();
  const n = frames;
  const sim = simFIFO(r, n);
  const evs = sim.events;
  const firstEvict = evs.findIndex((e) => e.victim !== null);
  slots = Array(n).fill(null);
  faults = 0; hits = 0; history = [];
  stage.reset(n);
  stage.setReference(r);
  stage.setStack([]);

  // 1 · 舞台
  director.chapter('舞台');
  yield S(() => {
    beat({
      title: '内存页框：先来先住，先来先走',
      why: 'FIFO 把每个页框看作队列：装入顺序决定淘汰顺序，最早进来的页最先被换出。',
      stateText: '引用串 ' + r.length + ' 次 · ' + n + ' 个页框',
      progress: 1,
      camera: SHOT_WIDE,
      annotations: [
        { id: 'frames', text: n + ' 个页框：初始全空', anchor: () => stage.framePos(0), offset: [0, -46], className: 'gold' },
        { id: 'refs', text: '引用串：每次读一个页号', anchor: () => stage.refPos(0), offset: [0, -40] },
      ],
    });
    sync('页框为空，准备引用');
    status.textContent = 'FIFO：' + r.length + ' 次引用 / ' + n + ' 个页框；每次缺页都换出最早装入的页。';
  });
  yield W(900);

  // 2 · 填满页框（及第一次换出前的命中）
  const cut2 = firstEvict >= 0 ? firstEvict : Math.min(n, evs.length);
  const fillEvs = evs.slice(0, cut2);
  const fillFaults = fillEvs.filter((e) => !e.hit).length;
  const fillHits = fillEvs.length - fillFaults;
  director.chapter('装页');
  yield S(() => {
    beat({
      title: '冷启动：前 ' + fillEvs.length + ' 次引用' + (fillHits ? '，缺页 ' + fillFaults + ' / 命中 ' + fillHits : '都缺页'),
      why: fillHits
        ? '前 ' + fillEvs.length + ' 次引用中缺页 ' + fillFaults + ' 次、命中 ' + fillHits + ' 次；命中不会改变 FIFO 的装入顺序。'
        : '空页框先被填满。此时还没有“换出”，只是把页装入内存。',
      stateText: '页框逐渐装满',
      progress: 2,
      camera: SHOT_FRAMES,
      annotations: [{ id: 'f', text: fillHits ? '缺页装入，命中不改变队列' : '每个空帧对应一次缺页', anchor: () => stage.framePos(0), offset: [0, -46] }],
    });
  });
  for (let i = 0; i < cut2; i++) {
    yield* stepEvent(evs[i], false);
  }
  yield W(350);

  // 3 · 第一次换出（或确认没有换出）
  const ev3 = evs[cut2];
  const hasEvict = !!ev3 && ev3.victim !== null;
  director.chapter(hasEvict ? '换出' : '无换出');
  yield S(() => {
    beat({
      title: hasEvict
        ? '第一次缺页换出：最老的页先走'
        : ev3 ? (ev3.hit ? '没有发生换出：直接命中' : '没有发生换出：页框未满') : '没有发生换出：引用已结束',
      why: hasEvict
        ? '页框已满时，FIFO 不再看页是否常用，只按装入顺序淘汰最早进来的那一页。'
        : '当前引用串没有触发 FIFO 置换：页框未被填满，或后续引用都命中了。',
      stateText: ev3 ? 't=' + (ev3.i + 1) + ' · 引用 ' + ev3.page + (hasEvict ? '' : ev3.hit ? ' · 命中' : ' · 缺页') : '页框足够',
      progress: 3,
      camera: SHOT_FRAMES,
      annotations: hasEvict
        ? [{ id: 'v', text: '换出最早装入的页', anchor: () => stage.framePos(ev3.fi), offset: [0, -46], className: 'warn' }]
        : ev3 ? [{ id: 'f', text: ev3.hit ? '页已在内存，没有换出' : '装入空帧，没有换出', anchor: () => stage.framePos(ev3.fi), offset: [0, -46] }] : [],
    });
  });
  if (ev3) yield* stepEvent(ev3);
  yield W(320);

  // 4 · 下一个事件（命中或继续换出）
  director.chapter('命中');
  const ev4 = evs[cut2 + 1];
  yield S(() => {
    beat({
      title: ev4 ? (ev4.hit ? '命中：不用换页' : '继续缺页：再换一页') : '引用结束',
      why: ev4 ? (ev4.hit ? 'FIFO 命中时只读页框，不改动装入顺序。' : '命中不会更新 FIFO 队列，这和 LRU 不同。') : '没有更多引用。',
      stateText: ev4 ? 't=' + (ev4.i + 1) + ' · 引用 ' + ev4.page : '—',
      progress: 4,
      camera: SHOT_FRAMES,
      annotations: ev4 ? [{ id: 'f', text: ev4.hit ? '页已在内存' : '页不在内存', anchor: () => stage.framePos(ev4.fi), offset: [0, -46], className: ev4.hit ? '' : 'warn' }] : [],
    });
  });
  if (ev4) yield* stepEvent(ev4);
  yield W(320);

  // 5 · 连续换出
  director.chapter('连续引用');
  const start5 = cut2 + 2;
  const group5 = evs.slice(start5, start5 + 6);
  yield S(() => {
    beat({
      title: '连续引用：缺页与命中交替',
      why: '每次缺页都要选择牺牲页；FIFO 的选择只看装入时间，可能把后面马上要用的页换出去。',
      stateText: group5.length ? 't=' + (group5[0].i + 1) + ' → ' + (group5[group5.length - 1].i + 1) : '引用已结束',
      progress: 5,
      camera: SHOT_REFS,
      annotations: [{ id: 'r', text: '已引用的页：绿=命中，红=缺页', anchor: () => stage.refPos(Math.min(r.length - 1, start5)), offset: [0, -42] }],
    });
  });
  for (const ev of group5) yield* stepEvent(ev, false);
  yield W(320);

  // 6 · 走完引用串
  director.chapter('走完引用串');
  const start6 = start5 + 6;
  yield S(() => {
    beat({
      title: '走完引用串：统计命中与缺页',
      why: '命中率取决于引用模式与页框数。FIFO 实现简单，但对访问局部性的适应能力弱。',
      stateText: 't=' + Math.min(start6 + 1, r.length) + ' → ' + r.length,
      progress: 6,
      camera: SHOT_WIDE,
      annotations: [{ id: 'r', text: '最后统计：缺页 ' + sim.faults + ' 次', anchor: () => stage.refPos(r.length - 1), offset: [0, -42], className: 'final' }],
    });
  });
  for (let i = start6; i < evs.length; i++) yield* stepEvent(evs[i], false);
  slots = sim.events.length ? sim.events[sim.events.length - 1].slots.slice() : Array(n).fill(null);
  faults = sim.faults; hits = sim.hits; history = sim.history.slice();
  yield S(() => { sync('FIFO 统计：缺页 ' + faults + ' / 命中 ' + hits); status.textContent = 'FIFO 缺页 ' + faults + ' 次，命中 ' + hits + ' 次（' + r.length + ' 次引用 / ' + n + ' 帧）'; });
  yield W(500);

  // 7 · Belady 异常
  const f3 = simFIFO(r, 3).faults, f4 = simFIFO(r, 4).faults;
  const b3 = simFIFO(BELADY, 3).faults, b4 = simFIFO(BELADY, 4).faults;
  const anomaly = f4 > f3;
  director.chapter('Belady 异常');
  yield S(() => {
    beat({
      title: 'Belady 异常：多给页框反而更缺页',
      why: 'FIFO 不满足栈性质：增加帧数可能改变换出时机，使缺页次数上升。示例串 1,2,3,4,1,2,5,1,2,3,4,5 在 3 帧缺 ' + b3 + ' 次、4 帧缺 ' + b4 + ' 次。',
      stateText: anomaly ? '当前引用串也出现了异常：4 帧缺页更多' : '当前引用串：3 帧 ' + f3 + ' 次 / 4 帧 ' + f4 + ' 次',
      progress: 7,
      camera: SHOT_WIDE,
      annotations: [{ id: 'b', text: '帧数↑ ≠ 缺页↓', anchor: () => stage.framePos(0), offset: [0, -46], className: 'warn' }],
    });
    director.stateUpdate({
      blocks: baseBlocks([{
        type: 'table', label: '缺页次数对比', hint: '同一引用串',
        rows: [['引用串', '3 帧', '4 帧'], ['当前', f3, f4], ['Belady 示例', b3, b4]],
      }]),
      footerText: 'FIFO 不满足栈性质；LRU 满足栈性质，不会出现 Belady 异常',
    });
    director.setBeatState('3 帧缺 ' + f3 + ' 次，4 帧缺 ' + f4 + ' 次' + (anomaly ? '（异常）' : ''));
    status.textContent = 'FIFO 完成：' + r.length + ' 次引用 / ' + n + ' 帧 · 缺页 ' + faults + ' 次 · 命中 ' + hits + ' 次 · Belady 示例 3 帧 ' + b3 + ' 次 / 4 帧 ' + b4 + ' 次';
  });
  yield W(1100);

  // 8 · 复盘
  director.chapter('复盘');
  yield S(() => {
    beat({
      title: 'FIFO：队列语义，简单但有异常',
      why: '按装入顺序淘汰，O(1) 实现、无需记录访问历史；缺点是可能换出仍会频繁使用的页，且可能出现 Belady 异常。',
      stateText: '缺页率 ' + rate() + '% · 命中 ' + hits + ' 次',
      progress: 8,
      camera: SHOT_WIDE,
      annotations: [],
    });
    director.stateUpdate({ blocks: baseBlocks(), footerText: '应用：最简置换基线；实际系统常用 CLOCK 等近似算法' });
    director.setProgress(8);
    status.textContent = 'FIFO 演示完成：' + r.length + ' 次引用 / ' + n + ' 帧 · 缺页 ' + faults + ' 次 · 命中 ' + hits + ' 次 · 缺页率 ' + rate() + '%';
  });
  yield W(700);
}

function restart(nextRef, n, autoPlay = true) {
  ref = nextRef.slice();
  frames = n;
  engine.clear();
  director.reset();
  stage.reset(n);
  stage.setReference(ref);
  stage.setStack([]);
  slots = Array(n).fill(null);
  faults = 0; hits = 0; history = [];
  status.textContent = '';
  engine.queue(() => runFIFO());
  if (autoPlay) engine.toggle();
}

function parseRef(text) {
  const s = String(text).trim();
  if (!s || !/^[0-9,\s]+$/.test(s)) return null;
  const arr = s.split(/[,\s]+/).filter(Boolean).map(Number);
  if (!arr.length || arr.length > 20 || arr.some((v) => !Number.isInteger(v) || v < 0 || v > 9)) return null;
  return arr;
}

const presetSel = input.addSelect('引用串', Object.keys(REFS).concat(['自定义']), presetName, (v) => {
  if (v === '自定义') { status.textContent = '在输入框输入 1–20 个 0–9 的数字（逗号或空格分隔），回车开始。'; return; }
  presetName = v;
  ref = REFS[v].slice();
  restart(ref, frames, true);
});
const frameSel = input.addSelect('页框数', ['3', '4'], String(frames), (v) => {
  frames = Number(v);
  restart(ref, frames, true);
});
input.addInput('自定义引用串，如 7,0,1,2', (v) => {
  const arr = parseRef(v);
  if (!arr) { status.textContent = '输入无效：请输入 1–20 个 0–9 的数字，用逗号或空格分隔。'; return; }
  presetName = '自定义';
  presetSel.value = '自定义';
  ref = arr;
  restart(ref, frames, true);
}, 60);
input.addButton('重播', () => restart(ref, frames, true));
input.addButton('清空', () => {
  engine.clear();
  director.reset();
  presetName = '经典 20 次';
  ref = REFS[presetName].slice();
  frames = 3;
  presetSel.value = presetName;
  frameSel.value = String(frames);
  stage.reset(frames);
  stage.setReference(ref);
  stage.setStack([]);
  slots = []; faults = 0; hits = 0; history = [];
  status.textContent = '';
});

stage.reset(frames);
stage.setReference(ref);
stage.setStack([]);
engine.queue(() => runFIFO());
scene.start(engine);
window.addEventListener('pagehide', () => stage.remove(), { once: true });
