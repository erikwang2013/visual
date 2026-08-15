// AlgorithmLibrary/LeftistHeap3D.js — 左倾堆：合并 = 取小根 + 递归并右子树 + npl 检查交换 —— npl 强制右路径 O(log n)，合并 O(log n)（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('LeftistHeap3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd;
const status = panel.addStatus('就绪');

// 演示序列固定（插入 5,3,8,1,7，每次 = 与单点堆 merge，再删除最小）：节点模块级预建，随演示显隐
const POOL = [5, 3, 8, 1, 7].map(v => {
  const n = { v, left: null, right: null, npl: 1, mesh: null, badge: null };
  n.mesh = new VNode(scene, { radius: 22, x: 330, y: 450, z: 0, label: String(v), color: BLUE, emissive: BLUE });
  n.badge = new VText(scene, { text: 'npl=1', x: 330, y: 412, z: 0, color: PUR, scale: 0.42 });
  n.mesh.visible = false;
  n.badge.sprite.visible = false;
  return n;
});

let root = null;
let edgeMeshes = new Map();
const nplOf = n => (n ? n.npl : 0);

function show(n) { n.mesh.visible = true; n.badge.sprite.visible = true; }
function hide(n) { n.mesh.visible = false; n.badge.sprite.visible = false; }
function countNodes(n) { return n ? 1 + countNodes(n.left) + countNodes(n.right) : 0; }
function layoutTree(r) {
  const pos = new Map();
  const cnt = countNodes(r);
  let x = 0;
  (function walk(n, d) {
    if (!n) return;
    walk(n.left, d + 1);
    pos.set(n, { x: 320 + (x - (cnt - 1) / 2) * 72, y: 490 - d * 70 });
    x++;
    walk(n.right, d + 1);
  })(r, 0);
  return pos;
}
function applyLayout() {
  const pos = layoutTree(root);
  POOL.forEach(n => {
    const p = pos.get(n);
    if (!p) return;
    n.mesh.moveTo(p.x, p.y, 0, 450);
    n.badge.moveTo(p.x, p.y - 38, 0, 450);
    n.badge.setText('npl=' + n.npl, { color: PUR });
  });
  edgeMeshes.forEach(m => scene.remove(m));
  edgeMeshes = new Map();
  (function walk(n) {
    if (!n) return;
    if (n.left) { edgeMeshes.set(n.left, tubeBetween(scene, pos.get(n), pos.get(n.left), { color: PALETTE.edge, opacity: 0.4, radius: 2 })); }
    if (n.right) { edgeMeshes.set(n.right, tubeBetween(scene, pos.get(n), pos.get(n.right), { color: PALETTE.edge, opacity: 0.4, radius: 2 })); }
    walk(n.left); walk(n.right);
  })(root);
}
function setCol(n, c) { n.mesh.setColor(c, c); }
function heapVals() { const a = []; (function walk(n) { if (!n) return; walk(n.left); a.push(n.v); walk(n.right); })(root); return a; }
function resetAll() {
  root = null;
  POOL.forEach(n => {
    n.left = null; n.right = null; n.npl = 1;
    n.mesh.visible = false; n.badge.sprite.visible = false;
    n.mesh.setColor(BLUE, BLUE);
  });
  edgeMeshes.forEach(m => scene.remove(m));
  edgeMeshes = new Map();
}

function* mergeGen(a, b) {
  if (!a) return b;
  if (!b) return a;
  if (a.v > b.v) {
    yield S(() => { status.textContent = 'merge(' + a.v + ', ' + b.v + ')：' + b.v + ' 更小 → 两堆互换，以 ' + b.v + ' 为根'; });
    yield W(500);
    const t = a; a = b; b = t;
  }
  setCol(a, ORANGE); setCol(b, CYAN);
  yield S(() => { status.textContent = 'merge(' + a.v + ', ' + b.v + ')：根取 ' + a.v + '（橙），把 ' + b.v + '（青）并入右子树'; });
  yield W(550);
  a.right = yield* mergeGen(a.right, b);
  setCol(a, BLUE); setCol(b, BLUE);
  const swapNow = nplOf(a.left) < nplOf(a.right);
  if (swapNow) {
    yield S(() => { status.textContent = 'npl 检查：左 ' + nplOf(a.left) + ' < 右 ' + nplOf(a.right) + ' → 交换左右，保证左偏'; });
    [a.left, a.right] = [a.right, a.left];
  } else {
    yield S(() => { status.textContent = 'npl 检查：左 ' + nplOf(a.left) + ' ≥ 右 ' + nplOf(a.right) + ' → 左偏已满足，不交换'; });
  }
  a.npl = nplOf(a.right) + 1;
  applyLayout();
  yield W(450);
  yield S(() => { status.textContent = a.v + '：npl = npl(右) + 1 = ' + a.npl + '（紫标）—— npl = 到最近空子树的距离'; });
  yield W(600);
  return a;
}

function* leftistGen() {
  yield S(() => { status.textContent = '左倾堆：用 npl（空路径长度）强制左偏 —— 右路径永远 ≤ log(n+1)，合并只走右路径。演示：插入 5, 3, 8, 1, 7（每次 = 与单点堆合并），再删除最小'; });
  yield W(700);
  for (let k = 0; k < POOL.length; k++) {
    const nn = POOL[k];
    show(nn);
    yield S(() => { status.textContent = '插入 ' + nn.v + '：新建单点堆，与主堆 merge（单点堆从右侧入场）'; });
    yield W(500);
    root = yield* mergeGen(root, nn);
    if (k === POOL.length - 1) {
      yield S(() => { status.textContent = '插入完成：堆 = ' + heapVals().join(' → ') + '（根最小）—— 每个节点紫色 npl 保持左偏'; });
      yield W(900);
    }
  }
  yield S(() => { status.textContent = '删除最小：根 ' + root.v + ' 弹出（红）—— 合并左右子树即完成'; });
  yield W(600);
  setCol(root, RED);
  yield W(450);
  const oldRoot = root;
  root = yield* mergeGen(oldRoot.left, oldRoot.right);
  hide(oldRoot);
  applyLayout();
  yield S(() => { status.textContent = '删除完成：堆 = ' + heapVals().join(' → ') + '（旧根 ' + oldRoot.v + ' 已弹出）✓'; });
  yield W(900);
  yield S(() => { status.textContent = '复杂度：合并 O(log n)（右路径长度 ≤ log(n+1)）；插入/删除 = 一次合并；取最小 O(1)。应用：可并堆（Dijkstra 优化、K 路归并、动态中位数）。npl(null) = 0，叶子 npl = 1'; });
  yield W(1100);
  yield S(() => { status.textContent = '左倾堆演示完成：插入 ×5 → 根 1；删除最小 → 根 3'; });
  yield W(400);
}

function* runLeftist() {
  resetAll();
  yield W(400);
  yield* leftistGen();
}

engine.queue(() => runLeftist());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
