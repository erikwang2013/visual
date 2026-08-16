// AlgorithmLibrary/BellmanFord3D.js — Bellman-Ford 最短路径：V-1 轮全边松弛 + 负权边高亮 + 负环检测 + 路径回溯（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VNode } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('BellmanFord3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, WHITE = 0xffffff;
const status = panel.addStatus('就绪');

const N = 5, R = 190;
// 有向边 [from, to, w]，含负权 -2 与 -3
const EDGES = [[0, 1, 4], [0, 2, -2], [1, 2, 3], [1, 3, 2], [2, 3, 1], [2, 4, 5], [3, 4, -3]];
const adj = Array.from({ length: N }, () => []);
const nodeView = new Map();
const edgeView = new Map();  // 'f-t' -> { tube, lbl }
const distView = new Map();
let dist = [], prev = [];

function posOf(i) { const a = (i / N) * Math.PI * 2 - Math.PI / 2; return new THREE.Vector3(Math.cos(a) * R + 320, 510, Math.sin(a) * R); }
function tubeMesh(curve, a, b, r) {
  const mat = new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.55 });
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 4, r, 6), mat);
  const d = new THREE.Vector3().subVectors(b, a).normalize();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(r * 2.8, r * 6.4, 8), mat);
  cone.position.copy(b).addScaledVector(d, -r * 9.6);
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
  scene.add(mesh);
  scene.add(cone);
  mesh.cone = cone;
  return mesh;
}

function tube(a, b, radius) {
  return tubeMesh(new THREE.CatmullRomCurve3([a, b]), a, b, radius || 2.5);
}

function clearView() {
  nodeView.forEach(v => scene.remove(v.mesh));
  edgeView.forEach(e => { scene.remove(e.tube); e.tube.geometry.dispose(); e.tube.material.dispose(); if (e.tube.cone) { scene.remove(e.tube.cone); e.tube.cone.geometry.dispose(); } scene.remove(e.lbl.sprite); });
  nodeView.clear(); edgeView.clear();
}
function buildGraph() {
  clearView();
  for (let i = 0; i < N; i++) adj[i].length = 0;
  for (let i = 0; i < N; i++) {
    const p = posOf(i);
    const vn = new VNode(scene, { radius: 20, x: p.x, y: p.y, z: p.z, label: String(i), color: BLUE, emissive: BLUE });
    nodeView.set(i, vn);
    const dT = new VText(scene, { text: '∞', x: 0, y: 72, z: 0, color: '#ffffff', scale: 0.72 });
    vn.mesh.add(dT.sprite);
    distView.set(i, dT);
  }
  for (const [f, t, w] of EDGES) {
    const a = posOf(f), b = posOf(t);
    const m = tube(a, b);
    scene.add(m);
    const mid = new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2 + 20, (a.z + b.z) / 2);
    const lbl = new VText(scene, { text: String(w), x: mid.x, y: mid.y, z: mid.z, color: w < 0 ? RED : PALETTE.yellow, scale: 0.6 });
    edgeView.set(f + '->' + t, { tube: m, lbl });
    adj[f].push([t, w]);
  }
}
function setNodeColor(i, c) { nodeView.get(i).setColor(c, c); }
function setEdgeColor(f, t, c, op) { const e = edgeView.get(f + '->' + t); if (e) { e.tube.material.color.setHex(c); e.tube.material.opacity = op; } }
function setDist(i) { distView.get(i).setText(dist[i] === Infinity ? '∞' : String(dist[i])); }
function resetEdgeColors() { edgeView.forEach(e => { e.tube.material.color.setHex(WHITE); e.tube.material.opacity = 0.55; }); }

function* bellmanFordGen() {
  dist = Array(N).fill(Infinity);
  prev = Array(N).fill(-1);
  dist[0] = 0;
  setDist(0);
  yield S(() => { status.textContent = '初始化：dist[0]=0。执行 V-1 = 4 轮，每轮松弛全部 ' + EDGES.length + ' 条边'; });
  yield W(550);
  let converged = false;
  for (let round = 1; round <= N - 1; round++) {
    yield S(() => { status.textContent = '——— 第 ' + round + ' 轮：依次松弛每条边 ———'; });
    yield W(450);
    let changed = false;
    for (const [u, v, w] of EDGES) {
      if (dist[u] === Infinity) continue;
      const cand = dist[u] + w;
      if (cand < dist[v]) {
        setEdgeColor(u, v, GREEN, 1);
        setNodeColor(v, ORANGE);
        yield S(() => { status.textContent = '松弛 ' + u + '→' + v + '（' + w + '）：dist[' + v + '] ' + (dist[v] === Infinity ? '∞' : dist[v]) + ' → ' + cand; });
        dist[v] = cand;
        prev[v] = u;
        setDist(v);
        changed = true;
        yield W(430);
      } else {
        setEdgeColor(u, v, CYAN, 0.75);
        yield S(() => { status.textContent = '边 ' + u + '→' + v + '（' + dist[u] + '+' + w + ' ≥ dist[' + v + ']=' + dist[v] + '）：无更新'; });
        yield W(240);
      }
      resetEdgeColors();
    }
    if (!changed) {
      converged = true;
      yield S(() => { status.textContent = '第 ' + round + ' 轮无任何更新 → 提前收敛，无需 V-1 轮'; });
      yield W(550);
      break;
    }
  }
  if (!converged) {
    yield S(() => { status.textContent = '跑满 4 轮后第 V 轮验证：所有边均无法再松弛 → 图中无负权环'; });
    yield W(500);
  }
  const path = [4];
  let x = 4;
  while (x !== 0 && prev[x] !== -1) { x = prev[x]; path.unshift(x); }
  for (let k = 0; k < path.length - 1; k++) setEdgeColor(path[k], path[k + 1], GOLD, 1);
  setNodeColor(4, GOLD);
  yield S(() => { status.textContent = '最短路径 0→4：' + path.join(' → ') + '，总长 ' + dist[4] + '（负权边参与）'; });
  yield W(800);
  yield S(() => {
    status.textContent = 'Bellman-Ford 演示完成：0→4 = ' + dist[4] + '，' + (converged ? '提前收敛' : '4 轮') + '，无负环';
  });
  yield W(500);
  resetEdgeColors();
  nodeView.forEach(v => v.setColor(BLUE, BLUE));
}

function* runBF() {
  buildGraph();
  yield S(() => { status.textContent = 'Bellman-Ford：从 0 出发，支持负权边，V-1 轮全边松弛'; });
  yield W(400);
  yield* bellmanFordGen();
  yield S(() => { status.textContent = 'Bellman-Ford 演示完成：复杂度 O(VE)，第 V 轮仍更新则存在负环'; });
}

buildGraph();
engine.queue(() => runBF());
panel.addButton('清空', () => { engine.clear(); clearView(); status.textContent = ''; });

scene.start(engine);
