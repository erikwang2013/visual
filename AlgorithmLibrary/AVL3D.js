// AlgorithmLibrary/AVL3D.js
// AVL 树：插入/删除后回溯更新平衡因子并旋转修复；每节点上方显示平衡因子。
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Tree3D } from '../3D/modes/Tree3D.js';
import { VText, VNode, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('AVL3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 560], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const tree = new Tree3D(scene);
const status = panel.addStatus('');
const bfLabels = new Map();   // key -> VText 平衡因子
let root = null;              // { key, left, right, parent }

// ---- 模型操作 ----
function findNode(key) {
  let cur = root;
  while (cur) { if (key === cur.key) return cur; cur = key < cur.key ? cur.left : cur.right; }
  return null;
}
function height(n) { if (!n) return 0; return 1 + Math.max(height(n.left), height(n.right)); }
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

function removeRec(node, key) {
  if (!node) return null;
  if (key < node.key) {
    node.left = removeRec(node.left, key);
    if (node.left) node.left.parent = node.key;
  } else if (key > node.key) {
    node.right = removeRec(node.right, key);
    if (node.right) node.right.parent = node.key;
  } else {
    if (!node.left) { if (node.right) node.right.parent = node.parent; return node.right; }
    if (!node.right) { if (node.left) node.left.parent = node.parent; return node.left; }
    let pred = node.left; while (pred.right) pred = pred.right;
    node.key = pred.key;
    node.left = removeRec(node.left, pred.key);
    if (node.left) node.left.parent = node.key;
    if (node.right) node.right.parent = node.key;
  }
  return node;
}

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

function fixBalance(startKey) {
  let cur = startKey != null ? findNode(startKey) : null;
  let guard = 0;
  while (cur && guard++ < 80) {
    const bf = height(cur.left) - height(cur.right);
    if (bf > 1) {
      if (height(cur.left.left) < height(cur.left.right)) rotateLeft(cur.left);
      rotateRight(cur);
    } else if (bf < -1) {
      if (height(cur.right.right) < height(cur.right.left)) rotateRight(cur.right);
      rotateLeft(cur);
    }
    cur = cur.parent != null ? findNode(cur.parent) : null;
  }
}

// ---- 布局与可视化 ----
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

function removeVisual(key) {
  tree.removeNode(key);
  const lbl = bfLabels.get(key);
  if (lbl) { lbl.remove(); bfLabels.delete(key); }
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
    const fx = e.x, fy = e.y, fz = e.z;
    tree.moveNode(key, p.x, p.y, p.z, C);
    const lbl = bfLabels.get(key);
    if (lbl) C(500, (pp) => {
      const t = easeInOut(pp);
      lbl.sprite.position.set(fx + (p.x - fx) * t, fy + 48 + (p.y - fy) * t, fz + (p.z - fz) * t);
    }, () => { lbl.sprite.position.set(fx, fy + 48, fz); });
  }
}

function updateBFLabels() {
  for (const [key, e] of tree.nodes) {
    const n = findNode(key);
    const bf = n ? height(n.left) - height(n.right) : 0;
    let lbl = bfLabels.get(key);
    if (!lbl) { lbl = new VText(scene, { text: '', x: e.x, y: e.y + 48, z: e.z, color: PALETTE.yellow, scale: 0.7 }); bfLabels.set(key, lbl); }
    lbl.sprite.position.set(e.x, e.y + 48, e.z);
    lbl.setText(bf > 0 ? '+' + bf : String(bf));
  }
}

function drawAll() {
  tree.clear();
  for (const lbl of bfLabels.values()) lbl.remove();
  bfLabels.clear();
  const pos = layoutPositions();
  (function walk(n) {
    if (!n) return;
    const p = pos.get(n.key);
    tree.addNode(n.key, String(n.key), p.x, p.y, p.z, { parentId: n.parent ?? null });
    bfLabels.set(n.key, new VText(scene, { text: '', x: p.x, y: p.y + 48, z: p.z, color: PALETTE.yellow, scale: 0.7 }));
    walk(n.left); walk(n.right);
  })(root);
  updateBFLabels();
}

// ---- 算法操作 ----
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
      bfLabels.set(key, new VText(scene, { text: '', x: p.x, y: p.y + 48, z: p.z, color: PALETTE.yellow, scale: 0.7 }));
      tmp.remove();
      syncParentIds();
      layoutAndMove();
      updateBFLabels();
    }
  }, () => tmp.remove());
  layoutAndMove();
  fixBalance(key);
  updateBFLabels();
  status.textContent = '';
}

function deleteValue(v) {
  const key = parseInt(v);
  if (isNaN(key)) return;
  const z = findNode(key);
  if (!z) { status.textContent = key + ' 不存在'; return; }
  status.textContent = '删除 ' + key;
  let cur = root;
  while (cur && cur.key !== key) { tree.highlight(cur.key, C); cur = key < cur.key ? cur.left : cur.right; }
  tree.highlight(key, C);
  const copyCase = !!(z.left && z.right);
  let predKey = null, predParent = null, childKey = null, subKey = null;
  if (copyCase) { let m = z.left; while (m.right) m = m.right; predKey = m.key; predParent = m.parent; subKey = m.left ? m.left.key : null; }
  else childKey = z.left ? z.left.key : (z.right ? z.right.key : null);
  const zKey = z.key;
  root = removeRec(root, key);
  const fixStart = copyCase ? (predParent === zKey ? predKey : predParent) : (childKey ?? (z.parent ?? null));
  fixBalance(fixStart);
  C(1, () => {
    if (copyCase) {
      removeVisual(predKey);
      const entry = tree.nodes.get(zKey);
      if (entry) {
        tree.nodes.delete(zKey);
        entry.node.setText(String(predKey));
        tree.nodes.set(predKey, entry);
        const lbl = bfLabels.get(zKey);
        if (lbl) { bfLabels.delete(zKey); bfLabels.set(predKey, lbl); }
      }
      if (subKey) { const se = tree.nodes.get(subKey); if (se) se.parentId = predKey; }
    } else {
      removeVisual(zKey);
    }
    syncParentIds();
    layoutAndMove();
    updateBFLabels();
  }, () => {});
  status.textContent = '';
}

function findValue(v) {
  const key = parseInt(v);
  if (isNaN(key)) return;
  let cur = root, depth = 0;
  while (cur && cur.key !== key) { tree.highlight(cur.key, C); cur = key < cur.key ? cur.left : cur.right; depth++; }
  if (cur) { tree.highlight(key, C); status.textContent = key + ' 存在（深度 ' + depth + '）'; }
  else status.textContent = key + ' 不存在';
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

function clearAll() {
  engine.clear();
  tree.clear();
  for (const lbl of bfLabels.values()) lbl.remove();
  bfLabels.clear();
  root = null;
  status.textContent = '已清空';
}

// 控件
let input = panel.addInput('输入数字', (v) => { if (v) insertValue(v); }, 6);
panel.addButton('插入', () => { if (input.value) insertValue(input.value); });
panel.addButton('查找', () => { if (input.value) findValue(input.value); });
panel.addButton('删除', () => { if (input.value) deleteValue(input.value); });
panel.addButton('打印', printTree);
panel.addButton('清空', clearAll);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

// 初始树
[50, 30, 70, 20, 40, 60, 80].forEach(insertModel);
drawAll();
scene.start(engine);
