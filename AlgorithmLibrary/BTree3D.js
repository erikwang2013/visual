// AlgorithmLibrary/BTree3D.js
// B 树（3 阶，每节点最多 2 键）：Tree3D；节点标签=多键 "3|5"；
// 插入超键分裂（父键上移+右兄弟飞入），删除不足借键/合并。
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Tree3D } from '../3D/modes/Tree3D.js';
import { VText, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('BTree3D');

const scene = new Scene3D('scene', { cameraPos: [0, 220, 680], fov: 58 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const tree = new Tree3D(scene);
const status = panel.addStatus('');
const MAX = 2, MIN = 1;

let nextId = 0;
const model = new Map();
let root = null;
const lastText = new Map();   // 节点当前标签
const newFrom = new Map();    // 本次操作新节点起飞位置
const flyKeys = [];           // 借键飞行动画列表

function mkNode() {
  const n = { id: 'n' + (nextId++), keys: [], children: [], parent: null };
  model.set(n.id, n);
  return n;
}
function posOf(id) {
  const e = tree.nodes.get(id);
  return e ? { x: e.x, y: e.y, z: e.z } : null;
}

function layout() {
  const pos = new Map();
  if (!root) return pos;
  const all = [];
  (function ino(n) {
    if (n.children.length === 0) { for (const k of n.keys) all.push({ n, k }); return; }
    for (let i = 0; i < n.children.length; i++) {
      ino(n.children[i]);
      if (i < n.keys.length) all.push({ n, k: n.keys[i] });
    }
  })(root);
  const keyX = all.map((e, i) => (i - (all.length - 1) / 2) * 66);
  const keyIdx = new Map();
  all.forEach((e, i) => {
    const arr = keyIdx.get(e.n.id) || [];
    arr.push(keyX[i]);
    keyIdx.set(e.n.id, arr);
  });
  const depth = new Map();
  const q = [root];
  depth.set(root.id, 0);
  while (q.length) {
    const n = q.shift();
    for (const c of n.children) { depth.set(c.id, depth.get(n.id) + 1); q.push(c); }
  }
  for (const [id, xs] of keyIdx) {
    const n = model.get(id);
    pos.set(id, { x: xs.reduce((a, b) => a + b, 0) / xs.length, y: 210 - depth.get(id) * 90, z: 0 });
  }
  if (root.keys.length === 0 && !pos.has(root.id)) pos.set(root.id, { x: 0, y: 210, z: 0 });
  return pos;
}

function popIn(id) {
  const vn = tree.nodes.get(id).node;
  const from = newFrom.get(id);
  const to = vn.mesh.position.clone();
  vn.mesh.scale.setScalar(0.01);
  if (from) vn.mesh.position.set(from.x, from.y, from.z);
  C(450, (p) => {
    const t = easeInOut(p);
    if (from) vn.mesh.position.lerpVectors(from, to, t);
    vn.mesh.scale.setScalar(0.01 + 0.99 * t);
    if (p === 1) tree.drawEdges();
  }, () => vn.mesh.scale.set(1, 1, 1));
}
function shrinkOut(id) {
  const e = tree.nodes.get(id);
  if (!e) return;
  const m = e.node.mesh;
  C(300, (p) => m.scale.setScalar(Math.max(1 - p, 0.001)), () => m.scale.set(1, 1, 1));
  C(1, () => tree.removeNode(id), () => {});
}

function syncNodes() {
  const pos = layout();
  for (const [id] of tree.nodes) if (!model.has(id)) shrinkOut(id);
  for (const [id, m] of model) {
    const p = pos.get(id);
    if (!p) continue;
    const e = tree.nodes.get(id);
    const label = m.keys.join('|');
    if (e) {
      if (e.x !== p.x || e.y !== p.y) tree.moveNode(id, p.x, p.y, p.z, C);
      if (lastText.get(id) !== label) { lastText.set(id, label); C(1, () => tree.nodes.get(id) && tree.nodes.get(id).node.setText(label), () => {}); }
    } else {
      tree.addNode(id, label, p.x, p.y, p.z, { parentId: m.parent ? m.parent.id : null });
      lastText.set(id, label);
      popIn(id);
    }
  }
}

function splitNode(n) {
  const mid = Math.floor(n.keys.length / 2);
  const promoted = n.keys[mid];
  const right = mkNode();
  right.keys = n.keys.slice(mid + 1);
  right.parent = n.parent;
  if (n.children.length) {
    right.children = n.children.slice(mid + 1);
    for (const c of right.children) c.parent = right;
    n.children = n.children.slice(0, mid + 1);
  }
  n.keys = n.keys.slice(0, mid);
  const parent = n.parent;
  const from = posOf(n.id) || { x: 0, y: 210, z: 0 };
  newFrom.set(right.id, from);
  if (!parent) {
    const nr = mkNode();
    nr.keys = [promoted];
    nr.children = [n, right];
    n.parent = nr; right.parent = nr;
    root = nr;
    newFrom.set(nr.id, from);
  } else {
    let i = 0;
    while (i < parent.keys.length && parent.keys[i] < promoted) i++;
    parent.keys.splice(i, 0, promoted);
    parent.children.splice(i + 1, 0, right);
    if (parent.keys.length > MAX) splitNode(parent);
  }
}

function insertValue(v) {
  const key = parseInt(v);
  if (isNaN(key)) return;
  engine.clear();
  newFrom.clear(); flyKeys.length = 0;
  if (!root) {
    root = mkNode();
    root.keys.push(key);
    syncNodes();
    tree.highlight(root.id, C);
    status.textContent = '';
    return;
  }
  let n = root;
  const path = [];
  while (n.children.length) {
    path.push(n.id);
    let i = 0;
    while (i < n.keys.length && n.keys[i] < key) i++;
    n = n.children[i];
  }
  path.push(n.id);
  let i = 0;
  while (i < n.keys.length && n.keys[i] < key) i++;
  const existed = i < n.keys.length && n.keys[i] === key;
  if (existed) { status.textContent = key + ' 已存在'; return; }
  status.textContent = '插入 ' + key;
  n.keys.splice(i, 0, key);
  if (n.keys.length > MAX) splitNode(n);
  syncNodes();
  for (const id of path) tree.highlight(id, C);
  status.textContent = '';
}

function recordFly(key, fromN, toN) {
  const a = posOf(fromN.id), b = posOf(toN.id);
  if (a && b) flyKeys.push({ key, from: a, to: b });
}

function rebalance(n) {
  if (n === root) {
    if (n.keys.length === 0) {
      if (n.children.length === 1) { root = n.children[0]; root.parent = null; }
      else if (n.children.length === 0) root = null;
    }
    return;
  }
  if (n.keys.length >= MIN) return;
  const parent = n.parent;
  const idx = parent.children.indexOf(n);
  const left = idx > 0 ? parent.children[idx - 1] : null;
  const right = idx < parent.children.length - 1 ? parent.children[idx + 1] : null;
  if (left && left.keys.length > MIN) {
    const moved = parent.keys[idx - 1];
    parent.keys[idx - 1] = left.keys.pop();
    n.keys.unshift(moved);
    if (left.children.length) { const c = left.children.pop(); n.children.unshift(c); c.parent = n; }
    recordFly(moved, left, n);
  } else if (right && right.keys.length > MIN) {
    const moved = parent.keys[idx];
    parent.keys[idx] = right.keys.shift();
    n.keys.push(moved);
    if (right.children.length) { const c = right.children.shift(); n.children.push(c); c.parent = n; }
    recordFly(moved, right, n);
  } else {
    const sib = left || right;
    if (left) {
      const midK = parent.keys[idx - 1];
      left.keys.push(midK, ...n.keys);
      left.children.push(...n.children);
      for (const c of n.children) c.parent = left;
      parent.keys.splice(idx - 1, 1);
      parent.children.splice(idx, 1);
    } else {
      const midK = parent.keys[idx];
      n.keys.push(midK, ...right.keys);
      n.children.push(...right.children);
      for (const c of right.children) c.parent = n;
      parent.keys.splice(idx, 1);
      parent.children.splice(idx + 1, 1);
    }
    rebalance(parent);
  }
}

function removeKey(node, key, path) {
  if (!node) return false;
  const i = node.keys.indexOf(key);
  if (i >= 0) {
    path.push(node.id);
    if (node.children.length === 0) {
      node.keys.splice(i, 1);
      rebalance(node);
      return true;
    }
    let pred = node.children[i];
    while (pred.children.length) pred = pred.children[pred.children.length - 1];
    const pk = pred.keys[pred.keys.length - 1];
    node.keys[i] = pk;
    return removeKey(pred, pk, path);
  }
  if (node.children.length === 0) return false;
  path.push(node.id);
  let ci = 0;
  while (ci < node.keys.length && node.keys[ci] < key) ci++;
  return removeKey(node.children[ci], key, path);
}

function deleteValue(v) {
  const key = parseInt(v);
  if (isNaN(key)) return;
  engine.clear();
  newFrom.clear(); flyKeys.length = 0;
  const path = [];
  if (!removeKey(root, key, path)) { status.textContent = key + ' 不存在'; return; }
  status.textContent = '删除 ' + key;
  syncNodes();
  for (const id of path) tree.highlight(id, C);
  for (const f of flyKeys) {
    const tmp = new VText(scene, { text: String(f.key), x: f.from.x, y: f.from.y, z: 0, color: PALETTE.textGlow, scale: 0.8 });
    C(450, (p) => { const t = easeInOut(p); tmp.sprite.position.set(f.from.x + (f.to.x - f.from.x) * t, f.from.y + (f.to.y - f.from.y) * t, 0); }, () => tmp.remove());
    C(60, () => tmp.remove(), () => {});
  }
  status.textContent = '';
}

function findValue(v) {
  const key = parseInt(v);
  engine.clear();
  let n = root;
  if (!n) { status.textContent = key + ' 不存在'; return; }
  const path = [];
  while (n.children.length) {
    path.push(n.id);
    let i = 0;
    while (i < n.keys.length && n.keys[i] < key) i++;
    n = n.children[i];
  }
  path.push(n.id);
  const found = n.keys.includes(key);
  for (const id of path) tree.highlight(id, C);
  status.textContent = found ? key + ' 存在' : key + ' 不存在';
}

function printTree() {
  engine.clear();
  const keys = [];
  (function ino(n) {
    if (!n) return;
    if (n.children.length === 0) { keys.push(...n.keys); return; }
    for (let i = 0; i < n.children.length; i++) {
      ino(n.children[i]);
      if (i < n.keys.length) keys.push(n.keys[i]);
    }
  })(root);
  status.textContent = '中序: ' + keys.join(' → ');
  keys.forEach((k, i) => {
    const x = (i - (keys.length - 1) / 2) * 80;
    const tmp = new VText(scene, { text: String(k), x: 0, y: 230, z: 0, color: PALETTE.textGlow, scale: 0.8 });
    C(400, (p) => { const t = easeInOut(p); tmp.sprite.position.x = x * t; tmp.sprite.position.y = 230 + (-235 - 230) * t; }, () => tmp.remove());
    C(50, () => tmp.remove(), () => {});
  });
  status.textContent = '';
}

function clearAll() {
  engine.clear();
  tree.clear();
  model.clear();
  root = null;
  lastText.clear();
  newFrom.clear(); flyKeys.length = 0;
  status.textContent = '已清空';
}

let input = panel.addInput('输入数字', (v) => { if (v) insertValue(v); }, 6);
panel.addButton('插入', () => { if (input.value) insertValue(input.value); });
panel.addButton('查找', () => { if (input.value) findValue(input.value); });
panel.addButton('打印', printTree);
panel.addButton('清空', clearAll);
panel.addButton('删除', () => { if (input.value) deleteValue(input.value); });
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
