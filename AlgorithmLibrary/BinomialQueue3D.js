// AlgorithmLibrary/BinomialQueue3D.js — 二项队列：森林第 r 棵 = 二项树 B_r（2^r 节点）—— 合并 B_r+B_r 恰似二进制进位，插入 1~5 演示进位链 B0→B1→B2（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('BinomialQueue3D');

const scene = new Scene3D('scene', { cameraPos: [0, 210, 620], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：二项队列插入 1~5 + 删最小×3', x: 0, y: 290, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 238, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: -160, z: 0, color: PALETTE.textGlow, scale: 0.56 });
const outT = new VText(scene, { text: '', x: 0, y: -215, z: 0, color: PALETTE.textGlow, scale: 0.62 });

let forest = [];
const allNodes = new Set();
let edgeMeshes = new Map();
const slots = [0, 1, 2, 3].map(r => new VBox(scene, { w: 64, h: 26, d: 26, x: -200 + r * 105, y: 245, z: 0, label: 'B' + r, color: DIM, emissive: DIM }));
new VText(scene, { text: '秩槽位：B_r 有 2^r 个节点（二进制表示）', x: 0, y: 200, z: 0, color: PALETTE.textDim, scale: 0.55 });

function newNode(v) {
  const n = { v, children: [], mesh: new VNode(scene, { radius: 22, x: 330, y: 150, z: 0, label: String(v), color: BLUE, emissive: BLUE }) };
  allNodes.add(n);
  return n;
}
const rankOf = n => n.children.length;
const subtreeSpan = n => (1 + n.children.reduce((s, c) => s + subtreeSpan(c), 0)) * 46;
function computeLayout() {
  const pos = new Map();
  const roots = forest.filter(Boolean);
  const widths = roots.map(subtreeSpan);
  const total = widths.reduce((a, b) => a + b, 0) + Math.max(0, roots.length - 1) * 110;
  let acc = -total / 2;
  function place(n, x, y) {
    pos.set(n, { x, y });
    const w = subtreeSpan(n);
    let cacc = x - w / 2;
    n.children.forEach(c => {
      const cw = subtreeSpan(c);
      place(c, cacc + cw / 2, y - 95);
      cacc += cw;
    });
  }
  roots.forEach(r => { place(r, acc + subtreeSpan(r) / 2, 205); acc += subtreeSpan(r) + 110; });
  return pos;
}
function applyLayout() {
  const pos = computeLayout();
  allNodes.forEach(n => { const p = pos.get(n); if (p) n.mesh.moveTo(p.x, p.y, 0, 450); });
  edgeMeshes.forEach(m => scene.remove(m));
  edgeMeshes = new Map();
  function walk(n) {
    if (!n) return;
    n.children.forEach(c => {
      edgeMeshes.set(c, tubeBetween(scene, pos.get(n), pos.get(c), { color: PALETTE.edge, opacity: 0.4, radius: 2 }));
      walk(c);
    });
  }
  forest.forEach(r => { if (r) walk(r); });
}
function setCol(n, c) { n.mesh.setColor(c, c); }
function updateSlots() {
  slots.forEach((b, r) => {
    b.setText(forest[r] ? 'B' + r + ':' + forest[r].v : 'B' + r);
    b.setColor(forest[r] ? GOLD : DIM, forest[r] ? GOLD : DIM);
  });
}
function forestBits() {
  const parts = [];
  for (let r = 0; r < forest.length; r++) if (forest[r]) parts.push('B' + r + '{' + forest[r].v + '}');
  return parts.join(', ') || '空';
}

function* linkGen(a, b, r) {
  if (b.v < a.v) {
    yield S(() => stageT.setText('B' + r + ' 进位合并：' + b.v + ' 更小 → 互换，' + b.v + ' 成为新根'));
    yield W(450);
    const t = a; a = b; b = t;
  }
  setCol(a, ORANGE); setCol(b, CYAN);
  yield S(() => stageT.setText('link B' + r + '：' + a.v + '（橙）吸收 ' + b.v + '（青）→ 得到 B' + (r + 1) + '（二进制进位！）'));
  yield W(550);
  a.children.unshift(b);
  applyLayout(); updateSlots();
  yield S(() => stageT.setText('B' + (r + 1) + '：' + a.v + ' 的子树 = [' + a.children.map(c => c.v).join(', ') + '] —— 1 棵 B' + r + ' 树 = 2^' + r + ' 个节点'));
  yield W(550);
  return a;
}

function* insertVal(v) {
  const nn = newNode(v);
  let cur = nn, r = 0;
  yield S(() => stageT.setText('插入 ' + v + '：B0 单点树从右侧入场 —— 相当于二进制「+1」，从低位开始进位'));
  yield W(500);
  while (forest[r]) {
    cur = yield* linkGen(cur, forest[r], r);
    forest[r] = null;
    r++;
  }
  forest[r] = cur;
  applyLayout(); updateSlots();
  yield S(() => stageT.setText('进位结束：森林 = ' + forestBits() + '（槽位金色 = 该位有树）'));
  yield W(600);
}

function* extractMin() {
  const roots = forest.filter(Boolean);
  let min = roots[0];
  for (const r of roots) if (r.v < min.v) min = r;
  const mr = forest.indexOf(min);
  forest[mr] = null;
  setCol(min, RED);
  eqT.setText(min.v + ' 的子树：' + min.children.map(c => 'B' + rankOf(c) + '{' + c.v + '}').join('、'));
  yield S(() => stageT.setText('删除最小：根 ' + min.v + '（红，来自 B' + mr + '）—— 子树按各自秩放回槽位再进位'));
  yield W(600);
  min.mesh.remove();
  allNodes.delete(min);
  applyLayout(); updateSlots();
  for (const c of min.children) {
    let cur = c, r = rankOf(c);
    yield S(() => stageT.setText('把 B' + r + '{' + c.v + '} 放回秩 ' + r + ' 槽位（空则直接放，被占则进位）'));
    yield W(450);
    while (forest[r]) {
      cur = yield* linkGen(cur, forest[r], r);
      forest[r] = null;
      r++;
    }
    forest[r] = cur;
    applyLayout(); updateSlots();
  }
  eqT.setText('');
  yield S(() => { outT.setText('删除最小 ' + min.v + ' 完成：森林 = ' + forestBits()); status.textContent = '二项队列：森林 = ' + forestBits(); });
  yield W(800);
}

function* binomGen() {
  yield S(() => { hint.setText('二项队列：第 r 棵 = 二项树 B_r（2^r 个节点），合并 B_r+B_r 恰似二进制进位'); stageT.setText('演示：插入 1~5（看 B0+B0→B1、B1+B1→B2 的进位链），再删除最小 ×3'); });
  yield W(700);
  for (const v of [1, 2, 3, 4, 5]) {
    yield* insertVal(v);
    if (v === 5) {
      yield S(() => { outT.setText('插入完成：森林 = ' + forestBits() + ' —— 5 = 101₂，恰好 = B0 + B2！'); status.textContent = '二项队列：[B0{5}, B2{1}]（5 次插入，3 次进位）'; });
      yield W(900);
    }
  }
  for (let e = 0; e < 3; e++) yield* extractMin();
  yield S(() => { hint.setText('复杂度：插入/合并/删除最小都 O(log n)（森林树数 = 二进制位数）；取最小 O(log n) —— 与二进制加法同构'); outT.setText('应用：可并堆、需要高效 meld 的调度 —— 每次操作都是一次「二进制加法」；n 棵树的森林永不超 ⌊log n⌋+1 棵'); });
  yield W(1100);
  yield S(() => { hint.setText('二项队列演示完成：插入 1~5（进位链 B0→B1→B2），删除最小 ×3 → 剩 B1{4}'); outT.setText(''); });
  yield W(400);
}

function* runBinom() {
  hint.setText('二项队列：B_r+B_r = 二进制进位');
  yield W(400);
  yield* binomGen();
}

engine.queue(() => runBinom());
panel.addButton('清空', () => { engine.clear(); allNodes.forEach(n => n.mesh.remove()); allNodes.clear(); forest = []; edgeMeshes.forEach(m => scene.remove(m)); edgeMeshes = new Map(); updateSlots(); stageT.setText(''); eqT.setText(''); outT.setText(''); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；橙 = 进位合并的胜者根，青 = 被吸收的树，红 = 待删除最小根，金 = 槽位被占；上排 = 秩 0~3 槽位）');

scene.start(engine);
