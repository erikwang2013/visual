// AlgorithmLibrary/MinCostFlow3D.js — 最小费用最大流：Bellman-Ford 每次选最便宜增广路 + 反向边负费用 + 费用累计（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VNode } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('MinCostFlow3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff;
const hint = new VText(scene, { text: '点击「运行演示」开始：最小费用最大流（Bellman-Ford 选最便宜路）', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const outT = new VText(scene, { text: '', x: 0, y: -235, z: 0, color: PALETTE.textGlow, scale: 0.7 });

const N = 4;
const POS = [[0, 170, 0], [-150, 0, 0], [150, 0, 0], [0, -170, 0]];
const NAME = ['s', 'a', 'b', 't'];
// [u, v, cap, cost]
const E = [[0, 1, 3, 1], [0, 2, 3, 3], [1, 2, 2, 1], [1, 3, 2, 4], [2, 3, 3, 1]];
const nodeView = new Map();
const edgeView = new Map();   // edgeIdx -> { tube, lbl, costT }
const resView = new Map();    // 'u->v' -> { tube, lbl } 反向残余边
let flow = [];

function tube(a, b, radius) {
  const curve = new THREE.CatmullRomCurve3([a, b]);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 4, radius || 2.5, 6), new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.55 }));
}
function clearView() {
  nodeView.forEach(v => scene.remove(v.mesh));
  edgeView.forEach(e => { scene.remove(e.tube); e.tube.geometry.dispose(); e.tube.material.dispose(); scene.remove(e.lbl.sprite); scene.remove(e.costT.sprite); });
  resView.forEach(e => { scene.remove(e.tube); e.tube.geometry.dispose(); e.tube.material.dispose(); scene.remove(e.lbl.sprite); });
  nodeView.clear(); edgeView.clear(); resView.clear();
}
function buildGraph() {
  clearView();
  for (let i = 0; i < N; i++) {
    const [x, y, z] = POS[i];
    const vn = new VNode(scene, { radius: 21, x, y, z, label: NAME[i], color: BLUE, emissive: BLUE });
    nodeView.set(i, vn);
  }
  for (let i = 0; i < E.length; i++) {
    const [u, v, c, cost] = E[i];
    const a = new THREE.Vector3(...POS[u]), b = new THREE.Vector3(...POS[v]);
    const m = tube(a, b);
    scene.add(m);
    const mid = new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2 + 18, (a.z + b.z) / 2);
    const lbl = new VText(scene, { text: '0/' + c, x: mid.x, y: mid.y, z: mid.z, color: PALETTE.yellow, scale: 0.62 });
    const costT = new VText(scene, { text: 'c=' + cost, x: mid.x, y: mid.y - 20, z: mid.z, color: '#94a3b8', scale: 0.5 });
    edgeView.set(i, { tube: m, lbl, costT });
  }
}
function setNodeColor(i, c) { nodeView.get(i).setColor(c, c); }
function setEdgeColor(i, c, op) { const e = edgeView.get(i); e.tube.material.color.setHex(c); e.tube.material.opacity = op; }
function setEdgeLbl(i) { const [u, v, c] = E[i]; edgeView.get(i).lbl.setText(flow[i] + '/' + c); }
function resetEdgeColors() { edgeView.forEach(e => { e.tube.material.color.setHex(WHITE); e.tube.material.opacity = 0.55; }); }
function refreshResidual() {
  resView.forEach(e => { scene.remove(e.tube); e.tube.geometry.dispose(); e.tube.material.dispose(); scene.remove(e.lbl.sprite); });
  resView.clear();
  for (let i = 0; i < E.length; i++) {
    if (flow[i] === 0) continue;
    const [u, v] = E[i];
    const a = new THREE.Vector3(...POS[v]), b = new THREE.Vector3(...POS[u]);
    const m = tube(a, b, 1.6);
    m.material.color.setHex(PUR); m.material.opacity = 0.9;
    scene.add(m);
    const mid = new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2 - 48, (a.z + b.z) / 2);
    const lbl = new VText(scene, { text: '-c' + E[i][3], x: mid.x, y: mid.y, z: mid.z, color: PUR, scale: 0.5 });
    resView.set(v + '->' + u, { tube: m, lbl });
  }
}
function residualEdges(u) {
  const out = [];
  for (let i = 0; i < E.length; i++) {
    const [a, b, c, cost] = E[i];
    if (a === u && flow[i] < c) out.push({ v: b, cost, i, dir: 1 });
    if (b === u && flow[i] > 0) out.push({ v: a, cost: -cost, i, dir: -1 });
  }
  return out;
}

function* bfShortest() {
  const dist = [0, Infinity, Infinity, Infinity];
  const parent = Array(N).fill(-1), dir = Array(N).fill(0);
  let changed = true;
  while (changed) {
    changed = false;
    for (let u = 0; u < N; u++) {
      if (dist[u] === Infinity) continue;
      for (const e of residualEdges(u)) {
        if (dist[u] + e.cost < dist[e.v]) {
          dist[e.v] = dist[u] + e.cost;
          parent[e.v] = e.i; dir[e.v] = e.dir;
          changed = true;
          setEdgeColor(e.i, CYAN, 1);
          setNodeColor(e.v, ORANGE);
          yield S(() => outT.setText('松弛 ' + NAME[u] + '→' + NAME[e.v] + '（费用 ' + e.cost + '）：dist=' + dist[e.v]));
          yield W(300);
          resetEdgeColors();
        }
      }
    }
  }
  return dist[N - 1] === Infinity ? null : { parent, dir, cost: dist[N - 1] };
}

function* mcfGen() {
  flow = E.map(() => 0);
  buildGraph();
  refreshResidual();
  yield S(() => outT.setText('Bellman-Ford 每次选「总费用最小」的增广路（反向残余边费用取负）。边标签 = 流量/容量，下方 = 单位费用'));
  yield W(700);
  let total = 0, totalCost = 0, aug = 0;
  while (true) {
    aug++;
    yield S(() => outT.setText('——— 第 ' + aug + ' 轮：Bellman-Ford 求最便宜增广路 ———'));
    yield W(400);
    const sp = yield* bfShortest();
    if (!sp) {
      yield S(() => outT.setText('无残余路径 → 最大流已达，费用最小！'));
      yield W(450);
      break;
    }
    let bf = Infinity, x = N - 1, chain = [];
    while (x !== 0) {
      const i = sp.parent[x];
      const [a, b, c] = E[i];
      bf = Math.min(bf, sp.dir[x] === 1 ? c - flow[i] : flow[i]);
      chain.unshift([i, x]);
      x = sp.dir[x] === 1 ? a : b;
    }
    yield S(() => outT.setText('最便宜路（总费用 ' + sp.cost + '）：' + chain.map(([i]) => NAME[E[i][0]] + '→' + NAME[E[i][1]]).join(' → ') + '，瓶颈 ' + bf));
    for (const [i, x] of chain) {
      const [a, b, c] = E[i];
      setEdgeColor(i, GOLD, 1);
      yield S(() => outT.setText('增广 ' + bf + '：' + NAME[a] + '→' + NAME[b] + ' flow ' + flow[i] + ' → ' + (flow[i] + sp.dir[x] * bf)));
      flow[i] += sp.dir[x] * bf;
      setEdgeLbl(i);
      yield W(380);
    }
    total += bf;
    totalCost += bf * sp.cost;
    refreshResidual();
    yield S(() => outT.setText('第 ' + aug + ' 轮完成：流量 ' + total + '，累计费用 ' + totalCost));
    yield W(500);
    resetEdgeColors();
  }
  yield S(() => {
    outT.setText('结果：最大流 ' + total + '，最小费用 ' + totalCost + '。' + E.map(([u, v, c], i) => NAME[u] + '→' + NAME[v] + ' ' + flow[i] + '/' + c).join('，'));
    status.textContent = 'MinCostFlow 完成：流 ' + total + '，费用 ' + totalCost + '，增广 ' + (aug - 1) + ' 次';
  });
  yield W(600);
  resetEdgeColors();
  nodeView.forEach(v => v.setColor(BLUE, BLUE));
}

function* runMCF() {
  hint.setText('最小费用最大流：每次走最便宜路，反向边退流费用为负');
  yield W(400);
  yield* mcfGen();
  yield S(() => { outT.setText(''); hint.setText('MinCostFlow 完成：成功最短路径法，O(F·VE)'); });
}

panel.addButton('运行演示', () => engine.start(runMCF()));
panel.addButton('清空', () => { engine.clear(); clearView(); hint.setText('已清空，可重新运行'); status.textContent = ''; outT.setText(''); });
panel.addLabel('（拖拽旋转视角，滚轮缩放；青 = BF 松弛，金 = 增广边，紫细线 = 反向残余边（费用为负））');

scene.start(engine);
