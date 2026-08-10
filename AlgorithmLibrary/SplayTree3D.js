// AlgorithmLibrary/SplayTree3D.js
// 伸展树：插入/查找后访问节点沿路径 zig-zig / zig-zag 旋转伸展至根，删除后两子树合并伸展。
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Tree3D } from '../3D/modes/Tree3D.js';
import { VText, VNode, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('SplayTree3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 560], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const tree = new Tree3D(scene);
const status = panel.addStatus('');
let root = null;   // { key, left, right, parent }

function findNode(key) {
  let cur = root;
  while (cur) { if (key === cur.key) return cur; cur = key < cur.key ? cur.left : cur.right; }
  return null;
}
function depthOf(n) { let d = 0, cur = n; while (cur.parent != null) { d++; cur = findNode(cur.parent); if (!cur) break; } return d; }

function insertModel(key) {
  if (!root) { root = { key, left: null, right: null, parent: null }; return root; }
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

function layoutPositions() {
  const order = [];
  (function inOrder(n) { if (!n) return; inOrder(n.left); order.push(n); inOrder(n.right); })(root);
  const pos = new Map();
  const total = order.length;
  order.forEach((n, i) => {
    const d = depthOf(n);
    pos.set(n.key, { x: (i - (total - 1) / 2) * (64 + d * 14), y: 180 - d * 95, z: d * 2 });
  });
  return pos;
}

function syncParentIds() {
  for (const [key, e] of tree.nodes) {
    const n = findNode(key);
    if (n) e.parentId = n.parent;
  }
  tree.drawEdges();
}
function layoutAndMove() {
  const pos = layoutPositions();
  for (const [key, e] of tree.nodes) {
    const p = pos.get(key);
    if (!p || (e.x === p.x && e.y === p.y && e.z === p.z)) continue;
    tree.moveNode(key, p.x, p.y, p.z, C);
  }
}
function drawAll() {
  tree.clear();
  const pos = layoutPositions();
  (function walk(n) {
    if (!n) return;
    const p = pos.get(n.key);
    tree.addNode(n.key, String(n.key), p.x, p.y, p.z, { parentId: n.parent ?? null });
    walk(n.left); walk(n.right);
  })(root);
}

function pulseNode(key) {
  if (key == null) return;
  const e = tree.nodes.get(key);
  if (!e) return;
  C(600, (p) => { e.node.mesh.scale.setScalar(1 + 0.3 * Math.sin(easeInOut(p) * Math.PI)); }, () => { e.node.mesh.scale.set(1, 1, 1); });
}

// ---- 旋转（模型 + 布局动画）----
function rotateLeft(x) {
  const y = x.right;
  x.right = y.left;
  if (y.left) y.left.parent = x.key;
  y.left = x;
  y.parent = x.parent;
  if (x.parent == null) root = y;
  else if (findNode(x.parent).left === x) findNode(x.parent).left = y;
  else findNode(x.parent).right = y;
  x.parent = y.key;
  syncParentIds();
  layoutAndMove();
}
function rotateRight(x) {
  const y = x.left;
  x.left = y.right;
  if (y.right) y.right.parent = x.key;
  y.right = x;
  y.parent = x.parent;
  if (x.parent == null) root = y;
  else if (findNode(x.parent).left === x) findNode(x.parent).left = y;
  else findNode(x.parent).right = y;
  x.parent = y.key;
  syncParentIds();
  layoutAndMove();
}

// 沿路径 zig / zig-zig / zig-zag 伸展至根
function splayNode(x) {
  let guard = 0;
  while (x.parent != null && guard++ < 200) {
    const p = findNode(x.parent);
    const g = p.parent != null ? findNode(p.parent) : null;
    if (!g) {
      if (x === p.left) rotateRight(p); else rotateLeft(p);
    } else if (x === p.left && p === g.left) { rotateRight(g); rotateRight(p); }
    else if (x === p.right && p === g.right) { rotateLeft(g); rotateLeft(p); }
    else if (x === p.right && p === g.left) { rotateLeft(p); rotateRight(g); }
    else { rotateRight(p); rotateLeft(g); }
  }
}

// ---- 操作 ----
function insertValue(v) {
  const key = parseInt(v);
  if (isNaN(key)) return;
  if (findNode(key)) { status.textContent = key + ' 已存在'; return; }
  status.textContent = '插入 ' + key;
  let cur = root;
  while (cur) { tree.highlight(cur.key, C); cur = key < cur.key ? cur.left : cur.right; }
  const node = insertModel(key);
  const parentKey = node.parent;
  const p = layoutPositions().get(key);
  const tmp = new VNode(scene, { x: p.x, y: p.y + 260, z: p.z, label: String(key) });
  C(600, (pp) => {
    tmp.mesh.position.y = p.y + 260 * (1 - easeInOut(pp));
    if (pp === 1) {
      tree.addNode(key, String(key), p.x, p.y, p.z, { parentId: parentKey });
      tmp.remove();
      syncParentIds();
      layoutAndMove();
    }
  }, () => tmp.remove());
  splayNode(node);
  layoutAndMove();
  pulseNode(key);
  status.textContent = '';
}

function findValue(v) {
  const key = parseInt(v);
  if (isNaN(key)) return;
  const z = findNode(key);
  if (!z) { status.textContent = key + ' 不存在'; return; }
  status.textContent = '查找 ' + key;
  let cur = root;
  while (cur && cur.key !== key) { tree.highlight(cur.key, C); cur = key < cur.key ? cur.left : cur.right; }
  tree.highlight(key, C);
  splayNode(z);
  pulseNode(key);
  status.textContent = key + ' 已伸展至根';
}

function deleteValue(v) {
  const key = parseInt(v);
  if (isNaN(key)) return;
  const z = findNode(key);
  if (!z) { status.textContent = key + ' 不存在'; return; }
  status.textContent = '删除 ' + key;
  splayNode(z);               // 查找伸展：目标至根
  tree.highlight(key, C);
  C(1, () => tree.removeNode(key), () => {});
  // 同步模型合并：左子树最大节点伸展为根，挂接右子树
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
  syncParentIds();
  layoutAndMove();
  pulseNode(root ? root.key : null);
  status.textContent = '';
}

function printTree() {
  const order = [];
  (function walk(n) { if (!n) return; walk(n.left); order.push(n.key); walk(n.right); })(root);
  const total = order.length;
  order.forEach((k, i) => {
    const e = tree.nodes.get(k);
    if (!e) return;
    const fx = e.x, fy = e.y + 26;
    const tx = (i - (total - 1) / 2) * 78, ty = -270;
    const tmp = new VText(scene, { text: String(k), x: fx, y: fy, z: 0, color: PALETTE.text, scale: 1 });
    C(420, (p) => { tmp.sprite.position.set(fx + (tx - fx) * easeInOut(p), fy + (ty - fy) * easeInOut(p), 0); }, () => tmp.remove());
  });
  status.textContent = '中序遍历 ' + total + ' 个节点';
}

// 控件
let input = panel.addInput('输入数字', (v) => { if (v) insertValue(v); }, 6);
panel.addButton('插入', () => { if (input.value) insertValue(input.value); });
panel.addButton('查找', () => { if (input.value) findValue(input.value); });
panel.addButton('打印', printTree);
panel.addButton('删除', () => { if (input.value) deleteValue(input.value); });
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

// 初始树
[50, 30, 70, 20, 40, 60, 80].forEach(insertModel);
drawAll();
scene.start(engine);
