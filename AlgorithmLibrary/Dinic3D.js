// AlgorithmLibrary/Dinic3D.js — Dinic 最大流：BFS 分层网络（level 标注）+ DFS 阻塞流 + 残量更新（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VNode } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Dinic3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff;
const status = panel.addStatus('就绪');

const N = 6;
const POS = [[0, 220, 0], [-120, 73, 0], [120, 73, 0], [-120, -73, 0], [120, -73, 0], [0, -220, 0]].map(p => [p[0] + 320, p[1] + 546, p[2]]);
const NAME = ['s', '1', '2', '3', '4', 't'];
const E = [[0, 1, 3], [0, 2, 2], [1, 3, 2], [1, 4, 2], [2, 3, 1], [2, 4, 2], [3, 4, 1], [3, 5, 2], [4, 5, 3]];
const nodeView = new Map();
const edgeView = new Map();   // edgeIdx -> { tube, lbl }
const lvlView = new Map();    // i -> level 标签
let flow = [], level = [];

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
  for (let i = 0; i < N; i++) {
    const [x, y, z] = POS[i];
    const vn = new VNode(scene, { radius: 21, x, y, z, label: NAME[i], color: BLUE, emissive: BLUE });
    nodeView.set(i, vn);
    const lT = new VText(scene, { text: '', x: 0, y: 46, z: 0, color: CYAN, scale: 0.6 });
    vn.mesh.add(lT.sprite);
    lvlView.set(i, lT);
  }
  for (let i = 0; i < E.length; i++) {
    const [u, v, c] = E[i];
    const a = new THREE.Vector3(...POS[u]), b = new THREE.Vector3(...POS[v]);
    const m = tube(a, b);
    scene.add(m);
    const mid = new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2 + 18, (a.z + b.z) / 2);
    const lbl = new VText(scene, { text: '0/' + c, x: mid.x, y: mid.y, z: mid.z, color: PALETTE.yellow, scale: 0.58 });
    edgeView.set(i, { tube: m, lbl });
  }
}
function setNodeColor(i, c) { nodeView.get(i).setColor(c, c); }
function setEdgeColor(i, c, op) { const e = edgeView.get(i); e.tube.material.color.setHex(c); e.tube.material.opacity = op; }
function setEdgeLbl(i) { const [u, v, c] = E[i]; edgeView.get(i).lbl.setText(flow[i] + '/' + c); }
function resetEdgeColors() { edgeView.forEach(e => { e.tube.material.color.setHex(WHITE); e.tube.material.opacity = 0.55; }); }
function showLevels() { level.forEach((l, i) => lvlView.get(i).setText(l === -1 ? '' : 'L' + l)); }

function* bfsLevels() {
  level = Array(N).fill(-1);
  level[0] = 0;
  const q = [0];
  let head = 0;
  while (head < q.length) {
    const u = q[head++];
    for (let i = 0; i < E.length; i++) {
      const [a, b, c] = E[i];
      if (a === u && flow[i] < c && level[b] === -1) { level[b] = level[u] + 1; q.push(b); }
      if (b === u && flow[i] > 0 && level[a] === -1) { level[a] = level[u] + 1; q.push(a); }
    }
  }
  showLevels();
  yield S(() => { status.textContent = 'BFS 分层：' + NAME.map((n, i) => n + '=L' + level[i]).join('  ') + (level[N - 1] === -1 ? ' → t 不可达' : ' → 汇 t 在 L' + level[N - 1]); });
  yield W(550);
  return level[N - 1] !== -1;
}

function* dfsBlocking(u, pushed) {
  if (u === N - 1) { setNodeColor(u, GOLD); return pushed; }
  for (let i = 0; i < E.length; i++) {
    const [a, b, c] = E[i];
    if (a === u && flow[i] < c && level[b] === level[u] + 1) {
      setEdgeColor(i, CYAN, 1);
      yield S(() => { status.textContent = 'DFS 沿分层边 ' + NAME[a] + '→' + NAME[b] + '（残量 ' + (c - flow[i]) + '）'; });
      yield W(280);
      const d = yield* dfsBlocking(b, Math.min(pushed, c - flow[i]));
      if (d > 0) {
        flow[i] += d;
        setEdgeLbl(i);
        setEdgeColor(i, GOLD, 1);
        yield S(() => { status.textContent = '增广 ' + d + '：' + NAME[a] + '→' + NAME[b] + ' flow → ' + flow[i] + '/' + c; });
        yield W(320);
        return d;
      }
      resetEdgeColors();
    }
  }
  level[u] = -1;  // 剪枝：该点已无路
  return 0;
}

function* dinicGen() {
  flow = E.map(() => 0);
  buildGraph();
  yield S(() => { status.textContent = 'Dinic：BFS 建分层网络 → DFS 沿 level 递增边找阻塞流 → 重复直到 t 不可达'; });
  yield W(650);
  let total = 0, phase = 0;
  while (true) {
    phase++;
    yield S(() => { status.textContent = '——— 阶段 ' + phase + '：BFS 分层 ———'; });
    yield W(350);
    const ok = yield* bfsLevels();
    if (!ok) {
      yield S(() => { status.textContent = 't 不可达 → 最大流已求得！'; });
      yield W(450);
      break;
    }
    yield S(() => { status.textContent = 'DFS 求阻塞流：只沿 level +1 的边前进'; });
    yield W(400);
    let got;
    do {
      resetEdgeColors();
      got = yield* dfsBlocking(0, Infinity);
      total += got;
      if (got > 0) yield S(() => { status.textContent = '本轮已增广，当前总流量 ' + total; });
    } while (got > 0);
    yield S(() => { status.textContent = '阻塞流完成：阶段 ' + phase + ' 共增广至总流量 ' + total; });
    yield W(550);
    resetEdgeColors();
  }
  yield S(() => { status.textContent = '演示完成：Dinic 最大流 = ' + total + '，共 ' + (phase - 1) + ' 个阶段，O(V²E)'; });
  yield W(600);
  resetEdgeColors();
  nodeView.forEach(v => v.setColor(BLUE, BLUE));
}

function* runDinic() {
  yield W(400);
  yield* dinicGen();
}

buildGraph();  // 初始化默认演示体：图 + 0/容量 标签，点播放才动画
engine.queue(() => runDinic());
panel.addButton('清空', () => { engine.clear(); buildGraph(); status.textContent = ''; });

scene.start(engine);
