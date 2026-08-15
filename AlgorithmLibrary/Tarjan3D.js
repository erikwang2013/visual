// AlgorithmLibrary/Tarjan3D.js — Tarjan 强连通分量：dfn/low 标注 + 树边/回边/横叉边着色 + 栈 + SCC 同色圈出（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VNode, VBox } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
applyTheme('Tarjan3D');

const ease = p => p * p * (3 - 2 * p);

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff;
const status = panel.addStatus('就绪');

const N = 7, R = 205;
const EDGES = [[0, 1], [1, 2], [2, 0], [2, 3], [3, 4], [4, 3], [3, 5], [5, 6]];
const adj = Array.from({ length: N }, () => []);
const nodeView = new Map();
const edgeView = new Map();   // 'f->t' -> { tube, arrow }
const dlView = new Map();     // i -> dfn/low 标签
const stackBoxes = [];
const SCC_COLORS = [RED, ORANGE, CYAN, PUR, GREEN, GOLD];
let dfn = [], low = [], state = [], timer = 0;
const sccList = [];

function posOf(i) { const a = (i / N) * Math.PI * 2 - Math.PI / 2; return new THREE.Vector3(Math.cos(a) * R + 320, 530, Math.sin(a) * R); }
function tube(a, b) {
  const curve = new THREE.CatmullRomCurve3([a, b]);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 4, 2.5, 6), new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.55 }));
}
function arrow(a, b) {
  const d = new THREE.Vector3().subVectors(b, a).normalize();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(7, 16, 8), new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.55 }));
  cone.position.copy(b).addScaledVector(d, -24);
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
  return cone;
}
function clearView() {
  nodeView.forEach(v => scene.remove(v.mesh));
  edgeView.forEach(e => { scene.remove(e.tube); e.tube.geometry.dispose(); e.tube.material.dispose(); scene.remove(e.arrow); e.arrow.geometry.dispose(); e.arrow.material.dispose(); });
  stackBoxes.forEach(e => scene.remove(e.box.mesh));
  nodeView.clear(); edgeView.clear(); stackBoxes.length = 0; sccList.length = 0;
}
function buildGraph() {
  clearView();
  for (let i = 0; i < N; i++) adj[i].length = 0;
  for (let i = 0; i < N; i++) {
    const p = posOf(i);
    const vn = new VNode(scene, { radius: 20, x: p.x, y: p.y, z: p.z, label: String(i), color: BLUE, emissive: BLUE });
    nodeView.set(i, vn);
    const dT = new VText(scene, { text: '', x: 0, y: 42, z: 0, color: CYAN, scale: 0.58 });
    vn.mesh.add(dT.sprite);
    dlView.set(i, dT);
  }
  for (const [f, t] of EDGES) {
    const a = posOf(f), b = posOf(t);
    const m = tube(a, b);
    const ar = arrow(a, b);
    scene.add(m); scene.add(ar);
    edgeView.set(f + '->' + t, { tube: m, arrow: ar });
    adj[f].push(t);
  }
}
function setNodeColor(i, c) { nodeView.get(i).setColor(c, c); }
function setEdgeColor(f, t, c, op) { const e = edgeView.get(f + '->' + t); if (e) { e.tube.material.color.setHex(c); e.tube.material.opacity = op; e.arrow.material.color.setHex(c); e.arrow.material.opacity = op; } }
function resetEdgeColors() { edgeView.forEach(e => { e.tube.material.color.setHex(WHITE); e.tube.material.opacity = 0.55; e.arrow.material.color.setHex(WHITE); e.arrow.material.opacity = 0.55; }); }
function showDL(i) { dlView.get(i).setText('d' + dfn[i] + ' l' + low[i]); }
function* pushBox(id) {
  const x = 485 - stackBoxes.length * 55;
  const box = new VBox(scene, { w: 42, h: 42, d: 20, x, y: 475, z: 0, label: id, color: ORANGE, emissive: ORANGE });
  box.mesh.scale.setScalar(0.01);
  yield A(280, p => { const e = ease(p); box.mesh.scale.setScalar(0.01 + 0.99 * e); });
  stackBoxes.push({ id, box });
}
function* popBox() {
  const e = stackBoxes.pop();
  if (!e) return;
  yield A(240, p => { e.box.mesh.scale.setScalar(1 - ease(p)); });
  scene.remove(e.box.mesh);
}
function* popSCC(u, color) {
  const members = [];
  let e;
  do {
    e = stackBoxes.pop();
    if (!e) break;
    members.push(Number(e.id));
    yield A(220, p => { e.box.mesh.scale.setScalar(1 - ease(p)); });
    scene.remove(e.box.mesh);
  } while (String(e.id) !== String(u));
  for (const m of members) setNodeColor(m, color);
  sccList.push(members);
  yield S(() => { status.textContent = '发现 SCC {' + members.join(',') + '}：dfn=low 的根节点弹出'; });
  yield W(600);
}

function* tarjan(u) {
  dfn[u] = low[u] = ++timer;
  state[u] = 1;
  showDL(u);
  setNodeColor(u, GOLD);
  yield* pushBox(String(u));
  yield S(() => { status.textContent = '访问 ' + u + '：dfn=low=' + timer + '，压栈'; });
  yield W(420);
  for (const v of adj[u]) {
    if (state[v] === 0) {
      setEdgeColor(u, v, CYAN, 1);
      yield S(() => { status.textContent = '树边 ' + u + '→' + v + '：递归'; });
      yield W(300);
      yield* tarjan(v);
      low[u] = Math.min(low[u], low[v]);
      showDL(u);
      yield S(() => { status.textContent = '回退 ' + u + '：low[' + u + ']=min(' + low[u] + ', low[' + v + ']=' + low[v] + ') → ' + low[u]; });
      yield W(380);
      resetEdgeColors();
    } else if (state[v] === 1) {
      setEdgeColor(u, v, RED, 1);
      low[u] = Math.min(low[u], dfn[v]);
      showDL(u);
      yield S(() => { status.textContent = '回边 ' + u + '→' + v + '（' + v + ' 在栈中）：low[' + u + '] → ' + low[u]; });
      yield W(380);
      resetEdgeColors();
    } else {
      setEdgeColor(u, v, PUR, 0.8);
      yield S(() => { status.textContent = '横叉边 ' + u + '→' + v + '（' + v + ' 已出栈归属别的 SCC），忽略'; });
      yield W(280);
      resetEdgeColors();
    }
  }
  if (low[u] === dfn[u]) {
    yield S(() => { status.textContent = u + '：dfn=' + dfn[u] + ' === low=' + low[u] + ' → 是 SCC 根，弹出栈顶到 ' + u; });
    yield* popSCC(u, SCC_COLORS[sccList.length % SCC_COLORS.length]);
  } else {
    setNodeColor(u, BLUE);
  }
}

function* tarjanGen() {
  dfn = Array(N).fill(0); low = Array(N).fill(0); state = Array(N).fill(0); timer = 0;
  yield S(() => { status.textContent = 'Tarjan 强连通分量：dfn=首次访问时间戳，low=可达祖先最小 dfn，dfn==low 即 SCC 根'; });
  yield W(600);
  for (let i = 0; i < N; i++) {
    if (state[i] === 0) {
      yield S(() => { status.textContent = '——— 新 DFS 根：' + i + ' ———'; });
      yield W(350);
      yield* tarjan(i);
    }
  }
  yield S(() => { status.textContent = '全部 ' + sccList.length + ' 个 SCC：' + sccList.map(s => '{' + s.join(',') + '}').join('  '); });
  yield W(550);
  yield S(() => { status.textContent = 'Tarjan 演示完成：' + sccList.length + ' 个 SCC，O(V+E)'; });
  yield W(450);
  resetEdgeColors();
}

function* runTarjan() {
  buildGraph();
  yield W(400);
  yield* tarjanGen();
}

buildGraph();
engine.queue(() => runTarjan());
panel.addButton('清空', () => { engine.clear(); clearView(); status.textContent = ''; });

scene.start(engine);
