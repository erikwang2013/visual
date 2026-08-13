// AlgorithmLibrary/BFS3D.js — BFS 广度优先遍历：队列盒可视化 + 分层推进 + 邻居入队 + 边点亮（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VBox } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
applyTheme('BFS3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x38bdf8, GOLD = 0xfde047, GREEN = 0x4ade80, ORANGE = 0xfdba74, WHITE = 0xffffff;
const status = panel.addStatus('就绪');

const N = 8, R = 200;
const EDGES = [[0, 1], [0, 6], [0, 7], [1, 2], [1, 5], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]];
const adj = Array.from({ length: N }, () => []);
const nodeView = new Map();  // i -> VNode
const edgeView = new Map();  // 'i-j' -> tube
const queueBoxes = [];       // 队列盒

function posOf(i) { const a = (i / N) * Math.PI * 2 - Math.PI / 2; return new THREE.Vector3(Math.cos(a) * R + 320, 300, Math.sin(a) * R); }
function tube(a, b) {
  const curve = new THREE.CatmullRomCurve3([a, b]);
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 4, 3.5, 6), new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.5 }));
  scene.add(m);
  return m;
}
function clearView() {
  nodeView.forEach(v => scene.remove(v.mesh));
  edgeView.forEach(m => { scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
  queueBoxes.forEach(e => scene.remove(e.box.mesh));
  nodeView.clear(); edgeView.clear(); queueBoxes.length = 0;
}
function buildGraph(edges) {
  clearView();
  for (let i = 0; i < N; i++) adj[i].length = 0;
  for (let i = 0; i < N; i++) {
    const p = posOf(i);
    const vn = new VNode(scene, { radius: 28, x: p.x, y: p.y, z: p.z, label: String(i), color: BLUE, emissive: BLUE });
    nodeView.set(i, vn);
  }
  for (const [a, b] of edges) {
    edgeView.set(a + '-' + b, tube(posOf(a), posOf(b)));
    edgeView.set(b + '-' + a, tube(posOf(b), posOf(a)));
    adj[a].push(b); adj[b].push(a);
  }
}
function setNodeColor(i, c) { nodeView.get(i).setColor(c, c); }
function setEdgeColor(a, b, c, op) { const e = edgeView.get(a + '-' + b); if (e) { e.material.color.setHex(c); e.material.opacity = op; } }

// ---- 队列可视化 ----
function* pushBox(id) {
  const x = 130 + queueBoxes.length * 60;
  const box = new VBox(scene, { w: 48, h: 48, d: 24, x, y: 475, z: 0, label: id, color: ORANGE, emissive: ORANGE });
  box.mesh.scale.setScalar(0.01);
  yield A(280, p => { box.mesh.scale.setScalar(0.01 + 0.99 * p); });
  queueBoxes.push({ box });
}
function* popBox() {
  const e = queueBoxes.shift();
  if (!e) return;
  yield A(240, p => { e.box.mesh.scale.setScalar(1 - p); });
  scene.remove(e.box.mesh);
  const tasks = queueBoxes.map(b => ({ box: b.box, from: b.box.mesh.position.x }));
  if (tasks.length) yield A(300, p => tasks.forEach(t => t.box.mesh.position.x = t.from - 60 * p));
}

// 层号表：节点 i 距起点的边数（L0={0}, L1={1,6,7}, L2={2,5}, L3={3,4}）
const LEVEL = [0, 1, 2, 3, 3, 2, 1, 1];

function* bfsGen() {
  const visited = new Set(), order = [], queue = [0];
  visited.add(0);
  setNodeColor(0, ORANGE);
  yield* pushBox('0');
  yield W(800);
  let head = 0, curLevel = 0, levelCount = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    if (LEVEL[cur] > curLevel) {
      yield W(900);
      curLevel = LEVEL[cur]; levelCount = 1;
    } else levelCount++;
    setNodeColor(cur, GOLD);
    nodeView.get(cur).pulse(0.3);
    yield* popBox();
    order.push(cur);
    yield W(420);
    for (const nb of adj[cur]) {
      if (visited.has(nb)) continue;
      visited.add(nb);
      queue.push(nb);
      setNodeColor(nb, ORANGE);
      nodeView.get(nb).pulse(0.18);
      setEdgeColor(cur, nb, GREEN, 0.95);
      yield* pushBox(String(nb));
      yield W(340);
    }
    setNodeColor(cur, GREEN);
  }
  yield S(() => { status.textContent = 'BFS 顺序: ' + order.join(' → '); });
  yield W(900);
}

function* runBFS() {
  buildGraph(EDGES);
  yield W(600);
  yield* bfsGen();
}

buildGraph(EDGES);  // 初始化默认演示体：图 + 空队列区
engine.queue(() => runBFS());
panel.addButton('清空', () => { engine.clear(); buildGraph(EDGES); status.textContent = ''; });

scene.start(engine);
