// AlgorithmLibrary/Biconnected3D.js — Tarjan 双连通：dfn/low 标注 + 树边/回边着色 + 割点/桥标记（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VNode } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Biconnected3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff;
const status = panel.addStatus('就绪');

const N = 6;
const POS = { 0: [160, 470, 0], 1: [200, 340, 0], 2: [270, 410, 0], 3: [370, 410, 0], 4: [440, 340, 0], 5: [480, 470, 0] };
const ADJ = { 0: [1, 2], 1: [0, 2], 2: [0, 1, 3], 3: [2, 4, 5], 4: [3, 5], 5: [4, 3] };
const EDGE_LIST = [[0, 1], [1, 2], [2, 0], [2, 3], [3, 4], [4, 5], [5, 3]];
const nodeView = new Map();
const edgeView = new Map();   // 'a-b'(a<b) -> { tube }
const dlView = new Map();     // i -> dfn/low 标签
const tagView = new Map();    // i -> 割点标签
let dfn = [], low = [], parent = [], state = [], cut = [], timer = 0;
const bridgeList = [];
const cutList = [];

function tube(a, b) {
  const curve = new THREE.CatmullRomCurve3([a, b]);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 4, 2.5, 6), new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.55 }));
}
function clearView() {
  nodeView.forEach(v => scene.remove(v.mesh));
  edgeView.forEach(e => { scene.remove(e.tube); e.tube.geometry.dispose(); e.tube.material.dispose(); });
  nodeView.clear(); edgeView.clear(); bridgeList.length = 0; cutList.length = 0;
}
function buildGraph() {
  clearView();
  for (let i = 0; i < N; i++) {
    const [x, y, z] = POS[i];
    const vn = new VNode(scene, { radius: 21, x, y, z, label: String(i), color: BLUE, emissive: BLUE });
    nodeView.set(i, vn);
    const dT = new VText(scene, { text: '', x: 0, y: 46, z: 0, color: CYAN, scale: 0.58 });
    vn.mesh.add(dT.sprite);
    dlView.set(i, dT);
    const tT = new VText(scene, { text: '', x: 0, y: -48, z: 0, color: RED, scale: 0.55 });
    vn.mesh.add(tT.sprite);
    tagView.set(i, tT);
  }
  for (const [u, v] of EDGE_LIST) {
    const a = new THREE.Vector3(...POS[u]), b = new THREE.Vector3(...POS[v]);
    const m = tube(a, b);
    scene.add(m);
    edgeView.set(u < v ? u + '-' + v : v + '-' + u, { tube: m });
  }
}
function setNodeColor(i, c) { nodeView.get(i).setColor(c, c); }
function setEdgeColor(a, b, c, op) { const e = edgeView.get(a < b ? a + '-' + b : b + '-' + a); if (e) { e.tube.material.color.setHex(c); e.tube.material.opacity = op; } }
function resetEdgeColors() { edgeView.forEach(e => { e.tube.material.color.setHex(WHITE); e.tube.material.opacity = 0.55; }); }
function showDL(i) { dlView.get(i).setText('d' + dfn[i] + ' l' + low[i]); }

function* dfs(u) {
  dfn[u] = low[u] = ++timer;
  state[u] = 1;
  showDL(u);
  setNodeColor(u, GOLD);
  let childCnt = 0;
  yield S(() => { status.textContent = '访问 ' + u + '：dfn=low=' + timer; });
  yield W(320);
  for (const v of ADJ[u]) {
    if (v === parent[u]) continue;
    if (state[v] === 0) {
      childCnt++;
      parent[v] = u;
      setEdgeColor(u, v, CYAN, 1);
      yield S(() => { status.textContent = '树边 ' + u + '-' + v + '：递归'; });
      yield W(280);
      yield* dfs(v);
      low[u] = Math.min(low[u], low[v]);
      showDL(u);
      yield S(() => { status.textContent = '回退 ' + u + '：low[' + u + ']=min(' + low[u] + ', low[' + v + ']=' + low[v] + ') → ' + low[u]; });
      yield W(320);
      if (low[v] > dfn[u]) {
        bridgeList.push(u + '-' + v);
        setEdgeColor(u, v, GOLD, 1);
        yield S(() => { status.textContent = '桥：' + u + '-' + v + '（low[' + v + ']=' + low[v] + ' > dfn[' + u + ']=' + dfn[u] + '，删去即断连）'; });
        yield W(380);
      }
      if (parent[u] === -1 ? childCnt > 1 : low[v] >= dfn[u]) {
        cut[u] = true;
        setNodeColor(u, RED);
        tagView.get(u).setText('割点');
        if (!cutList.includes(u)) cutList.push(u);
        yield S(() => { status.textContent = u + ' 是割点' + (parent[u] === -1 ? '（根且有 ' + childCnt + ' 棵子树）' : '（low[' + v + ']=' + low[v] + ' ≥ dfn[' + u + ']=' + dfn[u] + '）'); });
        yield W(380);
      }
      resetEdgeColors();
    } else if (state[v] === 1) {
      setEdgeColor(u, v, RED, 1);
      low[u] = Math.min(low[u], dfn[v]);
      showDL(u);
      yield S(() => { status.textContent = '回边 ' + u + '-' + v + '：low[' + u + '] → ' + low[u]; });
      yield W(300);
      resetEdgeColors();
    }
  }
  state[u] = 2;
  if (!cut[u]) setNodeColor(u, BLUE);
}

function* biconnectedGen() {
  dfn = Array(N).fill(0); low = Array(N).fill(0); parent = Array(N).fill(-1); state = Array(N).fill(0); cut = Array(N).fill(false); timer = 0;
  yield S(() => { status.textContent = '割点：low[v] ≥ dfn[u]（根则需 2+ 棵子树）；桥：low[v] > dfn[u]'; });
  yield W(600);
  for (let i = 0; i < N; i++) {
    if (state[i] === 0) {
      yield S(() => { status.textContent = '新 DFS 根：' + i; });
      yield W(300);
      yield* dfs(i);
    }
  }
  yield S(() => { status.textContent = '割点 ' + cutList.length + ' 个：' + (cutList.join('、') || '无') + '；桥 ' + bridgeList.length + ' 条：' + (bridgeList.join('、') || '无'); });
  yield W(600);
  yield S(() => { status.textContent = '双连通分量（本例 3 个）：{0,1,2}（三角）、{2,3}（桥自身）、{3,4,5}（三角）'; });
  yield W(550);
  yield S(() => { status.textContent = 'Biconnected 演示完成：割点 ' + cutList.length + ' 个，桥 ' + bridgeList.length + ' 条，O(V+E)'; });
  yield W(450);
  resetEdgeColors();
}

function* runBiconnected() {
  buildGraph();
  yield S(() => { status.textContent = 'Tarjan：dfn/low 判割点与桥，一次 DFS 完成'; });
  yield W(400);
  yield* biconnectedGen();
}

engine.queue(() => runBiconnected());
panel.addButton('清空', () => { engine.clear(); buildGraph(); status.textContent = ''; });

scene.start(engine);
