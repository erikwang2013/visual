// AlgorithmLibrary/ConnectedComponent3D.js — 连通分量：左右两个分量的样例图，逐分量 BFS 遍历，节点与边染成分量色并标注分量编号（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VNode, VBox } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
applyTheme('ConnectedComponent3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff;
const status = panel.addStatus('就绪');

const N = 8;
const COMP_COLORS = [CYAN, PUR];   // 分量1 青，分量2 紫
const nodeView = new Map();
const edgeView = new Map();        // 'a-b' -> { tube, lbl }，a<b
const compView = new Map();        // i -> 分量编号标签
const queueBoxes = [];
const adj = Array.from({ length: N }, () => []);
const compOf = new Array(N).fill(-1);

function circ(cx, cz, r, i, n) { const a = (i / n) * Math.PI * 2 - Math.PI / 2; return [cx + Math.cos(a) * r, 365, cz + Math.sin(a) * r]; }
const POS = [];
for (let i = 0; i < 5; i++) POS[i] = circ(150, 0, 120, i, 5);
for (let i = 0; i < 3; i++) POS[5 + i] = circ(520, 0, 95, i, 3);
const EDGES = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 4], [1, 3], [5, 6], [6, 7], [5, 7]];

function tube(a, b) {
  const curve = new THREE.CatmullRomCurve3([a, b]);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 4, 2.5, 6), new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.55 }));
}
function clearView() {
  nodeView.forEach(v => scene.remove(v.mesh));
  edgeView.forEach(e => { scene.remove(e.tube); e.tube.geometry.dispose(); e.tube.material.dispose(); });
  queueBoxes.forEach(e => scene.remove(e.box.mesh));
  nodeView.clear(); edgeView.clear(); queueBoxes.length = 0;
}
function buildGraph() {
  clearView();
  for (let i = 0; i < N; i++) { adj[i].length = 0; compOf[i] = -1; }
  for (let i = 0; i < N; i++) {
    const [x, y, z] = POS[i];
    const vn = new VNode(scene, { radius: 20, x, y, z, label: String(i), color: BLUE, emissive: BLUE });
    nodeView.set(i, vn);
    const cT = new VText(scene, { text: '', x: 0, y: -50, z: 0, color: WHITE, scale: 0.5 });
    vn.mesh.add(cT.sprite);
    compView.set(i, cT);
  }
  for (const [a, b] of EDGES) {
    const pa = new THREE.Vector3(...POS[a]), pb = new THREE.Vector3(...POS[b]);
    const m = tube(pa, pb);
    scene.add(m);
    const key = a < b ? a + '-' + b : b + '-' + a;
    edgeView.set(key, { tube: m });
    adj[a].push(b); adj[b].push(a);
  }
}
function setNodeColor(i, c) { nodeView.get(i).setColor(c, c); }
function setEdgeColor(a, b, c, op) { const e = edgeView.get(a < b ? a + '-' + b : b + '-' + a); if (e) { e.tube.material.color.setHex(c); e.tube.material.opacity = op; } }
function resetEdgeColors() { edgeView.forEach(e => { e.tube.material.color.setHex(WHITE); e.tube.material.opacity = 0.55; }); }
function* pushBox(id) {
  const x = 170 + queueBoxes.length * 55;
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

function* bfsComp(root, ci) {
  const q = [root];
  compOf[root] = ci;
  setNodeColor(root, COMP_COLORS[ci]);
  compView.get(root).setText('C' + (ci + 1));
  yield* pushBox(String(root));
  yield S(() => { status.textContent = '分量 ' + (ci + 1) + '：从节点 ' + root + ' 开始 BFS'; });
  yield W(350);
  let head = 0;
  while (head < q.length) {
    const u = q[head++];
    setNodeColor(u, GOLD);
    yield S(() => { status.textContent = '出队 ' + u + '，扩展未访问邻居'; });
    yield* popBox();
    yield W(280);
    for (const v of adj[u]) {
      if (compOf[v] !== -1) continue;
      compOf[v] = ci;
      setNodeColor(v, COMP_COLORS[ci]);
      compView.get(v).setText('C' + (ci + 1));
      setEdgeColor(u, v, COMP_COLORS[ci], 1);
      q.push(v);
      yield* pushBox(String(v));
      yield S(() => { status.textContent = '入队 ' + v + ' → 同属分量 ' + (ci + 1); });
      yield W(300);
    }
    resetEdgeColors();
    setNodeColor(u, COMP_COLORS[ci]);
  }
}

function* ccGen() {
  yield S(() => { status.textContent = '连通分量：反复选未访问节点做 BFS，一次 BFS 覆盖的节点 = 一个连通分量'; });
  yield W(600);
  let ci = 0;
  const members = [];
  for (let i = 0; i < N; i++) members.push([]);
  for (let i = 0; i < N; i++) {
    if (compOf[i] === -1) {
      yield S(() => { status.textContent = '——— 第 ' + (ci + 1) + ' 个分量：未访问节点 ' + i + ' 为新根 ———'; });
      yield W(350);
      yield* bfsComp(i, ci);
      for (let j = 0; j < N; j++) if (compOf[j] === ci) members[ci].push(j);
      yield S(() => { status.textContent = '分量 ' + (ci + 1) + ' 完成：{' + members[ci].join(',') + '}，共 ' + members[ci].length + ' 个节点'; });
      yield W(500);
      ci++;
    }
  }
  yield S(() => { status.textContent = '全部 ' + ci + ' 个连通分量：' + members.slice(0, ci).map((m, k) => 'C' + (k + 1) + '{' + m.join(',') + '}').join('  '); });
  yield W(550);
  yield S(() => { status.textContent = '演示完成：全部 ' + ci + ' 个连通分量（青 C1、紫 C2），O(V+E)'; });
  yield W(450);
  resetEdgeColors();
}

function* runCC() {
  buildGraph();
  yield W(400);
  yield* ccGen();
}

buildGraph();
engine.queue(() => runCC());
panel.addButton('清空', () => { engine.clear(); buildGraph(); status.textContent = ''; });

scene.start(engine);
