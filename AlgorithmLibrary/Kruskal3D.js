// AlgorithmLibrary/Kruskal3D.js — 边权排序 + 并查集判环 + 森林合并。
// 复用 GraphStage / StoryDirector / 通用状态块。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { applyTheme } from '../3D/Glow.js';
import { ripple, flow } from '../3D/effects/Fx.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
import { GraphStage, edgeKey } from '../3D/director/GraphStage.js';
applyTheme('Kruskal3D');

const N = 8;
const EDGES = [
  [0, 1, 4], [0, 6, 2], [0, 7, 7], [1, 2, 3], [1, 5, 1],
  [2, 3, 5], [3, 4, 2], [4, 5, 3], [5, 6, 4], [6, 7, 1],
];
const C = { await: 0x64748b, current: 0x22d3ee, selected: 0x4ade80, tree: 0xfde047, reject: 0xf87171, edge: 0x64748b };
const COMP_COLORS = [0x38bdf8, 0xa78bfa, 0xf472b6, 0x34d399, 0xfbbf24, 0xfb923c, 0x22d3ee, 0x4ade80];
const isMobile = typeof matchMedia !== 'undefined' && matchMedia('(max-width: 900px)').matches;
const scene = new Scene3D('scene', { cameraPos: [560, 500, 850], lookAt: [320, 300, 0], fov: 50 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const input = new InputKit(panel);
const status = panel.addStatus('就绪');
const stage = new GraphStage(scene, { nodes: N, edges: EDGES, scale: isMobile ? 0.8 : 1, labelScale: 0.8 });
stage.beacon.visible = false;

const sortedEdges = EDGES.slice().sort((a, b) => a[2] - b[2]);
const director = new StoryDirector(scene, {
  title: 'Kruskal · 图城',
  total: N - 1,
  legend: [
    { label: '未处理', color: '#475569' },
    { label: '当前', color: '#22d3ee' },
    { label: '已选', color: '#4ade80' },
    { label: '拒绝', color: '#f87171' },
    { label: '树边', color: '#fde047' },
  ],
  onReplay: () => restart(true),
});
const SHOT_MEDIUM = { pos: [540, 470, 800], target: [320, 300, 0], ms: 650 };
const SHOT_FINAL = { pos: [320, 620, 860], target: [320, 300, 0], ms: 900 };
function focusShot() { return SHOT_MEDIUM; }

function resetVisual() {
  for (let i = 0; i < N; i++) {
    stage.setNodeColor(i, C.await);
    stage.setDist(i, '');
  }
  for (const [a, b] of EDGES) stage.setEdge(a, b, C.edge, 0.28);
  stage.setActive(null);
}

function makeDSU() {
  const parent = Array.from({ length: N }, (_, i) => i);
  const rank = Array(N).fill(0);
  function find(x) { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }
  function union(a, b) {
    let ra = find(a), rb = find(b);
    if (ra === rb) return false;
    if (rank[ra] < rank[rb]) [ra, rb] = [rb, ra];
    parent[rb] = ra;
    if (rank[ra] === rank[rb]) rank[ra]++;
    return true;
  }
  return { parent, find, union };
}

function componentCount(dsu) {
  const roots = new Set();
  for (let i = 0; i < N; i++) roots.add(dsu.find(i));
  return roots.size;
}

function colorComponents(dsu) {
  for (let i = 0; i < N; i++) {
    const r = dsu.find(i);
    stage.setNodeColor(i, COMP_COLORS[r % COMP_COLORS.length]);
  }
}

function edgeChip(e, selected, rejected, current) {
  const key = edgeKey(e[0], e[1]);
  let cls = '';
  if (key === current) cls = 'head';
  else if (selected.has(key)) cls = 'visited';
  else if (rejected.has(key)) cls = 'reject';
  return { text: e[0] + '-' + e[1] + ':' + e[2], cls };
}

function blocks(state) {
  const current = state.current;
  return {
    blocks: [
      { type: 'chips', label: '按边权排序', items: sortedEdges.map((e) => edgeChip(e, state.selected, state.rejected, current)), empty: '—' },
      { type: 'chips', label: '已选树边', items: [...state.selected].map((k) => ({ text: k, cls: 'visited' })), empty: '—' },
      { type: 'kv', label: '森林', items: [
        { k: '总权', v: state.total },
        { k: '分量', v: state.components },
      ] },
    ],
    footer: `已选 <b>${state.selected.size}/${N - 1}</b> 条 · 当前边 <b>${current || '—'}</b>`,
  };
}

function* runKruskal() {
  director.reset();
  resetVisual();
  const dsu = makeDSU();
  const selected = new Set();
  const rejected = new Set();
  const state = { selected, rejected, total: 0, components: N, current: null };
  colorComponents(dsu);

  director.chapter('建立');
  yield S(() => director.beat({
    title: '按边权排序',
    why: 'Kruskal 从全局最短边开始；只要不成环就加入。',
    stateText: '10 条边 · 升序：' + sortedEdges.map((e) => e[2]).join(' '),
    progress: 0,
    camera: focusShot(),
    annotations: [{ id: 'title', text: 'Kruskal：全局最短边优先 + 并查集判环', anchor: () => new THREE.Vector3(320, 450, 0), offset: [0, -22] }],
  }));
  director.stateUpdate(blocks(state));
  yield W(700);

  for (const e of sortedEdges) {
    const [u, v, w] = e;
    const key = edgeKey(u, v);
    state.current = key;
    stage.setActive(u);
    stage.setEdge(u, v, C.current, 0.95);
    director.chapter('检查边 ' + u + '-' + v);
    yield S(() => director.beat({
      title: '检查 ' + u + '-' + v + '（w=' + w + '）',
      why: '两端已在同一分量 → 加入会成环；否则安全。',
      stateText: '当前边 ' + key + ' · 并查集 find(' + u + ') / find(' + v + ')',
      progress: selected.size,
      camera: focusShot(),
      annotations: [{ id: 'edge', text: '检查 ' + u + ' → ' + v + ' · w=' + w, anchor: () => stage.pos(u).clone().add(stage.pos(v)).multiplyScalar(0.5).add(new THREE.Vector3(0, 30, 0)), offset: [0, -18] }],
    }));
    yield W(260);

    if (dsu.union(u, v)) {
      selected.add(key);
      state.total += w;
      state.components = componentCount(dsu);
      stage.setEdge(u, v, C.tree, 0.95);
      colorComponents(dsu);
      stage.setNodeColor(u, C.selected);
      stage.setNodeColor(v, C.selected);
      flow(scene, stage.pos(u).clone().add(new THREE.Vector3(0, 18, 0)), stage.pos(v).clone().add(new THREE.Vector3(0, 18, 0)), C.tree);
      ripple(scene, stage.pos(v).x, stage.pos(v).y, stage.pos(v).z, C.tree, 44);
      director.chapter('加入森林');
      yield S(() => director.beat({
        title: '加入 ' + u + '-' + v,
        why: '两端属于不同分量，加入不会成环；并查集合并两个分量。',
        stateText: '总权 ' + state.total + ' · 分量 ' + state.components,
        progress: selected.size,
        camera: focusShot(),
        annotations: [{ id: 'take', text: '加入树边 ' + u + ' → ' + v, anchor: () => stage.pos(u).clone().add(stage.pos(v)).multiplyScalar(0.5).add(new THREE.Vector3(0, 30, 0)), offset: [0, -18], className: 'final' }],
      }));
    } else {
      rejected.add(key);
      stage.setEdge(u, v, C.reject, 0.65);
      director.chapter('拒绝成环');
      yield S(() => director.beat({
        title: '拒绝 ' + u + '-' + v,
        why: '两端已连通；加入会成环，破坏树结构。',
        stateText: '拒绝 ' + key + ' · 当前分量 ' + state.components,
        progress: selected.size,
        camera: focusShot(),
        annotations: [{ id: 'reject', text: '拒绝：' + u + ' 与 ' + v + ' 已连通', anchor: () => stage.pos(u).clone().add(stage.pos(v)).multiplyScalar(0.5).add(new THREE.Vector3(0, 30, 0)), offset: [0, -18], className: 'warn' }],
      }));
    }
    director.stateUpdate(blocks(state));
    yield W(300);
    stage.setActive(null);
  }

  state.current = null;
  for (let i = 0; i < N; i++) stage.setNodeColor(i, C.selected);
  stage.setActive(null);
  director.chapter('最小生成树');
  const treeText = [...selected].join(', ');
  yield S(() => director.beat({
    title: 'MST 完成',
    why: '选够 V-1 条边且无环；总权最小。Kruskal 适合稀疏图。',
    stateText: '总权 ' + state.total + ' · 树边 ' + selected.size + ' 条',
    progress: N - 1,
    camera: SHOT_FINAL,
    annotations: [
      { id: 'mst', text: 'Kruskal MST · 总权 ' + state.total, anchor: () => new THREE.Vector3(320, 450, 0), offset: [0, -22], className: 'final' },
      { id: 'edges', text: '树边：' + treeText, anchor: () => new THREE.Vector3(320, 400, 0), offset: [0, -22], className: 'gold' },
    ],
  }));
  director.stateUpdate(blocks(state));
  status.textContent = 'Kruskal: 总权 ' + state.total + ' · 树边 ' + treeText;
  yield W(950);
  director.chapter('复盘');
  yield S(() => director.beat({
    title: '边贪心 + 并查集',
    why: '全局最短边优先；并查集 O(α(n)) 判环。复杂度 O(E log E)。',
    stateText: 'O(E log E) · 适合稀疏图',
    progress: N - 1,
    camera: SHOT_FINAL,
    annotations: [],
  }));
  yield W(700);
}

function restart(autoPlay = true) {
  engine.clear();
  director.reset();
  resetVisual();
  engine.queue(() => runKruskal());
  if (autoPlay) engine.toggle();
}

input.addButton('重播', () => restart(true));
input.addButton('清空', () => { engine.clear(); director.reset(); resetVisual(); status.textContent = ''; });
resetVisual();
engine.queue(() => runKruskal());
scene.start(engine);
