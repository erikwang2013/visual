// AlgorithmLibrary/DFS3D.js — DFS：图城 + 发光路径 + 栈/时间戳 + 回溯镜头。
// 复用 GraphStage / StoryDirector / StateInspector 的通用块。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { applyTheme } from '../3D/Glow.js';
import { ripple, flow } from '../3D/effects/Fx.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
import { GraphStage, edgeKey } from '../3D/director/GraphStage.js';
applyTheme('DFS3D');

const N = 8;
const EDGES = [[0, 1], [0, 6], [0, 7], [1, 2], [1, 5], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]];
const C = { await: 0x64748b, current: 0x22d3ee, visited: 0x4ade80, path: 0x38bdf8, tree: 0xfde047, edge: 0x64748b };
const adj = Array.from({ length: N }, () => []);
EDGES.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });

const isMobile = typeof matchMedia !== 'undefined' && matchMedia('(max-width: 900px)').matches;
const scene = new Scene3D('scene', { cameraPos: [560, 500, 850], lookAt: [320, 300, 0], fov: 50 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const input = new InputKit(panel);
const status = panel.addStatus('就绪');
const stage = new GraphStage(scene, { nodes: N, edges: EDGES, scale: isMobile ? 0.8 : 1 });

let currentSource = 0;
const director = new StoryDirector(scene, {
  title: 'DFS · 图城',
  total: N,
  legend: [
    { label: '未访问', color: '#475569' },
    { label: '路径', color: '#38bdf8' },
    { label: '当前', color: '#22d3ee' },
    { label: '已访问', color: '#4ade80' },
    { label: '树边', color: '#fde047' },
  ],
  onReplay: () => restart(currentSource, true),
});

const sourceSelect = input.addSelect('源点', Array.from({ length: N }, (_, i) => i), 0, (v) => restart(Number(v), true));

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

function blocks({ stack = [], order = [], dfn = [], fin = [], current = null, tree = [] } = {}) {
  const stackItems = stack.slice().reverse().map((id, i) => ({ text: id, cls: i === 0 ? 'head' : '' }));
  const stamp = current === null ? '—' : `dfn=${dfn[current]} · fin=${fin[current] < 0 ? '—' : fin[current]}`;
  return {
    blocks: [
      { type: 'chips', label: '栈（栈顶 → 栈底）', items: stackItems, empty: '空' },
      { type: 'chips', label: 'DFS 顺序', items: order.map((id) => ({ text: id, cls: 'visited' })), empty: '—' },
      { type: 'text', label: '时间戳', value: stamp },
      { type: 'text', label: '当前', value: current === null ? '—' : `节点 ${current} · 深度 ${stack.length}` },
    ],
    footer: `已访问 <b>${order.length}/${N}</b> · 树边 <b>${tree.size ?? tree.length ?? 0}</b> 条`,
  };
}

function* dfsVisit(u, state) {
  state.dfn[u] = ++state.timer;
  state.current = u;
  state.visited.add(u);
  state.stack.push(u);
  state.order.push(u);
  stage.setNodeColor(u, C.current);
  stage.setActive(u);
  stage.setDist(u, 'dfn ' + state.dfn[u]);
  ripple(scene, stage.pos(u).x, stage.pos(u).y, stage.pos(u).z, C.current, 48);
  director.chapter('深入');
  yield S(() => director.beat({
    title: '访问 ' + u,
    why: '第一次到达，记录 dfn；能深入就继续深入。',
    stateText: '栈 ' + state.stack.join(' → ') + ' · dfn=' + state.dfn[u],
    progress: state.order.length,
    camera: focusShot(stage.pos(u)),
    annotations: [
      { id: 'cur', text: '访问 ' + u + ' · dfn ' + state.dfn[u], anchor: () => stage.pos(u).clone().add(new THREE.Vector3(0, 48, 0)), offset: [0, -18] },
      { id: 'stack', text: '栈深 ' + state.stack.length, anchor: () => new THREE.Vector3(320, 300 + 150, 0), offset: [0, -20] },
    ],
  }));
  yield S(() => director.stateUpdate(blocks(state)));
  yield W(480);

  for (const v of adj[u]) {
    if (state.dfn[v] !== -1) continue;
    state.tree.add(edgeKey(u, v));
    stage.setEdge(u, v, C.path, 0.95);
    flow(scene, stage.pos(u).clone().add(new THREE.Vector3(0, 18, 0)), stage.pos(v).clone().add(new THREE.Vector3(0, 18, 0)), C.path);
    yield S(() => director.beat({
      title: '深入 ' + u + ' → ' + v,
      why: 'v 未访问，沿这条边继续深入；这条边成为 DFS 树边。',
      stateText: '当前路径 ' + state.stack.join(' → ') + ' → ' + v,
      progress: state.order.length,
      camera: focusShot(stage.pos(v)),
      annotations: [{ id: 'edge', text: '树边 ' + u + ' → ' + v, anchor: () => stage.pos(u).clone().add(stage.pos(v)).multiplyScalar(0.5).add(new THREE.Vector3(0, 30, 0)), offset: [0, -18], className: 'gold' }],
    }));
    yield W(300);
    yield* dfsVisit(v, state);
    state.current = u;
    stage.setActive(u);
    stage.setNodeColor(u, C.visited);
    director.chapter('回溯');
    yield S(() => director.beat({
      title: '回溯到 ' + u,
      why: 'v 的子树处理完，回到 u 继续找下一个未访问邻居。',
      stateText: '栈 ' + state.stack.join(' → '),
      progress: state.order.length,
      camera: focusShot(stage.pos(u)),
      annotations: [{ id: 'back', text: '回溯到 ' + u, anchor: () => stage.pos(u).clone().add(new THREE.Vector3(0, 48, 0)), offset: [0, -18], className: 'warn' }],
    }));
    yield S(() => director.stateUpdate(blocks(state)));
    yield W(300);
  }

  state.fin[u] = ++state.timer;
  state.stack.pop();
  state.current = state.stack.length ? state.stack[state.stack.length - 1] : null;
  stage.setNodeColor(u, C.visited);
  if (state.stack.length) {
    const p = state.stack[state.stack.length - 1];
    stage.setEdge(p, u, C.tree, 0.95);
    stage.setActive(p);
  } else {
    stage.setActive(null);
  }
  yield S(() => director.beat({
    title: '完成 ' + u,
    why: '没有未访问邻居，记录完成时间并弹栈；后序完成时间用于拓扑/强连通。',
    stateText: 'fin[' + u + '] = ' + state.fin[u] + ' · 栈深 ' + state.stack.length,
    progress: state.order.length,
    camera: state.stack.length ? focusShot(stage.pos(state.stack[state.stack.length - 1])) : SHOT_FINAL,
    annotations: [{ id: 'fin', text: '完成 ' + u + ' · fin ' + state.fin[u], anchor: () => stage.pos(u).clone().add(new THREE.Vector3(0, 48, 0)), offset: [0, -18], className: 'final' }],
  }));
  yield S(() => director.stateUpdate(blocks(state)));
  yield W(420);
}

function* runDFS(source) {
  director.reset();
  resetVisual(source);
  const state = {
    visited: new Set(), stack: [], order: [], dfn: Array(N).fill(-1), fin: Array(N).fill(-1),
    tree: new Set(), timer: 0,
  };
  director.chapter('建立');
  yield S(() => director.beat({
    title: '图城就位',
    why: 'DFS 一条路走到黑；碰壁后回溯。右侧面板是栈、时间戳和完成顺序。',
    stateText: '8 节点 · 10 条边 · 未访问',
    progress: 0,
    camera: SHOT_ESTABLISH,
    annotations: [{ id: 'title', text: 'DFS：深入 → 碰壁 → 回溯', anchor: () => new THREE.Vector3(320, 450, 0), offset: [0, -22] }],
  }));
  yield W(600);
  yield* dfsVisit(source, state);
  director.chapter('DFS 森林');
  yield S(() => director.beat({
    title: 'DFS 完成',
    why: 'dfn 是发现时间，fin 是完成时间；树边连成 DFS 森林。',
    stateText: '访问顺序 ' + state.order.join(' → '),
    progress: N,
    camera: SHOT_FINAL,
    annotations: [
      { id: 'order', text: 'DFS 顺序：' + state.order.join(' → '), anchor: () => new THREE.Vector3(320, 470, 0), offset: [0, -22], className: 'gold' },
      { id: 'tree', text: 'DFS 树边 ' + state.tree.size + ' 条', anchor: () => new THREE.Vector3(320, 420, 0), offset: [0, -22], className: 'final' },
    ],
  }));
  director.stateUpdate(blocks(state));
  status.textContent = 'DFS 顺序: ' + state.order.join(' → ') + ' · 树边 ' + state.tree.size + ' 条';
  yield W(900);
  director.chapter('复盘');
  yield S(() => director.beat({
    title: '深入与回溯',
    why: 'DFS 的时间戳是拓扑排序、SCC、桥/割点的地基；复杂度 O(V+E)。',
    stateText: 'O(V+E) · 递归栈 = 显式栈',
    progress: N,
    camera: SHOT_FINAL,
    annotations: [],
  }));
  yield W(700);
}

function restart(source, autoPlay = true) {
  currentSource = source;
  engine.clear();
  director.reset();
  resetVisual(source);
  sourceSelect.value = String(source);
  engine.queue(() => runDFS(source));
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
    if (id !== undefined && id !== currentSource) restart(id, true);
  }
});

input.addButton('重播', () => restart(currentSource, true));
input.addButton('清空', () => { engine.clear(); director.reset(); resetVisual(currentSource); status.textContent = ''; });
resetVisual(0);
engine.queue(() => runDFS(0));
scene.start(engine);
