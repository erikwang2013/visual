// AlgorithmLibrary/HeapSort3D.js — 堆排序：数组柱阵 + 右侧堆树双视图，Floyd 建堆 → 反复摘顶/下沉。
// 堆数组与树节点同步交换；已排序后缀变绿，摘出的树节点变暗退出堆区。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { applyTheme } from '../3D/Glow.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
import { SortStage } from '../3D/director/SortStage.js';
applyTheme('HeapSort3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 1020], lookAt: [320, 360, 0], fov: 50 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const input = new InputKit(panel);
const status = panel.addStatus('就绪');

const N = 15;
const SEED = [12, 7, 18, 4, 15, 9, 20, 3, 11, 6, 16, 2, 13, 8, 17];
const C = {
  base: 0x60a5fa, compare: 0xf8fafc, swap: 0xfbbf24,
  sorted: 0x4ade80, top: 0xfcd34d, tree: 0x60a5fa,
};
const SHOT_ESTABLISH = { pos: [320, 660, 1040], target: [320, 360, 0], ms: 900 };
const SHOT_TREE = { pos: [490, 610, 840], target: [320, 520, -60], ms: 700 };
const SHOT_ROOT = { pos: [420, 720, 780], target: [320, 600, -60], ms: 650 };
const SHOT_SIFT = { pos: [540, 520, 780], target: [320, 460, -60], ms: 650 };
const SHOT_WIDE = { pos: [320, 710, 1100], target: [320, 360, 0], ms: 800 };
const SHOT_FINAL = { pos: [320, 690, 1180], target: [320, 330, 0], ms: 900 };

const stage = new SortStage(scene, { n: N, cx: 320, baseY: 90, spacing: 44, scaleY: 11, barW: 26, barD: 24, labelScale: 0.44 });
stage.buildBars(SEED);
stage.buildTree(N, { top: 650, dy: 85, z: -60, dz: 26, step: [0, 190, 96, 52], radius: 14, labelScale: 0.5 });

let seed = SEED.slice();
let data = seed.slice();
let heapSize = N;
let sorted = new Set();
let stats = { compares: 0, swaps: 0 };
let active = -1;
let phase = '准备';
let note = '建堆后反复摘顶';

const director = new StoryDirector(scene, {
  title: '堆排序 · 双视图',
  total: 8,
  legend: [
    { label: '堆区', color: '#60a5fa' },
    { label: '比较', color: '#f8fafc' },
    { label: '交换', color: '#fbbf24' },
    { label: '已排序', color: '#4ade80' },
    { label: '堆顶', color: '#fcd34d' },
  ],
  onReplay: () => restart(true),
});

function stateBlocks() {
  return {
    blocks: [
      { type: 'kv', label: '堆状态', items: [
        { k: '阶段', v: phase },
        { k: '堆顶', v: heapSize > 0 ? data[0] : '—' },
        { k: '堆大小', v: heapSize },
        { k: '已排序', v: sorted.size },
        { k: '比较', v: stats.compares },
        { k: '交换', v: stats.swaps },
      ] },
      { type: 'dist', label: '堆数组', values: data.slice(), current: active },
      { type: 'chips', label: '已排序区', items: [...sorted].sort((a, b) => a - b).map((i) => ({ text: data[i], cls: 'visited' })), empty: '—' },
      { type: 'text', label: '当前', value: note },
    ],
    footer: '不变量：<b>堆区父 ≥ 子，堆顶是当前最大值</b>',
  };
}
function refresh(text) {
  if (text !== undefined) note = text;
  director.stateUpdate(stateBlocks());
}

function* compareNodes(i, j, text) {
  stats.compares++;
  active = j;
  stage.setBarColor(i, C.compare);
  stage.setBarColor(j, C.compare);
  stage.setTreeColor(i, C.compare);
  stage.setTreeColor(j, C.compare);
  stage.treeBeam(i, j, C.compare);
  director.annotations.set('cmp', {
    text,
    anchor: () => stage.treePos(i).lerp(stage.treePos(j), 0.5),
    offset: [0, -24],
  });
  refresh(text);
  yield W(170);
  stage.hideBeam();
  stage.setBarColor(i, C.base);
  stage.setBarColor(j, C.base);
  stage.setTreeColor(i, C.base);
  stage.setTreeColor(j, C.base);
}

function* swapHeap(i, j, lift = 55) {
  if (i === j) return;
  stats.swaps++;
  active = j;
  stage.setBarColor(i, C.swap);
  stage.setBarColor(j, C.swap);
  stage.setTreeColor(i, C.swap);
  stage.setTreeColor(j, C.swap);
  stage.showArc(i, j, C.swap, lift + 80);
  refresh(`交换 a[${i}]=${data[i]} 与 a[${j}]=${data[j]}`);
  yield A(270, (p) => {
    stage.swapPose(i, j, p, lift);
    stage.treeSwapPose(i, j, p, 24);
  });
  const t = data[i]; data[i] = data[j]; data[j] = t;
  stage.setValue(i, data[i]);
  stage.setValue(j, data[j]);
  stage.setTreeValue(i, data[i]);
  stage.setTreeValue(j, data[j]);
  stage.resetBarPose(i);
  stage.resetBarPose(j);
  stage.resetTreePose(i);
  stage.resetTreePose(j);
  stage.hideArc();
  stage.setBarColor(i, C.base);
  stage.setBarColor(j, C.base);
  stage.setTreeColor(i, C.base);
  stage.setTreeColor(j, C.base);
  yield W(50);
}

function* siftDown(i, size) {
  while (true) {
    const l = 2 * i + 1;
    if (l >= size) return;
    let m = l;
    if (l + 1 < size) {
      yield* compareNodes(l, l + 1, `比较孩子 a[${l}]=${data[l]} 与 a[${l + 1}]=${data[l + 1]}`);
      if (data[l + 1] > data[l]) m = l + 1;
    }
    yield* compareNodes(i, m, `比较父 a[${i}]=${data[i]} 与较大孩子 a[${m}]=${data[m]}`);
    if (data[i] >= data[m]) return;
    yield* swapHeap(i, m, 45);
    i = m;
  }
}

function* begin() {
  phase = '准备';
  stats = { compares: 0, swaps: 0 };
  sorted = new Set();
  heapSize = N;
  active = -1;
  data = seed.slice();
  stage.setValues(data);
  for (let i = 0; i < N; i++) {
    stage.resetBarPose(i);
    stage.resetTreePose(i);
    stage.setBarColor(i, C.base);
    stage.setTreeDim(i, false);
    stage.setTreeColor(i, C.base);
    stage.setTreeValue(i, data[i]);
  }
  stage.hideBeam(); stage.hideArc(); stage.hideWalls();
  note = '数组与堆树一一对应';
  refresh();
  director.chapter('建立');
  yield S(() => director.beat({
    title: '数组 + 堆树双视图',
    why: '完全二叉树按层存进数组：父 i 的孩子是 2i+1 / 2i+2；父 ≥ 子时堆顶最大。',
    stateText: `堆大小 ${N} · 比较 0 · 交换 0`,
    progress: 0,
    camera: SHOT_ESTABLISH,
    annotations: [
      { id: 'tree', text: '堆树与数组同步', anchor: () => stage.treePos(0).clone().add(new THREE.Vector3(0, 42, 0)), offset: [0, -22] },
      { id: 'top', text: '为什么堆顶是最大？', anchor: () => new THREE.Vector3(320, stage.baseY + 330, 0), offset: [0, -22], className: 'gold' },
    ],
  }));
  yield W(450);
  director.setProgress(1);
}

function* runHeapSort() {
  yield* begin();

  phase = '建堆';
  director.chapter('建堆');
  yield S(() => director.beat({
    title: '从最后一个父节点向上堆化',
    why: 'Floyd 建堆：从最后一个父节点开始逐个下沉，子树已是堆时父节点只需沉到正确位置。',
    stateText: `堆大小 ${N}`,
    progress: 2,
    camera: SHOT_TREE,
    annotations: [{ id: 'build', text: '父 ≥ 子', anchor: () => stage.treePos(7).clone().add(new THREE.Vector3(0, 30, 0)), offset: [0, -20], className: 'gold' }],
  }));
  yield W(420);
  for (let i = (N >> 1) - 1; i >= 0; i--) yield* siftDown(i, N);

  phase = '摘顶';
  yield S(() => director.beat({
    title: `堆顶 ${data[0]} 是最大值`,
    why: '所有父节点都已完成下沉，根节点比每个孩子都大，因此就是全局最大。',
    stateText: `堆顶 ${data[0]} · 堆大小 ${N}`,
    progress: 3,
    camera: SHOT_ROOT,
    annotations: [{ id: 'root', text: '堆顶 = 当前最大值', anchor: () => stage.treePos(0).clone().add(new THREE.Vector3(0, 44, 0)), offset: [0, -22], className: 'gold' }],
  }));
  yield W(500);

  for (let size = N; size > 1; size--) {
    heapSize = size;
    stage.setBarColor(0, C.top);
    stage.setTreeColor(0, C.top);
    if (size === N) {
      director.chapter('摘顶');
      yield S(() => director.beat({
        title: '摘顶：最大值归位',
        why: '堆顶与堆尾交换，最大值落到数组末尾；随后堆大小减一，末尾进入已排序区。',
        stateText: `堆顶 ${data[0]} → a[${size - 1}]`,
        progress: 4,
        camera: { pos: [560, 560, 900], target: [320, 300, 0], ms: 700 },
        annotations: [{ id: 'extract', text: '最大值归位到末尾', anchor: () => new THREE.Vector3(stage.slotX(size - 1), stage.baseY + 130, 0), offset: [0, -20], className: 'final' }],
      }));
      yield W(380);
    }
    refresh(`堆顶 ${data[0]} 与 a[${size - 1}]=${data[size - 1]} 交换`);
    yield* swapHeap(0, size - 1, 70);
    sorted.add(size - 1);
    heapSize = size - 1;
    stage.setBarColor(size - 1, C.sorted);
    stage.setTreeDim(size - 1, true);
    refresh(`a[${size - 1}]=${data[size - 1]} 归位 · 已排序 ${sorted.size}`);

    if (size === N) {
      director.chapter('下沉');
      yield S(() => director.beat({
        title: '新堆顶下沉',
        why: '末尾换到根后堆序被破坏；与较大孩子逐层交换，直到父 ≥ 子。',
        stateText: `堆大小 ${size - 1}`,
        progress: 5,
        camera: SHOT_SIFT,
        annotations: [{ id: 'sift', text: '沿较大孩子下沉', anchor: () => stage.treePos(0).clone().add(new THREE.Vector3(0, 40, 0)), offset: [0, -20], className: 'gold' }],
      }));
      yield W(340);
    }
    if (size === Math.ceil(N / 2)) {
      director.chapter('重复');
      yield S(() => director.beat({
        title: '重复摘顶 / 下沉',
        why: '每轮确定一个最大值，已排序后缀从左向右扩大；堆区始终维持父 ≥ 子。',
        stateText: `已排序 ${sorted.size} · 堆大小 ${heapSize}`,
        progress: 6,
        camera: SHOT_WIDE,
        annotations: [{ id: 'inv', text: '堆区：父 ≥ 子', anchor: () => stage.treePos(0).clone().add(new THREE.Vector3(0, 42, 0)), offset: [0, -20] }],
      }));
      yield W(280);
    }
    yield* siftDown(0, size - 1);
  }

  sorted.add(0);
  heapSize = 0;
  stage.setBarColor(0, C.sorted);
  stage.setTreeDim(0, true);
  phase = '完成';
  director.chapter('结算');
  yield S(() => director.beat({
    title: '数组升序',
    why: '最大堆逐个摘顶得到升序后缀；全程原地交换，额外空间 O(1)。',
    stateText: `比较 ${stats.compares} · 交换 ${stats.swaps}`,
    progress: 7,
    camera: SHOT_FINAL,
    annotations: [{ id: 'done', text: '已排序后缀 = 升序', anchor: () => new THREE.Vector3(320, stage.baseY + 270, 0), offset: [0, -20], className: 'final' }],
  }));
  refresh('完成');
  status.textContent = `堆排序完成：${N} 个元素升序 [${data.join(', ')}] · 比较 ${stats.compares} 次 · 交换 ${stats.swaps} 次`;
  director.setProgress(8);
  yield W(700);
  director.chapter('复盘');
  yield S(() => director.beat({
    title: '堆排序的代价',
    why: '建堆 O(n)，每次摘顶 O(log n)，共 n-1 次 → O(n log n)；最坏也稳定，但不稳定排序。',
    stateText: 'O(n log n) · O(1) 额外空间',
    progress: 8,
    camera: SHOT_FINAL,
    annotations: [],
  }));
  yield W(600);
}

function randomValues() { return Array.from({ length: N }, () => 2 + Math.floor(Math.random() * 19)); }
function reversedValues() { return Array.from({ length: N }, (_, i) => 21 - i); }
function sortedValues() { return Array.from({ length: N }, (_, i) => 3 + i); }

function resetStage() {
  data = seed.slice();
  heapSize = N;
  sorted = new Set();
  stats = { compares: 0, swaps: 0 };
  active = -1;
  phase = '准备';
  note = '建堆后反复摘顶';
  stage.setValues(data);
  for (let i = 0; i < N; i++) {
    stage.resetBarPose(i);
    stage.resetTreePose(i);
    stage.setBarColor(i, C.base);
    stage.setTreeDim(i, false);
    stage.setTreeColor(i, C.base);
    stage.setTreeValue(i, data[i]);
  }
  stage.hideBeam(); stage.hideArc(); stage.hideWalls();
  director.stateUpdate(stateBlocks());
  status.textContent = '';
}

function restart(autoPlay = true) {
  engine.clear();
  director.reset();
  resetStage();
  engine.queue(() => runHeapSort());
  if (autoPlay) engine.toggle();
}

const presetSelect = input.addSelect('预置', ['示例', '随机', '逆序', '有序'], '示例', (v) => {
  if (v === '随机') seed = randomValues();
  else if (v === '逆序') seed = reversedValues();
  else if (v === '有序') seed = sortedValues();
  else seed = SEED.slice();
  restart(true);
});
input.addButton('随机', () => { presetSelect.value = '示例'; seed = randomValues(); restart(true); });
input.addButton('清空', () => { engine.clear(); director.reset(); resetStage(); });
panel.addInput('自定义: 5,3,8,1', (text) => {
  const nums = text.split(/[^0-9]+/).filter(Boolean).map(Number).filter((n) => n > 0 && n <= 99);
  if (nums.length < 3) { status.textContent = '请输入至少 3 个 1..99 的整数'; return; }
  seed = Array.from({ length: N }, (_, i) => nums[i % nums.length]);
  presetSelect.value = '示例';
  restart(true);
  status.textContent = `自定义数组已循环补齐为 ${N} 个元素`;
}, 90);

resetStage();
engine.queue(() => runHeapSort());
scene.start(engine);
