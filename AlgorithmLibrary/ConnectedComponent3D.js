// AlgorithmLibrary/ConnectedComponent3D.js — 群岛染色：反复从未访问节点 BFS/DFS，一块一色。
// 复用 GraphStage / StoryDirector；8 拍围绕“选根 → 染色 → 边界 → 下一块 → 复盘”。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { applyTheme } from '../3D/Glow.js';
import { ripple, flow } from '../3D/effects/Fx.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
import { GraphStage } from '../3D/director/GraphStage.js';
applyTheme('ConnectedComponent3D');

const N = 10;
const EDGES = [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2], [4, 5], [5, 6], [6, 4], [7, 8], [8, 9]];
const COMP_COLORS = [0x38bdf8, 0xa78bfa, 0xf472b6];
const C = { await: 0x64748b, frontier: 0xfbbf24, current: 0x22d3ee, edge: 0x64748b };
const isMobile = typeof matchMedia !== 'undefined' && matchMedia('(max-width: 900px)').matches;
const view = (pos, target, ms) => ({
  pos: isMobile ? target.map((v, i) => Math.round(v + (pos[i] - v) * 0.61)) : pos,
  target, ms,
});
const HOME = view([640, 680, 960], [320, 360, 100], 0).pos;
const scene = new Scene3D('scene', { cameraPos: HOME, lookAt: [320, 360, 100], fov: 50 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const input = new InputKit(panel);
const status = panel.addStatus('就绪');

const annos = (list) => (isMobile ? list.slice(0, 1) : list);
const SHOT_ESTABLISH = view([640, 680, 960], [320, 360, 100], 900);
const SHOT_MEDIUM = view([560, 610, 860], [320, 360, 100], 700);
const SHOT_FINAL = view([320, 760, 920], [320, 360, 100], 900);

function ring(cx, cz, r, count, startAngle = -Math.PI / 2) {
  return Array.from({ length: count }, (_, i) => {
    const a = startAngle + (i * Math.PI * 2) / count;
    return [cx + Math.cos(a) * r, 360, cz + Math.sin(a) * r];
  });
}
const POS = [
  ...ring(170, 0, 120, 4),
  ...ring(505, 10, 100, 3, -Math.PI / 2),
  ...ring(320, 285, 95, 3, Math.PI / 2),
];
const adj = Array.from({ length: N }, () => []);
for (const [a, b] of EDGES) { adj[a].push(b); adj[b].push(a); }

let start = 0;
let mode = 'BFS';
let stage = null;
const director = new StoryDirector(scene, {
  title: '连通分量 · 群岛',
  total: 8,
  legend: [
    { label: '未访问', color: '#475569' },
    { label: '当前波前', color: '#fbbf24' },
    { label: '正在访问', color: '#22d3ee' },
    { label: 'C1 青', color: '#38bdf8' },
    { label: 'C2 紫', color: '#a78bfa' },
    { label: 'C3 粉', color: '#f472b6' },
  ],
  onReplay: () => restart(true),
});
const modeSelect = input.addSelect('遍历', ['BFS', 'DFS'], mode, (v) => { mode = v; restart(true); });
const startSelect = input.addSelect('起点', Array.from({ length: N }, (_, i) => i), start, (v) => { start = Number(v); restart(true); });

function buildStage() {
  if (stage) stage.dispose();
  stage = new GraphStage(scene, {
    nodes: N,
    edges: EDGES,
    directed: false,
    positions: POS,
    center: [320, 360, 100],
    scale: isMobile ? 0.8 : 0.95,
    nodeRadius: 27,
    labelScale: 0.85,
  });
}

function resetVisual() {
  for (let i = 0; i < N; i++) {
    stage.setNodeColor(i, C.await);
    stage.setDist(i, '');
  }
  for (const [a, b] of EDGES) stage.setEdge(a, b, C.edge, 0.28);
  stage.setActive(null);
  stage.setSource(start);
}

function traceFrom(root, seen) {
  const trace = [];
  if (mode === 'BFS') {
    const queue = [root];
    seen.add(root);
    for (let h = 0; h < queue.length; h++) {
      const u = queue[h];
      const newly = [];
      for (const v of adj[u]) {
        if (seen.has(v)) continue;
        seen.add(v);
        queue.push(v);
        newly.push(v);
      }
      trace.push({ u, newly, frontier: queue.slice(h + 1) });
    }
  } else {
    const stack = [root];
    seen.add(root);
    while (stack.length) {
      const u = stack.pop();
      const newly = [];
      for (const v of [...adj[u]].reverse()) {
        if (seen.has(v)) continue;
        seen.add(v);
        stack.push(v);
        newly.push(v);
      }
      trace.push({ u, newly, frontier: stack.slice() });
    }
  }
  return trace;
}

function discoverGroups() {
  const seen = new Set();
  const roots = [start, ...Array.from({ length: N }, (_, i) => i).filter((i) => i !== start)];
  const groups = [];
  for (const root of roots) {
    if (seen.has(root)) continue;
    const trace = traceFrom(root, seen);
    groups.push({ root, trace, members: trace.map((t) => t.u) });
  }
  return groups;
}

function blocks(ctx) {
  const frontierLabel = mode === 'BFS' ? 'BFS 队列' : 'DFS 栈';
  const done = ctx.done;
  const groupChips = [];
  for (let gi = 0; gi < done.length; gi++) {
    groupChips.push({ text: 'C' + (gi + 1) + ' {' + done[gi].join(',') + '}', cls: 'visited' });
  }
  return {
    blocks: [
      { type: 'chips', label: frontierLabel, hint: mode === 'BFS' ? '队首 → 队尾' : '栈底 → 栈顶', items: ctx.frontier.map((id, i) => ({ text: id, cls: i === 0 || i === ctx.frontier.length - 1 ? 'head' : '' })), empty: '空' },
      { type: 'chips', label: '已染色', items: ctx.visited.map((id) => ({ text: id, cls: 'visited' })), empty: '—' },
      { type: 'kv', label: '当前分量', items: [
        { k: '编号', v: ctx.group === null ? '—' : 'C' + (ctx.group + 1) },
        { k: '根', v: ctx.root === null ? '—' : ctx.root },
        { k: '块大小', v: ctx.group === null ? '—' : ctx.size },
        { k: '当前', v: ctx.current === null ? '—' : ctx.current },
      ] },
      { type: 'chips', label: '分量清单', items: groupChips, empty: '—' },
      { type: 'text', label: '动作', value: ctx.note },
    ],
    footer: `已访问 <b>${ctx.visited.length}/${N}</b> · 已完成 <b>${done.length}/3</b> 块 · <b>${mode}</b>`,
  };
}

function* walkSegment(group, gi, from, to, ctx) {
  const color = COMP_COLORS[gi % COMP_COLORS.length];
  for (let k = from; k < to; k++) {
    const step = group.trace[k];
    const u = step.u;
    ctx.group = gi;
    ctx.root = group.root;
    ctx.size = group.members.length;
    ctx.current = u;
    ctx.frontier = step.frontier;
    stage.setActive(u);
    stage.setNodeColor(u, C.current);
    stage.setDist(u, 'C' + (gi + 1));
    for (const v of step.newly) {
      stage.setNodeColor(v, C.frontier);
      stage.setDist(v, 'C' + (gi + 1));
      stage.setEdge(u, v, color, 0.95);
      flow(scene, stage.pos(u).clone().add(new THREE.Vector3(0, 16, 0)), stage.pos(v).clone().add(new THREE.Vector3(0, 16, 0)), color);
      ripple(scene, stage.pos(v).x, stage.pos(v).y, stage.pos(v).z, C.frontier, 48);
    }
    ctx.note = (mode === 'BFS' ? '出队 ' : '弹出 ') + u + '，染色并扩展未访问邻居';
    director.stateUpdate(blocks(ctx));
    status.textContent = 'C' + (gi + 1) + ' · ' + mode + ' 访问 ' + u + (step.newly.length ? ' → 新节点 ' + step.newly.join(',') : '');
    yield W(330);
    stage.setNodeColor(u, color);
    if (!ctx.visited.includes(u)) ctx.visited.push(u);
    stage.setActive(null);
    director.stateUpdate(blocks(ctx));
    yield W(120);
  }
  if (to >= group.trace.length) {
    for (const id of group.members) {
      stage.setNodeColor(id, color);
      stage.setDist(id, 'C' + (gi + 1));
    }
    for (const [a, b] of EDGES) {
      if (group.members.includes(a) && group.members.includes(b)) stage.setEdge(a, b, color, 0.72);
    }
    ctx.done.push([...group.members]);
    ctx.frontier = [];
    ctx.current = null;
    ctx.note = '块 C' + (gi + 1) + ' 闭合：{' + group.members.join(',') + '}';
    director.stateUpdate(blocks(ctx));
    yield W(300);
  }
}

function* runCC() {
  director.reset();
  status.textContent = '';
  buildStage();
  resetVisual();
  const groups = discoverGroups();
  const ctx = {
    group: null, root: null, size: null, current: null,
    frontier: [], visited: [], done: [], note: '准备从未访问节点出发',
  };
  const g0 = groups[0], g1 = groups[1], g2 = groups[2];
  const split0 = Math.ceil(g0.trace.length / 2);
  const split1 = Math.ceil(g1.trace.length / 2);
  const groupLabel = (g) => '{' + g.members.join(',') + '}';

  director.chapter('建立');
  yield S(() => director.beat({
    title: '群岛就位',
    why: '无向图分成互不相连的岛；一次完整的 BFS/DFS 只能覆盖其中一座岛。',
    stateText: '10 节点 · 3 个未知连通块 · ' + mode + ' 模式',
    progress: 1,
    camera: SHOT_ESTABLISH,
    annotations: annos([{ id: 'hook', text: '一次搜索，点亮一座岛', anchor: () => new THREE.Vector3(320, 520, 100), offset: [0, -22], className: 'gold' }]),
  }));
  director.stateUpdate(blocks(ctx));
  yield W(650);

  director.chapter('第一块');
  yield S(() => director.beat({
    title: '选根：' + g0.root,
    why: '从任意未访问节点出发；它的可达集合就是第一个连通分量。',
    stateText: 'C1 根 ' + g0.root + ' · ' + mode,
    progress: 2,
    camera: SHOT_MEDIUM,
    annotations: annos([{ id: 'root', text: '根 ' + g0.root + ' 开始染色', anchor: () => stage.pos(g0.root).clone().add(new THREE.Vector3(0, 50, 0)), offset: [0, -20] }]),
  }));
  yield* walkSegment(g0, 0, 0, split0, ctx);
  yield W(220);

  director.chapter('第一块边界');
  yield S(() => director.beat({
    title: 'C1 的边界',
    why: '搜索结构为空时，本岛所有可达节点都已染色；跳到下一个未访问节点。',
    stateText: 'C1 ' + groupLabel(g0) + ' · ' + g0.members.length + ' 个节点',
    progress: 3,
    camera: SHOT_MEDIUM,
    annotations: annos([{ id: 'c1', text: 'C1 ' + groupLabel(g0), anchor: () => new THREE.Vector3(180, 500, 0), offset: [0, -20], className: 'final' }]),
  }));
  yield* walkSegment(g0, 0, split0, g0.trace.length, ctx);
  yield W(320);

  director.chapter('第二块');
  yield S(() => director.beat({
    title: '下一座岛：根 ' + g1.root,
    why: '扫描所有节点，跳过已访问；首个未访问节点成为新分量的根。',
    stateText: 'C2 根 ' + g1.root + ' · 新颜色',
    progress: 4,
    camera: SHOT_MEDIUM,
    annotations: annos([{ id: 'root2', text: '新根 ' + g1.root + ' → 换一种颜色', anchor: () => stage.pos(g1.root).clone().add(new THREE.Vector3(0, 50, 0)), offset: [0, -20], className: 'gold' }]),
  }));
  yield* walkSegment(g1, 1, 0, split1, ctx);
  yield W(220);

  director.chapter('第二块边界');
  yield S(() => director.beat({
    title: 'C2 闭合',
    why: '已染色集合与未访问集合切开；这个边界就是连通分量的边界。',
    stateText: 'C2 ' + groupLabel(g1) + ' · ' + g1.members.length + ' 个节点',
    progress: 5,
    camera: SHOT_MEDIUM,
    annotations: annos([{ id: 'c2', text: 'C2 ' + groupLabel(g1), anchor: () => new THREE.Vector3(500, 500, 10), offset: [0, -20], className: 'final' }]),
  }));
  yield* walkSegment(g1, 1, split1, g1.trace.length, ctx);
  yield W(320);

  director.chapter('最后一块');
  yield S(() => director.beat({
    title: '收尾：根 ' + g2.root,
    why: '只剩最后一块；完成后再扫描一遍，没有未访问节点就结束。',
    stateText: 'C3 根 ' + g2.root + ' · ' + g2.members.length + ' 个节点',
    progress: 6,
    camera: SHOT_MEDIUM,
    annotations: annos([{ id: 'root3', text: '最后的根 ' + g2.root, anchor: () => stage.pos(g2.root).clone().add(new THREE.Vector3(0, 50, 0)), offset: [0, -20], className: 'gold' }]),
  }));
  yield* walkSegment(g2, 2, 0, g2.trace.length, ctx);
  yield W(420);

  director.chapter('分量结果');
  ctx.frontier = [];
  ctx.current = null;
  ctx.note = '全部节点已归属，共 3 个连通分量';
  const summary = ctx.done.map((m, i) => 'C' + (i + 1) + ' {' + m.join(',') + '}').join('  ·  ');
  status.textContent = '连通分量演示完成：3 个分量 · ' + summary + ' · O(V+E)';
  yield S(() => director.beat({
    title: '3 座岛，3 种颜色',
    why: '每个节点只被访问一次，每条边最多检查两次；连通块数量 = 外层选根次数。',
    stateText: summary,
    progress: 7,
    camera: SHOT_FINAL,
    annotations: annos([
      { id: 'final', text: '3 个连通分量', anchor: () => new THREE.Vector3(320, 500, 100), offset: [0, -22], className: 'final' },
      { id: 'size', text: '块大小 ' + ctx.done.map((m) => m.length).join(' / '), anchor: () => new THREE.Vector3(320, 450, 100), offset: [0, -22], className: 'gold' },
    ]),
  }));
  director.stateUpdate(blocks(ctx));
  yield W(950);

  director.chapter('复盘');
  yield S(() => director.beat({
    title: '换 BFS 也不改结果',
    why: 'BFS 用队列、DFS 用栈，只改变访问顺序；分量划分对无向图是唯一的。',
    stateText: mode + ' · O(V+E) · 分量数 3',
    progress: 8,
    camera: SHOT_FINAL,
    annotations: [],
  }));
  yield W(700);
}

function restart(autoPlay = true) {
  status.textContent = '';
  engine.clear();
  director.reset();
  buildStage();
  resetVisual();
  engine.queue(() => runCC());
  if (autoPlay) engine.toggle();
}

input.addButton('重播', () => restart(true));
input.addButton('清空', () => {
  engine.clear();
  director.reset();
  status.textContent = '';
  buildStage();
  resetVisual();
});
buildStage();
resetVisual();
engine.queue(() => runCC());
scene.start(engine);
