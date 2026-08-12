// AlgorithmLibrary/TopoSortIndegree3D.js — 拓扑排序（Kahn 入度法）：入度标签 + 入度 0 节点入队移出 + 递减邻居入度 + 序列行（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VNode, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('TopoSortIndegree3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, WHITE = 0xffffff;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：拓扑排序（Kahn 入度法）', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');
const outT = new VText(scene, { text: '', x: 700, y: 420, z: 0, color: PALETTE.textGlow, scale: 0.55, wrapChars: 8 });
const orderT = new VText(scene, { text: '', x: 700, y: 300, z: 0, color: PALETTE.yellow, scale: 0.55, wrapChars: 8 });

const N = 6, R = 185;
const EDGES = [[0, 1], [0, 2], [1, 3], [2, 3], [2, 5], [3, 4]];
const adj = Array.from({ length: N }, () => []);
const nodeView = new Map();
const edgeView = new Map();  // 'f->t' -> { tube, arrow, lbl }
const inView = new Map();    // i -> 入度标签
const queueBoxes = [];
const order = [];
let indeg = [];

function posOf(i) { const a = (i / N) * Math.PI * 2 - Math.PI / 2; return new THREE.Vector3(Math.cos(a) * R + 320, 300, Math.sin(a) * R); }
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
    const lbl = new VText(scene, { text: '', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + 20, z: (a.z + b.z) / 2, color: WHITE, scale: 0.6 });
    edgeView.set(f + '->' + t, { tube: m, arrow: ar, lbl });
    adj[f].push(t);
  }
}
function setNodeColor(i, c) { nodeView.get(i).setColor(c, c); }
function setEdgeColor(f, t, c, op) { const e = edgeView.get(f + '->' + t); if (e) { e.tube.material.color.setHex(c); e.tube.material.opacity = op; e.arrow.material.color.setHex(c); e.arrow.material.opacity = op; } }
function resetEdgeColors() { edgeView.forEach(e => { e.tube.material.color.setHex(WHITE); e.tube.material.opacity = 0.55; e.arrow.material.color.setHex(WHITE); e.arrow.material.opacity = 0.55; }); }
function* pushBox(id) {
  const x = 155 + queueBoxes.length * 55;
  const box = new VBox(scene, { w: 42, h: 42, d: 20, x, y: 475, z: 0, label: id, color: ORANGE, emissive: ORANGE });
  box.mesh.scale.setScalar(0.01);
  yield A(280, p => { box.mesh.scale.setScalar(0.01 + 0.99 * p); });
  queueBoxes.push({ id, box });
}
function* popBox() {
  const e = queueBoxes.shift();
  if (!e) return;
  yield A(240, p => { e.box.mesh.scale.setScalar(1 - p); });
  scene.remove(e.box.mesh);
  const tasks = queueBoxes.map(b => ({ box: b.box, from: b.box.mesh.position.x }));
  if (tasks.length) yield A(300, p => tasks.forEach(t => t.box.mesh.position.x = t.from - 55 * p));
}
function showIndeg() { indeg.forEach((d, i) => inView.get(i).setText('in=' + d)); }

function* kahnGen() {
  indeg = Array(N).fill(0);
  for (const [, t] of EDGES) indeg[t]++;
  showIndeg();
  const q = [];
  for (let i = 0; i < N; i++) if (indeg[i] === 0) { q.push(i); yield* pushBox(String(i)); }
  yield S(() => outT.setText('统计入度：' + indeg.join(',') + '。入度 0 节点 ' + q.join(',') + ' 入队'));
  yield W(600);
  let head = 0;
  while (head < q.length) {
    const u = q[head++];
    setNodeColor(u, GOLD);
    yield S(() => outT.setText('出队 ' + u + '：加入拓扑序列，递减其邻居入度'));
    yield* popBox();
    order.push(u);
    orderT.setText('拓扑序列：' + order.join(' → '));
    yield W(420);
    for (const v of adj[u]) {
      indeg[v]--;
      setEdgeColor(u, v, CYAN, 1);
      showIndeg();
      setNodeColor(v, ORANGE);
      yield S(() => outT.setText('边 ' + u + '→' + v + '：in[' + v + '] → ' + indeg[v]));
      yield W(350);
      if (indeg[v] === 0) {
        q.push(v);
        yield* pushBox(String(v));
        yield S(() => outT.setText(v + ' 入度归 0 → 入队'));
        yield W(320);
      }
      resetEdgeColors();
    }
    setNodeColor(u, GREEN);
  }
  if (order.length < N) {
    yield S(() => outT.setText('剩余 ' + (N - order.length) + ' 个节点入度恒 > 0 → 图中存在环！'));
    status.textContent = 'TopoSort(Kahn)：检测到环，无法拓扑排序';
    yield W(500);
  } else {
    yield S(() => outT.setText('全部节点移出（' + N + '/' + N + '）→ 无环'));
    yield W(400);
    yield S(() => {
      outT.setText('拓扑序列：' + order.join(' → '));
      status.textContent = 'TopoSort(Kahn) 完成：序列 ' + order.join(',') + '，O(V+E)';
    });
  }
  yield W(500);
}

function* runKahn() {
  buildGraph();
  hint.setText('Kahn 入度法：不断移出入度为 0 的节点');
  yield W(400);
  yield* kahnGen();
  yield S(() => { outT.setText(''); hint.setText('Kahn 完成：序列 ' + order.join(' → ')); });
}

engine.queue(() => runKahn());
panel.addButton('清空', () => { engine.clear(); clearView(); hint.setText('已清空，可重新运行'); status.textContent = ''; outT.setText(''); orderT.setText(''); });
panel.addLabel('（拖拽旋转视角，滚轮缩放；箭头 = 有向边，节点上方 = 入度，橙 = 入队，金 = 出队，绿 = 完成；顶行 = 序列）');

scene.start(engine);
