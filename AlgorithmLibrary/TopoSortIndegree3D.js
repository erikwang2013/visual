// AlgorithmLibrary/TopoSortIndegree3D.js
// 拓扑排序（Kahn 入度法）：有向无环图（六边形布局+箭头），每个节点上方标注入度，
// 每轮高亮入度为 0 的节点并移出，递减邻居入度，输出顺序文字飞入顶部序列行。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Graph3D } from '../3D/modes/Graph3D.js';
import { VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('TopoSortIndegree3D');

const scene = new Scene3D('scene', { cameraPos: [0, 300, 620], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });
function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

const N = 6, R = 170;
const graph = new Graph3D(scene, { radius: 17 });
const POS = [];
for (let i = 0; i < N; i++) {
  const a = (i / N) * Math.PI * 2 - Math.PI / 2;
  POS[i] = [Math.cos(a) * R, 0, Math.sin(a) * R];
  graph.addNode(String(i), String(i), POS[i][0], POS[i][1], POS[i][2]);
}
// 样例 DAG（模型已验证：Kahn 顺序 [0,1,2,3,5,4]）
const dag = [[1, 2], [3], [3, 5], [4], [], [4]];
for (let u = 0; u < N; u++) for (const v of dag[u]) graph.addEdge(String(u), String(v), { directed: true });

// 有向箭头：圆锥置于边末端
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
function topoIndegreeModel(adj, n) {
  const indeg = Array(n).fill(0);
  for (const ns of adj) for (const v of ns) indeg[v]++;
  const q = [];
  for (let i = 0; i < n; i++) if (indeg[i] === 0) q.push(i);
  const order = [];
  const steps = [];
  const initIndeg = [...indeg];
  while (q.length) {
    const u = q.shift();
    order.push(u);
    const dec = [];
    for (const v of adj[u]) { --indeg[v]; dec.push(v); if (indeg[v] === 0) q.push(v); }
    steps.push({ u, dec });
  }
  return order.length === n ? { order, steps, initIndeg } : null;
}

const status = panel.addStatus('');
const hint = new VText(scene, { text: '点击「做拓扑排序」开始', x: 0, y: 240, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const indegTexts = [];
const orderTexts = [];

function spawnIndegText(u, val) {
  const [x, , z] = POS[u];
  const vt = new VText(scene, { text: '入度 ' + val, x, y: 85, z, color: PALETTE.textDim, scale: 0.7 });
  vt.sprite.scale.set(0.1, 0.05, 1);
  C(250, (p) => { const s = 0.01 + p * 0.99; vt.sprite.scale.set(70 * s, 35 * s, 1); }, () => vt.sprite.scale.set(0.1, 0.05, 1));
  indegTexts[u] = vt;
}

function popIndegText(u, val) {
  const vt = indegTexts[u];
  vt.setText('入度 ' + val, { color: PALETTE.text }); // setText 会把 scale 重置为 (100,50,1)
  vt.sprite.scale.set(105, 52.5, 1);
  C(300, (p) => { const s = 1.05 - 0.35 * p; vt.sprite.scale.set(100 * s, 50 * s, 1); }, () => vt.sprite.scale.set(70, 35, 1));
}

// 候选边熄灭：直接改材质颜色，不经过 lightEdge（避免在命令 fn 内再入队）
function fadeEdgeBack(a, b, delay) {
  const e = graph.edges.get(`${a}->${b}`);
  if (!e) return;
  const from = new THREE.Color(PALETTE.highlight);
  const to = new THREE.Color(e.baseColor);
  C(delay, (p) => {
    e.mesh.material.color.copy(from).lerp(to, p);
    e.mesh.material.emissiveIntensity = 0;
  }, () => { e.mesh.material.color.setHex(e.baseColor); e.mesh.material.emissiveIntensity = 0; });
}

function hideNode(u) {
  const m = graph.nodes.get(String(u)).node.mesh;
  m.material.transparent = true;
  C(420, (p) => { m.scale.setScalar(1 - p * 0.99); m.material.opacity = 1 - p; }, () => { m.scale.setScalar(1); m.material.opacity = 1; m.material.transparent = false; });
}

function spawnOrderText(u, idx) {
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
  // 恢复被隐藏的节点
  for (let i = 0; i < N; i++) {
    const m = graph.nodes.get(String(i)).node.mesh;
    m.scale.setScalar(1); m.material.opacity = 1; m.material.transparent = false;
  }
  indegTexts.forEach((vt) => vt.remove());
  indegTexts.length = 0;

  const res = topoIndegreeModel(dag, N);
  if (!res) { hint.setText('图中存在环，无法拓扑排序'); return; }
  const { order, steps, initIndeg } = res;
  for (let i = 0; i < N; i++) spawnIndegText(i, initIndeg[i]);
  hint.setText('初始入度：' + initIndeg.join(', '));

  // 预展开为扁平命令序列：命令 fn 会在动画期间每帧被调用，
  // 若在 fn 内再入队命令会指数膨胀，必须一次性入队。
  for (let si = 0; si < steps.length; si++) {
    const { u, dec } = steps[si];
    graph.highlightNode(String(u), C);
    C(1, () => hint.setText('入度为 0，选取节点 ' + u), () => {});
    spawnOrderText(u, si);
    hideNode(u);
    for (let j = 0; j < dec.length; j++) {
      const v = dec[j];
      C(1, () => hint.setText('节点 ' + u + ' 的出边 ' + v + '：入度减 1'), () => {});
      graph.lightEdge(String(u), String(v), true, C);
      popIndegText(v, initIndeg[v] - dec.slice(0, j + 1).length);
      fadeEdgeBack(u, v, 500);
      C(200, () => {}, () => {});
    }
    C(250, () => {}, () => {});
  }
  C(1, () => {
    status.textContent = '拓扑排序: ' + order.join(' → ');
    hint.setText('拓扑排序完成: ' + order.join(' → '));
  }, () => {});
}

function clearAll() {
  engine.clear();
  indegTexts.forEach((vt) => vt.remove());
  indegTexts.length = 0;
  orderTexts.forEach((vt) => vt.remove());
  orderTexts.length = 0;
  cones.forEach((c) => scene.remove(c));
  cones.length = 0;
  for (const [, e] of graph.nodes) e.node.remove();
  graph.nodes.clear();
  for (const [, e] of graph.edges) {
    scene.remove(e.mesh);
    if (e.weightLabel) e.weightLabel.remove();
  }
  graph.edges.clear();
  status.textContent = '';
  hint.setText('已清空画布');
}

panel.addButton('做拓扑排序', runTopo);
panel.addButton('清空', clearAll);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
