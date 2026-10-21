// AlgorithmLibrary/Prim3D.js — Prim 最小生成树：cut 候选边 + 生长藤蔓 + 总权。
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
applyTheme('Prim3D');

const N = 8;
const EDGES = [
  [0, 1, 4], [0, 6, 2], [0, 7, 7], [1, 2, 3], [1, 5, 1],
  [2, 3, 5], [3, 4, 2], [4, 5, 3], [5, 6, 4], [6, 7, 1],
];
const C = { await: 0x64748b, candidate: 0xfbbf24, current: 0x22d3ee, inTree: 0x4ade80, tree: 0xfde047, edge: 0x64748b };
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
const director = new StoryDirector(scene, {
  title: 'Prim · 图城',
  total: N,
  legend: [
    { label: '未加入', color: '#475569' },
    { label: '候选边', color: '#fbbf24' },
    { label: '当前', color: '#22d3ee' },
    { label: '已加入', color: '#4ade80' },
    { label: '树边', color: '#fde047' },
  ],
  onReplay: () => restart(currentSource, true),
});
const sourceSelect = input.addSelect('源点', Array.from({ length: N }, (_, i) => i), 0, (v) => restart(Number(v), true));

const SHOT_MEDIUM = { pos: [540, 470, 800], target: [320, 300, 0], ms: 650 };
const SHOT_FINAL = { pos: [320, 620, 860], target: [320, 300, 0], ms: 900 };
function focusShot() { return SHOT_MEDIUM; }

function resetVisual(source) {
  for (let i = 0; i < N; i++) {
    stage.setNodeColor(i, C.await);
    stage.setDist(i, '');
  }
  for (const [a, b] of EDGES) stage.setEdge(a, b, C.edge, 0.28);
  stage.setActive(null);
  stage.setSource(source);
}

function fmtCandidates(key, inTree, current) {
  return [...key.entries()]
    .filter(([v]) => !inTree.has(v) && Number.isFinite(key.get(v).w))
    .sort((a, b) => a[1].w - b[1].w)
    .map(([v, e]) => ({ text: v + ':' + e.w + '(经' + e.u + ')', cls: v === current ? 'head' : 'open' }));
}

function blocks(state) {
  return {
    blocks: [
      { type: 'chips', label: '已加入', items: [...state.inTree].map((id) => ({ text: id, cls: 'visited' })), empty: '—' },
      { type: 'chips', label: '候选边（目标:权重/来源）', items: fmtCandidates(state.key, state.inTree, state.current), empty: '无' },
      { type: 'kv', label: '生成树', items: [
        { k: '总权', v: state.total },
        { k: '树边', v: state.tree.size + ' 条' },
      ] },
    ],
    footer: `已加入 <b>${state.inTree.size}/${N}</b> · 目标 <b>${state.current === null ? '—' : state.current}</b>`,
  };
}

function* runPrim(source) {
  director.reset();
  resetVisual(source);
  const inTree = new Set([source]);
  const key = new Map(); // v -> { w, u }
  const tree = new Set(); // edge keys
  const state = { inTree, key, tree, total: 0, current: source };
  stage.setNodeColor(source, C.inTree);
  stage.setActive(source);
  for (const [v, w] of adj[source]) {
    key.set(v, { w, u: source });
    stage.setDist(v, 'key=' + w);
    stage.setEdge(source, v, C.candidate, 0.45);
  }

  director.chapter('建立');
  yield S(() => director.beat({
    title: 'Prim：从源点生长',
    why: '每次只看“已加入集合 → 未加入集合”的跨 cut 边，选最短的桥。',
    stateText: '已加入 {S} · 候选 ' + key.size + ' 条',
    progress: 1,
    camera: focusShot(),
    annotations: [{ id: 'title', text: 'Prim：选跨 cut 的最短边', anchor: () => new THREE.Vector3(320, 450, 0), offset: [0, -22] }],
  }));
  director.stateUpdate(blocks(state));
  yield W(700);

  while (inTree.size < N) {
    let bestV = -1, best = null;
    for (const [v, e] of key) {
      if (inTree.has(v)) continue;
      if (!best || e.w < best.w) { bestV = v; best = e; }
    }
    if (bestV < 0) break;
    const u = best.u, w = best.w;
    inTree.add(bestV);
    state.current = bestV;
    state.total += w;
    tree.add(edgeKey(u, bestV));
    stage.setEdge(u, bestV, C.tree, 0.95);
    stage.setNodeColor(bestV, C.inTree);
    stage.setNodeColor(u, C.inTree);
    stage.setDist(bestV, '');
    stage.setActive(bestV);
    flow(scene, stage.pos(u).clone().add(new THREE.Vector3(0, 18, 0)), stage.pos(bestV).clone().add(new THREE.Vector3(0, 18, 0)), C.tree);
    ripple(scene, stage.pos(bestV).x, stage.pos(bestV).y, stage.pos(bestV).z, C.tree, 44);
    director.chapter('选最近桥');
    yield S(() => director.beat({
      title: '选最近桥 ' + u + ' → ' + bestV,
      why: '跨 cut 的最短边是安全的：cut property 保证它属于某棵 MST。',
      stateText: '加入 ' + bestV + ' · 边权 ' + w + ' · 总权 ' + state.total,
      progress: inTree.size,
      camera: focusShot(),
      annotations: [{ id: 'edge', text: '加入 ' + u + ' → ' + bestV + '（w=' + w + '）', anchor: () => stage.pos(u).clone().add(stage.pos(bestV)).multiplyScalar(0.5).add(new THREE.Vector3(0, 30, 0)), offset: [0, -18], className: 'gold' }],
    }));
    director.stateUpdate(blocks(state));
    yield W(450);

    for (const [v, ww] of adj[bestV]) {
      if (inTree.has(v)) continue;
      const old = key.get(v);
      if (!old || ww < old.w) {
        key.set(v, { w: ww, u: bestV });
        stage.setDist(v, 'key=' + ww);
        stage.setNodeColor(v, C.candidate);
        stage.setEdge(bestV, v, C.candidate, 0.45);
      }
    }
    for (const [a, b] of EDGES) if (!tree.has(edgeKey(a, b))) stage.setEdge(a, b, C.edge, 0.22);
    for (const [v, e] of key) {
      if (inTree.has(v)) continue;
      stage.setNodeColor(v, C.candidate);
      stage.setEdge(e.u, v, C.candidate, 0.45);
    }
    director.stateUpdate(blocks(state));
    yield W(260);
  }

  state.current = null;
  for (const [a, b] of EDGES) {
    const isTree = tree.has(edgeKey(a, b));
    stage.setEdge(a, b, isTree ? C.tree : C.edge, isTree ? 0.95 : 0.16);
  }
  for (let i = 0; i < N; i++) {
    stage.setNodeColor(i, C.inTree);
    stage.setDist(i, '');
  }
  stage.setActive(null);
  director.chapter('最小生成树');
  const edgeText = [...tree].join(', ');
  yield S(() => director.beat({
    title: 'MST 完成',
    why: '已加入 8 个节点、7 条边；总权最小。Prim 适合稠密图。',
    stateText: '总权 ' + state.total + ' · 树边 ' + tree.size + ' 条',
    progress: N,
    camera: SHOT_FINAL,
    annotations: [
      { id: 'mst', text: 'Prim MST · 总权 ' + state.total, anchor: () => new THREE.Vector3(320, 450, 0), offset: [0, -22], className: 'final' },
      { id: 'edges', text: '树边：' + edgeText, anchor: () => new THREE.Vector3(320, 400, 0), offset: [0, -22], className: 'gold' },
    ],
  }));
  director.stateUpdate(blocks(state));
  status.textContent = 'Prim: 总权 ' + state.total + ' · 树边 ' + [...tree].join(' ');
  yield W(950);
  director.chapter('复盘');
  yield S(() => director.beat({
    title: '点贪心 + cut',
    why: '每次并入离当前树最近的节点；O(E log V)（二叉堆）。',
    stateText: 'O(E log V) · 适合稠密图',
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
  engine.queue(() => runPrim(source));
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
engine.queue(() => runPrim(0));
scene.start(engine);
