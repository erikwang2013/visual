// AlgorithmLibrary/Dijkstra3D.js
// Dijkstra 最短路径：加权无向图（圆形布局，边长标注），每次选出距离最小的节点
// 收点高亮+脉冲，松弛边点亮为青色，节点标签实时更新为 "id:dist"，最终给出距离汇总。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Graph3D } from '../3D/modes/Graph3D.js';
import { VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Dijkstra3D');

const scene = new Scene3D('scene', { cameraPos: [0, 300, 620], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });
function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

const N = 6, R = 210;
const RELAX_COLOR = 0x22d3ee; // 松弛边青色
const graph = new Graph3D(scene, { radius: 17 });
const POS = [];
for (let i = 0; i < N; i++) {
  const a = (i / N) * Math.PI * 2 - Math.PI / 2;
  POS[i] = [Math.cos(a) * R, 0, Math.sin(a) * R];
  graph.addNode(String(i), String(i), POS[i][0], POS[i][1], POS[i][2]);
}
// 样例图（模型已验证：从 0 出发 dist=[0,3,2,8,10,13]）
const adjW = [[1, 2], [0, 2, 3], [0, 1, 3, 4], [1, 2, 4, 5], [2, 3, 5], [3, 4]];
const w6 = { '0->1': 4, '1->0': 4, '0->2': 2, '2->0': 2, '1->2': 1, '2->1': 1, '1->3': 5, '3->1': 5, '2->3': 8, '3->2': 8, '2->4': 10, '4->2': 10, '3->4': 2, '4->3': 2, '3->5': 6, '5->3': 6, '4->5': 3, '5->4': 3 };
for (const [a, b] of [[0, 1], [0, 2], [1, 2], [1, 3], [2, 3], [2, 4], [3, 4], [3, 5], [4, 5]]) {
  graph.addEdge(String(a), String(b), { weight: w6[`${a}->${b}`] });
}

// ---- 模型（与 /tmp/3dtest/graphmodel.mjs 一致）----
function dijkstraModel(adj, w, n, start) {
  const dist = Array(n).fill(Infinity);
  dist[start] = 0;
  const prev = Array(n).fill(-1);
  const done = Array(n).fill(false);
  const order = [];
  const relax = [];
  for (let iter = 0; iter < n; iter++) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!done[i] && (u === -1 || dist[i] < dist[u])) u = i;
    if (u === -1) break;
    done[u] = true;
    order.push(u);
    for (const v of adj[u]) {
      if (done[v]) continue;
      const nd = dist[u] + w[`${u}->${v}`];
      if (nd < dist[v]) { relax.push([u, v, dist[v], nd]); dist[v] = nd; prev[v] = u; }
    }
  }
  return { dist, order, relax, prev };
}

const status = panel.addStatus('');
const hint = new VText(scene, { text: '点击「运行Dijkstra」开始', x: 0, y: 240, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const distLabels = [];

// 节点上方的距离标注（独立 VText，避免与 id 标签混淆）
function spawnDistLabel(u) {
  const [x, , z] = POS[u];
  const vt = new VText(scene, { text: '∞', x, y: 82, z, color: PALETTE.textDim, scale: 0.7 });
  vt.sprite.scale.set(0.1, 0.05, 1);
  C(250, (p) => { const s = 0.01 + p * 0.99; vt.sprite.scale.set(70 * s, 35 * s, 1); }, () => vt.sprite.scale.set(0.1, 0.05, 1));
  distLabels[u] = vt;
  return vt;
}

function updateDistLabel(u, text, color) {
  if (!distLabels[u]) spawnDistLabel(u);
  const vt = distLabels[u];
  vt.setText(text, { color: color || PALETTE.text });
  const [x, , z] = POS[u];
  vt.sprite.scale.set(0.1, 0.05, 1);
  C(250, (p) => { const s = 0.01 + p * 0.99; vt.sprite.scale.set(70 * s, 35 * s, 1); }, () => vt.sprite.scale.set(70, 35, 1));
}

function relaxEdge(u, v) {
  const e = graph.edges.get(`${u}->${v}`);
  if (!e) return;
  graph.lightEdge(String(u), String(v), true, C);
}

function runDijkstra() {
  engine.clear();
  for (let i = 0; i < N; i++) graph.dehighlightNode(String(i), C);
  for (const key of graph.edges.keys()) {
    const [a, b] = key.split('->');
    graph.lightEdge(a, b, false, C);
  }
  for (let i = 0; i < N; i++) if (distLabels[i]) { distLabels[i].remove(); distLabels[i] = null; }

  const start = Math.min(Math.max((startId | 0), 0), N - 1);
  const { dist, order, relax } = dijkstraModel(adjW, w6, N, start);
  spawnDistLabel(start);
  updateDistLabel(start, '0', PALETTE.textGlow);
  hint.setText('初始化：d[' + start + '] = 0，其余 ∞');

  // 按松弛起点 u 分组，便于按顺序回放
  const relaxByU = new Map();
  for (const [u, v, old, nd] of relax) {
    if (!relaxByU.has(u)) relaxByU.set(u, []);
    relaxByU.get(u).push([v, old, nd]);
  }

  let ri = 0;
  function step() {
    if (ri >= order.length) {
      const distStr = order.map((u) => u + ':' + dist[u]).join(' ');
      status.textContent = '从 ' + start + ' 出发的最短距离: ' + distStr;
      hint.setText('Dijkstra 完成，最短距离: ' + distStr);
      return;
    }
    const u = order[ri];
    graph.highlightNode(String(u), C);
    const m = graph.nodes.get(String(u)).node.mesh;
    C(380, (p) => { m.scale.setScalar(1.15 + 0.2 * Math.sin(p * Math.PI)); }, () => m.scale.setScalar(1));
    hint.setText('选出距离最小的节点 ' + u + '（d[' + u + ']=' + dist[u] + '）');
    ri++;
    if (relaxByU.has(u)) {
      let j = 0;
      const rls = relaxByU.get(u);
      function relaxNext() {
        if (j >= rls.length) { C(200, step); return; }
        const [v, old, nd] = rls[j];
        relaxEdge(u, v);
        updateDistLabel(v, String(nd), PALETTE.textGlow);
        hint.setText('松弛 ' + u + '→' + v + '：' + (old === Infinity ? '∞' : old) + ' → ' + nd);
        j++;
        C(500, relaxNext);
      }
      relaxNext();
    } else {
      C(200, step);
    }
  }
  step();
}

function clearAll() {
  engine.clear();
  for (let i = 0; i < N; i++) if (distLabels[i]) { distLabels[i].remove(); distLabels[i] = null; }
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
panel.addInput('0', (v) => { startId = parseInt(v, 10) || 0; runDijkstra(); }, 1);
panel.addButton('运行Dijkstra', runDijkstra);
panel.addButton('清空', clearAll);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
