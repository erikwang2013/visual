// AlgorithmLibrary/RedBlack3D.js — 红黑树：红节点橙色/黑节点蓝色 + 插入修复 case1 变色 / case2/3 旋转 + 删除双黑修复（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VNode } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('RedBlack3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLACK = 0x60a5fa, REDC = 0xfb923c, GOLD = 0xfcd34d, WHITE = 0xffffff, GREEN = 0x4ade80;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：红黑树变色 + 旋转修复', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');
const outT = new VText(scene, { text: '', x: 700, y: 345, z: 0, color: PALETTE.textGlow, scale: 0.45, wrapChars: 8 });

const ROOT_Y = 440, STEP_Y = 50, X_STEP = 80;

// ---- 纯数据红黑树（parent 为键引用，color: 'R'|'B'） ----
let root = null;
function findNode(key) {
  let cur = root;
  while (cur) { if (key === cur.key) return cur; cur = key < cur.key ? cur.left : cur.right; }
  return null;
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
    pos.set(n.key, new THREE.Vector3((i - (arr.length - 1) / 2) * (X_STEP + d * 10) + 320, ROOT_Y - d * STEP_Y, -d * 6));
  });
  return pos;
}
function insertModel(key) {
  if (!root) return (root = { key, left: null, right: null, parent: null, color: 'B' });
  let cur = root;
  while (true) {
    if (key < cur.key) {
      if (!cur.left) { cur.left = { key, left: null, right: null, parent: cur.key, color: 'R' }; return cur.left; }
      cur = cur.left;
    } else {
      if (!cur.right) { cur.right = { key, left: null, right: null, parent: cur.key, color: 'R' }; return cur.right; }
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
const colorOf = n => n ? n.color : 'B';

// ---- 视觉 ----
const nodeView = new Map();  // key -> VNode
const edgeView = new Map();  // childKey -> tube
function clearView() {
  nodeView.forEach(v => scene.remove(v.mesh));
  edgeView.forEach(m => { scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
  nodeView.clear(); edgeView.clear();
}
function colorHex(n) { return n.color === 'R' ? REDC : BLACK; }
function addNodeMesh(n, p) {
  const c = colorHex(n);
  const vn = new VNode(scene, { radius: 20, x: p.x, y: p.y, z: p.z, label: String(n.key), color: c, emissive: c });
  nodeView.set(n.key, vn);
  return vn;
}
function syncColor(key) {
  const n = findNode(key), vn = nodeView.get(key);
  if (!n || !vn) return;
  const c = colorHex(n);
  vn.setColor(c, c);
}
function syncAllColors() { collect().forEach(n => syncColor(n.key)); }
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

// ---- 插入：下钻 → 降落红节点 → rbFix 逐 case 演示 ----
function* insertGen(key) {
  yield S(() => outT.setText('插入 ' + key + '：沿比较路径下钻'));
  let cur = root;
  while (cur && cur.key !== key) {
    setNodeColor(cur.key, GOLD);
    yield W(240);
    cur = key < cur.key ? cur.left : cur.right;
  }
  if (cur) { setNodeColor(cur.key, GOLD); yield S(() => outT.setText(key + ' 已存在')); yield W(450); return; }
  const n = insertModel(key);
  const pos = layout().get(key);
  const vn = addNodeMesh(n, new THREE.Vector3(pos.x, pos.y + 250, pos.z));
  yield S(() => outT.setText('新节点 ' + key + ' 染红降落（红 = 待修复）'));
  yield* dropIn(vn, pos);
  yield* moveToLayout();
  yield* growEdge(n);
  yield W(300);
  // 修复循环
  let z = n, guard = 0;
  while (guard++ < 12) {
    const p = z.parent ? findNode(z.parent) : null;
    if (!p || colorOf(p) !== 'R') break;
    const g = p.parent ? findNode(p.parent) : null;
    if (!g) break;
    const u = g.left === p ? g.right : g.left;
    if (colorOf(u) === 'R') {
      setNodeColor(p.key, WHITE); setNodeColor(u.key, WHITE); setNodeColor(g.key, REDC);
      yield S(() => outT.setText('case1 叔 ' + u.key + ' 红：父/叔变黑，祖 ' + g.key + ' 变红'));
      yield W(550);
      p.color = 'B'; u.color = 'B'; g.color = 'R';
      syncColor(p.key); syncColor(u.key); syncColor(g.key);
      z = g;
      yield W(250);
    } else if (p === g.left) {
      if (z === p.right) {
        setNodeColor(z.key, WHITE);
        yield S(() => outT.setText('case2 之字形：左旋 ' + p.key));
        yield W(500);
        rotateLeft(p); yield* moveToLayout();
        z = p; p = findNode(z.parent);
        syncAllColors();
      }
      setNodeColor(g.key, WHITE); setNodeColor(p.key, WHITE);
      yield S(() => outT.setText('case3：父 ' + p.key + ' 黑、祖 ' + g.key + ' 红，右旋 ' + g.key));
      yield W(500);
      const tmp = p.color; p.color = g.color; g.color = tmp;
      rotateRight(g);
      yield* moveToLayout();
      syncAllColors();
      break;
    } else {
      if (z === p.left) {
        setNodeColor(z.key, WHITE);
        yield S(() => outT.setText('case2 之字形：右旋 ' + p.key));
        yield W(500);
        rotateRight(p); yield* moveToLayout();
        z = p; p = findNode(z.parent);
        syncAllColors();
      }
      setNodeColor(g.key, WHITE); setNodeColor(p.key, WHITE);
      yield S(() => outT.setText('case3：父 ' + p.key + ' 黑、祖 ' + g.key + ' 红，左旋 ' + g.key));
      yield W(500);
      const tmp = p.color; p.color = g.color; g.color = tmp;
      rotateLeft(g);
      yield* moveToLayout();
      syncAllColors();
      break;
    }
  }
  if (root && root.color !== 'B') {
    root.color = 'B';
    yield S(() => outT.setText('根染黑（红黑性质 2）'));
    syncColor(root.key);
    yield W(350);
  }
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
  let cur = root;
  while (cur && cur.key !== key) { setNodeColor(cur.key, GOLD); yield W(260); cur = key < cur.key ? cur.left : cur.right; }
  if (cur) {
    setNodeColor(cur.key, GREEN);
    yield S(() => outT.setText('命中 ' + key + '！（绿色闪光）'));
    yield W(500);
    setNodeColor(cur.key, colorHex(cur));
  } else {
    yield S(() => outT.setText(key + ' 不存在'));
    yield W(500);
  }
  syncAllColors();
}

// ---- 删除：红叶子直接删；黑叶子做简化双黑修复 ----
function* deleteGen(key) {
  const z = findNode(key);
  if (!z) { yield S(() => outT.setText(key + ' 不存在')); yield W(400); return; }
  const isRed = z.color === 'R';
  yield S(() => outT.setText('删除 ' + key + '（' + (isRed ? '红' : '黑') + '节点）：目标高亮'));
  setNodeColor(key, isRed ? GREEN : REDC);
  yield W(500);
  // 从模型中删除
  root = (function rec(node) {
    if (!node) return null;
    if (key < node.key) { node.left = rec(node.left); if (node.left) node.left.parent = node.key; }
    else if (key > node.key) { node.right = rec(node.right); if (node.right) node.right.parent = node.key; }
    else return null;
    return node;
  })(root);
  if (isRed) {
    yield S(() => outT.setText('红叶子删除：不破坏红黑性质，直接收缩消失'));
    const vn = nodeView.get(key);
    yield A(300, p => { vn.mesh.scale.setScalar(1 - p); });
    scene.remove(vn.mesh);
    nodeView.delete(key);
  } else {
    // 黑叶子：简化双黑修复（兄弟红 → 旋转换黑兄弟；兄弟黑 → 兄弟变红上溯）
    yield S(() => outT.setText('黑叶子删除：触发双黑修复（兄弟变红上溯）'));
    const p = z.parent ? findNode(z.parent) : null;
    if (p) {
      let sib = p.left === z ? p.right : p.left;
      if (sib) {
        setNodeColor(p.key, WHITE);
        yield W(450);
        if (sib.color === 'R') {
          yield S(() => outT.setText('兄弟 ' + sib.key + ' 为红：旋转换黑兄弟'));
          const tmp = p.color; p.color = sib.color; sib.color = tmp;
          if (p.left === z) rotateLeft(p); else rotateRight(p);
          yield* moveToLayout();
          syncAllColors();
          yield W(400);
          sib = (p.left === z ? p.right : p.left);
        }
        if (sib && sib.color === 'B') {
          setNodeColor(sib.key, REDC);
          yield S(() => outT.setText('兄弟 ' + sib.key + ' 变红（黑高平衡转移）'));
          yield W(500);
          sib.color = 'R';
          syncColor(sib.key);
        }
      }
    }
    const vn = nodeView.get(key);
    yield A(300, p => { vn.mesh.scale.setScalar(1 - p); });
    scene.remove(vn.mesh);
    nodeView.delete(key);
    yield W(250);
  }
  if (root) root.color = 'B';
  yield* moveToLayout();
  syncAllColors();
  yield W(200);
}

function* runRBT() {
  clearView(); root = null;
  hint.setText('红黑树：橙=红节点、蓝=黑节点；case1 变色 / case2/3 旋转');
  yield W(400);
  for (const k of [41, 38, 31, 12, 19, 8]) yield* insertGen(k);
  yield S(() => outT.setText('6 节点插入完成，红黑性质保持'));
  yield W(450);
  yield* searchGen(19);
  yield* deleteGen(8);
  yield* deleteGen(31);
  const arr = collect();
  yield S(() => {
    outT.setText('最终中序：' + arr.map(n => n.key).join(' → '));
    hint.setText('红黑树完成：任意根到叶路径黑高相等，保证 O(log n) 操作');
    status.textContent = '红黑树演示完成：插入 6 节点展示 case1 变色与 case2/3 旋转，删除红叶子 8 与黑叶子 31（双黑修复）';
  });
}

engine.queue(() => runRBT());
panel.addButton('清空', () => { engine.clear(); clearView(); root = null; hint.setText('已清空，可重新运行'); status.textContent = ''; outT.setText(''); });
panel.addLabel('（拖拽旋转视角，滚轮缩放；橙 = 红节点，蓝 = 黑节点，白闪 = 变色目标，绿 = 命中）');

scene.start(engine);
