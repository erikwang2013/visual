// AlgorithmLibrary/CountingSort3D.js — 计数排序：投票箱统计频次 → 前缀和 → 按起始下标稳定放置。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
import { SortStage } from '../3D/director/SortStage.js';
applyTheme('CountingSort3D');

const scene = new Scene3D('scene', { cameraPos: [430, 680, 1120], lookAt: [320, 390, 0], fov: 50 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const input = new InputKit(panel);
const status = panel.addStatus('就绪');
const mob = matchMedia('(max-width: 900px)').matches;

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, CYAN = 0x22d3ee, GREEN = 0x4ade80, ORANGE = 0xfb923c;
const PRESETS = [
  { name: '经典重复', arr: [4, 2, 2, 5, 1, 3, 2] },
  { name: '多重复', arr: [3, 1, 3, 3, 2, 1, 5] },
  { name: '阶梯', arr: [5, 5, 4, 4, 3, 3, 2] },
];
let ARR = PRESETS[0].arr.slice();
const K = 5;
let stage = null;
let balls = [];
let countLabels = [];
let outLabels = [];
let counts = [];
let prefix = [];
let output = [];
let phase = '建立';

const SHOT_HOME = { pos: [430, 680, 1120], target: [320, 390, 0], ms: 900 };
const SHOT_INPUT = { pos: [320, 520, 780], target: [320, 260, 0], ms: 750 };
const SHOT_COUNT = { pos: [360, 760, 900], target: [320, 500, 0], ms: 850 };
const SHOT_OUT = { pos: [390, 590, 900], target: [320, 230, 0], ms: 800 };
const SHOT_FINAL = { pos: [520, 630, 1050], target: [320, 340, 0], ms: 950 };

const director = new StoryDirector(scene, {
  title: '计数排序 · 投票箱',
  total: 8,
  legend: [
    { label: '元素', color: '#60a5fa' },
    { label: '计数', color: '#fcd34d' },
    { label: '前缀和', color: '#22d3ee' },
    { label: '输出', color: '#4ade80' },
  ],
  onReplay: () => restart(true),
});

const inX = (i) => 320 + (i - (ARR.length - 1) / 2) * 52;
const outX = (j) => 320 + (j - (ARR.length - 1) / 2) * 52;

function stabilityNote() {
  const pos = new Map();
  ARR.forEach((v, i) => {
    if (!pos.has(v)) pos.set(v, []);
    pos.get(v).push(i + 1);
  });
  let dup = null;
  for (const [v, p] of pos) if (p.length > 1 && (!dup || p.length > dup[1].length)) dup = [v, p];
  if (!dup) return '本例没有重复值；若有重复，同一值的元素在输出中仍保持输入里的先后顺序，所以稳定。';
  return '重复值 ' + dup[0] + ' 在输入中的位置是 [第 ' + dup[1].join('、') + ' 位]；输出也按这个先后填格，所以稳定。';
}

function state() {
  const sorted = output.filter((v) => v !== null);
  return {
    blocks: [
      { type: 'kv', label: '当前阶段', items: [
        { k: '数组', v: ARR.join(',') },
        { k: '值域', v: '1..5' },
        { k: '阶段', v: phase },
      ] },
      { type: 'chips', label: '计数 count', items: counts.map((v, i) => ({ text: (i + 1) + ':' + v, cls: phase === '统计' ? 'current' : '' })) },
      { type: 'chips', label: '前缀和 ≤', items: prefix.map((v, i) => ({ text: (i + 1) + '≤' + v, cls: phase === '前缀和' ? 'current' : '' })) },
      { type: 'chips', label: '输出数组', items: sorted.map((v) => ({ text: String(v), cls: 'done' })), empty: '—' },
      { type: 'text', label: '复杂度', value: 'O(n+k) · 稳定 · k=5' },
    ],
    footer: '计数排序：值域不大时，用频次直接算每个元素的位置',
  };
}

function releaseText(t) { if (!t) return; if (t.sprite?.material) t.sprite.material.dispose(); t.remove(); }

function build() {
  if (stage) stage.dispose();
  countLabels.forEach(releaseText); outLabels.forEach(releaseText);
  countLabels = []; outLabels = []; balls = [];
  stage = new SortStage(scene, { n: ARR.length, cx: 320, baseY: 260, spacing: 52, scaleY: 0, barW: 1 });
  stage.buildBalls(ARR, { radius: 15, labelScale: 0.42 });
  balls = stage.balls;
  balls.forEach((b, i) => {
    b.group.position.set(inX(i), 250, 0);
    b.group.scale.setScalar(1);
  });
  stage.buildBuckets(K, { cx: 320, gap: 96, y: 500, z: -30, radius: 28, height: 140, labels: ['1', '2', '3', '4', '5'] });
  for (let v = 0; v < K; v++) {
    const t = new VText(scene, {
      text: 'n=0', x: stage.bucketX(v), y: 602, z: -30,
      color: '#fcd34d', scale: 0.5,
    });
    countLabels.push(t);
  }
  const out = new VText(scene, { text: '输出', x: 80, y: 100, z: 0, color: '#4ade80', scale: 0.5 });
  outLabels.push(out);
  ARR.forEach((v, j) => {
    outLabels.push(new VText(scene, { text: String(j), x: outX(j), y: 52, z: 0, color: '#64748b', scale: 0.36 }));
  });
  counts = Array(K).fill(0);
  prefix = Array(K).fill(0);
  output = [];
  phase = '建立';
  director.stateUpdate(state());
}

function setCountLabels() {
  countLabels.forEach((t, v) => {
    const val = phase === '统计' ? 'n=' + counts[v] : phase === '建立' ? 'n=0' : counts[v] + '≤' + prefix[v];
    t.setText(val, { color: phase === '统计' ? '#fcd34d' : '#67e8f9' });
  });
}

function* placeBall(ball, to, ms = 420, lift = 65) {
  yield stage.flyBall(ball, to, { ms, lift });
}

function* runCounting() {
  director.reset();
  build();
  setCountLabels();
  yield S(() => director.beat({
    title: '值域就是投票箱',
    why: '计数排序不比较大小：先统计每个值出现几次，再用前缀和直接算它在输出数组里的起始位置。',
    stateText: ARR.length + ' 个元素 · 值域 1..5',
    progress: 1,
    camera: SHOT_HOME,
    annotations: [
      { id: 'arr', text: '输入 ' + ARR.join(','), anchor: () => new THREE.Vector3(320, 285, 0), offset: mob ? [90, -26] : [0, -24], className: 'gold' },
      { id: 'bins', text: '5 个值 = 5 个投票箱', anchor: () => new THREE.Vector3(320, 602, -30), offset: mob ? [80, -24] : [0, -20] },
    ],
  }));
  yield W(700);

  // ---- 统计 ----
  director.chapter('统计');
  phase = '统计';
  yield S(() => {
    director.beat({
      title: '球飞入对应值的箱子',
      why: 'a[i]=v 就把票投给箱子 v；同一值的重复元素叠在一起，计数加一。',
      stateText: '统计频次：箱子 v 记录 count[v]',
      progress: 2,
      camera: SHOT_INPUT,
      annotations: [{ id: 'vote', text: '每个元素投一票', anchor: () => new THREE.Vector3(320, 300, 0), offset: mob ? [70, -24] : [0, -20], className: 'gold' }],
    });
    director.stateUpdate(state());
  });
  yield W(450);
  for (let i = 0; i < ARR.length; i++) {
    const v = ARR[i] - 1;
    const ball = balls[i];
    const to = stage.bucketSlot(v, counts[v]);
    counts[v]++;
    stage.setBucketActive(v, true);
    setCountLabels();
    yield S(() => {
      director.stateUpdate(state());
      director.setBeatState('a[' + i + '] = ' + ARR[i] + ' → 箱子 ' + ARR[i] + '（count=' + counts[v] + '）');
    });
    yield* placeBall(ball, to, 330, 85);
    stage.setBucketActive(v, false);
    yield W(80);
  }
  yield S(() => {
    director.beat({
      title: '频次统计完成',
      why: 'count[v] 就是值 v 的出现次数；所有 count 之和等于 n。',
      stateText: 'count = [' + counts.join(', ') + ']',
      progress: 3,
      camera: SHOT_COUNT,
      annotations: [{ id: 'sum', text: 'Σcount = ' + ARR.length + ' = n', anchor: () => new THREE.Vector3(320, 640, -30), offset: [0, -22] }],
    });
    director.stateUpdate(state());
  });
  yield W(650);

  // ---- 前缀和 ----
  director.chapter('前缀和');
  phase = '前缀和';
  let acc = 0;
  for (let v = 0; v < K; v++) {
    prefix[v] = acc + counts[v];
    acc = prefix[v];
  }
  setCountLabels();
  yield S(() => {
    director.setBeatState('前缀和 = 每个值的最后一个输出位置：' + prefix.map((v, i) => (i + 1) + '≤' + v).join(' · '));
    director.stateUpdate(state());
  });
  yield W(700);
  yield S(() => director.beat({
    title: '前缀和算“落位终点”',
    why: 'prefix[v] 是值 ≤v 的元素个数，所以值 v 的输出区间是 [prefix[v-1], prefix[v])。',
    stateText: '前缀和 = [' + prefix.join(', ') + ']',
    progress: 4,
    camera: SHOT_COUNT,
    annotations: [{ id: 'prefix', text: '起始下标 = 前面所有频次之和', anchor: () => new THREE.Vector3(320, 640, -30), offset: [0, -22], className: 'gold' }],
  }));
  yield W(750);

  // ---- 放置 ----
  director.chapter('按序放置');
  phase = '放置';
  const next = prefix.map((v, i) => (i === 0 ? 0 : prefix[i - 1]));
  output = Array(ARR.length).fill(null);
  yield S(() => {
    director.beat({
      title: '按原顺序取球，按值落位',
      why: '同一值从左到右填自己的区间；保持原输入顺序，所以计数排序是稳定的。',
      stateText: '输出下标 = prefix[v-1] 开始，逐个后移',
      progress: 5,
      camera: SHOT_OUT,
      annotations: [{ id: 'out', text: '值越小越靠左', anchor: () => new THREE.Vector3(320, 100, 0), offset: mob ? [80, -24] : [0, -20], className: 'final' }],
    });
    director.stateUpdate(state());
  });
  yield W(450);
  for (let i = 0; i < ARR.length; i++) {
    const v = ARR[i];
    const j = next[v - 1]++;
    const ball = balls[i];
    output[j] = v;
    yield S(() => {
      director.setBeatState('a[' + i + ']=' + v + ' → 输出[' + j + ']（值 ' + v + ' 的区间）');
      director.stateUpdate(state());
    });
    yield* placeBall(ball, { x: outX(j), y: 100, z: 0 }, 430, 50);
    stage.setBallColor(ball, GREEN);
    yield W(110);
  }
  yield S(() => {
    director.beat({
      title: '输出已经有序',
      why: '没有比较、没有交换：频次和前缀和直接决定每个元素的最终格子。',
      stateText: '输出 = [' + output.join(', ') + ']',
      progress: 6,
      camera: SHOT_FINAL,
      annotations: [{ id: 'sorted', text: '按值域扫描出的有序数组', anchor: () => new THREE.Vector3(320, 145, 0), offset: [0, -22], className: 'final' }],
    });
    director.stateUpdate(state());
  });
  yield W(800);

  // ---- 稳定性 / 复杂度 ----
  director.chapter('复盘');
  phase = '复盘';
  yield S(() => director.beat({
    title: '稳定性：相同值的先后不变',
    why: stabilityNote(),
    stateText: '稳定 · 只有计数与前缀和，没有比较',
    progress: 7,
    camera: SHOT_FINAL,
    annotations: [{ id: 'stable', text: '重复元素保持原顺序', anchor: () => new THREE.Vector3(320, 145, 0), offset: [0, -22], className: 'gold' }],
  }));
  yield W(750);

  yield S(() => {
    director.beat({
      title: 'O(n+k)：用空间换时间',
      why: '时间 O(n+k)，空间 O(n+k)；k 必须是小整数范围，否则计数数组会过大，这是它不如比较排序通用的原因。',
      stateText: 'n=' + ARR.length + ' · k=5 · O(n+k) 时间/空间',
      progress: 8,
      camera: SHOT_HOME,
      annotations: [{ id: 'final', text: '计数排序 = 频次 + 前缀和 + 直接落位', anchor: () => new THREE.Vector3(320, 640, -30), offset: mob ? [80, -24] : [0, -24], className: 'final' }],
    });
    director.setProgress(8);
    director.stateUpdate(state());
    status.textContent = '计数排序完成 · O(n+k) · 稳定';
  });
  yield W(850);
}

function parseArr(text) {
  const s = String(text).trim();
  if (!/^\d+(?:[ ,;]+\d+)*$/.test(s)) return null;
  const nums = s.split(/[ ,;]+/).map(Number);
  if (nums.length < 5 || nums.length > 9) return null;
  if (nums.some((v) => v < 1 || v > K)) return null;
  return nums;
}

function applyInput(text) {
  const arr = parseArr(text);
  if (!arr) { status.textContent = '请输入 5–9 个 1–5 的整数，用逗号/空格/分号分隔（不支持负号或小数）'; return; }
  setArr(arr);
}

function setArr(arr) {
  ARR = arr.slice();
  arrInput.value = ARR.join(',');
  restart(true);
}

function restart(auto = true) {
  status.textContent = '';
  engine.clear();
  director.reset();
  build();
  engine.queue(() => runCounting());
  if (auto) engine.toggle();
}

const presetSel = input.addSelect('预设', PRESETS.map((p) => p.name), PRESETS[0].name, (v) => {
  const p = PRESETS.find((x) => x.name === v) || PRESETS[0];
  setArr(p.arr);
});
const arrInput = panel.addInput('数组 4,2,2,5,1,3,2', applyInput, 24);
arrInput.value = ARR.join(',');
input.addButton('重播', () => restart(true));
input.addButton('清空', () => {
  engine.clear();
  director.reset();
  build();
  status.textContent = '';
});
void presetSel;

build();
engine.queue(() => runCounting());
scene.start(engine);
