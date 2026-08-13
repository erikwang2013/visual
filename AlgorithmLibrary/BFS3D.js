// AlgorithmLibrary/BFS3D.js — BFS 广度优先遍历：队列盒可视化 + 分层推进 + 邻居入队 + 边点亮（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VNode, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('BFS3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x38bdf8, GOLD = 0xfde047, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfdba74, WHITE = 0xffffff;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：BFS 从节点 0 出发', x: 700, y: 560, z: 0, color: WHITE, scale: 0.8, wrapChars: 7 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 562, z: 0, color: WHITE, scale: 0.82 });
const eqT = new VText(scene, { text: '', x: 0, y: 230, z: 0, color: WHITE, scale: 0.62 });
const outT = new VText(scene, { text: '', x: 700, y: 420, z: 0, color: WHITE, scale: 0.8, wrapChars: 8 });
const orderT = new VText(scene, { text: '遍历顺序: ', x: 700, y: 300, z: 0, color: WHITE, scale: 0.8, wrapChars: 8 });

const N = 8, R = 200;
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
function resetNodeColors() { nodeView.forEach(v => v.setColor(BLUE, BLUE)); }
function setEdgeColor(a, b, c, op) { const e = edgeView.get(a + '-' + b); if (e) { e.material.color.setHex(c); e.material.opacity = op; } }
function resetEdgeColors() { edgeView.forEach(e => { e.material.color.setHex(WHITE); e.material.opacity = 0.5; }); }

// ---- 队列可视化 ----
function* pushBox(id) {
  const x = 130 + queueBoxes.length * 60;
  const box = new VBox(scene, { w: 48, h: 48, d: 24, x, y: 475, z: 0, label: id, color: ORANGE, emissive: ORANGE });
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
  if (tasks.length) yield A(300, p => tasks.forEach(t => t.box.mesh.position.x = t.from - 60 * p));
}

// 层号表：节点 i 距起点的边数（L0={0}, L1={1,6,7}, L2={2,5}, L3={3,4}）
const LEVEL = [0, 1, 2, 3, 3, 2, 1, 1];

function* bfsGen() {
  const visited = new Set(), order = [], queue = [0];
  visited.add(0);
  yield S(() => {
    hint.setText('BFS 从节点 0 出发：入队（橙）并标记已访问');
    stageT.setText('① 初始化：起点 0 入队');
    eqT.setText('队列 = 先进先出（FIFO）→ 先入队的先出队，保证按层扩展');
    orderT.setText('遍历顺序: 0');
    setNodeColor(0, ORANGE);
  });
  yield* pushBox('0');
  yield W(800);
  yield S(() => stageT.setText('② 逐层遍历：队列先进先出，按层扩展'));
  yield W(600);
  let head = 0, curLevel = 0, levelCount = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    if (LEVEL[cur] > curLevel) {
      yield S(() => {
        stageT.setText('第 ' + curLevel + ' 层完成：共 ' + levelCount + ' 个节点，按入队顺序全部访问');
        hint.setText('BFS 逐层推进：先访问完整一层，再进入下一层');
      });
      yield W(900);
      curLevel = LEVEL[cur]; levelCount = 1;
    } else levelCount++;
    setNodeColor(cur, GOLD);
    nodeView.get(cur).pulse(0.3);
    yield S(() => {
      hint.setText('出队 ' + cur + '（金）：探索其未访问邻居');
      outT.setText('出队 ' + cur + '（队首），探索其未访问邻居');
      eqT.setText('队列: [' + queue.slice(head).join(', ') + ']');
    });
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
      yield S(() => {
        hint.setText('邻居 ' + nb + ' 入队（橙）、边点亮（绿）');
        outT.setText('未访问邻居 ' + nb + '：边点亮、入队（橙）');
        eqT.setText('队列: [' + queue.slice(head).join(', ') + ']');
      });
      yield* pushBox(String(nb));
      yield W(340);
    }
    setNodeColor(cur, GREEN);
    yield S(() => { orderT.setText('遍历顺序: ' + order.join(' → ')); });
  }
  yield S(() => {
    outT.setText('BFS 完成：按距离分层，队列先进先出');
    stageT.setText('③ 完成：全部节点按层访问（第 3 层完成：共 2 个节点）');
    eqT.setText('遍历顺序 0 → 1 → 6 → 7 → 2 → 5 → 3 → 4：先访问距起点 1 层，再 2 层、3 层');
    status.textContent = 'BFS 顺序: ' + order.join(' → ');
  });
  yield W(900);
}

function* runBFS() {
  buildGraph([[0, 1], [0, 6], [0, 7], [1, 2], [1, 5], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]]);
  hint.setText('BFS：队列先进先出，按层扩展');
  orderT.setText('遍历顺序: ');
  eqT.setText('起点 0 在第 0 层；邻居 1/6/7 在第 1 层；2/5 在第 2 层；3/4 在第 3 层');
  yield W(900);
  yield* bfsGen();
  yield S(() => {
    outT.setText('');
    hint.setText('BFS 完成：时间复杂度 O(V+E)，可求无权图最短步数与可达性');
    stageT.setText('④ 复杂度：O(V+E），应用：无权最短路、连通分量');
  });
  yield W(700);
}

engine.queue(() => runBFS());
panel.addButton('清空', () => { engine.clear(); clearView(); orderT.setText('遍历顺序: '); hint.setText('已清空，可重新运行'); status.textContent = ''; outT.setText(''); stageT.setText(''); eqT.setText(''); });
panel.addLabel('（拖拽旋转视角，滚轮缩放；金 = 当前出队，橙 = 已入队，绿 = 已访问/边点亮；顶部为队列，层完成时暂停提示）');

scene.start(engine);
