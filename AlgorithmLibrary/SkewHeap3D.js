// AlgorithmLibrary/SkewHeap3D.js — 斜堆：合并 = 取小根 + 递归并右子树 + 回溯必交换左右 —— 无平衡因子，摊还 O(log n)（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('SkewHeap3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, ORANGE = 0xfb923c, CYAN = 0x22d3ee, RED = 0xfb7185;
const status = panel.addStatus('就绪');

const VALS = [5, 3, 8, 1, 7];
const nodeOf = new Map();
const NODES = VALS.map(v => {
  const n = { v, left: null, right: null, mesh: new VNode(scene, { radius: 22, x: 560, y: 480, z: 0, label: String(v), color: BLUE, emissive: BLUE }) };
  nodeOf.set(v, n);
  return n;
});
let root = null;

const UP = new THREE.Vector3(0, 1, 0);
const EV = new THREE.Vector3();
function makeStick() {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 1, 6, 1), new THREE.MeshBasicMaterial({ color: PALETTE.edge, transparent: true, opacity: 0.4 }));
  m.visible = false;
  scene.add(m);
  return m;
}
const sticks = Array.from({ length: 5 }, makeStick);
let edgeSeq = 0;
function linkEdge(a, b) {
  const s = sticks[edgeSeq++];
  EV.set(b.x - a.x, b.y - a.y, b.z - a.z);
  const len = EV.length();
  s.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  s.scale.y = len;
  s.quaternion.setFromUnitVectors(UP, EV.normalize());
  s.visible = true;
}

function countNodes(n) { return n ? 1 + countNodes(n.left) + countNodes(n.right) : 0; }
function layoutTree(r) {
  const pos = new Map();
  const cnt = countNodes(r);
  let x = 0;
  (function walk(n, d) {
    if (!n) return;
    walk(n.left, d + 1);
    pos.set(n, { x: 320 + (x - (cnt - 1) / 2) * 72, y: 760 - d * 68 });
    x++;
    walk(n.right, d + 1);
  })(r, 0);
  return pos;
}
function applyLayout() {
  const pos = layoutTree(root);
  NODES.forEach(n => { const p = pos.get(n); if (p) n.mesh.moveTo(p.x, p.y, 0, 450); });
  sticks.forEach(s => { s.visible = false; });
  edgeSeq = 0;
  (function walk(n) {
    if (!n) return;
    if (n.left) linkEdge(pos.get(n), pos.get(n.left));
    if (n.right) linkEdge(pos.get(n), pos.get(n.right));
    walk(n.left); walk(n.right);
  })(root);
}
function setCol(n, c) { n.mesh.setColor(c, c); }
function heapVals() { const a = []; (function walk(n) { if (!n) return; walk(n.left); a.push(n.v); walk(n.right); })(root); return a; }
function clearView() {
  NODES.forEach(n => { n.left = null; n.right = null; n.mesh.visible = true; n.mesh.moveTo(560, 480, 0, 1); setCol(n, BLUE); });
  sticks.forEach(s => { s.visible = false; });
  root = null;
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
  yield S(() => { status.textContent = 'merge(' + a.v + ', ' + b.v + ')：根取 ' + a.v + '（橙），把 ' + b.v + '（青）并入其右子树'; });
  yield W(600);
  a.right = yield* mergeGen(a.right, b);
  setCol(a, BLUE); setCol(b, BLUE);
  [a.left, a.right] = [a.right, a.left];
  applyLayout();
  yield S(() => { status.textContent = a.v + ' 回溯后无条件交换左右子 —— 斜堆名字的由来，防退化靠它'; });
  yield W(600);
  return a;
}

function* skewGen() {
  yield S(() => { status.textContent = '斜堆：没有平衡因子。合并 = 取小根 + 右子树递归合并 + 回溯必交换左右 —— 摊还 O(log n)'; });
  yield W(700);
  for (let k = 0; k < VALS.length; k++) {
    const v = VALS[k];
    const nn = nodeOf.get(v);
    yield S(() => { status.textContent = '插入 ' + v + '：新建单点堆，与主堆 merge（单点堆从右侧入场）'; });
    yield W(550);
    root = yield* mergeGen(root, nn);
    if (k === VALS.length - 1) {
      yield S(() => { status.textContent = '插入完成：堆 = ' + heapVals().join(' → ') + '（根最小）—— 每次合并后必交换左右，右路径总保持短'; });
      yield W(900);
    }
  }
  yield S(() => { status.textContent = '删除最小：根 ' + root.v + ' 弹出（红）—— 直接合并它的左右子树'; });
  yield W(650);
  setCol(root, RED);
  yield W(500);
  const oldRoot = root;
  root = yield* mergeGen(oldRoot.left, oldRoot.right);
  oldRoot.mesh.visible = false;
  applyLayout();
  yield S(() => { status.textContent = '删除完成：堆 = ' + heapVals().join(' → ') + '（旧根 ' + oldRoot.v + ' 已弹出）—— extract-min 摊还 O(log n)'; });
  yield W(900);
  yield S(() => { status.textContent = '复杂度：合并/插入/删除都沿右路径递归，交换保证右路径摊还短。对比左倾堆：左倾堆用 npl 强制右路径短，斜堆靠「每次交换」的势能论证 —— 更简单但一样快'; });
  yield W(1100);
  yield S(() => { status.textContent = '斜堆演示完成：插入 5,3,8,1,7 → 根 1；删除最小 → 根 3'; });
  yield W(400);
}

function* runSkew() {
  clearView();
  yield W(400);
  yield* skewGen();
}

engine.queue(() => runSkew());
panel.addButton('清空', () => { engine.clear(); clearView(); status.textContent = ''; });

scene.start(engine);
