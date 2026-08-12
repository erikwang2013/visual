// AlgorithmLibrary/TopoSortDFS3D.js — 拓扑排序（DFS 后序）：有向无环图 + 灰/黑着色 + 回边检测 + 逆后序序列（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VNode, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('TopoSortDFS3D');

const scene = new Scene3D('scene', { cameraPos: [0, 260, 720], fov: 55 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, WHITE = 0xffffff;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：拓扑排序（DFS 后序，节点 0 出发）', x: 0, y: 315, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const outT = new VText(scene, { text: '', x: 0, y: -215, z: 0, color: PALETTE.textGlow, scale: 0.7 });
const orderT = new VText(scene, { text: '', x: 0, y: 258, z: 0, color: PALETTE.yellow, scale: 0.75 });

const N = 6, R = 185;
const EDGES = [[0, 1], [0, 2], [1, 3], [2, 3], [2, 5], [3, 4]];
const adj = Array.from({ length: N }, () => []);
const nodeView = new Map();
const edgeView = new Map();  // 'f->t' -> { tube, arrow, lbl }
const stackBoxes = [];
const order = [];
let state = [];

function posOf(i) { const a = (i / N) * Math.PI * 2 - Math.PI / 2; return new THREE.Vector3(Math.cos(a) * R, 0, Math.sin(a) * R); }
function tube(a, b) {
  const curve = new THREE.CatmullRomCurve3([a, b]);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 4, 2.5, 6), new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.55 }));
}
function arrow(a, b) {
  const d = new THREE.Vector3().subVectors(b, a).normalize();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(7, 16, 8), new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.55 }));
  cone.position.copy(b).addScaledVector(d, -24);
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
  return cone;
}
function clearView() {
  nodeView.forEach(v => scene.remove(v.mesh));
  edgeView.forEach(e => { scene.remove(e.tube); e.tube.geometry.dispose(); e.tube.material.dispose(); scene.remove(e.arrow); e.arrow.geometry.dispose(); e.arrow.material.dispose(); });
  stackBoxes.forEach(e => scene.remove(e.box.mesh));
  nodeView.clear(); edgeView.clear(); stackBoxes.length = 0; order.length = 0;
}
function buildGraph() {
  clearView();
  for (let i = 0; i < N; i++) adj[i].length = 0;
  for (let i = 0; i < N; i++) {
    const p = posOf(i);
    const vn = new VNode(scene, { radius: 20, x: p.x, y: p.y, z: p.z, label: String(i), color: BLUE, emissive: BLUE });
    nodeView.set(i, vn);
  }
  for (const [f, t] of EDGES) {
    const a = posOf(f), b = posOf(t);
    const m = tube(a, b);
    const ar = arrow(a, b);
    scene.add(m); scene.add(ar);
    const mid = new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2 + 20, (a.z + b.z) / 2);
    const lbl = new VText(scene, { text: '', x: mid.x, y: mid.y, z: mid.z, color: WHITE, scale: 0.6 });
    edgeView.set(f + '->' + t, { tube: m, arrow: ar, lbl });
    adj[f].push(t);
  }
}
function setNodeColor(i, c) { nodeView.get(i).setColor(c, c); }
function setEdgeColor(f, t, c, op) { const e = edgeView.get(f + '->' + t); if (e) { e.tube.material.color.setHex(c); e.tube.material.opacity = op; e.arrow.material.color.setHex(c); e.arrow.material.opacity = op; } }
function resetEdgeColors() { edgeView.forEach(e => { e.tube.material.color.setHex(WHITE); e.tube.material.opacity = 0.55; e.arrow.material.color.setHex(WHITE); e.arrow.material.opacity = 0.55; }); }
function* pushBox(id) {
  const x = 165 - stackBoxes.length * 55;
  const box = new VBox(scene, { w: 42, h: 42, d: 20, x, y: 175, z: 0, label: id, color: ORANGE, emissive: ORANGE });
  box.mesh.scale.setScalar(0.01);
  yield A(280, p => { box.mesh.scale.setScalar(0.01 + 0.99 * p); });
  stackBoxes.push({ id, box });
}
function* popBox() {
  const e = stackBoxes.pop();
  if (!e) return;
  yield A(240, p => { e.box.mesh.scale.setScalar(1 - p); });
  scene.remove(e.box.mesh);
}

function* dfs(u) {
  state[u] = 1;
  setNodeColor(u, GOLD);
  yield* pushBox(String(u));
  yield S(() => outT.setText('访问 ' + u + '（置灰，压栈），探索出边'));
  yield W(420);
  for (const v of adj[u]) {
    if (state[v] === 0) {
      setEdgeColor(u, v, CYAN, 1);
      yield S(() => outT.setText('树边 ' + u + '→' + v + '：递归访问 ' + v));
      yield W(350);
      yield* dfs(v);
      resetEdgeColors();
    } else if (state[v] === 1) {
      setEdgeColor(u, v, RED, 1);
      yield S(() => outT.setText('回边 ' + u + '→' + v + '（' + v + ' 仍在栈中灰）→ 存在环，无法拓扑排序！'));
      yield W(500);
      resetEdgeColors();
    } else {
      setEdgeColor(u, v, ORANGE, 0.8);
      yield S(() => outT.setText('跨边 ' + u + '→' + v + '（' + v + ' 已完成），跳过'));
      yield W(280);
      resetEdgeColors();
    }
  }
  state[u] = 2;
  setNodeColor(u, GREEN);
  yield* popBox();
  order.unshift(u);
  yield S(() => outT.setText(u + ' 完成（后序）→ 压入序列头部。当前拓扑序：' + order.join(' → ')));
  orderT.setText('拓扑序列：' + order.join(' → '));
  yield W(450);
}

function* topoGen() {
  state = Array(N).fill(0);
  yield S(() => outT.setText('DFS 后序：节点完成顺序的逆序 = 拓扑序。0=白未访 1=灰在栈 2=黑完成'));
  yield W(550);
  yield* dfs(0);
  yield S(() => outT.setText('从 0 可达的全部节点已完成'));
  yield W(400);
  yield S(() => {
    outT.setText('拓扑序列：' + order.join(' → ') + '。每条边均从左指向右 ✓');
    status.textContent = 'TopoSort(DFS) 完成：序列 ' + order.join(',') + '，无环，O(V+E)';
  });
  yield W(600);
}

function* runTopo() {
  buildGraph();
  hint.setText('TopoSort(DFS)：后序逆序 + 灰/黑着色判环');
  yield W(400);
  yield* topoGen();
  yield S(() => { outT.setText(''); hint.setText('拓扑排序完成：' + order.join(' → ')); });
}

engine.queue(() => runTopo());
panel.addButton('清空', () => { engine.clear(); clearView(); hint.setText('已清空，可重新运行'); status.textContent = ''; outT.setText(''); orderT.setText(''); });
panel.addLabel('（拖拽旋转视角，滚轮缩放；箭头 = 有向边，灰 = 访问中，绿 = 完成，红 = 回边，顶行 = 拓扑序列）');

scene.start(engine);
