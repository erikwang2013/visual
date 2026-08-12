// AlgorithmLibrary/BST3D.js — 二叉搜索树：插入路径金色下钻 + 新节点从上方降落 + 删除收缩 + 中序飞底（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VNode } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('BST3D');

const scene = new Scene3D('scene', { cameraPos: [344, 705, 1050], lookAt: [344, 285, 0], fov: 55 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, RED = 0xfb7185, GREEN = 0x4ade80, WHITE = 0xffffff;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：插入路径金色下钻，新节点从上方降落', x: 760, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');
const outT = new VText(scene, { text: '', x: 760, y: 430, z: 0, color: PALETTE.textGlow, scale: 0.55, wrapChars: 8 });

const ROOT_Y = 530, STEP_Y = 85, X_STEP = 78;

// ---- 纯数据 BST ----
let root = null; // { key, left, right, parent:key|null }
function findNode(key) {
  let cur = root;
  while (cur) { if (key === cur.key) return cur; cur = key < cur.key ? cur.left : cur.right; }
  return null;
}
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
function removeModel(key) {
  const rec = (node) => {
    if (!node) return null;
    if (key < node.key) { node.left = rec(node.left); if (node.left) node.left.parent = node.key; }
    else if (key > node.key) { node.right = rec(node.right); if (node.right) node.right.parent = node.key; }
    else {
      if (!node.left) { if (node.right) node.right.parent = node.parent; return node.right; }
      if (!node.right) { if (node.left) node.left.parent = node.parent; return node.left; }
      let pred = node.left; while (pred.right) pred = pred.right;
      node.key = pred.key;
      node.left = rec(node.left);
      if (node.left) node.left.parent = node.key;
      if (node.right) node.right.parent = node.key;
    }
    return node;
  };
  root = rec(root);
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
    pos.set(n.key, new THREE.Vector3((i - (arr.length - 1) / 2) * (X_STEP + d * 10) + 344, ROOT_Y - d * STEP_Y, -d * 6));
  });
  return pos;
}

// ---- 视觉 ----
const nodeView = new Map();  // key -> VNode
const edgeView = new Map();  // childKey -> tube mesh
function clearView() {
  nodeView.forEach(v => { scene.remove(v.mesh); });
  edgeView.forEach(m => { scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
  nodeView.clear(); edgeView.clear();
}
function addNodeMesh(n, p) {
  const vn = new VNode(scene, { radius: 20, x: p.x, y: p.y, z: p.z, label: String(n.key), color: BLUE, emissive: BLUE });
  nodeView.set(n.key, vn);
  return vn;
}
function syncEdges() {
  edgeView.forEach(m => { scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
  edgeView.clear();
  (function walk(n) {
    if (n.left) { edgeView.set(n.left.key, edgeTube(n, n.left)); walk(n.left); }
    if (n.right) { edgeView.set(n.right.key, edgeTube(n, n.right)); walk(n.right); }
  })(root);
}
function edgeTube(a, b) {
  const va = nodeOf(a.key), vb = nodeOf(b.key);
  return tube(va.position, vb.position);
}
function tube(a, b) {
  const A = a.clone(), B = b.clone();
  const mid = new THREE.Vector3((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2 + 18);
  const curve = new THREE.CatmullRomCurve3([A, mid, B]);
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 2, 6), new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.7 }));
  scene.add(m);
  return m;
}
const nodeOf = key => nodeView.get(key).mesh;
function setNodeColor(key, c) { nodeView.get(key).setColor(c, c); }
function resetNodeColors() { nodeView.forEach(v => v.setColor(BLUE, BLUE)); }

// 全部节点移动到新布局（单次动画）
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
  yield A(440, pp => tasks.forEach(t => t.vn.mesh.position.lerpVectors(t.from, t.to, pp)));
  syncEdges();
}

function* dropIn(vn, p) {
  yield A(480, pp => {
    vn.mesh.position.y = p.y + 250 * (1 - pp);
    vn.mesh.scale.setScalar(0.4 + 0.6 * pp);
  });
  vn.mesh.scale.setScalar(1);
}

// 插入：路径下钻（金色）→ 降落 → 布局微移
function* insertGen(key) {
  yield S(() => outT.setText('插入 ' + key + '：从根沿比较路径下钻'));
  let cur = root;
  while (cur && cur.key !== key) {
    setNodeColor(cur.key, GOLD);
    yield W(260);
    cur = key < cur.key ? cur.left : cur.right;
  }
  if (cur) {
    setNodeColor(cur.key, RED);
    yield S(() => outT.setText(key + ' 已存在，插入中止（红闪）'));
    yield W(500);
    resetNodeColors();
    return;
  }
  const n = insertModel(key);
  const pos = layout().get(key);
  const vn = addNodeMesh(n, new THREE.Vector3(pos.x, pos.y + 250, pos.z));
  yield S(() => outT.setText('新节点 ' + key + ' 从上方降落，边生长连接'));
  yield* dropIn(vn, pos);
  yield* moveToLayout();
  yield* growEdge(n);
  resetNodeColors();
  yield W(180);
}
function* growEdge(n) {
  if (!n.parent) return;
  const e = edgeView.get(n.key);
  e.material.opacity = 0;
  yield A(300, p => { e.material.opacity = 0.7 * p; });
}

// 查找：金色路径，命中绿闪 / 未命中红闪
function* searchGen(key) {
  yield S(() => outT.setText('查找 ' + key + '：沿金色路径下钻'));
  let cur = root, path = [];
  while (cur && cur.key !== key) { path.push(cur.key); setNodeColor(cur.key, GOLD); yield W(280); cur = key < cur.key ? cur.left : cur.right; }
  if (cur) {
    setNodeColor(cur.key, GREEN);
    yield S(() => outT.setText('命中 ' + key + '！（绿色闪光，深度 ' + depthOf(cur) + '）'));
    yield W(550);
  } else {
    setNodeColor(path[path.length - 1], RED);
    yield S(() => outT.setText(key + ' 不存在：路径走到底为空（红闪）'));
    yield W(550);
    setNodeColor(path[path.length - 1], BLUE);
  }
  resetNodeColors();
}

// 删除：红闪目标 → 收缩消失（叶子）/ 前驱飞入（双子）
function* deleteGen(key) {
  const z = findNode(key);
  if (!z) {
    yield S(() => outT.setText(key + ' 不存在，无法删除'));
    yield W(400);
    return;
  }
  yield S(() => outT.setText('删除 ' + key + '：目标红闪'));
  setNodeColor(key, RED);
  yield W(500);
  const two = !!(z.left && z.right);
  const predKey = two ? (function (m) { while (m.right) m = m.right; return m.key; })(z.left) : null;
  const zpos = two ? layout().get(key) : null;
  removeModel(key);
  if (two) {
    const pv = nodeView.get(predKey);
    yield S(() => outT.setText('双子删除：前驱 ' + predKey + ' 飞入节点 ' + key + '（中序前驱复制）'));
    yield A(450, pp => pv.mesh.position.lerpVectors(pv.mesh.position.clone(), zpos, pp));
    pv.mesh.position.copy(zpos);
    pv.setText(String(key));
    nodeView.delete(predKey);
    nodeView.set(key, pv);
    yield W(250);
  } else {
    const vn = nodeView.get(key);
    yield A(320, p => { vn.mesh.scale.setScalar(1 - p); });
    scene.remove(vn.mesh);
    nodeView.delete(key);
    yield W(180);
  }
  yield* moveToLayout();
  resetNodeColors();
  yield W(200);
}

// 中序遍历：节点飞到底部输出行
function* inorderGen() {
  const arr = collect();
  yield S(() => outT.setText('中序遍历：左 → 根 → 右'));
  yield W(400);
  const tmp = [];
  arr.forEach((n, i) => {
    const f = nodeView.get(n.key).mesh.position.clone();
    const t = new VText(scene, { text: String(n.key), x: f.x, y: f.y, z: f.z, color: GOLD, scale: 0.85 });
    tmp.push({ t, from: f, to: new THREE.Vector3((i - (arr.length - 1) / 2) * 82 + 344, 40, 0) });
  });
  yield A(560, p => tmp.forEach(x => x.t.sprite.position.lerpVectors(x.from, x.to, p)));
  yield S(() => outT.setText('中序输出：' + arr.map(n => n.key).join(' → ')));
  yield W(900);
  tmp.forEach(x => scene.remove(x.t.sprite));
}

function* runBST() {
  clearView(); root = null;
  hint.setText('二叉搜索树：左子树 < 根 < 右子树。插入沿比较路径下钻；查找金色路径；删除红闪');
  yield W(400);
  for (const k of [50, 30, 70, 20, 40, 60, 80]) yield* insertGen(k);
  yield S(() => outT.setText('初始树构建完成：7 个节点，左小右大'));
  yield W(450);
  yield* searchGen(40);
  yield* searchGen(55);
  yield* deleteGen(20);
  yield* deleteGen(50);
  yield* inorderGen();
  yield S(() => {
    outT.setText('');
    hint.setText('BST 完成：查找/插入 O(h)，h 为树高；退化为链时 O(n)');
    status.textContent = 'BST 演示完成：插入 7 节点，查找 40 命中 / 55 未命中，删除 20（叶）与 50（双子，前驱 40 上移）';
  });
}

engine.queue(() => runBST());
panel.addButton('清空', () => { engine.clear(); clearView(); root = null; hint.setText('已清空，可重新运行'); status.textContent = ''; outT.setText(''); });
panel.addLabel('（拖拽旋转视角，滚轮缩放；金 = 查找路径，红 = 目标/缺失，绿 = 命中）');

scene.start(engine);
