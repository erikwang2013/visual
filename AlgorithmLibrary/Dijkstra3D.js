// AlgorithmLibrary/Dijkstra3D.js — Dijkstra：加权图城 + 优先队列气泡 + 松弛光点 + 最短路径回溯。
// 复用 GraphStage（节点/边/权重/灯塔/活动环）与 StoryDirector 的镜头/HUD/状态面板。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { applyTheme } from '../3D/Glow.js';
import { ripple, flow } from '../3D/effects/Fx.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
import { GraphStage, edgeKey } from '../3D/director/GraphStage.js';
applyTheme('Dijkstra3D');

const N = 8;
const EDGES = [
  [0, 1, 4], [0, 6, 2], [0, 7, 7], [1, 2, 3], [1, 5, 1],
  [2, 3, 5], [3, 4, 2], [4, 5, 3], [5, 6, 4], [6, 7, 1],
];
const C = { await: 0x64748b, frontier: 0xfbbf24, current: 0x22d3ee, visited: 0x4ade80, path: 0x38bdf8, tree: 0xfde047, edge: 0x64748b };
const adj = Array.from({ length: N }, () => []);
EDGES.forEach(([a, b, w]) => { adj[a].push([b, w]); adj[b].push([a, w]); });

const isMobile = typeof matchMedia !== 'undefined' && matchMedia('(max-width: 900px)').matches;
const scene = new Scene3D('scene', { cameraPos: [560, 500, 850], lookAt: [320, 300, 0], fov: 50 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const input = new InputKit(panel);
const status = panel.addStatus('就绪');
const stage = new GraphStage(scene, { nodes: N, edges: EDGES, scale: isMobile ? 0.8 : 1, labelScale: 0.8 });

let currentSource = 0;
let currentTarget = 4;
const director = new StoryDirector(scene, {
  title: 'Dijkstra · 图城',
  total: N,
  legend: [
    { label: '未确定', color: '#475569' },
    { label: '候选/已松弛', color: '#fbbf24' },
    { label: '当前', color: '#22d3ee' },
    { label: '已确定', color: '#4ade80' },
    { label: '最短路径', color: '#38bdf8' },
  ],
  onReplay: () => restart(currentSource, currentTarget, true),
});

const sourceSelect = input.addSelect('源点', Array.from({ length: N }, (_, i) => i), 0, (v) => restart(Number(v), currentTarget, true));
const targetSelect = input.addSelect('目标', Array.from({ length: N }, (_, i) => i), 4, (v) => restart(currentSource, Number(v), true));

const SHOT_MEDIUM = { pos: [540, 470, 800], target: [320, 300, 0], ms: 650 };
function focusShot() { return SHOT_MEDIUM; }
const SHOT_ESTABLISH = { pos: [560, 500, 850], target: [320, 300, 0], ms: 900 };
const SHOT_FINAL = { pos: [320, 620, 860], target: [320, 300, 0], ms: 900 };

function resetVisual(source) {
  for (let i = 0; i < N; i++) {
    stage.setNodeColor(i, C.await);
    stage.setDist(i, '');
  }
  for (const [a, b] of EDGES) stage.setEdge(a, b, C.edge, 0.28);
  stage.setActive(null);
  stage.setSource(source);
}

function fmtPQ(pq, confirmed, current) {
  const best = new Map();
  for (const e of pq) {
    if (confirmed.has(e.id)) continue;
    if (!best.has(e.id) || e.d < best.get(e.id)) best.set(e.id, e.d);
  }
  return [...best.entries()].sort((a, b) => a[1] - b[1]).map(([id, d]) => ({
    text: id + ':' + d,
    cls: id === current ? 'head' : '',
  }));
}

function blocks(state, relaxText = '—') {
  const { dist, prev, confirmed, pq, current } = state;
  return {
    blocks: [
      { type: 'chips', label: '优先队列（按 dist）', items: fmtPQ(pq, confirmed, current), empty: '空' },
      { type: 'chips', label: '已确定', items: [...confirmed].map((id) => ({ text: id, cls: 'visited' })), empty: '—' },
      { type: 'dist', label: 'dist[]', values: dist, current },
      { type: 'text', label: '松弛', value: relaxText },
    ],
    footer: `已确定 <b>${confirmed.size}/${N}</b> · 当前 <b>${current === null || current === undefined ? '—' : current}</b>`,
  };
}

function* runDijkstra(source, target) {
  director.reset();
  resetVisual(source);
  const dist = Array(N).fill(Infinity);
  const prev = Array(N).fill(-1);
  const confirmed = new Set();
  const pq = [];
  const state = { dist, prev, confirmed, pq, current: source };
  dist[source] = 0;
  pq.push({ id: source, d: 0 });
  stage.setDist(source, 'd=0');
  stage.setNodeColor(source, C.frontier);
  stage.setActive(source);

  director.chapter('建立');
  yield S(() => director.beat({
    title: '图城就位',
    why: '边上的数字是权重；Dijkstra 只适用于非负权。右侧面板是 PQ 与 dist。',
    stateText: '8 节点 · 10 条边 · 源点 ' + source,
    progress: 0,
    camera: SHOT_ESTABLISH,
    annotations: [{ id: 'title', text: 'Dijkstra：每次取 dist 最小的未确定节点', anchor: () => new THREE.Vector3(320, 450, 0), offset: [0, -22] }],
  }));
  yield W(600);
  director.chapter('初始化');
  yield S(() => director.beat({
    title: '源点入 PQ',
    why: 'dist[S]=0；其余 ∞。PQ 每次弹出当前最近的未确定节点。',
    stateText: 'PQ [S:0] · dist[S]=0',
    progress: 0,
    camera: focusShot(stage.pos(source)),
    annotations: [
      { id: 'source', text: '源点 ' + source + ' · dist 0', anchor: () => stage.pos(source).clone().add(new THREE.Vector3(0, 48, 0)), offset: [0, -18], className: 'gold' },
      { id: 'target', text: '目标 ' + target, anchor: () => stage.pos(target).clone().add(new THREE.Vector3(0, 48, 0)), offset: [0, -18], className: 'final' },
    ],
  }));
  director.stateUpdate(blocks(state));
  yield W(650);

  while (pq.length) {
    pq.sort((a, b) => a.d - b.d);
    const cur = pq.shift();
    if (confirmed.has(cur.id) || cur.d !== dist[cur.id]) continue;
    const u = cur.id;
    state.current = u;
    confirmed.add(u);
    stage.setNodeColor(u, C.current);
    stage.setActive(u);
    stage.setDist(u, 'd=' + dist[u]);
    director.chapter('确定节点');
    yield S(() => director.beat({
      title: '确定 ' + u,
      why: 'PQ 取出 dist 最小的未确定节点；非负权保证它已是最短路。',
      stateText: 'u=' + u + ' · dist=' + dist[u] + ' · 已确定 ' + confirmed.size + '/' + N,
      progress: confirmed.size,
      camera: focusShot(stage.pos(u)),
      annotations: [{ id: 'cur', text: '确定 ' + u + ' · dist ' + dist[u], anchor: () => stage.pos(u).clone().add(new THREE.Vector3(0, 48, 0)), offset: [0, -18] }],
    }));
    director.stateUpdate(blocks(state, '取最小 → 松弛邻居'));
    yield W(420);

    for (const [v, w] of adj[u]) {
      if (confirmed.has(v)) continue;
      const nd = dist[u] + w;
      if (nd >= dist[v]) continue;
      const old = dist[v];
      dist[v] = nd;
      prev[v] = u;
      pq.push({ id: v, d: nd });
      stage.setNodeColor(v, C.frontier);
      stage.setDist(v, 'd=' + nd);
      stage.setEdge(u, v, C.frontier, 0.9);
      stage.setActive(u);
      flow(scene, stage.pos(u).clone().add(new THREE.Vector3(0, 18, 0)), stage.pos(v).clone().add(new THREE.Vector3(0, 18, 0)), C.frontier);
      ripple(scene, stage.pos(v).x, stage.pos(v).y, stage.pos(v).z, C.frontier, 44);
      const relaxText = 'dist[' + v + ']: ' + (Number.isFinite(old) ? old : '∞') + ' → ' + nd + '（经 ' + u + '）';
      yield S(() => director.beat({
        title: '松弛 ' + u + ' → ' + v,
        why: 'dist[u]+w < dist[v]：找到更短的走法，更新 dist 并把 v 压入 PQ。',
        stateText: relaxText,
        progress: confirmed.size,
        camera: focusShot(stage.pos(u)),
        annotations: [{ id: 'relax', text: relaxText, anchor: () => stage.pos(u).clone().add(stage.pos(v)).multiplyScalar(0.5).add(new THREE.Vector3(0, 30, 0)), offset: [0, -18], className: 'gold' }],
      }));
      director.stateUpdate(blocks(state, relaxText));
      yield W(360);
    }
    stage.setNodeColor(u, C.visited);
    director.stateUpdate(blocks(state, '本轮松弛完成'));
    yield W(220);
  }

  // 最短路径回溯：先清掉中间态颜色
  for (const [a, b] of EDGES) stage.setEdge(a, b, C.edge, 0.15);
  const path = [];
  let p = target;
  let guard = 0;
  while (p !== -1 && guard++ < N + 1) { path.push(p); p = prev[p]; }
  path.reverse();
  const pathSet = new Set();
  for (let i = 0; i + 1 < path.length; i++) pathSet.add(edgeKey(path[i], path[i + 1]));
  for (let i = 0; i < N; i++) {
    if (prev[i] >= 0) stage.setEdge(prev[i], i, C.tree, pathSet.has(edgeKey(prev[i], i)) ? 0.95 : 0.4);
  }
  path.forEach((id) => stage.setNodeColor(id, C.path));
  stage.setNodeColor(target, C.tree);
  stage.setActive(target);
  const pathText = path.length ? path.join(' → ') : '无路径';
  director.chapter('最短路径');
  yield S(() => director.beat({
    title: '最短路径 S → ' + target,
    why: '沿 prev 回溯；每条边的松弛都满足三角不等式，路径即最短。',
    stateText: pathText + ' · 距离 ' + dist[target],
    progress: N,
    camera: SHOT_FINAL,
    annotations: [
      { id: 'path', text: '最短路径：' + pathText, anchor: () => new THREE.Vector3(320, 470, 0), offset: [0, -22], className: 'gold' },
      { id: 'cost', text: '总距离 ' + dist[target], anchor: () => new THREE.Vector3(320, 420, 0), offset: [0, -22], className: 'final' },
    ],
  }));
  state.current = target;
  director.stateUpdate(blocks(state, '回溯 prev → 最短路径'));
  status.textContent = 'Dijkstra: ' + pathText + ' · 距离 ' + dist[target];
  yield W(950);
  director.chapter('复盘');
  yield S(() => director.beat({
    title: '贪心 + 优先队列',
    why: '非负权让“取出即确定”成立；邻接表 + 二叉堆 O((V+E)logV)。',
    stateText: 'O((V+E) log V) · 非负权',
    progress: N,
    camera: SHOT_FINAL,
    annotations: [],
  }));
  yield W(700);
}

function restart(source, target, autoPlay = true) {
  currentSource = source;
  currentTarget = target;
  engine.clear();
  director.reset();
  resetVisual(source);
  sourceSelect.value = String(source);
  targetSelect.value = String(target);
  engine.queue(() => runDijkstra(source, target));
  if (autoPlay) engine.toggle();
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let down = null;
const canvas = scene.renderer.domElement;
canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointerup', (e) => {
  if (!down) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  down = null;
  if (moved > 6) return;
  const r = canvas.getBoundingClientRect();
  pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(pointer, scene.camera);
  const hits = raycaster.intersectObjects([...stage.nodes.values()].map((n) => n.mesh), false);
  if (hits.length) {
    const id = hits[0].object.userData.nodeId;
    if (id !== undefined && id !== currentSource) restart(id, currentTarget, true);
  }
});

input.addButton('重播', () => restart(currentSource, currentTarget, true));
input.addButton('清空', () => { engine.clear(); director.reset(); resetVisual(currentSource); status.textContent = ''; });
resetVisual(0);
engine.queue(() => runDijkstra(0, 4));
scene.start(engine);
