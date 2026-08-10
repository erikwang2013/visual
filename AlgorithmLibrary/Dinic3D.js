// AlgorithmLibrary/Dinic3D.js
// 最大流（Dinic 算法）：6 节点有向图，源 s → 汇 t，边带容量/流量标注。
// BFS 分层（level 标注）→ DFS 找增广路（路径边红色高亮）→ 残量更新（流量标注变化动画）
// → 重复至无增广路，状态文本显示最大流值。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Graph3D } from '../3D/modes/Graph3D.js';
import { VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Dinic3D');

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
const adj = Array.from({ length: N }, () => []);
const cap = new Map();      // "u->v" -> 容量
const flow = new Map();     // "u->v" -> 当前流量
const arrows = new Map();   // "u->v" -> 箭头锥体
const flowLabels = new Map(); // "u->v" -> VText
const levelLabels = [];

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
  for (const cone of arrows.values()) scene.remove(cone);
  arrows.clear();
  for (const vt of flowLabels.values()) vt.remove();
  flowLabels.clear();
  for (const [a, b] of EDGES) {
    if (!adj[a].includes(b)) adj[a].push(b);
    graph.addEdge(String(a), String(b), { directed: true });
    addArrow(a, b);
    const mid = edgeMid(a, b);
    flowLabels.set(keyOf(a, b), new VText(scene, { text: '0/' + cap.get(keyOf(a, b)), x: mid.x, y: mid.y, z: mid.z, color: PALETTE.textDim, scale: 0.7 }));
  }
}

function setEdgeColor(a, b, color) {
  const k = keyOf(a, b);
  const e = graph.edges.get(k);
  if (e) { e.mesh.material.color.setHex(color); e.mesh.material.emissiveIntensity = 0; }
  const cone = arrows.get(k);
  if (cone) cone.material.color.setHex(color);
}

function resetEdge(a, b) {
  const k = keyOf(a, b);
  const e = graph.edges.get(k);
  if (e) { e.mesh.material.color.setHex(PALETTE.edge); e.mesh.material.emissiveIntensity = 0; }
  const cone = arrows.get(k);
  if (cone) cone.material.color.setHex(PALETTE.edge);
}

function setFlowText(k) {
  const vt = flowLabels.get(k);
  if (vt) vt.setText(flow.get(k) + '/' + cap.get(k), { color: PALETTE.textDim, scale: 0.7 });
}

function animateFlowLabel(a, b) {
  const k = keyOf(a, b);
  const vt = flowLabels.get(k);
  if (!vt) return;
  vt.setText(flow.get(k) + '/' + cap.get(k), { color: flow.get(k) >= cap.get(k) ? '#fde68a' : PALETTE.textGlow, scale: 0.7 });
  vt.sprite.scale.set(0.1, 0.05, 1);
  C(260, (p) => { const s = 0.01 + p * 0.99; vt.sprite.scale.set(70 * s, 35 * s, 1); }, () => vt.sprite.scale.set(70, 35, 1));
}

// Dinic 模型：分阶段（BFS 分层 + 本层多条增广路），预计算全部动画步骤
function dinicModel() {
  const capR = new Map([...cap].map(([k, v]) => [k, v]));
  const phases = [];
  let maxflow = 0;
  for (;;) {
    const level = Array(N).fill(-1);
    const order = [];
    const q = [SRC];
    level[SRC] = 0;
    order.push([SRC, 0]);
    while (q.length) {
      const u = q.shift();
      for (const v of adj[u]) {
        const k = keyOf(u, v);
        if (level[v] < 0 && (capR.get(k) || 0) > 0) {
          level[v] = level[u] + 1;
          order.push([v, level[v]]);
          q.push(v);
        }
      }
    }
    if (level[SNK] < 0) break;
    const paths = [];
    for (;;) {
      const par = new Map();
      const visited = new Set([SRC]);
      const stack = [SRC];
      let foundT = false;
      while (stack.length && !foundT) {
        const u = stack.pop();
        for (const v of adj[u]) {
          const k = keyOf(u, v);
          if (visited.has(v)) continue;
          if (level[v] === level[u] + 1 && (capR.get(k) || 0) > 0) {
            visited.add(v);
            par.set(v, u);
            if (v === SNK) { foundT = true; break; }
            stack.push(v);
          }
        }
      }
      if (!foundT) break;
      const chain = [];
      let v = SNK;
      let delta = Infinity;
      while (v !== SRC) {
        const u = par.get(v);
        chain.unshift([u, v]);
        delta = Math.min(delta, capR.get(keyOf(u, v)));
        v = u;
      }
      for (const [u, vv] of chain) {
        const k = keyOf(u, vv);
        capR.set(k, capR.get(k) - delta);
        const rk = keyOf(vv, u);
        capR.set(rk, (capR.get(rk) || 0) + delta);
      }
      maxflow += delta;
      paths.push({ chain, delta });
    }
    phases.push({ levels: order, paths });
  }
  return { phases, maxflow };
}

const status = panel.addStatus('');
const hint = new VText(scene, { text: '点击「运行 Dinic」计算 s → t 最大流', x: 0, y: 240, z: 0, color: PALETTE.textGlow, scale: 0.85 });

function clearLevelLabels() {
  for (const vt of levelLabels) vt.remove();
  levelLabels.length = 0;
}

function spawnLevelLabel(u, lv) {
  const [x, , z] = POS[u];
  const vt = new VText(scene, { text: 'L=' + lv, x, y: 82, z, color: PALETTE.textGlow, scale: 0.6 });
  vt.sprite.scale.set(0.1, 0.05, 1);
  C(220, (p) => { const s = 0.01 + p * 0.99; vt.sprite.scale.set(60 * s, 30 * s, 1); }, () => vt.sprite.scale.set(0.1, 0.05, 1));
  levelLabels.push(vt);
}

function runDinic() {
  engine.clear();
  clearLevelLabels();
  for (let i = 0; i < N; i++) graph.dehighlightNode(String(i), C);
  for (const [a, b] of EDGES) resetEdge(a, b);
  for (const k of cap.keys()) { flow.set(k, 0); setFlowText(k); }
  const { phases, maxflow } = dinicModel();
  let pi = 0;
  function nextPhase() {
    if (pi >= phases.length) { finish(maxflow); return; }
    const ph = phases[pi];
    let li = 0;
    function nextLevel() {
      if (li >= ph.levels.length) { startPaths(); return; }
      const [u, lv] = ph.levels[li];
      graph.highlightNode(String(u), C);
      spawnLevelLabel(u, lv);
      hint.setText('BFS 分层：节点 ' + NAMES[u] + ' 在第 ' + lv + ' 层');
      li++;
      C(200, nextLevel);
    }
    function startPaths() {
      let qi = 0;
      function nextPath() {
        if (qi >= ph.paths.length) { pi++; C(500, nextPhase); return; }
        const p = ph.paths[qi];
        for (const [u, v] of p.chain) setEdgeColor(u, v, 0xef4444);
        hint.setText('DFS 找到增广路 ' + p.chain.map(([u, v]) => NAMES[u] + '→' + NAMES[v]).join(' ') + '，增广 ' + p.delta);
        qi++;
        let ei = 0;
        function nextEdge() {
          if (ei >= p.chain.length) { C(400, nextPath); return; }
          const [u, v] = p.chain[ei];
          flow.set(keyOf(u, v), flow.get(keyOf(u, v)) + p.delta);
          animateFlowLabel(u, v);
          resetEdge(u, v);
          ei++;
          C(260, nextEdge);
        }
        nextEdge();
      }
      nextPath();
    }
    nextLevel();
  }
  function finish(mf) {
    for (const [a, b] of EDGES) {
      if (flow.get(keyOf(a, b)) > 0) setEdgeColor(a, b, 0x34d399);
    }
    status.textContent = '最大流 = ' + mf;
    hint.setText('Dinic 完成：s → t 最大流为 ' + mf);
  }
  nextPhase();
}

function newGraph() {
  engine.clear();
  clearLevelLabels();
  for (let i = 0; i < N; i++) graph.dehighlightNode(String(i), C);
  for (const k of cap.keys()) {
    cap.set(k, 1 + Math.floor(Math.random() * 9));
    flow.set(k, 0);
    setFlowText(k);
    const [a, b] = k.split('->').map(Number);
    resetEdge(a, b);
  }
  status.textContent = '';
  hint.setText('新容量已生成，点击「运行 Dinic」计算最大流');
}

function clearAll() {
  engine.clear();
  clearLevelLabels();
  for (let i = 0; i < N; i++) graph.dehighlightNode(String(i), C);
  for (const k of cap.keys()) {
    flow.set(k, 0);
    setFlowText(k);
    const [a, b] = k.split('->').map(Number);
    resetEdge(a, b);
  }
  status.textContent = '已清空';
  hint.setText('已清空，点击「运行 Dinic」计算最大流');
}

for (const [a, b] of EDGES) cap.set(keyOf(a, b), 1 + Math.floor(Math.random() * 9));
buildGraph();

panel.addButton('运行 Dinic', runDinic);
panel.addButton('新图', newGraph);
panel.addButton('清空', clearAll);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
