// AlgorithmLibrary/BPlusTree3D.js — B+ 树（3 阶）：内部多键卡片 + 叶层链（兄弟横向连接）+ 分裂复制键上移/借键/合并（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme, glowMaterial } from '../3D/Glow.js';
applyTheme('BPlusTree3D');

const scene = new Scene3D('scene', { cameraPos: [0, 200, 700], fov: 55 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, INDIGO = 0x818cf8, GOLD = 0xfcd34d, WHITE = 0xffffff, GREEN = 0x4ade80;
const hint = new VText(scene, { text: '点击「运行演示」开始：B+ 树内部节点 + 叶层链 + 分裂复制键上移', x: 0, y: 330, z: 0, color: PALETTE.textGlow, scale: 0.8 });
const status = panel.addStatus('就绪');
const outT = new VText(scene, { text: '', x: 0, y: 30, z: 0, color: PALETTE.textGlow, scale: 0.7 });

const MAX = 2, MIN = 1, LMAX = 3, LMIN = 1;  // 内部最多 2 键；叶最多 3 键
const LEAF_Y = -140;

// ---- 纯数据模型 ----
let nextId = 0;
const model = new Map();  // id -> node
let root = null, leafHead = null;
function mkInternal() { const n = { id: 'n' + (nextId++), keys: [], children: [], parent: null, isLeaf: false }; model.set(n.id, n); return n; }
function mkLeaf() { const n = { id: 'l' + (nextId++), keys: [], next: null, parent: null, isLeaf: true }; model.set(n.id, n); return n; }

function layout() {
  const pos = new Map();
  if (!root) return pos;
  // 内部节点：中序键的 x → 节点中心，深度 → y
  const all = [];
  (function ino(n) {
    if (n.isLeaf) return;
    for (let i = 0; i < n.children.length; i++) {
      ino(n.children[i]);
      if (i < n.keys.length) all.push({ n, k: n.keys[i] });
    }
  })(root);
  if (all.length) {
    const keyX = all.map((e, i) => (i - (all.length - 1) / 2) * 66);
    const keyIdx = new Map();
    all.forEach((e, i) => {
      const arr = keyIdx.get(e.n.id) || []; arr.push(keyX[i]); keyIdx.set(e.n.id, arr);
    });
    const depth = new Map();
    const q = [root]; depth.set(root.id, 0);
    while (q.length) {
      const n = q.shift();
      if (n.isLeaf) continue;
      for (const c of n.children) { if (!c.isLeaf) { depth.set(c.id, depth.get(n.id) + 1); q.push(c); } }
    }
    for (const [id, xs] of keyIdx) {
      pos.set(id, new THREE.Vector3(xs.reduce((a, b) => a + b, 0) / xs.length, 250 - depth.get(id) * 95, 0));
    }
  }
  // 叶层：链序中所有键 → 每叶中心 = 键均值，y = LEAF_Y
  const leaves = [];
  for (let l = leafHead; l; l = l.next) leaves.push(l);
  const allK = [];
  for (const l of leaves) for (const k of l.keys) allK.push(k);
  const xMap = new Map();
  allK.forEach((k, i) => xMap.set(k, (i - (allK.length - 1) / 2) * 66));
  for (const l of leaves) {
    let sum = 0;
    for (const k of l.keys) sum += xMap.get(k);
    pos.set(l.id, new THREE.Vector3(l.keys.length ? sum / l.keys.length : 0, LEAF_Y, 0));
  }
  return pos;
}

// ---- 视觉：内部 = 蓝色卡片，叶 = 靛色卡片 + 「叶」标 + 兄弟链 ----
const nodeView = new Map();  // id -> { g, box, lbl }
const edgeView = new Map();  // childId/chainId -> tube
function clearView() {
  nodeView.forEach(v => { scene.remove(v.g); v.box.geometry.dispose(); v.box.material.dispose(); });
  edgeView.forEach(m => { scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
  nodeView.clear(); edgeView.clear();
}
function addNodeVis(n, p) {
  const g = new THREE.Group();
  const c = n.isLeaf ? INDIGO : BLUE;
  const box = new THREE.Mesh(new THREE.BoxGeometry(34, 44, 14), glowMaterial(c, { emissive: c }));
  box.scale.x = Math.max(n.keys.length, 1);
  g.add(box);
  const lbl = new VText(scene, { text: n.keys.join('|'), x: 0, y: 0, z: 10, color: '#ffffff', scale: 0.62 });
  scene.remove(lbl.sprite); g.add(lbl.sprite);
  if (n.isLeaf) {
    const tag = new VText(scene, { text: '叶', x: 0, y: 36, z: 0, color: '#94a3b8', scale: 0.5 });
    scene.remove(tag.sprite); g.add(tag.sprite);
  }
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
function resetColors() {
  nodeView.forEach((v, id) => {
    const c = model.get(id).isLeaf ? INDIGO : BLUE;
    v.box.material.color.setHex(c); v.box.material.emissive.setHex(c);
  });
}
function tube(a, b, opts = {}) {
  const A = a.clone(), B = b.clone();
  const mid = new THREE.Vector3((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2 + (opts.lift ?? 18));
  const curve = new THREE.CatmullRomCurve3([A, mid, B]);
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, opts.r ?? 2, 6), new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: opts.op ?? 0.7 }));
  scene.add(m);
  return m;
}
function syncEdges() {
  edgeView.forEach(m => { scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
  edgeView.clear();
  (function walk(n) {
    if (n.isLeaf) return;
    for (const c of n.children) { edgeView.set(c.id, tube(nodeView.get(n.id).g.position, nodeView.get(c.id).g.position)); walk(c); }
  })(root);
  for (let l = leafHead; l && l.next; l = l.next) edgeView.set('chain-' + l.id, tube(nodeView.get(l.id).g.position, nodeView.get(l.next.id).g.position, { lift: 6, r: 1.8, op: 0.45 }));
}
function* moveToLayout() {
  const pos = layout();
  const tasks = [];
  nodeView.forEach((v, id) => {
    const p = pos.get(id);
    if (p && v.g.position.distanceTo(p) >= 0.5) tasks.push({ v, from: v.g.position.clone(), to: p });
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

// ---- 插入：下钻 → 写叶 → 叶分裂（副本键上移）→ 内部级联 ----
function* insertGen(key) {
  yield S(() => outT.setText('插入 ' + key + '：沿路径下钻到叶'));
  if (!root) {
    root = mkLeaf(); leafHead = root;
    root.keys.push(key);
    addNodeVis(root, layout().get(root.id));
    yield* popIn(nodeView.get(root.id).g);
    yield W(250);
    return;
  }
  let n = root;
  while (!n.isLeaf) {
    setNodeColor(n.id, GOLD);
    yield W(200);
    let i = 0; while (i < n.keys.length && n.keys[i] < key) i++;
    n = n.children[i];
  }
  setNodeColor(n.id, GOLD);
  yield W(200);
  let i = 0; while (i < n.keys.length && n.keys[i] < key) i++;
  if (i < n.keys.length && n.keys[i] === key) { yield S(() => outT.setText(key + ' 已存在，中止')); yield W(400); resetColors(); return; }
  n.keys.splice(i, 0, key);
  refreshNodeVisual(n);
  yield S(() => outT.setText('叶节点写入 ' + key + '（当前 ' + n.keys.join('|') + '）'));
  yield W(400);
  if (n.keys.length > LMAX) {
    yield S(() => outT.setText('叶溢出（>3 键）→ 分裂'));
    yield W(450);
    yield* splitLeafGen(n);
  }
  resetColors();
  yield W(180);
}
function* splitLeafGen(leaf) {
  const mid = Math.floor(leaf.keys.length / 2);
  const right = mkLeaf();
  right.keys = leaf.keys.slice(mid);
  leaf.keys = leaf.keys.slice(0, mid);
  right.next = leaf.next;
  leaf.next = right;
  const promoted = right.keys[0];
  refreshNodeVisual(leaf);
  const from = nodeView.get(leaf.id).g.position.clone();
  addNodeVis(right, from.clone().add(new THREE.Vector3(70, 0, 0)));
  yield* popIn(nodeView.get(right.id).g);
  yield S(() => outT.setText('叶分裂：副本键 ' + promoted + ' 复制上移（B+ 特征）'));
  yield W(450);
  if (!leaf.parent) {
    const nr = mkInternal();
    nr.keys = [promoted]; nr.children = [leaf, right];
    leaf.parent = nr; right.parent = nr;
    root = nr;
    addNodeVis(nr, from.clone().add(new THREE.Vector3(0, 90, 0)));
    yield* popIn(nodeView.get(nr.id).g);
    yield S(() => outT.setText('新根生成，含副本键 ' + promoted));
    yield* moveToLayout();
    yield W(450);
  } else {
    const parent = leaf.parent;
    let i = 0; while (i < parent.keys.length && parent.keys[i] < promoted) i++;
    parent.keys.splice(i, 0, promoted);
    parent.children.splice(i + 1, 0, right);
    right.parent = parent;
    const fromL = nodeView.get(leaf.id).g.position.clone();
    const toP = nodeView.get(parent.id).g.position.clone();
    yield* flyLabel(String(promoted), fromL, toP);
    refreshNodeVisual(parent);
    setNodeColor(parent.id, GOLD);
    yield S(() => outT.setText('副本键 ' + promoted + ' 飞行上移进内部节点'));
    yield* moveToLayout();
    yield W(450);
    if (parent.keys.length > MAX) {
      yield S(() => outT.setText('内部节点溢出 → 级联分裂'));
      yield W(400);
      yield* splitInternalGen(parent);
    }
  }
}
function* splitInternalGen(n) {
  const mid = Math.floor(n.keys.length / 2);
  const promoted = n.keys[mid];
  const right = mkInternal();
  right.keys = n.keys.slice(mid + 1);
  right.parent = n.parent;
  right.children = n.children.slice(mid + 1);
  for (const c of right.children) c.parent = right;
  n.children = n.children.slice(0, mid + 1);
  n.keys = n.keys.slice(0, mid);
  refreshNodeVisual(n);
  const from = nodeView.get(n.id).g.position.clone();
  addNodeVis(right, from.clone().add(new THREE.Vector3(0, -70, 0)));
  yield* popIn(nodeView.get(right.id).g);
  yield S(() => outT.setText('内部分裂：键 ' + promoted + ' 上移，右半区生成新节点'));
  yield W(450);
  if (!n.parent) {
    const nr = mkInternal();
    nr.keys = [promoted]; nr.children = [n, right];
    n.parent = nr; right.parent = nr;
    root = nr;
    addNodeVis(nr, from.clone().add(new THREE.Vector3(0, -70, 0)));
    yield* popIn(nodeView.get(nr.id).g);
    yield S(() => outT.setText('根分裂：新根生成'));
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
    yield S(() => outT.setText('键 ' + promoted + ' 上移进父节点'));
    yield* moveToLayout();
    yield W(450);
    if (parent.keys.length > MAX) yield* splitInternalGen(parent);
  }
}

// ---- 查找：内部下钻 → 叶命中绿闪 ----
function* searchGen(key) {
  yield S(() => outT.setText('查找 ' + key + '：内部节点下钻到叶层'));
  let n = root;
  while (!n.isLeaf) {
    setNodeColor(n.id, GOLD);
    yield W(220);
    let i = 0; while (i < n.keys.length && n.keys[i] < key) i++;
    n = n.children[i];
  }
  setNodeColor(n.id, GOLD);
  yield W(220);
  const found = n.keys.includes(key);
  if (found) {
    const v = nodeView.get(n.id);
    v.box.material.color.setHex(GREEN); v.box.material.emissive.setHex(GREEN);
    yield S(() => outT.setText('命中 ' + key + '！（叶节点绿色闪光）'));
    yield A(380, p => { v.g.scale.setScalar(1 + 0.15 * Math.sin(Math.PI * p)); });
    v.g.scale.setScalar(1);
  } else {
    yield S(() => outT.setText(key + ' 不存在'));
    yield W(400);
  }
  resetColors();
  yield W(150);
}

// ---- 删除：叶删键 → 叶借键 / 叶合并 + 内部下溢修复 ----
function* deleteGen(key) {
  let n = root;
  if (!n) { yield S(() => outT.setText('树为空')); yield W(300); return; }
  while (!n.isLeaf) {
    setNodeColor(n.id, GOLD);
    yield W(200);
    let i = 0; while (i < n.keys.length && n.keys[i] < key) i++;
    n = n.children[i];
  }
  setNodeColor(n.id, GOLD);
  yield W(200);
  const i = n.keys.indexOf(key);
  if (i < 0) { yield S(() => outT.setText(key + ' 不存在')); yield W(400); resetColors(); return; }
  n.keys.splice(i, 1);
  refreshNodeVisual(n);
  yield S(() => outT.setText('删除叶键 ' + key + '（剩 ' + (n.keys.length ? n.keys.join('|') : '空') + '）'));
  yield W(400);
  yield* rebalanceLeafGen(n);
  resetColors();
  yield W(200);
}
function* rebalanceLeafGen(n) {
  if (n === root) {
    if (n.keys.length === 0) {
      root = null; leafHead = null;
      yield* shrinkOut(n.id);
      yield S(() => outT.setText('树清空'));
    }
    return;
  }
  if (n.keys.length >= LMIN) return;
  const parent = n.parent;
  const idx = parent.children.indexOf(n);
  const left = idx > 0 ? parent.children[idx - 1] : null;
  const right = idx < parent.children.length - 1 ? parent.children[idx + 1] : null;
  const fromN = nodeView.get(n.id).g.position.clone();
  if (left && left.keys.length > LMIN) {
    const moved = left.keys.pop();
    n.keys.unshift(moved);
    parent.keys[idx - 1] = n.keys[0];
    const fromL = nodeView.get(left.id).g.position.clone();
    yield* flyLabel(String(moved), fromL, fromN);
    refreshNodeVisual(parent); refreshNodeVisual(left); refreshNodeVisual(n);
    setNodeColor(parent.id, GOLD);
    yield S(() => outT.setText('叶借键：' + moved + ' 右移，父键更新为 ' + n.keys[0]));
    yield* moveToLayout();
    yield W(450);
  } else if (right && right.keys.length > LMIN) {
    const moved = right.keys.shift();
    n.keys.push(moved);
    parent.keys[idx] = right.keys[0];
    const fromR = nodeView.get(right.id).g.position.clone();
    yield* flyLabel(String(moved), fromR, fromN);
    refreshNodeVisual(parent); refreshNodeVisual(right); refreshNodeVisual(n);
    setNodeColor(parent.id, GOLD);
    yield S(() => outT.setText('叶借键：' + moved + ' 左移，父键更新为 ' + right.keys[0]));
    yield* moveToLayout();
    yield W(450);
  } else if (left) {
    left.keys.push(...n.keys);
    left.next = n.next;
    parent.keys.splice(idx - 1, 1);
    parent.children.splice(idx, 1);
    yield S(() => outT.setText('叶合并：并入左兄弟，父键删除'));
    yield W(350);
    yield* shrinkOut(n.id);
    refreshNodeVisual(left); refreshNodeVisual(parent);
    yield* moveToLayout();
    yield W(300);
    if (parent.keys.length < MIN) yield* rebalanceInternalGen(parent);
  } else {
    n.keys.push(...right.keys);
    n.next = right.next;
    parent.keys.splice(idx, 1);
    parent.children.splice(idx + 1, 1);
    yield S(() => outT.setText('叶合并：右兄弟并入本叶，父键删除'));
    yield W(350);
    yield* shrinkOut(right.id);
    refreshNodeVisual(n); refreshNodeVisual(parent);
    yield* moveToLayout();
    yield W(300);
    if (parent.keys.length < MIN) yield* rebalanceInternalGen(parent);
  }
}
function* rebalanceInternalGen(n) {
  if (n === root) {
    if (n.keys.length === 0 && n.children.length === 1) {
      const c = n.children[0];
      root = c; c.parent = null;
      yield S(() => outT.setText('根空 → 孩子上提，树高 -1'));
      yield* shrinkOut(n.id);
      yield* moveToLayout();
      yield W(400);
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
    yield S(() => outT.setText('内部借键：' + lastK + ' 上移，' + moved + ' 下沉'));
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
    yield S(() => outT.setText('内部借键：' + firstK + ' 上移，' + moved + ' 下沉'));
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
      yield S(() => outT.setText('内部合并：' + midK + ' 下沉，节点并入左兄弟'));
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
      yield S(() => outT.setText('内部合并：' + midK + ' 下沉，右兄弟并入'));
      yield W(350);
      yield* shrinkOut(sib.id);
      refreshNodeVisual(n); refreshNodeVisual(parent);
    }
    yield* moveToLayout();
    yield W(350);
    if (parent.keys.length < MIN) yield* rebalanceInternalGen(parent);
  }
}

function* runBPlus() {
  clearView(); root = null;
  hint.setText('B+ 树：键只存于叶层，内部存副本；叶链支持范围查询');
  yield W(400);
  for (const k of [20, 10, 30, 5, 15, 25, 35, 12, 18, 17, 33]) yield* insertGen(k);
  yield S(() => outT.setText('11 键插入完成（叶分裂×3 + 内部级联×1）'));
  yield W(450);
  yield* searchGen(33);
  yield* deleteGen(5);
  yield* deleteGen(10);
  yield* deleteGen(17);
  yield* deleteGen(18);
  yield* deleteGen(20);
  yield* deleteGen(33);
  yield* deleteGen(30);
  const chain = [];
  for (let l = leafHead; l; l = l.next) chain.push(l.keys.join('|'));
  yield S(() => {
    outT.setText('叶层链：' + chain.join(' → '));
    hint.setText('B+ 树完成：叶层有序链，范围查找只需沿链走 O(log n + k)');
    status.textContent = 'B+ 树演示完成：插入 11 键（叶分裂×3/内部级联×1），查找 33 命中，删除演示叶借键/叶合并/内部借键/根上提';
  });
}

panel.addButton('运行演示', () => engine.start(runBPlus()));
panel.addButton('清空', () => { engine.clear(); clearView(); root = null; leafHead = null; hint.setText('已清空，可重新运行'); status.textContent = ''; outT.setText(''); });
panel.addLabel('（拖拽旋转视角，滚轮缩放；蓝 = 内部节点，靛 = 叶，白链 = 叶层链）');

scene.start(engine);
