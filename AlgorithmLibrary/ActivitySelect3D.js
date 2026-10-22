// AlgorithmLibrary/ActivitySelect3D.js — 活动选择：时间轴区间条，按结束时间贪心，选中的活动滑入打包车道。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VNode, tubeBetween } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
applyTheme('ActivitySelect3D');

const scene = new Scene3D('scene', { cameraPos: [460, 680, 900], lookAt: [320, 470, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const input = new InputKit(panel);
const status = panel.addStatus('就绪');

const BASE = 0x64748b, DIM = 0x334155, GOLD = 0xfde047, ROSE = 0xfb7185, CYAN = 0x22d3ee, DONE = 0x4ade80;
const PRESETS = {
  '经典 11 活动': [[1, 4], [3, 5], [0, 6], [5, 7], [3, 9], [5, 9], [6, 10], [8, 11], [8, 12], [2, 14], [12, 16]],
  '5 活动': [[1, 3], [2, 5], [4, 6], [6, 8], [7, 10]],
};
let ACTS = PRESETS['经典 11 活动'].map((a, i) => ({ id: i + 1, s: a[0], f: a[1] }));
let sorted = [];
let order = [];
let flags = [];
let stageGroup = [];
let barBy = new Map();
let labels = [];
let axisMesh = null;
let tray = null;
let laneLabel = null;
let marker = null;
let chosen = [];
let cur = null;
let last = 0;
let idx = 0;
let X0 = 80, K = 27;

const director = new StoryDirector(scene, {
  title: '活动选择 · 打包',
  total: 8,
  legend: [
    { label: '候选区间', color: '#64748b' },
    { label: '已选打包', color: '#fde047' },
    { label: '冲突跳过', color: '#fb7185' },
    { label: 'last 指针', color: '#22d3ee' },
  ],
  onReplay: () => restart(true),
});

function barX(a) { return X0 + ((a.s + a.f) / 2) * K; }
function barW(a) { return Math.max(8, (a.f - a.s + 1) * K - 2); }

function state() {
  return {
    blocks: [
      { type: 'kv', label: '当前活动', items: cur
        ? [{ k: '活动', v: 'A' + cur.id + '（' + cur.s + '~' + cur.f + '）' }, { k: 'last', v: last }, { k: '判定', v: cur.verdict }]
        : [{ k: '活动', v: '—' }, { k: 'last', v: last }, { k: '判定', v: '—' }] },
      { type: 'chips', label: '已选活动', items: chosen.map((a) => ({ text: 'A' + a.id + '(' + a.s + '-' + a.f + ')', cls: 'done' })), empty: '—' },
      { type: 'chips', label: '按结束时间扫描', items: sorted.map((a, k) => ({
        text: 'A' + a.id,
        cls: k < idx ? (flags[k] ? 'done' : 'closed') : k === idx ? 'current' : '',
      })) },
      { type: 'text', label: '最多兼容活动', value: chosen.length + ' 个' },
    ],
    footer: '兼容条件：开始时间 ≥ last（已选活动的最晚结束）',
  };
}

const SHOT_ESTABLISH = { pos: [480, 710, 920], target: [320, 470, 0], ms: 900 };
const SHOT_SORT = { pos: [320, 880, 680], target: [320, 510, 0], ms: 850 };
const SHOT_LANE = { pos: [490, 620, 760], target: [320, 660, 0], ms: 800 };
const SHOT_FINAL = { pos: [400, 540, 980], target: [320, 480, 0], ms: 950 };
const followShot = (b, ms = 650) => ({ pos: [b.mesh.position.x + 250, b.mesh.position.y + 220, 540], target: [b.mesh.position.x, b.mesh.position.y, 0], ms });
const ease = (p) => p * p * (3 - 2 * p);

function release(obj) {
  if (!obj) return;
  const root = obj.mesh || obj.sprite || obj;
  obj.remove?.();
  scene.remove(root);
  root.traverse?.((o) => {
    if (o.geometry && !o.isSprite) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
  });
}

function clearBuild() {
  [...stageGroup, ...labels, axisMesh, tray, laneLabel, marker].forEach(release);
  stageGroup = []; labels = []; axisMesh = null; tray = null; laneLabel = null; marker = null;
  barBy.clear();
}

function compute() {
  sorted = ACTS.slice().sort((a, b) => a.f - b.f || a.s - b.s);
  flags = [];
  let end = 0;
  for (const a of sorted) {
    const ok = a.s >= end;
    flags.push(ok);
    if (ok) end = a.f;
  }
  order = sorted.filter((_, k) => flags[k]).map((a) => a.id);
}

function build() {
  clearBuild();
  compute();
  const maxF = Math.max(...ACTS.map((a) => a.f), 1);
  K = Math.min(28, 440 / Math.max(maxF, 1));
  const y0 = 540;
  const per = Math.min(30, 260 / Math.max(sorted.length, 1));
  stageGroup = sorted.map((a, k) => {
    const b = new VBox(scene, {
      w: barW(a), h: 20, d: 18, x: barX(a), y: y0 - k * per, z: 0,
      label: 'A' + a.id, color: BASE, emissive: BASE,
    });
    b.label.scale.multiplyScalar(0.5);
    return b;
  });
  sorted.forEach((a, k) => barBy.set(a.id, stageGroup[k]));

  axisMesh = tubeBetween(scene, { x: X0, y: 240, z: 0 }, { x: X0 + maxF * K, y: 240, z: 0 }, { color: 0x60a5fa, opacity: 0.5, radius: 1.5 });
  labels.push(new VText(scene, { text: '时间 →', x: X0 + maxF * K + 46, y: 240, z: 0, color: '#94a3b8', scale: 0.42 }));
  for (let t = 0; t <= maxF; t += Math.max(1, Math.ceil(maxF / 4))) {
    labels.push(new VText(scene, { text: String(t), x: X0 + t * K, y: 214, z: 0, color: '#64748b', scale: 0.38 }));
  }
  tray = new VBox(scene, {
    w: maxF * K + 18, h: 34, d: 10, x: X0 + maxF * K / 2, y: 690, z: -4,
    color: 0x0a0f2e, emissive: 0x0a0f2e,
  });
  tray.mesh.material.transparent = true;
  tray.mesh.material.opacity = 0.35;
  laneLabel = new VText(scene, { text: '打包时间轴（已选活动）', x: X0 - 8, y: 728, z: 0, color: '#fde047', scale: 0.44 });
  labels.push(new VText(scene, { text: '候选活动 · 按结束时间排序', x: X0 - 8, y: y0 + 28, z: 0, color: '#94a3b8', scale: 0.42 }));
  marker = new VNode(scene, { radius: 7, x: X0, y: 722, z: 0, color: CYAN, emissive: CYAN });
  chosen = []; cur = null; last = 0; idx = 0;
  director.stateUpdate(state());
}

function* selectBar(a, beatInfo) {
  const b = barBy.get(a.id);
  const targetY = 690;
  const fromY = b.mesh.position.y;
  b.setColor(GOLD, GOLD);
  b.setText('A' + a.id + ' ✓');
  const x = b.mesh.position.x;
  yield A(460, (p) => { b.mesh.position.y = fromY + (targetY - fromY) * ease(p); });
  b.mesh.position.set(x, targetY, 0);
  chosen.push(a);
  last = a.f;
  const mx = X0 + a.f * K;
  const fromMx = marker.mesh.position.x;
  yield A(380, (p) => { marker.mesh.position.x = fromMx + (mx - fromMx) * ease(p); });
  marker.mesh.position.set(mx, 722, 0);
  cur = { id: a.id, s: a.s, f: a.f, verdict: '兼容 → 选中' };
  idx = sorted.indexOf(a) + 1;
  director.stateUpdate(state());
  director.camera.shot([x + 235, 760, 520], [x, 690, 0], { ms: 500 });
  director.setBeatState(beatInfo || ('A' + a.id + ' 选中 · last = ' + last));
}

function* rejectBar(a) {
  const b = barBy.get(a.id);
  b.setColor(ROSE, ROSE);
  cur = { id: a.id, s: a.s, f: a.f, verdict: '开始 ' + a.s + ' < last ' + last + ' → 跳过' };
  director.stateUpdate(state());
  director.setBeatState('A' + a.id + '（' + a.s + '~' + a.f + '）与已选重叠 · 跳过');
  yield W(240);
  b.setColor(DIM, DIM);
  idx = sorted.indexOf(a) + 1;
  director.stateUpdate(state());
  yield W(140);
}

function* rejectUntilNext() {
  while (idx < sorted.length && !flags[idx]) {
    yield* rejectBar(sorted[idx]);
    yield W(120);
  }
}

function* runActivity() {
  director.reset();
  selectedReset();
  director.stateUpdate(state());

  director.chapter('建立');
  yield S(() => director.beat({
    title: '活动时间轴',
    why: '一间教室、一堆带开始/结束时间的活动；目标是不重叠地排下最多活动。每根横条 = 一个时间区间。',
    stateText: ACTS.length + ' 个活动 · 时间轴 0–' + Math.max(...ACTS.map((a) => a.f)),
    progress: 0,
    camera: SHOT_ESTABLISH,
    annotations: [
      { id: 'axis', text: '时间轴', anchor: () => new THREE.Vector3(X0 + 40, 240, 0), offset: [0, -18] },
      { id: 'hook', text: '最多能排几个？', anchor: () => new THREE.Vector3(320, 620, 0), offset: [0, -22], className: 'final' },
    ],
  }));
  yield W(750);

  director.chapter('排序');
  stageGroup.forEach((b) => b.setColor(CYAN, CYAN));
  yield S(() => director.beat({
    title: '按结束时间升序',
    why: '结束越早，留给后面的时间越多。这是贪心选择的核心序——先看谁最早结束，而不是谁开始最早或持续最短。',
    stateText: '顺序 ' + sorted.map((a) => 'A' + a.id).join(' → '),
    progress: 1,
    camera: SHOT_SORT,
    annotations: [{ id: 'sort', text: '结束时间从早到晚', anchor: () => new THREE.Vector3(X0 + 30, 560, 0), offset: [0, -18], className: 'gold' }],
  }));
  yield W(650);
  stageGroup.forEach((b) => b.setColor(BASE, BASE));

  director.chapter('第一个');
  const first = sorted[0];
  cur = { id: first.id, s: first.s, f: first.f, verdict: '开始 ≥ last=0 → 选中' };
  director.stateUpdate(state());
  yield S(() => director.beat({
    title: '选最早结束的 A' + first.id,
    why: 'last 初始为 0，任何开始时间 ≥ 0 的活动都兼容；结束最早的 A' + first.id + ' 直接进入打包车道。',
    stateText: 'A' + first.id + '（' + first.s + '~' + first.f + '）· last → ' + first.f,
    progress: 2,
    camera: followShot(barBy.get(first.id)),
    annotations: [{ id: 'first', text: '结束最早 → 先选', anchor: () => barAnchor(first.id), offset: [0, -16], className: 'final' }],
  }));
  yield W(300);
  yield* selectBar(first);
  yield W(700);

  director.chapter('剔除冲突');
  yield S(() => director.beat({
    title: '跳过与 last 重叠的活动',
    why: '开始时间 < last 就会与已选区间重叠，不能兼容；贪心不回头改选，只继续向右扫描。',
    stateText: 'last = ' + last + ' · 检查后续活动',
    progress: 3,
    camera: SHOT_LANE,
    annotations: [{ id: 'last', text: 'last = ' + last, anchor: () => new THREE.Vector3(X0 + last * K, 725, 0), offset: [0, -16] }],
  }));
  yield* rejectUntilNext();
  yield W(500);

  director.chapter('继续选择');
  const second = sorted[idx];
  if (second) {
    yield S(() => director.beat({
      title: '选下一个兼容活动 A' + second.id,
      why: 'A' + second.id + ' 的开始 ' + second.s + ' ≥ last ' + last + '，与已选区间不重叠；选它并右移 last。',
      stateText: 'A' + second.id + '（' + second.s + '~' + second.f + '）',
      progress: 4,
      camera: followShot(barBy.get(second.id)),
      annotations: [{ id: 'next', text: '开始 ≥ last → 选中', anchor: () => barAnchor(second.id), offset: [0, -16], className: 'gold' }],
    }));
    yield W(250);
    yield* selectBar(second);
    yield W(650);
  } else {
    yield S(() => director.beat({
      title: '没有更多兼容活动',
      why: '扫描到达队尾，所有剩余活动都与 last 重叠。',
      stateText: '已选 ' + chosen.length + ' 个 · last = ' + last,
      progress: 4,
      camera: SHOT_LANE,
      annotations: [],
    }));
    yield W(700);
  }

  director.chapter('扫描到底');
  yield S(() => director.beat({
    title: '继续剔除，再选下一个',
    why: '对每个活动只做一次兼容判断；结束时间排序保证一旦兼容就可以安全选中，后续兼容活动会全部依次入列。',
    stateText: 'last = ' + last + ' · 已选 ' + chosen.length + ' 个',
    progress: 5,
    camera: SHOT_LANE,
    annotations: [{ id: 'pack', text: '已选区间在打包车道里', anchor: () => new THREE.Vector3(320, 720, 0), offset: [0, -18], className: 'gold' }],
  }));
  yield W(300);
  yield* rejectUntilNext();
  while (idx < sorted.length) {
    yield* selectBar(sorted[idx]);
    yield W(220);
    yield* rejectUntilNext();
  }

  director.chapter('收尾');
  if (chosen.length) {
    const minS = Math.min(...chosen.map((a) => a.s));
    const maxF = Math.max(...chosen.map((a) => a.f));
    yield S(() => director.beat({
      title: '最多 ' + chosen.length + ' 个活动',
      why: '打包车道里每个区间首尾相接，互不重叠；按结束时间贪心能证明这是最大数量。',
      stateText: chosen.map((a) => 'A' + a.id + '(' + a.s + '~' + a.f + ')').join(' · '),
      progress: 6,
      camera: SHOT_FINAL,
      annotations: [{ id: 'res', text: '打包 ' + minS + '~' + maxF + ' · ' + chosen.length + ' 个', anchor: () => new THREE.Vector3(320, 745, 0), offset: [0, -20], className: 'final' }],
    }));
  } else {
    yield S(() => director.beat({
      title: '没有可安排的活动',
      why: '所有活动区间互相冲突或数据为空。',
      stateText: '已选 0 个',
      progress: 6,
      camera: SHOT_FINAL,
      annotations: [],
    }));
  }
  const covered = chosen.length ? (Math.max(...chosen.map((a) => a.f)) - Math.min(...chosen.map((a) => a.s)) + 1) : 0;
  status.textContent = '活动选择演示完成：' + ACTS.length + ' 个活动最多兼容 ' + chosen.length + ' 个（' +
    chosen.map((a) => 'A' + a.id).join(',') + '），覆盖 ' + covered + ' 个时间单位 · O(n log n)';
  yield W(1000);

  director.chapter('复盘');
  yield S(() => director.beat({
    title: '贪心选择 + 排序 = 最优',
    why: '每次选结束最早且兼容的活动，给后面留下最大可能区间；反例：按最短时长选，可能挤掉更多活动。',
    stateText: 'O(n log n) 排序 + O(n) 扫描 · ' + ACTS.length + ' 个活动',
    progress: 8,
    camera: SHOT_FINAL,
    annotations: [],
  }));
  yield W(700);
}

function barAnchor(id) {
  const b = barBy.get(id);
  return new THREE.Vector3(b.mesh.position.x, b.mesh.position.y + 14, 0);
}

function selectedReset() {
  stageGroup.forEach((b, k) => {
    const a = sorted[k];
    b.mesh.position.set(barX(a), 540 - k * Math.min(30, 260 / Math.max(sorted.length, 1)), 0);
    b.setColor(BASE, BASE);
    b.setText('A' + a.id);
  });
  if (marker) marker.mesh.position.set(X0, 722, 0);
  chosen = []; cur = null; last = 0; idx = 0;
}

function parseActs(text) {
  return text.split(/[;；,，]/).filter(Boolean).map((part) => {
    const m = part.trim().match(/^(\d+)\s*[-~]\s*(\d+)$/);
    return m ? { s: Number(m[1]), f: Number(m[2]) } : null;
  });
}

function applyInputs() {
  const raw = parseActs(actsInput.value);
  if (!raw.length || raw.length > 8 || raw.some((a) => !a || a.s < 0 || a.f > 20 || a.s >= a.f)) {
    status.textContent = '请输入 1–8 个区间，格式 1-4,3-5（0–20，开始 < 结束）';
    return;
  }
  ACTS = raw.map((a, i) => ({ id: i + 1, s: a.s, f: a.f }));
  actsInput.value = ACTS.map((a) => a.s + '-' + a.f).join(',');
  restart(true);
}

const preset = input.addSelect('预设', Object.keys(PRESETS), '经典 11 活动', (v) => {
  const list = PRESETS[v];
  if (!list) return;
  ACTS = list.map((a, i) => ({ id: i + 1, s: a[0], f: a[1] }));
  actsInput.value = ACTS.map((a) => a.s + '-' + a.f).join(',');
  restart(true);
});
const actsInput = panel.addInput('区间 1-4,3-5,0-6', applyInputs, 90);
actsInput.value = ACTS.map((a) => a.s + '-' + a.f).join(',');

function restart(auto = true) {
  status.textContent = '';
  engine.clear();
  director.reset();
  build();
  engine.queue(() => runActivity());
  if (auto) engine.toggle();
}

input.addButton('重播', () => restart(true));
input.addButton('清空', () => { engine.clear(); director.reset(); build(); status.textContent = ''; });

build();
engine.queue(() => runActivity());
scene.start(engine);
