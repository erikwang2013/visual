// AlgorithmLibrary/DFS3D.js
// 深度优先搜索：固定无向图（圆形布局），访问节点高亮+脉冲，
// 树边点亮为青绿色，回退边保持熄灭，访问顺序文字依次飞入顶部序列行。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Graph3D } from '../3D/modes/Graph3D.js';
import { VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('DFS3D');

const scene = new Scene3D('scene', { cameraPos: [0, 300, 620], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });
function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

const N = 8, R = 230;
const TREE_COLOR = 0x34d399; // 树边青绿
const graph = new Graph3D(scene, { radius: 17 });
for (let i = 0; i < N; i++) {
  const a = (i / N) * Math.PI * 2 - Math.PI / 2;
  graph.addNode(String(i), String(i), Math.cos(a) * R, 0, Math.sin(a) * R);
}
const EDGES = [[0, 1], [0, 7], [1, 2], [1, 4], [2, 3], [2, 6], [3, 4], [4, 5], [5, 6]];
const adj = Array.from({ length: N }, () => []);
for (const [a, b] of EDGES) {
  graph.addEdge(String(a), String(b));
  adj[a].push(b); adj[b].push(a);
}

// ---- 模型（与 /tmp/3dtest/graphmodel.mjs 一致）----
function dfsModel(adj, n, start) {
  const visited = new Set();
  const order = [];
  const treeEdges = [];
  const events = []; // {t:'visit'|'tree'|'skip', u, v}
  function dfs(u) {
    visited.add(u);
    order.push(u);
    events.push({ t: 'visit', u });
    for (const v of adj[u]) {
      if (!visited.has(v)) { treeEdges.push([u, v]); events.push({ t: 'tree', u, v }); dfs(v); }
      else events.push({ t: 'skip', u, v });
    }
  }
  dfs(start);
  return { order, treeEdges, events };
}

const status = panel.addStatus('');
const hint = new VText(scene, { text: '点击「运行 DFS」开始', x: 0, y: 240, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const orderTexts = [];

// 树边点亮为青绿
function colorEdge(a, b, color) {
  const e = graph.edges.get(`${a}->${b}`);
  if (!e) return;
  const from = new THREE.Color(e.baseColor);
  const to = new THREE.Color(color);
  C(300, (p) => {
    e.mesh.material.color.copy(from).lerp(to, p);
    e.mesh.material.opacity = e.baseOpacity + p * 0.35;
  }, () => { e.mesh.material.color.setHex(e.baseColor); e.mesh.material.opacity = e.baseOpacity; });
}

// 访问顺序文字：节点上方出现，飞入顶部序列行
function spawnOrderText(id, idx) {
  const pos = graph.nodes.get(String(id)).node.mesh.position;
  const from = { x: pos.x, y: pos.y + 70, z: pos.z };
  const to = { x: -250 + idx * 62, y: 185, z: 0 };
  const vt = new VText(scene, { text: String(id), x: from.x, y: from.y, z: from.z, color: PALETTE.text, scale: 0.9 });
  vt.sprite.scale.set(0.1, 0.05, 1);
  C(300, (p) => { const s = 0.01 + p * 0.99; vt.sprite.scale.set(90 * s, 45 * s, 1); }, () => vt.sprite.scale.set(0.1, 0.05, 1));
  C(450, (p) => {
    const t = easeInOut(p);
    vt.sprite.position.set(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, from.z + (to.z - from.z) * t);
  }, () => vt.sprite.position.set(from.x, from.y, from.z));
  orderTexts.push(vt);
}

function runDFS() {
  engine.clear();
  for (let i = 0; i < N; i++) graph.dehighlightNode(String(i), C);
  for (const key of graph.edges.keys()) {
    const [a, b] = key.split('->');
    graph.lightEdge(a, b, false, C);
  }
  orderTexts.forEach((vt) => vt.remove());
  orderTexts.length = 0;

  const start = Math.min(Math.max((startId | 0), 0), N - 1);
  const { events, order } = dfsModel(adj, N, start);
  let idx = 0;
  // 预展开为扁平命令序列：命令 fn 会在动画期间每帧被调用，
  // 若在 fn 内再入队命令会指数膨胀，必须一次性入队。
  for (const e of events) {
    if (e.t === 'visit') {
      const id = String(e.u);
      graph.highlightNode(id, C);
      const m = graph.nodes.get(id).node.mesh;
      C(380, (p) => { m.scale.setScalar(1.15 + 0.2 * Math.sin(p * Math.PI)); }, () => m.scale.setScalar(1));
      spawnOrderText(e.u, idx); idx++;
      C(1, () => hint.setText('访问节点 ' + e.u), () => {});
    } else if (e.t === 'tree') {
      colorEdge(e.u, e.v, TREE_COLOR);
      C(1, () => hint.setText('沿树边 ' + e.u + ' → ' + e.v + ' 深入'), () => {});
    } else {
      C(1, () => hint.setText(e.u + ' 的邻居 ' + e.v + ' 已访问，跳过（回退）'), () => {});
    }
    C(240, () => {}, () => {});
  }
  C(1, () => {
    status.textContent = 'DFS 访问顺序: ' + order.join(' → ');
    hint.setText('DFS 完成，访问顺序: ' + order.join(' → '));
  }, () => {});
}

function clearAll() {
  engine.clear();
  orderTexts.forEach((vt) => vt.remove());
  orderTexts.length = 0;
  for (const [, e] of graph.nodes) e.node.remove();
  graph.nodes.clear();
  for (const [, e] of graph.edges) {
    scene.remove(e.mesh);
    if (e.weightLabel) e.weightLabel.remove();
  }
  graph.edges.clear();
  startId = 0;
  status.textContent = '';
  hint.setText('已清空画布');
}

let startId = 0;
panel.addLabel('起始节点: ');
panel.addInput('0', (v) => { startId = parseInt(v, 10) || 0; runDFS(); }, 2);
panel.addButton('运行 DFS', runDFS);
panel.addButton('清空', clearAll);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
