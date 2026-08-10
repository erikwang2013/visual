// AlgorithmLibrary/RedBlack3D.js
// 红黑树：红节点橙色、黑节点蓝色；插入/删除按 CLRS 修复（变色 + 旋转）。
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Tree3D } from '../3D/modes/Tree3D.js';
import { VText, VNode, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('RedBlack3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 560], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const tree = new Tree3D(scene);
const status = panel.addStatus('');
let root = null;   // { key, left, right, parent, color:'R'|'B' }

function findNode(key) {
  let cur = root;
  while (cur) { if (key === cur.key) return cur; cur = key < cur.key ? cur.left : cur.right; }
  return null;
}
function depthOf(n) { let d = 0, cur = n; while (cur.parent != null) { d++; cur = findNode(cur.parent); if (!cur) break; } return d; }
function isBlack(n) { return !n || n.color === 'B'; }
function applyColor(key) {
  const n = findNode(key);
  if (!n) return;
  if (n.color === 'R') tree.setColor(key, PALETTE.orange, PALETTE.orangeEmissive);
  else tree.setColor(key, PALETTE.node, PALETTE.nodeEmissive);
}

function insertModel(key) {
  if (!root) { root = { key, left: null, right: null, parent: null, color: 'B' }; return root; }
  let cur = root;
  while (true) {
    if (key < cur.key) {
      if (!cur.left) { cur.left = { key, left: null, right: null, parent: cur.key, color: 'R' }; return cur.left; }
      cur = cur.left;
    } else {
      if (!cur.right) { cur.right = { key, left: null, right: null, parent: cur.key, color: 'R' }; return cur.right; }
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
function syncColors() {
  for (const [key] of tree.nodes) applyColor(key);
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
    tree.addNode(n.key, String(n.key), p.x, p.y, p.z, {
      parentId: n.parent ?? null,
      color: n.color === 'R' ? PALETTE.orange : PALETTE.node,
      emissive: n.color === 'R' ? PALETTE.orangeEmissive : PALETTE.nodeEmissive,
    });
    walk(n.left); walk(n.right);
  })(root);
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

// ---- 插入修复 ----
function rbInsertFix(z) {
  let cur = z, guard = 0;
  while (cur.parent != null && findNode(cur.parent).color === 'R' && guard++ < 100) {
    let p = findNode(cur.parent);
    const g = p.parent != null ? findNode(p.parent) : null;
    if (!g) break;
    if (p === g.left) {
      const u = g.right;
      if (u && u.color === 'R') {
        p.color = 'B'; applyColor(p.key);
        u.color = 'B'; applyColor(u.key);
        g.color = 'R'; applyColor(g.key);
        cur = g;
      } else {
        if (cur === p.right) { cur = p; rotateLeft(p); }
        p = findNode(cur.parent);
        p.color = 'B'; applyColor(p.key);
        const gg = findNode(p.parent);
        gg.color = 'R'; applyColor(gg.key);
        rotateRight(gg);
      }
    } else {
      const u = g.left;
      if (u && u.color === 'R') {
        p.color = 'B'; applyColor(p.key);
        u.color = 'B'; applyColor(u.key);
        g.color = 'R'; applyColor(g.key);
        cur = g;
      } else {
        if (cur === p.left) { cur = p; rotateRight(p); }
        p = findNode(cur.parent);
        p.color = 'B'; applyColor(p.key);
        const gg = findNode(p.parent);
        gg.color = 'R'; applyColor(gg.key);
        rotateLeft(gg);
      }
    }
  }
  if (root) { root.color = 'B'; applyColor(root.key); }
}

// ---- 删除（CLRS）----
function rbTransplant(u, v) {
  if (u.parent == null) root = v;
  else if (u === findNode(u.parent).left) findNode(u.parent).left = v;
  else findNode(u.parent).right = v;
  if (v) v.parent = u.parent;
}

function rbFix(x, xParent, side) {
  let curX = x, guard = 0;
  while (curX !== root && isBlack(curX) && guard++ < 100) {
    let p, xIsLeft;
    if (!curX) { p = xParent != null ? findNode(xParent) : null; xIsLeft = side === 'L'; }
    else { p = findNode(curX.parent); xIsLeft = curX === p.left; }
    if (!p) break;
    let w = xIsLeft ? p.right : p.left;
    if (!isBlack(w)) {
      w.color = 'B'; applyColor(w.key);
      p.color = 'R'; applyColor(p.key);
      if (xIsLeft) rotateLeft(p); else rotateRight(p);
      w = xIsLeft ? findNode(p.key).right : findNode(p.key).left;
    }
    const wlB = isBlack(w.left), wrB = isBlack(w.right);
    if (wlB && wrB) {
      w.color = 'R'; applyColor(w.key);
      curX = p;
    } else {
      if (xIsLeft ? wrB : wlB) {
        if (xIsLeft ? w.left : w.right) { (xIsLeft ? w.left : w.right).color = 'B'; applyColor((xIsLeft ? w.left : w.right).key); }
        w.color = 'R'; applyColor(w.key);
        if (xIsLeft) rotateRight(w); else rotateLeft(w);
        w = xIsLeft ? findNode(p.key).right : findNode(p.key).left;
      }
      w.color = p.color; applyColor(w.key);
      p.color = 'B'; applyColor(p.key);
      const wc = xIsLeft ? w.right : w.left;
      if (wc) { wc.color = 'B'; applyColor(wc.key); }
      if (xIsLeft) rotateLeft(p); else rotateRight(p);
      curX = root;
    }
  }
  if (curX) { curX.color = 'B'; applyColor(curX.key); }
}

function rbDelete(z) {
  let y = z, yColor = y.color, x = null, xParent = z.parent, side = 'L';
  const delSide = (z.parent != null && findNode(z.parent).left === z) ? 'L' : 'R';
  if (!z.left) { x = z.right; rbTransplant(z, z.right); xParent = z.parent; side = delSide; }
  else if (!z.right) { x = z.left; rbTransplant(z, z.left); xParent = z.parent; side = delSide; }
  else {
    y = z.right; while (y.left) y = y.left;
    yColor = y.color; x = y.right;
    if (y.parent === z.key) { xParent = y.key; side = 'R'; if (x) x.parent = y.key; }
    else {
      xParent = y.parent; side = findNode(y.parent).left === y ? 'L' : 'R';
      rbTransplant(y, y.right);
      y.right = z.right;
      y.right.parent = y.key;
    }
    rbTransplant(z, y);
    y.left = z.left;
    y.left.parent = y.key;
    y.color = z.color;
  }
  if (yColor === 'B') rbFix(x, xParent, side);
  if (root) { root.color = 'B'; applyColor(root.key); }
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
  const tmp = new VNode(scene, { x: p.x, y: p.y + 260, z: p.z, label: String(key), color: PALETTE.orange, emissive: PALETTE.orangeEmissive });
  C(600, (pp) => {
    tmp.mesh.position.y = p.y + 260 * (1 - easeInOut(pp));
    if (pp === 1) {
      tree.addNode(key, String(key), p.x, p.y, p.z, { parentId: parentKey, color: PALETTE.orange, emissive: PALETTE.orangeEmissive });
      tmp.remove();
      syncParentIds();
      layoutAndMove();
    }
  }, () => tmp.remove());
  rbInsertFix(node);
  syncParentIds();
  layoutAndMove();
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
  C(1, () => tree.removeNode(key), () => {});
  rbDelete(z);
  syncParentIds();
  syncColors();
  layoutAndMove();
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
  root = null;
  status.textContent = '已清空';
}

// 控件
let input = panel.addInput('输入数字', (v) => { if (v) insertValue(v); }, 6);
panel.addButton('插入', () => { if (input.value) insertValue(input.value); });
panel.addButton('查找', () => { if (input.value) findValue(input.value); });
panel.addButton('打印', printTree);
panel.addButton('删除', () => { if (input.value) deleteValue(input.value); });
panel.addButton('清空', clearAll);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

// 初始树
[41, 38, 31, 12, 19, 8].forEach((k) => {
  if (!root) { root = { key: k, left: null, right: null, parent: null, color: 'B' }; return; }
  let cur = root;
  while (true) {
    if (k < cur.key) { if (!cur.left) { cur.left = { key: k, left: null, right: null, parent: cur.key, color: 'R' }; break; } cur = cur.left; }
    else { if (!cur.right) { cur.right = { key: k, left: null, right: null, parent: cur.key, color: 'R' }; break; } cur = cur.right; }
  }
  rbInsertFix(findNode(k));
});
drawAll();
scene.start(engine);
