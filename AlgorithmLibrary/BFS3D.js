// AlgorithmLibrary/BFS3D.js
// 随机无向图（圆形布局）→ BFS 遍历动画：当前节点高亮、访问边点亮、
// 队列可视化（顶部一排小盒，出队左移）、遍历顺序状态提示。
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Graph3D } from '../3D/modes/Graph3D.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE } from '../3D/Glow.js';

const scene = new Scene3D('scene', { cameraPos: [0, 300, 620], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const N = 8;
const R = 230;
const graph = new Graph3D(scene, { radius: 17 });
for (let i = 0; i < N; i++) {
  const a = (i / N) * Math.PI * 2 - Math.PI / 2;
  graph.addNode(String(i), String(i), Math.cos(a) * R, 0, Math.sin(a) * R);
}

let adj = Array.from({ length: N }, () => []);

function randomGraph() {
  for (const key of [...graph.edges.keys()]) {
    const e = graph.edges.get(key);
    scene.remove(e.mesh);
    if (e.weightLabel) e.weightLabel.remove();
    graph.edges.delete(key);
  }
  adj = Array.from({ length: N }, () => []);
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      if (Math.random() < 0.35) {
        graph.addEdge(String(i), String(j));
        adj[i].push(j); adj[j].push(i);
      }
    }
  }
  // 保证连通：补一个环
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    if (!adj[i].includes(j)) {
      graph.addEdge(String(i), String(j));
      adj[i].push(j); adj[j].push(i);
    }
  }
}

// 队列可视化（顶部一排小盒，入队弹出，出队左移）
const queueBoxes = []; // {id, box}

function enqueueBox(id) {
  const x = -190 + queueBoxes.length * 55;
  const box = new VBox(scene, { w: 42, h: 42, d: 22, x, y: 180, z: 0, label: id, color: PALETTE.blue, emissive: PALETTE.blueEmissive });
  box.mesh.scale.setScalar(0.01);
  C(300, (p) => { box.mesh.scale.setScalar(0.01 + p * 0.99); });
  queueBoxes.push({ id, box });
}

function dequeueBox() {
  const e = queueBoxes.shift();
  if (!e) return;
  C(250, (p) => { e.box.mesh.scale.setScalar(1 - p); }, () => e.box.remove());
  queueBoxes.forEach(({ box }) => {
    const from = box.mesh.position.x;
    C(300, (p) => { box.mesh.position.x = from - 55 * p; });
  });
}

const status = panel.addStatus('');
const hint = new VText(scene, { text: '', x: 0, y: 235, z: 0, color: PALETTE.textGlow, scale: 0.85 });

function bfs() {
  engine.clear();
  // 复位节点与边颜色
  for (let i = 0; i < N; i++) graph.dehighlightNode(String(i), C);
  for (const key of graph.edges.keys()) {
    const [a, b] = key.split('->');
    graph.lightEdge(a, b, false, C);
  }
  while (queueBoxes.length) dequeueBox();

  const visited = new Set();
  const order = [];
  const queue = [];
  const startId = '0';
  visited.add(startId);
  queue.push(startId);
  enqueueBox(startId);
  graph.highlightNode(startId, C, 0x34d399);
  hint.setText('起点 0 入队');

  function visitNext() {
    if (!queue.length) { finish(); return; }
    const cur = queue.shift();
    order.push(cur);
    dequeueBox();
    graph.highlightNode(cur, C);
    hint.setText('出队 ' + cur + '，访问其邻居');
    let pending = 0;
    for (const nb of adj[Number(cur)]) {
      const nbId = String(nb);
      if (visited.has(nbId)) continue;
      visited.add(nbId);
      queue.push(nbId);
      pending++;
      graph.lightEdge(cur, nbId, true, C);
      C(90, () => enqueueBox(nbId));
      graph.highlightNode(nbId, C, 0x34d399);
    }
    C(200, () => visitNext());
  }

  function finish() {
    status.textContent = 'BFS 顺序: ' + order.join(' → ');
    hint.setText('遍历完成，访问顺序: ' + order.join(' → '));
  }

  visitNext();
}

function resetAll() {
  engine.clear();
  queueBoxes.forEach((e) => e.box.remove());
  queueBoxes.length = 0;
  randomGraph();
  for (let i = 0; i < N; i++) graph.dehighlightNode(String(i), C);
  hint.setText('新图已生成，点击 BFS 开始遍历');
}

randomGraph();

// 控件
panel.addButton('BFS', bfs);
panel.addButton('新图', resetAll);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
