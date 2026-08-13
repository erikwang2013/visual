// AlgorithmLibrary/Boruvka3D.js — Boruvka 最小生成树：每轮各连通分量选最廉价出边合并 + 分量染色 + parent 数组（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VNode } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Boruvka3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：Boruvka 最小生成树（分量并进）', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');
const outT = new VText(scene, { text: '', x: 700, y: 420, z: 0, color: PALETTE.textGlow, scale: 0.55, wrapChars: 8 });
const parT = new VText(scene, { text: '', x: 700, y: 360, z: 0, color: PALETTE.textDim, scale: 0.5, wrapChars: 8 });

const N = 6, R = 185;
const EDGES = [[0, 1, 2], [0, 2, 5], [1, 2, 6], [1, 3, 3], [2, 3, 1], [2, 4, 8], [3, 4, 4], [3, 5, 7], [4, 5, 2]];
const adj = Array.from({ length: N }, () => []);
const nodeView = new Map();
const edgeView = new Map();
const mstEdges = [];
let parent = [];
const COMP_COLORS = [RED, ORANGE, CYAN, PUR, GREEN, GOLD];

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
    edgeView.set(f < t ? f + '-' + t : t + '-' + f, { tube: m, lbl });
    adj[f].push([t, w]); adj[t].push([f, w]);
  }
}
function setEdgeColor(f, t, c, op) { const e = edgeView.get(f < t ? f + '-' + t : t + '-' + f); if (e) { e.tube.material.color.setHex(c); e.tube.material.opacity = op; } }
function resetEdgeColors() { edgeView.forEach(e => { e.tube.material.color.setHex(WHITE); e.tube.material.opacity = 0.55; }); }
function find(x) { while (parent[x] !== x) x = parent[x]; return x; }
function showParent() { parT.setText('并查集 parent: [' + parent.join(', ') + ']'); }
function colorComponents() {
  const comps = new Map();
  for (let i = 0; i < N; i++) { const r = find(i); if (!comps.has(r)) comps.set(r, comps.size); }
  for (let i = 0; i < N; i++) nodeView.get(i).setColor(COMP_COLORS[comps.get(find(i)) % COMP_COLORS.length], COMP_COLORS[comps.get(find(i)) % COMP_COLORS.length]);
}

function* boruvkaGen() {
  parent = Array.from({ length: N }, (_, i) => i);
  showParent();
  colorComponents();
  yield S(() => outT.setText('初始：每个点自成一个分量。每轮各分量选「最廉价跨分量出边」并合并'));
  yield W(700);
  let total = 0, round = 0;
  while (true) {
    const comps = new Map();
    for (let i = 0; i < N; i++) { const r = find(i); if (!comps.has(r)) comps.set(r, { nodes: [], min: null }); comps.get(r).nodes.push(i); }
    if (comps.size === 1) break;
    round++;
    yield S(() => outT.setText('——— 第 ' + round + ' 轮：' + comps.size + ' 个分量，各选最小出边 ———'));
    yield W(500);
    for (const [root, c] of comps) for (const u of c.nodes) for (const [v, w] of adj[u]) {
      if (find(u) !== find(v) && (!c.min || w < c.min[2])) c.min = [u, v, w];
    }
    for (const [root, c] of comps) {
      setEdgeColor(c.min[0], c.min[1], CYAN, 1);
      yield S(() => outT.setText('分量 {' + c.nodes.join(',') + '} 最小出边：' + c.min[0] + '-' + c.min[1] + '（' + c.min[2] + '）'));
      yield W(380);
    }
    yield S(() => outT.setText('合并：本轮选出的边全部加入 MST'));
    yield W(350);
    for (const [root, c] of comps) {
      const [u, v, w] = c.min;
      if (mstEdges.some(e => (e[0] === u && e[1] === v) || (e[0] === v && e[1] === u))) continue;
      parent[find(u)] = find(v);
      mstEdges.push([u, v]);
      total += w;
      setEdgeColor(u, v, GREEN, 1);
    }
    showParent();
    colorComponents();
    yield S(() => outT.setText('第 ' + round + ' 轮后 MST 边数 ' + mstEdges.length + '，总权 ' + total));
    yield W(500);
    resetEdgeColors();
  }
  yield S(() => outT.setText('只剩一个分量 → 合并完成。MST 边集：' + mstEdges.map(e => e[0] + '-' + e[1]).join('  ')));
  yield W(400);
  for (const [u, v] of mstEdges) { setEdgeColor(u, v, GOLD, 1); yield W(200); }
  yield S(() => {
    outT.setText('最小生成树完成：' + mstEdges.length + ' 条边，总权 ' + total + '，共 ' + round + ' 轮');
    status.textContent = 'Boruvka 完成：MST 总权 ' + total + '，O(E·logV)';
  });
  yield W(600);
  resetEdgeColors();
  nodeView.forEach(v => v.setColor(BLUE, BLUE));
}

function* runBoruvka() {
  buildGraph();
  hint.setText('Boruvka：每轮每分量取最小出边合并，轮数 ≤ logV');
  yield W(400);
  yield* boruvkaGen();
  yield S(() => { outT.setText(''); hint.setText('Boruvka 完成：适合并行计算的最小生成树算法'); });
}

engine.queue(() => runBoruvka());
panel.addButton('清空', () => { engine.clear(); clearView(); hint.setText('已清空，可重新运行'); status.textContent = ''; outT.setText(''); parT.setText(''); });
panel.addLabel('（拖拽旋转视角，滚轮缩放；节点色 = 所属分量，青 = 最小出边，绿 = 合并，金 = MST 最终边）');

scene.start(engine);
