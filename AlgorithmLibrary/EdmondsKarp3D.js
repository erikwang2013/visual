// AlgorithmLibrary/EdmondsKarp3D.js — 最大流（Edmonds-Karp）：BFS 找最短增广路并更新残量
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Graph3D } from '../3D/modes/Graph3D.js';
import { VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('EdmondsKarp3D');

const scene = new Scene3D('scene', { cameraPos: [0, 300, 620], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const N = 6, R = 185, SRC = 0, SNK = 5;
const NAMES = ['s', '1', '2', '3', '4', 't'];
const graph = new Graph3D(scene, { radius: 16 });
const POS = [];
for (let i = 0; i < N; i++) {
  const a = (i / N) * Math.PI * 2 - Math.PI / 2;
  POS[i] = [Math.cos(a) * R, 0, Math.sin(a) * R];
  graph.addNode(String(i), NAMES[i], POS[i][0], POS[i][1], POS[i][2]);
}
const EDGES = [[0, 1], [0, 2], [1, 2], [1, 3], [2, 3], [2, 4], [3, 5], [4, 3], [4, 5]];
const CAP = { '0->1': 12, '0->2': 8, '1->2': 6, '1->3': 10, '2->3': 10, '2->4': 4, '3->5': 16, '4->3': 6, '4->5': 8 };
const adj = Array.from({ length: N }, () => []);
const flow = new Map();
const flowLabels = new Map();
const arrows = new Map();
const status = panel.addStatus('');
const hint = new VText(scene, { text: '点击「运行 EK」开始：BFS 找增广路', x: 0, y: 250, z: 0, color: PALETTE.textGlow, scale: 0.85 });
let buildDone = false;

function keyOf(a, b) { return a + '->' + b; }

function addArrow(a, b) {
  const A = graph.nodes.get(String(a)).node.mesh;
  const B = graph.nodes.get(String(b)).node.mesh;
  const dir = B.position.clone().sub(A.position).normalize();
  const tip = B.position.clone().addScaledVector(dir, -(graph.radius + 5));
  const cone = new THREE.Mesh(new THREE.ConeGeometry(8, 18, 10), new THREE.MeshBasicMaterial({ color: PALETTE.edge }));
  cone.position.copy(tip);
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  scene.add(cone);
  arrows.set(keyOf(a, b), cone);
}

function edgeMid(a, b) {
  const A = graph.nodes.get(String(a)).node.mesh;
  const B = graph.nodes.get(String(b)).node.mesh;
  return A.position.clone().add(B.position).multiplyScalar(0.5).add(new THREE.Vector3(0, 18, 0));
}

function buildGraph() {
  for (const [a, b] of EDGES) {
    graph.addEdge(String(a), String(b), { directed: true });
    addArrow(a, b);
    adj[a].push(b);
    flow.set(keyOf(a, b), 0);
    const m = edgeMid(a, b);
    const vt = new VText(scene, { text: '0/' + CAP[keyOf(a, b)], x: m.x, y: m.y, z: m.z, color: PALETTE.textDim, scale: 0.62 });
    flowLabels.set(keyOf(a, b), vt);
  }
  buildDone = true;
}

function setFlow(a, b, v) {
  const vt = flowLabels.get(keyOf(a, b));
  C(300, () => vt.setText(v + '/' + CAP[keyOf(a, b)], { color: PALETTE.textGlow }), () => {});
  flow.set(keyOf(a, b), v);
}

function runEK() {
  engine.clear();
  if (!buildDone) buildGraph();
  for (let u = 0; u < N; u++) for (const v of adj[u]) flow.set(keyOf(u, v), 0);
  for (const [k, vt] of flowLabels) vt.setText('0/' + CAP[k]);
  for (const [, cone] of arrows) cone.material.color.setHex(PALETTE.edge);

  let total = 0;
  const rounds = [];
  while (true) {
    const prev = Array(N).fill(-1);
    const seen = Array(N).fill(false);
    seen[SRC] = true;
    const q = [SRC];
    while (q.length) {
      const u = q.shift();
      if (u === SNK) break;
      for (const v of adj[u]) {
        if (!seen[v] && flow.get(keyOf(u, v)) < CAP[keyOf(u, v)]) { seen[v] = true; prev[v] = u; q.push(v); }
      }
    }
    if (prev[SNK] === -1) break;
    let bottle = Infinity;
    const path = [];
    for (let v = SNK; v !== SRC; v = prev[v]) { path.unshift(v); bottle = Math.min(bottle, CAP[keyOf(prev[v], v)] - flow.get(keyOf(prev[v], v))); }
    path.unshift(SRC);
    rounds.push({ path, bottle });
    total += bottle;
    for (let i = 0; i + 1 < path.length; i++) flow.set(keyOf(path[i], path[i + 1]), flow.get(keyOf(path[i], path[i + 1])) + bottle);
  }

  let r = 0;
  const step = () => {
    if (r >= rounds.length) {
      status.textContent = 'EK 完成：最大流 = ' + total;
      hint.setText('无更多增广路，最大流 ' + total);
      return;
    }
    const { path, bottle } = rounds[r]; r++;
    hint.setText('第 ' + r + ' 轮增广：路径 ' + path.map(i => NAMES[i]).join(' → ') + '，瓶颈 ' + bottle);
    path.forEach((u, i) => {
      if (i + 1 < path.length) {
        const v = path[i + 1];
        C(500, () => arrows.get(keyOf(u, v)).material.color.setHex(PALETTE.red), () => {});
      }
      C(160, () => graph.highlightNode(String(u), C), () => {});
    });
    C(400, () => {
      for (let i = 0; i + 1 < path.length; i++) setFlow(path[i], path[i + 1], flow.get(keyOf(path[i], path[i + 1])));
      for (const [, cone] of arrows) cone.material.color.setHex(PALETTE.edge);
    });
    C(500, step);
  };
  step();
}

function clearAll() {
  engine.clear();
  for (const [, e] of graph.nodes) e.node.remove();
  graph.nodes.clear();
  for (const [, e] of graph.edges) {
    scene.remove(e.mesh);
    if (e.weightLabel) e.weightLabel.remove();
  }
  graph.edges.clear();
  for (const cone of arrows.values()) scene.remove(cone);
  arrows.clear();
  for (const vt of flowLabels.values()) vt.remove();
  flowLabels.clear();
  buildDone = false;
  status.textContent = '';
  hint.setText('已清空画布');
}

panel.addButton('运行 EK', runEK);
panel.addButton('清空', clearAll);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
