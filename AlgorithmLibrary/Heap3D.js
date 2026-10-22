// AlgorithmLibrary/Heap3D.js — 最小堆：数组 + 完全二叉树双视图，建堆 / 插入上浮 / 取最小下沉。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
import { HeapStage } from '../3D/director/HeapStage.js';
applyTheme('Heap3D');

const scene = new Scene3D('scene', { cameraPos: [520, 720, 1200], lookAt: [320, 430, 0], fov: 50 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const input = new InputKit(panel);
const status = panel.addStatus('就绪');
const mob = matchMedia('(max-width: 900px)').matches;

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, CYAN = 0x22d3ee, RED = 0xfb7185, ORANGE = 0xfb923c;
const PRESETS = [
  { name: '经典', arr: [5, 3, 8, 1, 7, 2, 6] },
  { name: '深层', arr: [9, 4, 7, 2, 6, 1, 3] },
  { name: '已偏序', arr: [1, 3, 2, 5, 7, 8, 6] },
];
let INIT = PRESETS[0].arr.slice();
let heap = INIT.slice();
let phase = '建立';
let focusIdx = -1;
let path = [];
let insertValue = 0;

const stage = new HeapStage(scene, { cx: 320, cap: 8, arrayY: 115, treeTop: 740, nodeR: 18, cellW: 44 });
const arrLabel = new VText(scene, { text: '堆数组', x: 80, y: 115, z: 0, color: '#93c5fd', scale: 0.48 });

const SHOT_HOME = { pos: [520, 720, 1200], target: [320, 430, 0], ms: 900 };
const SHOT_ARRAY = { pos: [360, 430, 720], target: [320, 220, 0], ms: 750 };
const SHOT_TREE = { pos: [520, 840, 880], target: [320, 610, 0], ms: 850 };
const SHOT_INSERT = { pos: [540, 700, 960], target: [320, 480, 0], ms: 800 };
const SHOT_ROOT = { pos: [430, 780, 660], target: [320, 670, 0], ms: 800 };
const SHOT_SINK = { pos: [480, 610, 850], target: [320, 500, 0], ms: 850 };
const SHOT_FINAL = { pos: [560, 700, 1160], target: [320, 420, 0], ms: 950 };

const director = new StoryDirector(scene, {
  title: '最小堆 · 数组+树',
  total: 8,
  legend: [
    { label: '当前节点', color: '#fb923c' },
    { label: '比较孩子', color: '#fb7185' },
    { label: '堆顶', color: '#fcd34d' },
    { label: '数组同步', color: '#22d3ee' },
  ],
  onReplay: () => restart(true),
});

function state() {
  return {
    blocks: [
      { type: 'kv', label: '当前操作', items: [
        { k: '阶段', v: phase },
        { k: '根/最小', v: heap[0] ?? '—' },
        { k: '大小', v: String(heap.length) },
      ] },
      { type: 'chips', label: '堆数组（下标:值）', items: heap.map((v, i) => ({ text: i + ':' + v, cls: i === focusIdx ? 'current' : '' })) },
      { type: 'chips', label: '路径', items: path.map((i) => ({ text: String(i), cls: 'current' })), empty: '—' },
      { type: 'text', label: '堆序', value: '父 ≤ 子 · 完全二叉树' },
      { type: 'text', label: '复杂度', value: '插入/删除 O(log n) · 取最小 O(1)' },
    ],
    footer: '子 = 2i+1 / 2i+2 · 父 = ⌊(i−1)/2⌋ · 根是全局最小值',
  };
}

function sync() {
  stage.updateArrayValues(heap);
  director.stateUpdate(state());
}

function paintPath(indices, color = ORANGE) {
  path = indices.slice();
  indices.forEach((i) => stage.setNodeColorAt(i, color));
}

function clearPaint() {
  stage.setAllNodeColor(BLUE, heap.length);
  for (let i = 0; i < heap.length; i++) stage.setCellColor(i, BLUE);
  path = [];
  focusIdx = -1;
}

function* siftDown(start, count) {
  let i = start;
  const chain = [];
  while (true) {
    const l = 2 * i + 1, r = l + 1;
    let m = i;
    if (l < count && heap[l] < heap[m]) m = l;
    if (r < count && heap[r] < heap[m]) m = r;
    chain.push(i);
    focusIdx = i;
    paintPath(chain.concat(m === i ? [] : [m]));
    stage.focus(i, m === i ? GOLD : ORANGE);
    sync();
    if (m === i) {
      yield S(() => {
        director.setBeatState('停在下标 ' + i + '：两个孩子都不更小，堆序恢复');
        stage.setNodeColorAt(i, GOLD);
        stage.setCellColor(i, GOLD);
      });
      yield W(500);
      stage.hideFocus();
      return;
    }
    stage.setNodeColorAt(i, ORANGE);
    stage.setNodeColorAt(m, RED);
    yield S(() => director.setBeatState('下标 ' + i + ' 与更小的孩子 ' + m + ' 交换（' + heap[i] + ' ↔ ' + heap[m] + '）'));
    yield W(330);
    stage.swap(i, m, 380);
    [heap[i], heap[m]] = [heap[m], heap[i]];
    sync();
    yield W(460);
    stage.setNodeColorAt(i, BLUE); stage.setNodeColorAt(m, BLUE);
    stage.setCellColor(i, BLUE); stage.setCellColor(m, BLUE);
    i = m;
  }
}

function* siftUp(start) {
  let i = start;
  const chain = [];
  while (i > 0) {
    const p = (i - 1) >> 1;
    chain.push(p);
    focusIdx = i;
    paintPath(chain.concat(i));
    stage.focus(i, ORANGE);
    sync();
    if (heap[p] <= heap[i]) {
      yield S(() => director.setBeatState('父 ' + heap[p] + ' ≤ 子 ' + heap[i] + '：上浮停止，堆序成立'));
      yield W(500);
      stage.hideFocus();
      return;
    }
    stage.setNodeColorAt(p, RED);
    stage.setNodeColorAt(i, ORANGE);
    yield S(() => director.setBeatState('子 ' + heap[i] + ' < 父 ' + heap[p] + '：交换后继续向上'));
    yield W(330);
    stage.swap(i, p, 380);
    [heap[i], heap[p]] = [heap[p], heap[i]];
    sync();
    yield W(460);
    stage.setNodeColorAt(i, BLUE); stage.setNodeColorAt(p, BLUE);
    i = p;
  }
  yield S(() => director.setBeatState('已到根：' + heap[0] + ' 是新的最小值'));
  yield W(450);
  stage.hideFocus();
}

function* runHeap() {
  director.reset();
  heap = INIT.slice();
  stage.reset(heap);
  clearPaint();
  sync();
  yield S(() => director.beat({
    title: '数组与完全二叉树',
    why: '堆用数组存，却按完全二叉树理解：下标 i 的两个孩子是 2i+1、2i+2，根是全局最小。',
    stateText: '建堆前：' + heap.join(', ') + '（还不是堆）',
    progress: 1,
    camera: SHOT_HOME,
    annotations: [
      { id: 'arr', text: '数组顺序 = 层序', anchor: () => new THREE.Vector3(320, 145, 0), offset: mob ? [70, -26] : [0, -22], className: 'gold' },
      { id: 'tree', text: '完全二叉树同步', anchor: () => new THREE.Vector3(320, 560, 0), offset: [0, -22] },
    ],
  }));
  yield W(850);

  // ---- 建堆 ----
  director.chapter('建堆');
  phase = '建堆';
  yield S(() => {
    director.beat({
      title: '从最后一个父节点开始下沉',
      why: '叶子天然是堆；从 n/2−1 倒着对每个内部节点下沉，子树修好后父节点就更容易满足堆序。',
      stateText: 'n=' + heap.length + '，最后父节点下标 ' + (Math.floor(heap.length / 2) - 1),
      progress: 2,
      camera: SHOT_TREE,
      annotations: [{ id: 'leaf', text: '叶子不用处理', anchor: () => new THREE.Vector3(320, 500, 0), offset: [0, -22] }],
    });
  });
  yield W(600);
  for (let i = (heap.length >> 1) - 1; i >= 0; i--) {
    clearPaint();
    focusIdx = i;
    yield* siftDown(i, heap.length);
  }
  clearPaint();
  yield S(() => {
    director.beat({
      title: '建堆完成：每个父节点 ≤ 孩子',
      why: '建堆并不排序；它只保证堆序。堆数组的层序仍然对应这棵树。',
      stateText: '堆 = [' + heap.join(', ') + ']，根 = ' + heap[0],
      progress: 3,
      camera: SHOT_HOME,
      annotations: [{ id: 'root', text: '根 ' + heap[0] + ' 最小', anchor: () => new THREE.Vector3(320, 780, 0), offset: mob ? [70, -24] : [0, -22], className: 'gold' }],
    });
    director.stateUpdate(state());
  });
  yield W(800);

  // ---- 插入 ----
  director.chapter('插入');
  phase = '插入';
  const idx = heap.length;
  heap.push(insertValue);
  stage.showNewNode(idx, insertValue);
  stage.setCellColor(idx, ORANGE);
  sync();
  yield S(() => {
    director.beat({
      title: '新元素追加到末尾',
      why: '先放在完全二叉树的下一个空位，完全性不破坏；但它可能比父亲小，需要上浮。',
      stateText: '插入 ' + insertValue + ' → 下标 ' + idx,
      progress: 4,
      camera: SHOT_INSERT,
      annotations: [{ id: 'new', text: '插入 ' + insertValue, anchor: () => new THREE.Vector3(stage.heapPos(idx).x, stage.heapPos(idx).y + 38, 0), offset: mob ? [70, -24] : [0, -22], className: 'gold' }],
    });
  });
  yield W(700);
  yield A(300, (p) => { stage.nodes[idx].mesh.scale.setScalar(0.45 + 0.55 * p); });

  director.chapter('上浮');
  phase = '上浮';
  yield S(() => director.beat({
    title: '和父亲比较，小就上浮',
    why: '每次只和父亲比较：比父亲小就交换，否则停止。路径长度不超过树高 ⌊log₂n⌋。',
    stateText: insertValue + ' 从下标 ' + idx + ' 向上找位置',
    progress: 5,
    camera: SHOT_ROOT,
    annotations: [{ id: 'up', text: '只沿一条根路径比较', anchor: () => new THREE.Vector3(stage.heapPos(idx).x, stage.heapPos(idx).y + 38, 0), offset: [0, -22] }],
  }));
  yield W(500);
  yield* siftUp(idx);
  clearPaint();
  yield S(() => {
    stage.focus(0, GOLD);
    director.setBeatState('插入完成：堆 = [' + heap.join(', ') + ']，新根 ' + heap[0]);
    director.stateUpdate(state());
  });
  yield W(650);
  stage.hideFocus();

  // ---- 取最小 ----
  director.chapter('取最小');
  phase = '取最小';
  const oldRoot = heap[0];
  yield S(() => {
    stage.focus(0, RED);
    stage.setNodeColorAt(0, RED);
    director.beat({
      title: '摘掉根，末尾元素顶上来',
      why: '根是最小值。直接删除根会破坏完全性，所以把最后一个元素放到根，再让它下沉。',
      stateText: '删除最小值 ' + oldRoot + '，末尾 ' + heap[heap.length - 1] + ' 顶到根',
      progress: 6,
      camera: SHOT_ROOT,
      annotations: [{ id: 'min', text: '最小 ' + oldRoot + ' 出队', anchor: () => new THREE.Vector3(320, 780, 0), offset: [0, -22], className: 'gold' }],
    });
  });
  yield W(700);
  stage.moveLastToRoot(heap.length - 1);
  heap[0] = heap.pop();
  stage.updateArrayValues(heap);
  stage.setCellColor(heap.length, BLUE);
  yield S(() => {
    stage.setNodeColorAt(0, ORANGE);
    stage.focus(0, ORANGE);
    director.setBeatState('末尾 ' + heap[0] + ' 顶到根：完全性恢复，但可能违反堆序');
  });
  yield W(650);

  director.chapter('下沉');
  phase = '下沉';
  yield S(() => director.beat({
    title: '与较小的孩子交换，逐层下沉',
    why: '每次选更小的那个孩子交换，才能同时满足父 ≤ 左、父 ≤ 右；到底或两个孩子都更大时停止。',
    stateText: '从根开始下沉，堆大小 ' + heap.length,
    progress: 7,
    camera: SHOT_SINK,
    annotations: [{ id: 'sink', text: '选更小的孩子交换', anchor: () => new THREE.Vector3(320, 620, 0), offset: mob ? [70, -22] : [0, -22] }],
  }));
  yield W(500);
  yield* siftDown(0, heap.length);
  clearPaint();
  stage.focus(0, GOLD);
  stage.setNodeColorAt(0, GOLD);
  yield S(() => {
    director.stateUpdate(state());
    director.setBeatState('取最小完成：根 ' + heap[0] + '，堆序恢复');
  });
  yield W(700);
  stage.hideFocus();

  // ---- 复盘 ----
  director.chapter('复盘');
  phase = '复盘';
  yield S(() => {
    director.beat({
      title: '堆 = 完全树 + 堆序',
      why: '插入只上浮一条根路径，删除只下沉一条根路径，都是 O(log n)；取最小 O(1)。建堆自底向上是 O(n)。',
      stateText: '堆 = [' + heap.join(', ') + '] · 根 ' + heap[0] + ' · 高度 ' + Math.floor(Math.log2(heap.length + 1)),
      progress: 8,
      camera: SHOT_FINAL,
      annotations: [
        { id: 'done', text: '根 ' + heap[0] + ' 随时可取', anchor: () => new THREE.Vector3(320, 780, 0), offset: mob ? [70, -24] : [0, -22], className: 'final' },
        { id: 'complex', text: '插入/删除 O(log n)', anchor: () => new THREE.Vector3(320, 145, 0), offset: [0, -22] },
      ],
    });
    director.setProgress(8);
    director.stateUpdate(state());
    status.textContent = '最小堆完成 · 根 ' + heap[0] + ' · O(log n)';
  });
  yield W(900);
}

function parseHeap(text) {
  const s = String(text).trim();
  if (!/^\d+(?:[ ,;]+\d+)*$/.test(s)) return null;
  const nums = s.split(/[ ,;]+/).map(Number);
  if (nums.length < 4 || nums.length > 7) return null;
  if (nums.some((v) => v < 0 || v > 99)) return null;
  return nums;
}

function applyInput(text) {
  const arr = parseHeap(text);
  if (!arr) { status.textContent = '请输入 4–7 个 0–99 的整数，用逗号/空格/分号分隔（不支持负号或小数）'; return; }
  setArr(arr);
}

function setArr(arr) {
  INIT = arr.slice();
  heapInput.value = INIT.join(',');
  restart(true);
}

function restart(auto = true) {
  status.textContent = '';
  engine.clear();
  director.reset();
  heap = INIT.slice();
  stage.reset(heap);
  clearPaint();
  engine.queue(() => runHeap());
  if (auto) engine.toggle();
}

input.addSelect('预设', PRESETS.map((p) => p.name), PRESETS[0].name, (v) => {
  const p = PRESETS.find((x) => x.name === v) || PRESETS[0];
  setArr(p.arr);
});
const heapInput = panel.addInput('数组 5,3,8,1,7,2,6', applyInput, 24);
heapInput.value = INIT.join(',');
input.addButton('重播', () => restart(true));
input.addButton('清空', () => {
  engine.clear();
  director.reset();
  heap = INIT.slice();
  stage.reset(heap);
  clearPaint();
  status.textContent = '';
});

stage.reset(heap);
engine.queue(() => runHeap());
scene.start(engine);
window.addEventListener('pagehide', () => {
  arrLabel.sprite.material?.dispose();
  arrLabel.remove();
  stage.remove();
}, { once: true });
