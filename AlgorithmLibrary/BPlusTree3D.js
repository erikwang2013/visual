// AlgorithmLibrary/BPlusTree3D.js — B+ 树（3 阶）：内部多键卡片 + 叶层链（兄弟横向连接）+ 分裂复制键上移/借键/合并（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText } from '../3D/VisualObject3D.js';
import { applyTheme, glowMaterial } from '../3D/Glow.js';
applyTheme('BPlusTree3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, INDIGO = 0x818cf8, GOLD = 0xfcd34d, WHITE = 0xffffff, GREEN = 0x4ade80;
const status = panel.addStatus('就绪');

const MAX = 2, MIN = 1, LMAX = 3, LMIN = 1;  // 内部最多 2 键；叶最多 3 键
const KEYX = 60, STEP_Y = 160, LEAF_Y = 350;
const E = p => p * p * (3 - 2 * p);  // smoothstep

// ---- 纯数据模型 ----
let nextId = 0;
const model = new Map();
let root = null, leafHead = null;
function mkInternal() { const n = { id: 'n' + (nextId++), keys: [], children: [], parent: null, isLeaf: false }; model.set(n.id, n); return n; }
function mkLeaf() { const n = { id: 'l' + (nextId++), keys: [], next: null, parent: null, isLeaf: true }; model.set(n.id, n); return n; }

// 布局：中序键的 x → 节点中心，深度 → y；位置写入模块级缓冲，运行时零分配
const posBuf = new Map();
function posAt(id, x, y) { let v = posBuf.get(id); if (!v) { v = new THREE.Vector3(); posBuf.set(id, v); } v.set(x, y, 0); return v; }
function layout() {
  if (!root) return posBuf;
  const all = [];
  (function ino(n) {
    if (n.isLeaf) return;
    for (let i = 0; i < n.children.length; i++) { ino(n.children[i]); if (i < n.keys.length) all.push({ n, k: n.keys[i] }); }
  })(root);
  const keyX = all.map((e, i) => (i - (all.length - 1) / 2) * KEYX + 320);
  const keyIdx = new Map();
  all.forEach((e, i) => { const arr = keyIdx.get(e.n.id) || []; arr.push(keyX[i]); keyIdx.set(e.n.id, arr); });
  const depth = new Map();
  const q = [root]; depth.set(root.id, 0);
  while (q.length) {
    const n = q.shift();
    if (n.isLeaf) continue;
    for (const c of n.children) { depth.set(c.id, depth.get(n.id) + 1); q.push(c); }
  }
  for (const [id, xs] of keyIdx) posAt(id, xs.reduce((a, b) => a + b, 0) / xs.length, 830 - depth.get(id) * STEP_Y);
  const allK = [];
  for (let l = leafHead; l; l = l.next) for (const k of l.keys) allK.push(k);
  const xMap = new Map();
  allK.forEach((k, i) => xMap.set(k, (i - (allK.length - 1) / 2) * KEYX + 320));
  for (let l = leafHead; l; l = l.next) {
    let sum = 0;
    for (const k of l.keys) sum += xMap.get(k);
    posAt(l.id, l.keys.length ? sum / l.keys.length : 320, LEAF_Y);
  }
  return posBuf;
}

// ---- 视觉：对象池模块级预建（8 叶 + 6 内，覆盖演示峰值 5 叶 + 3 内），运行时零 new ----
const nodeView = new Map();  // id -> { g, box, lbl, kind }
const leafPool = [], intPool = [];
let leafFree = [], intFree = [];
function mkEntry(kind) {
  const g = new THREE.Group(), c = kind === 'leaf' ? INDIGO : BLUE;
  const box = new THREE.Mesh(new THREE.BoxGeometry(34, 44, 14), glowMaterial(c, { emissive: c }));
  box.scale.x = 0.9; g.add(box);
  const lbl = new VText(scene, { text: '', x: 0, y: 0, z: 10, color: '#ffffff', scale: 0.62 });
  scene.remove(lbl.sprite); g.add(lbl.sprite);
  if (kind === 'leaf') {
    const tag = new VText(scene, { text: '叶', x: 0, y: 36, z: 0, color: '#94a3b8', scale: 0.5 });
    scene.remove(tag.sprite); g.add(tag.sprite);
  }
  g.scale.setScalar(0.01); g.visible = false; scene.add(g);
  const e = { g, box, lbl, kind };
  (kind === 'leaf' ? leafPool : intPool).push(e);
  return e;
}
function resetFree() {
  leafFree = [...leafPool]; intFree = [...intPool];
  leafPool.concat(intPool).forEach(e => { e.g.visible = false; e.g.scale.setScalar(0.01); });
}
function clearView() {
  resetFree();
  edgePool.forEach(m => { m.visible = false; });
  flyPool.forEach(t => { t.sprite.visible = false; });
  nodeView.clear();
}
function addNodeVis(n, p) {
  const e = (n.isLeaf ? leafFree : intFree).pop();
  if (!e) return null;
  e.g.position.copy(p);
  e.g.visible = true;
  e.g.scale.setScalar(0.01);
  e.lbl.setText(n.keys.join('|'));
  e.box.scale.x = Math.max(n.keys.length, 1) * 0.9;
  const c = n.isLeaf ? INDIGO : BLUE;
  e.box.material.color.setHex(c); e.box.material.emissive.setHex(c);
  nodeView.set(n.id, e);
  return e.g;
}
function refreshNodeVisual(n) {
  const v = nodeView.get(n.id);
  if (!v) return;
  v.box.scale.x = Math.max(n.keys.length, 1) * 0.9;
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

// 边：节点间曲线管 + 叶层兄弟链
const edgePool = [];
function tube(a, b, lift, r, op) {
  const mid = new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2 + lift);
  const curve = new THREE.CatmullRomCurve3([a, mid, b]);
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, r, 6), new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: op }));
  m.visible = false; scene.add(m); edgePool.push(m);
  return m;
}
function syncEdges() {
  edgePool.forEach(m => { m.visible = false; });
  (function walk(n) {
    if (n.isLeaf) return;
    for (const c of n.children) { tube(nodeView.get(n.id).g.position, nodeView.get(c.id).g.position, 18, 2, 0.7); walk(c); }
  })(root);
  for (let l = leafHead; l && l.next; l = l.next)
    tube(nodeView.get(l.id).g.position, nodeView.get(l.next.id).g.position, 6, 1.8, 0.45);
}

// 运动：任务记录/飞行标签/位移走预建池
const TASK_POOL = Array.from({ length: 30 }, () => ({ v: null, from: new THREE.Vector3(), to: new THREE.Vector3() }));
const SV = new THREE.Vector3(), SV2 = new THREE.Vector3(), OFF = new THREE.Vector3();
function offs(src, dx, dy, dz) { OFF.copy(src); OFF.x += dx; OFF.y += dy; OFF.z += dz; return OFF; }
function* moveToLayout() {
  const pos = layout();
  const tasks = [];
  let ti = 0;
  nodeView.forEach((v, id) => {
    const p = pos.get(id);
    if (!p || v.g.position.distanceTo(p) < 0.5) return;
    const t = TASK_POOL[ti++];
    t.v = v; t.from.copy(v.g.position); t.to.copy(p);
    tasks.push(t);
  });
  if (!tasks.length) { syncEdges(); return; }
  yield A(440, pp => tasks.forEach(t => t.v.g.position.lerpVectors(t.from, t.to, E(pp))));
  syncEdges();
}
function* popIn(g) { if (!g) return; yield A(420, p => g.scale.setScalar(0.01 + 0.99 * E(p))); }
function* shrinkOut(id) {
  const v = nodeView.get(id);
  if (!v) return;
  yield A(320, p => v.g.scale.setScalar(1 - E(p)));
  v.g.visible = false;
  (v.kind === 'leaf' ? leafFree : intFree).push(v);
  nodeView.delete(id);
  model.delete(id);
}
const flyPool = Array.from({ length: 4 }, () => { const t = new VText(scene, { text: '', x: 0, y: 0, z: 0, color: '#fcd34d', scale: 0.75 }); t.sprite.visible = false; return t; });
let flyIdx = 0;
function* flyLabel(text, from, to) {
  const t = flyPool[flyIdx++ % flyPool.length];
  t.setText(text);
  t.sprite.position.copy(from);
  t.sprite.visible = true;
  yield A(400, p => t.sprite.position.lerpVectors(from, to, E(p)));
  t.sprite.visible = false;
}
for (let i = 0; i < 8; i++) mkEntry('leaf');
for (let i = 0; i < 6; i++) mkEntry('int');
resetFree();

// ---- 插入：下钻 → 写叶 → 叶分裂（副本键上移）→ 内部级联 ----
function* insertGen(key) {
  yield S(() => { status.textContent = '插入 ' + key + '：沿路径下钻到叶'; });
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
  if (i < n.keys.length && n.keys[i] === key) { yield S(() => { status.textContent = key + ' 已存在，中止'; }); yield W(400); resetColors(); return; }
  n.keys.splice(i, 0, key);
  refreshNodeVisual(n);
  yield S(() => { status.textContent = '叶节点写入 ' + key + '（当前 ' + n.keys.join('|') + '）'; });
  yield W(400);
  if (n.keys.length > LMAX) {
    yield S(() => { status.textContent = '叶溢出（>3 键）→ 分裂'; });
    yield W(450);
    yield* splitGen(n);
  }
  resetColors();
  yield W(180);
}
function* splitGen(n) {
  const isLeaf = n.isLeaf, mid = Math.floor(n.keys.length / 2);
  const promoted = n.keys[mid];
  const right = isLeaf ? mkLeaf() : mkInternal();
  right.keys = n.keys.slice(isLeaf ? mid : mid + 1);
  if (isLeaf) { right.next = n.next; n.next = right; }
  else {
    right.parent = n.parent;
    right.children = n.children.slice(mid + 1);
    for (const c of right.children) c.parent = right;
    n.children = n.children.slice(0, mid + 1);
  }
  n.keys = n.keys.slice(0, mid);
  refreshNodeVisual(n);
  SV.copy(nodeView.get(n.id).g.position);
  addNodeVis(right, offs(SV, 0, -70, 0));
  yield* popIn(nodeView.get(right.id).g);
  yield S(() => { status.textContent = isLeaf ? '叶分裂：副本键 ' + promoted + ' 复制上移（B+ 特征，键仍存叶层）' : '内部分裂：键 ' + promoted + ' 上移，右半区生成新节点'; });
  yield W(450);
  if (!n.parent) {
    const nr = mkInternal();
    nr.keys = [promoted]; nr.children = [n, right];
    n.parent = nr; right.parent = nr;
    root = nr;
    SV.copy(nodeView.get(n.id).g.position);
    addNodeVis(nr, offs(SV, 0, -70, 0));
    yield* popIn(nodeView.get(nr.id).g);
    yield S(() => { status.textContent = '根分裂：新根生成，含键 ' + promoted; });
    yield* moveToLayout();
    yield W(450);
  } else {
    const parent = n.parent;
    let i = 0; while (i < parent.keys.length && parent.keys[i] < promoted) i++;
    parent.keys.splice(i, 0, promoted);
    parent.children.splice(i + 1, 0, right);
    right.parent = parent;
    SV.copy(nodeView.get(n.id).g.position);
    SV2.copy(nodeView.get(parent.id).g.position);
    yield* flyLabel(String(promoted), SV, SV2);
    refreshNodeVisual(parent);
    setNodeColor(parent.id, GOLD);
    yield S(() => { status.textContent = (isLeaf ? '副本键 ' : '键 ') + promoted + ' 飞行上移进内部节点'; });
    yield* moveToLayout();
    yield W(450);
    if (parent.keys.length > MAX) {
      yield S(() => { status.textContent = '父（内部）节点溢出 → 级联分裂'; });
      yield W(400);
      yield* splitGen(parent);
    }
  }
}

// ---- 查找：内部下钻 → 叶命中绿闪 ----
function* searchGen(key) {
  yield S(() => { status.textContent = '查找 ' + key + '：内部节点下钻到叶层'; });
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
    yield S(() => { status.textContent = '命中 ' + key + '！（叶节点绿色闪光）'; });
    yield A(380, p => { v.g.scale.setScalar(1 + 0.15 * Math.sin(Math.PI * p)); });
    v.g.scale.setScalar(1);
  } else {
    yield S(() => { status.textContent = key + ' 不存在'; });
    yield W(400);
  }
  resetColors();
  yield W(150);
}

// ---- 删除：叶删键 → 叶借键 / 叶合并 + 内部下溢修复 ----
function* deleteGen(key) {
  let n = root;
  if (!n) { yield S(() => { status.textContent = '树为空'; }); yield W(300); return; }
  while (!n.isLeaf) {
    setNodeColor(n.id, GOLD);
    yield W(200);
    let i = 0; while (i < n.keys.length && n.keys[i] < key) i++;
    n = n.children[i];
  }
  setNodeColor(n.id, GOLD);
  yield W(200);
  const i = n.keys.indexOf(key);
  if (i < 0) { yield S(() => { status.textContent = key + ' 不存在'; }); yield W(400); resetColors(); return; }
  n.keys.splice(i, 1);
  refreshNodeVisual(n);
  yield S(() => { status.textContent = '删除叶键 ' + key + '（剩 ' + (n.keys.length ? n.keys.join('|') : '空') + '）'; });
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
      yield S(() => { status.textContent = '树清空'; });
      yield W(300);
    }
    return;
  }
  if (n.keys.length >= LMIN) return;
  const parent = n.parent;
  const idx = parent.children.indexOf(n);
  const left = idx > 0 ? parent.children[idx - 1] : null;
  const right = idx < parent.children.length - 1 ? parent.children[idx + 1] : null;
  SV.copy(nodeView.get(n.id).g.position);
  if (left && left.keys.length > LMIN) {
    const moved = left.keys.pop();
    n.keys.unshift(moved);
    parent.keys[idx - 1] = n.keys[0];
    SV2.copy(nodeView.get(left.id).g.position);
    yield* flyLabel(String(moved), SV2, SV);
    refreshNodeVisual(parent); refreshNodeVisual(left); refreshNodeVisual(n);
    setNodeColor(parent.id, GOLD);
    yield S(() => { status.textContent = '叶借键：' + moved + ' 右移，父键更新为 ' + n.keys[0]; });
    yield* moveToLayout();
    yield W(450);
  } else if (right && right.keys.length > LMIN) {
    const moved = right.keys.shift();
    n.keys.push(moved);
    parent.keys[idx] = right.keys[0];
    SV2.copy(nodeView.get(right.id).g.position);
    yield* flyLabel(String(moved), SV2, SV);
    refreshNodeVisual(parent); refreshNodeVisual(right); refreshNodeVisual(n);
    setNodeColor(parent.id, GOLD);
    yield S(() => { status.textContent = '叶借键：' + moved + ' 左移，父键更新为 ' + right.keys[0]; });
    yield* moveToLayout();
    yield W(450);
  } else if (left) {
    left.keys.push(...n.keys);
    left.next = n.next;
    parent.keys.splice(idx - 1, 1);
    parent.children.splice(idx, 1);
    yield S(() => { status.textContent = '叶合并：并入左兄弟，父键删除'; });
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
    yield S(() => { status.textContent = '叶合并：右兄弟并入本叶，父键删除'; });
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
      yield S(() => { status.textContent = '根空 → 孩子上提，树高 -1'; });
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
  SV.copy(nodeView.get(n.id).g.position);
  SV2.copy(nodeView.get(parent.id).g.position);
  if (left && left.keys.length > MIN) {
    const moved = parent.keys[idx - 1];
    const lastK = left.keys[left.keys.length - 1];
    parent.keys[idx - 1] = left.keys.pop();
    n.keys.unshift(moved);
    if (left.children.length) { const c = left.children.pop(); n.children.unshift(c); c.parent = n; }
    SV.copy(nodeView.get(left.id).g.position);
    yield* flyLabel(String(lastK), SV, SV2);
    SV.copy(nodeView.get(n.id).g.position);
    yield* flyLabel(String(moved), SV2, SV);
    refreshNodeVisual(parent); refreshNodeVisual(left); refreshNodeVisual(n);
    yield S(() => { status.textContent = '内部借键：' + lastK + ' 上移，' + moved + ' 下沉'; });
    yield* moveToLayout();
    yield W(450);
  } else if (right && right.keys.length > MIN) {
    const moved = parent.keys[idx];
    const firstK = right.keys[0];
    parent.keys[idx] = right.keys.shift();
    n.keys.push(moved);
    if (right.children.length) { const c = right.children.shift(); n.children.push(c); c.parent = n; }
    SV.copy(nodeView.get(right.id).g.position);
    yield* flyLabel(String(firstK), SV, SV2);
    SV.copy(nodeView.get(n.id).g.position);
    yield* flyLabel(String(moved), SV2, SV);
    refreshNodeVisual(parent); refreshNodeVisual(right); refreshNodeVisual(n);
    yield S(() => { status.textContent = '内部借键：' + firstK + ' 上移，' + moved + ' 下沉'; });
    yield* moveToLayout();
    yield W(450);
  } else {
    const sib = left || right;
    SV.copy(nodeView.get(sib.id).g.position);
    if (left) {
      const midK = parent.keys[idx - 1];
      left.keys.push(midK, ...n.keys);
      left.children.push(...n.children);
      for (const c of n.children) c.parent = left;
      parent.keys.splice(idx - 1, 1);
      parent.children.splice(idx, 1);
      yield* flyLabel(String(midK), SV2, SV);
      yield S(() => { status.textContent = '内部合并：' + midK + ' 下沉，节点并入左兄弟'; });
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
      yield* flyLabel(String(midK), SV2, SV);
      yield S(() => { status.textContent = '内部合并：' + midK + ' 下沉，右兄弟并入'; });
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
  clearView(); root = null; leafHead = null; nextId = 0; model.clear();
  yield S(() => { status.textContent = 'B+ 树（3 阶）演示：蓝 = 内部节点（存副本键），靛 = 叶节点（存全部键），白管 = 叶层兄弟链；键只存叶层，内部存副本'; });
  yield W(400);
  for (const k of [20, 10, 30, 5, 15, 25, 35, 12, 18, 17, 33]) yield* insertGen(k);
  yield S(() => { status.textContent = '11 键插入完成：3 次叶分裂（副本键上移）+ 1 次内部级联分裂'; });
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
  yield S(() => { status.textContent = 'B+ 树演示完成：插入 11 键（叶分裂×3/内部级联×1），查找 33 命中，删除演示叶借键/叶合并/内部借键/根上提；叶层链 ' + chain.join(' → ') + '，范围查找只需沿链走 O(log n + k)'; });
  yield W(800);
}

engine.queue(() => runBPlus());
panel.addButton('清空', () => { engine.clear(); clearView(); root = null; leafHead = null; nextId = 0; model.clear(); status.textContent = ''; });

scene.start(engine);
