// AlgorithmLibrary/BFS3D.js — BFS 广度优先遍历：队列盒可视化 + 邻居入队 + 边点亮（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VNode, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('BFS3D');

const scene = new Scene3D('scene', { cameraPos: [0, 260, 720], fov: 55 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, WHITE = 0xffffff;
const hint = new VText(scene, { text: '点击「运行演示」开始：BFS 从节点 0 出发', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const outT = new VText(scene, { text: '', x: 0, y: -200, z: 0, color: PALETTE.textGlow, scale: 0.7 });
const orderT = new VText(scene, { text: '遍历顺序: ', x: 0, y: -245, z: 0, color: PALETTE.green, scale: 0.75 });

const N = 8, R = 200;
const adj = Array.from({ length: N }, () => []);
const nodeView = new Map();  // i -> VNode
const edgeView = new Map();  // 'i-j' -> tube
const queueBoxes = [];       // 队列盒

function posOf(i) { const a = (i / N) * Math.PI * 2 - Math.PI / 2; return new THREE.Vector3(Math.cos(a) * R, 0, Math.sin(a) * R); }
function tube(a, b) {
  const curve = new THREE.CatmullRomCurve3([a, b]);
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 4, 2.5, 6), new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.5 }));
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
    const vn = new VNode(scene, { radius: 21, x: p.x, y: p.y, z: p.z, label: String(i), color: BLUE, emissive: BLUE });
    nodeView.set(i, vn);
  }
  for (const [a, b] of edges) {
    edgeView.set(a + '-' + b, tube(posOf(a), posOf(b)));
    edgeView.set(b + '-' + a, tube(posOf(b), posOf(a)));
    adj[a].push(b); adj[b].push(a);
  }
}
function setNodeColor(i, c) { nodeView.get(i).setColor(c, c); }
function resetNodeColors() { nodeView.forEach(v => v.setColor(BLUE, BLUE)); }
function setEdgeColor(a, b, c, op) { const e = edgeView.get(a + '-' + b); if (e) { e.material.color.setHex(c); e.material.opacity = op; } }

// ---- 队列可视化 ----
function* pushBox(id) {
  const x = -190 + queueBoxes.length * 55;
  const box = new VBox(scene, { w: 42, h: 42, d: 20, x, y: 175, z: 0, label: id, color: ORANGE, emissive: ORANGE });
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

function* bfsGen() {
  const visited = new Set(), order = [], queue = [];
  visited.add(0);
  queue.push(0);
  yield S(() => { hint.setText('BFS 从节点 0 出发：0 入队'); orderT.setText('遍历顺序: 0'); });
  setNodeColor(0, GREEN);
  yield* pushBox('0');
  yield W(350);
  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    setNodeColor(cur, GOLD);
    yield S(() => outT.setText('出队 ' + cur + '，探索其邻居'));
    yield* popBox();
    order.push(cur);
    yield W(400);
    for (const nb of adj[cur]) {
      if (visited.has(nb)) continue;
      visited.add(nb);
      queue.push(nb);
      setNodeColor(nb, ORANGE);
      setEdgeColor(cur, nb, GREEN, 0.95);
      yield S(() => outT.setText('未访问邻居 ' + nb + '：边点亮，入队'));
      yield* pushBox(String(nb));
      yield W(320);
    }
    setNodeColor(cur, GREEN);
    yield S(() => { orderT.setText('遍历顺序: ' + order.concat(cur).join(' → ')); });
  }
  resetNodeColors();
  yield S(() => {
    outT.setText('BFS 完成：按距离分层，队列先进先出');
    status.textContent = 'BFS 顺序: ' + order.join(' → ');
  });
  yield W(400);
}

function* runBFS() {
  buildGraph([[0, 1], [0, 6], [0, 7], [1, 2], [1, 5], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]]);
  hint.setText('BFS：队列先进先出，按层扩展');
  orderT.setText('遍历顺序: ');
  yield W(400);
  yield* bfsGen();
  yield S(() => { outT.setText(''); hint.setText('BFS 完成：时间复杂度 O(V+E)，最短步数可达性'); });
}

panel.addButton('运行演示', () => engine.start(runBFS()));
panel.addButton('清空', () => { engine.clear(); clearView(); orderT.setText('遍历顺序: '); hint.setText('已清空，可重新运行'); status.textContent = ''; outT.setText(''); });
panel.addLabel('（拖拽旋转视角，滚轮缩放；金 = 当前出队，橙 = 已入队，绿 = 已访问/边点亮；顶部为队列）');

scene.start(engine);
