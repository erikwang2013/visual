// AlgorithmLibrary/Kosaraju3D.js — Kosaraju 强连通分量：原图 DFS 求完成序，反图 DFS 按逆序找 SCC
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Graph3D } from '../3D/modes/Graph3D.js';
import { VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Kosaraju3D');

const scene = new Scene3D('scene', { cameraPos: [0, 300, 720], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const N = 7, R = 215;
const NAMES = ['0', '1', '2', '3', '4', '5', '6'];
const SCC_COLORS = [PALETTE.red, PALETTE.green, PALETTE.orange, PALETTE.purple, PALETTE.blue];
const graph = new Graph3D(scene, { radius: 17 });
const POS = [];
for (let i = 0; i < N; i++) {
  const a = (i / N) * Math.PI * 2 - Math.PI / 2;
  POS[i] = [Math.cos(a) * R, 0, Math.sin(a) * R];
  graph.addNode(String(i), NAMES[i], POS[i][0], POS[i][1], POS[i][2]);
}
// 有向图：SCC = {0,1,2} {3,4} {6} {5}
const adj = [[1], [2, 3], [0, 5], [4], [3, 6], [], []];
const arrows = new Map();

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

for (let u = 0; u < N; u++) {
  for (const v of adj[u]) {
    graph.addEdge(String(u), String(v), { directed: true });
    addArrow(u, v);
  }
}

const status = panel.addStatus('');
const hint = new VText(scene, { text: '点击「运行Kosaraju」开始：求强连通分量', x: 0, y: 265, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const orderLabels = [];
const resultLabel = new VText(scene, { text: '', x: 0, y: -270, z: 0, color: PALETTE.textDim, scale: 0.8 });

// 预生成事件：v1 原图访问 / f1 原图完成 / comp 反图找出的分量
function genEvents() {
  const ev = [];
  const seen1 = Array(N).fill(false);
  const orderMap = new Map();
  const dfs1 = (u) => {
    seen1[u] = true;
    ev.push({ t: 'v1', u });
    for (const v of adj[u]) if (!seen1[v]) dfs1(v);
    orderMap.set(u, orderMap.size + 1);
    ev.push({ t: 'f1', u });
  };
  for (let i = 0; i < N; i++) if (!seen1[i]) dfs1(i);
  const rev = Array.from({ length: N }, () => []);
  for (let u = 0; u < N; u++) for (const v of adj[u]) rev[v].push(u);
  const finishOrder = [...orderMap.keys()].sort((a, b) => orderMap.get(a) - orderMap.get(b));
  const seen2 = Array(N).fill(false);
  for (const s of [...finishOrder].reverse()) {
    if (seen2[s]) continue;
    const comp = [];
    const st = [s]; seen2[s] = true;
    while (st.length) {
      const u = st.pop(); comp.push(u);
      for (const v of rev[u]) if (!seen2[v]) { seen2[v] = true; st.push(v); }
    }
    ev.push({ t: 'comp', nodes: comp });
  }
  return ev;
}

function runKosaraju() {
  engine.clear();
  const events = genEvents();
  for (let i = 0; i < N; i++) {
    graph.dehighlightNode(String(i), C);
    if (orderLabels[i]) { orderLabels[i].remove(); orderLabels[i] = null; }
    const e = graph.nodes.get(String(i));
    e.node.setColor(PALETTE.node, PALETTE.nodeEmissive);
  }
  resultLabel.setText('');

  let i = 0;
  const step = () => {
    if (i >= events.length) {
      const comps = [];
      for (const e of events) if (e.t === 'comp') comps.push('{' + e.nodes.join(',') + '}');
      status.textContent = 'Kosaraju 完成：' + comps.length + ' 个强连通分量';
      hint.setText('所有 SCC：' + comps.join(' '));
      resultLabel.setText('SCC：' + comps.join(' '));
      return;
    }
    const e = events[i]; i++;
    if (e.t === 'v1') {
      graph.highlightNode(String(e.u), C);
      hint.setText('第 1 遍 DFS（原图）：访问节点 ' + e.u);
      C(420, step);
    } else if (e.t === 'f1') {
      const ord = events.filter(x => x.t === 'f1' && events.indexOf(x) < i).length;
      graph.dehighlightNode(String(e.u), C);
      const [x, , z] = POS[e.u];
      const vt = new VText(scene, { text: '序' + ord, x, y: -42, z, color: PALETTE.textDim, scale: 0.55 });
      orderLabels[e.u] = vt;
      hint.setText('节点 ' + e.u + ' 出栈，完成序 = ' + ord);
      C(460, step);
    } else {
      const c = SCC_COLORS[i % SCC_COLORS.length];
      e.nodes.forEach((u, k) => {
        C(200 + k * 30, () => graph.nodes.get(String(u)).node.setColor(c, c), () => {});
      });
      hint.setText('第 2 遍 DFS（反图，逆完成序）：找到强连通分量 {' + e.nodes.join(',') + '}');
      C(600, step);
    }
  };
  step();
}

function clearAll() {
  engine.clear();
  for (let i = 0; i < N; i++) if (orderLabels[i]) { orderLabels[i].remove(); orderLabels[i] = null; }
  for (const [, e] of graph.nodes) e.node.remove();
  graph.nodes.clear();
  for (const [, e] of graph.edges) {
    scene.remove(e.mesh);
    if (e.weightLabel) e.weightLabel.remove();
  }
  graph.edges.clear();
  for (const cone of arrows.values()) scene.remove(cone);
  arrows.clear();
  status.textContent = '';
  hint.setText('已清空画布');
  resultLabel.setText('');
}

panel.addButton('运行Kosaraju', runKosaraju);
panel.addButton('清空', clearAll);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
