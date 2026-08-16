// AlgorithmLibrary/EdmondsKarp3D.js — Edmonds-Karp 最大流：BFS 找最短（边数最少）增广路 + 队列可视化 + 残余网络（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VNode, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('EdmondsKarp3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff;
const status = panel.addStatus('就绪');
const ease = p => p * p * (3 - 2 * p);

const N = 4;
const POS = [[0, 170, 0], [-150, 0, 0], [150, 0, 0], [0, -170, 0]].map(p => [p[0] + 320, p[1] + 500, p[2]]);
const NAME = ['s', 'a', 'b', 't'];
const E = [[0, 1, 3], [0, 2, 2], [1, 2, 1], [1, 3, 2], [2, 3, 3]];
const nodeView = new Map();
const edgeView = new Map();   // edgeIdx -> { tube, lbl }
const resView = new Map();    // 'u->v' -> { tube, lbl } 反向残余边
const queueBoxes = [];
let flow = [];

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
  resView.forEach(e => { scene.remove(e.tube); e.tube.geometry.dispose(); e.tube.material.dispose(); if (e.tube.cone) { scene.remove(e.tube.cone); e.tube.cone.geometry.dispose(); } scene.remove(e.lbl.sprite); });
  queueBoxes.forEach(e => scene.remove(e.box.mesh));
  nodeView.clear(); edgeView.clear(); resView.clear(); queueBoxes.length = 0;
}
function buildGraph() {
  clearView();
  for (let i = 0; i < N; i++) {
    const [x, y, z] = POS[i];
    const vn = new VNode(scene, { radius: 21, x, y, z, label: NAME[i], color: BLUE, emissive: BLUE });
    nodeView.set(i, vn);
  }
  for (let i = 0; i < E.length; i++) {
    const [u, v, c] = E[i];
    const a = new THREE.Vector3(...POS[u]), b = new THREE.Vector3(...POS[v]);
    const m = tube(a, b);
    scene.add(m);
    const mid = new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2 + 18, (a.z + b.z) / 2);
    const lbl = new VText(scene, { text: '0/' + c, x: mid.x, y: mid.y, z: mid.z, color: PALETTE.yellow, scale: 0.62 });
    edgeView.set(i, { tube: m, lbl });
  }
}
function setNodeColor(i, c) { nodeView.get(i).setColor(c, c); }
function setEdgeColor(i, c, op) { const e = edgeView.get(i); e.tube.material.color.setHex(c); e.tube.material.opacity = op; }
function setEdgeLbl(i) { const [u, v, c] = E[i]; edgeView.get(i).lbl.setText(flow[i] + '/' + c); }
function resetEdgeColors() { edgeView.forEach(e => { e.tube.material.color.setHex(WHITE); e.tube.material.opacity = 0.55; }); }
function refreshResidual() {
  resView.forEach(e => { scene.remove(e.tube); e.tube.geometry.dispose(); e.tube.material.dispose(); if (e.tube.cone) { scene.remove(e.tube.cone); e.tube.cone.geometry.dispose(); } scene.remove(e.lbl.sprite); });
  resView.clear();
  for (let i = 0; i < E.length; i++) {
    if (flow[i] === 0) continue;
    const [u, v] = E[i];
    const a = new THREE.Vector3(...POS[v]), b = new THREE.Vector3(...POS[u]);
    const m = tube(a, b, 1.6);
    m.material.color.setHex(PUR); m.material.opacity = 0.9;
    scene.add(m);
    const mid = new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2 - 22, (a.z + b.z) / 2);
    const lbl = new VText(scene, { text: String(flow[i]), x: mid.x, y: mid.y, z: mid.z, color: PUR, scale: 0.55 });
    resView.set(v + '->' + u, { tube: m, lbl });
  }
}
function* pushBox(id) {
  const x = 200 + queueBoxes.length * 55;
  const box = new VBox(scene, { w: 42, h: 42, d: 20, x, y: 475, z: 0, label: id, color: ORANGE, emissive: ORANGE });
  box.mesh.scale.setScalar(0.01);
  yield A(280, p => { box.mesh.scale.setScalar(0.01 + 0.99 * ease(p)); });
  queueBoxes.push({ id, box });
}
function* popBox() {
  const e = queueBoxes.shift();
  if (!e) return;
  yield A(240, p => { e.box.mesh.scale.setScalar(1 - ease(p)); });
  scene.remove(e.box.mesh);
  const tasks = queueBoxes.map(b => ({ box: b.box, from: b.box.mesh.position.x }));
  if (tasks.length) yield A(300, p => tasks.forEach(t => t.box.mesh.position.x = t.from - 55 * ease(p)));
}

function* bfsPath() {
  const parent = Array(N).fill(-1), dir = Array(N).fill(0), resC = Array(N).fill(0);
  const visited = new Set([0]);
  const q = [0];
  yield* pushBox(NAME[0]);
  setNodeColor(0, ORANGE);
  let head = 0, found = false;
  while (head < q.length && !found) {
    const u = q[head++];
    setNodeColor(u, GOLD);
    yield S(() => { status.textContent = 'BFS 出队 ' + NAME[u] + '，扩展残余出边'; });
    yield* popBox();
    yield W(320);
    for (let i = 0; i < E.length; i++) {
      const [a, b, c] = E[i];
      if (a === u && flow[i] < c && !visited.has(b)) {
        visited.add(b); parent[b] = i; dir[b] = 1; resC[b] = c - flow[i]; q.push(b);
        setEdgeColor(i, CYAN, 1);
        setNodeColor(b, ORANGE);
        yield S(() => { status.textContent = '入队 ' + NAME[b] + '（余量 ' + (c - flow[i]) + '）'; });
        yield* pushBox(NAME[b]);
        yield W(300);
      }
      if (b === u && flow[i] > 0 && !visited.has(a)) {
        visited.add(a); parent[a] = i; dir[a] = -1; resC[a] = flow[i]; q.push(a);
        setNodeColor(a, ORANGE);
        yield S(() => { status.textContent = '反向残余入队 ' + NAME[a] + '（退流 ' + flow[i] + '）'; });
        yield* pushBox(NAME[a]);
        yield W(300);
      }
    }
    resetEdgeColors();
    setNodeColor(u, GREEN);
  }
  setNodeColor(0, GREEN);
  return visited.has(N - 1) ? { parent, dir, resC } : null;
}

function* ekGen() {
  flow = E.map(() => 0);
  buildGraph();
  refreshResidual();
  yield S(() => { status.textContent = 'BFS 每次找「边数最少」的增广路（保证 O(VE²)）。s→a=3，s→b=2，a→b=1，a→t=2，b→t=3'; });
  yield W(700);
  let total = 0, aug = 0;
  while (true) {
    aug++;
    yield S(() => { status.textContent = '——— 第 ' + aug + ' 轮 BFS 找最短增广路 ———'; });
    yield W(400);
    const path = yield* bfsPath();
    if (!path) {
      yield S(() => { status.textContent = 'BFS 无法到达 t → 最大流已求得！'; });
      yield W(450);
      break;
    }
    let bf = Infinity, x = N - 1, chain = [];
    while (x !== 0) {
      const i = path.parent[x];
      bf = Math.min(bf, path.resC[x]);
      chain.unshift([i, x]);
      const [a, b] = E[i];
      x = path.dir[x] === 1 ? a : b;
    }
    yield S(() => { status.textContent = '最短增广路（' + chain.length + ' 条边）：' + chain.map(([i]) => NAME[E[i][0]] + '→' + NAME[E[i][1]]).join(' → ') + '，瓶颈 ' + bf; });
    for (const [i, x] of chain) {
      const [a, b] = E[i];
      setEdgeColor(i, GOLD, 1);
      yield S(() => { status.textContent = '增广 ' + bf + '：' + NAME[a] + '→' + NAME[b] + ' flow ' + flow[i] + ' → ' + (flow[i] + path.dir[x] * bf); });
      flow[i] += path.dir[x] * bf;
      setEdgeLbl(i);
      yield W(380);
    }
    total += bf;
    refreshResidual();
    yield S(() => { status.textContent = '第 ' + aug + ' 轮完成，总流量 ' + total; });
    yield W(500);
    resetEdgeColors();
  }
  yield S(() => {
    status.textContent = 'Edmonds-Karp 演示完成：最大流 ' + total + '：' + E.map(([u, v, c], i) => NAME[u] + '→' + NAME[v] + ' ' + flow[i] + '/' + c).join('，') + '，' + (aug - 1) + ' 轮 BFS，O(VE²)';
  });
  yield W(600);
  resetEdgeColors();
  nodeView.forEach(v => v.setColor(BLUE, BLUE));
}

function* runEK() {
  yield W(400);
  yield* ekGen();
}

buildGraph();  // 初始化默认演示体：图（0/容量 标签）+ 空队列区
engine.queue(() => runEK());
panel.addButton('清空', () => { engine.clear(); flow = E.map(() => 0); buildGraph(); status.textContent = ''; });

scene.start(engine);
