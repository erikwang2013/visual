// AlgorithmLibrary/Prim3D.js — Prim 最小生成树：从起点出发每次选「离树最近」的未入树节点，候选边青色闪烁、选中边绿色保留（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VNode } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
applyTheme('Prim3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff;
const status = panel.addStatus('就绪');

const N = 6, R = 210;
const nodeView = new Map();    // i -> VNode
const edgeView = new Map();    // 'a-b'(a<b) -> { tube, wt }
const wView = new Map();       // 'a-b' -> 权重标签
const POS = [];
for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2 - Math.PI / 2; POS[i] = [Math.cos(a) * R + 320, 320, Math.sin(a) * R]; }
const adjW = [
  [{ v: 1, w: 4 }, { v: 2, w: 2 }],
  [{ v: 0, w: 4 }, { v: 2, w: 1 }, { v: 3, w: 5 }],
  [{ v: 0, w: 2 }, { v: 1, w: 1 }, { v: 3, w: 8 }, { v: 4, w: 10 }],
  [{ v: 1, w: 5 }, { v: 2, w: 8 }, { v: 4, w: 2 }, { v: 5, w: 6 }],
  [{ v: 2, w: 10 }, { v: 3, w: 2 }, { v: 5, w: 3 }],
  [{ v: 3, w: 6 }, { v: 4, w: 3 }],
];
const EDGE_LIST = [[0, 1], [0, 2], [1, 2], [1, 3], [2, 3], [2, 4], [3, 4], [3, 5], [4, 5]];
function edgeKey(a, b) { return a < b ? a + '-' + b : b + '-' + a; }
function wOf(a, b) { const e = adjW[a].find(x => x.v === b); return e ? e.w : Infinity; }

function tube(a, b) {
  const curve = new THREE.CatmullRomCurve3([a, b]);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 4, 2.5, 6), new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.55 }));
}
function clearView() {
  nodeView.forEach(v => scene.remove(v.mesh));
  edgeView.forEach(e => { scene.remove(e.tube); e.tube.geometry.dispose(); e.tube.material.dispose(); });
  wView.forEach(t => scene.remove(t.sprite));
  nodeView.clear(); edgeView.clear(); wView.clear();
}
function buildGraph() {
  clearView();
  for (let i = 0; i < N; i++) {
    const [x, y, z] = POS[i];
    const vn = new VNode(scene, { radius: 19, x, y, z, label: String(i), color: BLUE, emissive: BLUE });
    nodeView.set(i, vn);
  }
  for (const [a, b] of EDGE_LIST) {
    const pa = new THREE.Vector3(...POS[a]), pb = new THREE.Vector3(...POS[b]);
    const m = tube(pa, pb);
    scene.add(m);
    edgeView.set(edgeKey(a, b), { tube: m });
    const wt = new VText(scene, { text: String(wOf(a, b)), x: (POS[a][0] + POS[b][0]) / 2, y: (POS[a][1] + POS[b][1]) / 2 + 26, z: (POS[a][2] + POS[b][2]) / 2, color: WHITE, scale: 0.52 });
    wView.set(edgeKey(a, b), wt);
  }
}
function setNodeColor(i, c) { nodeView.get(i).setColor(c, c); }
function setEdgeColor(a, b, c, op) { const e = edgeView.get(edgeKey(a, b)); if (e) { e.tube.material.color.setHex(c); e.tube.material.opacity = op; } }
function resetEdgeColors() { edgeView.forEach(e => { e.tube.material.color.setHex(WHITE); e.tube.material.opacity = 0.55; }); }

function* primGen() {
  const inTree = Array(N).fill(false);
  const key = Array(N).fill(Infinity);
  const parent = Array(N).fill(-1);
  key[0] = 0;
  let total = 0;
  const chosen = [];
  yield S(() => { status.textContent = 'Prim 最小生成树：从节点 0 出发，每轮选「离树最近（key 最小）」的未入树节点加入，相连边即为树边'; });
  yield W(650);
  for (let iter = 0; iter < N; iter++) {
    let u = -1;
    for (let i = 0; i < N; i++) if (!inTree[i] && (u === -1 || key[i] < key[u])) u = i;
    if (u === -1) break;
    inTree[u] = true;
    setNodeColor(u, GOLD);
    if (parent[u] !== -1) {
      const w = wOf(u, parent[u]);
      total += w;
      chosen.push(parent[u] + '-' + u + '(' + w + ')');
      setEdgeColor(u, parent[u], GREEN, 1);
      yield S(() => { status.textContent = '加入节点 ' + u + '：经边 ' + parent[u] + '-' + u + '（权 ' + w + '）入树，树边绿色，累计 ' + total; });
    } else {
      yield S(() => { status.textContent = '加入起点 0（key[0] = 0，直接入树）'; });
    }
    setNodeColor(u, GREEN);
    yield W(450);
    for (const { v, w } of adjW[u]) {
      if (inTree[v]) continue;
      setEdgeColor(u, v, CYAN, 0.95);
      yield S(() => { status.textContent = '候选边 ' + u + '-' + v + '（权 ' + w + '）' + (w < key[v] ? '：key[' + v + '] ' + (key[v] === Infinity ? '∞' : key[v]) + ' → ' + w + '，父节点 = ' + u : '：不更新 key（' + w + ' ≥ key[' + v + '] = ' + key[v] + '）'); });
      yield W(340);
      if (w < key[v]) { key[v] = w; parent[v] = u; }
      setEdgeColor(u, v, WHITE, 0.55);
    }
  }
  yield S(() => { status.textContent = 'MST：' + chosen.join('、') + '，总权重 ' + total; });
  yield W(600);
  yield S(() => { status.textContent = 'Prim 演示完成：MST 总权重 ' + total + '，O(E log V)；贪心扩张，应用：网络设计/电路布线'; });
  yield W(450);
  resetEdgeColors();
  nodeView.forEach((v, i) => setNodeColor(i, GREEN));
  edgeView.forEach((e, k) => { const [a, b] = k.split('-').map(Number); setEdgeColor(a, b, GREEN, 1); });
}

function* runPrim() {
  buildGraph();
  yield W(400);
  yield* primGen();
}

engine.queue(() => runPrim());
panel.addButton('清空', () => { engine.clear(); clearView(); status.textContent = ''; });

scene.start(engine);
