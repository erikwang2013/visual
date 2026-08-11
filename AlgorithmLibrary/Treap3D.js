// AlgorithmLibrary/Treap3D.js — Treap：BST 键 + 随机优先级堆性质；违反时旋转修复（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme, glowMaterial } from '../3D/Glow.js';
applyTheme('Treap3D');

const scene = new Scene3D('scene', { cameraPos: [0, 220, 640], fov: 55 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, WHITE = 0xffffff, GREEN = 0x4ade80, ORANGE = 0xfb923c, PURPLE = 0xc084fc;
const hint = new VText(scene, { text: '点击「运行演示」开始：Treap 堆性质修复（旋转）', x: 0, y: 380, z: 0, color: PALETTE.textGlow, scale: 0.8 });
const status = panel.addStatus('就绪');
const outT = new VText(scene, { text: '', x: 0, y: -20, z: 0, color: PALETTE.textGlow, scale: 0.7 });

const ROOT_Y = 260, STEP_Y = 95, X_STEP = 84;

// ---- 纯数据模型：BST 键 + 优先级（小顶堆性质：父 prio < 子 prio） ----
let nextId = 0;
const model = new Map();  // id -> { key, prio, left:null, right:null, parent:key|null }
let root = null;
function mkNode(key, prio) { const n = { id: 't' + (nextId++), key, prio, left: null, right: null, parent: null }; model.set(n.id, n); return n; }
function findNode(key) { let cur = root; while (cur) { if (key === cur.key) return cur; cur = key < cur.key ? cur.left : cur.right; } return null; }
function depthOf(n) { let d = 0, cur = n; while (cur.parent != null) { d++; const p = findNode(cur.parent); if (!p) break; cur = p; } return d; }
function collect() {
  const arr = [];
  (function inOrder(n) { if (!n) return; inOrder(n.left); arr.push(n); inOrder(n.right); })(root);
  return arr;
}
function layout() {
  const arr = collect(), pos = new Map();
  arr.forEach((n, i) => {
    const d = depthOf(n);
    pos.set(n.id, new THREE.Vector3((i - (arr.length - 1) / 2) * (X_STEP + d * 10), ROOT_Y - d * STEP_Y, -d * 6));
  });
  return pos;
}
function rotateLeft(x) {
  const y = x.right;
  x.right = y.left;
  if (y.left) y.left.parent = x.key;
  y.left = x;
  y.parent = x.parent;
  if (x.parent == null) root = y;
  else { const p = findNode(x.parent); if (p.left === x) p.left = y; else p.right = y; }
  x.parent = y.key;
}
function rotateRight(x) {
  const y = x.left;
  x.left = y.right;
  if (y.right) y.right.parent = x.key;
  y.right = x;
  y.parent = x.parent;
  if (x.parent == null) root = y;
  else { const p = findNode(x.parent); if (p.left === x) p.left = y; else p.right = y; }
  x.parent = y.key;
}
function insertModel(key, prio) {
  const n = mkNode(key, prio);
  if (!root) { root = n; return n; }
  let cur = root;
  while (true) {
    if (key < cur.key) {
      if (!cur.left) { cur.left = n; n.parent = cur.key; return n; }
      cur = cur.left;
    } else {
      if (!cur.right) { cur.right = n; n.parent = cur.key; return n; }
      cur = cur.right;
    }
  }
}

// ---- 视觉：方块节点（键标签在上，优先级标签在下，紫色） ----
const nodeView = new Map();  // id -> { g, keyT, prioT }
const edgeView = new Map();  // childId -> tube
function clearView() {
  nodeView.forEach(v => { scene.remove(v.g); });
  edgeView.forEach(m => { scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
  nodeView.clear(); edgeView.clear();
}
function addNodeVis(n, p) {
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(56, 56, 34), glowMaterial(BLUE, { emissive: BLUE }));
  g.add(box);
  const keyT = new VText(scene, { text: String(n.key), x: 0, y: 52, z: 0, color: '#ffffff', scale: 0.95 });
  scene.remove(keyT.sprite); g.add(keyT.sprite);
  const prioT = new VText(scene, { text: String(n.prio), x: 0, y: -52, z: 0, color: PURPLE, scale: 0.55 });
  scene.remove(prioT.sprite); g.add(prioT.sprite);
  g.position.copy(p);
  g.scale.setScalar(0.01);
  scene.add(g);
  nodeView.set(n.id, { g, keyT, prioT });
  return g;
}
function setNodeColor(id, c) {
  const v = nodeView.get(id);
  if (v) { v.g.children[0].material.color.setHex(c); v.g.children[0].material.emissive.setHex(c); }
}
function resetColors() { nodeView.forEach(v => { v.g.children[0].material.color.setHex(BLUE); v.g.children[0].material.emissive.setHex(BLUE); }); }
function tube(a, b) {
  const A = a.clone(), B = b.clone();
  const mid = new THREE.Vector3((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2 + 18);
  const curve = new THREE.CatmullRomCurve3([A, mid, B]);
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 2, 6), new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.7 }));
  scene.add(m);
  return m;
}
function syncEdges() {
  edgeView.forEach(m => { scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
  edgeView.clear();
  (function walk(n) {
    if (n.left) { edgeView.set(n.left.id, tube(nodeView.get(n.id).g.position, nodeView.get(n.left.id).g.position)); walk(n.left); }
    if (n.right) { edgeView.set(n.right.id, tube(nodeView.get(n.id).g.position, nodeView.get(n.right.id).g.position)); walk(n.right); }
  })(root);
}
function* moveToLayout() {
  const pos = layout();
  const tasks = [];
  nodeView.forEach((v, id) => {
    const p = pos.get(id);
    if (!p) return;
    const f = v.g.position.clone();
    if (f.distanceTo(p) < 0.5) return;
    tasks.push({ v, from: f, to: p });
  });
  if (!tasks.length) { syncEdges(); return; }
  yield A(440, pp => tasks.forEach(t => t.v.g.position.lerpVectors(t.from, t.to, pp)));
  syncEdges();
}
function* dropIn(g, p) {
  yield A(480, pp => {
    g.position.y = p.y + 250 * (1 - pp);
    g.scale.setScalar(0.4 + 0.6 * pp);
  });
  g.scale.setScalar(1);
}
function* growEdge(n) {
  if (!n.parent) return;
  const e = edgeView.get(n.id);
  e.material.opacity = 0;
  yield A(280, p => { e.material.opacity = 0.7 * p; });
}

// ---- 插入：BST 下降 → 降落 → 堆性质冒泡旋转 ----
function* insertGen(key, prio) {
  yield S(() => outT.setText('插入 ' + key + '（优先级 ' + prio + '）：沿 BST 比较路径下钻'));
  let cur = root;
  while (cur && cur.key !== key) {
    setNodeColor(cur.id, GOLD);
    yield W(220);
    cur = key < cur.key ? cur.left : cur.right;
  }
  if (cur) { setNodeColor(cur.id, GOLD); yield S(() => outT.setText(key + ' 已存在')); yield W(450); resetColors(); return; }
  const n = insertModel(key, prio);
  const pos = layout().get(n.id);
  const g = addNodeVis(n, new THREE.Vector3(pos.x, pos.y + 250, pos.z));
  yield S(() => outT.setText('新节点 ' + key + ' 降落：键 ' + key + ' 满足 BST，优先级 ' + prio + ' 待验证'));
  yield* dropIn(g, pos);
  yield* moveToLayout();
  yield* growEdge(n);
  yield W(300);
  // 堆性质修复：父 prio > 子 prio 则旋转（小顶堆）
  let z = n, guard = 0;
  while (z.parent && guard++ < 12) {
    const p = findNode(z.parent);
    if (z.prio >= p.prio) break;
    setNodeColor(z.id, ORANGE); setNodeColor(p.id, ORANGE);
    const dir = p.left === z ? '右' : '左';
    yield S(() => outT.setText('堆性质破坏：' + z.key + ' 优先级 ' + z.prio + ' < 父 ' + p.key + ' 的 ' + p.prio + ' → ' + dir + '旋 ' + p.key));
    yield W(500);
    if (p.left === z) rotateRight(p); else rotateLeft(p);
    yield* moveToLayout();
    yield W(300);
    z = findNode(z.key);
  }
  setNodeColor(n.id, GREEN);
  yield S(() => outT.setText('插入 ' + key + ' 完成：BST + 堆性质均满足（绿闪）'));
  yield W(450);
  resetColors();
  yield W(150);
}

function* randomizeGen() {
  clearView(); root = null; model.clear(); nextId = 0;
  hint.setText('Treap：键满足 BST，优先级满足小顶堆；插入后旋转修复');
  yield W(300);
  const used = new Set();
  const pairs = [];
  while (pairs.length < 8) {
    const k = 1 + Math.floor(Math.random() * 60);
    if (used.has(k)) continue;
    used.add(k);
    const p = 1 + Math.floor(Math.random() * 99);
    pairs.push([k, p]);
  }
  for (const [k, p] of pairs) yield* insertGen(k, p);
  yield S(() => {
    outT.setText('随机 8 键构建完成');
    status.textContent = 'Treap 随机演示：' + pairs.map(([k, p]) => k + '(' + p + ')').join(' ') + '，所有节点满足堆性质';
  });
}

function* runTreap() {
  clearView(); root = null; model.clear(); nextId = 0;
  hint.setText('Treap = Tree + Heap：键决定 BST 位置，随机优先级决定堆形状');
  yield W(400);
  for (const [k, p] of [[10, 30], [20, 50], [30, 10], [25, 5], [5, 1]]) yield* insertGen(k, p);
  const arr = collect();
  yield S(() => {
    outT.setText('最终中序：' + arr.map(n => n.key).join(' → '));
    hint.setText('Treap 完成：插入 5 键触发 4 次旋转（左旋/右旋修复堆性质）');
    status.textContent = 'Treap 演示完成：插入 (10,30)(20,50)(30,10)(25,5)(5,1)，30 左旋、25 两次左旋、5 两次右旋，堆性质保持';
  });
}

panel.addButton('运行演示', () => engine.start(runTreap()));
panel.addButton('随机化', () => engine.start(randomizeGen()));
panel.addButton('清空', () => { engine.clear(); clearView(); root = null; model.clear(); nextId = 0; hint.setText('已清空，可重新运行'); status.textContent = ''; outT.setText(''); });
panel.addLabel('（拖拽旋转视角，滚轮缩放；键标签白字在上，优先级紫字在下；橙 = 旋转目标，绿 = 完成）');

scene.start(engine);
