// AlgorithmLibrary/RadixTree3D.js
// 基数树：Graph3D；边标签=公共前缀串；插入触发边分裂（旧边拆除→中间节点飞入→两条新边）。
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Graph3D } from '../3D/modes/Graph3D.js';
import { VText, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('RadixTree3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 660], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

function graphRemoveNode(g, id) {
  const e = g.nodes.get(id);
  if (!e) return;
  e.node.remove();
  g.nodes.delete(id);
  for (const [k, edge] of [...g.edges]) {
    if (k.includes(`${id}->`) || k.includes(`->${id}`)) {
      g.scene.remove(edge.mesh); edge.mesh.geometry.dispose(); edge.mesh.material.dispose();
      if (edge.weightLabel) edge.weightLabel.remove();
      g.edges.delete(k);
    }
  }
}
function graphRemoveEdge(g, a, b) {
  const k = `${a}->${b}`;
  const edge = g.edges.get(k);
  if (!edge) return;
  g.scene.remove(edge.mesh); edge.mesh.geometry.dispose(); edge.mesh.material.dispose();
  if (edge.weightLabel) edge.weightLabel.remove();
  g.edges.delete(k);
}

const graph = new Graph3D(scene);
const status = panel.addStatus('');
const ROOT_Y = 220, STEP_Y = 75, X_GAP = 90;

let nextId = 0;
const model = new Map();
const root = { id: 'root', end: false, parent: null, children: new Map() };
model.set(root.id, root);
graph.addNode('root', '根', 0, ROOT_Y, 0);

function mkNode() {
  const n = { id: 'n' + (nextId++), end: false, parent: null, children: new Map() };
  model.set(n.id, n);
  return n;
}
function lcp(a, b) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return a.slice(0, i);
}

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
    arr.forEach((n, i) => pos.set(n.id, { x: (i - (arr.length - 1) / 2) * X_GAP, y: ROOT_Y - STEP_Y * n.depth, z: 0 }));
  }
  return pos;
}

function popIn(id) {
  const vn = graph.nodes.get(id).node;
  vn.mesh.scale.setScalar(0.01);
  C(400, (p) => { const t = easeInOut(p); vn.mesh.scale.setScalar(0.01 + 0.99 * t); }, () => vn.mesh.scale.set(1, 1, 1));
}
function pulse(id) {
  const vn = graph.nodes.get(id).node;
  C(600, (p) => vn.mesh.scale.setScalar(1 + 0.25 * Math.sin(p * Math.PI)), () => vn.mesh.scale.set(1, 1, 1));
}

function insertWord(word) {
  engine.clear();
  status.textContent = '插入 ' + word;
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
      lit.push([cur.id, mid.id], [mid.id, child.id]);
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

  const pos = layout();
  const pre = new Map();
  for (const s of splits) {
    const p = graph.nodes.get(s.parent.id), c = graph.nodes.get(s.oldChild.id);
    if (p && c) pre.set(s.mid.id, { x: (p.x + c.x) / 2, y: (p.y + c.y) / 2, z: 0 });
  }
  for (const [id, e] of graph.nodes) {
    if (id === 'root') continue;
    const p = pos.get(id);
    if (p && (e.x !== p.x || e.y !== p.y)) graph.positionNode(id, p.x, p.y, p.z, C);
  }
  for (const s of splits) {
    C(1, () => graphRemoveEdge(graph, s.parent.id, s.oldChild.id), () => {});
    const P = pos.get(s.mid.id), F = pre.get(s.mid.id);
    const midNode = graph.addNode(s.mid.id, '', P.x, P.y, 0);
    const m = midNode.mesh;
    m.scale.setScalar(0.01);
    m.position.set(F.x, F.y, F.z);
    C(450, (p) => { const t = easeInOut(p); m.position.set(F.x + (P.x - F.x) * t, F.y + (P.y - F.y) * t, 0); m.scale.setScalar(0.01 + 0.99 * t); if (p === 1) graph._rebuildEdgesFor(s.mid.id); }, () => m.scale.set(1, 1, 1));
    graph.addEdge(s.parent.id, s.mid.id, { weight: s.common });
    graph.addEdge(s.mid.id, s.oldChild.id, { weight: s.rest });
  }
  for (const { parent, label, child } of created) {
    const P = pos.get(child.id);
    graph.addNode(child.id, '', P.x, P.y, 0);
    popIn(child.id);
    graph.addEdge(parent.id, child.id, { weight: label });
    lit.push([parent.id, child.id]);
  }
  for (const [a, b] of lit) graph.lightEdge(a, b, true, C);
  pulse(cur.id);
  C(1, () => graph.setNodeLabel(cur.id, '★'), () => {});
  status.textContent = existed ? word + ' 已存在' : '';
}

function findWord(word) {
  engine.clear();
  const lit = [];
  let cur = root, rem = word;
  while (rem.length > 0) {
    let next = null, nlabel = null;
    for (const [label, child] of cur.children) {
      const common = lcp(rem, label);
      if (common && common.length === label.length) { next = child; nlabel = label; break; }
    }
    if (!next) { status.textContent = word + ' 未找到'; return; }
    lit.push([cur.id, next.id]);
    cur = next;
    rem = rem.slice(nlabel.length);
  }
  for (const [a, b] of lit) graph.lightEdge(a, b, true, C);
  if (cur.end) { pulse(cur.id); status.textContent = word + ' 找到'; }
  else status.textContent = word + ' 未找到';
}

function deleteWord(word) {
  engine.clear();
  const trail = [];
  let cur = root, rem = word;
  while (rem.length > 0) {
    let next = null, nlabel = null;
    for (const [label, child] of cur.children) {
      const common = lcp(rem, label);
      if (common && common.length === label.length) { next = child; nlabel = label; break; }
    }
    if (!next) { status.textContent = word + ' 不存在'; return; }
    trail.push([cur, next]);
    cur = next;
    rem = rem.slice(nlabel.length);
  }
  if (!cur.end) { status.textContent = word + ' 不存在'; return; }
  status.textContent = '删除 ' + word;
  cur.end = false;
  C(1, () => graph.setNodeLabel(cur.id, ''), () => {});
  pulse(cur.id);
  let node = cur;
  while (node !== root && node.children.size === 0) {
    const id = node.id, parent = node.parent;
    parent.children.delete([...parent.children.entries()].find(([, c]) => c === node)[0]);
    model.delete(id);
    const e = graph.nodes.get(id);
    if (e) {
      const m = e.node.mesh;
      C(300, (p) => m.scale.setScalar(Math.max(1 - p, 0.001)), () => m.scale.set(1, 1, 1));
      C(1, () => graphRemoveNode(graph, id), () => {});
    }
    node = parent;
  }
  status.textContent = '';
}

function printWords() {
  engine.clear();
  const words = [];
  (function dfs(n, prefix) {
    if (n.end) words.push(prefix);
    for (const [label, c] of n.children) dfs(c, prefix + label);
  })(root, '');
  status.textContent = '共 ' + words.length + ' 个单词';
  words.forEach((w, i) => {
    const x = (i - (words.length - 1) / 2) * 150;
    const tmp = new VText(scene, { text: w, x: 0, y: 230, z: 0, color: PALETTE.textGlow, scale: 0.9 });
    C(450, (p) => { const t = easeInOut(p); tmp.sprite.position.x = x * t; tmp.sprite.position.y = 230 + (-235 - 230) * t; }, () => tmp.remove());
    C(60, () => tmp.remove(), () => {});
  });
  status.textContent = '';
}

function clearAll() {
  engine.clear();
  for (const id of [...graph.nodes.keys()]) {
    if (id !== 'root') graphRemoveNode(graph, id);
  }
  model.clear();
  root.children.clear();
  status.textContent = '已清空';
}

let input = panel.addInput('输入单词', (v) => { if (v) insertWord(v.trim()); }, 12);
panel.addButton('插入', () => { if (input.value) insertWord(input.value.trim()); });
panel.addButton('查找', () => { if (input.value) findWord(input.value.trim()); });
panel.addButton('打印', printWords);
panel.addButton('删除', () => { if (input.value) deleteWord(input.value.trim()); });
panel.addButton('清空', clearAll);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
