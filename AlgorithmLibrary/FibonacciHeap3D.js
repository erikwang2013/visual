// AlgorithmLibrary/FibonacciHeap3D.js
// 斐波那契堆：根表一行 + 各根子树向下展开。插入只入根表；删除最小时提升子树并按度数合并。
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Tree3D } from '../3D/modes/Tree3D.js';
import { VText, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE } from '../3D/Glow.js';

const scene = new Scene3D('scene', { cameraPos: [0, 220, 640], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const tree = new Tree3D(scene);
const status = panel.addStatus('');
const rootLabel = new VText(scene, { text: '根表', x: 0, y: 252, z: 0, color: PALETTE.textDim, scale: 0.8 });
let roots = [];            // 根表（斐波那契树根列表）
let nextId = 1;
let posMap = new Map();
const moved = new Set();

function newNode(key) { return { id: nextId++, key, parent: null, children: [] }; }

// 布局：根一行，各根子树向下逐层展开
function placeTree(n, x, y) {
  posMap.set(n.id, { x, y, z: 0 });
  const k = n.children.length;
  n.children.forEach((c, j) => placeTree(c, x + (j - (k - 1) / 2) * 110, y - 95));
}
function computeLayout() {
  posMap = new Map();
  const k = roots.length;
  roots.forEach((r, i) => placeTree(r, (i - (k - 1) / 2) * 120, 210));
}

function moveSubtree(n, cmd) {
  if (moved.has(n.id)) return;
  moved.add(n.id);
  const p = posMap.get(n.id);
  const e = tree.nodes.get(n.id);
  if (e && p) tree.moveNode(n.id, p.x, p.y, p.z, cmd);
  n.children.forEach(c => moveSubtree(c, cmd));
}

function layoutAndMove() {
  computeLayout();
  for (const [id, e] of tree.nodes) {
    const p = posMap.get(id);
    if (!p || (e.x === p.x && e.y === p.y && e.z === p.z)) continue;
    tree.moveNode(id, p.x, p.y, p.z, C);
  }
}

// 合并两棵同度数树：小根为父，败者成为胜者的孩子
function mergeTrees(a, b) {
  if (b.key < a.key) { const t = a; a = b; b = t; }
  b.parent = a.id;
  a.children.push(b);
  return a;
}

// ---- 插入：新节点直接加入根表，不做合并 ----
function insertValue(v) {
  status.textContent = '插入 ' + v;
  const n = newNode(v);
  roots.push(n);
  computeLayout();
  const p = posMap.get(n.id);
  tree.addNode(n.id, String(v), p.x, p.y + 250, p.z);
  tree.highlight(n.id, C);
  layoutAndMove();
  tree.unhighlight(n.id, C);
  status.textContent = '';
}

// ---- 删除最小的：提升子树到根表，按度数合并 ----
function deleteMin() {
  if (!roots.length) { status.textContent = '堆为空'; return; }
  let min = roots[0];
  for (const r of roots) {
    tree.highlight(r.id, C);
    if (r.key < min.key) min = r;
  }
  status.textContent = '删除最小 ' + min.key;
  // 提升子树
  roots = roots.filter(r => r !== min);
  for (const c of min.children) { c.parent = null; roots.push(c); }
  min.children = [];
  // 度数合并
  const merges = [];
  const degMap = new Map();
  for (const r of roots.slice()) {
    let cur = r, d = cur.children.length;
    while (degMap.has(d)) {
      const other = degMap.get(d);
      degMap.delete(d);
      merges.push({ a: cur, b: other, d });
      cur = mergeTrees(cur, other);
      d = cur.children.length;
    }
    degMap.set(d, cur);
  }
  roots = [...degMap.values()];
  computeLayout();
  moved.clear();
  for (const m of merges) {
    tree.highlight(m.a.id, C);
    tree.highlight(m.b.id, C);
    status.textContent = '合并度数 ' + m.d + ' 的两棵树: ' + m.a.key + ' 与 ' + m.b.key;
    moveSubtree(m.a, C);
    moveSubtree(m.b, C);
    tree.unhighlight(m.a.id, C);
    tree.unhighlight(m.b.id, C);
  }
  // 最小根缩小消失
  const e = tree.nodes.get(min.id);
  if (e) C(350, (p) => {
    e.node.mesh.scale.setScalar(Math.max(1 - easeInOut(p), 0.01));
    if (p === 1) tree.removeNode(min.id);
  }, () => { e.node.mesh.scale.set(1, 1, 1); });
  layoutAndMove();
  status.textContent = '';
}

// ---- 清除堆 ----
function clearHeap() {
  tree.clear();
  roots = [];
}

// 控件
let input = panel.addInput('输入数字', (v) => { if (v) insertValue(parseInt(v)); }, 10);
panel.addButton('插入', () => { const v = parseInt(input.value); if (!isNaN(v)) insertValue(v); });
panel.addButton('删除最小的', deleteMin);
panel.addButton('清除堆', clearHeap);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
