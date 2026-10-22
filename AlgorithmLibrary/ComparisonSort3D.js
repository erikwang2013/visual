// AlgorithmLibrary/ComparisonSort3D.js — 比较排序 6 合 1：冒泡/选择/插入/希尔/归并/快速。
// 柱阵 + 比较光束 + 交换弧线 + 分区墙/归并双墙/希尔 gap 平面；StoryDirector 负责镜头、标注与实时状态。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { applyTheme } from '../3D/Glow.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
import { SortStage } from '../3D/director/SortStage.js';
applyTheme('ComparisonSort3D');

const scene = new Scene3D('scene', { cameraPos: [320, 620, 1000], lookAt: [320, 300, 0], fov: 50 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const input = new InputKit(panel);
const status = panel.addStatus('就绪');

const N = 14;
const SEED = [9, 5, 16, 3, 12, 8, 18, 6, 14, 4, 11, 17, 7, 10];
const C = {
  base: 0x60a5fa, compare: 0xf8fafc, swap: 0xfbbf24, sorted: 0x4ade80,
  pivot: 0xfcd34d, prefix: 0xa855f7, run: 0x38bdf8, wall: 0x4ade80, gap: 0x7dd3fc,
};
const VARIANTS = {
  bubble: { label: '冒泡', invariant: '每轮把最大值沉到右端，已排序后缀逐渐扩大' },
  selection: { label: '选择', invariant: '已排序前缀 ≤ 未排序区，每轮定位一个最小值' },
  insertion: { label: '插入', invariant: '已排序前缀始终有序，新元素插入到正确位置' },
  shell: { label: '希尔', invariant: '按 gap 分组做插入排序，组内有序后 gap 递减' },
  merge: { label: '归并', invariant: '左右两段各自有序，合并后整段有序（稳定）' },
  quick: { label: '快速', invariant: '枢轴左侧 ≤ 枢轴 < 右侧，枢轴落位后不再移动' },
};
const SHOT_ESTABLISH = { pos: [320, 620, 1020], target: [320, 300, 0], ms: 900 };
const SHOT_TOP = { pos: [320, 790, 650], target: [320, 260, 0], ms: 700 };
const SHOT_FINAL = { pos: [320, 650, 1140], target: [320, 300, 0], ms: 900 };

const stage = new SortStage(scene, { n: N, cx: 320, baseY: 140, spacing: 46, scaleY: 15, barW: 28, barD: 28, labelScale: 0.46 });
stage.buildBars(SEED);
stage.buildWalls(8, { height: 360, width: 8 });

let seed = SEED.slice();
let data = seed.slice();
let sorted = new Set();
let active = -1;
let stats = { compares: 0, swaps: 0 };
let variant = 'bubble';
let note = '选择算法后播放';
let mergeShot = false;
let quickShot = false;

const director = new StoryDirector(scene, {
  title: '比较排序 · 六赛道',
  total: 8,
  legend: [
    { label: '待排序', color: '#60a5fa' },
    { label: '比较', color: '#f8fafc' },
    { label: '交换', color: '#fbbf24' },
    { label: '已排序/合并', color: '#4ade80' },
    { label: '枢轴/gap', color: '#fcd34d' },
  ],
  onReplay: () => restart(variant, true),
});

function stateBlocks() {
  return {
    blocks: [
      { type: 'kv', label: '计数', items: [
        { k: '变体', v: VARIANTS[variant].label },
        { k: '比较', v: stats.compares },
        { k: '交换', v: stats.swaps },
      ] },
      { type: 'dist', label: '数组', values: data.slice(), current: active },
      { type: 'chips', label: '已排序区', items: [...sorted].sort((a, b) => a - b).map((i) => ({ text: data[i], cls: 'visited' })), empty: '—' },
      { type: 'text', label: '当前', value: note },
    ],
    footer: '不变量：<b>' + VARIANTS[variant].invariant + '</b>',
  };
}
function refresh(text) {
  if (text !== undefined) note = text;
  director.stateUpdate(stateBlocks());
}

function pairAnchor(i, j) {
  const y = stage.baseY + Math.max(stage.bars[i].h, stage.bars[j].h) * 0.62 + 20;
  return new THREE.Vector3((stage.slotX(i) + stage.slotX(j)) / 2, y, 0);
}
function focusShot(i) {
  return { pos: [stage.slotX(i) + 300, 520, 730], target: [stage.slotX(i), 300, 0], ms: 650 };
}

function* compare(i, j, text) {
  stats.compares++;
  active = j;
  stage.setBarColor(i, C.compare);
  stage.setBarColor(j, C.compare);
  stage.showCompareBeam(i, j, C.compare);
  director.annotations.set('cmp', { text, anchor: () => pairAnchor(i, j), offset: [0, -22] });
  refresh(text);
  yield W(65);
  stage.hideBeam();
  stage.setBarColor(i, C.base);
  stage.setBarColor(j, C.base);
}

// 快排指针与枢轴比较：比较结束把枢轴恢复金色，避免每拍被清成普通色。
function* comparePivot(i, piv, text) {
  stats.compares++;
  active = i;
  stage.setBarColor(i, C.compare);
  stage.showCompareBeam(i, piv, C.compare);
  director.annotations.set('cmp', { text, anchor: () => pairAnchor(i, piv), offset: [0, -22] });
  refresh(text);
  yield W(60);
  stage.hideBeam();
  stage.setBarColor(i, C.base);
  stage.setBarColor(piv, C.pivot);
}

function* swap(i, j, lift = 80) {
  if (i === j) return;
  stats.swaps++;
  active = j;
  stage.setBarColor(i, C.swap);
  stage.setBarColor(j, C.swap);
  stage.showArc(i, j, C.swap, lift + 60);
  refresh(`交换 a[${i}]=${data[i]} 与 a[${j}]=${data[j]}`);
  yield A(230, (p) => stage.swapPose(i, j, p, lift));
  const t = data[i]; data[i] = data[j]; data[j] = t;
  stage.setValue(i, data[i]);
  stage.setValue(j, data[j]);
  stage.resetBarPose(i);
  stage.resetBarPose(j);
  stage.hideArc();
  stage.setBarColor(i, C.base);
  stage.setBarColor(j, C.base);
  yield W(35);
}

function* begin(name) {
  variant = name;
  stats = { compares: 0, swaps: 0 };
  sorted = new Set();
  active = -1;
  mergeShot = false;
  quickShot = false;
  data = seed.slice();
  stage.setValues(data);
  for (let i = 0; i < N; i++) {
    stage.resetBarPose(i);
    stage.setBarColor(i, C.base);
  }
  stage.hideBeam(); stage.hideArc(); stage.hideWalls();
  note = '准备开始';
  refresh();
  director.chapter('建立');
  yield S(() => director.beat({
    title: VARIANTS[name].label + '排序',
    why: VARIANTS[name].invariant,
    stateText: `n=${N} · 比较 0 · 交换 0`,
    progress: 0,
    camera: SHOT_ESTABLISH,
    annotations: [{ id: 'title', text: '同一输入，换算法对比', anchor: () => new THREE.Vector3(320, stage.baseY + 360, 0), offset: [0, -22] }],
  }));
  yield W(420);
  director.setProgress(1);
}

function* finish() {
  for (let i = 0; i < N; i++) sorted.add(i);
  stage.hideWalls(); stage.hideBeam(); stage.hideArc();
  director.chapter('结算');
  yield S(() => director.beat({
    title: '有序：' + VARIANTS[variant].label + '排序完成',
    why: VARIANTS[variant].invariant + '——此刻整列有序。',
    stateText: `比较 ${stats.compares} · 交换 ${stats.swaps}`,
    progress: 7,
    camera: SHOT_FINAL,
    annotations: [{ id: 'done', text: '彩虹 = 升序', anchor: () => new THREE.Vector3(320, stage.baseY + 340, 0), offset: [0, -20], className: 'final' }],
  }));
  for (let i = 0; i < N; i++) {
    stage.setBarColor(i, new THREE.Color().setHSL(0.58 - 0.58 * (i / (N - 1)), 0.82, 0.62).getHex());
    yield W(38);
  }
  refresh('完成');
  status.textContent = `${VARIANTS[variant].label}排序完成：${N} 个元素升序 [${data.join(', ')}] · 比较 ${stats.compares} 次 · 交换 ${stats.swaps} 次`;
  director.setProgress(8);
  yield W(700);
  director.chapter('复盘');
  yield S(() => director.beat({
    title: '没有万能排序',
    why: '冒泡/选择/插入 O(n²)；希尔/归并/快排平均 O(n log n)；小数组插入最快，稳定性看归并。',
    stateText: `${VARIANTS[variant].label}：比较 ${stats.compares} · 交换 ${stats.swaps}`,
    progress: 8,
    camera: SHOT_FINAL,
    annotations: [],
  }));
  yield W(600);
}

function* bubbleSort() {
  let midShot = false;
  for (let end = N - 1; end > 0; end--) {
    let swapped = false;
    for (let j = 0; j < end; j++) {
      yield* compare(j, j + 1, `比较 a[${j}]=${data[j]} 与 a[${j + 1}]=${data[j + 1]}`);
      if (data[j] > data[j + 1]) {
        yield* swap(j, j + 1, 80);
        swapped = true;
        if (!midShot) {
          midShot = true;
          director.camera.shot(focusShot(j).pos, focusShot(j).target, { ms: 650 });
          director.annotations.set('why', { text: '交换纠正逆序，大者上浮', anchor: () => new THREE.Vector3(stage.slotX(j), stage.baseY + 180, 0), offset: [0, -20], className: 'gold' });
        }
      }
    }
    sorted.add(end);
    stage.setBarColor(end, C.sorted);
    if (!swapped) {
      for (let k = 0; k < end; k++) { sorted.add(k); stage.setBarColor(k, C.sorted); }
      break;
    }
    director.setProgress(2 + Math.round(((N - 1 - end) / (N - 1)) * 4));
    yield W(55);
  }
  yield* finish();
}

function* selectionSort() {
  for (let i = 0; i < N - 1; i++) {
    let min = i;
    stage.setBarColor(min, C.pivot);
    for (let j = i + 1; j < N; j++) {
      yield* compare(j, min, `比较 a[${j}]=${data[j]} 与当前最小 ${data[min]}`);
      if (data[j] < data[min]) min = j;
      stage.setBarColor(min, C.pivot);
    }
    if (min !== i) yield* swap(i, min, 85);
    sorted.add(i);
    stage.setBarColor(i, C.sorted);
    stage.setBarColor(min, min === i ? C.sorted : C.base);
    director.setProgress(2 + Math.round(((i + 1) / N) * 4));
    yield W(55);
  }
  yield* finish();
}

function* insertionSort() {
  for (let i = 1; i < N; i++) {
    let j = i;
    stage.setBarColor(j, C.pivot);
    while (j > 0) {
      yield* compare(j - 1, j, `插入 a[${j}]=${data[j]}：与前一个 ${data[j - 1]} 比较`);
      if (data[j - 1] <= data[j]) break;
      yield* swap(j - 1, j, 70);
      j--;
      stage.setBarColor(j, C.pivot);
    }
    for (let k = 0; k <= i; k++) { sorted.add(k); stage.setBarColor(k, C.prefix); }
    director.setProgress(2 + Math.round((i / N) * 4));
    yield W(45);
  }
  yield* finish();
}

function* shellSort() {
  for (let gap = Math.floor(N / 2); gap >= 1; gap = Math.floor(gap / 2)) {
    director.chapter('增量 gap = ' + gap);
    if (gap > 1) {
      let w = 0;
      for (let x = gap; x < N && w < 8; x += gap) stage.setWall(w++, stage.slotX(x) - stage.spacing / 2, C.gap, 0.18);
    }
    director.annotations.set('gap', { text: `gap=${gap}：每隔 ${gap} 个取一组`, anchor: () => new THREE.Vector3(320, stage.baseY + 370, 0), offset: [0, -20], className: 'gold' });
    director.camera.shot(SHOT_TOP.pos, SHOT_TOP.target, { ms: 600 });
    for (let i = gap; i < N; i++) {
      let j = i;
      stage.setBarColor(j, C.pivot);
      while (j >= gap) {
        yield* compare(j - gap, j, `跨 gap=${gap} 比较 a[${j - gap}]=${data[j - gap]} 与 a[${j}]=${data[j]}`);
        if (data[j - gap] <= data[j]) break;
        yield* swap(j - gap, j, 75);
        j -= gap;
        stage.setBarColor(j, C.pivot);
      }
    }
    stage.hideWalls();
    director.setProgress(gap === 1 ? 6 : 3);
    yield W(110);
  }
  yield* finish();
}

function* mergeRun(lo, mid, hi) {
  director.chapter(`归并 [${lo}..${mid}] + [${mid + 1}..${hi}]`);
  stage.setWall(0, stage.slotX(mid), C.wall, 0.38);
  stage.setWall(1, stage.slotX(mid + 1), C.wall, 0.38);
  if (!mergeShot) {
    mergeShot = true;
    director.camera.shot(SHOT_TOP.pos, SHOT_TOP.target, { ms: 650 });
    director.annotations.set('merge', { text: '两段各自有序 → 合并', anchor: () => new THREE.Vector3(320, stage.baseY + 365, 0), offset: [0, -22], className: 'gold' });
  }
  const snap = data.slice();
  const out = [];
  let li = lo;
  let ri = mid + 1;
  while (li <= mid && ri <= hi) {
    yield* compare(li, ri, `归并比较 ${snap[li]} 与 ${snap[ri]}`);
    if (snap[li] <= snap[ri]) { stage.setBarColor(li, C.pivot); out.push(snap[li]); li++; }
    else { stage.setBarColor(ri, C.pivot); out.push(snap[ri]); ri++; }
    yield W(45);
  }
  while (li <= mid) out.push(snap[li++]);
  while (ri <= hi) out.push(snap[ri++]);
  for (let k = lo; k <= hi; k++) stage.setBarColor(k, C.base);
  for (let k = lo; k <= hi; k++) {
    data[k] = out[k - lo];
    stage.setValue(k, data[k]);
    stage.setBarColor(k, C.run);
    refresh(`写入 a[${k}]=${data[k]}`);
    yield W(42);
  }
  director.setProgress(4);
  stage.hideWalls();
  yield W(70);
}

function* mergeSort(lo, hi) {
  if (lo >= hi) return;
  const mid = (lo + hi) >> 1;
  yield* mergeSort(lo, mid);
  yield* mergeSort(mid + 1, hi);
  yield* mergeRun(lo, mid, hi);
}

function* quickSort(lo, hi) {
  if (lo > hi) return;
  if (lo === hi) { sorted.add(lo); stage.setBarColor(lo, C.sorted); return; }
  const pivot = data[lo];
  stage.setBarColor(lo, C.pivot);
  director.chapter(`划分 [${lo}..${hi}]`);
  if (!quickShot) {
    quickShot = true;
    director.camera.shot(SHOT_TOP.pos, SHOT_TOP.target, { ms: 650 });
    director.annotations.set('wall', { text: '分区墙：左 ≤ 枢轴 < 右', anchor: () => new THREE.Vector3(320, stage.baseY + 365, 0), offset: [0, -22], className: 'gold' });
  }
  let i = lo + 1;
  let j = hi;
  while (true) {
    while (i <= j && data[i] <= pivot) {
      yield* comparePivot(i, lo, `a[${i}]=${data[i]} ≤ 枢轴 ${pivot}，左指针右移`);
      i++;
    }
    while (i <= j && data[j] > pivot) {
      yield* comparePivot(j, lo, `a[${j}]=${data[j]} > 枢轴 ${pivot}，右指针左移`);
      j--;
    }
    if (i >= j) break;
    yield* swap(i, j, 105);
    stage.setBarColor(lo, C.pivot);
    i++; j--;
  }
  if (j !== lo) yield* swap(lo, j, 105);
  stage.setBarColor(j, C.pivot);
  sorted.add(j);
  stage.setBarColor(j, C.sorted);
  stage.setWall(0, stage.slotX(j), C.wall, 0.42);
  refresh(`枢轴 ${pivot} 落位 a[${j}]`);
  yield W(140);
  yield* quickSort(lo, j - 1);
  yield* quickSort(j + 1, hi);
}

function* runVariant(v) {
  yield* begin(v);
  if (v === 'bubble') yield* bubbleSort();
  else if (v === 'selection') yield* selectionSort();
  else if (v === 'insertion') yield* insertionSort();
  else if (v === 'shell') yield* shellSort();
  else if (v === 'merge') { yield* mergeSort(0, N - 1); yield* finish(); }
  else { yield* quickSort(0, N - 1); yield* finish(); }
}

function resetStage() {
  data = seed.slice();
  stage.setValues(data);
  for (let i = 0; i < N; i++) {
    stage.resetBarPose(i);
    stage.setBarColor(i, C.base);
  }
  stage.hideBeam(); stage.hideArc(); stage.hideWalls();
  sorted = new Set();
  stats = { compares: 0, swaps: 0 };
  active = -1;
  note = '准备开始';
  director.stateUpdate(stateBlocks());
  status.textContent = '';
}

function restart(v, autoPlay = true) {
  variant = v;
  engine.clear();
  director.reset(); // runVariant 的 begin() 会复位数据/柱体，避免重复 resetStage
  engine.queue(() => runVariant(variant));
  variantSelect.value = VARIANTS[variant].label;
  if (autoPlay) engine.toggle();
}

const variantSelect = input.addSelect('算法', Object.values(VARIANTS).map((v) => v.label), VARIANTS[variant].label, (label) => {
  const key = Object.keys(VARIANTS).find((k) => VARIANTS[k].label === label);
  restart(key || 'bubble', true);
});
input.addButton('随机', () => { seed = Array.from({ length: N }, () => 2 + Math.floor(Math.random() * 19)); restart(variant, true); });
input.addButton('逆序', () => { seed = Array.from({ length: N }, (_, i) => 20 - i); restart(variant, true); });
input.addButton('重复', () => { seed = Array.from({ length: N }, (_, i) => [5, 9, 14][i % 3]); restart(variant, true); });
input.addButton('清空', () => { engine.clear(); director.reset(); resetStage(); });
panel.addInput('自定义: 9,5,16', (text) => {
  const nums = text.split(/[^0-9]+/).filter(Boolean).map(Number).filter((n) => n > 0 && n <= 99);
  if (nums.length < 2) { status.textContent = '请输入至少 2 个 1..99 的整数'; return; }
  seed = Array.from({ length: N }, (_, i) => nums[i % nums.length]);
  restart(variant, true);
  status.textContent = `自定义数组已循环补齐为 ${N} 个元素`;
}, 90);

resetStage();
engine.queue(() => runVariant(variant));
scene.start(engine);
