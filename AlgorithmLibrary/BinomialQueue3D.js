// AlgorithmLibrary/BinomialQueue3D.js — 二项队列：森林第 r 棵 = 二项树 B_r（2^r 节点）—— 合并 B_r+B_r 恰似二进制进位，插入 1~5 演示进位链 B0→B1→B2（function* 生成器驱动，解说入状态栏）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('BinomialQueue3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, DIM = 0x334155;
const status = panel.addStatus('就绪');
const ease = p => p * p * (3 - 2 * p);
const ROOT_Y = 480, STEP_Y = 90;
const UP = new THREE.Vector3(0, 1, 0), tmpV = new THREE.Vector3(), pV = new THREE.Vector3(), qV = new THREE.Vector3();

// ---- 节点对象池（峰值 5，池 6）：运行期仅改文字/显隐/变色/位置，绝不 new ----
const nodePool = [], nodeFree = [];
for (let i = 0; i < 6; i++) {
  const vn = new VNode(scene, { radius: 22, x: -600, y: 0, z: 0, label: '0', color: BLUE, emissive: BLUE });
  vn.mesh.visible = false;
  nodePool.push(vn);
}
nodeFree.push(...nodePool);

// ---- 连线池（峰值 4，池 6）：圆柱体复用，运行期改中点/朝向/长度 ----
const edgePool = [];
for (let i = 0; i < 6; i++) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 1, 6), new THREE.MeshBasicMaterial({ color: PALETTE.edge, transparent: true, opacity: 0.45 }));
  m.visible = false;
  scene.add(m);
  edgePool.push(m);
}

const slots = [0, 1, 2, 3].map(r => new VBox(scene, { w: 64, h: 26, d: 26, x: 160 + r * 105, y: 560, z: 0, label: 'B' + r, color: DIM, emissive: DIM }));
const live = [];
let forest = [];
let edgeUsed = 0;

const rankOf = n => n.children.length;
const subtreeSpan = n => 46 + n.children.reduce((s, c) => s + subtreeSpan(c), 0);
const setCol = (n, c) => n.vn.setColor(c, c);

function allocNode(v) {
  const vn = nodeFree.pop();
  vn.setText(String(v));
  vn.setColor(BLUE, BLUE);
  vn.mesh.scale.setScalar(1);
  vn.mesh.visible = true;
  return vn;
}
function freeNode(n) { n.vn.mesh.visible = false; nodeFree.push(n.vn); }
function placeEdge(a, b, m) {
  tmpV.copy(b).sub(a);
  const len = tmpV.length();
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.scale.set(1, Math.max(len, 1e-3), 1);
  if (len > 1e-3) m.quaternion.setFromUnitVectors(UP, tmpV.normalize());
  m.visible = true;
}
function applyLayout() {
  const pos = new Map();
  const roots = forest.filter(Boolean);
  const widths = roots.map(subtreeSpan);
  const total = widths.reduce((a, b) => a + b, 0) + Math.max(0, roots.length - 1) * 110;
  let acc = -total / 2;
  function place(n, x, y) {
    pos.set(n, { x, y });
    const w = subtreeSpan(n);
    let cacc = x - w / 2;
    n.children.forEach(c => { const cw = subtreeSpan(c); place(c, cacc + cw / 2, y - STEP_Y); cacc += cw; });
  }
  roots.forEach(r => { place(r, acc + subtreeSpan(r) / 2 + 320, ROOT_Y); acc += subtreeSpan(r) + 110; });
  let k = 0;
  const walk = n => {
    if (!n) return;
    n.children.forEach(c => {
      const a = pos.get(n), b = pos.get(c);
      pV.set(a.x, a.y, 0); qV.set(b.x, b.y, 0);
      placeEdge(pV, qV, edgePool[k++]);
      walk(c);
    });
  };
  roots.forEach(r => walk(r));
  for (let i = k; i < edgeUsed; i++) edgePool[i].visible = false;
  edgeUsed = k;
  live.forEach(n => { const p = pos.get(n); if (p) n.vn.moveTo(p.x, p.y, 0, 420); });
}
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
    yield S(() => { status.textContent = 'B' + r + ' 进位合并：' + b.v + ' < ' + a.v + ' → 互换根，' + b.v + ' 成为新根'; });
    yield W(400);
    const t = a; a = b; b = t;
  }
  setCol(a, ORANGE); setCol(b, CYAN);
  yield S(() => { status.textContent = 'link B' + r + '：' + a.v + '（橙）吸收 ' + b.v + '（青）→ 得到 B' + (r + 1) + '（二进制进位！）'; });
  yield W(500);
  a.children.unshift(b);
  applyLayout(); updateSlots();
  setCol(a, BLUE); setCol(b, BLUE);
  yield S(() => { status.textContent = 'B' + (r + 1) + '{' + a.v + '}：子树 = [' + a.children.map(c => c.v).join(', ') + '] —— B' + r + ' 恰有 2^' + r + ' 个节点'; });
  yield W(500);
  return a;
}

function* insertVal(v) {
  const nn = { v, children: [], vn: allocNode(v) };
  live.push(nn);
  nn.vn.mesh.position.set(320, 150, 0);
  nn.vn.mesh.scale.setScalar(0.4);
  yield S(() => { status.textContent = '插入 ' + v + '：B0 单点树从下方入场 —— 相当于二进制「+1」，从最低位 r=0 开始进位'; });
  yield W(400);
  yield A(400, p => { const e = ease(p); nn.vn.mesh.position.y = 150 + (ROOT_Y - 150) * e; nn.vn.mesh.scale.setScalar(0.4 + 0.6 * e); });
  nn.vn.mesh.scale.setScalar(1);
  let cur = nn, r = 0;
  while (forest[r]) {
    cur = yield* linkGen(cur, forest[r], r);
    forest[r] = null;
    r++;
  }
  forest[r] = cur;
  applyLayout(); updateSlots();
  yield S(() => { status.textContent = '进位结束：森林 = ' + forestBits() + '（金色槽位 = 该位有树）'; });
  yield W(550);
}

function* extractMin() {
  const roots = forest.filter(Boolean);
  let min = roots[0];
  for (const r of roots) if (r.v < min.v) min = r;
  const mr = forest.indexOf(min);
  forest[mr] = null;
  setCol(min, RED);
  yield S(() => { status.textContent = '删除最小：根 ' + min.v + '（红，来自 B' + mr + '）—— 子树按各自秩放回槽位再进位'; });
  yield W(550);
  freeNode(min);
  live.splice(live.indexOf(min), 1);
  applyLayout(); updateSlots();
  for (const c of min.children) {
    let cur = c, r = rankOf(c);
    yield S(() => { status.textContent = '把 B' + r + '{' + c.v + '} 放回秩 ' + r + ' 槽位（空则直接放，被占则进位）'; });
    yield W(420);
    while (forest[r]) {
      cur = yield* linkGen(cur, forest[r], r);
      forest[r] = null;
      r++;
    }
    forest[r] = cur;
    applyLayout(); updateSlots();
  }
  yield S(() => { status.textContent = '删除最小 ' + min.v + ' 完成：森林 = ' + forestBits(); });
  yield W(600);
}

function* runBinom() {
  yield S(() => { status.textContent = '二项队列：第 r 棵 = 二项树 B_r（2^r 个节点），B_r+B_r 合并恰似二进制进位。演示：插入 1~5，再删除最小 ×3'; });
  yield W(800);
  for (const v of [1, 2, 3, 4, 5]) {
    yield* insertVal(v);
    if (v === 5) {
      yield S(() => { status.textContent = '插入完成：5 次插入、3 次进位 → 森林 = ' + forestBits() + '（5 = 101₂ = B0+B2）'; });
      yield W(800);
    }
  }
  for (let e = 0; e < 3; e++) yield* extractMin();
  yield S(() => { status.textContent = 'BinomialQueue 演示完成：插入 1~5（3 次进位，5=101₂ 即 B0+B2）后删除最小 ×3（删 1、2、3），最终森林 = ' + forestBits() + '（2=10₂ 即 B1）；插入/合并/删除最小均 O(log n)'; });
  yield W(900);
}

engine.queue(() => runBinom());
panel.addButton('清空', () => {
  engine.clear();
  live.forEach(n => freeNode(n));
  live.length = 0;
  forest = [];
  for (const m of edgePool) m.visible = false;
  edgeUsed = 0;
  updateSlots();
  status.textContent = '';
});

scene.start(engine);
