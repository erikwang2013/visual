// AlgorithmLibrary/BST3D.js
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Tree3D } from '../3D/modes/Tree3D.js';
import { PALETTE } from '../3D/Glow.js';

const scene = new Scene3D('scene', { cameraPos: [0, 240, 560], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const tree = new Tree3D(scene);
const status = panel.addStatus('');

// ---- 树数据 ----
let root = null;         // { key, left, right, parent }
let nextId = 0;
const treeState = new Map();  // key -> { node, entry }

function findNode(key) {
  let cur = root;
  while (cur) { if (key === cur.key) return cur; cur = key < cur.key ? cur.left : cur.right; }
  return null;
}

function insertRec(node, key) {
  if (!node) return { key, left: null, right: null, parent: null, id: nextId++ };
  if (key < node.key) { node.left = insertRec(node.left, key); node.left.parent = node.key; }
  else if (key > node.key) { node.right = insertRec(node.right, key); node.right.parent = node.key; }
  return node;
}

function removeRec(node, key) {
  if (!node) return null;
  if (key < node.key) { node.left = removeRec(node.left, key); if (node.left) node.left.parent = node.key; }
  else if (key > node.key) { node.right = removeRec(node.right, key); if (node.right) node.right.parent = node.key; }
  else {
    if (!node.left) return node.right;
    if (!node.right) return node.left;
    let pred = node.left;
    while (pred.right) pred = pred.right;
    node.key = pred.key;
    node.left = removeRec(node.left, pred.key);
    if (node.left) node.left.parent = node.key;
  }
  return node;
}

function layoutPositions() {
  const order = [];
  (function inOrder(n) { if (!n) return; inOrder(n.left); order.push(n); inOrder(n.right); })(root);
  const pos = new Map();
  const total = order.length;
  order.forEach((n, i) => {
    const depth = depthOf(n);
    pos.set(n.key, { x: (i - (total - 1) / 2) * (64 + depth * 14), y: 180 - depth * 95, z: depth * 2 });
  });
  return pos;
}

function depthOf(n) {
  let d = 0, cur = n;
  while (cur.parent != null) { d++; cur = findNode(cur.parent); if (!cur) break; }
  return d;
}

function drawAll() {
  tree.clear();
  treeState.clear();
  const pos = layoutPositions();
  (function walk(n) {
    if (!n) return;
    const p = pos.get(n.key);
    const vn = tree.addNode(n.key, String(n.key), p.x, p.y, p.z, { parentId: n.parent ?? null });
    treeState.set(n.key, { node: vn });
    walk(n.left);
    walk(n.right);
  })(root);
}

function highlightPath(key) {
  let cur = root;
  const path = [];
  while (cur && cur.key !== key) { path.push(cur.key); cur = key < cur.key ? cur.left : cur.right; }
  if (cur) path.push(cur.key);
  path.forEach(k => tree.highlight(k, C));
  return !!cur;
}

function insertValue(v) {
  const key = parseInt(v);
  if (isNaN(key)) return;
  if (findNode(key)) { status.textContent = key + ' 已存在'; return; }
  status.textContent = '插入 ' + key;
  root = insertRec(root, key);
  drawAll();
  tree.highlight(key, C);
  status.textContent = '';
}

function removeValue(v) {
  const key = parseInt(v);
  if (!findNode(key)) { status.textContent = key + ' 不存在'; return; }
  status.textContent = '删除 ' + key;
  root = removeRec(root, key);
  drawAll();
  status.textContent = '';
}

function findValue(v) {
  const key = parseInt(v);
  const found = highlightPath(key);
  status.textContent = found ? key + ' 存在' : key + ' 不存在';
}

function randomTree() {
  tree.clear();
  treeState.clear();
  root = null;
  nextId = 0;
  const vals = [...new Set(Array.from({ length: 12 }, () => Math.floor(Math.random() * 90) + 10))];
  for (const v of vals) root = insertRec(root, v);
  drawAll();
}

// 控件
let input = panel.addInput('输入数字', (v) => { if (v) insertValue(v); }, 6);
panel.addButton('插入', () => { if (input.value) insertValue(input.value); });
panel.addButton('删除', () => { if (input.value) removeValue(input.value); });
panel.addButton('查找', () => { if (input.value) findValue(input.value); });
panel.addButton('随机生成', randomTree);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

// 初始随机树
randomTree();
scene.start(engine);
