// AlgorithmLibrary/PairingHeap3D.js
// 配对堆：多树森林（根排成一排，各树向下延伸，节点 VBox + 连线）。
// 插入 = 新节点与堆根合并；删除最小 = 移除根，子节点成对合并（左→右），再自右向左合并；
// 减小键 = 找到节点改值后 cut 出子树并与堆根合并。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, tubeBetween, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('PairingHeap3D');

const scene = new Scene3D('scene', { cameraPos: [0, 220, 660], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const status = panel.addStatus('');
let forest = [];              // 根节点列表
let nextId = 1;
const entry = new Map();      // id -> { box, x, y, z }
let edgeMeshes = [];

function modelNode(key) { return { id: nextId++, key, children: [], parent: null }; }
function subSize(n) { let s = 1; for (const c of n.children) s += subSize(c); return s; }
function findKey(key) {
  for (const r of forest) {
    const f = findIn(r, key);
    if (f) return f;
  }
  return null;
}
function findIn(n, key) {
  if (n.key === key) return n;
  for (const c of n.children) { const f = findIn(c, key); if (f) return f; }
  return null;
}

// ---- 布局：根排成一排，子树按大小分配宽度 ----
function layoutForest() {
  const pos = new Map();
  const total = forest.reduce((s, r) => s + subSize(r), 0) || 1;
  let cx = -total * 45;
  for (const r of forest) {
    const w = subSize(r) * 90;
    layoutTree(r, cx, cx + w, 215, pos);
    cx += w + 60;
  }
  return pos;
}
function layoutTree(n, x0, x1, y, pos) {
  pos.set(n.id, { x: (x0 + x1) / 2, y });
  const kids = n.children;
  if (!kids.length) return;
  const total = kids.reduce((s, k) => s + subSize(k), 0) || 1;
  let cx = x0;
  for (const k of kids) {
    const w = subSize(k) / total * (x1 - x0);
    layoutTree(k, cx, cx + w, y - 92, pos);
    cx += w;
  }
}

// ---- 渲染 ----
function createEntry(n, x, y) {
  const box = new VBox(scene, { w: 52, h: 52, d: 32, x, y, z: 0, label: String(n.key), color: PALETTE.node, emissive: PALETTE.nodeEmissive });
  entry.set(n.id, { n, box, x, y, z: 0 });
}
function moveEntry(id, x, y) {
  const e = entry.get(id);
  if (!e) return;
  const fx = e.x, fy = e.y;
  C({ duration: 500, fn: (p) => {
    const t = easeInOut(p);
    e.box.mesh.position.set(fx + (x - fx) * t, fy + (y - fy) * t, 0);
    if (p === 1) drawEdges();
  }, undo: () => { e.box.mesh.position.set(fx, fy, 0); drawEdges(); } });
  e.x = x; e.y = y;
}
function drawEdges() {
  for (const m of edgeMeshes) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); }
  edgeMeshes = [];
  (function walk(n) {
    for (const c of n.children) {
      const a = entry.get(n.id), b = entry.get(c.id);
      if (a && b) {
        const from = a.box.mesh.position.clone(), to = b.box.mesh.position.clone();
        const dir = to.clone().sub(from);
        if (dir.lengthSq() > 1e-6) {
          dir.normalize();
          from.addScaledVector(dir, 28); to.addScaledVector(dir, 28);
          edgeMeshes.push(tubeBetween(scene, from, to, { color: PALETTE.edge, opacity: 0.5, radius: 2 }));
        }
      }
      walk(c);
    }
  })({ children: forest });
}
function layoutAndMove() {
  const pos = layoutForest();
  for (const [id, e] of entry) {
    const p = pos.get(id);
    if (!p) continue;
    if (e.x === p.x && e.y === p.y) continue;
    moveEntry(id, p.x, p.y);
  }
}
function clearAllNodes() {
  for (const e of entry.values()) e.box.remove();
  entry.clear();
  for (const m of edgeMeshes) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); }
  edgeMeshes = [];
  forest = [];
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

// ---- 合并（模型）并记录事件 ----
function meldModel(a, b, events) {
  if (!a) return b;
  if (!b) return a;
  if (a.key > b.key) { const t = a; a = b; b = t; }
  events.push({ a, b });
  a.children.push(b);
  b.parent = a;
  return a;
}
function replayMeld(events) {
  for (const ev of events) {
    hl(ev.a.id, PALETTE.cyan);
    hl(ev.b.id, PALETTE.cyan);
    status.textContent = '合并: 根 ' + ev.a.key + ' 吸收 ' + ev.b.key + ' 为子节点';
    unhl(ev.a.id);
    unhl(ev.b.id);
    layoutAndMove();
  }
}

// ---- 插入 ----
function insertValue(raw) {
  let v = parseInt(String(raw || '').trim());
  if (isNaN(v)) { v = 10; status.textContent = '输入为空，插入演示值 10'; }
  if (entry.size >= 40) { status.textContent = '堆节点过多'; return; }
  status.textContent = '插入 ' + v;
  const n = modelNode(v);
  const events = [];
  if (!forest.length) forest = [n];
  else forest = [meldModel(forest[0], n, events)];
  const pos = layoutForest().get(n.id);
  createEntry(n, pos.x, pos.y + 240);
  const e0 = entry.get(n.id);
  C({ duration: 600, fn: (p) => {
    const dy = 240 * (1 - easeInOut(p));
    e0.box.mesh.position.y = pos.y + dy;
    if (p === 1) { e0.y = pos.y; drawEdges(); }
  }, undo: () => { e0.box.mesh.position.set(pos.x, pos.y + 240, 0); e0.y = pos.y + 240; drawEdges(); } });
  e0.y = pos.y;
  hl(n.id, PALETTE.green);
  replayMeld(events);
  unhl(n.id);
  layoutAndMove();
  status.textContent = '';
}

// ---- 删除最小 ----
function deleteMin() {
  if (!forest.length) { status.textContent = '堆为空'; return; }
  const root = forest[0];
  status.textContent = '删除最小 ' + root.key;
  hl(root.id, PALETTE.red);
  const e0 = entry.get(root.id);
  entry.delete(root.id);
  if (e0) C({ duration: 350, fn: (p) => {
    e0.box.mesh.scale.setScalar(Math.max(1 - easeInOut(p), 0.01));
    if (p === 1) { e0.box.remove(); drawEdges(); }
  }, undo: () => { e0.box.mesh.scale.set(1, 1, 1); } });
  // 子节点各自成为根，先两两合并（左→右）
  const kids = root.children.slice();
  for (const k of kids) k.parent = null;
  forest = kids;
  const events = [];
  const merged = [];
  status.textContent = '子节点成对合并（从左到右）';
  for (let i = 0; i < forest.length; i += 2) {
    if (i + 1 < forest.length) merged.push(meldModel(forest[i], forest[i + 1], events));
    else merged.push(forest[i]);
  }
  // 自右向左合并
  status.textContent = '两两合并结果自右向左合并';
  let newRoot = merged.pop() || null;
  while (merged.length) newRoot = meldModel(merged.pop(), newRoot, events);
  forest = newRoot ? [newRoot] : [];
  replayMeld(events);
  layoutAndMove();
  status.textContent = '';
}

// ---- 减小键 ----
function decreaseKey(raw) {
  const m = String(raw || '').trim().match(/^(\d+)\s*[,\s，]\s*(\d+)$/);
  if (!m) { status.textContent = '格式: 节点值 新值（如 15 3）'; return; }
  const key = +m[1], nv = +m[2];
  const n = findKey(key);
  if (!n) { status.textContent = key + ' 不存在'; return; }
  if (nv >= n.key) { status.textContent = '新值需小于当前值 ' + n.key; return; }
  const e0 = entry.get(n.id);
  status.textContent = '减小键: ' + key + ' → ' + nv;
  hl(n.id, PALETTE.yellow);
  C({ duration: 350, fn: (p) => {
    e0.box.mesh.scale.setScalar(Math.max(1 + 0.15 * Math.sin(p * Math.PI), 0.01));
    e0.box.setText(String(nv));
  }, undo: () => { e0.box.mesh.scale.set(1, 1, 1); e0.box.setText(String(key)); } });
  n.key = nv;
  // cut：从父节点分离
  const events = [];
  if (n.parent) {
    const arr = n.parent.children;
    const ix = arr.indexOf(n);
    if (ix >= 0) arr.splice(ix, 1);
    n.parent = null;
    status.textContent = 'cut: ' + nv + ' 从父节点分离，成为独立根';
  } else {
    forest = forest.filter(r => r !== n);
  }
  // 与当前最小根合并
  let minRoot = null;
  for (const r of forest) if (!minRoot || r.key < minRoot.key) minRoot = r;
  if (minRoot) {
    forest = forest.filter(r => r !== n && r !== minRoot);
    forest.push(meldModel(minRoot, n, events));
  } else {
    forest.push(n);
  }
  replayMeld(events);
  unhl(n.id);
  layoutAndMove();
  status.textContent = '';
}

// ---- 清空 ----
function clearAll() {
  engine.clear();
  clearAllNodes();
  status.textContent = '已清空';
}

// 控件
let insInput = panel.addInput('插入: 数字', (v) => insertValue(v), 8);
panel.addButton('插入', () => insertValue(insInput.value));
panel.addButton('删除最小', deleteMin);
let decInput = panel.addInput('减小键: 节点值 新值（如 15 3）', (v) => decreaseKey(v), 12);
panel.addButton('减小键', () => decreaseKey(decInput.value));
panel.addButton('清空', clearAll);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
