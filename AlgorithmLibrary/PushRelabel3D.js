// AlgorithmLibrary/PushRelabel3D.js — Push-Relabel 预流推进：excess/height 双标注 + push/relabel 局部操作 + 溢出流可视化（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VNode } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('PushRelabel3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, WHITE = 0xffffff;
const status = panel.addStatus('就绪');

const N = 4;
const POS = [[320, 650, 0], [170, 500, 0], [470, 500, 0], [320, 350, 0]];
const NAME = ['s', 'a', 'b', 't'];
const E = [[0, 1, 2], [0, 2, 1], [1, 2, 1], [1, 3, 1], [2, 3, 2]];
const nodeView = new Map();
const edgeView = new Map();   // edgeIdx -> { tube, lbl }
const exView = new Map();     // i -> excess/height 标签
let flow = [], h = [], ex = [];

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
    const eT = new VText(scene, { text: '', x: 0, y: 48, z: 0, color: WHITE, scale: 0.58 });
    vn.mesh.add(eT.sprite);
    exView.set(i, eT);
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
function showEx(i) {
  exView.get(i).setText(i === 0 ? 'h=' + h[i] : 'ex=' + ex[i] + ' h=' + h[i]);
  exView.get(i).sprite.material.color.setHex(ex[i] > 0 && i !== 0 && i !== N - 1 ? ORANGE : WHITE);
}

function* pushRelabelGen() {
  flow = E.map(() => 0);
  h = [N, 0, 0, 0];
  ex = [0, 0, 0, 0];
  for (let i = 0; i < N; i++) showEx(i);
  yield S(() => { status.textContent = '初始化：h[s]=' + N + '，其余 h=0。饱和 s 的所有出边（预流）'; });
  yield W(550);
  for (let i = 0; i < E.length; i++) {
    if (E[i][0] !== 0) continue;
    const [u, v, c] = E[i];
    flow[i] = c;
    ex[v] += c;
    setEdgeColor(i, CYAN, 1);
    setNodeColor(v, ORANGE);
    yield S(() => { status.textContent = '饱和 ' + NAME[u] + '→' + NAME[v] + '：flow=' + c + '/' + c + '，ex[' + NAME[v] + ']=' + ex[v]; });
    setEdgeLbl(i);
    showEx(v);
    yield W(450);
  }
  yield S(() => { status.textContent = '预流完成。对「excess>0 且非 s/t」的节点反复 push / relabel'; });
  yield W(500);
  resetEdgeColors();
  let guard = 0;
  while (guard++ < 60) {
    let u = -1;
    for (let i = 1; i < N - 1; i++) if (ex[i] > 0) { u = i; break; }
    if (u === -1) break;
    setNodeColor(u, GOLD);
    let pushed = false;
    for (let i = 0; i < E.length; i++) {
      const [a, b, c] = E[i];
      let ok = false, v = -1, delta = 0;
      if (a === u && flow[i] < c && h[u] === h[b] + 1) { ok = true; v = b; delta = Math.min(ex[u], c - flow[i]); }
      if (b === u && flow[i] > 0 && h[u] === h[a] + 1) { ok = true; v = a; delta = Math.min(ex[u], flow[i]); }
      if (!ok) continue;
      flow[i] += (a === u ? delta : -delta);
      ex[u] -= delta; ex[v] += delta;
      setEdgeColor(i, CYAN, 1);
      setNodeColor(v, ORANGE);
      yield S(() => { status.textContent = 'push ' + delta + '：' + NAME[u] + '→' + NAME[v] + '（h=' + h[u] + '=h[' + NAME[v] + ']+1）。ex[' + NAME[u] + ']=' + ex[u] + '，ex[' + NAME[v] + ']=' + ex[v]; });
      setEdgeLbl(i);
      showEx(u); showEx(v);
      yield W(430);
      resetEdgeColors();
      pushed = true;
      break;
    }
    if (!pushed) {
      let mh = Infinity;
      for (let i = 0; i < E.length; i++) {
        const [a, b, c] = E[i];
        if (a === u && flow[i] < c) mh = Math.min(mh, h[b]);
        if (b === u && flow[i] > 0) mh = Math.min(mh, h[a]);
      }
      h[u] = (mh === Infinity ? h[u] : mh + 1);
      setNodeColor(u, RED);
      yield S(() => { status.textContent = 'relabel：' + NAME[u] + ' 无可推边 → 提升 h 至 ' + h[u]; });
      showEx(u);
      yield W(450);
      setNodeColor(u, BLUE);
    }
  }
  const maxf = E.reduce((s, e, i) => s + (e[1] === N - 1 ? flow[i] : 0), 0);
  yield S(() => { status.textContent = '全部非 s/t 节点 excess=0 → 完成。汇 t 收到的总流量 = ' + maxf; });
  yield W(450);
  setNodeColor(N - 1, GREEN);
  yield S(() => {
    status.textContent = 'Push-Relabel 演示完成：最大流 ' + maxf + '，O(V³)';
  });
  yield W(600);
  resetEdgeColors();
  nodeView.forEach(v => v.setColor(BLUE, BLUE));
}

function* runPR() {
  yield S(() => { status.textContent = 'Push-Relabel：预流 + 局部 push/relabel，无全局查找'; });
  yield W(400);
  yield* pushRelabelGen();
  yield S(() => { status.textContent = 'Push-Relabel 演示完成：预流推进，可并行，最坏 O(V³)'; });
}

buildGraph();
engine.queue(() => runPR());
panel.addButton('清空', () => { engine.clear(); buildGraph(); status.textContent = ''; });

scene.start(engine);
