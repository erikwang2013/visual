// AlgorithmLibrary/Dinic3D.js — Dinic 最大流：BFS 分层、DFS 阻塞流、残量/反向边、最小割。
// 复用 GraphStage / StoryDirector；8 拍固定叙事，水管网络上的流量标签实时更新。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { applyTheme } from '../3D/Glow.js';
import { flow, ripple } from '../3D/effects/Fx.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
import { GraphStage } from '../3D/director/GraphStage.js';
applyTheme('Dinic3D');

const N = 6;
const SOURCE = 0, SINK = 5;
const NAMES = ['s', '1', '2', '3', '4', 't'];
const BASE = [
  [0, 4, 5], [4, 2, 2], [4, 5, 2], [2, 1, 3],
  [2, 3, 1], [1, 3, 1], [3, 5, 3], [3, 4, 5],
];
const POS = [
  [70, 360, 0], [420, 370, -150], [230, 270, 60],
  [420, 270, 120], [230, 440, -60], [650, 420, 0],
];
const LABEL_OFFSET = {
  '0>4': [0, 26, 0], '4>2': [-30, 0, 0], '4>5': [24, 26, 0],
  '2>1': [0, 24, 0], '2>3': [0, 24, 0], '1>3': [0, 24, 0],
  '3>5': [-12, 25, 0], '3>4': [34, -10, 0],
};
const C = {
  await: 0x64748b, level: 0x60a5fa, source: 0x22d3ee, sink: 0x4ade80,
  path: 0xfbbf24, edge: 0x64748b, cut: 0xf87171, reverse: 0xc4b5fd,
};
const isMobile = typeof matchMedia !== 'undefined' && matchMedia('(max-width: 900px)').matches;
const view = (pos, target, ms) => ({
  pos: isMobile ? target.map((v, i) => Math.round(v + (pos[i] - v) * 0.54)) : pos,
  target, ms,
});
const HOME = view([580, 660, 990], [340, 370, 0], 0).pos;
const scene = new Scene3D('scene', { cameraPos: HOME, lookAt: [340, 370, 0], fov: 50 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const input = new InputKit(panel);
const status = panel.addStatus('就绪');

const annos = (list) => (isMobile ? list.slice(0, 1) : list);
const SHOT_ESTABLISH = view([580, 660, 990], [340, 370, 0], 900);
const SHOT_MEDIUM = view([540, 610, 880], [340, 370, 0], 720);
const SHOT_FINAL = view([330, 740, 960], [340, 370, 0], 900);

let caps = BASE.map((e) => e[2]);
let flows = BASE.map(() => 0);
let level = Array(N).fill(-1);
let phase = 0;
let totalFlow = 0;
let residual = null;
let lastPath = '';
let cutSum = 0;
let stage = null;

const director = new StoryDirector(scene, {
  title: 'Dinic · 水管网络',
  total: 8,
  legend: [
    { label: '不可达节点', color: '#475569' },
    { label: '分层节点', color: '#60a5fa' },
    { label: '源点 s', color: '#22d3ee' },
    { label: '汇点 t', color: '#4ade80' },
    { label: '增广路', color: '#fbbf24' },
    { label: '最小割', color: '#f87171' },
  ],
  onReplay: () => restart(true),
});

function edgeIndex(u, v) { return BASE.findIndex(([a, b]) => a === u && b === v); }

function buildStage() {
  if (stage) stage.dispose();
  stage = new GraphStage(scene, {
    nodes: N,
    edges: BASE.map(([u, v], i) => [u, v, caps[i]]),
    directed: true,
    positions: POS,
    labels: NAMES,
    center: [340, 370, 0],
    scale: isMobile ? 0.8 : 0.95,
    nodeRadius: 27,
    labelScale: 0.9,
    edgeLabelOffset: LABEL_OFFSET,
  });
}

function refreshLabels() {
  BASE.forEach(([u, v], i) => {
    stage.setEdgeLabel(u, v, flows[i] + '/' + caps[i]);
    stage.setEdgeLabelColor(u, v, flows[i] > 0 ? 0xfde047 : 0x94a3b8);
  });
}

function resetVisual() {
  flows = BASE.map(() => 0);
  level = Array(N).fill(-1);
  phase = 0;
  totalFlow = 0;
  lastPath = '';
  cutSum = 0;
  for (let i = 0; i < N; i++) {
    stage.setNodeColor(i, i === SOURCE ? C.source : i === SINK ? C.sink : C.await);
    stage.setDist(i, '');
  }
  for (const [u, v] of BASE) stage.setEdge(u, v, C.edge, 0.3);
  stage.setActive(null);
  stage.setSource(SOURCE);
  refreshLabels();
}

function blocks(note) {
  const tReach = level[SINK] >= 0;
  const levels = NAMES.map((n, i) => ({
    text: n + ':' + (level[i] < 0 ? '—' : 'L' + level[i]),
    cls: i === SOURCE ? 'head' : level[i] >= 0 ? 'visited' : '',
  }));
  const flowsItems = BASE.map(([u, v], i) => ({
    text: NAMES[u] + '→' + NAMES[v] + ' ' + flows[i] + '/' + caps[i],
    cls: flows[i] > 0 ? 'visited' : '',
  }));
  return {
    blocks: [
      { type: 'chips', label: '分层 level', items: levels, empty: '—' },
      { type: 'chips', label: '边流量 f/c', items: flowsItems, empty: '—' },
      { type: 'chips', label: '本次增广路', items: lastPath ? [{ text: lastPath, cls: 'current' }] : [], empty: '—' },
      { type: 'kv', label: '网络状态', items: [
        { k: 'BFS 阶段', v: phase },
        { k: '总流量', v: totalFlow },
        { k: 't 可达', v: level[SINK] >= 0 ? '是' : '否' },
        { k: '割容量', v: cutSum || '—' },
      ] },
      { type: 'text', label: '动作', value: note },
    ],
    footer: `流量 <b>${totalFlow}</b> · BFS #${phase} · 残量网络${level[SINK] >= 0 ? '仍有增广路' : '已无 s→t 路径'}`,
  };
}

function updateState(note) { director.stateUpdate(blocks(note)); }

function makeResidual() {
  const g = Array.from({ length: N }, () => []);
  BASE.forEach(([u, v], i) => {
    const f = flows[i];
    const fw = { to: v, cap: caps[i] - f, orig: i, dir: 1 };
    const bw = { to: u, cap: f, orig: i, dir: -1 };
    fw.rev = bw;
    bw.rev = fw;
    g[u].push(fw);
    g[v].push(bw);
  });
  return g;
}

function doBfs() {
  phase++;
  residual = makeResidual();
  level = Array(N).fill(-1);
  level[SOURCE] = 0;
  const q = [SOURCE];
  for (let h = 0; h < q.length; h++) {
    const u = q[h];
    for (const e of residual[u]) {
      if (e.cap > 0 && level[e.to] < 0) {
        level[e.to] = level[u] + 1;
        q.push(e.to);
      }
    }
  }
  showLevels();
  return level[SINK] >= 0;
}

function showLevels() {
  for (let i = 0; i < N; i++) {
    if (level[i] < 0) stage.setNodeColor(i, C.await);
    else if (i === SOURCE) stage.setNodeColor(i, C.source);
    else if (i === SINK) stage.setNodeColor(i, C.sink);
    else stage.setNodeColor(i, C.level);
    stage.setDist(i, level[i] < 0 ? '' : 'L' + level[i]);
  }
  stage.setActive(null);
}

function blockingPaths() {
  const it = Array(N).fill(0);
  const paths = [];
  function dfs(u, limit, path) {
    if (u === SINK) return limit;
    while (it[u] < residual[u].length) {
      const e = residual[u][it[u]];
      if (e.cap > 0 && level[e.to] === level[u] + 1) {
        const d = dfs(e.to, Math.min(limit, e.cap), path);
        if (d > 0) { path.push(e); return d; }
      }
      it[u]++;
    }
    return 0;
  }
  while (true) {
    const path = [];
    const d = dfs(SOURCE, 1e9, path);
    if (!d) break;
    const seq = path.slice().reverse();
    const edges = seq.map((e) => ({ orig: e.orig, dir: e.dir, to: e.to, cap: e.cap }));
    const nodes = [SOURCE, ...seq.map((e) => e.to)];
    for (const e of seq) {
      e.cap -= d;
      e.rev.cap += d;
      flows[e.orig] += e.dir * d;
    }
    totalFlow += d;
    paths.push({ d, nodes, edges });
  }
  return paths;
}

function pathNames(p) { return p.nodes.map((id) => NAMES[id]).join(' → '); }

function* animatePaths(paths) {
  for (const p of paths) {
    lastPath = pathNames(p) + ' · +' + p.d;
    for (const id of p.nodes) stage.setNodeColor(id, id === SINK ? C.sink : C.path);
    for (const e of p.edges) {
      const [u, v] = BASE[e.orig];
      stage.setEdge(u, v, C.path, 1);
      const fromId = e.dir > 0 ? u : v;
      const toId = e.dir > 0 ? v : u;
      flow(scene, stage.pos(fromId).clone().add(new THREE.Vector3(0, 18, 0)), stage.pos(toId).clone().add(new THREE.Vector3(0, 18, 0)), C.path);
      refreshLabels();
      updateState('沿分层边 ' + NAMES[fromId] + '→' + NAMES[toId] + ' 推送 ' + p.d);
      yield W(150);
    }
    for (const e of p.edges) {
      const [u, v] = BASE[e.orig];
      stage.setEdge(u, v, C.edge, 0.3);
    }
    refreshLabels();
    updateState('增广 ' + p.d + '：' + pathNames(p));
    director.setBeatState('增广 ' + p.d + ' → ' + pathNames(p) + ' · 总流量 ' + totalFlow);
    status.textContent = 'Dinic · 增广 ' + pathNames(p) + ' +' + p.d + ' · 总流量 ' + totalFlow;
    yield W(300);
    showLevels();
  }
}

function cutInfo() {
  const reach = [];
  let sum = 0;
  const cuts = [];
  for (let i = 0; i < N; i++) if (level[i] >= 0) reach.push(i);
  BASE.forEach(([u, v], i) => {
    if (level[u] >= 0 && level[v] < 0) {
      sum += caps[i];
      cuts.push(i);
    }
  });
  return { reach, sum, cuts };
}

function setCapacityByText(text) {
  const m = String(text).trim().match(/^(\d)\s*>\s*(\d)\s*:\s*(\d{1,3})$/);
  if (!m) { status.textContent = '容量格式：u>v:c（如 1>3:2）'; return; }
  const u = Number(m[1]), v = Number(m[2]), c = Number(m[3]);
  const i = edgeIndex(u, v);
  if (i < 0) { status.textContent = '边 ' + u + '→' + v + ' 不在网络中'; return; }
  caps[i] = c;
  restart(true);
}

function* runDinic() {
  director.reset();
  status.textContent = '';
  buildStage();
  resetVisual();
  updateState('水管网络就位，流量全为 0');

  director.chapter('建立');
  yield S(() => director.beat({
    title: '水管网络就位',
    why: '每条边标 f/c：当前流量 / 容量。Dinic 反复用 BFS 分层，再用 DFS 沿 level+1 的边推阻塞流。',
    stateText: 's=0 · t=5 · 8 条有向边 · 目标：最大化 s→t 流量',
    progress: 1,
    camera: SHOT_ESTABLISH,
    annotations: annos([
      { id: 's', text: '源点 s · 无限供水', anchor: () => stage.pos(SOURCE).clone().add(new THREE.Vector3(0, 52, 0)), offset: [0, -20], className: 'gold' },
      { id: 't', text: '汇点 t · 求最大接收量', anchor: () => stage.pos(SINK).clone().add(new THREE.Vector3(0, 52, 0)), offset: [0, -20], className: 'final' },
    ]),
  }));
  yield W(700);

  director.chapter('BFS 分层');
  const reach1 = doBfs();
  updateState('第 1 次 BFS：按残量 > 0 的边分层');
  yield S(() => director.beat({
    title: 'BFS 建分层图',
    why: '从 s 出发只走残量 > 0 的边，得到每个节点的最短层号；DFS 只允许往 level+1 走。',
    stateText: reach1 ? 't 在 L' + level[SINK] + ' · 开始找阻塞流' : 't 不可达 · 最大流已求得',
    progress: 2,
    camera: SHOT_MEDIUM,
    annotations: annos([{ id: 'level', text: '层号 L 标在节点下方', anchor: () => stage.pos(4).clone().add(new THREE.Vector3(0, 48, 0)), offset: [0, -20] }]),
  }));
  updateState('BFS 分层完成');
  yield W(620);

  director.chapter('DFS 阻塞流');
  yield S(() => director.beat({
    title: 'DFS 推流',
    why: '沿分层边找到一条 s→t 路径，推入路径最小残量；之后更新正向/反向残量。',
    stateText: '阶段 1：找阻塞流',
    progress: 3,
    camera: SHOT_MEDIUM,
    annotations: annos([{ id: 'push', text: '只走 level+1 的边', anchor: () => new THREE.Vector3(340, 520, 0), offset: [0, -22], className: 'gold' }]),
  }));
  if (reach1) yield* animatePaths(blockingPaths());
  lastPath = livePathSummary();
  updateState('阶段 1 阻塞流完成');
  yield W(420);

  director.chapter('第二轮 BFS');
  const reach2 = doBfs();
  const paths2 = reach2 ? blockingPaths() : [];
  updateState('第 2 次 BFS：残量网络重新分层');
  yield S(() => director.beat({
    title: reach2 ? '残量网络再分层' : '残量网络已断开',
    why: '反向前向边让流量可以退回来；BFS 看到的是残量网络，不是原图。',
    stateText: reach2 ? '第 2 阶段 · 找到 ' + paths2.length + ' 条增广路' : 't 不可达 · 可以结算',
    progress: 4,
    camera: SHOT_MEDIUM,
    annotations: annos([{ id: 'residual', text: '反向边残量 = 已推送流量', anchor: () => new THREE.Vector3(340, 520, 0), offset: [0, -22] }]),
  }));
  yield* animatePaths(paths2);
  lastPath = paths2.length ? lastPath : '本轮无增广路';
  updateState(reach2 ? '阶段 2 阻塞流完成' : 't 已不可达');
  yield W(420);

  director.chapter('重复直到断开');
  yield S(() => director.beat({
    title: '重复 BFS + DFS',
    why: '每完成一次阻塞流，s→t 的最短距离严格增加；距离有限，所以阶段数有限。',
    stateText: '继续消去残量网络中的增广路',
    progress: 5,
    camera: SHOT_MEDIUM,
    annotations: annos([{ id: 'loop', text: '阻塞流 → 新分层 → 再阻塞', anchor: () => new THREE.Vector3(340, 520, 0), offset: [0, -22] }]),
  }));
  let extra = 0;
  while (doBfs()) {
    extra++;
    updateState('BFS #' + phase + '：继续分层');
    yield W(260);
    const paths = blockingPaths();
    yield* animatePaths(paths);
    if (!paths.length) break;
    yield W(220);
  }
  lastPath = extra ? lastPath : '残量网络已无增广路';
  updateState('t 不可达：最大流已求得');
  yield W(400);

  director.chapter('最小割');
  const cut = cutInfo();
  cutSum = cut.sum;
  for (let i = 0; i < N; i++) {
    if (level[i] >= 0) stage.setNodeColor(i, i === SOURCE ? C.source : C.level);
    else stage.setNodeColor(i, C.await);
    stage.setDist(i, level[i] < 0 ? 'T' : 'S');
  }
  for (const i of cut.cuts) {
    const [u, v] = BASE[i];
    stage.setEdge(u, v, C.cut, 1);
    ripple(scene, stage.pos(v).x, stage.pos(v).y, stage.pos(v).z, C.cut, 54);
  }
  updateState('最小割 = 可达集 S → 不可达集 T');
  yield S(() => director.beat({
    title: '最小割 = 最大流',
    why: '最后 BFS 的 S/T 划分就是最小割；所有 S→T 原边都已饱和，割容量等于最大流。',
    stateText: '割边 ' + cut.cuts.length + ' 条 · 割容量 ' + cut.sum,
    progress: 6,
    camera: SHOT_FINAL,
    annotations: annos([
      { id: 'cut', text: 'S / T 分界：割容量 ' + cut.sum, anchor: () => new THREE.Vector3(340, 520, 0), offset: [0, -22], className: 'warn' },
      { id: 'reach', text: 'S 侧 {' + cut.reach.map((i) => NAMES[i]).join(',') + '}', anchor: () => new THREE.Vector3(250, 480, 0), offset: [0, -20] },
    ]),
  }));
  yield W(800);

  director.chapter('最大流');
  lastPath = '全部增广完成';
  updateState('最大流结算');
  status.textContent = 'Dinic 最大流演示完成：最大流 = ' + totalFlow + ' · BFS ' + phase + ' 次 · O(V²E)';
  yield S(() => director.beat({
    title: '最大流 = ' + totalFlow,
    why: '所有 s→t 增广路耗尽；割容量 ' + cut.sum + ' 给出上界，流量达到上界即最优。',
    stateText: '总流量 ' + totalFlow + ' · 割容量 ' + cut.sum,
    progress: 7,
    camera: SHOT_FINAL,
    annotations: annos([
      { id: 'max', text: '最大流 = ' + totalFlow, anchor: () => new THREE.Vector3(340, 540, 0), offset: [0, -22], className: 'final' },
      { id: 'cut2', text: '最小割 = ' + cut.sum, anchor: () => new THREE.Vector3(340, 490, 0), offset: [0, -22], className: 'warn' },
    ]),
  }));
  yield W(950);

  director.chapter('复盘');
  yield S(() => director.beat({
    title: 'BFS 分层 + DFS 阻塞流',
    why: 'BFS 保证只沿最短增广路走；DFS 一次填满一层网络。复杂度 O(V²E)，是最大流的经典实现。',
    stateText: '最大流 ' + totalFlow + ' · ' + phase + ' 次 BFS · O(V²E)',
    progress: 8,
    camera: SHOT_FINAL,
    annotations: [],
  }));
  yield W(700);
}

function livePathSummary() {
  return lastPath || '本阶段无新增';
}

function restart(autoPlay = true) {
  status.textContent = '';
  engine.clear();
  director.reset();
  buildStage();
  resetVisual();
  engine.queue(() => runDinic());
  if (autoPlay) engine.toggle();
}

input.addInput('容量 u>v:c', setCapacityByText, 12);
input.addButton('重播', () => restart(true));
input.addButton('清空', () => {
  engine.clear();
  director.reset();
  status.textContent = '';
  buildStage();
  resetVisual();
  updateState('已清空，等待播放');
});
buildStage();
resetVisual();
updateState('就绪：点播放，观察 BFS 分层与流量增长');
engine.queue(() => runDinic());
scene.start(engine);
