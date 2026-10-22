// AlgorithmLibrary/OptimalBST3D.js — 最优二叉搜索树：区间 DP 填 e/w/root，根表递归长成最小加权代价的 BST。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText } from '../3D/VisualObject3D.js';
import { applyTheme, PALETTE } from '../3D/Glow.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
import { TableStage } from '../3D/director/TableStage.js';
applyTheme('OptimalBST3D');

const scene = new Scene3D('scene', { cameraPos: [640, 720, 1150], lookAt: [480, 470, 0], fov: 50 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const input = new InputKit(panel);
const status = panel.addStatus('就绪');
const mob = matchMedia('(max-width: 900px)').matches;

const N = 5;
const BLUE = 0x60a5fa, DIM = 0x334155, GOLD = 0xfcd34d, CYAN = 0x22d3ee, GREEN = 0x4ade80, RED = 0xfb7185;
const PRESETS = [
  { name: 'CLRS 教科书', p: [0, 0.15, 0.10, 0.05, 0.10, 0.20], q: [0.05, 0.10, 0.05, 0.05, 0.05, 0.10] },
  { name: '高频居中', p: [0, 0.05, 0.35, 0.05, 0.10, 0.05], q: [0.05, 0.05, 0.05, 0.05, 0.05, 0.05] },
  { name: '均匀权重', p: [0, 0.10, 0.10, 0.10, 0.10, 0.10], q: [0.05, 0.05, 0.05, 0.05, 0.05, 0.05] },
];
let PRESET = PRESETS[0];
let P = PRESET.p.slice(), Q = PRESET.q.slice();
let e = [], w = [], rt = [];
let steps = [];
let tree = null;
let nodeOrder = [];
let filled = new Set();
let cur = null;
let pathKeys = [];
let treeHeight = 0;
const edgeByChild = new Map();

const stage = new TableStage(scene, {
  rows: N, cols: N, origin: [330, 430, 0], cellW: 56, cellH: 38, gapX: 7, gapY: 7,
  color: BLUE, textScale: 0.48, rowLabels: Array.from({ length: N }, (_, i) => 'k' + (i + 1)), colLabels: Array.from({ length: N }, (_, i) => 'k' + (i + 1)), corner: 'i \\ j',
  rowLabelOffset: 78, colLabelOffset: 0, arrows: 12,
});
const nodes = [];
const nodeP = [];
const edgePool = [];
const UP = new THREE.Vector3(0, 1, 0);
for (let k = 1; k <= N; k++) {
  nodes.push(new VNode(scene, { radius: 23, x: 620 + (k - 3) * 76, y: 680, z: 0, label: 'k' + k, color: BLUE, emissive: BLUE, labelScale: 0.9 }));
  nodes[k - 1].mesh.visible = false;
  nodeP.push(new VText(scene, { text: '', x: 620 + (k - 3) * 76, y: 640, z: 0, color: '#94a3b8', scale: 0.4 }));
}
for (let i = 0; i < N; i++) {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.6, 1, 6),
    new THREE.MeshBasicMaterial({ color: PALETTE.edge, transparent: true, opacity: 0.5, depthWrite: false }),
  );
  m.visible = false;
  scene.add(m);
  edgePool.push(m);
}
const treeLabel = new VText(scene, { text: '根表 → 最优树', x: 720, y: 780, z: 0, color: '#93c5fd', scale: 0.48 });

const SHOT_HOME = { pos: [640, 720, 1150], target: [480, 470, 0], ms: 900 };
const SHOT_TABLE = { pos: [330, 620, 760], target: [330, 430, 0], ms: 800 };
const SHOT_FULL = { pos: [560, 700, 1000], target: [430, 460, 0], ms: 900 };
const SHOT_TREE = { pos: [780, 760, 900], target: [700, 590, 0], ms: 900 };
const SHOT_FINAL = { pos: [720, 700, 1120], target: [500, 480, 0], ms: 950 };

const director = new StoryDirector(scene, {
  title: '最优 BST · 区间 DP',
  total: 8,
  legend: [
    { label: '代价 e', color: '#60a5fa' },
    { label: '当前区间', color: '#22d3ee' },
    { label: '最优根', color: '#fcd34d' },
    { label: '查找路径', color: '#4ade80' },
  ],
  onReplay: () => restart(true),
});

const cellOf = (i, j) => [i - 1, j - 1];
const fmt = (v) => (Number.isFinite(v) ? v.toFixed(2) : '—');

function compute() {
  e = Array.from({ length: N + 2 }, () => Array(N + 1).fill(0));
  w = Array.from({ length: N + 2 }, () => Array(N + 1).fill(0));
  rt = Array.from({ length: N + 2 }, () => Array(N + 1).fill(0));
  for (let i = 1; i <= N + 1; i++) { e[i][i - 1] = Q[i - 1]; w[i][i - 1] = Q[i - 1]; }
  steps = [];
  for (let len = 1; len <= N; len++) {
    for (let i = 1; i + len - 1 <= N; i++) {
      const j = i + len - 1;
      w[i][j] = w[i][j - 1] + P[j] + Q[j];
      let best = Infinity, br = i;
      const cands = [];
      for (let r = i; r <= j; r++) {
        const t = e[i][r - 1] + e[r + 1][j] + w[i][j];
        cands.push({ r, t });
        if (t < best) { best = t; br = r; }
      }
      e[i][j] = best;
      rt[i][j] = br;
      steps.push({ len, i, j, w: w[i][j], cost: best, br, cands });
    }
  }
  tree = buildTree(1, N, 0, null);
  nodeOrder = [];
  const walk = (n) => { if (!n) return; nodeOrder.push(n); walk(n.left); walk(n.right); };
  walk(tree);
  treeHeight = nodeOrder.reduce((m, n) => Math.max(m, n.depth + 1), 0);
}

function buildTree(i, j, depth, parent) {
  if (i > j) return null;
  const key = rt[i][j];
  const n = { key, i, j, depth, parent, left: null, right: null };
  n.left = buildTree(i, key - 1, depth + 1, n);
  n.right = buildTree(key + 1, j, depth + 1, n);
  return n;
}

function state() {
  const rowsE = [], rowsR = [];
  for (let i = 1; i <= N; i++) {
    const re = [], rr = [];
    for (let j = 1; j <= N; j++) {
      if (i <= j && filled.has(i + ',' + j)) { re.push(fmt(e[i][j])); rr.push(String(rt[i][j])); }
      else { re.push('·'); rr.push('·'); }
    }
    rowsE.push(re); rowsR.push(rr);
  }
  return {
    blocks: [
      { type: 'kv', label: '当前区间', items: cur ? [
        { k: 'i..j', v: '[' + cur.i + '..' + cur.j + ']' },
        { k: 'w', v: fmt(cur.w) },
        { k: '最优根', v: 'k' + cur.br },
      ] : [{ k: 'i..j', v: '—' }] },
      { type: 'chips', label: '键权重 p', items: P.slice(1).map((v, i) => ({ text: 'k' + (i + 1) + ':' + v.toFixed(2) })) },
      { type: 'chips', label: '候选根', items: cur ? cur.cands.map((c) => ({ text: 'k' + c.r + ':' + fmt(c.t), cls: c.r === cur.br ? 'current' : '' })) : [] },
      { type: 'table', label: 'e 代价表', rows: rowsE, current: cur ? cellOf(cur.i, cur.j) : [-1, -1] },
      { type: 'table', label: 'root 根表', rows: rowsR, current: cur ? cellOf(cur.i, cur.j) : [-1, -1] },
      { type: 'text', label: '加权代价', value: filled.has('1,' + N) ? fmt(e[1][N]) : '—' },
      { type: 'text', label: '最优树高', value: treeHeight ? String(treeHeight) : '—' },
    ],
    footer: 'e[i][j] = min_r(e[i][r−1] + e[r+1][j]) + w[i][j] · O(n³)',
  };
}

function resetTable() {
  stage.reset();
  filled = new Set(); cur = null; pathKeys = [];
  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= N; j++) {
      const [r, c] = cellOf(i, j);
      stage.hideValue(r, c);
      stage.setColor(r, c, i > j ? DIM : BLUE);
    }
  }
  nodes.forEach((n) => { n.mesh.visible = false; n.mesh.scale.setScalar(1); n.setColor(BLUE, BLUE); });
  nodeP.forEach((t) => t.sprite.visible = false);
  edgePool.forEach((m) => { m.visible = false; });
  treeLabel.sprite.visible = false;
}

function fillStep(s) {
  const [r, c] = cellOf(s.i, s.j);
  stage.setValue(r, c, fmt(s.cost), GOLD);
  stage.setColor(r, c, GOLD);
  stage.focus(r, c);
  filled.add(s.i + ',' + s.j);
  cur = s;
  director.stateUpdate(state());
}

function placeEdge(m, a, b) {
  const dir = b.clone().sub(a);
  const len = dir.length();
  if (len < 1e-4) return;
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(UP, dir.normalize());
  m.scale.set(1.6, len, 1.6);
  m.visible = true;
}

function layoutTree() {
  const pos = {};
  nodeOrder.forEach((n) => {
    const p = new THREE.Vector3(620 + (n.key - 3) * 76, 700 - n.depth * 82, 0);
    pos[n.key] = p;
    const vn = nodes[n.key - 1];
    vn.mesh.position.copy(p);
    nodeP[n.key - 1].sprite.position.set(p.x, p.y - 42, 0);
    nodeP[n.key - 1].setText('k' + n.key + ' p=' + P[n.key].toFixed(2), { color: '#94a3b8' });
  });
  // 先隐藏全部，再按父边重新摆放
  edgePool.forEach((m) => { m.visible = false; });
  edgeByChild.clear();
  const walk = (n) => {
    if (!n) return;
    if (n.left) { const m = edgePool[nodeOrder.indexOf(n.left) - 1]; placeEdge(m, pos[n.key], pos[n.left.key]); edgeByChild.set(n.left.key, m); walk(n.left); }
    if (n.right) { const m = edgePool[nodeOrder.indexOf(n.right) - 1]; placeEdge(m, pos[n.key], pos[n.right.key]); edgeByChild.set(n.right.key, m); walk(n.right); }
  };
  walk(tree);
}

function revealTree() {
  nodes.forEach((n) => { n.mesh.visible = false; });
  nodeP.forEach((t) => { t.sprite.visible = false; });
  layoutTree();
  edgePool.forEach((m) => { m.visible = false; });
  nodes.forEach((n) => { n.mesh.visible = true; n.mesh.scale.setScalar(0.01); });
  const order = [];
  const walk = (n) => { if (!n) return; order.push(n); walk(n.left); walk(n.right); };
  walk(tree);
  return order;
}

function* runOBST() {
  director.reset();
  resetTable();
  compute();
  treeLabel.sprite.visible = false;
  director.stateUpdate(state());
  yield S(() => director.beat({
    title: '键 + 查找权重',
    why: '高频键不一定放根：代价是“深度 × 权重”。区间 DP 要选一个根，让左右子树的加权代价都最小。',
    stateText: '5 个键 · 权重 p · 失败权重 q',
    progress: 1,
    camera: SHOT_HOME,
    annotations: [
      { id: 'keys', text: '行 = 左端点 i · 列 = 右端点 j', anchor: () => new THREE.Vector3(330, 235, 0), offset: mob ? [100, -24] : [0, -22], className: 'gold' },
      { id: 'rule', text: 'e[i][j] = 左子树 + 右子树 + w', anchor: () => new THREE.Vector3(330, 675, 0), offset: [0, -22] },
    ],
  }));
  yield W(800);

  // len 1
  director.chapter('单键子树');
  yield S(() => director.beat({
    title: '长度 1：每个键单独成树',
    why: '区间 [i..i] 的根只能是 i；基项 Q[i−1]+Q[i] 加上 w[i][i] = p_i + Q[i−1] + Q[i]，得 e[i][i] = p_i + 2Q[i−1] + 2Q[i]。',
    stateText: '先填对角线 e[i][i]',
    progress: 2,
    camera: SHOT_TABLE,
    annotations: [{ id: 'diag', text: '单键区间：根唯一', anchor: () => new THREE.Vector3(330, 560, 0), offset: [0, -20] }],
  }));
  yield W(400);
  for (const s of steps.filter((x) => x.len === 1)) {
    fillStep(s);
    yield W(240);
  }
  stage.hideFocus();
  yield W(550);

  // len 2
  director.chapter('区间扩展');
  yield S(() => director.beat({
    title: '长度 2：枚举两个可能的根',
    why: '区间 [i..j] 的左右子区间已经算好；枚举根 r，左代价 e[i][r−1] 和右代价 e[r+1][j] 直接查表。',
    stateText: 'len=2：4 个区间，每个只需枚举 2 个根',
    progress: 3,
    camera: SHOT_TABLE,
    annotations: [{ id: 'expand', text: '长度按 1 → 2 → 3 扩展', anchor: () => new THREE.Vector3(330, 560, 0), offset: [0, -20], className: 'gold' }],
  }));
  yield W(420);
  for (const s of steps.filter((x) => x.len === 2)) {
    fillStep(s);
    yield W(260);
  }
  stage.hideFocus();
  yield W(550);

  // len 3-4
  director.chapter('继续扩展');
  yield S(() => director.beat({
    title: '长度 3–4：候选根变多',
    why: '每个区间都要尝试所有根，取最小。子区间必须已经填好，这就是区间 DP 的拓扑顺序。',
    stateText: 'len=3,4 · 左右子区间可直接复用',
    progress: 4,
    camera: SHOT_FULL,
    annotations: [{ id: 'order', text: '按区间长度从小到大', anchor: () => new THREE.Vector3(330, 650, 0), offset: [0, -20] }],
  }));
  yield W(420);
  for (const s of steps.filter((x) => x.len === 3 || x.len === 4)) {
    fillStep(s);
    yield W(190);
  }
  stage.hideFocus();
  yield W(500);

  // full interval: enumerate roots
  director.chapter('枚举根');
  const full = steps.find((x) => x.i === 1 && x.j === N);
  yield S(() => {
    cur = full;
    director.beat({
      title: '枚举根：k1…k5 谁当根？',
      why: '根的贡献是整棵区间的 w[1..5]；左右子树的代价再加进来。选择最小总代价的根。',
      stateText: '候选 ' + full.cands.map((c) => 'k' + c.r + '=' + fmt(c.t)).join(' · '),
      progress: 5,
      camera: SHOT_TABLE,
      annotations: [{ id: 'root', text: '最优根 k' + full.br, anchor: () => new THREE.Vector3(stage.xOf(4), stage.yOf(0), 0), offset: [0, -20], className: 'gold' }],
    });
    director.stateUpdate(state());
  });
  yield W(500);
  for (const c of full.cands) {
    const [r, cc] = cellOf(1, N);
    if (c.r > 1) stage.arrow(0, c.r - 2, r, cc, c.r === full.br ? GOLD : CYAN, 20);
    if (c.r < N) stage.arrow(c.r, N - 1, r, cc, c.r === full.br ? GOLD : CYAN, 20);
    stage.setColor(r, cc, c.r === full.br ? GOLD : CYAN);
    yield S(() => director.setBeatState('根 k' + c.r + '：左 ' + fmt(e[1][c.r - 1]) + ' + 右 ' + fmt(e[c.r + 1][N]) + ' + w ' + fmt(full.w) + ' = ' + fmt(c.t)));
    yield W(320);
  }
  stage.clearArrows();
  fillStep(full);
  stage.hideFocus();
  stage.setColor(0, N - 1, GREEN);
  yield W(750);

  // tree build
  director.chapter('根表长树');
  yield S(() => director.beat({
    title: '从根表递归建树',
    why: 'root[1][5] 是整棵树的根；左右子区间继续查 root 表，递归得到唯一的最优 BST。',
    stateText: 'root[1..5] = k' + rt[1][N] + ' · 递归展开左右子树',
    progress: 6,
    camera: SHOT_TREE,
    annotations: [{ id: 'tree', text: '根表 → 树结构', anchor: () => new THREE.Vector3(720, 780, 0), offset: [0, -22], className: 'gold' }],
  }));
  yield W(450);
  treeLabel.sprite.visible = true;
  const order = revealTree();
  for (const n of order) {
    const vn = nodes[n.key - 1];
    yield S(() => {
      vn.mesh.visible = true;
      vn.mesh.scale.setScalar(1);
      vn.setColor(n === tree ? GOLD : BLUE, n === tree ? GOLD : BLUE);
      nodeP[n.key - 1].sprite.visible = true;
      const em = edgeByChild.get(n.key);
      if (em) em.visible = true;
    });
    yield W(310);
  }
  yield W(700);

  // search path
  director.chapter('查找');
  const target = 5;
  pathKeys = [];
  let cursor = tree;
  while (cursor) {
    pathKeys.push(cursor.key);
    if (cursor.key === target) break;
    cursor = target < cursor.key ? cursor.left : cursor.right;
  }
  yield S(() => director.beat({
    title: '查找 k5：只走一条路径',
    why: 'BST 每次和当前根比较，目标更小走左、更大走右；路径长度就是这次查找的比较次数。',
    stateText: '路径 ' + pathKeys.map((k) => 'k' + k).join(' → ') + ' · 深度 ' + (pathKeys.length - 1),
    progress: 7,
    camera: SHOT_TREE,
    annotations: [{ id: 'path', text: '比较路径 ' + pathKeys.map((k) => 'k' + k).join('→'), anchor: () => new THREE.Vector3(720, 500, 0), offset: mob ? [60, -24] : [0, -22], className: 'final' }],
  }));
  yield W(500);
  for (const k of pathKeys) {
    nodes[k - 1].setColor(GREEN, GREEN);
    nodeP[k - 1].sprite.visible = true;
    yield S(() => director.setBeatState('比较 k' + k + (k === target ? '：命中！' : target < k ? '，目标更小 → 左子树' : '，目标更大 → 右子树')));
    yield W(450);
  }
  yield W(600);

  // recap
  director.chapter('复盘');
  yield S(() => {
    director.beat({
      title: '加权代价最小，不一定最矮',
      why: '最优 BST 按访问权重计算，不是简单平衡；区间 DP 枚举根，保证全局最优。时间 O(n³)，空间 O(n²)。',
      stateText: 'e[1][5] = ' + fmt(e[1][N]) + ' · 根 k' + rt[1][N] + ' · 树高 ' + treeHeight,
      progress: 8,
      camera: SHOT_FINAL,
      annotations: [{ id: 'final', text: '最优加权代价 ' + fmt(e[1][N]), anchor: () => new THREE.Vector3(720, 790, 0), offset: mob ? [50, -24] : [0, -22], className: 'final' }],
    });
    director.setProgress(8);
    director.stateUpdate(state());
    status.textContent = '最优 BST 完成 · e=' + fmt(e[1][N]) + ' · O(n³)';
  });
  yield W(900);
}

function restart(auto = true) {
  status.textContent = '';
  engine.clear();
  director.reset();
  compute();
  resetTable();
  engine.queue(() => runOBST());
  if (auto) engine.toggle();
}

input.addSelect('权重预设', PRESETS.map((x) => x.name), PRESETS[0].name, (v) => {
  const p = PRESETS.find((x) => x.name === v) || PRESETS[0];
  PRESET = p; P = p.p.slice(); Q = p.q.slice();
  restart(true);
});
input.addButton('重播', () => restart(true));
input.addButton('清空', () => {
  engine.clear();
  director.reset();
  compute();
  resetTable();
  status.textContent = '';
});

compute();
resetTable();
engine.queue(() => runOBST());
scene.start(engine);
