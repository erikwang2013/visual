// AlgorithmLibrary/Tarjan3D.js — Tarjan SCC：dfn/low 标注、DFS 栈、dfn==low 弹栈成色块。
// 复用 GraphStage / StoryDirector：先录事件，再按 8 拍回放，保证 SCC 形成节奏清晰。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
import { flow, ripple } from '../3D/effects/Fx.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
import { GraphStage } from '../3D/director/GraphStage.js';
applyTheme('Tarjan3D');

const N = 7;
const EDGES = [[0, 1], [1, 2], [2, 0], [2, 3], [3, 4], [4, 3], [3, 5], [5, 6]];
const SCC_COLORS = [0xfb7185, 0xfb923c, 0x22d3ee, 0xc4b5fd, 0x4ade80, 0xfcd34d];
const C = { await: 0x64748b, stack: 0xfbbf24, current: 0x22d3ee, edge: 0x64748b };
const isMobile = typeof matchMedia !== 'undefined' && matchMedia('(max-width: 900px)').matches;
const view = (pos, target, ms) => ({
  pos: isMobile ? target.map((v, i) => Math.round(v + (pos[i] - v) * 0.42)) : pos,
  target, ms,
});
const HOME = view([620, 680, 960], [320, 360, 0], 0).pos;
const scene = new Scene3D('scene', { cameraPos: HOME, lookAt: [320, 360, 0], fov: 50 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const input = new InputKit(panel);
const status = panel.addStatus('就绪');

const annos = (list) => (isMobile ? list.slice(0, 1) : list);
const SHOT_ESTABLISH = view([620, 680, 960], [320, 360, 0], 900);
const SHOT_MEDIUM = view([560, 600, 850], [320, 360, 0], 700);
const SHOT_FINAL = view([320, 760, 920], [320, 360, 0], 900);
const adj = Array.from({ length: N }, () => []);
for (const [u, v] of EDGES) adj[u].push(v);

let start = 0;
let stage = null;
let sccText = null;
const director = new StoryDirector(scene, {
  title: 'Tarjan · 强连通分量',
  total: 8,
  legend: [
    { label: '未访问', color: '#475569' },
    { label: 'DFS 栈中', color: '#fbbf24' },
    { label: '当前', color: '#22d3ee' },
    { label: 'SCC 1', color: '#fb7185' },
    { label: 'SCC 2', color: '#fb923c' },
    { label: 'SCC 3', color: '#22d3ee' },
    { label: 'SCC 4', color: '#c4b5fd' },
  ],
  onReplay: () => restart(true),
});
const startSelect = input.addSelect('DFS 起点', Array.from({ length: N }, (_, i) => i), start, (v) => { start = Number(v); restart(true); });

function dropText(t) {
  if (!t) return;
  if (t.sprite && t.sprite.material) t.sprite.material.dispose();
  t.remove();
}

function buildStage() {
  if (stage) stage.dispose();
  dropText(sccText);
  stage = new GraphStage(scene, {
    nodes: N,
    edges: EDGES,
    directed: true,
    center: [320, 360, 0],
    ringRadius: isMobile ? 195 : 245,
    scale: isMobile ? 0.8 : 0.95,
    nodeRadius: 27,
    labelScale: 0.85,
  });
  sccText = new VText(scene, {
    text: 'SCC：—', x: 320, y: 150, z: 0, color: '#fde047', scale: 0.6,
    wrapChars: 40, maxWidth: 620,
  });
}

function resetVisual() {
  for (let i = 0; i < N; i++) {
    stage.setNodeColor(i, C.await);
    stage.setDist(i, '');
  }
  for (const [u, v] of EDGES) stage.setEdge(u, v, C.edge, 0.28);
  stage.setActive(null);
  stage.setSource(start);
  sccText.setText('SCC：—');
}

function traceTarjan() {
  const dfn = Array(N).fill(0), low = Array(N).fill(0), state = Array(N).fill(0);
  const stack = [], sccs = [], events = [];
  let timer = 0;
  const record = (ev) => events.push({
    ...ev,
    dfn: dfn.slice(), low: low.slice(), stack: stack.slice(), sccs: sccs.map((m) => m.slice()),
  });
  function visit(u, parent) {
    dfn[u] = low[u] = ++timer;
    state[u] = 1;
    stack.push(u);
    record({ type: 'enter', u, parent, msg: '访问 ' + u + '：dfn=low=' + timer + '，压栈' });
    for (const v of adj[u]) {
      if (state[v] === 0) {
        record({ type: 'tree', u, v, msg: '树边 ' + u + '→' + v + '：继续 DFS' });
        visit(v, u);
        low[u] = Math.min(low[u], low[v]);
        record({ type: 'return', u, v, msg: '回退 ' + u + '：low[' + u + ']=min(low[' + u + '], low[' + v + '])= ' + low[u] });
      } else if (state[v] === 1) {
        low[u] = Math.min(low[u], dfn[v]);
        record({ type: 'back', u, v, msg: '回边 ' + u + '→' + v + '：' + v + ' 仍在栈，low[' + u + '] → ' + low[u] });
      } else {
        record({ type: 'cross', u, v, msg: '横叉边 ' + u + '→' + v + '：' + v + ' 已出栈，忽略' });
      }
    }
    if (low[u] === dfn[u]) {
      const members = [];
      let x;
      do {
        x = stack.pop();
        state[x] = 2;
        members.push(x);
      } while (x !== u);
      sccs.push(members);
      record({ type: 'scc', u, scc: sccs.length - 1, members, msg: 'dfn[' + u + ']==low[' + u + ']，弹栈得到 SCC {' + members.join(',') + '}' });
    }
  }
  const roots = [start, ...Array.from({ length: N }, (_, i) => i).filter((i) => i !== start)];
  for (const root of roots) {
    if (state[root]) continue;
    record({ type: 'root', u: root, msg: '新的 DFS 根：' + root });
    visit(root, -1);
  }
  return { events, sccs };
}

function sccIndexOf(snapshot, node) {
  return snapshot.sccs.findIndex((m) => m.includes(node));
}

function applySnapshot(ev) {
  for (let i = 0; i < N; i++) {
    const si = sccIndexOf(ev, i);
    if (si >= 0) stage.setNodeColor(i, SCC_COLORS[si % SCC_COLORS.length]);
    else if (ev.stack.includes(i)) stage.setNodeColor(i, C.stack);
    else stage.setNodeColor(i, C.await);
    stage.setDist(i, ev.dfn[i] ? 'd' + ev.dfn[i] + ' l' + ev.low[i] : '');
  }
  if (ev.type !== 'scc' && ev.u !== undefined) stage.setNodeColor(ev.u, C.current);
  if (ev.type === 'scc') stage.setActive(null);
  else stage.setActive(ev.u);
  const parts = ev.sccs.map((m) => '{' + m.join(',') + '}');
  sccText.setText(parts.length ? 'SCC × ' + parts.length + '：' + parts.join(' · ') : 'SCC：—');
}

function blocks(ev) {
  const visited = [];
  for (let i = 0; i < N; i++) if (ev.dfn[i]) visited.push({ text: i + ': d' + ev.dfn[i] + ' / l' + ev.low[i], cls: ev.u === i ? 'current' : '' });
  const sccs = ev.sccs.map((m, i) => ({ text: 'SCC' + (i + 1) + ' {' + m.join(',') + '}', cls: 'visited' }));
  const stack = ev.stack.map((id, i) => ({ text: id, cls: i === ev.stack.length - 1 ? 'head' : ev.u === id ? 'current' : '' }));
  return {
    blocks: [
      { type: 'chips', label: 'Tarjan 栈', hint: '栈底 → 栈顶', items: stack, empty: '空' },
      { type: 'chips', label: 'dfn / low', items: visited, empty: '—' },
      { type: 'chips', label: '已弹出的 SCC', items: sccs, empty: '—' },
      { type: 'kv', label: '时间戳', items: [
        { k: '当前节点', v: ev.u === undefined ? '—' : ev.u },
        { k: 'timer', v: Math.max(0, ...ev.dfn) },
        { k: 'SCC 数', v: ev.sccs.length },
        { k: '栈深', v: ev.stack.length },
      ] },
      { type: 'text', label: '事件', value: ev.msg },
    ],
    footer: 'dfn=访问时间 · low=可回到的最小 dfn · low==dfn 即 SCC 根',
  };
}

function* playEvents(from, to, events) {
  for (let i = from; i < to; i++) {
    const ev = events[i];
    applySnapshot(ev);
    director.stateUpdate(blocks(ev));
    director.setBeatState(ev.msg);
    status.textContent = 'Tarjan · ' + ev.msg;
    let color = C.edge;
    if (ev.type === 'tree') color = 0x67e8f9;
    else if (ev.type === 'back') color = 0xfb7185;
    else if (ev.type === 'cross') color = 0xc4b5fd;
    else if (ev.type === 'return') color = 0xfde047;
    if (ev.v !== undefined) {
      stage.setEdge(ev.u, ev.v, color, ev.type === 'return' ? 0.5 : 0.95);
      if (ev.type === 'tree' || ev.type === 'back') {
        flow(scene, stage.pos(ev.u).clone().add(new THREE.Vector3(0, 16, 0)), stage.pos(ev.v).clone().add(new THREE.Vector3(0, 16, 0)), color);
      }
    }
    if (ev.type === 'scc') ripple(scene, stage.pos(ev.u).x, stage.pos(ev.u).y, stage.pos(ev.u).z, SCC_COLORS[ev.scc % SCC_COLORS.length], 64);
    yield W(ev.type === 'scc' ? 760 : ev.type === 'return' ? 300 : 360);
    if (ev.v !== undefined) stage.setEdge(ev.u, ev.v, C.edge, 0.28);
  }
}

function sccSummary(sccs) {
  return sccs.map((m, i) => 'SCC' + (i + 1) + ' {' + m.join(',') + '}').join(' · ');
}

function* runTarjan() {
  director.reset();
  status.textContent = '';
  buildStage();
  resetVisual();
  const { events, sccs } = traceTarjan();
  const sccAt = [];
  events.forEach((e, i) => { if (e.type === 'scc') sccAt.push(i); });
  const firstScc = sccAt[0] ?? events.length;
  const firstBack = events.findIndex((e) => e.type === 'back');
  const end2 = Math.max(1, Math.min(firstScc, firstBack >= 0 && firstBack < firstScc ? firstBack + 1 : firstScc));
  const end3 = firstScc + 1;
  const end4 = sccAt[1] !== undefined ? sccAt[1] + 1 : end3;
  const end5 = sccAt[2] !== undefined ? sccAt[2] + 1 : end4;
  const end6 = events.length;

  director.chapter('建立');
  yield S(() => director.beat({
    title: '有向图与低链',
    why: 'dfn 是第一次访问的序号，low 是沿 DFS 树/回边能回到的最小 dfn；两者相等就圈出一个 SCC。',
    stateText: '7 节点 · 8 条有向边 · DFS 起点 ' + start,
    progress: 1,
    camera: SHOT_ESTABLISH,
    annotations: annos([{ id: 'hook', text: '强连通：任意两点互相可达', anchor: () => new THREE.Vector3(320, 490, 0), offset: [0, -22], className: 'gold' }]),
  }));
  director.stateUpdate(blocks({ ...events[0], stack: [], sccs: [], dfn: Array(N).fill(0), low: Array(N).fill(0), u: start, msg: '等待 DFS 开始' }));
  yield W(650);

  director.chapter('DFS 深入');
  yield S(() => director.beat({
    title: '深入：dfn 与 low',
    why: '每进一个节点就压栈并打时间戳；树边继续深入，回边把 low 拉向祖先。',
    stateText: '记录进入节点与回边',
    progress: 2,
    camera: SHOT_MEDIUM,
    annotations: annos([{ id: 'root', text: 'DFS 起点 ' + start, anchor: () => stage.pos(start).clone().add(new THREE.Vector3(0, 48, 0)), offset: [0, -20] }]),
  }));
  yield* playEvents(0, end2, events);
  yield W(300);

  director.chapter('第一个 SCC');
  yield S(() => director.beat({
    title: 'dfn == low：弹栈',
    why: '当根节点的 dfn 与 low 相等，它无法回到更早的祖先；从栈顶弹到它，正好是一整个 SCC。',
    stateText: '寻找第一个 low==dfn 的根',
    progress: 3,
    camera: SHOT_MEDIUM,
    annotations: annos([{ id: 'low', text: 'low 收敛到自身 → 成块', anchor: () => new THREE.Vector3(320, 490, 0), offset: [0, -22], className: 'final' }]),
  }));
  yield* playEvents(end2, end3, events);
  yield W(380);

  director.chapter('继续 DFS');
  yield S(() => director.beat({
    title: '回到父层，再形成 SCC',
    why: '回退时 low[u]=min(low[u], low[v])；若父节点仍满足 dfn==low，就继续弹出一个 SCC。',
    stateText: '栈中剩余节点继续判断',
    progress: 4,
    camera: SHOT_MEDIUM,
    annotations: annos([{ id: 'stack', text: '栈中节点按 DFS 顺序排列', anchor: () => new THREE.Vector3(320, 490, 0), offset: [0, -22] }]),
  }));
  yield* playEvents(end3, end4, events);
  yield W(380);

  director.chapter('SCC 连续成形');
  yield S(() => director.beat({
    title: '强连通块逐个析出',
    why: '已出栈的节点归入某个 SCC；横叉边指向已出栈节点时不会改变 low。',
    stateText: '已形成 ' + (sccAt[1] !== undefined ? 2 : 1) + ' 个 SCC',
    progress: 5,
    camera: SHOT_MEDIUM,
    annotations: annos([{ id: 'scc', text: '不同 SCC 换色', anchor: () => new THREE.Vector3(320, 490, 0), offset: [0, -22], className: 'final' }]),
  }));
  yield* playEvents(end4, end5, events);
  yield W(380);

  director.chapter('根节点收尾');
  yield S(() => director.beat({
    title: '最后的 low-link',
    why: '遍历完所有 DFS 根；每个 SCC 恰好弹出一次，栈最终为空。',
    stateText: 'SCC ' + sccs.length + ' 个 · 栈清空',
    progress: 6,
    camera: SHOT_MEDIUM,
    annotations: annos([{ id: 'last', text: '根节点的 low 决定最后一块', anchor: () => new THREE.Vector3(320, 490, 0), offset: [0, -22] }]),
  }));
  yield* playEvents(end5, end6, events);
  stage.setActive(null);
  yield W(420);

  director.chapter('SCC 划分');
  const summary = sccSummary(sccs);
  status.textContent = 'Tarjan 演示完成：' + sccs.length + ' 个 SCC · ' + summary + ' · O(V+E)';
  yield S(() => director.beat({
    title: sccs.length + ' 个强连通分量',
    why: '同一颜色内任意两点互相可达；颜色之间只在低链上单向连接。',
    stateText: summary,
    progress: 7,
    camera: SHOT_FINAL,
    annotations: annos([
      { id: 'sccs', text: 'SCC：' + summary, anchor: () => new THREE.Vector3(320, 500, 0), offset: [0, -22], className: 'final' },
      { id: 'count', text: sccs.length + ' 组 · 栈已清空', anchor: () => new THREE.Vector3(320, 450, 0), offset: [0, -22], className: 'gold' },
    ]),
  }));
  director.stateUpdate(blocks({ ...events[events.length - 1], u: undefined, msg: '全部 SCC 出栈完成' }));
  yield W(950);

  director.chapter('复盘');
  yield S(() => director.beat({
    title: '一次 DFS 求 SCC',
    why: '每个节点入栈一次、出栈一次，每条边检查一次；low-link 是 Tarjan 的核心不变量。',
    stateText: 'O(V+E) · ' + sccs.length + ' 个 SCC',
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
  engine.queue(() => runTarjan());
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
engine.queue(() => runTarjan());
scene.start(engine);
