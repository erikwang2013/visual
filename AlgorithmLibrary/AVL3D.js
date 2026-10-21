// AlgorithmLibrary/AVL3D.js — AVL 树：高度/平衡因子回溯、LL 单旋与 LR 双旋、平衡仪回收。
// 每个节点上方常驻 h/bf 第二行标签；旋转过程用 TreeStage 的布局补间整棵子树搬位。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { applyTheme } from '../3D/Glow.js';
import { land } from '../3D/effects/Fx.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
import { TreeStage } from '../3D/director/TreeStage.js';
applyTheme('AVL3D');

const isMobile = typeof matchMedia !== 'undefined' && matchMedia('(max-width: 900px)').matches;
const SC = isMobile ? 0.76 : 1;
const scene = new Scene3D('scene', { cameraPos: [320, 720, 1120], lookAt: [320, 440, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const input = new InputKit(panel);
const status = panel.addStatus('就绪');
const stage = new TreeStage(scene, { center: [320, 470, 0], scale: SC, radius: 22, islandRadius: 620 });

const C = { base: 0x22d3ee, path: 0xfcd34d, current: 0x60a5fa, ok: 0x4ade80, bad: 0xfb7185 };
const ROT_DESC = { LL: '右旋', RR: '左旋', LR: '先左旋孩子，再右旋自己', RL: '先右旋孩子，再左旋自己' };
const DEMO_KEYS = [50, 30, 70, 20, 40, 60, 80];
let rotations = 0;

const director = new StoryDirector(scene, {
  title: 'AVL · 平衡仪',
  total: 8,
  legend: [
    { label: '平衡节点', color: '#22d3ee' },
    { label: '回溯路径', color: '#fcd34d' },
    { label: '失衡 |BF|≥2', color: '#fb7185' },
    { label: '回正', color: '#4ade80' },
    { label: '当前', color: '#60a5fa' },
  ],
  onReplay: () => restart(),
});

// ---- 纯数据 AVL ----
let root = null;
const h = (n) => (n ? n.height : 0);
const bf = (n) => (n ? h(n.left) - h(n.right) : 0);
const fmt = (v) => (v > 0 ? '+' + v : String(v));
function upd(n) { n.height = 1 + Math.max(h(n.left), h(n.right)); }
function rotateRight(y) {
  const x = y.left;
  y.left = x.right;
  if (x.right) x.right.parent = y;
  x.right = y;
  x.parent = y.parent;
  if (!y.parent) root = x;
  else if (y.parent.left === y) y.parent.left = x;
  else y.parent.right = x;
  y.parent = x;
  upd(y);
  upd(x);
  return x;
}
function rotateLeft(x) {
  const y = x.right;
  x.right = y.left;
  if (y.left) y.left.parent = x;
  y.left = x;
  y.parent = x.parent;
  if (!x.parent) root = y;
  else if (x.parent.left === x) x.parent.left = y;
  else x.parent.right = y;
  x.parent = y;
  upd(x);
  upd(y);
  return y;
}
function rotationType(n) {
  if (bf(n) > 1) return bf(n.left) >= 0 ? 'LL' : 'LR';
  return bf(n.right) <= 0 ? 'RR' : 'RL';
}
function rotateAt(n, type) {
  rotations++;
  if (type === 'LL') return rotateRight(n);
  if (type === 'RR') return rotateLeft(n);
  if (type === 'LR') { rotateLeft(n.left); return rotateRight(n); }
  rotateRight(n.right);
  return rotateLeft(n);
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
function insertModel(key) {
  if (findNode(key)) return null;
  const n = { key, left: null, right: null, parent: null, height: 1 };
  if (!root) { root = n; return n; }
  let cur = root;
  while (true) {
    if (key < cur.key) {
      if (!cur.left) { cur.left = n; n.parent = cur; break; }
      cur = cur.left;
    } else {
      if (!cur.right) { cur.right = n; n.parent = cur; break; }
      cur = cur.right;
    }
  }
  let p = n.parent;
  while (p) {
    upd(p);
    if (Math.abs(bf(p)) > 1) {
      const nr = rotateAt(p, rotationType(p));
      p = nr.parent;
    } else p = p.parent;
  }
  return n;
}
function deleteNode(z) {
  let start;
  if (!z.left) { start = z.parent; transplant(z, z.right); }
  else if (!z.right) { start = z.parent; transplant(z, z.left); }
  else {
    const y = minNode(z.right);
    if (y.parent !== z) {
      start = y.parent;
      transplant(y, y.right);
      y.right = z.right;
      y.right.parent = y;
    } else start = y;
    transplant(z, y);
    y.left = z.left;
    y.left.parent = y;
  }
  return start;
}
function walk(n = root, out = []) {
  if (!n) return out;
  walk(n.left, out);
  out.push(n);
  walk(n.right, out);
  return out;
}
const inorder = () => walk().map((n) => n.key);
function heightOf(n = root) { return n ? n.height : 0; }
function maxBF() { return walk().reduce((m, n) => Math.max(m, Math.abs(bf(n))), 0); }

function sync(opts = {}) {
  stage.syncTree(root, {
    id: (n) => n.key,
    label: (n) => String(n.key),
    color: () => C.base,
    layout: { stepX: 88, stepY: 112, topY: 780 },
    ms: opts.ms || 0,
    spawn: opts.spawn || 0,
  });
  updateAllInfo();
}
function updateAllInfo() {
  walk().forEach((n) => stage.setInfo(n.key, 'h' + n.height + ' bf' + fmt(bf(n)), { scale: 0.46 }));
}
function renderState(path = [], extra = {}) {
  const bfs = walk().map((n) => n.key + ':' + fmt(bf(n))).join('  ');
  director.stateUpdate({
    blocks: [
      { type: 'kv', label: 'AVL 平衡仪', items: [
        { k: '节点数', v: walk().length },
        { k: '高度', v: heightOf() },
        { k: '最大 |BF|', v: maxBF() },
        { k: '旋转次数', v: rotations },
        { k: '类型', v: extra.type || '—' },
      ] },
      { type: 'chips', label: '比较 / 回溯路径', items: path.map((k) => ({ text: k, cls: k === extra.current ? 'current' : '' })), empty: '—' },
      { type: 'text', label: 'BF = 左高 − 右高（|BF| ≤ 1）', value: bfs || '空' },
    ],
  });
}
const at = (k) => () => stage.vpos(k);

// ---- 查找 ----
function* searchFlow(key) {
  director.chapter('查找');
  const path = [];
  for (let n = root; n; n = key === n.key ? null : key < n.key ? n.left : n.right) {
    path.push(n.key);
    stage.setNodeColor(n.key, key === n.key ? C.ok : C.path);
    stage.setActive(n.key, key === n.key ? C.ok : C.path);
    director.annotations.set('cur', {
      text: key === n.key ? '命中 ' + key + ' · h' + n.height + ' bf' + fmt(bf(n)) : key + (key < n.key ? ' < ' : ' > ') + n.key + ' → 走' + (key < n.key ? '左' : '右'),
      anchor: at(n.key), offset: [0, -50], className: key === n.key ? 'final' : 'gold',
    });
    renderState(path);
    if (key === n.key) break;
    yield W(300);
  }
  const pos = path[path.length - 1], hit = findNode(key);
  if (!hit && pos) {
    stage.setNodeColor(pos, C.bad); stage.setActive(pos, C.bad);
    director.annotations.set('cur', { text: '空指针 → ' + key + ' 不存在', anchor: at(pos), offset: [0, -50], className: 'warn' });
  }
  status.textContent = '查找 ' + key + '：' + (hit ? '命中' : '不存在') + ' · 比较 ' + path.length + ' 次 · 高度 ' + heightOf();
  renderState(path);
  yield W(700);
  walk().forEach((n) => stage.setNodeColor(n.key, C.base));
  stage.setActive(null);
}

// ---- 回溯：更新高度 → 找最低失衡 → 旋转 ----
function* retraceFlow(start, op) {
  let n = start;
  let first = true;
  while (n) {
    const oldH = n.height;
    upd(n);
    const b = bf(n);
    stage.setInfo(n.key, 'h' + n.height + ' bf' + fmt(b), { scale: 0.46 });
    stage.setNodeColor(n.key, Math.abs(b) > 1 ? C.bad : C.current);
    stage.setActive(n.key, Math.abs(b) > 1 ? C.bad : C.current);
    if (first) {
      first = false;
      yield S(() => director.beat({
        title: op + '后回溯更新',
        why: '新节点可能改变祖先高度；高度 = max(左,右)+1，从下往上重算。',
        stateText: '更新 ' + n.key + '：h ' + oldH + ' → ' + n.height + ' · BF ' + fmt(b),
        progress: op === '插入' ? 2 : 6,
        camera: stage.focus(n.key),
        annotations: [{ id: 'h', text: 'h=' + n.height + ' · BF=' + fmt(b), anchor: at(n.key), offset: [0, -50], className: 'gold' }],
      }));
      yield W(520);
    } else {
      director.setBeatState('更新 ' + n.key + '：h ' + n.height + ' · BF ' + fmt(b));
      renderState(inorder(), { current: n.key });
      yield W(300);
    }
    if (Math.abs(b) > 1) {
      const type = rotationType(n);
      stage.setNodeColor(n.key, C.bad);
      stage.setActive(n.key, C.bad);
      director.annotations.set('bad', { text: '最低失衡点 ' + n.key + '：BF ' + fmt(b), anchor: at(n.key), offset: [0, -50], className: 'warn' });
      yield S(() => director.beat({
        title: '失衡：BF = ' + fmt(b),
        why: '最低的不平衡点决定旋转类型；先修它，上面的高度会跟着恢复。',
        stateText: '失衡节点 ' + n.key + ' · 类型 ' + type,
        progress: op === '插入' ? 3 : 6,
        camera: stage.focus(n.key),
        annotations: [{ id: 'bad', text: 'BF ' + fmt(b) + ' → ' + type, anchor: at(n.key), offset: [0, -50], className: 'warn' }],
      }));
      yield W(700);
      yield S(() => director.beat({
        title: type + ' → ' + ROT_DESC[type],
        why: type === 'LL' || type === 'RR' ? '外侧插入：一次单旋即可回正。' : '内侧插入：先转孩子把之字形拉直，再转自己。',
        stateText: '旋转类型 ' + type + ' · 累计 ' + rotations + ' 次',
        progress: 4,
        camera: stage.focus(n.key, { dist: 360 }),
        annotations: [{ id: 'rot', text: type + ' · ' + ROT_DESC[type], anchor: at(n.key), offset: [0, -50], className: 'final' }],
      }));
      yield W(300);
      const nr = rotateAt(n, type);
      sync({ ms: 520 });
      stage.setNodeColor(nr.key, C.ok);
      stage.setActive(nr.key, C.ok);
      stage.nodes.get(nr.key)?.pulse(0.22);
      renderState(inorder(), { type, current: nr.key });
      yield W(700);
      n = nr.parent;
      continue;
    }
    n = n.parent;
  }
  walk().forEach((x) => stage.setNodeColor(x.key, C.base));
  stage.setActive(null);
  updateAllInfo();
  status.textContent = op + '完成：中序 ' + inorder().join(' → ') + ' · 最大 |BF| = ' + maxBF() + (maxBF() <= 1 ? ' ✓' : ' ✗');
  renderState();
}

// ---- 插入 ----
function* insertFlow(key) {
  if (findNode(key)) {
    status.textContent = '插入 ' + key + '：键已存在';
    yield W(300);
    return;
  }
  director.chapter('插入');
  yield S(() => director.beat({
    title: '插入 ' + key,
    why: '先按 BST 规则找空位：小的往左、大的往右。',
    stateText: '节点 ' + walk().length + ' · 高度 ' + heightOf(),
    progress: 1,
    camera: stage.overview(),
    annotations: [{ id: 'head', text: '先按 BST 插入', anchor: at(root ? root.key : key), offset: [0, -50], className: 'gold' }],
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
    renderState(path, { current: cur.key });
    yield W(280);
    const next = key < cur.key ? cur.left : cur.right;
    if (!next) break;
    cur = next;
  }
  const n = { key, left: null, right: null, parent: null, height: 1 };
  if (!root) root = n;
  else {
    n.parent = cur;
    if (key < cur.key) cur.left = n;
    else cur.right = n;
  }
  sync({ ms: 460, spawn: 230 });
  const vn = stage.nodes.get(key);
  if (vn) land(scene, vn.mesh);
  director.annotations.set('new', { text: '新节点 ' + key + ' 落地', anchor: at(key), offset: [0, -50], className: 'final' });
  path.forEach((k) => stage.setNodeColor(k, C.base));
  yield W(480);
  yield* retraceFlow(n.parent, '插入');
}

// ---- 删除 ----
function* deleteFlow(key) {
  const z = findNode(key);
  if (!z) {
    status.textContent = '删除 ' + key + '：键不存在';
    yield W(300);
    return;
  }
  director.chapter('删除');
  yield S(() => director.beat({
    title: '删除 ' + key,
    why: '删除可能降低子树高度，同样要回溯检查平衡因子。',
    stateText: '节点 ' + walk().length + ' · 高度 ' + heightOf(),
    progress: 6,
    camera: stage.focus(key),
    annotations: [{ id: 'target', text: '删除 ' + key, anchor: at(key), offset: [0, -50], className: 'warn' }],
  }));
  stage.setNodeColor(key, C.bad);
  stage.setActive(key, C.bad);
  yield W(500);
  if (z.left && z.right) {
    const succ = minNode(z.right);
    stage.setNodeColor(succ.key, C.path);
    director.annotations.set('succ', { text: '后继 ' + succ.key + ' 顶替', anchor: at(succ.key), offset: [0, -50], className: 'gold' });
    yield W(450);
  }
  const start = deleteNode(z);
  sync({ ms: 500 });
  yield W(400);
  if (start) yield* retraceFlow(start, '删除');
  else {
    status.textContent = root ? '删除根后由子节点接替' : '删除根后树为空';
    renderState(root ? inorder() : []);
  }
}

function* runAVL() {
  director.reset();
  stage.clear();
  root = null;
  rotations = 0;
  DEMO_KEYS.forEach(insertModel);
  sync();
  updateAllInfo();
  renderState();
  director.chapter('平衡仪');
  yield S(() => director.beat({
    title: 'AVL 平衡仪',
    why: '每个节点上方是 h/bf；只要 |BF| ≤ 1，树高就被锁在 O(log n)。',
    stateText: '节点 ' + walk().length + ' · 高度 ' + heightOf() + ' · 最大 |BF| ' + maxBF(),
    progress: 0,
    camera: stage.overview(),
    annotations: [{ id: 'bf', text: 'BF = 左高 − 右高', anchor: at(root.key), offset: [0, -50], className: 'gold' }],
  }));
  yield W(800);
  yield* insertFlow(10);
  yield* insertFlow(5);
  yield* insertFlow(25);
  yield* deleteFlow(5);
  yield* insertFlow(90);
  yield* insertFlow(95);
  yield* insertFlow(85);
  director.chapter('结算');
  yield S(() => director.beat({
    title: 'BST + 平衡 = AVL',
    why: '中序有序且所有 |BF| ≤ 1；LL→右旋，RR→左旋，LR/RL→先转孩子再转自己。',
    stateText: '中序 ' + inorder().join(' → ') + ' · 最大 |BF| ' + maxBF(),
    progress: 8,
    camera: stage.wide(),
    annotations: [
      { id: 'in', text: isMobile ? inorder().length + ' 键中序有序' : '中序：' + inorder().join(' → '), anchor: () => new THREE.Vector3(stage.center.x, 700 * SC, 0), offset: [0, -24], className: 'final' },
      { id: 'b', text: '最大 |BF| = ' + maxBF() + ' ✓', anchor: at(root.key), offset: [0, -50], className: 'final' },
    ],
  }));
  status.textContent = 'AVL 演示完成：中序 ' + inorder().join(' → ') + ' · 最大 |BF| = ' + maxBF() + ' ✓ · 旋转 ' + rotations + ' 次';
  yield W(850);
}

function restart() {
  engine.clear();
  director.reset();
  status.textContent = '';
  stage.clear();
  root = null;
  rotations = 0;
  engine.start(runAVL());
}
function clearAll() {
  engine.clear();
  director.reset();
  stage.clear();
  root = null;
  rotations = 0;
  status.textContent = '';
}
function randomTree() {
  engine.clear();
  director.reset();
  stage.clear();
  root = null;
  rotations = 0;
  const keys = [];
  while (keys.length < 7) {
    const k = 10 + Math.floor(Math.random() * 90);
    if (!keys.includes(k)) keys.push(k);
  }
  keys.forEach(insertModel);
  sync();
  updateAllInfo();
  renderState();
  status.textContent = '随机 AVL：' + keys.join(', ') + ' · 高度 ' + heightOf() + ' · 最大 |BF| ' + maxBF();
}
function runOp(kind, raw) {
  status.textContent = '';
  const key = parseInt(raw, 10);
  if (!Number.isInteger(key) || key < 1 || key > 99) {
    status.textContent = '请输入 1-99 的整数';
    return;
  }
  engine.clear();
  director.reset();
  engine.start(kind === 'insert' ? insertFlow(key) : kind === 'search' ? searchFlow(key) : deleteFlow(key));
}

const keyInput = panel.addInput('键 1-99', (v) => runOp('insert', v), 3);
input.addButton('插入', () => runOp('insert', keyInput.value));
input.addButton('删除', () => runOp('delete', keyInput.value));
input.addButton('查找', () => runOp('search', keyInput.value));
input.addButton('随机', randomTree);
input.addButton('清空', clearAll);

// 初始展示：预建平衡树 + h/bf 标签
DEMO_KEYS.forEach(insertModel);
sync();
updateAllInfo();
renderState();
engine.queue(() => runAVL());
scene.start(engine);
