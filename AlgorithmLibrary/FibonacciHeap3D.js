// AlgorithmLibrary/FibonacciHeap3D.js — 斐波那契堆：插入懒进根表 O(1)；删除最小按度数合并；减小键 = cut + 标记 + 级联剪切 —— 摊还 O(log n) 的「慵懒之王」（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('FibonacciHeap3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd;
const status = panel.addStatus('就绪');

// 演示序列固定（插入 5,3,8,1,7,4 → 删 1 → 减小键 8→1、5→0、7→2 → 删 0）：节点模块级预建，随演示显隐
const POOL = [5, 3, 8, 1, 7, 4].map((v, i) => {
  const n = { v, parent: null, children: [], marked: false, mesh: null, badge: null };
  n.mesh = new VNode(scene, { radius: 24, x: 330, y: 450, z: 0, label: String(v), color: BLUE, emissive: BLUE });
  n.badge = new VText(scene, { text: '', x: 330, y: 412, z: 0, color: PUR, scale: 0.45 });
  n.mesh.visible = i === 0;             // 默认演示体：首个插入节点 5，点播放才动画
  n.badge.sprite.visible = i === 0;
  return n;
});

let roots = [];
let edgeMeshes = new Map();

function show(n) { n.mesh.visible = true; n.badge.sprite.visible = true; }
function hide(n) { n.mesh.visible = false; n.badge.sprite.visible = false; }
function computeLayout() {
  const pos = new Map();
  function place(n, x, y) {
    pos.set(n, { x, y });
    const k = n.children.length;
    n.children.forEach((c, j) => place(c, x + (j - (k - 1) / 2) * 110, y - 90));
  }
  const k = roots.length;
  roots.forEach((r, i) => place(r, 320 + (i - (k - 1) / 2) * 120, 520));
  return pos;
}
function applyLayout() {
  const pos = computeLayout();
  POOL.forEach(n => {
    const p = pos.get(n);
    if (!p) return;
    n.mesh.moveTo(p.x, p.y, 0, 450);
    n.badge.moveTo(p.x, p.y - 38, 0, 450);
    n.badge.setText(n.marked ? '已标记' : '');
  });
  edgeMeshes.forEach(m => scene.remove(m));
  edgeMeshes = new Map();
  function walkEdges(n) {
    if (!n) return;
    n.children.forEach(c => {
      edgeMeshes.set(c, tubeBetween(scene, pos.get(n), pos.get(c), { color: PALETTE.edge, opacity: 0.4, radius: 2 }));
      walkEdges(c);
    });
  }
  roots.forEach(walkEdges);
}
function setCol(n, c) { n.mesh.setColor(c, c); }
function rootVals() { return roots.map(r => r.v).join(', '); }
function resetAll() {
  roots = [];
  POOL.forEach((n, i) => {
    n.parent = null; n.children = []; n.marked = false;
    n.mesh.visible = i === 0; n.badge.sprite.visible = i === 0;
    n.mesh.setColor(BLUE, BLUE);
  });
  edgeMeshes.forEach(m => scene.remove(m));
  edgeMeshes = new Map();
}

function* linkGen(a, b, d) {
  if (b.v < a.v) {
    yield S(() => { status.textContent = '同度合并：' + b.v + ' 更小 → 互换，' + b.v + ' 成为父'; });
    yield W(450);
    const t = a; a = b; b = t;
  }
  setCol(a, ORANGE); setCol(b, CYAN);
  yield S(() => { status.textContent = '按度数合并：' + a.v + '（橙）吸收同度 ' + b.v + '（青）→ 度 ' + (d + 1) + ''; });
  yield W(550);
  b.parent = a;
  a.children.push(b);
  applyLayout();
  yield S(() => { status.textContent = '合并后 ' + a.v + ' 的度 = ' + a.children.length + ' —— 若还有同度树则继续合并'; });
  yield W(500);
  return a;
}

function* insertVal(n) {
  show(n);
  roots.push(n);
  applyLayout();
  setCol(n, GREEN);
  yield S(() => { status.textContent = '插入 ' + n.v + '：懒操作 —— 直接放进根表，零合并（O(1) 摊还，比二项堆的进位快）'; });
  yield W(520);
  setCol(n, BLUE);
}

function* extractMin() {
  let min = roots[0];
  for (const r of roots) if (r.v < min.v) min = r;
  setCol(min, RED);
  yield S(() => { status.textContent = '删除最小：根 ' + min.v + '（红）—— 唯一不是 O(1) 的操作'; });
  yield W(550);
  roots = roots.filter(r => r !== min);
  for (const c of min.children) { c.parent = null; roots.push(c); }
  min.children = [];
  hide(min);
  applyLayout();
  yield S(() => { status.textContent = min.v + ' 弹出：孩子全部提升为根 —— 接下来按度数合并（同度两两 link）'; });
  yield W(600);
  const deg = new Map();
  for (const r of roots.slice()) {
    let cur = r, d = cur.children.length;
    while (deg.has(d)) {
      const other = deg.get(d);
      deg.delete(d);
      cur = yield* linkGen(cur, other, d);
      d = cur.children.length;
    }
    deg.set(d, cur);
  }
  roots = [...deg.values()];
  applyLayout();
  yield S(() => { status.textContent = '删除最小 ' + min.v + ' 完成：根表 = ' + rootVals() + '（度数互异，最多 ⌊log n⌋+1 棵）'; });
  yield W(800);
}

function* decreaseKey(n, nv) {
  setCol(n, GOLD);
  yield S(() => { status.textContent = '减小键：' + n.v + ' → ' + nv + '（金）—— 斐波那契堆的招牌操作，O(1) 摊还'; });
  yield W(600);
  n.mesh.setText(String(nv));
  n.v = nv;
  if (!n.parent || n.v >= n.parent.v) {
    yield S(() => { status.textContent = n.v + ' 已是根或仍 ≥ 父 ' + (n.parent ? n.parent.v : '—') + '：无需剪切，只更新键值'; });
    yield W(500);
    setCol(n, BLUE);
    return;
  }
  const p = n.parent;
  p.children = p.children.filter(c => c !== n);
  n.parent = null;
  roots.push(n);
  applyLayout();
  yield S(() => { status.textContent = '剪切：' + n.v + ' < 父 ' + p.v + ' → cut 出子树提升为根（金）—— 父失去一个孩子'; });
  yield W(550);
  let cur = p;
  while (cur.marked) {
    yield S(() => { status.textContent = '级联检查：父 ' + cur.v + ' 已标记（紫）→ 把它也剪切'; });
    yield W(500);
    if (!cur.parent) {
      yield S(() => { status.textContent = '但 ' + cur.v + ' 是根：级联到此停止（根不参与剪切）'; });
      cur.marked = false;
      cur.badge.setText('');
      yield W(550);
      break;
    }
    const gp = cur.parent;
    gp.children = gp.children.filter(c => c !== cur);
    cur.parent = null;
    roots.push(cur);
    cur.marked = false;
    cur.badge.setText('');
    applyLayout();
    yield S(() => { status.textContent = '级联剪切：' + cur.v + ' 提升为根（已标记的父被剪掉）→ 继续检查 ' + gp.v; });
    yield W(500);
    cur = gp;
  }
  if (!cur.marked && cur.parent) {
    cur.marked = true;
    cur.badge.setText('已标记');
    applyLayout();
    yield S(() => { status.textContent = '父 ' + cur.v + ' 失去孩子 → 打上标记（紫）：下次再被剪切就级联'; });
    yield W(550);
  }
  setCol(n, BLUE);
}

function* fibGen() {
  yield S(() => { status.textContent = '斐波那契堆：插入 O(1) 懒进根表；删最小才按度数合并；减小键 = 剪切 + 标记 + 级联 —— 摊还 O(log n)。演示：插入 5,3,8,1,7,4 → 删最小 1 → 减小键 8→1、5→0、7→2 → 再删最小'; });
  yield W(700);
  for (const n of POOL) yield* insertVal(n);
  yield S(() => { status.textContent = '插入完成：根表 = ' + rootVals() + '（6 棵零合并！）—— 对比二项堆这里要进位 3 次'; });
  yield W(900);
  yield* extractMin();
  yield S(() => { status.textContent = '现在演示减小键的「剪切 + 标记 + 级联」三件套 —— 先 8 → 1'; });
  yield W(500);
  yield* decreaseKey(POOL[2], 1);
  yield* decreaseKey(POOL[0], 0);
  yield* decreaseKey(POOL[4], 2);
  yield S(() => { status.textContent = '减小键 ×3 完成：根表 = ' + rootVals() + ' —— 键 7 被剪时父 3 已标记，级联检查终止于根'; });
  yield W(900);
  yield* extractMin();
  yield S(() => { status.textContent = '复杂度：插入/减小键/合并 O(1) 摊还；删最小 O(log n) 摊还 —— 靠「标记」限制树的度（斐波那契数列而得名）。应用：Dijkstra/Prim 的稠密图优化、作业调度 —— 减小键频率高时碾压二叉堆；常数大，实践常用配对堆替代'; });
  yield W(1100);
  yield S(() => { status.textContent = '斐波那契堆演示完成：插入×6 → 删 1 → 减小键×3（标记/级联）→ 删 0 → 最终根表 [3]'; });
  yield W(400);
}

function* runFib() {
  resetAll();
  yield W(400);
  yield* fibGen();
}

engine.queue(() => runFib());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
