// AlgorithmLibrary/DFS3D.js — DFS 深度优先遍历：栈盒可视化（后进先出）+ 深度下钻 + 回溯（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VNode, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('DFS3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, WHITE = 0xffffff;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：DFS 从节点 0 出发', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');
const outT = new VText(scene, { text: '', x: 700, y: 420, z: 0, color: PALETTE.textGlow, scale: 0.55, wrapChars: 8 });
const orderT = new VText(scene, { text: '遍历顺序: ', x: 700, y: 300, z: 0, color: PALETTE.green, scale: 0.55, wrapChars: 8 });

const N = 8, R = 200;
const adj = Array.from({ length: N }, () => []);
const nodeView = new Map();  // i -> VNode
const edgeView = new Map();  // 'i-j' -> tube
const stackBoxes = [];       // 栈盒

function posOf(i) { const a = (i / N) * Math.PI * 2 - Math.PI / 2; return new THREE.Vector3(Math.cos(a) * R + 320, 300, Math.sin(a) * R); }
function tube(a, b) {
  const curve = new THREE.CatmullRomCurve3([a, b]);
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 4, 2.5, 6), new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.5 }));
  scene.add(m);
  return m;
}
function clearView() {
  nodeView.forEach(v => scene.remove(v.mesh));
  edgeView.forEach(m => { scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
  stackBoxes.forEach(e => scene.remove(e.box.mesh));
  nodeView.clear(); edgeView.clear(); stackBoxes.length = 0;
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
function resetEdgeColors() { edgeView.forEach(e => { e.material.color.setHex(WHITE); e.material.opacity = 0.5; }); }

// ---- 栈可视化（顶部一排盒，栈顶在右） ----
function* pushBox(id) {
  const x = 130 + stackBoxes.length * 55;
  const box = new VBox(scene, { w: 42, h: 42, d: 20, x, y: 475, z: 0, label: id, color: ORANGE, emissive: ORANGE });
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

function* dfsGen() {
  const visited = new Set(), order = [], stack = [0];
  visited.add(0);
  setNodeColor(0, GREEN);
  yield S(() => { hint.setText('DFS 从节点 0 出发：0 压栈'); orderT.setText('遍历顺序: 0'); });
  yield* pushBox('0');
  yield W(350);
  while (stack.length) {
    const cur = stack.pop();
    setNodeColor(cur, GOLD);
    yield S(() => outT.setText('弹出栈顶 ' + cur + '：先探索它的邻居（深度优先）'));
    yield* popBox();
    order.push(cur);
    yield S(() => orderT.setText('遍历顺序: ' + order.join(' → ')));
    yield W(420);
    const fresh = [];
    for (const nb of adj[cur]) if (!visited.has(nb)) fresh.push(nb);
    if (!fresh.length) yield S(() => outT.setText(cur + ' 无未访问邻居 → 回溯'));
    for (let k = fresh.length - 1; k >= 0; k--) {
      const nb = fresh[k];
      visited.add(nb);
      stack.push(nb);
      setNodeColor(nb, ORANGE);
      setEdgeColor(cur, nb, GREEN, 0.95);
      yield S(() => outT.setText('沿边下钻：' + nb + ' 压栈（栈顶 = 下一个访问）'));
      yield* pushBox(String(nb));
      yield W(320);
    }
    setNodeColor(cur, GREEN);
  }
  resetNodeColors();
  resetEdgeColors();
  yield S(() => {
    outT.setText('DFS 完成：栈后进先出，一路深入再回溯');
    status.textContent = 'DFS 顺序: ' + order.join(' → ');
  });
  yield W(400);
}

function* runDFS() {
  buildGraph([[0, 1], [0, 6], [0, 7], [1, 2], [1, 5], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]]);
  hint.setText('DFS：栈后进先出，沿一条路径深入到底再回溯');
  orderT.setText('遍历顺序: ');
  yield W(400);
  yield* dfsGen();
  yield S(() => { outT.setText(''); hint.setText('DFS 完成：时间复杂度 O(V+E)，用于连通性/拓扑排序'); });
}

engine.queue(() => runDFS());
panel.addButton('清空', () => { engine.clear(); clearView(); orderT.setText('遍历顺序: '); hint.setText('已清空，可重新运行'); status.textContent = ''; outT.setText(''); });
panel.addLabel('（拖拽旋转视角，滚轮缩放；金 = 当前节点，橙 = 已压栈，绿 = 访问完成；顶部为栈）');

scene.start(engine);
