// AlgorithmLibrary/PairingHeap3D.js — 配对堆：插入 = link 挂兄弟链头；删最小 = 根弹出后两遍合并（左→右两两 link，再右→左收拢）—— 无结构约束，摊还 O(log n)（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('PairingHeap3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：配对堆 插入×6 + 删除最小', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 700, y: 440, z: 0, color: GOLD, scale: 0.5, wrapChars: 8 });
const eqT = new VText(scene, { text: '', x: 700, y: 345, z: 0, color: PALETTE.textGlow, scale: 0.45, wrapChars: 8 });
const outT = new VText(scene, { text: '', x: 700, y: 345, z: 0, color: PALETTE.textGlow, scale: 0.45, wrapChars: 8 });

const ins = [5, 3, 8, 1, 7, 4];
let root = null;
const allNodes = new Set();
let edgeMeshes = new Map();

function newNode(v) {
  const n = { v, first: null, next: null, mesh: new VNode(scene, { radius: 22, x: 320, y: 250, z: 0, label: String(v), color: BLUE, emissive: BLUE }) };
  allNodes.add(n);
  return n;
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
function layoutRoot(r) {
  const pos = new Map();
  const total = widthOf(r);
  layoutTree(r, -total * GAP / 2 + 320, total * GAP / 2 + 320, 430, pos);
  return pos;
}
function applyLayout() {
  if (!root) return;
  const pos = layoutRoot(root);
  allNodes.forEach(n => {
    const p = pos.get(n);
    if (!p) return;
    n.mesh.moveTo(p.x, p.y, 0, 450);
  });
  edgeMeshes.forEach(m => scene.remove(m));
  edgeMeshes = new Map();
  (function walk(n, pp) {
    if (!n) return;
    if (pp) edgeMeshes.set(n, tubeBetween(scene, pp, pos.get(n), { color: PALETTE.edge, opacity: 0.4, radius: 2 }));
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

function* linkGen(a, b) {
  if (!a) return b;
  if (!b) return a;
  if (a.v > b.v) {
    yield S(() => stageT.setText('link(' + a.v + ',' + b.v + ')：' + b.v + ' 更小 → 互换为根'));
    yield W(500);
    const t = a; a = b; b = t;
  }
  setCol(a, ORANGE); setCol(b, CYAN);
  yield S(() => stageT.setText('link(' + a.v + ',' + b.v + ')：根 ' + a.v + ' 挂 ' + b.v + ' 上兄弟链头'));
  yield W(550);
  b.next = a.first;
  a.first = b;
  applyLayout();
  yield S(() => stageT.setText(a.v + ' 吸收 ' + b.v + '：孩子 = 一条兄弟链，无结构约束'));
  yield W(600);
  return a;
}

function* extractMin() {
  setCol(root, RED);
  yield S(() => stageT.setText('删除最小：根 ' + root.v + ' 弹出（红），孩子链成独立根'));
  yield W(550);
  const kids = [];
  for (let c = root.first; c; c = c.next) kids.push(c);
  eqT.setText('孩子链：' + kids.map(k => k.v).join(' → '));
  kids.forEach(k => { k.next = null; });
  root.first = null;
  root.mesh.remove();
  allNodes.delete(root);
  applyLayout();
  yield S(() => stageT.setText('第一遍合并：左→右两两 link（落单者留下）'));
  yield W(600);
  const stack = [];
  for (let i = 0; i < kids.length; i += 2) {
    if (i + 1 < kids.length) stack.push(yield* linkGen(kids[i], kids[i + 1]));
    else stack.push(kids[i]);
  }
  yield S(() => stageT.setText('第二遍合并：右→左依次 link 收拢成一棵'));
  yield W(600);
  let r = stack.pop();
  while (stack.length) r = yield* linkGen(stack.pop(), r);
  root = r;
  eqT.setText('');
  applyLayout();
  yield S(() => { eqT.setText(''); outT.setText('删除完成：堆 = ' + vals().join(' → ') + ' ✓（旧根弹出）'); status.textContent = '配对堆最终：[4,3,5,7]（两遍合并摊还 O(log n)）'; });
  yield W(900);
}

function* pairingGen() {
  yield S(() => { hint.setText('配对堆：插入 = link，删除 = 两遍合并；无平衡约束，摊还 O(log n)'); stageT.setText('插入 5,3,8,1,7,4（每次与根 link），再删除最小'); });
  yield W(700);
  for (let k = 0; k < ins.length; k++) {
    const v = ins[k];
    const nn = newNode(v);
    yield S(() => stageT.setText('插入 ' + v + '：新建单节点堆，与根 link（单点堆从右侧入场）'));
    yield W(500);
    root = yield* linkGen(root, nn);
    if (k === ins.length - 1) {
      yield S(() => { eqT.setText(''); outT.setText('插入完成：堆 = ' + vals().join(' → ') + '（根最小）'); status.textContent = '配对堆：[1,4,7,3,5]（6 次插入 link）'; });
      yield W(900);
    }
  }
  yield* extractMin();
  yield S(() => { hint.setText('复杂度：link 摊还 O(log n)；实践常数小于斐波那契堆'); outT.setText('应用：Dijkstra/Prim 优先队列、可并堆竞赛题'); });
  yield W(1100);
  yield S(() => { hint.setText('配对堆完成：插入 ×6 → 删除最小 → 根 4'); outT.setText(''); });
  yield W(400);
}

function* runPairing() {
  hint.setText('配对堆：插入 = link，删除 = 两遍合并');
  yield W(400);
  yield* pairingGen();
}

engine.queue(() => runPairing());
panel.addButton('清空', () => { engine.clear(); allNodes.forEach(n => n.mesh.remove()); allNodes.clear(); root = null; edgeMeshes.forEach(m => scene.remove(m)); edgeMeshes = new Map(); stageT.setText(''); eqT.setText(''); outT.setText(''); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；橙 = 吸收方根，青 = 被挂入兄弟链，红 = 待删除根；兄弟 = 同层横向排列）');

scene.start(engine);
