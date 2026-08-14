// AlgorithmLibrary/Dijkstra3D.js — Dijkstra 最短路径：距离标签实时更新 + 松弛边高亮 + 最小距离收点 + 路径回溯（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VNode } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Dijkstra3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, CYAN = 0x22d3ee, RED = 0xfb7185, ORANGE = 0xfb923c, WHITE = 0xffffff;
const status = panel.addStatus('就绪');

// 顶点 0..5，有向边 [from, to, w]
const N = 6, R = 200;
const EDGES = [[0, 1, 4], [0, 2, 2], [1, 2, 1], [1, 3, 5], [2, 3, 8], [2, 4, 10], [3, 4, 2], [3, 5, 6], [4, 5, 5]];
const adj = Array.from({ length: N }, () => []);
const nodeView = new Map();  // i -> VNode
const edgeView = new Map();  // 'f-t' -> { tube, lbl }
const distView = new Map();  // i -> VText (跟随节点上方)
let dist = [], prev = [];

function posOf(i) { const a = (i / N) * Math.PI * 2 - Math.PI / 2; return new THREE.Vector3(Math.cos(a) * R + 320, 330, Math.sin(a) * R); }
function tube(a, b) {
  const curve = new THREE.CatmullRomCurve3([a, b]);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 4, 2.5, 6), new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.55 }));
}
function clearView() {
  nodeView.forEach(v => scene.remove(v.mesh));
  edgeView.forEach(e => { scene.remove(e.tube); e.tube.geometry.dispose(); e.tube.material.dispose(); scene.remove(e.lbl.sprite); });
  nodeView.clear(); edgeView.clear();
}
function buildGraph() {
  clearView();
  for (let i = 0; i < N; i++) adj[i].length = 0;
  for (let i = 0; i < N; i++) {
    const p = posOf(i);
    const vn = new VNode(scene, { radius: 20, x: p.x, y: p.y, z: p.z, label: String(i), color: BLUE, emissive: BLUE });
    nodeView.set(i, vn);
    const dT = new VText(scene, { text: '∞', x: 0, y: 46, z: 0, color: '#ffffff', scale: 0.72 });
    vn.mesh.add(dT.sprite);
    distView.set(i, dT);
  }
  for (const [f, t, w] of EDGES) {
    const a = posOf(f), b = posOf(t);
    const m = tube(a, b);
    scene.add(m);
    const mid = new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2 + 20, (a.z + b.z) / 2);
    const lbl = new VText(scene, { text: String(w), x: mid.x, y: mid.y, z: mid.z, color: PALETTE.yellow, scale: 0.6 });
    edgeView.set(f + '->' + t, { tube: m, lbl });
    adj[f].push([t, w]);
  }
}
function setNodeColor(i, c) { nodeView.get(i).setColor(c, c); }
function setEdgeColor(f, t, c, op) { const e = edgeView.get(f + '->' + t); if (e) { e.tube.material.color.setHex(c); e.tube.material.opacity = op; } }
function setDist(i) { distView.get(i).setText(dist[i] === Infinity ? '∞' : String(dist[i])); }
function resetNodeColors() { nodeView.forEach(v => v.setColor(BLUE, BLUE)); }
function resetEdgeColors() { edgeView.forEach(e => { e.tube.material.color.setHex(WHITE); e.tube.material.opacity = 0.55; }); }
function* pulseNode(i, c) {
  const vn = nodeView.get(i);
  setNodeColor(i, c);
  yield A(420, p => { vn.mesh.scale.setScalar(1 + 0.28 * Math.sin(p * Math.PI)); });
  vn.mesh.scale.setScalar(1);
}

function* dijkstraGen() {
  dist = Array(N).fill(Infinity);
  prev = Array(N).fill(-1);
  const done = new Set();
  dist[0] = 0;
  setDist(0);
  yield S(() => { status.textContent = '初始化：dist[0] = 0，其余 ∞。每轮取未访问中距离最小者'; });
  yield W(500);
  while (done.size < N) {
    let u = -1, best = Infinity;
    for (let i = 0; i < N; i++) if (!done.has(i) && dist[i] < best) { best = dist[i]; u = i; }
    if (u === -1) break;
    done.add(u);
    yield S(() => { status.textContent = '选出最小距离节点 ' + u + '（dist=' + dist[u] + '）→ 标记已确定'; });
    yield* pulseNode(u, GOLD);
    yield W(450);
    for (const [v, w] of adj[u]) {
      const cand = dist[u] + w;
      if (cand < dist[v]) {
        setEdgeColor(u, v, CYAN, 1);
        setNodeColor(v, ORANGE);
        yield S(() => { status.textContent = '松弛边 ' + u + '→' + v + '（权重 ' + w + '）：dist[' + v + '] ' + (dist[v] === Infinity ? '∞' : dist[v]) + ' → ' + cand + '（经由 ' + u + '）'; });
        dist[v] = cand;
        prev[v] = u;
        setDist(v);
        yield* pulseNode(v, ORANGE);
        yield W(420);
      } else {
        setEdgeColor(u, v, RED, 0.8);
        yield S(() => { status.textContent = '边 ' + u + '→' + v + '（' + dist[u] + '+' + w + '=' + cand + ' ≥ dist[' + v + ']=' + dist[v] + '）：不更新'; });
        yield W(330);
      }
      resetEdgeColors();
    }
    setNodeColor(u, GREEN);
    yield S(() => { status.textContent = '节点 ' + u + ' 收点完成（dist=' + dist[u] + '）'; });
    yield W(350);
  }
  // 回溯 0 -> 5
  const path = [5];
  let x = 5;
  while (x !== 0 && prev[x] !== -1) { x = prev[x]; path.unshift(x); }
  for (let k = 0; k < path.length - 1; k++) setEdgeColor(path[k], path[k + 1], GOLD, 1);
  setNodeColor(5, GOLD);
  yield S(() => { status.textContent = '最短路径 0→5 = ' + path.join(' → ') + '，总长 ' + dist[5]; });
  yield W(800);
  yield S(() => { status.textContent = 'Dijkstra 演示完成：0→5 最短 ' + dist[5] + '，路径 ' + path.join('→') + '；dist=' + dist.map((d, i) => i + ':' + d).join(' ') + '；O((V+E)log V)，要求边权非负'; });
  yield W(500);
  resetNodeColors();
}

function* runDijkstra() {
  buildGraph();
  yield S(() => { status.textContent = 'Dijkstra：从源点出发，贪心选取最小距离节点并松弛出边（本页为有向加权图）'; });
  yield W(400);
  yield* dijkstraGen();
}

engine.queue(() => runDijkstra());
panel.addButton('清空', () => { engine.clear(); clearView(); status.textContent = ''; });

scene.start(engine);
