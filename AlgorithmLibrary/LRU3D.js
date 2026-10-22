// AlgorithmLibrary/LRU3D.js — 最近最久未用页面置换：命中把页升到栈顶，缺页淘汰栈底。
// 页框、最近使用栈和引用串同步变化，最后对比 LRU 与 FIFO 的缺页次数与栈性质。
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { applyTheme } from '../3D/Glow.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
import { MemoryStage } from '../3D/director/OSStage.js';
applyTheme('LRU3D');

const GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, BLUE = 0x3b82f6, BLUE_EM = 0x1d4ed8;
const REFS = {
  '经典 20 次': [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1],
  'Belady 12 次': [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5],
  '局部性 12 次': [1, 2, 3, 1, 2, 4, 1, 2, 5, 1, 2, 3],
};
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
let recency = [];
let faults = 0, hits = 0;
let history = [];

const director = new StoryDirector(scene, {
  title: 'LRU · 最近最久未用',
  total: 8,
  legend: [
    { label: '页框', color: '#60a5fa' },
    { label: '最近使用', color: '#fcd34d' },
    { label: '命中', color: '#4ade80' },
    { label: '最旧/换出', color: '#fb7185' },
  ],
  onReplay: () => restart(ref, frames, true),
});
const beat = (cfg) => director.beat(NARROW ? { ...cfg, annotations: cfg.annotations?.slice(0, 2) } : cfg);

function simLRU(r, n) {
  const sl = Array(n).fill(null);
  let rec = [];
  let f = 0, h = 0;
  const events = [], hist = [];
  r.forEach((page, i) => {
    let fi = sl.indexOf(page);
    let victim = null;
    const hit = fi >= 0;
    if (hit) {
      h++;
      rec = [page].concat(rec.filter((x) => x !== page));
    } else {
      f++;
      const empty = sl.indexOf(null);
      if (empty >= 0) fi = empty;
      else {
        victim = rec.pop();
        fi = sl.indexOf(victim);
        hist.push(victim);
      }
      sl[fi] = page;
      rec = [page].concat(rec.filter((x) => x !== page));
    }
    events.push({
      i, page, hit, fi, victim, slots: sl.slice(), recency: rec.slice(),
      faults: f, hits: h, history: hist.slice(),
    });
  });
  return { events, faults: f, hits: h, history: hist };
}
function simFIFO(r, n) {
  const sl = Array(n).fill(null);
  const load = Array(n).fill(-1);
  let f = 0;
  r.forEach((page, i) => {
    if (sl.indexOf(page) >= 0) return;
    f++;
    const empty = sl.indexOf(null);
    let fi = empty;
    if (fi < 0) {
      fi = 0;
      for (let j = 1; j < n; j++) if (load[j] < load[fi]) fi = j;
    }
    sl[fi] = page;
    load[fi] = i;
  });
  return f;
}
function lruNotes(sl, rec) {
  return sl.map((v) => {
    if (v === null) return '空';
    const rank = rec.indexOf(v);
    if (rank === 0) return '最近';
    if (rank === rec.length - 1) return '最旧 ← 淘汰';
    return '第 ' + (rank + 1) + ' 近';
  });
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
      type: 'chips', label: '最近使用栈', hint: '最近 → 最旧',
      items: recency.map((v, i) => ({ text: v, cls: i === 0 ? 'head' : i === recency.length - 1 ? 'reject' : '' })),
      empty: '空',
    },
    {
      type: 'chips', label: '置换历史', hint: '最新在后',
      items: history.slice(-6).map((v) => ({ text: '换出 ' + v, cls: 'reject' })),
      empty: '尚未换出',
    },
  ].concat(extra);
}
function sync(note) {
  director.stateUpdate({ blocks: baseBlocks(), footerText: 'LRU：命中升到栈顶，缺页淘汰最久未用的页（栈底）' });
  director.setBeatState(note);
}

function* stepEvent(ev, slow = true) {
  stage.markRef(ev.i, 'current');
  if (ev.hit) {
    stage.setFrames(ev.slots, lruNotes(ev.slots, ev.recency));
    stage.flashFrame(ev.fi, GOLD);
    stage.setStack(ev.recency);
    yield W(slow ? 300 : 180);
    stage.flashFrame(ev.fi, GREEN);
    stage.markRef(ev.i, 'hit');
    status.textContent = 't=' + (ev.i + 1) + ' 引用 ' + ev.page + '：命中帧 ' + ev.fi + '，升到最近使用栈顶；淘汰顺序随之更新';
  } else if (ev.victim !== null) {
    stage.flashFrame(ev.fi, RED);
    stage.sinkFrame(ev.fi);
    yield W(slow ? 330 : 200);
    stage.setFrames(ev.slots, lruNotes(ev.slots, ev.recency));
    stage.flashFrame(ev.fi, GOLD);
    stage.setStack(ev.recency);
    stage.markRef(ev.i, 'fault');
    status.textContent = 't=' + (ev.i + 1) + ' 引用 ' + ev.page + '：缺页，淘汰栈底最久未用的 ' + ev.victim + '（帧 ' + ev.fi + '）';
  } else {
    stage.setFrames(ev.slots, lruNotes(ev.slots, ev.recency));
    stage.flashFrame(ev.fi, GOLD);
    stage.setStack(ev.recency);
    stage.markRef(ev.i, 'fault');
    status.textContent = 't=' + (ev.i + 1) + ' 引用 ' + ev.page + '：缺页，装入空帧 ' + ev.fi + '，新页成为最近使用';
  }
  slots = ev.slots.slice();
  recency = ev.recency.slice();
  faults = ev.faults;
  hits = ev.hits;
  history = ev.history.slice();
  sync(ev.hit ? '命中：' + ev.page + ' 升到栈顶' : '缺页：' + ev.page + ' 入栈' + (ev.victim !== null ? '，淘汰 ' + ev.victim : ''));
  yield W(slow ? 320 : 190);
  if (!ev.hit) stage.flashFrame(ev.fi, BLUE, BLUE_EM);
}

function* runLRU() {
  const r = ref.slice();
  const n = frames;
  const sim = simLRU(r, n);
  const evs = sim.events;
  const firstEvict = evs.findIndex((e) => e.victim !== null);
  slots = Array(n).fill(null);
  recency = [];
  faults = 0; hits = 0; history = [];
  stage.reset(n);
  stage.setReference(r);
  stage.setStack([]);

  // 1 · 舞台
  director.chapter('舞台');
  yield S(() => {
    beat({
      title: '最近使用栈：谁最久没被碰，谁先走',
      why: 'LRU 给每页维护一个“最近使用”位置：命中就升到栈顶，缺页就淘汰栈底——也就是最久没有被引用的页。',
      stateText: '引用串 ' + r.length + ' 次 · ' + n + ' 个页框',
      progress: 1,
      camera: SHOT_WIDE,
      annotations: [
        { id: 'frames', text: n + ' 个页框：初始全空', anchor: () => stage.framePos(0), offset: [0, -46], className: 'gold' },
        { id: 'stack', text: '最近使用栈：栈顶最近，栈底最旧', anchor: () => stage.stackLabelPos(), offset: [0, -38] },
        { id: 'refs', text: '引用串：每次读一个页号', anchor: () => stage.refPos(0), offset: [0, -40] },
      ],
    });
    sync('页框为空，准备引用');
    status.textContent = 'LRU：' + r.length + ' 次引用 / ' + n + ' 个页框；命中刷新“最近”，缺页淘汰最久未用。';
  });
  yield W(900);

  // 2 · 填充页框（第一次换出之前的引用）
  const cut2 = firstEvict >= 0 ? firstEvict : Math.min(n, evs.length);
  director.chapter('装页');
  yield S(() => {
    beat({
      title: '冷启动：空帧逐页装入',
      why: '页框还没满时，缺页直接装入空帧；每装入一页，它就成为最近使用。',
      stateText: '已引用 ' + Math.min(cut2, n) + ' 页',
      progress: 2,
      camera: SHOT_FRAMES,
      annotations: [{ id: 'f', text: '新页进入最近使用栈顶', anchor: () => stage.framePos(0), offset: [0, -46] }],
    });
  });
  for (let i = 0; i < cut2; i++) yield* stepEvent(evs[i], false);
  yield W(350);

  // 3 · 第一次缺页换出
  director.chapter('换出');
  const ev3 = evs[cut2];
  yield S(() => {
    beat({
      title: ev3 && ev3.victim !== null ? '第一次换出：淘汰栈底' : '没有发生换出',
      why: ev3 && ev3.victim !== null ? '页框已满且引用不在内存：LRU 从栈底取出最久未用的页，让新页入栈顶。' : '引用串还没有填满页框，或一直命中。',
      stateText: ev3 ? 't=' + (ev3.i + 1) + ' · 引用 ' + ev3.page : '页框足够',
      progress: 3,
      camera: SHOT_FRAMES,
      annotations: ev3 && ev3.victim !== null ? [{ id: 'v', text: '淘汰最久未用的 ' + ev3.victim, anchor: () => stage.framePos(ev3.fi), offset: [0, -46], className: 'warn' }] : [],
    });
  });
  if (ev3) yield* stepEvent(ev3);
  yield W(320);

  // 4 · 命中：升到栈顶
  director.chapter('命中');
  const ev4 = evs[cut2 + 1];
  yield S(() => {
    beat({
      title: ev4 && ev4.hit ? '命中：升到栈顶' : '继续引用',
      why: ev4 && ev4.hit ? '命中不换页，但会改变“最近使用”顺序：这一页从原位置升到栈顶，暂时不会被淘汰。' : '缺页继续按栈底淘汰；命中则刷新最近使用顺序。',
      stateText: ev4 ? 't=' + (ev4.i + 1) + ' · 引用 ' + ev4.page : '—',
      progress: 4,
      camera: SHOT_FRAMES,
      annotations: ev4 ? [{ id: 'f', text: ev4.hit ? '命中页升到栈顶' : '缺页：看栈底是谁', anchor: () => stage.framePos(ev4.fi), offset: [0, -46], className: ev4.hit ? 'gold' : 'warn' }] : [],
    });
  });
  if (ev4) yield* stepEvent(ev4);
  yield W(320);

  // 5 · 连续引用
  director.chapter('连续引用');
  const start5 = cut2 + 2;
  const group5 = evs.slice(start5, start5 + 6);
  yield S(() => {
    beat({
      title: '连续引用：栈随每次访问重排',
      why: 'LRU 的核心是“最近性”：命中升顶、缺页淘汰栈底。栈里始终保存当前页框的最近使用顺序。',
      stateText: group5.length ? 't=' + (group5[0].i + 1) + ' → ' + (group5[group5.length - 1].i + 1) : '引用已结束',
      progress: 5,
      camera: SHOT_REFS,
      annotations: [{ id: 'r', text: '绿=命中，红=缺页', anchor: () => stage.refPos(Math.min(r.length - 1, start5)), offset: [0, -42] }],
    });
  });
  for (const ev of group5) yield* stepEvent(ev, false);
  yield W(320);

  // 6 · 走完引用串
  director.chapter('走完引用串');
  const start6 = start5 + 6;
  yield S(() => {
    beat({
      title: '走完引用串：LRU 的命中率',
      why: 'LRU 利用时间局部性：最近用过的页很可能马上再用。代价是每次访问都要更新最近使用顺序。',
      stateText: 't=' + Math.min(start6 + 1, r.length) + ' → ' + r.length,
      progress: 6,
      camera: SHOT_WIDE,
      annotations: [{ id: 'r', text: '初始缺页已结束，开始体现局部性', anchor: () => stage.refPos(r.length - 1), offset: [0, -42], className: 'final' }],
    });
  });
  for (let i = start6; i < evs.length; i++) yield* stepEvent(evs[i], false);
  slots = evs.length ? evs[evs.length - 1].slots.slice() : Array(n).fill(null);
  recency = evs.length ? evs[evs.length - 1].recency.slice() : [];
  faults = sim.faults; hits = sim.hits; history = sim.history.slice();
  yield S(() => { sync('LRU 统计：缺页 ' + faults + ' / 命中 ' + hits); status.textContent = 'LRU 缺页 ' + faults + ' 次，命中 ' + hits + ' 次（' + r.length + ' 次引用 / ' + n + ' 帧）'; });
  yield W(500);

  // 7 · 栈性质对比
  const l3 = simLRU(r, 3).faults, l4 = simLRU(r, 4).faults;
  const f3 = simFIFO(r, 3), f4 = simFIFO(r, 4);
  director.chapter('栈性质');
  yield S(() => {
    beat({
      title: '栈性质：LRU 加帧不会更差',
      why: 'LRU 的生存集具有包含关系（3 帧的驻留集 ⊆ 4 帧），所以 4 帧缺页不会多于 3 帧，不会出现 Belady 异常；FIFO 不满足这一点。',
      stateText: 'LRU 3 帧 ' + l3 + ' 次 / 4 帧 ' + l4 + ' 次',
      progress: 7,
      camera: SHOT_WIDE,
      annotations: [{ id: 's', text: '栈底最旧，先被淘汰', anchor: () => stage.stackLabelPos(), offset: [0, -38], className: 'gold' }],
    });
    director.stateUpdate({
      blocks: baseBlocks([{
        type: 'table', label: '缺页次数对比', hint: '同一引用串',
        rows: [['算法/帧', '3 帧', '4 帧'], ['LRU', l3, l4], ['FIFO', f3, f4]],
      }]),
      footerText: 'LRU 满足栈性质；FIFO 可能出现“加帧反而更多缺页”的 Belady 异常',
    });
    director.setBeatState('LRU 3 帧 ' + l3 + ' 次 / 4 帧 ' + l4 + ' 次；FIFO 3 帧 ' + f3 + ' 次 / 4 帧 ' + f4 + ' 次');
    status.textContent = 'LRU 完成：' + r.length + ' 次引用 / ' + n + ' 帧 · 缺页 ' + faults + ' 次 · 命中 ' + hits + ' 次 · 同串 FIFO 3 帧 ' + f3 + ' 次';
  });
  yield W(1100);

  // 8 · 复盘
  director.chapter('复盘');
  yield S(() => {
    beat({
      title: 'LRU：用最近性换命中率',
      why: '命中升栈顶、缺页淘汰栈底，能很好利用时间局部性；需要维护最近使用顺序，通常用哈希表 + 双向链表做到 O(1)。',
      stateText: '缺页率 ' + rate() + '% · 命中 ' + hits + ' 次',
      progress: 8,
      camera: SHOT_WIDE,
      annotations: [],
    });
    director.stateUpdate({ blocks: baseBlocks(), footerText: '应用：页缓存、Redis 淘汰；硬件常用 CLOCK/老化近似 LRU' });
    director.setProgress(8);
    status.textContent = 'LRU 演示完成：' + r.length + ' 次引用 / ' + n + ' 帧 · 缺页 ' + faults + ' 次 · 命中 ' + hits + ' 次 · 缺页率 ' + rate() + '%';
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
  recency = [];
  faults = 0; hits = 0; history = [];
  status.textContent = '';
  engine.queue(() => runLRU());
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
  slots = []; recency = []; faults = 0; hits = 0; history = [];
  status.textContent = '';
});

stage.reset(frames);
stage.setReference(ref);
stage.setStack([]);
engine.queue(() => runLRU());
scene.start(engine);
window.addEventListener('pagehide', () => stage.remove(), { once: true });
