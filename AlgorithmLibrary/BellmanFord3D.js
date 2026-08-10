// AlgorithmLibrary/BellmanFord3D.js
// Bellman-Ford 最短路径：有向加权图（含负权边），V-1 轮全边松弛。
// 松弛成功绿色更新距离，无变化青色闪烁；收尾验证轮检测负权环。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Graph3D } from '../3D/modes/Graph3D.js';
import { VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('BellmanFord3D');

const scene = new Scene3D('scene', { cameraPos: [0, 300, 620], fov: 55 });
const engine = new AnimationEngine({ speed: 1.6 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const status = panel.addStatus('');
const hint = new VText(scene, { text: '选择起点，点击「运行 Bellman-Ford」开始', x: 0, y: 240, z: 0, color: PALETTE.textGlow, scale: 0.85 });

const NODES = ['s', 't', 'x', 'y', 'z'];
const N = NODES.length, R = 210;
// CLRS 经典带负权边样例（无负权环）
const EDGES = [
  ['s', 't', 6], ['s', 'y', 7], ['t', 'x', 5], ['t', 'y', 8], ['t', 'z', -4],
  ['x', 't', -2], ['y', 'x', -3], ['y', 'z', 9], ['z', 's', 2], ['z', 'x', 7],
];
const POS = {};
NODES.forEach((id, i) => {
  const a = (i / N) * Math.PI * 2 - Math.PI / 2;
  POS[id] = [Math.cos(a) * R, 0, Math.sin(a) * R];
});

const graph = new Graph3D(scene, { radius: 17 });
for (const id of NODES) graph.addNode(id, id, POS[id][0], POS[id][1], POS[id][2]);
for (const [a, b, w] of EDGES) graph.addEdge(a, b, { weight: w, directed: true });

// ---- 模型 ----
function bellmanModel(edges, n, start) {
  const dist = {};
  for (const id of NODES) dist[id] = Infinity;
  dist[start] = 0;
  const rounds = [];   // {k, edges: [{u, v, w, old, updated}]}
  for (let k = 1; k < n; k++) {
    const list = edges.map(([u, v, w]) => ({ u, v, w, old: null, updated: false }));
    for (const e of list) {
      e.old = dist[e.v];
      if (dist[e.u] === Infinity) continue;
      const nd = dist[e.u] + e.w;
      if (nd < dist[e.v]) { e.updated = true; dist[e.v] = nd; }
    }
    rounds.push({ k, edges: list });
  }
  const verify = edges.map(([u, v, w]) => ({ u, v, w, old: null, updated: false }));
  for (const e of verify) {
    e.old = dist[e.v];
    if (dist[e.u] === Infinity) continue;
    const nd = dist[e.u] + e.w;
    if (nd < dist[e.v]) { e.updated = true; dist[e.v] = nd; }
  }
  rounds.push({ k: n, verify: true, edges: verify });
  return { dist, rounds };
}

const fmt = (v) => (v === Infinity ? '∞' : String(v));
const distLabels = {};

function spawnDistLabel(id) {
  const [x, , z] = POS[id];
  const vt = new VText(scene, { text: '∞', x, y: 82, z, color: PALETTE.textDim, scale: 0.7 });
  vt.sprite.scale.set(0.1, 0.05, 1);
  distLabels[id] = vt;
  C(250, (p) => { const s = 0.01 + p * 0.99; vt.sprite.scale.set(70 * s, 35 * s, 1); }, () => vt.sprite.scale.set(0.1, 0.05, 1));
}

function updateDistLabel(id, text, color) {
  const vt = distLabels[id];
  vt.setText(text, { color: color || PALETTE.text });
  vt.sprite.scale.set(0.1, 0.05, 1);
  C(250, (p) => { const s = 0.01 + p * 0.99; vt.sprite.scale.set(70 * s, 35 * s, 1); }, () => vt.sprite.scale.set(70, 35, 1));
}

function run() {
  engine.clear();
  const start = NODES.includes(startInput.value.trim()) ? startInput.value.trim() : 's';
  startInput.value = start;
  for (const id of NODES) {
    graph.dehighlightNode(id, C);
    if (distLabels[id]) { distLabels[id].remove(); distLabels[id] = null; }
  }
  for (const [a, b] of EDGES) graph.lightEdge(a, b, false, C);

  const { dist, rounds } = bellmanModel(EDGES, N, start);
  for (const id of NODES) {
    spawnDistLabel(id);
    if (id === start) updateDistLabel(id, '0', PALETTE.textGlow);
  }
  graph.highlightNode(start, C, PALETTE.green);
  C(1, () => hint.setText('初始化：d[' + start + ']=0，其余 ∞；共 ' + (N - 1) + ' 轮全边松弛'), () => {});

  let negCycle = false;
  for (const round of rounds) {
    C(1, () => hint.setText(round.verify ? '验证轮：再松弛一次所有边，检查是否仍有更新' : '第 ' + round.k + ' 轮：依次松弛所有 ' + round.edges.length + ' 条边'), () => {});
    for (const e of round.edges) {
      graph.lightEdge(e.u, e.v, true, C);
      if (e.updated) {
        if (round.verify) negCycle = true;
        updateDistLabel(e.v, String(dist[e.v]), PALETTE.green);
        C(1, () => hint.setText('松弛 ' + e.u + '→' + e.v + '：d[' + e.v + '] ' + fmt(e.old) + ' → ' + dist[e.v] + '（更新）'), () => {});
      } else {
        C(1, () => hint.setText('检查 ' + e.u + '→' + e.v + '（w=' + e.w + '）：' + (fmt(dist[e.u]) === '∞' ? 'd[' + e.u + ']=∞ 尚未可达' : 'd[' + e.u + ']+w=' + dist[e.u] + '+' + e.w + ' ≥ d[' + e.v + ']=' + fmt(dist[e.v]) + '，不更新')), () => {});
      }
      graph.lightEdge(e.u, e.v, false, C);
    }
  }
  if (negCycle) {
    for (const id of NODES) graph.highlightNode(id, C, PALETTE.red);
    C(1, () => {
      status.textContent = '存在负权环！Bellman-Ford 无解';
      hint.setText('⚠ 验证轮仍有更新：图中存在负权环，最短路径无定义');
    }, () => {});
  } else {
    const distStr = NODES.map((id) => id + ':' + dist[id]).join(' ');
    C(1, () => {
      status.textContent = '从 ' + start + ' 出发的最短距离: ' + distStr;
      hint.setText('Bellman-Ford 完成（' + (N - 1) + ' 轮 + 验证轮），无负权环');
    }, () => {});
  }
}

function clearAll() {
  engine.clear();
  for (const id of NODES) {
    if (distLabels[id]) { distLabels[id].remove(); distLabels[id] = null; }
  }
  for (const [, e] of graph.nodes) e.node.remove();
  graph.nodes.clear();
  for (const [, e] of graph.edges) {
    scene.remove(e.mesh);
    if (e.weightLabel) e.weightLabel.remove();
  }
  graph.edges.clear();
  status.textContent = '';
  hint.setText('已清空画布');
}

const startInput = panel.addInput('起点', run, 2);
startInput.value = 's';
panel.addButton('运行 Bellman-Ford', run);
panel.addButton('清空', clearAll);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
