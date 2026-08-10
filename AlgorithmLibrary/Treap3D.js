// AlgorithmLibrary/Treap3D.js
// Treap（树堆）：BST 结构 + 随机优先值 prio。每个节点 = VBox + key（大字）+ prio（小字紫色）。
// 插入按 BST 下降，违反堆性质（prio < 父）时以节点为轴左旋/右旋恢复。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, tubeBetween, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Treap3D');

const scene = new Scene3D('scene', { cameraPos: [0, 220, 640], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const status = panel.addStatus('');
let root = null;              // 模型节点 { key, prio, left, right, parent, id }
let nextId = 0;
const entry = new Map();      // id -> { box, keyText, prioText, x, y, z }
let edgeMeshes = [];

function modelNode(key, prio) { return { key, prio, left: null, right: null, parent: null, id: nextId++ }; }
function find(key) { let cur = root; while (cur) { if (key === cur.key) return cur; cur = key < cur.key ? cur.left : cur.right; } return null; }

// ---- 模型：BST 插入 / 旋转 ----
function bstInsert(node, key, prio) {
  if (!node) return modelNode(key, prio);
  if (key < node.key) { node.left = bstInsert(node.left, key, prio); node.left.parent = node; }
  else { node.right = bstInsert(node.right, key, prio); node.right.parent = node; }
  return node;
}
function rotateLeft(p) {
  const q = p.right;
  p.right = q.left; if (q.left) q.left.parent = p;
  q.left = p; q.parent = p.parent;
  if (p.parent) { if (p.parent.left === p) p.parent.left = q; else p.parent.right = q; }
  else root = q;
  p.parent = q;
}
function rotateRight(p) {
  const q = p.left;
  p.left = q.right; if (q.right) q.right.parent = p;
  q.right = p; q.parent = p.parent;
  if (p.parent) { if (p.parent.left === p) p.parent.left = q; else p.parent.right = q; }
  else root = q;
  p.parent = q;
}

// ---- 布局：中序定 x，深度定 y ----
function depthOf(n) { let d = 0, cur = n; while (cur.parent) { d++; cur = cur.parent; } return d; }
function layoutPositions() {
  const order = [];
  (function io(n) { if (!n) return; io(n.left); order.push(n); io(n.right); })(root);
  const pos = new Map();
  order.forEach((n, i) => {
    const d = depthOf(n);
    pos.set(n.id, { x: (i - (order.length - 1) / 2) * (64 + d * 16), y: 205 - d * 95, z: d * 2 });
  });
  return pos;
}

// ---- 渲染 ----
function createEntry(n, x, y, z) {
  const box = new VBox(scene, { w: 56, h: 56, d: 34, x, y, z, color: PALETTE.node, emissive: PALETTE.nodeEmissive });
  const keyText = new VText(scene, { text: String(n.key), x, y: y + 52, z, color: PALETTE.text, scale: 0.95 });
  const prioText = new VText(scene, { text: String(n.prio), x, y: y - 52, z, color: PALETTE.purple, scale: 0.55 });
  entry.set(n.id, { n, box, keyText, prioText, x, y, z });
}
function moveEntry(id, x, y, z) {
  const e = entry.get(id);
  if (!e) return;
  const fx = e.x, fy = e.y, fz = e.z;
  C({ duration: 500, fn: (p) => {
    const t = easeInOut(p);
    e.box.mesh.position.set(fx + (x - fx) * t, fy + (y - fy) * t, fz + (z - fz) * t);
    e.keyText.sprite.position.set(fx + (x - fx) * t, fy + 52 + (y - fy) * t, fz + (z - fz) * t);
    e.prioText.sprite.position.set(fx + (x - fx) * t, fy - 52 + (y - fy) * t, fz + (z - fz) * t);
    if (p === 1) drawEdges();
  }, undo: () => {
    e.box.mesh.position.set(fx, fy, fz);
    e.keyText.sprite.position.set(fx, fy + 52, fz);
    e.prioText.sprite.position.set(fx, fy - 52, fz);
    drawEdges();
  } });
  e.x = x; e.y = y; e.z = z;
}
function drawEdges() {
  for (const m of edgeMeshes) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); }
  edgeMeshes = [];
  (function walk(n) {
    if (!n) return;
    if (n.parent) {
      const a = entry.get(n.id), b = entry.get(n.parent.id);
      if (a && b) {
        const from = a.box.mesh.position.clone(), to = b.box.mesh.position.clone();
        const dir = to.clone().sub(from);
        if (dir.lengthSq() > 1e-6) {
          dir.normalize();
          from.addScaledVector(dir, 30); to.addScaledVector(dir, 30);
          edgeMeshes.push(tubeBetween(scene, from, to, { color: PALETTE.edge, opacity: 0.5, radius: 2 }));
        }
      }
    }
    walk(n.left); walk(n.right);
  })(root);
}
function layoutAll() {
  const pos = layoutPositions();
  for (const [id, e] of entry) {
    const p = pos.get(id);
    if (!p) continue;
    if (e.x === p.x && e.y === p.y && e.z === p.z) continue;
    moveEntry(id, p.x, p.y, p.z);
  }
}
function clearTree() {
  for (const e of entry.values()) { e.box.remove(); e.keyText.remove(); e.prioText.remove(); }
  entry.clear();
  for (const m of edgeMeshes) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); }
  edgeMeshes = [];
  root = null; nextId = 0;
}
function hl(id, c) {
  const e = entry.get(id);
  if (!e) return;
  C({ duration: 250, fn: (p) => { e.box.mesh.material.color.lerpColors(new THREE.Color(PALETTE.node), new THREE.Color(c), p); e.box.mesh.material.emissive.setHex(PALETTE.highlightEmissive); }, undo: () => { e.box.mesh.material.color.setHex(PALETTE.node); e.box.mesh.material.emissive.setHex(PALETTE.nodeEmissive); } });
}
function unhl(id) {
  const e = entry.get(id);
  if (!e) return;
  C({ duration: 250, fn: (p) => { e.box.mesh.material.color.lerpColors(new THREE.Color(PALETTE.highlight), new THREE.Color(PALETTE.node), p); e.box.mesh.material.emissive.setHex(PALETTE.nodeEmissive); }, undo: () => {} });
}

// ---- 插入 ----
function insertValue(raw) {
  let key = parseInt(String(raw || '').trim());
  if (isNaN(key)) {
    const cand = [15, 35, 5, 40, 22, 3, 12, 28];
    key = cand.find(k => !find(k));
    if (key === undefined) { status.textContent = '演示值都已存在，请先清空'; return; }
    status.textContent = '输入为空，插入演示值 ' + key;
  }
  if (find(key)) { status.textContent = key + ' 已存在'; return; }
  const prio = Math.floor(Math.random() * 90) + 10;
  status.textContent = '插入 ' + key + '（随机优先值 ' + prio + '）';
  // BST 下降动画
  const path = [];
  let cur = root;
  while (cur) {
    path.push(cur);
    cur = key < cur.key ? cur.left : cur.right;
  }
  path.forEach(n => {
    status.textContent = 'BST 下降: ' + key + ' 与 ' + n.key + ' 比较' + (key < n.key ? '，向左' : '，向右');
    hl(n.id, PALETTE.cyan);
    unhl(n.id);
  });
  // 模型插入 + 新节点从上方飞入
  root = bstInsert(root, key, prio);
  const node = find(key);
  const pos = layoutPositions().get(node.id);
  createEntry(node, pos.x, pos.y, pos.z);
  const e0 = entry.get(node.id);
  e0.box.mesh.position.y += 260;
  e0.keyText.sprite.position.y += 260;
  e0.prioText.sprite.position.y += 260;
  e0.y += 260;
  C({ duration: 600, fn: (p) => {
    const dy = 260 * (1 - easeInOut(p));
    e0.box.mesh.position.y = pos.y + dy;
    e0.keyText.sprite.position.y = pos.y + 52 + dy;
    e0.prioText.sprite.position.y = pos.y - 52 + dy;
    if (p === 1) { e0.y = pos.y; drawEdges(); }
  }, undo: () => {
    e0.box.mesh.position.set(pos.x, pos.y + 260, pos.z);
    e0.keyText.sprite.position.set(pos.x, pos.y + 312, pos.z);
    e0.prioText.sprite.position.set(pos.x, pos.y + 208, pos.z);
    e0.y = pos.y + 260;
    drawEdges();
  } });
  e0.y = pos.y;
  // 自底向上旋转恢复堆性质
  let n = node;
  while (n.parent && n.prio < n.parent.prio) {
    const p = n.parent;
    const isLeft = p.left === n;
    status.textContent = '堆性质破坏: prio ' + n.prio + ' < 父 ' + p.prio + '，以 ' + n.key + ' 为轴' + (isLeft ? '右旋' : '左旋');
    hl(n.id, PALETTE.orange);
    hl(p.id, PALETTE.orange);
    if (isLeft) rotateRight(p); else rotateLeft(p);
    unhl(n.id);
    unhl(p.id);
    layoutAll();
  }
  hl(n.id, PALETTE.green);
  status.textContent = '插入 ' + key + ' 完成';
}

// ---- 随机生成 ----
function randomTree() {
  clearTree();
  const seen = new Set();
  const keys = [];
  while (keys.length < 10) {
    const k = Math.floor(Math.random() * 50) + 1;
    if (!seen.has(k)) { seen.add(k); keys.push(k); }
  }
  for (const k of keys) root = bstInsert(root, k, Math.floor(Math.random() * 90) + 10);
  const pos = layoutPositions();
  (function walk(n) {
    if (!n) return;
    const p = pos.get(n.id);
    createEntry(n, p.x, p.y, p.z);
    walk(n.left); walk(n.right);
  })(root);
  drawEdges();
  status.textContent = '随机生成 ' + keys.length + ' 个节点';
}

// ---- 清空 ----
function clearAll() {
  engine.clear();
  clearTree();
  status.textContent = '已清空';
}

// 控件
let input = panel.addInput('插入 key（空则插入演示值）', (v) => insertValue(v), 6);
panel.addButton('插入', () => insertValue(input.value));
panel.addButton('随机生成', randomTree);
panel.addButton('清空', clearAll);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

// 初始演示树：10/20/30/25
for (const k of [10, 20, 30, 25]) root = bstInsert(root, k, Math.floor(Math.random() * 90) + 10);
const initPos = layoutPositions();
(function walk(n) {
  if (!n) return;
  const p = initPos.get(n.id);
  createEntry(n, p.x, p.y, p.z);
  walk(n.left); walk(n.right);
})(root);
drawEdges();

scene.start(engine);
