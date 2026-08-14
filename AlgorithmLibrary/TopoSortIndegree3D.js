// AlgorithmLibrary/TopoSortIndegree3D.js — 拓扑排序（Kahn 入度法）：入度标签 + 入度 0 节点入队移出 + 递减邻居入度 + 拓扑序列（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VNode, VBox } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
applyTheme('TopoSortIndegree3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, WHITE = 0xffffff;
const status = panel.addStatus('就绪');
const ease = p => p * p * (3 - 2 * p);

const N = 6, R = 145;
const EDGES = [[0, 1], [0, 2], [1, 3], [2, 3], [2, 5], [3, 4]];
const adj = Array.from({ length: N }, () => []);
const nodeView = new Map();
const edgeView = new Map();  // 'f->t' -> { tube, arrow }
const inView = new Map();    // i -> 入度标签
const queueBoxes = [];
const order = [];
let indeg = [];

function posOf(i) { const a = (i / N) * Math.PI * 2 - Math.PI / 2; return new THREE.Vector3(Math.cos(a) * R + 320, Math.sin(a) * R + 480, 0); }
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
  queueBoxes.forEach(e => scene.remove(e.box.mesh));
  nodeView.clear(); edgeView.clear(); queueBoxes.length = 0; order.length = 0;
}
function buildGraph() {
  clearView();
  for (let i = 0; i < N; i++) adj[i].length = 0;
  for (let i = 0; i < N; i++) {
    const p = posOf(i);
    const vn = new VNode(scene, { radius: 20, x: p.x, y: p.y, z: p.z, label: String(i), color: BLUE, emissive: BLUE });
    nodeView.set(i, vn);
    const iT = new VText(scene, { text: '', x: 0, y: 46, z: 0, color: CYAN, scale: 0.62 });
    vn.mesh.add(iT.sprite);
    inView.set(i, iT);
  }
  for (const [f, t] of EDGES) {
    const a = posOf(f), b = posOf(t);
    const m = tube(a, b);
    const ar = arrow(a, b);
    scene.add(m); scene.add(ar);
    edgeView.set(f + '->' + t, { tube: m, arrow: ar });
    adj[f].push(t);
  }
}
function setNodeColor(i, c) { nodeView.get(i).setColor(c, c); }
function setEdgeColor(f, t, c, op) { const e = edgeView.get(f + '->' + t); if (e) { e.tube.material.color.setHex(c); e.tube.material.opacity = op; e.arrow.material.color.setHex(c); e.arrow.material.opacity = op; } }
function resetEdgeColors() { edgeView.forEach(e => { e.tube.material.color.setHex(WHITE); e.tube.material.opacity = 0.55; e.arrow.material.color.setHex(WHITE); e.arrow.material.opacity = 0.55; }); }
function* pushBox(id) {
  const x = 155 + queueBoxes.length * 55;
  const box = new VBox(scene, { w: 42, h: 42, d: 20, x, y: 730, z: 0, label: id, color: ORANGE, emissive: ORANGE });
  box.mesh.scale.setScalar(0.01);
  yield A(280, p => { box.mesh.scale.setScalar(0.01 + 0.99 * ease(p)); });
  queueBoxes.push({ id, box });
}
function* popBox() {
  const e = queueBoxes.shift();
  if (!e) return;
  yield A(240, p => { e.box.mesh.scale.setScalar(1 - ease(p)); });
  scene.remove(e.box.mesh);
  const tasks = queueBoxes.map(b => ({ box: b.box, from: b.box.mesh.position.x }));
  if (tasks.length) yield A(300, p => tasks.forEach(t => t.box.mesh.position.x = t.from - 55 * ease(p)));
}
function showIndeg() { indeg.forEach((d, i) => inView.get(i).setText('in=' + d)); }

function* kahnGen() {
  indeg = Array(N).fill(0);
  for (const [, t] of EDGES) indeg[t]++;
  showIndeg();
  const q = [];
  for (let i = 0; i < N; i++) if (indeg[i] === 0) { q.push(i); yield* pushBox(String(i)); }
  yield S(() => { status.textContent = '统计入度：' + indeg.join(',') + '。入度 0 节点 ' + q.join(',') + ' 入队'; });
  yield W(600);
  let head = 0;
  while (head < q.length) {
    const u = q[head++];
    setNodeColor(u, GOLD);
    yield S(() => { status.textContent = '出队 ' + u + '：加入拓扑序列，递减其邻居入度。当前序列：' + order.join(' → '); });
    yield* popBox();
    order.push(u);
    yield W(420);
    for (const v of adj[u]) {
      indeg[v]--;
      setEdgeColor(u, v, CYAN, 1);
      showIndeg();
      setNodeColor(v, ORANGE);
      yield S(() => { status.textContent = '边 ' + u + '→' + v + '：in[' + v + '] → ' + indeg[v]; });
      yield W(350);
      if (indeg[v] === 0) {
        q.push(v);
        yield* pushBox(String(v));
        yield S(() => { status.textContent = v + ' 入度归 0 → 入队'; });
        yield W(320);
      }
      resetEdgeColors();
    }
    setNodeColor(u, GREEN);
  }
  if (order.length < N) {
    yield S(() => { status.textContent = '剩余 ' + (N - order.length) + ' 个节点入度恒 > 0 → 图中存在环，无法拓扑排序！'; });
    yield W(500);
  } else {
    yield S(() => { status.textContent = '全部节点移出（' + N + '/' + N + '）→ 无环'; });
    yield W(400);
    yield S(() => { status.textContent = '拓扑排序(Kahn) 演示完成：序列 ' + order.join(' → ') + '，O(V+E)'; });
  }
  yield W(500);
}

function* runKahn() {
  buildGraph();
  yield W(400);
  yield* kahnGen();
}

engine.queue(() => runKahn());
panel.addButton('清空', () => { engine.clear(); clearView(); status.textContent = ''; });
scene.start(engine);
