// AlgorithmLibrary/Tarjan3D.js
// 强连通分量（Tarjan）：7 节点有向图 DFS 遍历，节点标注 dfn/low，
// 树边青色 / 回边红色 / 横叉边紫色高亮，发现 SCC 时同色圈出（节点变色 + 圆环），
// 状态文本输出每个 SCC 的顶点集。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Graph3D } from '../3D/modes/Graph3D.js';
import { VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Tarjan3D');

const scene = new Scene3D('scene', { cameraPos: [0, 300, 640], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const N = 7, R = 205;
const graph = new Graph3D(scene, { radius: 16 });
const POS = [];
for (let i = 0; i < N; i++) {
  const a = (i / N) * Math.PI * 2 - Math.PI / 2;
  POS[i] = [Math.cos(a) * R, 0, Math.sin(a) * R];
  graph.addNode(String(i), String(i), POS[i][0], POS[i][1], POS[i][2]);
}

const EDGE_COLOR = { tree: 0x22d3ee, back: 0xef4444, cross: 0xa855f7 };
const SCC_COLORS = [0x34d399, 0xf97316, 0xa855f7, 0xf472b6, 0xfacc15, 0x22d3ee, 0x60a5fa];
// 经典样例（含树边/回边/横叉边）：SCC 为 {2,1} {4,3} {6,5} {0}
const BASE_EDGES = [[0, 1], [1, 2], [2, 1], [0, 3], [3, 4], [4, 3], [4, 1], [0, 5], [5, 6], [6, 5]];

const adj = Array.from({ length: N }, () => []);
const arrows = new Map();   // "u->v" -> 箭头锥体
const dlTexts = [];         // 每节点 dfn/low VText
const rings = [];           // SCC 圆环
let edgePairs = [];

function addArrow(a, b) {
  const A = graph.nodes.get(String(a)).node.mesh;
  const B = graph.nodes.get(String(b)).node.mesh;
  const dir = B.position.clone().sub(A.position).normalize();
  const tip = B.position.clone().addScaledVector(dir, -(graph.radius + 5));
  const cone = new THREE.Mesh(new THREE.ConeGeometry(8, 18, 10), new THREE.MeshBasicMaterial({ color: PALETTE.edge }));
  cone.position.copy(tip);
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  scene.add(cone);
  arrows.set(a + '->' + b, cone);
}

function setEdgeColor(a, b, color) {
  const k = a + '->' + b;
  const e = graph.edges.get(k);
  if (e) { e.mesh.material.color.setHex(color); e.mesh.material.emissiveIntensity = 0; }
  const cone = arrows.get(k);
  if (cone) cone.material.color.setHex(color);
}

function resetEdge(a, b) {
  const k = a + '->' + b;
  const e = graph.edges.get(k);
  if (e) { e.mesh.material.color.setHex(PALETTE.edge); e.mesh.material.emissiveIntensity = 0; }
  const cone = arrows.get(k);
  if (cone) cone.material.color.setHex(PALETTE.edge);
}

function rebuildGraph(edges) {
  for (const key of [...graph.edges.keys()]) {
    const e = graph.edges.get(key);
    scene.remove(e.mesh);
    if (e.weightLabel) e.weightLabel.remove();
    graph.edges.delete(key);
  }
  for (const cone of arrows.values()) scene.remove(cone);
  arrows.clear();
  for (let i = 0; i < N; i++) adj[i] = [];
  edgePairs = edges;
  for (const [a, b] of edges) {
    adj[a].push(b);
    graph.addEdge(String(a), String(b), { directed: true });
    addArrow(a, b);
  }
}

function randomEdges() {
  const set = new Set(BASE_EDGES.map(([a, b]) => a + '-' + b));
  for (let u = 0; u < N; u++) {
    for (let v = 0; v < N; v++) {
      if (u === v) continue;
      const k = u + '-' + v;
      if (!set.has(k) && Math.random() < 0.15) set.add(k);
    }
  }
  return [...set].map((s) => s.split('-').map(Number));
}

// Tarjan 模型：输出 visit/edge/label/scc 步骤序列（与渲染动画一一对应）
const dfn = Array(N).fill(0), low = Array(N).fill(0);

function tarjanModel() {
  const steps = [];
  dfn.fill(0); low.fill(0);
  const onStack = Array(N).fill(false);
  const stack = [];
  let idx = 0;
  function dfs(u) {
    dfn[u] = low[u] = ++idx;
    stack.push(u);
    onStack[u] = true;
    steps.push({ t: 'visit', u });
    for (const v of adj[u]) {
      if (!dfn[v]) {
        steps.push({ t: 'edge', u, v, type: 'tree' });
        dfs(v);
        low[u] = Math.min(low[u], low[v]);
        steps.push({ t: 'label', u });
      } else if (onStack[v]) {
        steps.push({ t: 'edge', u, v, type: 'back' });
        low[u] = Math.min(low[u], dfn[v]);
        steps.push({ t: 'label', u });
      } else {
        steps.push({ t: 'edge', u, v, type: 'cross' });
      }
    }
    if (low[u] === dfn[u]) {
      const comp = [];
      let w;
      do { w = stack.pop(); onStack[w] = false; comp.push(w); } while (w !== u);
      steps.push({ t: 'scc', comp });
    }
  }
  for (let i = 0; i < N; i++) if (!dfn[i]) dfs(i);
  return steps;
}

const status = panel.addStatus('');
const hint = new VText(scene, { text: '点击「运行 Tarjan」求强连通分量', x: 0, y: 245, z: 0, color: PALETTE.textGlow, scale: 0.85 });

function spawnDL(u) {
  const [x, , z] = POS[u];
  const vt = new VText(scene, { text: dfn[u] + '/' + low[u], x, y: 84, z, color: PALETTE.textGlow, scale: 0.65 });
  vt.sprite.scale.set(0.1, 0.05, 1);
  C(250, (p) => { const s = 0.01 + p * 0.99; vt.sprite.scale.set(70 * s, 35 * s, 1); }, () => vt.sprite.scale.set(0.1, 0.05, 1));
  dlTexts[u] = vt;
}

function updateDL(u) {
  if (!dlTexts[u]) spawnDL(u);
  dlTexts[u].setText(dfn[u] + '/' + low[u], { color: low[u] < dfn[u] ? '#fde68a' : PALETTE.textGlow, scale: 0.65 });
}

function resetVisuals() {
  for (const ring of rings) scene.remove(ring);
  rings.length = 0;
  for (const vt of dlTexts) if (vt) vt.remove();
  dlTexts.length = 0;
  for (let i = 0; i < N; i++) {
    graph.dehighlightNode(String(i), C);
    const node = graph.nodes.get(String(i)).node;
    node.setColor(PALETTE.node, PALETTE.nodeEmissive);
    node.setText(String(i));
  }
  for (const [u, v] of edgePairs) resetEdge(u, v);
}

function runTarjan() {
  engine.clear();
  resetVisuals();
  const steps = tarjanModel();
  const sccList = [];
  let i = 0, sccIdx = 0;
  function next() {
    if (i >= steps.length) {
      status.textContent = '强连通分量: ' + sccList.map((s) => '{' + s.join(',') + '}').join('  ');
      hint.setText('Tarjan 完成，共 ' + sccList.length + ' 个强连通分量');
      return;
    }
    const s = steps[i];
    i++;
    if (s.t === 'visit') {
      graph.highlightNode(String(s.u), C, 0x22d3ee);
      spawnDL(s.u);
      hint.setText('访问节点 ' + s.u + '：dfn=low=' + dfn[s.u]);
    } else if (s.t === 'edge') {
      setEdgeColor(s.u, s.v, EDGE_COLOR[s.type]);
      const label = s.type === 'tree' ? '树边' : (s.type === 'back' ? '回边' : '横叉边');
      hint.setText('边 ' + s.u + '→' + s.v + ' 是' + label);
    } else if (s.t === 'label') {
      updateDL(s.u);
      hint.setText('更新 low[' + s.u + '] = ' + low[s.u]);
    } else if (s.t === 'scc') {
      const color = SCC_COLORS[sccIdx % SCC_COLORS.length];
      sccIdx++;
      sccList.push(s.comp);
      for (const u of s.comp) {
        const node = graph.nodes.get(String(u)).node;
        node.setColor(color, color);
        const [x, y, z] = POS[u];
        const ring = new THREE.Mesh(new THREE.TorusGeometry(30, 2.5, 8, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 }));
        ring.position.set(x, y, z);
        scene.add(ring);
        rings.push(ring);
      }
      hint.setText('发现强连通分量 {' + s.comp.join(',') + '}');
    }
    C(200, next);
  }
  next();
}

function newGraph() {
  engine.clear();
  resetVisuals();
  rebuildGraph(randomEdges());
  status.textContent = '';
  hint.setText('新图已生成，点击「运行 Tarjan」求强连通分量');
}

function clearAll() {
  engine.clear();
  resetVisuals();
  status.textContent = '已清空';
  hint.setText('已清空，点击「运行 Tarjan」求强连通分量');
}

rebuildGraph(BASE_EDGES);

panel.addButton('运行 Tarjan', runTarjan);
panel.addButton('新图', newGraph);
panel.addButton('清空', clearAll);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
