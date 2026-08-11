// AlgorithmLibrary/RadixTree3D.js — 基数树（压缩前缀树）：边标签=公共前缀；插入触发边分裂（旧边拆→中间节点飞入→两条新边）；删除收缩/合并（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VNode } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('RadixTree3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 660], fov: 55 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, RED = 0xfb7185, GREEN = 0x4ade80, WHITE = 0xffffff;
const hint = new VText(scene, { text: '点击「运行演示」开始：基数树边分裂插入', x: 0, y: 400, z: 0, color: PALETTE.textGlow, scale: 0.8 });
const status = panel.addStatus('就绪');
const outT = new VText(scene, { text: '', x: 0, y: -170, z: 0, color: PALETTE.textGlow, scale: 0.7 });

const ROOT_Y = 220, STEP_Y = 75, X_GAP = 90;
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

// ---- 布局：BFS 分层，层内均分 ----
function layout() {
  const byDepth = [];
  const q = [root];
  root.depth = 0;
  while (q.length) {
    const n = q.shift();
    (byDepth[n.depth] = byDepth[n.depth] || []).push(n);
    for (const c of n.children.values()) { c.depth = n.depth + 1; q.push(c); }
  }
  const pos = new Map();
  for (const d in byDepth) {
    const arr = byDepth[d];
    arr.forEach((n, i) => pos.set(n.id, new THREE.Vector3((i - (arr.length - 1) / 2) * X_GAP, ROOT_Y - STEP_Y * n.depth, 0)));
  }
  return pos;
}

// ---- 视觉：球节点 + 边管 + 边标签（公共前缀） ----
const nodeView = new Map();  // id -> VNode
const edgeView = new Map();  // 'a->b' -> { tube, lbl }
function clearView() {
  nodeView.forEach(v => scene.remove(v.mesh));
  edgeView.forEach(e => { scene.remove(e.tube); e.tube.geometry.dispose(); e.tube.material.dispose(); scene.remove(e.lbl.sprite); });
  nodeView.clear(); edgeView.clear();
}
function addNodeVis(id, p) {
  const vn = new VNode(scene, { radius: 17, x: p.x, y: p.y, z: p.z, label: '', color: BLUE, emissive: BLUE });
  nodeView.set(id, vn);
  return vn;
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
  edgeView.forEach(e => { scene.remove(e.tube); e.tube.geometry.dispose(); e.tube.material.dispose(); scene.remove(e.lbl.sprite); });
  edgeView.clear();
  (function walk(n) {
    for (const [label, c] of n.children) {
      const a = nodeView.get(n.id).mesh.position, b = nodeView.get(c.id).mesh.position;
      const m = tube(a, b);
      const midP = new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2 - 16, (a.z + b.z) / 2);
      const lbl = new VText(scene, { text: label, x: midP.x, y: midP.y, z: midP.z, color: PALETTE.textGlow, scale: 0.6 });
      edgeView.set(n.id + '->' + c.id, { tube: m, lbl });
      walk(c);
    }
  })(root);
}
function setNodeColor(id, c) { nodeView.get(id).setColor(c, c); }
function setEnd(id) { nodeView.get(id).setColor(GOLD, GOLD); nodeView.get(id).setText('★'); }
function resetNodeColors() { nodeView.forEach((v, id) => { const n = model.get(id); v.setColor(n && n.end ? GOLD : BLUE, n && n.end ? GOLD : BLUE); }); }
function* moveToLayout() {
  const pos = layout();
  const tasks = [];
  nodeView.forEach((vn, id) => {
    const p = pos.get(id);
    if (!p) return;
    const f = vn.mesh.position.clone();
    if (f.distanceTo(p) < 0.5) return;
    tasks.push({ vn, from: f, to: p });
  });
  if (!tasks.length) { syncEdges(); return; }
  yield A(460, pp => tasks.forEach(t => t.vn.mesh.position.lerpVectors(t.from, t.to, pp)));
  syncEdges();
}
function* popIn(id, from, to) {
  const vn = nodeView.get(id);
  vn.mesh.position.copy(from);
  vn.mesh.scale.setScalar(0.01);
  yield A(420, pp => {
    vn.mesh.position.lerpVectors(from, to, pp);
    vn.mesh.scale.setScalar(0.01 + 0.99 * pp);
  });
  vn.mesh.scale.setScalar(1);
}
function* shrinkOut(id) {
  const vn = nodeView.get(id);
  if (!vn) return;
  yield A(320, pp => { vn.mesh.scale.setScalar(1 - pp); });
  scene.remove(vn.mesh);
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
  yield S(() => outT.setText('插入 "' + word + '"'));
  const { lit, splits, created, targetId } = insertModel(word);
  for (const [a, b] of lit) { setNodeColor(a, GOLD); setNodeColor(b, GOLD); yield W(200); }
  yield W(200);
  const pos = layout();
  for (const s of splits) {
    yield S(() => outT.setText('边分裂：剩余 "' + s.common + '" 与边 "' + s.oldLabel + '" 公共前缀 "' + s.common + '" → 拆出中间节点'));
    edgeView.delete(s.parent.id + '->' + s.oldChild.id);
    yield W(350);
    const from = new THREE.Vector3((nodeView.get(s.parent.id).mesh.position.x + nodeView.get(s.oldChild.id).mesh.position.x) / 2, (nodeView.get(s.parent.id).mesh.position.y + nodeView.get(s.oldChild.id).mesh.position.y) / 2, 0);
    const to = pos.get(s.mid.id) || from;
    addNodeVis(s.mid.id, from);
    yield* popIn(s.mid.id, from, to);
    yield S(() => outT.setText('中间节点就位：旧边 "' + s.oldLabel + '" 拆为 "' + s.common + '" + "' + s.rest + '"'));
    yield* moveToLayout();
    yield W(400);
  }
  for (const c of created) {
    const to = pos.get(c.child.id);
    const from = to.clone().add(new THREE.Vector3(0, 140, 0));
    addNodeVis(c.child.id, from);
    yield S(() => outT.setText('新叶子 "' + c.label + '" 从上方降落'));
    yield* popIn(c.child.id, from, to);
    yield W(250);
  }
  if (created.length === 0 && splits.length === 0) yield W(300);
  yield* moveToLayout();
  setEnd(targetId);
  yield S(() => outT.setText('插入完成：' + word + ' 端节点标记 ★（金色）'));
  yield W(450);
  resetNodeColors();
  yield W(200);
}

// ---- 查找：金色路径下钻 ----
function* searchGen(word) {
  yield S(() => outT.setText('查找 "' + word + '"：沿边标签下钻'));
  const lit = [];
  let cur = root, rem = word;
  while (rem.length > 0) {
    let next = null, nlabel = null;
    for (const [label, child] of cur.children) {
      const common = lcp(rem, label);
      if (common && common.length === label.length) { next = child; nlabel = label; break; }
    }
    if (!next) { yield S(() => outT.setText('无匹配边，' + word + ' 不存在（红闪）')); yield W(500); resetNodeColors(); return; }
    lit.push([cur.id, next.id]);
    cur = next;
    rem = rem.slice(nlabel.length);
  }
  for (const [a, b] of lit) { setNodeColor(a, GOLD); setNodeColor(b, GOLD); yield W(220); }
  if (cur.end) {
    setNodeColor(cur.id, GREEN);
    yield S(() => outT.setText('命中：' + word + ' 存在（绿色闪光）'));
    yield W(500);
  } else {
    yield S(() => outT.setText('路径走完但非端节点：' + word + ' 不存在'));
    yield W(500);
  }
  resetNodeColors();
}

// ---- 删除：端标记移除 → 收缩空节点 → 单子边压缩合并 ----
function* deleteGen(word) {
  yield S(() => outT.setText('删除 "' + word + '"：沿路径下钻'));
  const trail = [];
  let cur = root, rem = word;
  while (rem.length > 0) {
    let next = null, nlabel = null;
    for (const [label, child] of cur.children) {
      const common = lcp(rem, label);
      if (common && common.length === label.length) { next = child; nlabel = label; break; }
    }
    if (!next) { yield S(() => outT.setText(word + ' 不存在')); yield W(400); return; }
    trail.push([cur.id, next.id]);
    cur = next;
    rem = rem.slice(nlabel.length);
  }
  if (!cur.end) { yield S(() => outT.setText(word + ' 不存在')); yield W(400); return; }
  for (const [a, b] of trail) { setNodeColor(a, GOLD); setNodeColor(b, GOLD); yield W(200); }
  cur.end = false;
  nodeView.get(cur.id).setText('');
  yield S(() => outT.setText('移除 ' + word + ' 的端标记（红闪）'));
  setNodeColor(cur.id, RED);
  yield W(400);
  // 收缩空节点链
  let node = cur;
  while (node !== root && node.children.size === 0) {
    const parent = node.parent;
    const lbl = [...parent.children.entries()].find(([, c]) => c === node)[0];
    parent.children.delete(lbl);
    yield S(() => outT.setText('节点变空：边 "' + lbl + '" 移除，节点收缩消失'));
    yield* shrinkOut(node.id);
    yield* moveToLayout();
    yield W(350);
    node = parent;
  }
  // 单子节点压缩合并边标签
  if (node !== root && node.children.size === 1) {
    const parent = node.parent;
    const upLabel = [...parent.children.entries()].find(([, c]) => c === node)[0];
    const [downLabel, child] = [...node.children.entries()][0];
    parent.children.delete(upLabel);
    parent.children.set(upLabel + downLabel, child);
    child.parent = parent;
    yield S(() => outT.setText('单子压缩：边 "' + upLabel + '" 与 "' + downLabel + '" 合并为 "' + upLabel + downLabel + '"'));
    yield* shrinkOut(node.id);
    yield* moveToLayout();
    yield W(400);
  }
  resetNodeColors();
  yield W(250);
}

// ---- 打印单词：收集后飞到底部 ----
function* printGen() {
  const words = [];
  (function dfs(n, prefix) {
    if (n.end) words.push(prefix);
    for (const [label, c] of n.children) dfs(c, prefix + label);
  })(root, '');
  yield S(() => outT.setText('共 ' + words.length + ' 个单词：' + words.join('、')));
  const tmp = [];
  words.forEach((w, i) => {
    const t = new VText(scene, { text: w, x: 0, y: 230, z: 0, color: GOLD, scale: 0.9 });
    tmp.push({ t, to: new THREE.Vector3((i - (words.length - 1) / 2) * 150, -240, 0) });
  });
  yield A(500, p => tmp.forEach(x => x.t.sprite.position.lerpVectors(new THREE.Vector3(0, 230, 0), x.to, p)));
  yield W(800);
  tmp.forEach(x => scene.remove(x.t.sprite));
}

function* runRadix() {
  clearView();
  root.children.clear();
  model.clear(); model.set(root.id, root);
  nextId = 0;
  addNodeVis(root.id, new THREE.Vector3(0, ROOT_Y, 0));
  hint.setText('基数树：边标签 = 公共前缀串；插入触发边分裂');
  yield W(300);
  for (const w of ['romane', 'romulus', 'romanus', 'romani', 'romanesco', 'robin']) yield* insertGen(w);
  yield S(() => outT.setText('6 个单词插入完成：3 次边分裂 + 3 次新叶'));
  yield W(450);
  yield* searchGen('romanus');
  yield* deleteGen('romanus');
  yield* printGen();
  yield S(() => {
    outT.setText('');
    hint.setText('基数树完成：前缀共享，查找 O(|word|)，空间节省于公共前缀');
    status.textContent = '基数树演示完成：插入 romane/romulus/romanus/romani/romanesco/robin（分裂 ×3），查找 romanus 命中，删除后压缩合并';
  });
}

panel.addButton('运行演示', () => engine.start(runRadix()));
panel.addButton('清空', () => { engine.clear(); clearView(); root.children.clear(); model.clear(); model.set(root.id, root); nextId = 0; hint.setText('已清空，可重新运行'); status.textContent = ''; outT.setText(''); });
panel.addLabel('（拖拽旋转视角，滚轮缩放；白字 = 边前缀标签，★ = 单词端节点，金 = 路径）');

scene.start(engine);
