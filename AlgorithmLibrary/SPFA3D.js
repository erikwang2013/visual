// AlgorithmLibrary/SPFA3D.js — SPFA：队列优化的 Bellman-Ford，入队/出队/松弛循环（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VNode, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('SPFA3D');

const scene = new Scene3D('scene', { cameraPos: [0, 260, 720], fov: 55 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, WHITE = 0xffffff;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：SPFA 从 0 出发（队列优化）', x: 0, y: 315, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const outT = new VText(scene, { text: '', x: 0, y: -215, z: 0, color: PALETTE.textGlow, scale: 0.7 });

const N = 5, R = 190;
const EDGES = [[0, 1, 4], [0, 2, -2], [1, 2, 3], [1, 3, 2], [2, 3, 1], [2, 4, 5], [3, 4, -3]];
const adj = Array.from({ length: N }, () => []);
const nodeView = new Map();
const edgeView = new Map();
const distView = new Map();
const queueBoxes = [];
let dist = [];

function posOf(i) { const a = (i / N) * Math.PI * 2 - Math.PI / 2; return new THREE.Vector3(Math.cos(a) * R, 0, Math.sin(a) * R); }
function tube(a, b) {
  const curve = new THREE.CatmullRomCurve3([a, b]);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 4, 2.5, 6), new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.55 }));
}
function clearView() {
  nodeView.forEach(v => scene.remove(v.mesh));
  edgeView.forEach(e => { scene.remove(e.tube); e.tube.geometry.dispose(); e.tube.material.dispose(); scene.remove(e.lbl.sprite); });
  queueBoxes.forEach(e => scene.remove(e.box.mesh));
  nodeView.clear(); edgeView.clear(); queueBoxes.length = 0;
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
    const lbl = new VText(scene, { text: String(w), x: mid.x, y: mid.y, z: mid.z, color: w < 0 ? RED : PALETTE.yellow, scale: 0.6 });
    edgeView.set(f + '->' + t, { tube: m, lbl });
    adj[f].push([t, w]);
  }
}
function setNodeColor(i, c) { nodeView.get(i).setColor(c, c); }
function setEdgeColor(f, t, c, op) { const e = edgeView.get(f + '->' + t); if (e) { e.tube.material.color.setHex(c); e.tube.material.opacity = op; } }
function setDist(i) { distView.get(i).setText(dist[i] === Infinity ? '∞' : String(dist[i])); }
function resetEdgeColors() { edgeView.forEach(e => { e.tube.material.color.setHex(WHITE); e.tube.material.opacity = 0.55; }); }
function* pushBox(id) {
  const x = -165 + queueBoxes.length * 55;
  const box = new VBox(scene, { w: 42, h: 42, d: 20, x, y: 175, z: 0, label: id, color: ORANGE, emissive: ORANGE });
  box.mesh.scale.setScalar(0.01);
  yield A(280, p => { box.mesh.scale.setScalar(0.01 + 0.99 * p); });
  queueBoxes.push({ id, box });
}
function* popBox() {
  const e = queueBoxes.shift();
  if (!e) return;
  yield A(240, p => { e.box.mesh.scale.setScalar(1 - p); });
  scene.remove(e.box.mesh);
  const tasks = queueBoxes.map(b => ({ box: b.box, from: b.box.mesh.position.x }));
  if (tasks.length) yield A(300, p => tasks.forEach(t => t.box.mesh.position.x = t.from - 55 * p));
}

function* spfaGen() {
  dist = Array(N).fill(Infinity);
  const inQ = Array(N).fill(false), cnt = Array(N).fill(0);
  dist[0] = 0;
  setDist(0);
  const q = [0];
  inQ[0] = true;
  yield S(() => outT.setText('初始化：dist[0]=0，0 入队。SPFA 只松弛「出队节点」的出边'));
  setNodeColor(0, GREEN);
  yield* pushBox('0');
  yield W(500);
  let head = 0, negCycle = false;
  while (head < q.length) {
    const u = q[head++];
    inQ[u] = false;
    setNodeColor(u, GOLD);
    yield S(() => outT.setText('出队 ' + u + '：松弛它的全部出边'));
    yield* popBox();
    yield W(380);
    for (const [v, w] of adj[u]) {
      const cand = dist[u] + w;
      if (cand < dist[v]) {
        setEdgeColor(u, v, GREEN, 1);
        setNodeColor(v, ORANGE);
        yield S(() => outT.setText('松弛 ' + u + '→' + v + '（' + w + '）：dist[' + v + '] ' + (dist[v] === Infinity ? '∞' : dist[v]) + ' → ' + cand));
        dist[v] = cand;
        setDist(v);
        yield W(420);
        if (!inQ[v]) {
          inQ[v] = true;
          q.push(v);
          cnt[v]++;
          yield S(() => outT.setText(v + ' 不在队列 → 入队（cnt[' + v + ']=' + cnt[v] + '）'));
          yield* pushBox(String(v));
          yield W(320);
          if (cnt[v] >= N) { negCycle = true; break; }
        }
      } else {
        setEdgeColor(u, v, CYAN, 0.75);
        yield S(() => outT.setText('边 ' + u + '→' + v + '：dist 不更新'));
        yield W(220);
      }
      resetEdgeColors();
    }
    setNodeColor(u, GREEN);
    if (negCycle) break;
  }
  if (negCycle) {
    yield S(() => outT.setText('检测到负权环：节点入队次数 ≥ V'));
    status.textContent = 'SPFA：检测到负权环';
  } else {
    yield S(() => outT.setText('队列清空：所有节点达到最终距离'));
    yield W(400);
    setNodeColor(4, GOLD);
    yield S(() => {
      outT.setText('dist 表：' + dist.map((d, i) => i + ':' + d).join('  ') + '（0→4 最短 ' + dist[4] + '）');
      status.textContent = 'SPFA 完成：0→4 = ' + dist[4] + '，无负环，平均 O(E)';
    });
  }
  yield W(500);
  resetEdgeColors();
  nodeView.forEach(v => v.setColor(BLUE, BLUE));
}

function* runSPFA() {
  buildGraph();
  hint.setText('SPFA：只松弛出队节点的出边，入队次数 ≥ V 即负环');
  yield W(400);
  yield* spfaGen();
  yield S(() => { outT.setText(''); hint.setText('SPFA 完成：最坏 O(VE)，实际快于 Bellman-Ford'); });
}

engine.queue(() => runSPFA());
panel.addButton('清空', () => { engine.clear(); clearView(); hint.setText('已清空，可重新运行'); status.textContent = ''; outT.setText(''); });
panel.addLabel('（拖拽旋转视角，滚轮缩放；金 = 出队节点，橙 = 入队，绿 = 松弛成功，青 = 不更新；顶部为队列）');

scene.start(engine);
