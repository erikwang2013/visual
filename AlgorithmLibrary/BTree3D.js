// AlgorithmLibrary/BTree3D.js — B 树（3 阶）：多键节点卡片 + 插入分裂（中间键上移/右节点飞入） + 删除借键/合并（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText } from '../3D/VisualObject3D.js';
import { applyTheme, glowMaterial } from '../3D/Glow.js';
applyTheme('BTree3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, WHITE = 0xffffff, RED = 0xfb7185, GREEN = 0x4ade80;
const status = panel.addStatus('就绪');

const MAX = 2, MIN = 1;  // 3 阶：节点最多 2 键，非根最少 1 键

// ---- 纯数据模型 ----
let nextId = 0;
const model = new Map();  // id -> { keys:[], children:[], parent:node|null }
let root = null;
function mkNode() { const n = { id: 'n' + (nextId++), keys: [], children: [], parent: null }; model.set(n.id, n); return n; }

// 中序所有键的 x → 节点中心 = 键均值，深度 → y
function layout() {
  const pos = new Map();
  if (!root) return pos;
  const all = [];
  (function ino(n) {
    if (n.children.length === 0) { for (const k of n.keys) all.push({ n, k }); return; }
    for (let i = 0; i < n.children.length; i++) {
      ino(n.children[i]);
      if (i < n.keys.length) all.push({ n, k: n.keys[i] });
    }
  })(root);
  const keyX = all.map((e, i) => (i - (all.length - 1) / 2) * 66);
  const keyIdx = new Map();
  all.forEach((e, i) => {
    const arr = keyIdx.get(e.n.id) || []; arr.push(keyX[i]); keyIdx.set(e.n.id, arr);
  });
  const depth = new Map();
  const q = [root]; depth.set(root.id, 0);
  while (q.length) {
    const n = q.shift();
    for (const c of n.children) { depth.set(c.id, depth.get(n.id) + 1); q.push(c); }
  }
  for (const [id, xs] of keyIdx) {
    pos.set(id, new THREE.Vector3(xs.reduce((a, b) => a + b, 0) / xs.length + 320, 800 - depth.get(id) * 80, 0));
  }
  if (root.keys.length === 0 && !pos.has(root.id)) pos.set(root.id, new THREE.Vector3(320, 800, 0));
  return pos;
}

// ---- 视觉：节点 = 卡片（box 宽度随键数缩放）+ 键标签 ----
const nodeView = new Map();  // id -> { g, box, lbl }
const edgeView = new Map();  // childId -> tube
function clearView() {
  nodeView.forEach(v => { scene.remove(v.g); v.box.geometry.dispose(); v.box.material.dispose(); });
  edgeView.forEach(m => { scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
  nodeView.clear(); edgeView.clear();
}
function addNodeVis(n, p) {
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(34, 44, 14), glowMaterial(BLUE, { emissive: BLUE }));
  box.scale.x = Math.max(n.keys.length, 1);
  g.add(box);
  const lbl = new VText(scene, { text: n.keys.join('|'), x: 0, y: 0, z: 10, color: '#ffffff', scale: 0.62 });
  scene.remove(lbl.sprite); g.add(lbl.sprite);
  g.position.copy(p);
  g.scale.setScalar(0.01);
  scene.add(g);
  nodeView.set(n.id, { g, box, lbl });
  return g;
}
function refreshNodeVisual(n) {
  const v = nodeView.get(n.id);
  if (!v) return;
  v.box.scale.x = Math.max(n.keys.length, 1);
  v.lbl.setText(n.keys.join('|'));
}
function setNodeColor(id, c) {
  const v = nodeView.get(id);
  if (v) { v.box.material.color.setHex(c); v.box.material.emissive.setHex(c); }
}
function resetColors() { nodeView.forEach(v => { v.box.material.color.setHex(BLUE); v.box.material.emissive.setHex(BLUE); }); }
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
    for (const c of n.children) {
      edgeView.set(c.id, tube(nodeView.get(n.id).g.position, nodeView.get(c.id).g.position));
      walk(c);
    }
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
function* popIn(g) { yield A(420, p => { g.scale.setScalar(0.01 + 0.99 * p); }); }
function* shrinkOut(id) {
  const v = nodeView.get(id);
  if (!v) return;
  yield A(320, p => { v.g.scale.setScalar(1 - p); });
  scene.remove(v.g);
  nodeView.delete(id);
  model.delete(id);
}
function* flyLabel(text, from, to) {
  const t = new VText(scene, { text, x: from.x, y: from.y, z: from.z, color: '#fcd34d', scale: 0.75 });
  yield A(400, p => t.sprite.position.lerpVectors(from, to, p));
  scene.remove(t.sprite);
}

// ---- 插入：下钻 → 写入叶 → 溢出分裂（中间键上移） ----
function* insertGen(key) {
  yield S(() => { status.textContent ='插入 ' + key + '：沿路径下钻到叶'; });
  if (!root) {
    root = mkNode(); root.keys.push(key);
    addNodeVis(root, layout().get(root.id));
    yield* popIn(nodeView.get(root.id).g);
    yield W(250);
    return;
  }
  let n = root;
  while (n.children.length) {
    setNodeColor(n.id, GOLD);
    yield W(220);
    let i = 0; while (i < n.keys.length && n.keys[i] < key) i++;
    n = n.children[i];
  }
  setNodeColor(n.id, GOLD);
  yield W(220);
  let i = 0; while (i < n.keys.length && n.keys[i] < key) i++;
  if (i < n.keys.length && n.keys[i] === key) { yield S(() => { status.textContent =key + ' 已存在，中止'; }); yield W(400); resetColors(); return; }
  n.keys.splice(i, 0, key);
  refreshNodeVisual(n);
  yield S(() => { status.textContent ='叶节点写入 ' + key + '（当前 ' + n.keys.join('|') + '）'; });
  yield W(400);
  if (n.keys.length > MAX) {
    yield S(() => { status.textContent ='溢出：超过 2 键 → 分裂'; });
    yield W(450);
    yield* splitGen(n);
  }
  resetColors();
  yield W(180);
}
function* splitGen(n) {
  const mid = Math.floor(n.keys.length / 2);
  const promoted = n.keys[mid];
  const right = mkNode();
  right.keys = n.keys.slice(mid + 1);
  right.parent = n.parent;
  if (n.children.length) {
    right.children = n.children.slice(mid + 1);
    for (const c of right.children) c.parent = right;
    n.children = n.children.slice(0, mid + 1);
  }
  n.keys = n.keys.slice(0, mid);
  refreshNodeVisual(n);
  const from = nodeView.get(n.id).g.position.clone();
  addNodeVis(right, from.clone().add(new THREE.Vector3(0, -70, 0)));
  yield* popIn(nodeView.get(right.id).g);
  yield S(() => { status.textContent ='分裂：中间键 ' + promoted + ' 上移，右半区生成新节点'; });
  yield W(450);
  if (!n.parent) {
    const nr = mkNode();
    nr.keys = [promoted]; nr.children = [n, right];
    n.parent = nr; right.parent = nr;
    root = nr;
    addNodeVis(nr, from.clone().add(new THREE.Vector3(0, -70, 0)));
    yield* popIn(nodeView.get(nr.id).g);
    yield S(() => { status.textContent = '根分裂：新根生成，含键 ' + promoted; });
    yield* moveToLayout();
    yield W(450);
  } else {
    const parent = n.parent;
    let i = 0; while (i < parent.keys.length && parent.keys[i] < promoted) i++;
    parent.keys.splice(i, 0, promoted);
    parent.children.splice(i + 1, 0, right);
    const fromN = nodeView.get(n.id).g.position.clone();
    const toP = nodeView.get(parent.id).g.position.clone();
    yield* flyLabel(String(promoted), fromN, toP);
    refreshNodeVisual(parent);
    setNodeColor(parent.id, GOLD);
    yield S(() => { status.textContent ='中间键 ' + promoted + ' 上移进父节点（金色飞行）'; });
    yield* moveToLayout();
    yield W(450);
    if (parent.keys.length > MAX) {
      yield S(() => { status.textContent ='父节点溢出 → 递归分裂'; });
      yield W(400);
      yield* splitGen(parent);
    }
  }
}

// ---- 查找 ----
function* searchGen(key) {
  yield S(() => { status.textContent ='查找 ' + key + '：沿金色路径下钻'; });
  let n = root;
  while (n) {
    setNodeColor(n.id, GOLD);
    yield W(240);
    if (n.keys.includes(key)) {
      setNodeColor(n.id, GREEN);
      yield S(() => { status.textContent ='命中 ' + key + '！（绿色闪光，节点 ' + n.keys.join('|') + '）'; });
      yield W(500);
      resetColors();
      return;
    }
    if (!n.children.length) break;
    let i = 0; while (i < n.keys.length && n.keys[i] < key) i++;
    n = n.children[i];
  }
  yield S(() => { status.textContent =key + ' 不存在'; });
  yield W(500);
  resetColors();
}

// ---- 删除：定位 → 删键 → 下溢借键/合并 ----
function* deleteGen(key) {
  let n = root;
  if (!n) { yield S(() => { status.textContent ='树为空'; }); yield W(300); return; }
  while (true) {
    setNodeColor(n.id, GOLD);
    yield W(210);
    const i = n.keys.indexOf(key);
    if (i >= 0) break;
    if (!n.children.length) { yield S(() => { status.textContent =key + ' 不存在'; }); yield W(400); resetColors(); return; }
    let ci = 0; while (ci < n.keys.length && n.keys[ci] < key) ci++;
    n = n.children[ci];
  }
  if (n.children.length) {
    let pred = n.children[n.keys.indexOf(key)];
    while (pred.children.length) pred = pred.children[pred.children.length - 1];
    const pk = pred.keys[pred.keys.length - 1];
    yield S(() => { status.textContent ='内部键 ' + key + '：前驱 ' + pk + ' 上移替换'; });
    yield W(500);
    n.keys[n.keys.indexOf(key)] = pk;
    refreshNodeVisual(n);
    key = pk;
    n = pred;
    setNodeColor(n.id, GOLD);
    yield W(250);
  }
  const i = n.keys.indexOf(key);
  n.keys.splice(i, 1);
  refreshNodeVisual(n);
  yield S(() => { status.textContent ='删除叶键 ' + key + '（节点剩 ' + (n.keys.length ? n.keys.join('|') : '空') + '）'; });
  yield W(400);
  yield* rebalanceGen(n);
  resetColors();
  yield W(200);
}
function* rebalanceGen(n) {
  if (n === root) {
    if (n.keys.length === 0) {
      if (n.children.length === 1) {
        const c = n.children[0];
        root = c; c.parent = null;
        yield S(() => { status.textContent ='根空 → 孩子上提，树高 -1'; });
        yield* shrinkOut(n.id);
        yield* moveToLayout();
        yield W(400);
      } else if (n.children.length === 0) { root = null; yield* shrinkOut(n.id); }
    }
    return;
  }
  if (n.keys.length >= MIN) return;
  const parent = n.parent;
  const idx = parent.children.indexOf(n);
  const left = idx > 0 ? parent.children[idx - 1] : null;
  const right = idx < parent.children.length - 1 ? parent.children[idx + 1] : null;
  const fromN = nodeView.get(n.id).g.position.clone();
  const fromP = nodeView.get(parent.id).g.position.clone();
  if (left && left.keys.length > MIN) {
    const moved = parent.keys[idx - 1];
    const lastK = left.keys[left.keys.length - 1];
    parent.keys[idx - 1] = left.keys.pop();
    n.keys.unshift(moved);
    if (left.children.length) { const c = left.children.pop(); n.children.unshift(c); c.parent = n; }
    const fromL = nodeView.get(left.id).g.position.clone();
    yield* flyLabel(String(lastK), fromL, fromP);
    yield* flyLabel(String(moved), fromP, fromN);
    refreshNodeVisual(parent); refreshNodeVisual(left); refreshNodeVisual(n);
    yield S(() => { status.textContent ='借键：左兄弟末键 ' + lastK + ' 上移，父键 ' + moved + ' 下沉'; });
    yield* moveToLayout();
    yield W(450);
  } else if (right && right.keys.length > MIN) {
    const moved = parent.keys[idx];
    const firstK = right.keys[0];
    parent.keys[idx] = right.keys.shift();
    n.keys.push(moved);
    if (right.children.length) { const c = right.children.shift(); n.children.push(c); c.parent = n; }
    const fromR = nodeView.get(right.id).g.position.clone();
    yield* flyLabel(String(firstK), fromR, fromP);
    yield* flyLabel(String(moved), fromP, fromN);
    refreshNodeVisual(parent); refreshNodeVisual(right); refreshNodeVisual(n);
    yield S(() => { status.textContent ='借键：右兄弟首键 ' + firstK + ' 上移，父键 ' + moved + ' 下沉'; });
    yield* moveToLayout();
    yield W(450);
  } else {
    const sib = left || right;
    const fromS = nodeView.get(sib.id).g.position.clone();
    if (left) {
      const midK = parent.keys[idx - 1];
      left.keys.push(midK, ...n.keys);
      left.children.push(...n.children);
      for (const c of n.children) c.parent = left;
      parent.keys.splice(idx - 1, 1);
      parent.children.splice(idx, 1);
      yield* flyLabel(String(midK), fromP, fromS);
      yield S(() => { status.textContent ='合并：父键 ' + midK + ' 下沉，节点并入左兄弟'; });
      yield W(350);
      yield* shrinkOut(n.id);
      refreshNodeVisual(left); refreshNodeVisual(parent);
    } else {
      const midK = parent.keys[idx];
      n.keys.push(midK, ...right.keys);
      n.children.push(...right.children);
      for (const c of right.children) c.parent = n;
      parent.keys.splice(idx, 1);
      parent.children.splice(idx + 1, 1);
      yield* flyLabel(String(midK), fromP, fromN);
      yield S(() => { status.textContent ='合并：父键 ' + midK + ' 下沉，右兄弟并入本节点'; });
      yield W(350);
      yield* shrinkOut(sib.id);
      refreshNodeVisual(n); refreshNodeVisual(parent);
    }
    yield* moveToLayout();
    yield W(350);
    if (parent.keys.length < MIN) yield* rebalanceGen(parent);
  }
}

function* runBTree() {
  clearView(); root = null;
  yield W(400);
  for (const k of [20, 10, 30, 5, 15, 25, 35, 12, 18]) yield* insertGen(k);
  yield S(() => { status.textContent ='9 键插入完成（含 3 次分裂）'; });
  yield W(450);
  yield* searchGen(18);
  yield* deleteGen(5);
  yield* deleteGen(12);
  yield* deleteGen(10);
  yield* deleteGen(35);
  yield* deleteGen(25);
  yield* deleteGen(20);
  yield S(() => {
    status.textContent = 'B 树演示完成：插入 9 键（分裂×3），查找 18 命中，删除 5/12/10（合并级联）、35、25（借键）、20（合并）；所有叶同深，查找/插入/删除 O(log n)';
  });
}

engine.queue(() => runBTree());
panel.addButton('清空', () => { engine.clear(); clearView(); root = null; status.textContent = ''; });

scene.start(engine);
