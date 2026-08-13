// AlgorithmLibrary/SkewHeap3D.js — 斜堆：合并 = 取小根 + 递归并右子树 + 回溯必交换左右 —— 无平衡因子，摊还 O(log n)（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('SkewHeap3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155, ROSE = 0xfb7185, VIOLET = 0xa78bfa, AMBER = 0xfbbf24;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：斜堆 插入×5 + 删除最小', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 558, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: 180, z: 0, color: PALETTE.textGlow, scale: 0.56 });
const outT = new VText(scene, { text: '', x: 0, y: 95, z: 0, color: PALETTE.textGlow, scale: 0.62 });

const ins = [5, 3, 8, 1, 7];
let root = null;
const allNodes = new Set();
let edgeMeshes = new Map();

function newNode(v) {
  const n = { v, left: null, right: null, mesh: new VNode(scene, { radius: 22, x: 330, y: 450, z: 0, label: String(v), color: BLUE, emissive: BLUE }) };
  allNodes.add(n);
  return n;
}
function countNodes(n) { return n ? 1 + countNodes(n.left) + countNodes(n.right) : 0; }
function layoutTree(r) {
  const pos = new Map();
  const cnt = countNodes(r);
  let x = 0;
  (function walk(n, d) {
    if (!n) return;
    walk(n.left, d + 1);
    pos.set(n, { x: (x - (cnt - 1) / 2) * 72, y: 465 - d * 68 });
    x++;
    walk(n.right, d + 1);
  })(r, 0);
  return pos;
}
function applyLayout() {
  const pos = layoutTree(root);
  allNodes.forEach(n => { const p = pos.get(n); if (p) n.mesh.moveTo(p.x, p.y, 0, 450); });
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

function* mergeGen(a, b) {
  if (!a) return b;
  if (!b) return a;
  if (a.v > b.v) {
    yield S(() => stageT.setText('merge(' + a.v + ', ' + b.v + ')：' + b.v + ' 更小 → 两堆互换，以 ' + b.v + ' 为根'));
    yield W(550);
    const t = a; a = b; b = t;
  }
  setCol(a, ORANGE); setCol(b, CYAN);
  yield S(() => stageT.setText('merge(' + a.v + ', ' + b.v + ')：根取 ' + a.v + '（橙），把 ' + b.v + '（青）并入右子树'));
  yield W(600);
  a.right = yield* mergeGen(a.right, b);
  setCol(a, BLUE); setCol(b, BLUE);
  [a.left, a.right] = [a.right, a.left];
  applyLayout();
  yield S(() => stageT.setText(a.v + ' 回溯后无条件交换左右子 —— 斜堆名字的由来，防退化靠它'));
  yield W(600);
  return a;
}

function* skewGen() {
  yield S(() => { hint.setText('斜堆：没有平衡因子。合并 = 取小根 + 右子树递归合并 + 回溯必交换左右 —— 摊还 O(log n)'); stageT.setText('演示：插入 5, 3, 8, 1, 7（每次 = 与单点堆合并），再删除最小'); });
  yield W(700);
  for (let k = 0; k < ins.length; k++) {
    const v = ins[k];
    const nn = newNode(v);
    yield S(() => stageT.setText('插入 ' + v + '：新建单点堆，与主堆 merge（单点堆从右侧入场）'));
    yield W(550);
    root = yield* mergeGen(root, nn);
    if (k === ins.length - 1) {
      yield S(() => { outT.setText('插入完成：堆 = ' + heapVals().join(' → ') + '（根最小）—— 每次合并后必交换左右，右路径总保持短'); status.textContent = '斜堆：[1,3,7,5,8]（5 次插入合并）'; });
      yield W(900);
    }
  }
  yield S(() => stageT.setText('删除最小：根 ' + root.v + ' 弹出（红）—— 直接合并它的左右子树'));
  yield W(650);
  setCol(root, RED);
  yield W(500);
  const oldRoot = root;
  root = yield* mergeGen(oldRoot.left, oldRoot.right);
  oldRoot.mesh.remove();
  allNodes.delete(oldRoot);
  applyLayout();
  yield S(() => { outT.setText('删除完成：堆 = ' + heapVals().join(' → ') + '（旧根 1 已弹出）✓'); status.textContent = '斜堆最终：[3,5,7,8]（extract-min 后摊还 O(log n)）'; });
  yield W(900);
  yield S(() => { hint.setText('复杂度：合并/插入/删除都沿右路径递归 —— 交换保证右路径摊还短，总复杂度 O(log n) 摊还'); outT.setText('对比：左倾堆用 npl 强制右路径短；斜堆靠「每次交换」的势能论证 —— 更简单但一样快'); });
  yield W(1100);
  yield S(() => { hint.setText('斜堆演示完成：插入 ×5 → 根 1；删除最小 → 根 3'); outT.setText(''); });
  yield W(400);
}

function* runSkew() {
  hint.setText('斜堆：合并 + 回溯交换左右');
  yield W(400);
  yield* skewGen();
}

engine.queue(() => runSkew());
panel.addButton('清空', () => { engine.clear(); allNodes.forEach(n => n.mesh.remove()); allNodes.clear(); root = null; edgeMeshes.forEach(m => scene.remove(m)); edgeMeshes = new Map(); stageT.setText(''); eqT.setText(''); outT.setText(''); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；橙 = 合并主堆根，青 = 被并入堆，红 = 待删除根；每次合并后左右子交换）');

scene.start(engine);
