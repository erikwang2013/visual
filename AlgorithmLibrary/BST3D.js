// AlgorithmLibrary/BST3D.js — 二叉搜索树：比较光链、三种删除、中序丝带与退化复盘。
// 舞台/布局/镜头复用 TreeStage；每拍有“为什么”标注与实时状态面板。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { applyTheme } from '../3D/Glow.js';
import { land } from '../3D/effects/Fx.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
import { TreeStage } from '../3D/director/TreeStage.js';
applyTheme('BST3D');

const isMobile = typeof matchMedia !== 'undefined' && matchMedia('(max-width: 900px)').matches;
const SC = isMobile ? 0.76 : 1;
const scene = new Scene3D('scene', { cameraPos: [320, 720, 1120], lookAt: [320, 440, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const input = new InputKit(panel);
const status = panel.addStatus('就绪');
const stage = new TreeStage(scene, { center: [320, 470, 0], scale: SC, radius: 22, islandRadius: 620 });

const C = { base: 0x60a5fa, path: 0xfcd34d, current: 0x22d3ee, ok: 0x4ade80, bad: 0xfb7185 };
const DEMO_KEYS = [50, 30, 70, 20, 40, 60, 80, 35, 45, 65];

const director = new StoryDirector(scene, {
  title: 'BST · 树岛',
  total: 8,
  legend: [
    { label: '普通节点', color: '#60a5fa' },
    { label: '比较路径', color: '#fcd34d' },
    { label: '命中/有序', color: '#4ade80' },
    { label: '删除/缺失', color: '#fb7185' },
    { label: '当前', color: '#22d3ee' },
  ],
  onReplay: () => restart(),
});

// ---- 纯数据 BST（parent 为节点引用） ----
let root = null;
function insertModel(key) {
  const n = { key, left: null, right: null, parent: null };
  if (!root) return (root = n);
  let cur = root;
  while (true) {
    if (key < cur.key) {
      if (!cur.left) { cur.left = n; n.parent = cur; return n; }
      cur = cur.left;
    } else {
      if (!cur.right) { cur.right = n; n.parent = cur; return n; }
      cur = cur.right;
    }
  }
}
function findNode(key) {
  let cur = root;
  while (cur) {
    if (key === cur.key) return cur;
    cur = key < cur.key ? cur.left : cur.right;
  }
  return null;
}
const minNode = (n) => { while (n && n.left) n = n.left; return n; };
function transplant(u, v) {
  if (!u.parent) root = v;
  else if (u.parent.left === u) u.parent.left = v;
  else u.parent.right = v;
  if (v) v.parent = u.parent;
}
function deleteNode(z) {
  if (!z.left) transplant(z, z.right);
  else if (!z.right) transplant(z, z.left);
  else {
    const y = minNode(z.right);
    if (y.parent !== z) {
      transplant(y, y.right);
      y.right = z.right;
      y.right.parent = y;
    }
    transplant(z, y);
    y.left = z.left;
    y.left.parent = y;
  }
}
function heightOf(n) { return n ? 1 + Math.max(heightOf(n.left), heightOf(n.right)) : 0; }
function countNodes(n = root) { return n ? 1 + countNodes(n.left) + countNodes(n.right) : 0; }
function inorder(n = root, out = []) {
  if (!n) return out;
  inorder(n.left, out);
  out.push(n.key);
  inorder(n.right, out);
  return out;
}

function sync(opts = {}) {
  stage.syncTree(root, {
    id: (n) => n.key,
    label: (n) => String(n.key),
    color: () => C.base,
    layout: { stepX: 86, stepY: 112, topY: 780 },
    ms: opts.ms || 0,
    spawn: opts.spawn || 0,
  });
}

function renderState(path = [], steps) {
  director.stateUpdate({
    blocks: [
      { type: 'kv', label: 'BST 状态', items: [
        { k: '节点数', v: countNodes() },
        { k: '高度', v: heightOf(root) },
        { k: '比较次数', v: steps ?? '—' },
      ] },
      { type: 'chips', label: '比较路径', items: path.map((k, i) => ({ text: k, cls: i === path.length - 1 ? 'current' : '' })), empty: '—' },
      { type: 'text', label: '中序（必须升序）', value: inorder().join(' → ') || '空' },
    ],
  });
}

const paint = (keys, color) => keys.forEach((k) => stage.setNodeColor(k, color));
const at = (k) => () => stage.vpos(k);

function buildDemo() {
  stage.clear();
  root = null;
  DEMO_KEYS.forEach(insertModel);
  sync();
  renderState();
}

// ---- 查找 ----
function* searchFlow(key) {
  if (!root) { status.textContent = '树为空：先插入节点'; return; }
  director.chapter('查找');
  yield S(() => director.beat({
    title: '查找 ' + key,
    why: '从根开始，每次比较都排除一半子树；走出空指针就是不存在。',
    stateText: '目标 ' + key + ' · 节点 ' + countNodes() + ' · 高度 ' + heightOf(root),
    progress: 1,
    camera: stage.overview(),
    annotations: [{ id: 'root', text: '左小右大', anchor: at(root.key), offset: [0, -50], className: 'gold' }],
  }));
  const path = [];
  let cur = root;
  while (cur && cur.key !== key) {
    path.push(cur.key);
    stage.setNodeColor(cur.key, path.length === 1 ? C.current : C.path);
    stage.setActive(cur.key, C.path);
    director.annotations.set('cur', {
      text: key + (key < cur.key ? ' < ' : ' > ') + cur.key + ' → 走' + (key < cur.key ? '左' : '右'),
      anchor: at(cur.key),
      offset: [0, -50],
      className: 'gold',
    });
    renderState(path, path.length);
    yield W(330);
    cur = key < cur.key ? cur.left : cur.right;
  }
  if (cur) {
    path.push(cur.key);
    stage.setNodeColor(cur.key, C.ok);
    stage.setActive(cur.key, C.ok);
    director.annotations.set('cur', { text: '命中 ' + key + ' · 深度 ' + (path.length - 1), anchor: at(key), offset: [0, -50], className: 'final' });
    status.textContent = '查找 ' + key + '：命中，比较 ' + path.length + ' 次';
    yield W(750);
  } else {
    const last = path[path.length - 1];
    stage.setNodeColor(last, C.bad);
    stage.setActive(last, C.bad);
    director.annotations.set('cur', { text: '下一位为空 → ' + key + ' 不存在', anchor: at(last), offset: [0, -50], className: 'warn' });
    status.textContent = '查找 ' + key + '：不存在，比较 ' + path.length + ' 次';
    yield W(700);
  }
  renderState(path, path.length);
  paint(path, C.base);
  stage.setActive(null);
}

// ---- 插入 ----
function* insertFlow(key) {
  if (findNode(key)) {
    director.chapter('插入');
    yield S(() => director.beat({
      title: '插入 ' + key,
      why: key + ' 已经在树中：BST 不接受重复键。',
      stateText: '重复键 · 插入中止',
      progress: 2,
      camera: stage.focus(key),
      annotations: [{ id: 'dup', text: key + ' 已存在', anchor: at(key), offset: [0, -50], className: 'warn' }],
    }));
    stage.setNodeColor(key, C.bad);
    status.textContent = '插入 ' + key + '：键已存在，BST 不接受重复键';
    yield W(650);
    stage.setNodeColor(key, C.base);
    return;
  }
  director.chapter('插入');
  yield S(() => director.beat({
    title: '插入 ' + key,
    why: '比较决定左右；新键最终落在空位，路径上的节点都不用动。',
    stateText: '目标 ' + key,
    progress: 2,
    camera: stage.overview(),
    annotations: [{ id: 'root', text: '从根开始比较', anchor: at(root ? root.key : 0), offset: [0, -50] }],
  }));
  const path = [];
  let cur = root;
  while (cur) {
    path.push(cur.key);
    stage.setNodeColor(cur.key, C.path);
    stage.setActive(cur.key, C.path);
    director.annotations.set('cur', {
      text: key + (key < cur.key ? ' < ' : ' > ') + cur.key + ' → ' + (key < cur.key ? '左' : '右'),
      anchor: at(cur.key),
      offset: [0, -50],
      className: 'gold',
    });
    renderState(path, path.length);
    yield W(300);
    const next = key < cur.key ? cur.left : cur.right;
    if (!next) break;
    cur = next;
  }
  insertModel(key);
  if (cur) stage.setNodeColor(cur.key, C.current);
  sync({ ms: 460, spawn: 230 });
  const vn = stage.nodes.get(key);
  if (vn) land(scene, vn.mesh);
  director.annotations.set('new', { text: '新节点 ' + key + ' 落到空位', anchor: at(key), offset: [0, -50], className: 'final' });
  status.textContent = '插入 ' + key + '：路径 ' + [...path, key].join(' → ');
  renderState([...path, key], path.length);
  yield W(800);
  paint(path, C.base);
  stage.setNodeColor(key, C.base);
  stage.setActive(null);
}

// ---- 删除：叶子 / 单子 / 双子三种情形 ----
function* deleteFlow(key) {
  const z = findNode(key);
  if (!z) {
    status.textContent = '删除 ' + key + '：键不存在';
    yield S(() => director.beat({ title: '删除 ' + key, why: '先查找再删除；找不到就没有可删的节点。', stateText: '键 ' + key + ' 不存在', progress: 3, camera: stage.wide(), annotations: [] }));
    return;
  }
  const kind = !z.left && !z.right ? 'leaf' : (!z.left || !z.right ? 'single' : 'two');
  const child = kind === 'single' ? (z.left || z.right) : null;
  const succ = kind === 'two' ? minNode(z.right) : null;
  director.chapter('删除');
  const why = kind === 'leaf' ? '叶子没有孩子，直接摘掉最简单。'
    : kind === 'single' ? '只有一个孩子：让孩子顶替自己的位置，BST 顺序不变。'
      : '两个孩子的节点用中序后继（右子树最小）替换，中序仍然升序。';
  yield S(() => director.beat({
    title: '删除' + (kind === 'leaf' ? '叶子 ' : kind === 'single' ? '单子节点 ' : '双子节点 ') + key,
    why,
    stateText: '情形：' + (kind === 'leaf' ? '叶子' : kind === 'single' ? '单子' : '双子') + (succ ? ' · 后继 ' + succ.key : ''),
    progress: kind === 'two' ? 5 : 4,
    camera: stage.focus(key),
    annotations: [{ id: 'target', text: '目标 ' + key, anchor: at(key), offset: [0, -50], className: 'warn' }],
  }));
  stage.setNodeColor(key, C.bad);
  stage.setActive(key, C.bad);
  if (child) {
    stage.setNodeColor(child.key, C.ok);
    director.annotations.set('child', { text: '孩子 ' + child.key + ' 顶替', anchor: at(child.key), offset: [0, -50], className: 'final' });
  }
  if (succ) {
    stage.setNodeColor(succ.key, C.path);
    director.annotations.set('succ', { text: '中序后继 ' + succ.key, anchor: at(succ.key), offset: [0, -50], className: 'gold' });
  }
  renderState([key], 1);
  yield W(650);
  if (kind === 'leaf') {
    const vn = stage.nodes.get(key);
    if (vn) yield A(280, (p) => vn.mesh.scale.setScalar(1 - p * 0.9));
  }
  deleteNode(z);
  sync({ ms: 520 });
  renderState([], 1);
  if (kind === 'single') {
    stage.setNodeColor(child.key, C.ok);
    stage.setActive(child.key, C.ok);
    director.annotations.set('child', { text: '孩子 ' + child.key + ' 上位', anchor: at(child.key), offset: [0, -50], className: 'final' });
    status.textContent = '删除单子节点 ' + key + '：孩子 ' + child.key + ' 顶替位置';
  } else if (kind === 'two') {
    stage.setNodeColor(succ.key, C.ok);
    stage.setActive(succ.key, C.ok);
    director.annotations.set('succ', { text: '后继 ' + succ.key + ' 上位', anchor: at(succ.key), offset: [0, -50], className: 'final' });
    status.textContent = '删除双子节点 ' + key + '：中序后继 ' + succ.key + ' 上位';
  } else {
    status.textContent = '删除叶子 ' + key + '：节点数 -1';
  }
  yield W(750);
  stage.setActive(null);
  paint(inorder(), C.base);
}

// ---- 中序丝带 ----
function* inorderFlow() {
  const keys = inorder();
  director.chapter('中序不变量');
  yield S(() => director.beat({
    title: '中序丝带',
    why: '左 → 根 → 右。中序一定升序，这就是 BST 的本质。',
    stateText: '中序 ' + (keys.join(' → ') || '空'),
    progress: 6,
    camera: stage.wide(),
    annotations: [{ id: 'rule', text: '中序必须升序', anchor: () => new THREE.Vector3(stage.center.x, 690 * SC, 0), offset: [0, -24], className: 'final' }],
  }));
  for (let i = 0; i < keys.length; i++) {
    stage.setNodeColor(keys[i], C.ok);
    stage.setActive(keys[i], C.ok);
    stage.nodes.get(keys[i])?.pulse(0.2);
    director.annotations.set('order', { text: '第 ' + (i + 1) + ' 个：' + keys[i], anchor: at(keys[i]), offset: [0, -50], className: 'final' });
    director.setBeatState('中序 ' + keys.slice(0, i + 1).join(' → '));
    yield W(250);
  }
  status.textContent = '中序：' + keys.join(' → ') + '（升序 ✓）';
  yield W(800);
  paint(keys, C.base);
  stage.setActive(null);
}

// ---- 复盘：有序插入退化成链 ----
function* degradeFlow() {
  director.chapter('复盘');
  yield S(() => director.beat({
    title: '有序插入会退化',
    why: '每次新键都比所有节点大，只能一路向右；树变成链表，查找从 O(log n) 退化为 O(n)。',
    stateText: '重新插入有序序列 10…60',
    progress: 7,
    camera: stage.overview(),
    annotations: [{ id: 'warn', text: '有序输入 = 最坏情况', anchor: () => new THREE.Vector3(stage.center.x, 700 * SC, 0), offset: [0, -24], className: 'warn' }],
  }));
  yield W(500);
  stage.clear();
  root = null;
  sync();
  renderState();
  for (const k of [10, 20, 30, 40, 50, 60]) {
    insertModel(k);
    sync({ ms: 170, spawn: 120 });
    stage.nodes.get(k)?.pulse(0.16);
    renderState(inorder(), '—');
    yield W(190);
  }
  status.textContent = 'BST 演示完成：中序有序；有序插入退化成链，高度 ' + heightOf(root) + '，查找最坏 O(n)';
  yield S(() => director.beat({
    title: '退化成链',
    why: '链的高度 = 节点数；这就是 AVL / 红黑树要“自平衡”的原因。',
    stateText: '高度 ' + heightOf(root) + ' · 查找 O(n)',
    progress: 8,
    camera: stage.wide(),
    annotations: [{ id: 'chain', text: '高度 ' + heightOf(root) + ' = 节点数', anchor: at(60), offset: [0, -50], className: 'warn' }],
  }));
  yield W(850);
}

function* runBST() {
  director.reset();
  buildDemo();
  director.chapter('树岛');
  yield S(() => director.beat({
    title: '树岛就位',
    why: '左子树 < 根 < 右子树；查找只要沿比较路径下钻。',
    stateText: countNodes() + ' 个节点 · 高度 ' + heightOf(root),
    progress: 0,
    camera: stage.overview(),
    annotations: [{ id: 'root', text: '根 ' + root.key, anchor: at(root.key), offset: [0, -50], className: 'gold' }],
  }));
  yield W(700);
  yield* searchFlow(42);
  yield* insertFlow(42);
  yield* deleteFlow(20);
  yield* deleteFlow(30);
  yield* deleteFlow(50);
  yield* inorderFlow();
  yield* degradeFlow();
}

function restart() {
  engine.clear();
  director.reset();
  status.textContent = '';
  stage.clear();
  root = null;
  engine.start(runBST());
}

function clearAll() {
  engine.clear();
  director.reset();
  stage.clear();
  root = null;
  status.textContent = '';
}

function randomTree() {
  engine.clear();
  director.reset();
  stage.clear();
  root = null;
  const keys = [];
  while (keys.length < 7) {
    const k = 10 + Math.floor(Math.random() * 90);
    if (!keys.includes(k)) keys.push(k);
  }
  keys.forEach(insertModel);
  sync();
  renderState();
  status.textContent = '随机 BST：' + keys.join(', ') + ' · 节点 7 · 高度 ' + heightOf(root);
}

function runOp(kind, raw) {
  status.textContent = '';
  const key = parseInt(raw, 10);
  if (!Number.isInteger(key) || key < 1 || key > 99) {
    status.textContent = '请输入 1-99 的整数';
    return;
  }
  if (!root && kind !== 'insert') {
    status.textContent = '树为空：请先插入';
    return;
  }
  engine.clear();
  director.reset();
  const gen = kind === 'insert' ? insertFlow(key) : kind === 'delete' ? deleteFlow(key) : searchFlow(key);
  engine.start(gen);
}

const keyInput = panel.addInput('键 1-99', (v) => runOp('insert', v), 3);
input.addButton('插入', () => runOp('insert', keyInput.value));
input.addButton('删除', () => runOp('delete', keyInput.value));
input.addButton('查找', () => runOp('search', keyInput.value));
input.addButton('随机', randomTree);
input.addButton('清空', clearAll);

buildDemo();
engine.queue(() => runBST());
scene.start(engine);
