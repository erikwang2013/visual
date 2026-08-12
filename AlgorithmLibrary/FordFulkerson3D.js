// AlgorithmLibrary/FordFulkerson3D.js — Ford-Fulkerson 最大流：DFS 找增广路 + 残余网络反向边退流 + f/c 标签（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VNode } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('FordFulkerson3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：Ford-Fulkerson 最大流（s→t）', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const outT = new VText(scene, { text: '', x: 0, y: -235, z: 0, color: PALETTE.textGlow, scale: 0.7 });

const N = 4;
const POS = [[0, 170, 0], [-150, 0, 0], [150, 0, 0], [0, -170, 0]];
const NAME = ['s', 'a', 'b', 't'];
const E = [[0, 1, 1], [0, 2, 1], [1, 2, 1], [1, 3, 1], [2, 3, 1]];
const nodeView = new Map();
const edgeView = new Map();   // edgeIdx -> { tube, lbl }
const resView = new Map();    // 'u->v' -> { tube, lbl } 反向残余边
let flow = [];

function tube(a, b, radius) {
  const curve = new THREE.CatmullRomCurve3([a, b]);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 4, radius || 2.5, 6), new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.55 }));
}
function clearView() {
  nodeView.forEach(v => scene.remove(v.mesh));
  edgeView.forEach(e => { scene.remove(e.tube); e.tube.geometry.dispose(); e.tube.material.dispose(); scene.remove(e.lbl.sprite); });
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
  resView.forEach(e => { scene.remove(e.tube); e.tube.geometry.dispose(); e.tube.material.dispose(); scene.remove(e.lbl.sprite); });
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

function* findPath() {
  const parent = Array(N).fill(-1), dir = Array(N).fill(0), resC = Array(N).fill(0);
  const visited = new Set([0]);
  const stack = [0];
  while (stack.length) {
    const u = stack.pop();
    if (u === N - 1) break;
    for (let i = 0; i < E.length; i++) {
      const [a, b, c] = E[i];
      if (a === u && flow[i] < c && !visited.has(b)) {
        visited.add(b); parent[b] = i; dir[b] = 1; resC[b] = c - flow[i]; stack.push(b);
        setEdgeColor(i, CYAN, 1);
        yield S(() => outT.setText('正向残余 ' + NAME[a] + '→' + NAME[b] + '（余量 ' + (c - flow[i]) + '）'));
        yield W(280);
      }
      if (b === u && flow[i] > 0 && !visited.has(a)) {
        visited.add(a); parent[a] = i; dir[a] = -1; resC[a] = flow[i]; stack.push(a);
        yield S(() => outT.setText('反向残余 ' + NAME[b] + '→' + NAME[a] + '（退流量 ' + flow[i] + '）'));
        yield W(280);
      }
    }
  }
  resetEdgeColors();
  return visited.has(N - 1) ? { parent, dir, resC } : null;
}

function* ffGen() {
  flow = E.map(() => 0);
  buildGraph();
  refreshResidual();
  yield S(() => outT.setText('初始：所有边流量 0。在残余网络中 DFS 找 s→t 增广路（紫色细线 = 反向残余边）'));
  yield W(600);
  let total = 0, aug = 0;
  while (true) {
    aug++;
    yield S(() => outT.setText('——— 寻找第 ' + aug + ' 条增广路 ———'));
    yield W(400);
    const path = yield* findPath();
    if (!path) {
      yield S(() => outT.setText('残余网络中 s 到 t 已无通路 → 达到最大流！'));
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
    yield S(() => outT.setText('找到增广路：' + chain.map(([i]) => NAME[E[i][0]] + '→' + NAME[E[i][1]]).join(' → ') + '，瓶颈容量 ' + bf));
    for (const [i, x] of chain) {
      const [a, b] = E[i];
      setEdgeColor(i, GOLD, 1);
      yield S(() => outT.setText('沿 ' + NAME[a] + '→' + NAME[b] + ' 增广 ' + bf + '：flow ' + flow[i] + ' → ' + (flow[i] + path.dir[x] * bf)));
      flow[i] += path.dir[x] * bf;
      setEdgeLbl(i);
      yield W(380);
    }
    total += bf;
    refreshResidual();
    setNodeColor(0, GREEN); setNodeColor(N - 1, GREEN);
    yield S(() => outT.setText('第 ' + aug + ' 条增广完成，当前总流量 ' + total));
    yield W(500);
    resetEdgeColors();
  }
  yield S(() => {
    outT.setText('最大流 = ' + total + '：' + E.map(([u, v, c], i) => NAME[u] + '→' + NAME[v] + ' ' + flow[i] + '/' + c).join('，'));
    status.textContent = 'Ford-Fulkerson 完成：最大流 ' + total + '，增广 ' + (aug - 1) + ' 次，O(F·E)';
  });
  yield W(600);
  resetEdgeColors();
  nodeView.forEach(v => v.setColor(BLUE, BLUE));
}

function* runFF() {
  hint.setText('Ford-Fulkerson：DFS 找增广路 + 反向边退流');
  yield W(400);
  yield* ffGen();
  yield S(() => { outT.setText(''); hint.setText('Ford-Fulkerson 完成：容量为整数时终止，值 = 最小割容量'); });
}

engine.queue(() => runFF());
panel.addButton('清空', () => { engine.clear(); clearView(); hint.setText('已清空，可重新运行'); status.textContent = ''; outT.setText(''); });
panel.addLabel('（拖拽旋转视角，滚轮缩放；青 = 探索，金 = 增广边，紫细线 = 反向残余边；标签 = 流量/容量）');

scene.start(engine);
