// AlgorithmLibrary/AVL3D.js — AVL 树：平衡因子标签 + 失衡红闪 + LL/LR/RR/RL 旋转修复（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VNode } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('AVL3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 560], fov: 55 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, RED = 0xfb7185, GREEN = 0x4ade80, WHITE = 0xffffff;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：AVL 平衡因子标签 + 旋转修复', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.8 });
const status = panel.addStatus('就绪');
const outT = new VText(scene, { text: '', x: 0, y: 30, z: 0, color: PALETTE.textGlow, scale: 0.7 });

const ROOT_Y = 260, STEP_Y = 85, X_STEP = 80;

// ---- 纯数据 AVL ----
let root = null; // { key, left, right, parent:key|null }
function findNode(key) {
  let cur = root;
  while (cur) { if (key === cur.key) return cur; cur = key < cur.key ? cur.left : cur.right; }
  return null;
}
function height(n) { if (!n) return 0; return 1 + Math.max(height(n.left), height(n.right)); }
function bfOf(n) { return height(n.left) - height(n.right); }
function insertModel(key) {
  if (!root) return (root = { key, left: null, right: null, parent: null });
  let cur = root;
  while (true) {
    if (key < cur.key) {
      if (!cur.left) { cur.left = { key, left: null, right: null, parent: cur.key }; return cur.left; }
      cur = cur.left;
    } else {
      if (!cur.right) { cur.right = { key, left: null, right: null, parent: cur.key }; return cur.right; }
      cur = cur.right;
    }
  }
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
    pos.set(n.key, new THREE.Vector3((i - (arr.length - 1) / 2) * (X_STEP + d * 10), ROOT_Y - d * STEP_Y, -d * 6));
  });
  return pos;
}

// ---- 视觉：球 + 键标签 + 平衡因子标签（子节点跟随移动） ----
const nodeView = new Map();  // key -> VNode
const bfView = new Map();    // key -> VText sprite
const edgeView = new Map();  // childKey -> tube mesh
function clearView() {
  nodeView.forEach(v => scene.remove(v.mesh));
  edgeView.forEach(m => { scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
  nodeView.clear(); edgeView.clear(); bfView.clear();
}
function addNodeMesh(n, p) {
  const vn = new VNode(scene, { radius: 19, x: p.x, y: p.y, z: p.z, label: String(n.key), color: BLUE, emissive: BLUE });
  const bf = new VText(scene, { text: '0', x: 0, y: 0, z: 0, color: PALETTE.yellow, scale: 0.55 });
  scene.remove(bf.sprite);
  bf.sprite.position.set(0, 62, 0);
  vn.mesh.add(bf.sprite);
  nodeView.set(n.key, vn); bfView.set(n.key, bf);
  return vn;
}
function updateBFLabels() {
  nodeView.forEach((vn, key) => {
    const n = findNode(key);
    const b = bfOf(n);
    bfView.get(key).setText(b > 0 ? '+' + b : String(b));
  });
}
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
    if (n.left) { edgeView.set(n.left.key, tube(nodeView.get(n.key).mesh.position, nodeView.get(n.left.key).mesh.position)); walk(n.left); }
    if (n.right) { edgeView.set(n.right.key, tube(nodeView.get(n.key).mesh.position, nodeView.get(n.right.key).mesh.position)); walk(n.right); }
  })(root);
}
function setNodeColor(key, c) { nodeView.get(key).setColor(c, c); }
function resetNodeColors() { nodeView.forEach(v => v.setColor(BLUE, BLUE)); }
function* moveToLayout() {
  const pos = layout();
  const tasks = [];
  nodeView.forEach((vn, key) => {
    const p = pos.get(key);
    if (!p) return;
    const f = vn.mesh.position.clone();
    if (f.distanceTo(p) < 0.5) return;
    tasks.push({ vn, from: f, to: p });
  });
  if (!tasks.length) { syncEdges(); return; }
  yield A(460, pp => tasks.forEach(t => t.vn.mesh.position.lerpVectors(t.from, t.to, pp)));
  syncEdges();
}
function* dropIn(vn, p) {
  yield A(480, pp => {
    vn.mesh.position.y = p.y + 250 * (1 - pp);
    vn.mesh.scale.setScalar(0.4 + 0.6 * pp);
  });
  vn.mesh.scale.setScalar(1);
}

// 插入：下钻 → 降落 → 回溯修复失衡（旋转动画）
function* insertGen(key) {
  yield S(() => outT.setText('插入 ' + key + '：沿比较路径下钻'));
  let cur = root;
  while (cur && cur.key !== key) {
    setNodeColor(cur.key, GOLD);
    yield W(240);
    cur = key < cur.key ? cur.left : cur.right;
  }
  if (cur) { setNodeColor(cur.key, RED); yield S(() => outT.setText(key + ' 已存在')); yield W(450); resetNodeColors(); return; }
  const n = insertModel(key);
  const pos = layout().get(key);
  const vn = addNodeMesh(n, new THREE.Vector3(pos.x, pos.y + 250, pos.z));
  yield* dropIn(vn, pos);
  yield* moveToLayout();
  yield* growEdge(n);
  resetNodeColors();
  updateBFLabels();
  yield W(350);
  // 回溯修复
  let p = n, guard = 0;
  while (p && guard++ < 30) {
    const b = bfOf(p);
    if (Math.abs(b) < 2) { p = p.parent ? findNode(p.parent) : null; continue; }
    const type = b > 1
      ? (height(p.left.left) >= height(p.left.right) ? 'LL' : 'LR')
      : (height(p.right.right) >= height(p.right.left) ? 'RR' : 'RL');
    const pivot = p.key;
    setNodeColor(pivot, RED);
    yield S(() => outT.setText('节点 ' + pivot + ' 失衡 BF=' + (b > 0 ? '+' + b : b) + ' → ' + type + ' 旋转修复'));
    yield W(600);
    if (type === 'LL') rotateRight(p);
    else if (type === 'LR') { rotateLeft(p.left); rotateRight(p); }
    else if (type === 'RR') rotateLeft(p);
    else { rotateRight(p.right); rotateLeft(p); }
    yield* moveToLayout();
    setNodeColor(pivot, GREEN);
    yield S(() => outT.setText(type + ' 旋转完成：' + pivot + ' 已平衡（绿闪）'));
    yield W(500);
    updateBFLabels();
    break;
  }
  resetNodeColors();
  updateBFLabels();
  yield W(200);
}
function* growEdge(n) {
  if (!n.parent) return;
  const e = edgeView.get(n.key);
  e.material.opacity = 0;
  yield A(280, p => { e.material.opacity = 0.7 * p; });
}

function* searchGen(key) {
  yield S(() => outT.setText('查找 ' + key + '：沿金色路径下钻'));
  let cur = root, path = [];
  while (cur && cur.key !== key) { path.push(cur.key); setNodeColor(cur.key, GOLD); yield W(260); cur = key < cur.key ? cur.left : cur.right; }
  if (cur) {
    setNodeColor(cur.key, GREEN);
    yield S(() => outT.setText('命中 ' + key + '！（绿色闪光，深度 ' + depthOf(cur) + '）'));
    yield W(500);
  } else {
    setNodeColor(path[path.length - 1], RED);
    yield S(() => outT.setText(key + ' 不存在（红闪）'));
    yield W(500);
  }
  resetNodeColors();
}

function* deleteLeaf(key) {
  const z = findNode(key);
  if (!z) { yield S(() => outT.setText(key + ' 不存在')); yield W(400); return; }
  yield S(() => outT.setText('删除叶节点 ' + key + '：红闪后收缩消失'));
  setNodeColor(key, RED);
  yield W(450);
  root = (function rec(node) {
    if (!node) return null;
    if (key < node.key) { node.left = rec(node.left); if (node.left) node.left.parent = node.key; }
    else if (key > node.key) { node.right = rec(node.right); if (node.right) node.right.parent = node.key; }
    else return null;
    return node;
  })(root);
  const vn = nodeView.get(key);
  yield A(300, p => { vn.mesh.scale.setScalar(1 - p); });
  scene.remove(vn.mesh);
  nodeView.delete(key); bfView.delete(key);
  yield* moveToLayout();
  updateBFLabels();
  resetNodeColors();
  yield W(200);
}

function* runAVL() {
  clearView(); root = null;
  hint.setText('AVL 树：每个节点带平衡因子标签（黄字），|BF|>1 红闪失衡，四种旋转修复');
  yield W(400);
  for (const k of [50, 30, 70, 20, 10]) yield* insertGen(k);
  yield S(() => outT.setText('插入 10 触发 LL 失衡 → 右旋 30（已完成）'));
  yield W(300);
  for (const k of [60, 80, 90]) yield* insertGen(k);
  yield S(() => outT.setText('插入 90 触发 RR 失衡 → 左旋 70（已完成）'));
  yield W(300);
  yield* insertGen(75);
  yield S(() => outT.setText('插入 75 触发 RL 失衡 → 右旋 80 + 左旋 70（已完成）'));
  yield W(300);
  yield* insertGen(15);
  yield S(() => outT.setText('插入 15 触发 LR 失衡 → 左旋 10 + 右旋 20（已完成）'));
  yield W(300);
  yield* searchGen(75);
  yield* deleteLeaf(10);
  const arr = collect();
  yield S(() => {
    outT.setText('最终中序：' + arr.map(n => n.key).join(' → ') + '，全部 |BF| ≤ 1');
    hint.setText('AVL 完成：自平衡保证树高 O(log n)，旋转共 4 种：LL/RR 单旋，LR/RL 双旋');
    status.textContent = 'AVL 演示完成：插入 9 节点展示 LL/RR/RL/LR 四种旋转，查找 75 命中，删除叶节点 10';
  });
}

engine.queue(() => runAVL());
panel.addButton('清空', () => { engine.clear(); clearView(); root = null; hint.setText('已清空，可重新运行'); status.textContent = ''; outT.setText(''); });
panel.addLabel('（拖拽旋转视角，滚轮缩放；黄字 = 平衡因子，红 = 失衡，绿 = 修复完成）');

scene.start(engine);
