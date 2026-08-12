// AlgorithmLibrary/Kruskal3D.js — Kruskal 最小生成树：边按权升序 + 并查集判环 + 选入绿/成环红 + parent 数组实时显示（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VNode } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Kruskal3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, WHITE = 0xffffff;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：Kruskal 最小生成树（并查集判环）', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');
const outT = new VText(scene, { text: '', x: 700, y: 420, z: 0, color: PALETTE.textGlow, scale: 0.55, wrapChars: 8 });
const parT = new VText(scene, { text: '', x: 700, y: 360, z: 0, color: PALETTE.textDim, scale: 0.5, wrapChars: 8 });

const N = 6, R = 185;
// 无向加权图（同 Prim）：MST 总权 12
const EDGES = [[0, 1, 2], [0, 2, 5], [1, 2, 6], [1, 3, 3], [2, 3, 1], [2, 4, 8], [3, 4, 4], [3, 5, 7], [4, 5, 2]];
const adj = Array.from({ length: N }, () => []);
const nodeView = new Map();
const edgeView = new Map();  // 'a-b'(a<b) -> { tube, lbl }
const mstEdges = [];
let parent = [];

function posOf(i) { const a = (i / N) * Math.PI * 2 - Math.PI / 2; return new THREE.Vector3(Math.cos(a) * R + 320, 300, Math.sin(a) * R); }
function tube(a, b) {
  const curve = new THREE.CatmullRomCurve3([a, b]);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 4, 2.5, 6), new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.55 }));
}
function clearView() {
  nodeView.forEach(v => scene.remove(v.mesh));
  edgeView.forEach(e => { scene.remove(e.tube); e.tube.geometry.dispose(); e.tube.material.dispose(); scene.remove(e.lbl.sprite); });
  nodeView.clear(); edgeView.clear(); mstEdges.length = 0;
}
function buildGraph() {
  clearView();
  for (let i = 0; i < N; i++) adj[i].length = 0;
  for (let i = 0; i < N; i++) {
    const p = posOf(i);
    const vn = new VNode(scene, { radius: 20, x: p.x, y: p.y, z: p.z, label: String(i), color: BLUE, emissive: BLUE });
    nodeView.set(i, vn);
  }
  for (const [f, t, w] of EDGES) {
    const a = posOf(f), b = posOf(t);
    const m = tube(a, b);
    scene.add(m);
    const mid = new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2 + 20, (a.z + b.z) / 2);
    const lbl = new VText(scene, { text: String(w), x: mid.x, y: mid.y, z: mid.z, color: PALETTE.yellow, scale: 0.6 });
    const key = f < t ? f + '-' + t : t + '-' + f;
    edgeView.set(key, { tube: m, lbl });
    adj[f].push([t, w]); adj[t].push([f, w]);
  }
}
function setNodeColor(i, c) { nodeView.get(i).setColor(c, c); }
function setEdgeColor(f, t, c, op) { const e = edgeView.get(f < t ? f + '-' + t : t + '-' + f); if (e) { e.tube.material.color.setHex(c); e.tube.material.opacity = op; } }
function resetEdgeColors() { edgeView.forEach(e => { e.tube.material.color.setHex(WHITE); e.tube.material.opacity = 0.55; }); }
function find(x) { while (parent[x] !== x) x = parent[x]; return x; }
function showParent() { parT.setText('并查集 parent: [' + parent.join(', ') + ']'); }

function* kruskalGen() {
  const sorted = EDGES.slice().sort((a, b) => a[2] - b[2]);
  parent = Array.from({ length: N }, (_, i) => i);
  showParent();
  yield S(() => outT.setText('并查集初始化：parent[i]=i。边按权重升序：' + sorted.map(e => e[0] + '-' + e[1] + '(' + e[2] + ')').join(' ')));
  yield W(900);
  let total = 0;
  for (const [u, v, w] of sorted) {
    setEdgeColor(u, v, CYAN, 1);
    yield S(() => outT.setText('检查边 ' + u + '-' + v + '（权 ' + w + '）：find(' + u + ')=' + find(u) + '，find(' + v + ')=' + find(v)));
    yield W(420);
    const ru = find(u), rv = find(v);
    if (ru !== rv) {
      parent[ru] = rv;
      showParent();
      mstEdges.push([u, v]);
      total += w;
      setEdgeColor(u, v, GREEN, 1);
      setNodeColor(u, GREEN); setNodeColor(v, GREEN);
      yield S(() => outT.setText('不成环 → 选入 MST（union ' + ru + ' ← ' + rv + '），当前总权 ' + total));
      yield W(450);
    } else {
      setEdgeColor(u, v, RED, 1);
      yield S(() => outT.setText('同属集合 ' + ru + ' → 成环！拒绝该边'));
      yield W(450);
    }
    resetEdgeColors();
  }
  yield S(() => outT.setText('MST 边集：' + mstEdges.map(e => e[0] + '-' + e[1]).join('  ')));
  yield W(400);
  for (const [u, v] of mstEdges) { setEdgeColor(u, v, GOLD, 1); yield W(200); }
  yield S(() => {
    outT.setText('最小生成树完成：' + mstEdges.length + ' 条边，总权 ' + total);
    status.textContent = 'Kruskal 完成：MST 总权 ' + total + '，O(E·logE)';
  });
  yield W(600);
  resetEdgeColors();
  nodeView.forEach(v => v.setColor(BLUE, BLUE));
}

function* runKruskal() {
  buildGraph();
  hint.setText('Kruskal：按权升序选边 + 并查集判环');
  yield W(400);
  yield* kruskalGen();
  yield S(() => { outT.setText(''); hint.setText('Kruskal 完成：边数 ≤ V-1 且无环即最优，适用于稀疏图'); });
}

engine.queue(() => runKruskal());
panel.addButton('清空', () => { engine.clear(); clearView(); hint.setText('已清空，可重新运行'); status.textContent = ''; outT.setText(''); parT.setText(''); });
panel.addLabel('（拖拽旋转视角，滚轮缩放；青 = 检查，绿 = 选入，红 = 成环拒绝，金 = MST 最终边）');

scene.start(engine);
