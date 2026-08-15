// AlgorithmLibrary/SplayTree3D.js — 伸展树：访问节点沿路径 zig/zig-zig/zig-zag 伸展至根；删除合并两子树（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VNode } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
applyTheme('SplayTree3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, RED = 0xfb7185, GREEN = 0x4ade80, ORANGE = 0xfb923c, WHITE = 0xffffff;
const status = panel.addStatus('就绪');

const ROOT_Y = 700, STEP_Y = 85, X_STEP = 80;
const tmpV = new THREE.Vector3();
const inoT = [];  // 中序数字标注（预建，最多 5 个键）
for (let i = 0; i < 5; i++) inoT.push(new VText(scene, { text: '', x: 0, y: 0, z: 0, color: GOLD, scale: 0.85 }));

// ---- 纯数据模型（parent 键引用） ----
let root = null;
function findNode(key) {
  let cur = root;
  while (cur) { if (key === cur.key) return cur; cur = key < cur.key ? cur.left : cur.right; }
  return null;
}
function insertModel(key) {
  if (!root) return (root = { key, left: null, right: null, parent: null });
  let cur = root;
  while (true) {
    if (key < cur.key) {
      if (!cur.left) { cur.left = { key, left: null, right: null, parent: cur.key }; return cur.left; }
      cur = cur.left;
    } else {
      if (!cur.right) { cur.right = { key, left: null, right: null, parent: cur.key }; return cur.right; }
      cur = cur.right;
    }
  }
}
function rotateLeft(x) {
  const y = x.right;
  x.right = y.left;
  if (y.left) y.left.parent = x.key;
  y.left = x;
  y.parent = x.parent;
  if (x.parent == null) root = y;
  else { const p = findNode(x.parent); if (p.left === x) p.left = y; else p.right = y; }
  x.parent = y.key;
}
function rotateRight(x) {
  const y = x.left;
  x.left = y.right;
  if (y.right) y.right.parent = x.key;
  y.right = x;
  y.parent = x.parent;
  if (x.parent == null) root = y;
  else { const p = findNode(x.parent); if (p.left === x) p.left = y; else p.right = y; }
  x.parent = y.key;
}
function depthOf(n) { let d = 0, cur = n; while (cur.parent != null) { d++; const p = findNode(cur.parent); if (!p) break; cur = p; } return d; }
function collect() {
  const arr = [];
  (function inOrder(n) { if (!n) return; inOrder(n.left); arr.push(n); inOrder(n.right); })(root);
  return arr;
}
function layout() {
  const arr = collect(), pos = new Map();
  arr.forEach((n, i) => {
    const d = depthOf(n);
    pos.set(n.key, new THREE.Vector3((i - (arr.length - 1) / 2) * (X_STEP + d * 10) + 320, ROOT_Y - d * STEP_Y, -d * 6));
  });
  return pos;
}

// ---- 视觉 ----
const nodeView = new Map();  // key -> VNode
const edgeView = new Map();  // childKey -> tube
function clearView() {
  nodeView.forEach(v => scene.remove(v.mesh));
  edgeView.forEach(m => { scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
  nodeView.clear(); edgeView.clear();
}
function addNodeMesh(n, p) {
  const vn = new VNode(scene, { radius: 20, x: p.x, y: p.y, z: p.z, label: String(n.key), color: BLUE, emissive: BLUE });
  nodeView.set(n.key, vn);
  return vn;
}
function tube(a, b) {
  const A = a.clone(), B = b.clone();
  const mid = new THREE.Vector3((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2 + 18);
  const curve = new THREE.CatmullRomCurve3([A, mid, B]);
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 2, 6), new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.7 }));
  scene.add(m);
  return m;
}
function syncEdges() {
  edgeView.forEach(m => { scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
  edgeView.clear();
  (function walk(n) {
    if (n.left) { edgeView.set(n.left.key, tube(nodeView.get(n.key).mesh.position, nodeView.get(n.left.key).mesh.position)); walk(n.left); }
    if (n.right) { edgeView.set(n.right.key, tube(nodeView.get(n.key).mesh.position, nodeView.get(n.right.key).mesh.position)); walk(n.right); }
  })(root);
}
function setNodeColor(key, c) { nodeView.get(key).setColor(c, c); }
function resetNodeColors() { nodeView.forEach(v => v.setColor(BLUE, BLUE)); }
function* moveToLayout() {
  const pos = layout();
  const tasks = [];
  nodeView.forEach((vn, key) => {
    const p = pos.get(key);
    if (!p) return;
    const f = vn.mesh.position.clone();
    if (f.distanceTo(p) < 0.5) return;
    tasks.push({ vn, from: f, to: p });
  });
  if (!tasks.length) { syncEdges(); return; }
  yield A(460, pp => tasks.forEach(t => t.vn.mesh.position.lerpVectors(t.from, t.to, pp)));
  syncEdges();
}
function* dropIn(vn, p) {
  yield A(480, pp => {
    vn.mesh.position.y = p.y + 250 * (1 - pp);
    vn.mesh.scale.setScalar(0.4 + 0.6 * pp);
  });
  vn.mesh.scale.setScalar(1);
}
function* growEdge(n) {
  if (!n.parent) return;
  const e = edgeView.get(n.key);
  e.material.opacity = 0;
  yield A(280, p => { e.material.opacity = 0.7 * p; });
}
function* pulse(key) {
  const vn = nodeView.get(key);
  if (!vn) return;
  yield A(500, p => { vn.mesh.scale.setScalar(1 + 0.35 * Math.sin(p * Math.PI)); });
  vn.mesh.scale.setScalar(1);
}

// ---- 伸展：沿路径把 x 旋到根，逐步标注 zig / zig-zig / zig-zag ----
function* splayGen(x) {
  let guard = 0;
  while (x.parent != null && guard++ < 60) {
    const p = findNode(x.parent);
    const g = p.parent != null ? findNode(p.parent) : null;
    if (!g) {
      setNodeColor(x.key, ORANGE); setNodeColor(p.key, ORANGE);
      yield S(() => { status.textContent = 'zig 单旋：' + x.key + ' 是 ' + p.key + ' 的' + (x === p.left ? '左' : '右') + '子 → ' + (x === p.left ? '右' : '左') + '旋 ' + p.key; });
      yield W(480);
      if (x === p.left) rotateRight(p); else rotateLeft(p);
      yield* moveToLayout();
      yield W(220);
    } else if (x === p.left && p === g.left) {
      setNodeColor(x.key, ORANGE); setNodeColor(p.key, ORANGE); setNodeColor(g.key, RED);
      yield S(() => { status.textContent = 'zig-zig 同侧双旋：' + x.key + '→' + p.key + '→' + g.key + ' 都是左子 → 右旋 ' + g.key + ' 再右旋 ' + p.key; });
      yield W(550);
      rotateRight(g); rotateRight(p);
      yield* moveToLayout();
      yield W(220);
    } else if (x === p.right && p === g.right) {
      setNodeColor(x.key, ORANGE); setNodeColor(p.key, ORANGE); setNodeColor(g.key, RED);
      yield S(() => { status.textContent = 'zig-zig 同侧双旋：' + x.key + '→' + p.key + '→' + g.key + ' 都是右子 → 左旋 ' + g.key + ' 再左旋 ' + p.key; });
      yield W(550);
      rotateLeft(g); rotateLeft(p);
      yield* moveToLayout();
      yield W(220);
    } else if (x === p.right && p === g.left) {
      setNodeColor(x.key, ORANGE); setNodeColor(p.key, ORANGE); setNodeColor(g.key, RED);
      yield S(() => { status.textContent = 'zig-zag 之字双旋：' + x.key + ' 是 ' + p.key + ' 右子、' + p.key + ' 是 ' + g.key + ' 左子 → 左旋 ' + p.key + ' 再右旋 ' + g.key; });
      yield W(550);
      rotateLeft(p); rotateRight(g);
      yield* moveToLayout();
      yield W(220);
    } else {
      setNodeColor(x.key, ORANGE); setNodeColor(p.key, ORANGE); setNodeColor(g.key, RED);
      yield S(() => { status.textContent = 'zig-zag 之字双旋：' + x.key + ' 是 ' + p.key + ' 左子、' + p.key + ' 是 ' + g.key + ' 右子 → 右旋 ' + p.key + ' 再左旋 ' + g.key; });
      yield W(550);
      rotateRight(p); rotateLeft(g);
      yield* moveToLayout();
      yield W(220);
    }
  }
  resetNodeColors();
  yield* pulse(x.key);
}

// ---- 插入：下钻 → 降落 → 伸展到根 ----
function* insertGen(key) {
  yield S(() => { status.textContent = '插入 ' + key + '：沿比较路径下钻'; });
  let cur = root;
  while (cur && cur.key !== key) {
    setNodeColor(cur.key, GOLD);
    yield W(240);
    cur = key < cur.key ? cur.left : cur.right;
  }
  if (cur) { setNodeColor(cur.key, GOLD); yield S(() => { status.textContent = key + ' 已存在'; }); yield W(450); resetNodeColors(); return; }
  const n = insertModel(key);
  const pos = layout().get(key);
  tmpV.set(pos.x, pos.y + 250, pos.z);
  const vn = addNodeMesh(n, tmpV);
  yield S(() => { status.textContent = '新节点 ' + key + ' 降落，然后伸展到根'; });
  yield* dropIn(vn, pos);
  yield* moveToLayout();
  yield* growEdge(n);
  yield W(300);
  yield* splayGen(n);
  yield W(200);
}

// ---- 查找：下钻 → 命中伸展 / 未命中不伸展 ----
function* searchGen(key) {
  yield S(() => { status.textContent = '查找 ' + key + '：沿金色路径下钻'; });
  let cur = root;
  while (cur && cur.key !== key) { setNodeColor(cur.key, GOLD); yield W(260); cur = key < cur.key ? cur.left : cur.right; }
  if (cur) {
    setNodeColor(cur.key, GREEN);
    yield S(() => { status.textContent = '命中 ' + key + '：伸展到根（近期访问加速）'; });
    yield W(450);
    yield* splayGen(cur);
  } else {
    yield S(() => { status.textContent = key + ' 不存在（红闪，无伸展）'; });
    yield W(500);
  }
  resetNodeColors();
}

// ---- 删除：目标伸展到根 → 收缩移除 → 左子树最大伸展为根挂接右子树 ----
function* deleteGen(key) {
  const z = findNode(key);
  if (!z) { yield S(() => { status.textContent = key + ' 不存在'; }); yield W(400); return; }
  yield S(() => { status.textContent = '删除 ' + key + '：先伸展到根'; });
  yield W(450);
  yield* splayGen(z);
  setNodeColor(key, RED);
  yield S(() => { status.textContent = key + ' 已在根：移除根节点，左右子树合并'; });
  yield W(450);
  const vn = nodeView.get(key);
  yield A(300, p => { vn.mesh.scale.setScalar(1 - p); });
  scene.remove(vn.mesh);
  nodeView.delete(key);
  const L = root.left, R = root.right;
  if (L) L.parent = null;
  if (R) R.parent = null;
  if (!L) {
    root = R;
  } else {
    let m = L; while (m.right) m = m.right;
    while (m.parent != null) {
      const p = findNode(m.parent);
      const g = p.parent != null ? findNode(p.parent) : null;
      if (!g) { if (m === p.left) rotateRight(p); else rotateLeft(p); }
      else if (m === p.left && p === g.left) { rotateRight(g); rotateRight(p); }
      else if (m === p.right && p === g.right) { rotateLeft(g); rotateLeft(p); }
      else if (m === p.right && p === g.left) { rotateLeft(p); rotateRight(g); }
      else { rotateRight(p); rotateLeft(g); }
    }
    root = m;
    m.right = R;
    if (R) R.parent = m.key;
  }
  yield S(() => { status.textContent = '合并：左子树最大 ' + (L ? (function (r) { while (r.right) r = r.right; return r.key; })(L) : '—') + ' 为新根，右子树挂接'; });
  yield* moveToLayout();
  resetNodeColors();
  yield W(300);
}

// ---- 中序输出 ----
function* inorderGen() {
  const arr = collect();
  yield S(() => { status.textContent = '中序遍历：' + arr.map(n => n.key).join(' → '); });
  const tmp = [];
  arr.forEach((n, i) => {
    const t = inoT[i];
    t.setText(String(n.key));
    const f = nodeView.get(n.key).mesh.position;
    t.sprite.position.copy(f);
    tmp.push({ t, fx: f.x, fy: f.y, tx: (i - (arr.length - 1) / 2) * 82 + 320 });
  });
  yield A(560, pp => tmp.forEach(x => x.t.sprite.position.set(x.fx + (x.tx - x.fx) * pp, x.fy + (330 - x.fy) * pp, 0)));
  yield W(900);
  tmp.forEach(x => x.t.setText(''));
}

function* runSplay() {
  clearView(); root = null;
  yield S(() => { status.textContent = '伸展树：每次访问（插入/查找/删除）都把节点旋到根，近期访问者更快'; });
  yield W(400);
  for (const k of [50, 30, 70, 20, 40]) yield* insertGen(k);
  yield S(() => { status.textContent = '5 键插入完成（每次插入后伸展到根）'; });
  yield W(400);
  yield* searchGen(20);
  yield* searchGen(35);
  yield* deleteGen(30);
  yield* inorderGen();
  yield S(() => { status.textContent = 'Splay 演示完成：插入 50/30/70/20/40（每次伸展）、查找 20（zig-zig）与 35（未命中）、删除 30（根合并）；摊还 O(log n)'; });
}

engine.queue(() => runSplay());
panel.addButton('清空', () => { engine.clear(); clearView(); root = null; status.textContent = ''; });

scene.start(engine);
