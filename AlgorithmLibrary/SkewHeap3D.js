// AlgorithmLibrary/SkewHeap3D.js
// 斜堆：递归合并沿右路径进行，回溯时无条件交换左右孩子（无 npl）。
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
let root = null;               // 模型根 { id, key, left, right }
let nextId = 1;
const modelMap = new Map();    // id -> 模型节点
let posMap = new Map();
const moved = new Set();

function modelNode(key) { const n = { id: nextId++, key, left: null, right: null }; modelMap.set(n.id, n); return n; }

// 递归合并，同时记录动画步骤：descend = 比较两棵树的根；swap = 回溯时交换左右孩子
function mergeModel(a, b, steps) {
  if (!a) return b;
  if (!b) return a;
  if (b.key < a.key) { const t = a; a = b; b = t; }
  steps.push({ type: 'descend', a, b });
  a.right = mergeModel(a.right, b, steps);
  steps.push({ type: 'swap', node: a, l: a.left, r: a.right });
  const t = a.left; a.left = a.right; a.right = t;
  return a;
}

// ---- 布局：中序遍历定 x，深度定 y ----
function layoutPositions() {
  const pos = new Map();
  let total = 0;
  (function count(n) { if (!n) return; total++; count(n.left); count(n.right); })(root);
  let i = 0;
  (function walk(n, d) {
    if (!n) return;
    walk(n.left, d + 1);
    pos.set(n.id, { x: (i++ - (total - 1) / 2) * (56 + d * 10), y: 210 - d * 90, z: 0 });
    walk(n.right, d + 1);
  })(root, 0);
  return pos;
}

function moveSubtree(n, cmd) {
  if (!n || moved.has(n.id)) return;
  moved.add(n.id);
  const p = posMap.get(n.id);
  const e = tree.nodes.get(n.id);
  if (e && p) tree.moveNode(n.id, p.x, p.y, p.z, cmd);
  moveSubtree(n.left, cmd);
  moveSubtree(n.right, cmd);
}

function layoutAndMove() {
  for (const [id, e] of tree.nodes) {
    const p = posMap.get(id);
    if (!p || (e.x === p.x && e.y === p.y && e.z === p.z)) continue;
    tree.moveNode(id, p.x, p.y, p.z, C);
  }
}

function replaySteps(steps) {
  for (const s of steps) {
    if (s.type === 'descend') {
      tree.highlight(s.a.id, C);
      tree.highlight(s.b.id, C);
      status.textContent = '比较根 ' + s.a.key + ' 与 ' + s.b.key;
      tree.unhighlight(s.a.id, C);
      tree.unhighlight(s.b.id, C);
    } else {
      status.textContent = '回溯: 交换 ' + s.node.key + ' 的左右子树';
      moveSubtree(s.l, C);
      moveSubtree(s.r, C);
    }
  }
}

// ---- 插入：单节点堆与主堆合并 ----
function insertValue(v) {
  status.textContent = '插入 ' + v;
  const n = modelNode(v);
  const steps = [];
  root = mergeModel(root, n, steps);
  posMap = layoutPositions();
  moved.clear();
  const p = posMap.get(n.id);
  tree.addNode(n.id, String(v), p.x, p.y + 250, p.z);
  tree.highlight(n.id, C);
  replaySteps(steps);
  layoutAndMove();
  tree.unhighlight(n.id, C);
  status.textContent = '';
}

// ---- 删除最小的：移除根，合并其左右子树 ----
function deleteMin() {
  if (!root) { status.textContent = '堆为空'; return; }
  const min = root;
  status.textContent = '删除最小 ' + min.key;
  tree.highlight(min.id, C);
  const steps = [];
  root = mergeModel(root.left, root.right, steps);
  posMap = layoutPositions();
  moved.clear();
  const e = tree.nodes.get(min.id);
  if (e) C(350, (p) => {
    e.node.mesh.scale.setScalar(Math.max(1 - easeInOut(p), 0.01));
    if (p === 1) tree.removeNode(min.id);
  }, () => { e.node.mesh.scale.set(1, 1, 1); });
  modelMap.delete(min.id);
  replaySteps(steps);
  layoutAndMove();
  status.textContent = '';
}

// ---- 清除堆 ----
function clearHeap() {
  tree.clear();
  modelMap.clear();
  root = null;
}

// 控件
let input = panel.addInput('输入数字', (v) => { if (v) insertValue(parseInt(v)); }, 10);
panel.addButton('插入', () => { const v = parseInt(input.value); if (!isNaN(v)) insertValue(v); });
panel.addButton('删除最小的', deleteMin);
panel.addButton('清除堆', clearHeap);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
