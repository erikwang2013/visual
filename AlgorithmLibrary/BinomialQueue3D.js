// AlgorithmLibrary/BinomialQueue3D.js — 二项队列：森林按 rank 排列，插入像二进制 +1 一样逐级进位。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { applyTheme } from '../3D/Glow.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
import { HeapStage } from '../3D/director/HeapStage.js';
applyTheme('BinomialQueue3D');

const scene = new Scene3D('scene', { cameraPos: [560, 760, 1200], lookAt: [320, 480, 0], fov: 50 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const input = new InputKit(panel);
const status = panel.addStatus('就绪');
const mob = matchMedia('(max-width: 900px)').matches;

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, CYAN = 0x22d3ee, RED = 0xfb7185, ORANGE = 0xfb923c;
const PRESETS = [
  { name: '插入 1..5', seq: [1, 2, 3, 4, 5] },
  { name: '逆序 5..1', seq: [5, 4, 3, 2, 1] },
  { name: '交错 2,1,4,3,5', seq: [2, 1, 4, 3, 5] },
];
let SEQ = PRESETS[0].seq.slice();
let forest = [null, null, null, null];
let phase = '建立';
let inserted = 0;
let carries = 0;
let minVal = null;

const stage = new HeapStage(scene, { cx: 320, heap: false });
stage.buildRankSlots(['B0', 'B1', 'B2', 'B3'], 790);

const SHOT_HOME = { pos: [560, 760, 1200], target: [320, 480, 0], ms: 900 };
const SHOT_RANK = { pos: [520, 860, 850], target: [320, 660, 0], ms: 850 };
const SHOT_CARRY = { pos: [500, 720, 900], target: [380, 580, 0], ms: 800 };
const SHOT_MIN = { pos: [450, 720, 800], target: [320, 580, 0], ms: 850 };
const SHOT_FINAL = { pos: [580, 760, 1160], target: [320, 500, 0], ms: 950 };

const director = new StoryDirector(scene, {
  title: '二项队列 · 二进制森林',
  total: 8,
  legend: [
    { label: '树根', color: '#60a5fa' },
    { label: '进位合并', color: '#fb923c' },
    { label: '最小根', color: '#fcd34d' },
    { label: '删除', color: '#fb7185' },
  ],
  onReplay: () => restart(true),
});

const mk = (v) => ({ v, children: [] });
const rankOf = (n) => n.children.length;
const roots = () => forest.filter(Boolean);

function forestText() {
  return forest.map((r, i) => 'B' + i + ':' + (r ? r.v : '—')).join('  ');
}

function state() {
  return {
    blocks: [
      { type: 'kv', label: '当前操作', items: [
        { k: '阶段', v: phase },
        { k: '节点数', v: String(inserted) },
        { k: '进位次数', v: String(carries) },
      ] },
      { type: 'chips', label: '二进制位（B3…B0）', items: [3, 2, 1, 0].map((r) => ({ text: 'B' + r + ' ' + (forest[r] ? 1 : 0), cls: forest[r] ? 'current' : '' })) },
      { type: 'chips', label: '森林的根', items: forest.map((r, i) => ({ text: 'B' + i + ':' + (r ? r.v : '—'), cls: r ? 'done' : '' })) },
      { type: 'text', label: '当前最小根', value: minVal === null ? '—' : String(minVal) },
      { type: 'text', label: '摊还复杂度', value: '插入/合并/取最小 O(log n)' },
    ],
    footer: 'B_r 有 2^r 个节点；两棵 B_r 合并成 B_{r+1} = 一次二进制进位',
  };
}

function updateRanks() {
  for (let r = 0; r < 4; r++) stage.setRank(r, !!forest[r], forest[r] ? String(forest[r].v) : '');
}

function layout(ms = 420) {
  stage.layoutForest(forest, { slots: 4, gap: 210, y: 620, dy: 78, ms });
  updateRanks();
  director.stateUpdate(state());
}

function currentMin() {
  let best = null;
  let rank = -1;
  roots().forEach((r) => {
    if (!best || r.v < best.v) { best = r; rank = forest.indexOf(r); }
  });
  minVal = best ? best.v : null;
  return { tree: best, rank };
}

function* linkTrees(a, b, r) {
  let root = a, child = b;
  if (child.v < root.v) { root = b; child = a; }
  stage.colorForest(root, ORANGE);
  stage.colorForest(child, CYAN);
  yield S(() => {
    director.setBeatState('B' + r + ' + B' + r + '：较小根 ' + root.v + ' 吸收 ' + child.v + ' → B' + (r + 1));
    director.stateUpdate(state());
  });
  yield W(480);
  root.children.unshift(child);
  carries++;
  // 合并树先在原 rank 停留一拍，避免进位途中整棵树从画面上消失
  forest[r] = root;
  layout(500);
  yield W(560);
  forest[r] = null;
  stage.colorForestAll(BLUE);
  return root;
}

function* insertVal(v) {
  let cur = mk(v);
  inserted++;
  let r = 0;
  while (r < forest.length && forest[r]) {
    const old = forest[r];
    forest[r] = null;
    cur = yield* linkTrees(cur, old, r);
    r++;
  }
  if (r < forest.length) forest[r] = cur;
  layout(500);
  currentMin();
  director.stateUpdate(state());
  yield W(600);
  stage.colorForestAll(BLUE);
}

function* extractMin() {
  const { tree, rank } = currentMin();
  if (!tree) return;
  stage.colorForest(tree, RED);
  yield S(() => director.setBeatState('最小根 ' + tree.v + ' 在 B' + rank + '，摘掉它'));
  yield W(650);
  forest[rank] = null;
  layout(450);
  yield W(500);
  for (const c of tree.children) {
    let cur = c;
    let r = rankOf(c);
    while (r < forest.length && forest[r]) {
      const old = forest[r];
      forest[r] = null;
      cur = yield* linkTrees(cur, old, r);
      r++;
    }
    const free = forest.findIndex((x, i) => i >= r && !x);
    const at = free === -1 ? r : free;
    if (at < forest.length) forest[at] = cur;
    layout(450);
    yield W(420);
  }
  inserted--;
  stage.colorForestAll(BLUE);
  currentMin();
  director.stateUpdate(state());
}

function* runBinomial() {
  director.reset();
  stage.resetForest();
  forest = [null, null, null, null];
  inserted = 0; carries = 0; minVal = null; phase = '建立';
  layout(0);
  director.stateUpdate(state());
  const [v1, v2, v3, v4, v5] = SEQ;

  director.chapter('建立');
  yield S(() => director.beat({
    title: '森林就是二进制计数器',
    why: '森林里至多有一棵 B_r。第 r 位为 1 就有一棵树，树的大小是 2^r。',
    stateText: '空森林 = 0000₂，插入就像二进制 +1',
    progress: 1,
    camera: SHOT_HOME,
    annotations: [
      { id: 'bits', text: 'B0 B1 B2 B3 ↔ 二进制位', anchor: () => new THREE.Vector3(320, 790, 0), offset: mob ? [40, -26] : [0, -20], className: 'gold' },
      { id: 'empty', text: '空森林', anchor: () => new THREE.Vector3(320, 620, 0), offset: [0, -20] },
    ],
  }));
  yield W(850);

  // 第 1 个：B0
  phase = '插入 ' + v1;
  director.chapter('插入 B0');
  yield S(() => director.beat({
    title: '插入 ' + v1 + '：落成 B₀',
    why: '节点 ' + v1 + ' 单独成树就是 B₀（2⁰=1 个节点）。最低位从 0 变 1。',
    stateText: '插入 ' + v1 + ' → 森林 0001₂ = B0',
    progress: 2,
    camera: SHOT_RANK,
    annotations: [{ id: 'b0', text: 'B0 单点树', anchor: () => new THREE.Vector3(5, 640, 0), offset: mob ? [80, -24] : [0, -20] }],
  }));
  yield W(450);
  yield* insertVal(SEQ[0]);
  yield W(600);

  // 第 2 个：一次进位
  phase = '插入 ' + v2;
  director.chapter('进位');
  yield S(() => director.beat({
    title: '插入 ' + v2 + '：B₀ + B₀ 进位',
    why: '插入 ' + v2 + ' 后两棵 B₀ 同阶，只能留一棵：较小根当新根，另一个成为孩子，得到 B₁。二进制 0001 + 1 = 0010。',
    stateText: '插入 ' + v2 + '：B0 + B0 → B1',
    progress: 3,
    camera: SHOT_CARRY,
    annotations: [{ id: 'carry', text: '同阶合并 = 进位', anchor: () => new THREE.Vector3(215, 650, 0), offset: mob ? [60, -24] : [0, -20], className: 'gold' }],
  }));
  yield W(500);
  yield* insertVal(SEQ[1]);
  yield S(() => director.setBeatState('森林 = ' + forestText() + '（0010₂）'));
  yield W(800);

  // 第 3 个：B0 + B1
  phase = '插入 ' + v3;
  director.chapter('B0 + B1');
  yield S(() => director.beat({
    title: '插入 ' + v3 + '：B0 + B1',
    why: '最低位空着，节点 ' + v3 + ' 直接放 B0；已有 B1 保持不动，森林是 0011₂（节点数 3）。',
    stateText: '插入 ' + v3 + ' → 森林 0011₂ = B0 + B1',
    progress: 4,
    camera: SHOT_RANK,
    annotations: [{ id: 'mix', text: '低位放新树，高位不合并', anchor: () => new THREE.Vector3(320, 700, 0), offset: [0, -20] }],
  }));
  yield W(450);
  yield* insertVal(SEQ[2]);
  yield W(700);

  // 第 4 个：连续进位
  phase = '插入 ' + v4;
  director.chapter('连续进位');
  yield S(() => director.beat({
    title: '插入 ' + v4 + '：连续进位到 B₂',
    why: '插入第 4 个节点（' + v4 + '）：B0 满 → 进位成 B1；B1 也满 → 再进位成 B2。一次插入最多 O(log n) 次进位，摊还 O(1)。',
    stateText: '插入 ' + v4 + ' → 进位链 B0 → B1 → B2（100₂）',
    progress: 5,
    camera: SHOT_CARRY,
    annotations: [{ id: 'chain', text: '进位链可以很长', anchor: () => new THREE.Vector3(425, 650, 0), offset: mob ? [60, -24] : [0, -20], className: 'gold' }],
  }));
  yield W(500);
  yield* insertVal(SEQ[3]);
  yield S(() => director.setBeatState('森林 = ' + forestText() + '（' + forest.map((r) => r ? 1 : 0).reverse().join('') + '₂）'));
  yield W(850);

  // 第 5 个：B0 + B2
  phase = '插入 ' + v5;
  director.chapter('101₂');
  yield S(() => director.beat({
    title: '插入 ' + v5 + '：B0 + B2',
    why: '插入 ' + v5 + ' 后共 5 个节点 = 101₂：B2 和 B0 各一棵。森林的根数等于二进制中 1 的个数。',
    stateText: '插入 ' + v5 + ' → 森林 101₂ = B2 + B0',
    progress: 6,
    camera: SHOT_HOME,
    annotations: [{ id: 'five', text: '5 个节点 = 101₂ = B2 + B0', anchor: () => new THREE.Vector3(320, 700, 0), offset: [0, -22], className: 'final' }],
  }));
  yield W(450);
  yield* insertVal(SEQ[4]);
  currentMin();
  yield S(() => director.stateUpdate(state()));
  yield W(700);

  // 取最小
  phase = '取最小';
  const before = currentMin();
  director.chapter('取最小');
  yield S(() => director.beat({
    title: '取最小：摘根，孩子按秩拆回',
    why: '最小根一定是某个 B_r 的根。摘掉后，它的 r 个孩子分别是 B_{r-1}…B0，按秩放回森林，必要时继续进位。',
    stateText: '当前最小根 = ' + (before.tree ? before.tree.v : '—') + '；B' + before.rank + ' 拆成孩子',
    progress: 7,
    camera: SHOT_MIN,
    annotations: [{ id: 'min', text: '最小根出队', anchor: () => new THREE.Vector3(320, 660, 0), offset: [0, -22], className: 'gold' }],
  }));
  yield W(500);
  yield* extractMin();
  currentMin();
  layout(500);
  yield W(800);

  // 复盘
  phase = '复盘';
  director.chapter('复盘');
  yield S(() => {
    minVal = currentMin().tree ? currentMin().tree.v : null;
    const bits = forest.map((r) => r ? 1 : 0).reverse().join('');
    director.beat({
      title: '森林 = 二进制，合并 = 进位',
      why: '插入均摊 O(1)、合并 O(log n)、取最小 O(log n)；二项队列用“延迟合并”把进位摊到多次操作上。',
      stateText: '森林 ' + bits + '₂ · ' + forestText() + ' · 最小 ' + minVal,
      progress: 8,
      camera: SHOT_FINAL,
      annotations: [{ id: 'final', text: 'rank ↔ 二进制位，进位 ↔ 合并', anchor: () => new THREE.Vector3(320, 790, 0), offset: mob ? [40, -26] : [0, -22], className: 'final' }],
    });
    director.setProgress(8);
    director.stateUpdate(state());
    status.textContent = '二项式队列完成 · 最小 ' + minVal + ' · 摊还 O(log n)';
  });
  yield W(900);
}

function restart(auto = true) {
  status.textContent = '';
  engine.clear();
  director.reset();
  forest = [null, null, null, null];
  inserted = 0; carries = 0; minVal = null; phase = '建立';
  stage.clearForest();
  updateRanks();
  engine.queue(() => runBinomial());
  if (auto) engine.toggle();
}

input.addSelect('预设', PRESETS.map((p) => p.name), PRESETS[0].name, (v) => {
  const p = PRESETS.find((x) => x.name === v) || PRESETS[0];
  SEQ = p.seq.slice();
  restart(true);
});
input.addButton('重播', () => restart(true));
input.addButton('清空', () => {
  engine.clear();
  director.reset();
  stage.resetForest();
  forest = [null, null, null, null];
  inserted = 0; carries = 0; minVal = null;
  updateRanks();
  status.textContent = '';
});

stage.layoutForest(forest, { slots: 4, gap: 210, y: 620, dy: 78, ms: 0 });
updateRanks();
engine.queue(() => runBinomial());
scene.start(engine);
window.addEventListener('pagehide', () => stage.remove(), { once: true });
