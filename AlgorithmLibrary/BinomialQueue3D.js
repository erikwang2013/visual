// AlgorithmLibrary/BinomialQueue3D.js
// 二项队列：一组二项树的森林。插入 = 与最小同阶树逐步合并；删除最小 = 提升子树后重新合并。
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
let forest = [];            // forest[r] = 秩 r 的树根（或 null）
let nextId = 1;
let posMap = new Map();     // id -> 最终布局坐标
const moved = new Set();    // 已移动到最终位置的节点

const UNIT = 46;
function subtreeSpan(n) { return (1 + n.children.reduce((s, c) => s + subtreeSpan(c), 0)) * UNIT; }

function newNode(key) { return { id: nextId++, key, children: [] }; }

// 森林布局：树横排，每棵树根在上、子树一行行向下铺开
function computeLayout() {
  posMap = new Map();
  const roots = forest.filter(Boolean);
  const widths = roots.map(subtreeSpan);
  let total = widths.reduce((a, b) => a + b, 0) + Math.max(0, roots.length - 1) * 110;
  let acc = -total / 2;
  const place = (n, x, y) => {
    posMap.set(n.id, { x, y, z: 0 });
    const w = subtreeSpan(n);
    let cacc = x - w / 2;
    for (const c of n.children) {
      const cw = subtreeSpan(c);
      place(c, cacc + cw / 2, y - 95);
      cacc += cw;
    }
  };
  roots.forEach(r => { place(r, acc + subtreeSpan(r) / 2, 205); acc += subtreeSpan(r) + 110; });
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

// 合并两棵同阶树：小根在上，败者整体成为胜者第一个孩子
function mergeTrees(a, b) {
  if (b.key < a.key) { const t = a; a = b; b = t; }
  a.children.unshift(b);
  return a;
}

function replayMerges(merges) {
  for (const m of merges) {
    tree.highlight(m.a.id, C);
    tree.highlight(m.b.id, C);
    status.textContent = '合并阶 ' + m.rank + ' 树: ' + m.a.key + ' 与 ' + m.b.key;
    moveSubtree(m.a, C);
    moveSubtree(m.b, C);
    tree.unhighlight(m.a.id, C);
    tree.unhighlight(m.b.id, C);
  }
}

// ---- 插入：新节点加入秩 0，逐步与同阶树合并 ----
function insertValue(v) {
  status.textContent = '插入 ' + v;
  const n = newNode(v);
  const merges = [];
  let cur = n, r = 0;
  while (forest[r]) {
    merges.push({ a: cur, b: forest[r], rank: r });
    cur = mergeTrees(cur, forest[r]);
    forest[r] = null;
    r++;
  }
  forest[r] = cur;
  computeLayout();
  moved.clear();
  const p = posMap.get(n.id);
  tree.addNode(n.id, String(v), p.x, p.y + 250, p.z);
  tree.highlight(n.id, C);
  replayMerges(merges);
  tree.unhighlight(n.id, C);
  layoutAndMove();
  status.textContent = '';
}

// ---- 删除最小的：找到最小根，其子树按秩归位后重新合并 ----
function deleteMin() {
  const roots = forest.filter(Boolean);
  if (!roots.length) { status.textContent = '堆为空'; return; }
  let min = roots[0];
  for (const r of roots) {
    tree.highlight(r.id, C);
    if (r.key < min.key) min = r;
  }
  status.textContent = '删除最小 ' + min.key;
  const mr = forest.indexOf(min);
  forest[mr] = null;
  const merges = [];
  for (const c of min.children) {
    let cur = c, r = c.children.length;   // 子树按其自身秩放入森林
    while (forest[r]) {
      merges.push({ a: cur, b: forest[r], rank: r });
      cur = mergeTrees(cur, forest[r]);
      forest[r] = null;
      r++;
    }
    forest[r] = cur;
  }
  computeLayout();
  moved.clear();
  replayMerges(merges);
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
  forest = [];
}

// 控件
let input = panel.addInput('输入数字', (v) => { if (v) insertValue(parseInt(v)); }, 10);
panel.addButton('插入', () => { const v = parseInt(input.value); if (!isNaN(v)) insertValue(v); });
panel.addButton('删除最小的', deleteMin);
panel.addButton('清除堆', clearHeap);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
