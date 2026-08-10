// AlgorithmLibrary/BPlusTree3D.js
// B+ 树（3 阶）：内部节点 = Tree3D 多键球体；叶子层 = VBox 行（y=-140）+
// 兄弟叶横向 tube 连接 + 「叶」标记；分裂复制键上移、叶子链断开重连。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Tree3D } from '../3D/modes/Tree3D.js';
import { VText, VBox, tubeBetween, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE } from '../3D/Glow.js';

const scene = new Scene3D('scene', { cameraPos: [0, 200, 700], fov: 58 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const tree = new Tree3D(scene);
const status = panel.addStatus('');
const MAX = 2, MIN = 1, LMAX = 3, LMIN = 1;

let nextId = 0;
const model = new Map();
let root = null, leafHead = null;
const lastText = new Map();
const newFrom = new Map();
const flyKeys = [];
const leafBoxes = new Map();
const leafLabels = new Map();
let leafTubes = [];

function mkInternal() {
  const n = { id: 'n' + (nextId++), keys: [], children: [], parent: null, isLeaf: false };
  model.set(n.id, n);
  return n;
}
function mkLeaf() {
  const n = { id: 'l' + (nextId++), keys: [], next: null, parent: null, isLeaf: true };
  model.set(n.id, n);
  return n;
}
function posOf(id) {
  const e = tree.nodes.get(id);
  return e ? { x: e.x, y: e.y, z: e.z } : null;
}

function layoutInternal() {
  const pos = new Map();
  if (!root || root.isLeaf) return pos;
  const all = [];
  (function ino(n) {
    if (n.isLeaf) return;
    for (let i = 0; i < n.children.length; i++) {
      ino(n.children[i]);
      if (i < n.keys.length) all.push({ n, k: n.keys[i] });
    }
  })(root);
  const keyX = all.map((e, i) => (i - (all.length - 1) / 2) * 66);
  const keyIdx = new Map();
  all.forEach((e, i) => (keyIdx.get(e.n.id) = keyIdx.get(e.n.id) || []).push(keyX[i]));
  const depth = new Map();
  const q = [root];
  depth.set(root.id, 0);
  while (q.length) {
    const n = q.shift();
    for (const c of n.children) {
      if (c.isLeaf) continue;
      depth.set(c.id, depth.get(n.id) + 1);
      q.push(c);
    }
  }
  for (const [id, xs] of keyIdx) {
    const n = model.get(id);
    pos.set(id, { x: xs.reduce((a, b) => a + b, 0) / xs.length, y: 210 - depth.get(id) * 90, z: 0 });
  }
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

function syncInternals() {
  const pos = layoutInternal();
  for (const [id] of tree.nodes) if (!model.has(id) || model.get(id).isLeaf) shrinkOut(id);
  for (const [id, m] of model) {
    if (m.isLeaf) continue;
    const p = pos.get(id);
    if (!p) continue;
    const e = tree.nodes.get(id);
    const label = m.keys.join('|');
    if (e) {
      if (e.x !== p.x || e.y !== p.y) tree.moveNode(id, p.x, p.y, p.z, C);
      if (lastText.get(id) !== label) { lastText.set(id, label); C(1, () => tree.nodes.get(id) && tree.nodes.get(id).node.setText(label), () => {}); }
    } else {
      tree.addNode(id, label, p.x, p.y, p.z, { parentId: m.parent && !m.parent.isLeaf ? m.parent.id : null });
      lastText.set(id, label);
      popIn(id);
    }
  }
}

function leafPositions() {
  const leaves = [];
  for (let l = leafHead; l; l = l.next) leaves.push(l);
  const all = [];
  for (const l of leaves) for (const k of l.keys) all.push(k);
  const xMap = new Map();
  all.forEach((k, i) => xMap.set(k, (i - (all.length - 1) / 2) * 66));
  const pos = new Map();
  for (const l of leaves) {
    let sum = 0;
    for (const k of l.keys) sum += xMap.get(k);
    pos.set(l.id, l.keys.length ? sum / l.keys.length : 0);
  }
  return { leaves, pos };
}

function rebuildTubes(leaves, pos) {
  for (const m of leafTubes) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); }
  leafTubes = [];
  const Y = -140;
  for (let i = 0; i < leaves.length - 1; i++) {
    const x1 = pos.get(leaves[i].id), x2 = pos.get(leaves[i + 1].id);
    leafTubes.push(tubeBetween(scene, new THREE.Vector3(x1 + 24, Y, 0), new THREE.Vector3(x2 - 24, Y, 0), { color: PALETTE.edge, opacity: 0.4, radius: 2 }));
  }
  for (const l of leaves) {
    const p = pos.get(l.id);
    if (!l.parent) continue;
    const pe = tree.nodes.get(l.parent.id);
    if (!pe) continue;
    leafTubes.push(tubeBetween(scene, new THREE.Vector3(pe.x, pe.y - 20, 0), new THREE.Vector3(p, Y + 20, 0), { color: PALETTE.edge, opacity: 0.35, radius: 1.6 }));
  }
}

function syncLeaves() {
  const { leaves, pos } = leafPositions();
  for (const [id, box] of leafBoxes) {
    const leaf = model.get(id);
    if (!leaf || leaf.keys.length === 0) {
      const lbl = leafLabels.get(id);
      C(200, (p) => box.mesh.scale.setScalar(Math.max(1 - p, 0.001)), () => box.mesh.scale.set(1, 1, 1));
      C(1, () => box.remove(), () => {});
      if (lbl) C(1, () => { lbl.remove(); leafLabels.delete(id); }, () => {});
      leafBoxes.delete(id);
      continue;
    }
    const label = leaf.keys.join('|');
    if (box.text !== label) C(1, () => box.setText(label), () => {});
    const x = pos.get(id);
    if (box.mesh.position.x !== x) C(400, (p) => { const t = easeInOut(p); box.mesh.position.x = box.mesh.position.x + (x - box.mesh.position.x) * t; }, () => {});
  }
  for (const l of leaves) {
    if (leafBoxes.has(l.id)) continue;
    const x = pos.get(l.id);
    const box = new VBox(scene, { w: 46, h: 40, d: 40, x, y: -140, z: 0, label: l.keys.join('|'), color: PALETTE.blue, emissive: PALETTE.blueEmissive });
    box.mesh.scale.setScalar(0.01);
    C(400, (p) => { const t = easeInOut(p); box.mesh.scale.setScalar(0.01 + 0.99 * t); }, () => box.mesh.scale.set(1, 1, 1));
    leafBoxes.set(l.id, box);
  }
  for (const l of leaves) {
    const x = pos.get(l.id);
    const lbl = leafLabels.get(l.id);
    if (lbl) {
      C(400, (p) => { const t = easeInOut(p); lbl.sprite.position.x = lbl.sprite.position.x + (x - lbl.sprite.position.x) * t; }, () => {});
    } else {
      const t = new VText(scene, { text: '叶', x, y: -140 + 42, z: 0, color: PALETTE.textDim, scale: 0.55 });
      leafLabels.set(l.id, t);
    }
  }
  C(1, () => rebuildTubes(leaves, pos), () => {});
}

function splitLeaf(leaf) {
  const mid = Math.floor(leaf.keys.length / 2);
  const right = mkLeaf();
  right.keys = leaf.keys.slice(mid);
  leaf.keys = leaf.keys.slice(0, mid);
  right.next = leaf.next;
  leaf.next = right;
  const promoted = right.keys[0];
  const parent = leaf.parent;
  if (!parent) {
    const nr = mkInternal();
    nr.keys = [promoted];
    nr.children = [leaf, right];
    leaf.parent = nr; right.parent = nr;
    root = nr;
    const box = leafBoxes.get(leaf.id);
    const from = box ? { x: box.mesh.position.x, y: -140, z: 0 } : { x: 0, y: -140, z: 0 };
    newFrom.set(nr.id, from);
  } else {
    let i = 0;
    while (i < parent.keys.length && parent.keys[i] < promoted) i++;
    parent.keys.splice(i, 0, promoted);
    parent.children.splice(i + 1, 0, right);
    right.parent = parent;
    if (parent.keys.length > MAX) splitInternal(parent);
  }
}

function splitInternal(n) {
  const mid = Math.floor(n.keys.length / 2);
  const promoted = n.keys[mid];
  const right = mkInternal();
  right.keys = n.keys.slice(mid);
  right.parent = n.parent;
  right.children = n.children.slice(mid + 1);
  for (const c of right.children) c.parent = right;
  n.children = n.children.slice(0, mid + 1);
  n.keys = n.keys.slice(0, mid);
  const parent = n.parent;
  const from = posOf(n.id) || { x: 0, y: 210, z: 0 };
  newFrom.set(right.id, from);
  if (!parent) {
    const nr = mkInternal();
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
    if (parent.keys.length > MAX) splitInternal(parent);
  }
}

function insertValue(v) {
  const key = parseInt(v);
  if (isNaN(key)) return;
  engine.clear();
  newFrom.clear(); flyKeys.length = 0;
  if (!root) {
    root = mkLeaf();
    root.keys.push(key);
    leafHead = root;
    syncInternals();
    syncLeaves();
    status.textContent = '';
    return;
  }
  let n = root;
  const path = [];
  while (!n.isLeaf) {
    path.push(n.id);
    let i = 0;
    while (i < n.keys.length && n.keys[i] < key) i++;
    n = n.children[i];
  }
  let i = 0;
  while (i < n.keys.length && n.keys[i] < key) i++;
  if (i < n.keys.length && n.keys[i] === key) { status.textContent = key + ' 已存在'; return; }
  status.textContent = '插入 ' + key;
  n.keys.splice(i, 0, key);
  if (n.keys.length > LMAX) splitLeaf(n);
  syncInternals();
  syncLeaves();
  for (const id of path) tree.highlight(id, C);
  status.textContent = '';
}

function rebalanceInternal(n) {
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
  } else if (right && right.keys.length > MIN) {
    const moved = parent.keys[idx];
    parent.keys[idx] = right.keys.shift();
    n.keys.push(moved);
    if (right.children.length) { const c = right.children.shift(); n.children.push(c); c.parent = n; }
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
    rebalanceInternal(parent);
  }
}

function rebalanceLeaf(n) {
  if (n === root) {
    if (n.keys.length === 0) { root = null; leafHead = null; }
    return;
  }
  if (n.keys.length >= LMIN) return;
  const parent = n.parent;
  const idx = parent.children.indexOf(n);
  const left = idx > 0 ? parent.children[idx - 1] : null;
  const right = idx < parent.children.length - 1 ? parent.children[idx + 1] : null;
  if (left && left.keys.length > LMIN) {
    const moved = left.keys.pop();
    n.keys.unshift(moved);
    parent.keys[idx - 1] = n.keys[0];
    const a = posOf(left.id), b = posOf(n.id);
    if (a && b) flyKeys.push({ key: moved, from: a, to: b });
  } else if (right && right.keys.length > LMIN) {
    const moved = right.keys.shift();
    n.keys.push(moved);
    parent.keys[idx] = right.keys[0];
    const a = posOf(right.id), b = posOf(n.id);
    if (a && b) flyKeys.push({ key: moved, from: a, to: b });
  } else if (left) {
    left.keys.push(...n.keys);
    left.next = n.next;
    parent.keys.splice(idx - 1, 1);
    parent.children.splice(idx, 1);
    rebalanceInternal(parent);
  } else {
    n.keys.push(...right.keys);
    n.next = right.next;
    parent.keys.splice(idx, 1);
    parent.children.splice(idx + 1, 1);
    rebalanceInternal(parent);
  }
}

function deleteValue(v) {
  const key = parseInt(v);
  if (isNaN(key)) return;
  engine.clear();
  newFrom.clear(); flyKeys.length = 0;
  if (!root) { status.textContent = key + ' 不存在'; return; }
  let n = root;
  const path = [];
  while (!n.isLeaf) {
    path.push(n.id);
    let i = 0;
    while (i < n.keys.length && n.keys[i] < key) i++;
    n = n.children[i];
  }
  const i = n.keys.indexOf(key);
  if (i < 0) { status.textContent = key + ' 不存在'; return; }
  status.textContent = '删除 ' + key;
  n.keys.splice(i, 1);
  rebalanceLeaf(n);
  syncInternals();
  syncLeaves();
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
  if (!root) { status.textContent = key + ' 不存在'; return; }
  let n = root;
  const path = [];
  while (!n.isLeaf) {
    path.push(n.id);
    let i = 0;
    while (i < n.keys.length && n.keys[i] < key) i++;
    n = n.children[i];
  }
  for (const id of path) tree.highlight(id, C);
  let found = false;
  for (let l = leafHead; l; l = l.next) {
    const box = leafBoxes.get(l.id);
    if (!box) continue;
    if (l.keys.includes(key)) {
      C(150, () => box.setColor(PALETTE.green, PALETTE.greenEmissive));
      C(450, (p) => box.mesh.scale.setScalar(1 + 0.2 * Math.sin(p * Math.PI)), () => box.mesh.scale.set(1, 1, 1));
      found = true;
      break;
    }
    C(150, () => box.setColor(PALETTE.highlight, PALETTE.highlightEmissive));
    C(150, () => box.setColor(PALETTE.blue, PALETTE.blueEmissive));
  }
  status.textContent = found ? key + ' 存在' : key + ' 不存在';
}

function printTree() {
  engine.clear();
  const keys = [];
  for (let l = leafHead; l; l = l.next) keys.push(...l.keys);
  status.textContent = '叶层: ' + keys.join(' → ');
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
  for (const b of leafBoxes.values()) b.remove();
  leafBoxes.clear();
  for (const t of leafLabels.values()) t.remove();
  leafLabels.clear();
  for (const m of leafTubes) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); }
  leafTubes = [];
  model.clear();
  root = null; leafHead = null;
  lastText.clear(); newFrom.clear(); flyKeys.length = 0;
  status.textContent = '已清空';
}

let input = panel.addInput('输入数字', (v) => { if (v) insertValue(v); }, 6);
panel.addButton('插入', () => { if (input.value) insertValue(input.value); });
panel.addButton('查找', () => { if (input.value) findValue(input.value); });
panel.addButton('打印', printTree);
panel.addButton('删除', () => { if (input.value) deleteValue(input.value); });
panel.addButton('Clear', clearAll);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
