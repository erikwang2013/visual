// AlgorithmLibrary/RadixTree3D.js — 基数树（压缩前缀树）：边标签=公共前缀；插入触发边分裂（旧边拆→中间节点飞入→两条新边）；删除收缩/合并（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VNode } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
applyTheme('RadixTree3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, RED = 0xfb7185, GREEN = 0x4ade80, WHITE = 0xffffff;
const status = panel.addStatus('就绪');

const ROOT_Y = 830, STEP_Y = 100, X_GAP = 90;
const E = p => p * p * (3 - 2 * p);
let nextId = 0;
const model = new Map();  // id -> { id, end, parent, children: Map(label->node) }
const root = { id: 'root', end: false, parent: null, children: new Map() };
model.set(root.id, root);
function mkNode() { const n = { id: 'n' + (nextId++), end: false, parent: null, children: new Map() }; model.set(n.id, n); return n; }
function lcp(a, b) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return a.slice(0, i);
}

// ---- 布局：BFS 分层，层内均分；位置写模块级缓冲，运行时零分配 ----
const posBuf = new Map();
function posAt(id, x, y) { let v = posBuf.get(id); if (!v) { v = new THREE.Vector3(); posBuf.set(id, v); } v.set(x, y, 0); return v; }
function layout() {
  const byDepth = [];
  const q = [root];
  root.depth = 0;
  while (q.length) {
    const n = q.shift();
    (byDepth[n.depth] = byDepth[n.depth] || []).push(n);
    for (const c of n.children.values()) { c.depth = n.depth + 1; q.push(c); }
  }
  for (const d in byDepth) {
    const arr = byDepth[d];
    arr.forEach((n, i) => posAt(n.id, 320 + (i - (arr.length - 1) / 2) * X_GAP, ROOT_Y - STEP_Y * n.depth));
  }
  return posBuf;
}

// ---- 视觉对象池：节点球 / 边管+边标签，模块级预建（峰值 9 节点 8 边，池 10） ----
const nodePool = [], nodeFree = [];
function mkNodeVis() {
  const vn = new VNode(scene, { radius: 17, x: 0, y: 0, z: 0, label: '', color: BLUE, emissive: BLUE });
  vn.mesh.visible = false;
  vn.mesh.scale.setScalar(0.01);
  nodePool.push(vn);
  return vn;
}
const edgePool = [], edgeFree = [];
function mkEdgeObj() {
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(2, 0, 0)]);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 2, 6), new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.7 }));
  tube.visible = false;
  scene.add(tube);
  const lbl = new VText(scene, { text: '', x: 0, y: 0, z: 0, color: '#ffffff', scale: 0.6 });
  lbl.sprite.visible = false;
  const e = { tube, lbl, curve };
  edgePool.push(e);
  return e;
}
function resetFree() {
  nodeFree.length = 0; nodePool.forEach(v => { v.mesh.visible = false; v.mesh.scale.setScalar(0.01); });
  nodeFree.push(...nodePool);
  edgeFree.length = 0; edgeFree.push(...edgePool);
  edgePool.forEach(e => { e.tube.visible = false; e.lbl.sprite.visible = false; });
}
function clearView() {
  resetFree();
  nodeView.clear();
}
const nodeView = new Map();  // id -> VNode
function addNodeVis(id, p) {
  const vn = nodeFree.pop();
  if (!vn) return;
  vn.mesh.position.copy(p);
  vn.mesh.scale.setScalar(0.01);
  vn.mesh.visible = true;
  vn.setText('');
  vn.setColor(BLUE, BLUE);
  nodeView.set(id, vn);
  return vn;
}
function setNodeColor(id, c) { nodeView.get(id).setColor(c, c); }
function setEnd(id) { const v = nodeView.get(id); v.setColor(GOLD, GOLD); v.setText('★'); }
function resetNodeColors() { nodeView.forEach((v, id) => { const n = model.get(id); v.setColor(n && n.end ? GOLD : BLUE, n && n.end ? GOLD : BLUE); }); }
function syncEdges() {
  edgeFree.length = 0; edgeFree.push(...edgePool);
  (function walk(n) {
    for (const [label, c] of n.children) {
      if (!nodeView.has(c.id)) continue;
      const e = edgeFree.pop();
      if (!e) continue;
      const a = nodeView.get(n.id).mesh.position, b = nodeView.get(c.id).mesh.position;
      e.curve.points[0].copy(a);
      e.curve.points[1].set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2 + 18);
      e.curve.points[2].copy(b);
      e.tube.geometry.dispose();
      e.tube.geometry = new THREE.TubeGeometry(e.curve, 10, 2, 6);
      e.tube.visible = true;
      e.lbl.setText(label);
      e.lbl.sprite.position.set((a.x + b.x) / 2, (a.y + b.y) / 2 - 16, (a.z + b.z) / 2);
      e.lbl.sprite.visible = true;
      walk(c);
    }
  })(root);
}

// 运动：任务记录 / 位移走预建池（SV/SV2 为插入用 scratch）
const TASK_POOL = Array.from({ length: 20 }, () => ({ v: null, from: new THREE.Vector3(), to: new THREE.Vector3() }));
const SV = new THREE.Vector3(), SV2 = new THREE.Vector3();
function* moveToLayout() {
  const pos = layout();
  const tasks = [];
  let ti = 0;
  nodeView.forEach((v, id) => {
    const p = pos.get(id);
    if (!p || v.mesh.position.distanceTo(p) < 0.5) return;
    const t = TASK_POOL[ti++];
    t.v = v; t.from.copy(v.mesh.position); t.to.copy(p);
    tasks.push(t);
  });
  if (!tasks.length) { syncEdges(); return; }
  yield A(460, pp => tasks.forEach(t => t.v.mesh.position.lerpVectors(t.from, t.to, E(pp))));
  syncEdges();
}
function* popIn(id, from, to) {
  const vn = nodeView.get(id);
  vn.mesh.position.copy(from);
  yield A(420, pp => {
    vn.mesh.position.lerpVectors(from, to, E(pp));
    vn.mesh.scale.setScalar(0.01 + 0.99 * E(pp));
  });
  vn.mesh.scale.setScalar(1);
}
function* shrinkOut(id) {
  const vn = nodeView.get(id);
  if (!vn) return;
  yield A(320, p => vn.mesh.scale.setScalar(1 - E(p)));
  vn.mesh.visible = false;
  nodeFree.push(vn);
  nodeView.delete(id);
  model.delete(id);
}

// ---- 插入：路径下钻 → 边分裂 → 新叶生成 → 端节点标记 ----
function insertModel(word) {
  const lit = [], splits = [], created = [];
  let cur = root, rem = word;
  while (rem.length > 0) {
    let handled = false;
    for (const [label, child] of cur.children) {
      const common = lcp(rem, label);
      if (!common) continue;
      if (common.length === label.length) {
        lit.push([cur.id, child.id]);
        cur = child;
        rem = rem.slice(common.length);
        handled = true;
        break;
      }
      const rest = label.slice(common.length);
      const mid = mkNode();
      mid.parent = cur;
      splits.push({ parent: cur, oldLabel: label, oldChild: child, mid, rest, common });
      cur.children.delete(label);
      cur.children.set(common, mid);
      mid.children.set(rest, child);
      child.parent = mid;
      lit.push([cur.id, mid.id]);
      cur = mid;
      rem = rem.slice(common.length);
      handled = true;
      break;
    }
    if (!handled) {
      const child = mkNode();
      child.parent = cur;
      created.push({ parent: cur, label: rem, child });
      cur.children.set(rem, child);
      cur = child;
      rem = '';
    }
  }
  const existed = cur.end;
  cur.end = true;
  return { lit, splits, created, targetId: cur.id, existed };
}
function* insertGen(word) {
  yield S(() => { status.textContent = '插入 "' + word + '"'; });
  const { lit, splits, created, targetId } = insertModel(word);
  for (const [a, b] of lit) {
    if (nodeView.has(a)) setNodeColor(a, GOLD);
    if (nodeView.has(b)) setNodeColor(b, GOLD);
    yield W(200);
  }
  yield W(200);
  const pos = layout();
  for (const s of splits) {
    yield S(() => { status.textContent = '边分裂：剩余 "' + s.common + '" 与边 "' + s.oldLabel + '" 公共前缀 "' + s.common + '" → 拆出中间节点'; });
    yield W(350);
    SV.set((nodeView.get(s.parent.id).mesh.position.x + nodeView.get(s.oldChild.id).mesh.position.x) / 2, (nodeView.get(s.parent.id).mesh.position.y + nodeView.get(s.oldChild.id).mesh.position.y) / 2, 0);
    const to = pos.get(s.mid.id) || SV;
    addNodeVis(s.mid.id, SV);
    yield* popIn(s.mid.id, SV, to);
    yield S(() => { status.textContent = '中间节点就位：旧边 "' + s.oldLabel + '" 拆为 "' + s.common + '" + "' + s.rest + '"'; });
    yield* moveToLayout();
    yield W(400);
  }
  for (const c of created) {
    const to = pos.get(c.child.id);
    SV2.copy(to); SV2.y += 140;
    addNodeVis(c.child.id, SV2);
    yield S(() => { status.textContent = '新叶子 "' + c.label + '" 从上方降落'; });
    yield* popIn(c.child.id, SV2, to);
    yield W(250);
  }
  if (created.length === 0 && splits.length === 0) yield W(300);
  yield* moveToLayout();
  setEnd(targetId);
  yield S(() => { status.textContent = '插入完成：' + word + ' 端节点标记 ★（金色）'; });
  yield W(450);
  resetNodeColors();
  yield W(200);
}

// ---- 查找：金色路径下钻 ----
function* searchGen(word) {
  yield S(() => { status.textContent = '查找 "' + word + '"：沿边标签下钻'; });
  const lit = [];
  let cur = root, rem = word;
  while (rem.length > 0) {
    let next = null, nlabel = null;
    for (const [label, child] of cur.children) {
      const common = lcp(rem, label);
      if (common && common.length === label.length) { next = child; nlabel = label; break; }
    }
    if (!next) { yield S(() => { status.textContent = '无匹配边，' + word + ' 不存在（红闪）'; }); yield W(500); resetNodeColors(); return; }
    lit.push([cur.id, next.id]);
    cur = next;
    rem = rem.slice(nlabel.length);
  }
  for (const [a, b] of lit) { setNodeColor(a, GOLD); setNodeColor(b, GOLD); yield W(220); }
  if (cur.end) {
    setNodeColor(cur.id, GREEN);
    yield S(() => { status.textContent = '命中：' + word + ' 存在（绿色闪光）'; });
    yield W(500);
  } else {
    yield S(() => { status.textContent = '路径走完但非端节点：' + word + ' 不存在'; });
    yield W(500);
  }
  resetNodeColors();
}

// ---- 删除：端标记移除 → 收缩空节点 → 单子边压缩合并 ----
function* deleteGen(word) {
  yield S(() => { status.textContent = '删除 "' + word + '"：沿路径下钻'; });
  const trail = [];
  let cur = root, rem = word;
  while (rem.length > 0) {
    let next = null, nlabel = null;
    for (const [label, child] of cur.children) {
      const common = lcp(rem, label);
      if (common && common.length === label.length) { next = child; nlabel = label; break; }
    }
    if (!next) { yield S(() => { status.textContent = word + ' 不存在'; }); yield W(400); return; }
    trail.push([cur.id, next.id]);
    cur = next;
    rem = rem.slice(nlabel.length);
  }
  if (!cur.end) { yield S(() => { status.textContent = word + ' 不存在'; }); yield W(400); return; }
  for (const [a, b] of trail) { setNodeColor(a, GOLD); setNodeColor(b, GOLD); yield W(200); }
  cur.end = false;
  nodeView.get(cur.id).setText('');
  yield S(() => { status.textContent = '移除 ' + word + ' 的端标记（红闪）'; });
  setNodeColor(cur.id, RED);
  yield W(400);
  let node = cur;
  while (node !== root && node.children.size === 0) {
    const parent = node.parent;
    const lbl = [...parent.children.entries()].find(([, c]) => c === node)[0];
    parent.children.delete(lbl);
    yield S(() => { status.textContent = '节点变空：边 "' + lbl + '" 移除，节点收缩消失'; });
    yield* shrinkOut(node.id);
    yield* moveToLayout();
    yield W(350);
    node = parent;
  }
  if (node !== root && node.children.size === 1) {
    const parent = node.parent;
    const upLabel = [...parent.children.entries()].find(([, c]) => c === node)[0];
    const [downLabel, child] = [...node.children.entries()][0];
    parent.children.delete(upLabel);
    parent.children.set(upLabel + downLabel, child);
    child.parent = parent;
    yield S(() => { status.textContent = '单子压缩：边 "' + upLabel + '" 与 "' + downLabel + '" 合并为 "' + upLabel + downLabel + '"'; });
    yield* shrinkOut(node.id);
    yield* moveToLayout();
    yield W(400);
  }
  resetNodeColors();
  yield W(250);
}

// ---- 打印单词：池化标签从上方飞到底部 ----
const wordFly = Array.from({ length: 6 }, () => { const t = new VText(scene, { text: '', x: 0, y: 0, z: 0, color: GOLD, scale: 0.9 }); t.sprite.visible = false; return t; });
function* printGen() {
  const words = [];
  (function dfs(n, prefix) {
    if (n.end) words.push(prefix);
    for (const [label, c] of n.children) dfs(c, prefix + label);
  })(root, '');
  yield S(() => { status.textContent = '共 ' + words.length + ' 个单词：' + words.join('、'); });
  const tmp = [];
  words.forEach((w, i) => {
    const t = wordFly[i];
    t.setText(w);
    t.sprite.position.set(320, 700, 0);
    t.sprite.visible = true;
    tmp.push({ t, to: new THREE.Vector3(320 + (i - (words.length - 1) / 2) * 70, 320, 0) });
  });
  const from = SV.set(320, 700, 0);
  yield A(500, p => tmp.forEach(x => x.t.sprite.position.lerpVectors(from, x.to, E(p))));
  yield W(800);
  tmp.forEach(x => x.t.sprite.visible = false);
}

function* runRadix() {
  clearView();
  root.children.clear();
  model.clear(); model.set(root.id, root);
  nextId = 0;
  addNodeVis(root.id, new THREE.Vector3(320, ROOT_Y, 0));
  yield S(() => { status.textContent = '基数树（压缩前缀树）：蓝球 = 节点，白字 = 边前缀标签，★ = 单词端节点；6 个单词依次插入'; });
  yield W(400);
  for (const w of ['romane', 'romulus', 'romanus', 'romani', 'romanesco', 'robin']) yield* insertGen(w);
  yield S(() => { status.textContent = '6 个单词插入完成：3 次边分裂 + 3 次新叶'; });
  yield W(450);
  yield* searchGen('romanus');
  yield* deleteGen('romanus');
  yield* printGen();
  yield S(() => { status.textContent = '基数树演示完成：插入 romane/romulus/romanus/romani/romanesco/robin（边分裂×3），查找 romanus 命中，删除后收缩+单子压缩；前缀共享，查找 O(|word|)'; });
  yield W(800);
}

for (let i = 0; i < 10; i++) mkNodeVis();
for (let i = 0; i < 10; i++) mkEdgeObj();
function initDemo() {
  resetFree();
  insertModel('romane');
  insertModel('robin');
  const pos = layout();
  for (const n of model.values()) {
    const vn = addNodeVis(n.id, pos.get(n.id));
    vn.mesh.scale.setScalar(1);
  }
  syncEdges();
}
initDemo();
engine.queue(() => runRadix());
panel.addButton('清空', () => { engine.clear(); clearView(); root.children.clear(); model.clear(); model.set(root.id, root); nextId = 0; initDemo(); status.textContent = ''; });

scene.start(engine);
