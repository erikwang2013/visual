// AlgorithmLibrary/PairingHeap3D.js — 配对堆：插入 = link 挂兄弟链头；删最小 = 根弹出后两遍合并（左→右两两 link，再右→左收拢）—— 无结构约束，摊还 O(log n)（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('PairingHeap3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, ORANGE = 0xfb923c, CYAN = 0x22d3ee, RED = 0xfb7185;
const status = panel.addStatus('就绪');

const VALS = [5, 3, 8, 1, 7, 4];
const nodeOf = new Map();
const NODES = VALS.map(v => {
  const n = { v, first: null, next: null, mesh: new VNode(scene, { radius: 22, x: 560, y: 480, z: 0, label: String(v), color: BLUE, emissive: BLUE }) };
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
const sticks = Array.from({ length: 6 }, makeStick);
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

function widthOf(n) {
  if (!n.first) return 1;
  let w = 0;
  for (let c = n.first; c; c = c.next) w += widthOf(c);
  return w;
}
const GAP = 62, YSTEP = 68;
function layoutTree(n, cx0, cx1, y, pos) {
  pos.set(n, { x: (cx0 + cx1) / 2, y });
  if (!n.first) return;
  let cx = cx0;
  for (let c = n.first; c; c = c.next) {
    const w = widthOf(c);
    layoutTree(c, cx, cx + w * GAP, y - YSTEP, pos);
    cx += w * GAP;
  }
}
function applyLayout() {
  if (!root) return;
  const pos = new Map();
  const total = widthOf(root);
  layoutTree(root, 320 - total * GAP / 2, 320 + total * GAP / 2, 760, pos);
  NODES.forEach(n => { const p = pos.get(n); if (p) n.mesh.moveTo(p.x, p.y, 0, 450); });
  sticks.forEach(s => { s.visible = false; });
  edgeSeq = 0;
  (function walk(n, pp) {
    if (!n) return;
    if (pp) linkEdge(pp, pos.get(n));
    walk(n.first, pos.get(n));
    walk(n.next, pp);
  })(root, null);
}
function setCol(n, c) { n.mesh.setColor(c, c); }
function vals() {
  const a = [];
  (function walk(n) { if (!n) return; a.push(n.v); walk(n.first); walk(n.next); })(root);
  return a;
}
function clearView() {
  NODES.forEach(n => { n.first = null; n.next = null; n.mesh.visible = true; n.mesh.moveTo(560, 480, 0, 1); setCol(n, BLUE); });
  sticks.forEach(s => { s.visible = false; });
  root = null;
}

function* linkGen(a, b) {
  if (!a) return b;
  if (!b) return a;
  if (a.v > b.v) {
    yield S(() => { status.textContent = 'link(' + a.v + ',' + b.v + ')：' + b.v + ' 更小 → 互换，以 ' + b.v + ' 为根'; });
    yield W(500);
    const t = a; a = b; b = t;
  }
  setCol(a, ORANGE); setCol(b, CYAN);
  yield S(() => { status.textContent = 'link(' + a.v + ',' + b.v + ')：根 ' + a.v + ' 挂 ' + b.v + ' 上兄弟链头'; });
  yield W(550);
  b.next = a.first;
  a.first = b;
  applyLayout();
  yield S(() => { status.textContent = a.v + ' 吸收 ' + b.v + '：孩子 = 一条兄弟链，无结构约束'; });
  yield W(600);
  return a;
}

function* extractMin() {
  setCol(root, RED);
  yield S(() => { status.textContent = '删除最小：根 ' + root.v + ' 弹出（红），孩子链成独立根'; });
  yield W(550);
  const rv = root.v;
  const kids = [];
  for (let c = root.first; c; c = c.next) kids.push(c);
  kids.forEach(k => { k.next = null; });
  root.first = null;
  root.mesh.visible = false;
  applyLayout();
  yield S(() => { status.textContent = '第一遍合并：左→右两两 link（落单者留下）'; });
  yield W(600);
  const stack = [];
  for (let i = 0; i < kids.length; i += 2) {
    if (i + 1 < kids.length) stack.push(yield* linkGen(kids[i], kids[i + 1]));
    else stack.push(kids[i]);
  }
  yield S(() => { status.textContent = '第二遍合并：右→左依次 link 收拢成一棵'; });
  yield W(600);
  let r = stack.pop();
  while (stack.length) r = yield* linkGen(stack.pop(), r);
  root = r;
  applyLayout();
  yield S(() => { status.textContent = '删除完成：堆 = ' + vals().join(' → ') + '（旧根 ' + rv + ' 已弹出）—— 两遍合并摊还 O(log n)'; });
  yield W(900);
}

function* pairingGen() {
  yield S(() => { status.textContent = '配对堆：插入 = link，删除 = 两遍合并；无平衡约束，摊还 O(log n)'; });
  yield W(700);
  for (let k = 0; k < VALS.length; k++) {
    const v = VALS[k];
    const nn = nodeOf.get(v);
    yield S(() => { status.textContent = '插入 ' + v + '：新建单节点堆，与根 link（单点堆从右侧入场）'; });
    yield W(500);
    root = yield* linkGen(root, nn);
    if (k === VALS.length - 1) {
      yield S(() => { status.textContent = '插入完成：堆 = ' + vals().join(' → ') + '（根最小）—— 插入即 link，无结构约束'; });
      yield W(900);
    }
  }
  yield* extractMin();
  yield S(() => { status.textContent = '复杂度：link 摊还 O(log n)，实践常数小于斐波那契堆；应用：Dijkstra/Prim 优先队列、可并堆'; });
  yield W(1100);
  yield S(() => { status.textContent = '配对堆演示完成：插入 5,3,8,1,7,4 → 根 1；删除最小 → 根 4'; });
  yield W(400);
}

function* runPairing() {
  clearView();
  yield W(400);
  yield* pairingGen();
}

engine.queue(() => runPairing());
panel.addButton('清空', () => { engine.clear(); clearView(); status.textContent = ''; });

scene.start(engine);
