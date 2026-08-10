// AlgorithmLibrary/TopoSortDFS3D.js
// 拓扑排序（DFS 后序法）：有向无环图（六边形布局+箭头），DFS 访问时节点高亮+脉冲，
// 树边点亮为青绿，指向已访问节点的边闪红，节点完成时变暗并把标签飞入顶部序列行，
// 最终序列为完成顺序的逆序。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Graph3D } from '../3D/modes/Graph3D.js';
import { VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('TopoSortDFS3D');

const scene = new Scene3D('scene', { cameraPos: [0, 300, 620], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });
function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

const N = 6, R = 170;
const TREE_COLOR = 0x34d399; // 树边青绿
const RED_COLOR = 0xef4444;  // 回边红
const DONE_COLOR = 0x94a3b8; // 完成节点灰
const graph = new Graph3D(scene, { radius: 17 });
const POS = [];
for (let i = 0; i < N; i++) {
  const a = (i / N) * Math.PI * 2 - Math.PI / 2;
  POS[i] = [Math.cos(a) * R, 0, Math.sin(a) * R];
  graph.addNode(String(i), String(i), POS[i][0], POS[i][1], POS[i][2]);
}
const dag = [[1, 2], [3], [3, 5], [4], [], [4]];
for (let u = 0; u < N; u++) for (const v of dag[u]) graph.addEdge(String(u), String(v), { directed: true });

const cones = [];
function addArrow(a, b) {
  const A = graph.nodes.get(String(a)).node.mesh;
  const B = graph.nodes.get(String(b)).node.mesh;
  const dir = B.position.clone().sub(A.position).normalize();
  const tip = B.position.clone().addScaledVector(dir, -(graph.radius + 6));
  const cone = new THREE.Mesh(new THREE.ConeGeometry(9, 20, 10), new THREE.MeshBasicMaterial({ color: PALETTE.edge }));
  cone.position.copy(tip);
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  scene.add(cone);
  cones.push(cone);
}
for (let u = 0; u < N; u++) for (const v of dag[u]) addArrow(u, v);

// ---- 模型（与 /tmp/3dtest/graphmodel.mjs 一致）----
function topoDFSModel(adj, n) {
  const color = Array(n).fill(0);
  const finish = [];
  const treeEdges = [];
  const redEdges = [];
  const events = [];
  let cyclic = false;
  function dfs(u) {
    color[u] = 1;
    events.push({ t: 'visit', u });
    for (const v of adj[u]) {
      if (color[v] === 0) { treeEdges.push([u, v]); events.push({ t: 'tree', u, v }); dfs(v); }
      else { redEdges.push([u, v]); events.push({ t: 'red', u, v }); if (color[v] === 1) cyclic = true; }
    }
    color[u] = 2;
    finish.push(u);
    events.push({ t: 'finish', u });
  }
  for (let s = 0; s < n; s++) if (color[s] === 0) dfs(s);
  return { order: [...finish].reverse(), treeEdges, redEdges, events, cyclic };
}

const status = panel.addStatus('');
const hint = new VText(scene, { text: '点击「做拓扑排序」开始', x: 0, y: 240, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const orderTexts = [];

function colorEdge(a, b, color) {
  const e = graph.edges.get(`${a}->${b}`);
  if (!e) return;
  const from = new THREE.Color(e.baseColor);
  const to = new THREE.Color(color);
  C(280, (p) => {
    e.mesh.material.color.copy(from).lerp(to, p);
    e.mesh.material.opacity = e.baseOpacity + p * 0.35;
  }, () => { e.mesh.material.color.setHex(e.baseColor); e.mesh.material.opacity = e.baseOpacity; });
}

// 回边闪红后熄灭：直接改材质颜色，不经过 colorEdge（避免在命令 fn 内再入队）
function fadeRedEdge(a, b) {
  const e = graph.edges.get(`${a}->${b}`);
  if (!e) return;
  const from = new THREE.Color(RED_COLOR);
  const to = new THREE.Color(e.baseColor);
  C(450, (p) => {
    e.mesh.material.color.copy(from).lerp(to, p);
    e.mesh.material.opacity = e.baseOpacity;
    e.mesh.material.emissiveIntensity = 0;
  }, () => { e.mesh.material.color.setHex(e.baseColor); e.mesh.material.opacity = e.baseOpacity; });
}

function colorNode(u, color) {
  const m = graph.nodes.get(String(u)).node.mesh;
  const from = new THREE.Color(PALETTE.node);
  const to = new THREE.Color(color);
  C(300, (p) => {
    m.material.color.copy(from).lerp(to, p);
    m.material.emissive.copy(to).multiplyScalar(0.4);
  }, () => { m.material.color.setHex(PALETTE.node); m.material.emissive.setHex(PALETTE.nodeEmissive); });
}

function flyToRow(u, idx) {
  const [x, , z] = POS[u];
  const to = { x: -250 + idx * 62, y: 185, z: 0 };
  const vt = new VText(scene, { text: String(u), x, y: 70, z, color: PALETTE.text, scale: 0.9 });
  vt.sprite.scale.set(0.1, 0.05, 1);
  C(300, (p) => { const s = 0.01 + p * 0.99; vt.sprite.scale.set(90 * s, 45 * s, 1); }, () => vt.sprite.scale.set(0.1, 0.05, 1));
  C(500, (p) => {
    const t = easeInOut(p);
    vt.sprite.position.set(x + (to.x - x) * t, 70 + (to.y - 70) * t, z + (0 - z) * t);
  }, () => vt.sprite.position.set(x, 70, z));
  orderTexts.push(vt);
}

function runTopo() {
  engine.clear();
  for (let i = 0; i < N; i++) graph.dehighlightNode(String(i), C);
  for (const key of graph.edges.keys()) {
    const [a, b] = key.split('->');
    graph.lightEdge(a, b, false, C);
  }
  orderTexts.forEach((vt) => vt.remove());
  orderTexts.length = 0;

  const { order, events } = topoDFSModel(dag, N);
  const posInOrder = {};
  order.forEach((u, i) => { posInOrder[u] = i; });

  // 预展开为扁平命令序列：命令 fn 会在动画期间每帧被调用，
  // 若在 fn 内再入队命令会指数膨胀，必须一次性入队。
  for (const e of events) {
    if (e.t === 'visit') {
      graph.highlightNode(String(e.u), C);
      const m = graph.nodes.get(String(e.u)).node.mesh;
      C(380, (p) => { m.scale.setScalar(1.15 + 0.2 * Math.sin(p * Math.PI)); }, () => m.scale.setScalar(1));
      C(1, () => hint.setText('访问节点 ' + e.u + '（标为灰色）'), () => {});
    } else if (e.t === 'tree') {
      colorEdge(e.u, e.v, TREE_COLOR);
      C(1, () => hint.setText('沿树边 ' + e.u + ' → ' + e.v + ' 深入'), () => {});
    } else if (e.t === 'red') {
      colorEdge(e.u, e.v, RED_COLOR);
      C(1, () => hint.setText('边 ' + e.u + ' → ' + e.v + ' 指向已访问节点，跳过'), () => {});
      fadeRedEdge(e.u, e.v);
    } else {
      colorNode(e.u, DONE_COLOR);
      flyToRow(e.u, posInOrder[e.u]);
      C(1, () => hint.setText('节点 ' + e.u + ' 完成（标为黑色）'), () => {});
    }
    C(240, () => {}, () => {});
  }
  C(1, () => {
    status.textContent = '拓扑排序: ' + order.join(' → ');
    hint.setText('拓扑排序（DFS 后序逆序）完成: ' + order.join(' → '));
  }, () => {});
}

panel.addButton('做拓扑排序', runTopo);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
