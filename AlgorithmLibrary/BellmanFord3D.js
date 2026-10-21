// AlgorithmLibrary/BellmanFord3D.js — 有向图 + 多轮涟漪 + 负权边/负环检测。
// 复用 GraphStage(directed) / StoryDirector / 通用状态块。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { applyTheme } from '../3D/Glow.js';
import { ripple, flow } from '../3D/effects/Fx.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
import { GraphStage } from '../3D/director/GraphStage.js';
applyTheme('BellmanFord3D');

const N = 8;
const BASE = [
  [0, 1, 4], [0, 6, 2], [0, 7, 7], [1, 2, 3], [1, 5, 1],
  [2, 3, 5], [3, 4, 2], [4, 5, 3], [5, 6, 4], [6, 7, -4],
];
const CYCLE = [7, 5, -12];
const C = { await: 0x64748b, update: 0xfbbf24, done: 0x4ade80, neg: 0xf87171, cycle: 0xef4444, edge: 0x64748b };

const isMobile = typeof matchMedia !== 'undefined' && matchMedia('(max-width: 900px)').matches;
const scene = new Scene3D('scene', { cameraPos: [560, 500, 850], lookAt: [320, 300, 0], fov: 50 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const input = new InputKit(panel);
const status = panel.addStatus('就绪');

let cycleMode = false;
let stageCycle = null;
let stage = null;
let currentSource = 0;
function edgeList() { return cycleMode ? [...BASE, CYCLE] : BASE.slice(); }

function buildStage() {
  if (stage) stage.dispose();
  stage = new GraphStage(scene, {
    nodes: N,
    edges: edgeList(),
    directed: true,
    scale: isMobile ? 0.8 : 1,
    labelScale: 0.78,
  });
  stageCycle = cycleMode;
}

const director = new StoryDirector(scene, {
  title: 'Bellman-Ford · 图城',
  total: N - 1,
  legend: [
    { label: '未更新', color: '#475569' },
    { label: '本轮更新', color: '#fbbf24' },
    { label: '已收敛', color: '#4ade80' },
    { label: '负权边', color: '#f87171' },
    { label: '负环', color: '#ef4444' },
  ],
  onReplay: () => restart(currentSource, true),
});

const sourceSelect = input.addSelect('源点', Array.from({ length: N }, (_, i) => i), 0, (v) => restart(Number(v), true));
const cycleBtn = input.addButton('负环：关', () => { cycleMode = !cycleMode; cycleBtn.textContent = cycleMode ? '负环：开' : '负环：关'; restart(currentSource, true); });

const SHOT_MEDIUM = { pos: [540, 470, 800], target: [320, 300, 0], ms: 650 };
function focusShot() { return SHOT_MEDIUM; }
const SHOT_ESTABLISH = { pos: [560, 500, 850], target: [320, 300, 0], ms: 900 };
const SHOT_LAYER = { pos: [600, 560, 920], target: [320, 300, 0], ms: 800 };
const SHOT_FINAL = { pos: [320, 620, 860], target: [320, 300, 0], ms: 900 };

function resetVisual(source) {
  for (let i = 0; i < N; i++) {
    stage.setNodeColor(i, C.await);
    stage.setDist(i, '');
  }
  for (const [a, b] of edgeList()) stage.setEdge(a, b, C.edge, 0.25);
  stage.setEdge(6, 7, C.neg, 0.5);
  if (cycleMode) stage.setEdge(7, 5, C.cycle, 0.55);
  stage.setActive(null);
  stage.setSource(source);
}

function blocks(state) {
  return {
    blocks: [
      { type: 'dist', label: 'dist[]', values: state.dist, current: state.current },
      { type: 'chips', label: '本轮更新', items: state.updates.map((t) => ({ text: t, cls: 'open' })), empty: '无' },
      { type: 'text', label: '轮次', value: state.roundText },
      { type: 'text', label: '负环检测', value: state.cycleText },
    ],
    footer: state.cycle
      ? '<b>检测到负环</b> · 不存在有限最短路'
      : state.converged
        ? `<b>第 ${state.completedRounds} 轮后提前收敛</b> · 负环检测完成`
        : `已完成 <b>${state.completedRounds}/${N - 1}</b> 轮`,
  };
}

function* runBF(source) {
  director.reset();
  resetVisual(source);
  const dist = Array(N).fill(Infinity);
  const prev = Array(N).fill(-1);
  const state = {
    dist, prev, updates: [], current: null, roundText: '准备', cycleText: '未检测', cycle: false,
    completedRounds: 0, converged: false,
  };
  dist[source] = 0;
  stage.setDist(source, 'd=0');
  stage.setNodeColor(source, C.update);
  stage.setActive(source);

  director.chapter('建立');
  yield S(() => director.beat({
    title: '有向图就位',
    why: '箭头表示方向；红色边是负权边。Bellman-Ford 每轮扫描所有边。',
    stateText: '8 节点 · ' + edgeList().length + ' 条有向边 · 源点 ' + source,
    progress: 0,
    camera: SHOT_ESTABLISH,
    annotations: [
      { id: 'neg', text: '负权边 -4', anchor: () => stage.pos(6).clone().add(stage.pos(7)).multiplyScalar(0.5).add(new THREE.Vector3(0, 30, 0)), offset: [0, -18], className: 'warn' },
      { id: 'title', text: 'V-1 轮扫描所有边', anchor: () => new THREE.Vector3(320, 450, 0), offset: [0, -22] },
    ],
  }));
  yield W(600);
  director.chapter('初始化');
  yield S(() => director.beat({
    title: '初始化 dist',
    why: 'dist[S]=0，其余 ∞；之后每轮对所有边做一次松弛。',
    stateText: 'dist[S]=0 · 其余 ∞',
    progress: 0,
    camera: focusShot(stage.pos(source)),
    annotations: [{ id: 'source', text: '源点 ' + source + ' · dist 0', anchor: () => stage.pos(source).clone().add(new THREE.Vector3(0, 48, 0)), offset: [0, -18], className: 'gold' }],
  }));
  director.stateUpdate(blocks(state));
  yield W(600);

  for (let round = 1; round <= N - 1; round++) {
    state.updates = [];
    state.roundText = '第 ' + round + ' / ' + (N - 1) + ' 轮';
    state.current = null;
    director.chapter('第 ' + round + ' 轮');
    yield S(() => director.beat({
      title: '第 ' + round + ' 轮：扫描所有边',
      why: '每条边都试一次；负权边需要多轮才能把更短路径传播出去。',
      stateText: '第 ' + round + ' / ' + (N - 1) + ' 轮 · 本轮更新 0 条',
      progress: round - 1,
      camera: SHOT_LAYER,
      annotations: [{ id: 'round', text: '第 ' + round + ' 轮涟漪', anchor: () => new THREE.Vector3(320, 450, 0), offset: [0, -22] }],
    }));
    yield W(300);
    for (const [u, v, w] of edgeList()) {
      if (!Number.isFinite(dist[u])) continue;
      const nd = dist[u] + w;
      if (nd >= dist[v]) continue;
      const old = dist[v];
      dist[v] = nd;
      prev[v] = u;
      state.current = v;
      state.updates.push(u + '→' + v + ': ' + (Number.isFinite(old) ? old : '∞') + '→' + nd);
      stage.setDist(v, 'd=' + nd);
      stage.setNodeColor(v, C.update);
      stage.setEdge(u, v, C.update, 0.95);
      flow(scene, stage.pos(u).clone().add(new THREE.Vector3(0, 18, 0)), stage.pos(v).clone().add(new THREE.Vector3(0, 18, 0)), C.update);
      ripple(scene, stage.pos(v).x, stage.pos(v).y, stage.pos(v).z, C.update, 40);
      director.setBeatState('第 ' + round + ' 轮 · 更新 ' + state.updates.length + ' 条');
      director.stateUpdate(blocks(state));
      yield W(110);
    }
    state.completedRounds = round;
    if (!state.updates.length) {
      state.converged = true;
      state.roundText = '第 ' + round + ' 轮后收敛';
      director.chapter('提前收敛');
      yield S(() => director.beat({
        title: '第 ' + round + ' 轮无更新',
        why: '本轮没有任何边能松弛，dist 已经收敛，可以提前结束。',
        stateText: '第 ' + round + ' 轮 · 0 条更新',
        progress: round,
        camera: SHOT_LAYER,
        annotations: [{ id: 'done', text: '已收敛', anchor: () => new THREE.Vector3(320, 450, 0), offset: [0, -22], className: 'final' }],
      }));
      director.stateUpdate(blocks(state));
      break;
    }
    for (let i = 0; i < N; i++) if (Number.isFinite(dist[i])) stage.setNodeColor(i, C.update);
    director.stateUpdate(blocks(state));
    yield W(260);
  }

  // 第 V 轮：只检测，不再更新
  let hasCycle = false;
  const cycleUpdates = [];
  for (const [u, v, w] of edgeList()) {
    if (Number.isFinite(dist[u]) && dist[u] + w < dist[v]) {
      hasCycle = true;
      cycleUpdates.push([u, v]);
    }
  }
  state.cycle = hasCycle;
  state.current = null;
  state.cycleText = hasCycle ? '检测到负环' : '无负环';
  for (const [a, b] of edgeList()) stage.setEdge(a, b, C.edge, 0.14);
  if (hasCycle) {
    stage.setEdge(7, 5, C.cycle, 0.95);
    stage.setEdge(5, 6, C.cycle, 0.95);
    stage.setEdge(6, 7, C.cycle, 0.95);
    for (const id of [5, 6, 7]) stage.setNodeColor(id, C.cycle);
    stage.setActive(7);
    director.chapter('负环');
    yield S(() => director.beat({
      title: '第 V 轮仍能松弛 → 负环',
      why: '多扫一轮还能变小，说明存在负权环；负环上不存在有限最短路。',
      stateText: '检测到负环 5 → 6 → 7 → 5',
      progress: N - 1,
      camera: SHOT_FINAL,
      annotations: [
        { id: 'cycle', text: '负环 5 → 6 → 7 → 5', anchor: () => stage.pos(6).clone().add(new THREE.Vector3(0, 60, 0)), offset: [0, -20], className: 'warn' },
        { id: 'nopath', text: '负环上没有有限最短路', anchor: () => new THREE.Vector3(320, 440, 0), offset: [0, -22], className: 'warn' },
      ],
    }));
    status.textContent = 'Bellman-Ford: 检测到负环 5 → 6 → 7 → 5，不存在有限最短路';
  } else {
    for (let i = 0; i < N; i++) {
      stage.setNodeColor(i, C.done);
      if (prev[i] >= 0) stage.setEdge(prev[i], i, C.done, 0.7);
    }
    director.chapter('最短路径树');
    yield S(() => director.beat({
      title: '第 V 轮无更新 → 无负环',
      why: 'V-1 轮后距离稳定；prev 指针连成最短路径树。',
      stateText: dist.map((d, i) => i + ':' + (Number.isFinite(d) ? d : '∞')).join('  '),
      progress: N - 1,
      camera: SHOT_FINAL,
      annotations: [
        { id: 'tree', text: '最短路径树 · 无负环', anchor: () => new THREE.Vector3(320, 450, 0), offset: [0, -22], className: 'final' },
        { id: 'dist', text: 'dist: ' + dist.map((d, i) => i + ':' + (Number.isFinite(d) ? d : '∞')).join(' '), anchor: () => new THREE.Vector3(320, 400, 0), offset: [0, -22], className: 'gold' },
      ],
    }));
    status.textContent = 'Bellman-Ford: 无负环 · dist ' + dist.map((d, i) => i + ':' + (Number.isFinite(d) ? d : '∞')).join(' ');
  }
  director.stateUpdate(blocks(state));
  yield W(950);
  director.chapter('复盘');
  yield S(() => director.beat({
    title: 'V-1 轮是上界',
    why: '最短路最多 V-1 条边；第 V 轮还能松弛就是负环。复杂度 O(VE)。',
    stateText: 'O(VE) · 支持负权边 · 可检测负环',
    progress: N - 1,
    camera: SHOT_FINAL,
    annotations: [],
  }));
  yield W(700);
}

function restart(source, autoPlay = true) {
  currentSource = source;
  engine.clear();
  director.reset();
  if (stageCycle !== cycleMode) buildStage();
  resetVisual(source);
  sourceSelect.value = String(source);
  engine.queue(() => runBF(source));
  if (autoPlay) engine.toggle();
}

if (!stage) buildStage();
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
engine.queue(() => runBF(0));
scene.start(engine);
