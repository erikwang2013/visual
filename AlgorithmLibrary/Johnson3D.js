// AlgorithmLibrary/Johnson3D.js — Johnson 全源最短路：超源求 h 势 → 重定权（全非负）→ 各源 Dijkstra + 换算回真实距离（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VNode } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Johnson3D');

const scene = new Scene3D('scene', { cameraPos: [0, 260, 720], fov: 55 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff;
const hint = new VText(scene, { text: '点击「运行演示」开始：Johnson 全源最短路（含负权）', x: 0, y: 315, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const outT = new VText(scene, { text: '', x: 0, y: -215, z: 0, color: PALETTE.textGlow, scale: 0.7 });

const N = 5, R = 185;
const EDGES = [[0, 1, 3], [0, 2, 8], [0, 4, -4], [1, 3, 1], [1, 4, 7], [2, 1, 4], [3, 0, 2], [3, 2, -5], [4, 3, 6]];
const adj = Array.from({ length: N }, () => []);
const nodeView = new Map();
const edgeView = new Map();  // 'f-t' -> { tube, lbl }
const hView = new Map();     // i -> h 值标签

function posOf(i) { const a = (i / N) * Math.PI * 2 - Math.PI / 2; return new THREE.Vector3(Math.cos(a) * R, 0, Math.sin(a) * R); }
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
    const hT = new VText(scene, { text: '', x: 0, y: 46, z: 0, color: PUR, scale: 0.6 });
    vn.mesh.add(hT.sprite);
    hView.set(i, hT);
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
function setEdgeLbl(f, t, txt, col) { const e = edgeView.get(f + '->' + t); e.lbl.setText(txt); e.lbl.sprite.material.color.setHex(col || WHITE); }
function resetEdgeColors() { edgeView.forEach(e => { e.tube.material.color.setHex(WHITE); e.tube.material.opacity = 0.55; }); }

function* johnsonGen() {
  // 阶段 1：超源 0 权边 → Bellman-Ford 求 h
  const h = Array(N).fill(0);
  yield S(() => outT.setText('阶段1：加超源 S（0 权边到所有点），Bellman-Ford 求 h(v) = dist(S→v)'));
  yield W(500);
  for (let round = 0; round < N - 1; round++) {
    let changed = false;
    for (const [u, v, w] of EDGES) {
      const cand = h[u] + w;
      if (cand < h[v]) {
        setEdgeColor(u, v, CYAN, 1);
        setNodeColor(v, ORANGE);
        yield S(() => outT.setText('松弛 ' + u + '→' + v + '：h[' + v + '] ' + h[v] + ' → ' + cand));
        h[v] = cand;
        hView.get(v).setText('h=' + h[v]);
        changed = true;
        yield W(400);
        resetEdgeColors();
      }
    }
    if (!changed) break;
  }
  yield S(() => outT.setText('h 势函数：' + h.map((v, i) => 'h[' + i + ']=' + v).join('  ')));
  yield W(600);
  // 阶段 2：重定权 w' = w + h(u) - h(v)
  yield S(() => outT.setText('阶段2：重定权 w′(u,v) = w + h(u) − h(v) → 全部非负'));
  for (const [u, v, w] of EDGES) {
    const wp = w + h[u] - h[v];
    setEdgeColor(u, v, GREEN, 1);
    yield S(() => outT.setText('边 ' + u + '→' + v + '：' + w + ' + ' + h[u] + ' − ' + h[v] + ' = ' + wp));
    setEdgeLbl(u, v, String(wp), wp === 0 ? '#86efac' : '#ffffff');
    yield W(350);
    resetEdgeColors();
  }
  yield S(() => outT.setText('重定权完成：所有边权 ≥ 0，最短路径结构不变'));
  yield W(500);
  // 阶段 3：对源 0 跑 Dijkstra（重定权图）
  yield S(() => outT.setText('阶段3：每个源点跑 Dijkstra（演示源 0）。真实距离 d = dist′ − h(0) + h(v)'));
  yield W(500);
  const dist2 = Array(N).fill(Infinity);
  dist2[0] = 0;
  const done = new Set();
  while (done.size < N) {
    let u = -1, best = Infinity;
    for (let i = 0; i < N; i++) if (!done.has(i) && dist2[i] < best) { best = dist2[i]; u = i; }
    if (u === -1) break;
    done.add(u);
    setNodeColor(u, GOLD);
    yield S(() => outT.setText('取最小 dist′=' + dist2[u] + ' 的节点 ' + u + ''));
    yield W(350);
    for (const [v, w] of adj[u]) {
      const wp = w + h[u] - h[v];
      if (dist2[u] + wp < dist2[v]) {
        setEdgeColor(u, v, CYAN, 1);
        setNodeColor(v, ORANGE);
        yield S(() => outT.setText('Dijkstra 松弛 ' + u + '→' + v + '（w′=' + wp + '）：dist′[' + v + '] → ' + (dist2[u] + wp)));
        dist2[v] = dist2[u] + wp;
        yield W(380);
        resetEdgeColors();
      }
    }
    setNodeColor(u, GREEN);
  }
  const real = dist2.map((d, i) => d - h[0] + h[i]);
  yield S(() => outT.setText('换算真实距离：d(0→v) = dist′ − h[0] + h[v]'));
  yield W(450);
  for (let v = 1; v < N; v++) {
    setNodeColor(v, GOLD);
    yield S(() => outT.setText('0→' + v + ' 真实距离 = ' + dist2[v] + ' − 0 + (' + h[v] + ') = ' + real[v]));
    yield W(450);
  }
  yield S(() => {
    outT.setText('结果：' + real.map((d, i) => '0→' + i + '=' + d).join('  '));
    status.textContent = 'Johnson 完成：0→2=' + real[2] + '，0→4=' + real[4] + '，O(VE + V²logV)';
  });
  yield W(500);
  resetEdgeColors();
  nodeView.forEach(v => v.setColor(BLUE, BLUE));
}

function* runJohnson() {
  buildGraph();
  hint.setText('Johnson：负权图全源最短路 = 重定权 + N 次 Dijkstra');
  yield W(400);
  yield* johnsonGen();
  yield S(() => { outT.setText(''); hint.setText('Johnson 完成：稀疏图下优于 Floyd 的 O(V³)'); });
}

panel.addButton('运行演示', () => engine.start(runJohnson()));
panel.addButton('清空', () => { engine.clear(); clearView(); hint.setText('已清空，可重新运行'); status.textContent = ''; outT.setText(''); });
panel.addLabel('（拖拽旋转视角，滚轮缩放；青 = 松弛/重定权，绿 = 完成，金 = 当前节点；紫 = h 值）');

scene.start(engine);
