// AlgorithmLibrary/BPlusTree3D.js — B+ 树（内部 2 键 / 叶子 3 键）：索引导航、叶子分裂、叶子链、范围查询、删除合并。
// 卡片节点 + 叶间绿色箭头链；分裂时提升键从叶子升到父节点。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
import { TreeStage } from '../3D/director/TreeStage.js';
applyTheme('BPlusTree3D');

const isMobile = typeof matchMedia !== 'undefined' && matchMedia('(max-width: 900px)').matches;
const SC = isMobile ? 0.78 : 1;
const scene = new Scene3D('scene', { cameraPos: [320, 700, 1150], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const input = new InputKit(panel);
const status = panel.addStatus('就绪');
const stage = new TreeStage(scene, { center: [320, 470, 0], scale: SC, radius: 22, islandRadius: 640 });

const C = { base: 0x818cf8, path: 0xfcd34d, current: 0x22d3ee, ok: 0x4ade80, bad: 0xfb7185, chain: 0x4ade80 };
const LEAF_MAX = 3;
const IN_MAX = 2;
const LEAF_MIN = 2;
const IN_MIN = 1;
const DEMO_KEYS = [10, 20, 30, 40, 50, 60, 70, 80];

const director = new StoryDirector(scene, {
  title: 'B+ 树 · 书架',
  total: 8,
  legend: [
    { label: '索引节点', color: '#818cf8' },
    { label: '导航路径', color: '#fcd34d' },
    { label: '命中/结果', color: '#4ade80' },
    { label: '当前叶', color: '#22d3ee' },
    { label: '删除/分裂', color: '#fb7185' },
  ],
  onReplay: () => restart(),
});

// ---- 纯数据 B+ 树 ----
let root = null;
let nextId = 0;
let splits = 0;
let merges = 0;
function makeNode(leaf) { return { id: 'b' + nextId++, leaf, keys: [], children: [], parent: null, next: null }; }
function findLeaf(key) {
  let n = root;
  while (n && !n.leaf) { let i = 0; while (i < n.keys.length && key >= n.keys[i]) i++; n = n.children[i]; }
  return n;
}
function insertKey(key) {
  if (!root) root = makeNode(true);
  const leaf = findLeaf(key);
  let i = 0; while (i < leaf.keys.length && leaf.keys[i] < key) i++;
  if (leaf.keys[i] === key) return { leaf, dup: true };
  leaf.keys.splice(i, 0, key);
  return leaf.keys.length <= LEAF_MAX ? { leaf } : { leaf, split: splitLeaf(leaf) };
}
function splitLeaf(leaf) {
  splits++;
  const mid = Math.ceil(leaf.keys.length / 2), right = makeNode(true);
  right.keys = leaf.keys.splice(mid); right.next = leaf.next; leaf.next = right;
  const up = right.keys[0];
  insertIntoParent(leaf, up, right);
  return { left: leaf, right, promoted: up };
}
function insertIntoParent(left, key, right) {
  const p = left.parent;
  if (!p) {
    const nr = makeNode(false); nr.keys = [key]; nr.children = [left, right];
    left.parent = nr; right.parent = nr; root = nr; return nr;
  }
  const i = p.children.indexOf(left);
  p.keys.splice(i, 0, key); p.children.splice(i + 1, 0, right); right.parent = p;
  return p.keys.length <= IN_MAX ? null : splitInternal(p);
}
function splitInternal(node) {
  splits++;
  const mid = Math.floor(node.keys.length / 2), up = node.keys[mid], right = makeNode(false);
  right.keys = node.keys.slice(mid + 1); right.children = node.children.slice(mid + 1);
  right.children.forEach((c) => { c.parent = right; });
  node.keys = node.keys.slice(0, mid); node.children = node.children.slice(0, mid + 1);
  const p = node.parent;
  if (!p) {
    const nr = makeNode(false); nr.keys = [up]; nr.children = [node, right];
    node.parent = nr; right.parent = nr; root = nr;
    return { promoted: up, newRoot: nr };
  }
  const i = p.children.indexOf(node);
  p.keys.splice(i, 0, up); p.children.splice(i + 1, 0, right); right.parent = p;
  return p.keys.length <= IN_MAX ? { promoted: up } : splitInternal(p);
}
function deleteKey(key) {
  const leaf = findLeaf(key), i = leaf ? leaf.keys.indexOf(key) : -1;
  if (i < 0) return { missing: true, leaf };
  leaf.keys.splice(i, 1);
  if (leaf === root) { const empty = !leaf.keys.length; if (empty) root = null; return { leaf, removed: key, empty }; }
  return leaf.keys.length < LEAF_MIN ? { leaf, removed: key, ...mergeLeaf(leaf) } : { leaf, removed: key };
}
// 先向左右兄弟借；借不到才合并，合并后超过容量则绝不执行。
function mergeLeaf(leaf) {
  const p = leaf.parent, i = p.children.indexOf(leaf);
  const left = i > 0 ? p.children[i - 1] : null, right = i < p.children.length - 1 ? p.children[i + 1] : null;
  if (left && left.keys.length > LEAF_MIN) {
    leaf.keys.unshift(left.keys.pop()); p.keys[i - 1] = leaf.keys[0];
    return { borrow: { leaf, donor: left, side: '左' } };
  }
  if (right && right.keys.length > LEAF_MIN) {
    leaf.keys.push(right.keys.shift()); p.keys[i] = right.keys[0];
    return { borrow: { leaf, donor: right, side: '右' } };
  }
  const ln = right ? leaf : left, rn = right || leaf, sep = right ? i : i - 1;
  if (!ln || ln.keys.length + rn.keys.length > LEAF_MAX) return {};
  ln.keys.push(...rn.keys); ln.next = rn.next;
  p.keys.splice(sep, 1); p.children.splice(sep + 1, 1); merges++;
  if (!p.keys.length) {
    if (p === root) { root = p.children[0]; root.parent = null; }
    else mergeInternal(p);
  }
  return { merge: { left: ln, right: rn } };
}
function mergeInternal(node) {
  const p = node.parent, i = p.children.indexOf(node);
  const left = i > 0 ? p.children[i - 1] : null, right = i < p.children.length - 1 ? p.children[i + 1] : null;
  if (left && left.keys.length > IN_MIN) {
    node.keys.unshift(p.keys[i - 1]); p.keys[i - 1] = left.keys.pop();
    node.children.unshift(left.children.pop()); node.children[0].parent = node;
    return;
  }
  if (right && right.keys.length > IN_MIN) {
    node.keys.push(p.keys[i]); p.keys[i] = right.keys.shift();
    node.children.push(right.children.shift()); node.children[node.children.length - 1].parent = node;
    return;
  }
  const ln = right ? node : left, rn = right || node, sep = right ? i : i - 1;
  if (!ln || ln.keys.length + 1 + rn.keys.length > IN_MAX) return;
  ln.keys.push(p.keys[sep], ...rn.keys); ln.children.push(...rn.children);
  rn.children.forEach((c) => { c.parent = ln; });
  p.keys.splice(sep, 1); p.children.splice(sep + 1, 1); merges++;
  if (!p.keys.length) {
    if (p === root) { root = p.children[0]; root.parent = null; }
    else mergeInternal(p);
  }
}
function walkNodes(n = root, out = []) {
  if (!n) return out;
  out.push(n); n.children.forEach((c) => walkNodes(c, out)); return out;
}
function leafList() {
  const out = [];
  if (!root) return out;
  let n = root; while (!n.leaf) n = n.children[0];
  for (; n; n = n.next) out.push(n);
  return out;
}
function searchPath(key) {
  const path = [];
  let n = root;
  while (n) {
    path.push(n);
    if (n.leaf) break;
    let i = 0; while (i < n.keys.length && key >= n.keys[i]) i++;
    n = n.children[i];
  }
  return path;
}
const nodeLabel = (n) => (n.keys.length ? n.keys.join(n.leaf ? ' · ' : ' | ') : '空');

// ---- 视觉：VBox 卡片 + TreeStage 边 ----
const cards = new Map();
const at = (id) => () => stage.vpos(id);
function layoutB() {
  const pos = new Map(), leaves = leafList();
  if (!root) return pos;
  const gap = 168 * SC, depth = new Map();
  leaves.forEach((l, i) => pos.set(l.id, new THREE.Vector3(stage.center.x + (i - (leaves.length - 1) / 2) * gap, 340, 0)));
  (function walk(n, d) { depth.set(n.id, d); n.children.forEach((c) => walk(c, d + 1)); })(root, 0);
  const maxD = Math.max(...depth.values());
  (function place(n) {
    if (n.leaf) return;
    n.children.forEach(place);
    const xs = n.children.map((c) => pos.get(c.id).x);
    pos.set(n.id, new THREE.Vector3((Math.min(...xs) + Math.max(...xs)) / 2, 340 + (maxD - depth.get(n.id)) * 150 * SC, 0));
  })(root);
  return pos;
}
function syncB(opts = {}) {
  const pos = layoutB(), alive = new Set();
  for (const n of walkNodes()) {
    alive.add(n.id);
    const p = pos.get(n.id);
    let c = cards.get(n.id);
    if (!c) {
      c = new VBox(scene, { w: (n.leaf ? 136 : 122) * SC, h: 54 * SC, d: 26 * SC, x: p.x, y: p.y, z: p.z, label: nodeLabel(n), color: C.base });
      cards.set(n.id, c); stage.attachNode(n.id, c, p);
    } else {
      if (opts.ms) c.moveTo(p.x, p.y, p.z, opts.ms); else c.mesh.position.copy(p);
      c.setText(nodeLabel(n)); stage.positions.set(n.id, p.clone());
    }
  }
  for (const id of [...cards.keys()]) {
    if (alive.has(id)) continue;
    stage.removeNode(id); cards.delete(id);
  }
  stage.setEdges(linksB());
}
function linksB() {
  const links = [];
  const point = (id, dy) => () => (stage.vpos(id) ? stage.vpos(id).clone().add(new THREE.Vector3(0, dy * SC, 0)) : null);
  for (const n of walkNodes()) {
    if (n.leaf) continue;
    n.children.forEach((c) => links.push({ a: point(n.id, -27), b: point(c.id, 27), color: 0x64748b, opacity: 0.55, radius: 2 }));
  }
  for (const l of leafList()) if (l.next) links.push({ a: point(l.id, -42), b: point(l.next.id, -42), color: C.chain, opacity: 0.9, radius: 2.2, arrow: true, offset: 9 * SC });
  return links;
}
const paintCard = (id, color) => cards.get(id)?.setColor(color, color);
function paintAll() { cards.forEach((c) => c.setColor(C.base, C.base)); }
function renderState(extra = {}) {
  const leaves = leafList();
  const index = walkNodes().filter((n) => !n.leaf).map((n) => '[' + n.keys.join('|') + ']').join(' ');
  const blocks = [
    { type: 'kv', label: 'B+ 树 · 阶数 3', items: [
      { k: '节点数', v: walkNodes().length },
      { k: '叶子数', v: leaves.length },
      { k: '分裂次数', v: splits },
      { k: '合并次数', v: merges },
    ] },
    { type: 'chips', label: '叶子链表（next 指针）', items: leaves.map((l) => ({ text: '[' + l.keys.join(' ') + ']', cls: extra.active === l.id ? 'current' : '' })), empty: '空' },
    { type: 'text', label: '内部节点（纯索引）', value: index || '空' },
  ];
  if (extra.path) blocks.splice(2, 0, { type: 'chips', label: '导航路径', items: extra.path, empty: '—' });
  if (extra.result) blocks.push({ type: 'text', label: '范围结果', value: extra.result });
  director.stateUpdate({ blocks });
}
function pathChips(path) {
  return path.map((n, i) => ({ text: n.keys.join('|') || '空', cls: i === path.length - 1 ? 'current' : '' }));
}

// ---- 查找 ----
function* searchFlow(key) {
  if (!root) { status.textContent = 'B+ 树为空'; return; }
  director.chapter('查找');
  yield S(() => director.beat({
    title: '查找 ' + key,
    why: '内部节点只做索引：每层按分隔键选孩子，数据只可能在叶子。',
    stateText: '根索引 [' + root.keys.join('|') + ']',
    progress: 1,
    camera: stage.overview(),
    annotations: [{ id: 'root', text: '内部只做索引', anchor: at(root.id), offset: [0, -50], className: 'gold' }],
  }));
  const path = searchPath(key);
  for (const n of path) {
    paintCard(n.id, C.path);
    stage.setActive(n.id, C.path);
    director.annotations.set('cur', { text: n.leaf ? '叶层 [' + n.keys.join(' ') + ']' : '索引 [' + n.keys.join('|') + '] → 第 ' + (n.children.findIndex((c) => c === path[path.indexOf(n) + 1]) + 1) + ' 个孩子', anchor: at(n.id), offset: [0, -50], className: 'gold' });
    renderState({ path: pathChips(path.slice(0, path.indexOf(n) + 1)) });
    yield W(420);
  }
  const leaf = path[path.length - 1];
  const found = leaf.keys.includes(key);
  paintCard(leaf.id, found ? C.ok : C.bad);
  stage.setActive(leaf.id, found ? C.ok : C.bad);
  director.annotations.set('cur', { text: found ? '命中 ' + key : key + ' 不在叶子', anchor: at(leaf.id), offset: [0, -50], className: found ? 'final' : 'warn' });
  status.textContent = '查找 ' + key + '：' + (found ? '命中' : '不存在') + ' · 访问 ' + path.length + ' 层';
  renderState({ path: pathChips(path), active: leaf.id });
  yield W(800);
  paintAll(); stage.setActive(null);
}

// ---- 插入 / 分裂 ----
function* insertFlow(key) {
  if (findLeaf(key)?.keys.includes(key)) {
    status.textContent = '插入 ' + key + '：键已存在';
    yield W(300);
    return;
  }
  director.chapter('插入');
  yield S(() => director.beat({
    title: '插入 ' + key,
    why: '先沿索引找到目标叶子，再在叶内有序列插入；数据只留在叶子。',
    stateText: '叶子容量 ' + LEAF_MAX + ' 键',
    progress: 2,
    camera: stage.overview(),
    annotations: [{ id: 'leaf', text: '数据只在叶子', anchor: () => (root ? at(root.id)() : null), offset: [0, -50], className: 'gold' }],
  }));
  const path = searchPath(key);
  for (const n of path) {
    paintCard(n.id, C.path);
    stage.setActive(n.id, C.path);
    renderState({ path: pathChips(path.slice(0, path.indexOf(n) + 1)) });
    yield W(330);
  }
  const res = insertKey(key);
  syncB({ ms: 460 });
  paintCard(res.leaf.id, C.ok);
  stage.setActive(res.leaf.id, C.ok);
  status.textContent = '插入 ' + key + '：叶子 [' + res.leaf.keys.join(' ') + ']';
  renderState({ active: res.leaf.id });
  yield W(600);
  if (res.split) {
    const { left, right, promoted } = res.split;
    yield S(() => director.beat({
      title: '叶子分裂：键值上升',
      why: '叶子满了对半分裂；中间键复制到父节点做分隔，数据仍只留在叶子。',
      stateText: '分裂：[' + left.keys.join(' ') + '] | [' + right.keys.join(' ') + ']，上升 ' + promoted,
      progress: 3,
      camera: stage.focus(left.id, { dist: 430 }),
      annotations: [
        { id: 'l', text: '左叶 [' + left.keys.join(' ') + ']', anchor: at(left.id), offset: [0, -50], className: 'final' },
        { id: 'r', text: '右叶 [' + right.keys.join(' ') + ']', anchor: at(right.id), offset: [0, -50], className: 'gold' },
      ],
    }));
    paintCard(left.id, C.ok);
    paintCard(right.id, C.ok);
    status.textContent = '分裂完成：键 ' + promoted + ' 上升到父节点 · 累计 ' + splits + ' 次';
    renderState({ active: right.id });
    yield W(750);
  }
  paintAll(); stage.setActive(null);
}

// ---- 范围查询 ----
function* rangeFlow(lo, hi) {
  if (!root) { status.textContent = 'B+ 树为空'; return; }
  if (lo > hi) [lo, hi] = [hi, lo];
  director.chapter('范围查询');
  yield S(() => director.beat({
    title: '范围查询 [' + lo + ', ' + hi + ']',
    why: '先定位下界所在叶子，再沿 next 指针横扫叶子链；不用回到根。',
    stateText: '区间 [' + lo + ', ' + hi + ']',
    progress: 5,
    camera: stage.overview(),
    annotations: [{ id: 'chain', text: '沿叶子链扫描', anchor: () => (leafList()[0] ? at(leafList()[0].id)() : null), offset: [0, -50], className: 'gold' }],
  }));
  const path = searchPath(lo);
  for (const n of path) {
    paintCard(n.id, C.path);
    yield W(320);
  }
  const result = [], leaves = leafList();
  let n = findLeaf(lo) || leaves[0];
  let guard = leaves.length + 1;
  while (n && guard-- > 0) {
    if (n.keys.length && n.keys[0] > hi) break;
    paintCard(n.id, C.ok);
    for (const k of n.keys) if (k >= lo && k <= hi) result.push(k);
    director.annotations.set('scan', { text: '扫描 [' + n.keys.join(' ') + ']', anchor: at(n.id), offset: [0, -50], className: 'final' });
    renderState({ result: result.length ? result.join(' → ') : '—', active: n.id });
    yield W(420);
    n = n.next;
  }
  status.textContent = '范围查询 [' + lo + ',' + hi + ']：结果 ' + (result.join(' → ') || '空');
  renderState({ result: result.length ? result.join(' → ') : '空' });
  yield W(800);
  paintAll();
}

// ---- 删除 / 合并 ----
function* deleteFlow(key) {
  const leaf = findLeaf(key);
  if (!leaf || !leaf.keys.includes(key)) {
    status.textContent = '删除 ' + key + '：键不存在';
    yield W(300);
    return;
  }
  director.chapter('删除/合并');
  yield S(() => director.beat({
    title: '删除 ' + key,
    why: '叶子删空后保持半满：能借就借，不能借就与兄弟合并，并回收父节点分隔键。',
    stateText: '叶 [' + leaf.keys.join(' ') + ']',
    progress: 6,
    camera: stage.focus(leaf.id),
    annotations: [{ id: 'target', text: '删除 ' + key, anchor: at(leaf.id), offset: [0, -50], className: 'warn' }],
  }));
  paintCard(leaf.id, C.bad);
  yield W(450);
  const res = deleteKey(key);
  syncB({ ms: 500 });
  if (res.empty || !root) {
    status.textContent = '删除 ' + key + ' 后树为空';
    renderState({ active: null });
  } else if (res.borrow) {
    const b = res.borrow;
    paintCard(b.leaf.id, C.ok); stage.setActive(b.leaf.id, C.ok);
    director.annotations.set('borrow', { text: '向' + b.side + '兄弟借键 → [' + b.leaf.keys.join(' ') + ']', anchor: at(b.leaf.id), offset: [0, -50], className: 'final' });
    status.textContent = '删除 ' + key + '：向' + b.side + '兄弟借用 · 叶 [' + b.leaf.keys.join(' ') + ']';
    renderState({ active: b.leaf.id });
  } else if (res.merge) {
    paintCard(res.merge.left.id, C.ok);
    stage.setActive(res.merge.left.id, C.ok);
    director.annotations.set('merge', { text: '合并 → [' + res.merge.left.keys.join(' ') + ']', anchor: at(res.merge.left.id), offset: [0, -50], className: 'final' });
    status.textContent = '删除 ' + key + '：合并后叶 [' + res.merge.left.keys.join(' ') + '] · 累计 ' + merges + ' 次';
    renderState({ active: res.merge.left.id });
  } else {
    status.textContent = '删除 ' + key + '：叶 [' + res.leaf.keys.join(' ') + '] ' + (res.leaf === root ? '已是根叶（不要求 LEAF_MIN=' + LEAF_MIN + '）' : '仍满足 LEAF_MIN=' + LEAF_MIN);
    renderState({ active: res.leaf.id });
  }
  yield W(850);
  paintAll();
  stage.setActive(null);
}

function* runBPlus() {
  director.reset(); stage.clear(); cards.clear();
  root = null; nextId = 0; splits = 0; merges = 0;
  DEMO_KEYS.forEach(insertKey);
  syncB();
  renderState();
  director.chapter('书架');
  yield S(() => director.beat({
    title: 'B+ 树书架',
    why: '内部节点只是索引，所有数据在叶子；叶子用 next 指针连成传送带。',
    stateText: '阶数 3 · 叶子 ' + leafList().length + ' 片 · 节点 ' + walkNodes().length,
    progress: 0,
    camera: stage.overview(),
    annotations: [
      { id: 'root', text: '内部 = 索引', anchor: at(root.id), offset: [0, -50], className: 'gold' },
      { id: 'leaf', text: '数据只在叶子', anchor: at(leafList()[0].id), offset: [0, -50], className: 'final' },
    ],
  }));
  yield W(800);
  yield* searchFlow(60);
  yield* insertFlow(55);
  yield* insertFlow(56);
  yield* rangeFlow(45, 65);
  yield* deleteFlow(60);
  yield* deleteFlow(56);
  director.chapter('结算');
  yield S(() => director.beat({
    title: '索引 + 叶子链 = 数据库索引',
    why: '内部索引让点查 O(log n)，叶子链让范围查询只扫结果段；这就是 MySQL 索引爱用 B+ 树的原因。',
    stateText: '分裂 ' + splits + ' 次 · 合并 ' + merges + ' 次 · 叶子 ' + leafList().length + ' 片',
    progress: 8,
    camera: stage.wide(),
    annotations: [
      { id: 'chain', text: '叶子链：' + leafList().map((l) => '[' + l.keys.join(' ') + ']').join(' → '), anchor: () => new THREE.Vector3(stage.center.x, 650 * SC, 0), offset: [0, -24], className: 'final' },
    ],
  }));
  status.textContent = 'B+ 树演示完成：叶子链 ' + leafList().map((l) => '[' + l.keys.join(' ') + ']').join(' → ');
  yield W(850);
}

function resetData() {
  engine.clear(); director.reset(); stage.clear(); cards.clear();
  root = null; nextId = 0; splits = 0; merges = 0;
}
function restart() { resetData(); status.textContent = ''; engine.start(runBPlus()); }
function clearAll() { resetData(); status.textContent = ''; }
function randomTree() {
  resetData();
  const keys = [];
  while (keys.length < 8) {
    const k = 10 + Math.floor(Math.random() * 90);
    if (!keys.includes(k)) keys.push(k);
  }
  keys.forEach(insertKey);
  syncB();
  renderState();
  status.textContent = '随机 B+ 树：' + keys.join(', ') + ' · 叶子 ' + leafList().length + ' 片';
}
function runOp(kind, raw) {
  status.textContent = '';
  const range = /^\s*(\d+)\s*-\s*(\d+)\s*$/.exec(raw);
  if (kind === 'range') {
    if (!range) { status.textContent = '范围格式：45-65'; return; }
    engine.clear();
    director.reset();
    engine.start(rangeFlow(parseInt(range[1], 10), parseInt(range[2], 10)));
    return;
  }
  const key = parseInt(raw, 10);
  if (!Number.isInteger(key) || key < 1 || key > 99) {
    status.textContent = '请输入 1-99 的整数';
    return;
  }
  engine.clear();
  director.reset();
  engine.start(kind === 'insert' ? insertFlow(key) : kind === 'delete' ? deleteFlow(key) : searchFlow(key));
}

DEMO_KEYS.forEach(insertKey); syncB(); renderState();
const keyInput = panel.addInput('键 / 范围 45-65', (v) => runOp(/^\s*\d+\s*-\s*\d+\s*$/.test(v) ? 'range' : 'insert', v), 7);
input.addButton('插入', () => runOp('insert', keyInput.value));
input.addButton('删除', () => runOp('delete', keyInput.value));
input.addButton('查找', () => runOp('search', keyInput.value));
input.addButton('范围', () => runOp('range', keyInput.value));
input.addButton('随机', randomTree);
input.addButton('清空', clearAll);

engine.queue(() => runBPlus());
scene.start(engine);
