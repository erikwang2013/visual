// AlgorithmLibrary/TopoSortIndegree3D.js — Kahn 入度法：入度标签、FIFO 队列、删边、拓扑序列。
// 复用 GraphStage / StoryDirector：8 拍固定叙事，队列与入度进右侧状态面板。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
import { ripple, flow } from '../3D/effects/Fx.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
import { GraphStage } from '../3D/director/GraphStage.js';
applyTheme('TopoSortIndegree3D');

const N = 6;
const BASE_EDGES = [[0, 1], [0, 2], [1, 3], [2, 3], [2, 5], [3, 4]];
const C = { await: 0x64748b, queue: 0xfbbf24, current: 0x22d3ee, done: 0x4ade80, edge: 0x64748b };
const isMobile = typeof matchMedia !== 'undefined' && matchMedia('(max-width: 900px)').matches;
const view = (pos, target, ms) => ({
  pos: isMobile ? target.map((v, i) => Math.round(v + (pos[i] - v) * 0.45)) : pos,
  target, ms,
});
const HOME = view([560, 620, 980], [320, 380, 0], 0).pos;
const scene = new Scene3D('scene', { cameraPos: HOME, lookAt: [320, 380, 0], fov: 50 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const input = new InputKit(panel);
const status = panel.addStatus('就绪');

const SHOT_ESTABLISH = view([560, 620, 980], [320, 380, 0], 900);
const SHOT_MEDIUM = view([500, 560, 850], [320, 380, 0], 700);
const SHOT_FINAL = view([320, 700, 900], [320, 380, 0], 900);
const annos = (list) => (isMobile ? list.slice(0, 1) : list);

let edges = BASE_EDGES.map((e) => e.slice());
let start = 0;
let stage = null;
let orderText = null;

const director = new StoryDirector(scene, {
  title: 'Kahn 拓扑排序',
  total: 8,
  legend: [
    { label: '入度 > 0', color: '#475569' },
    { label: '入度 0 / 队列', color: '#fbbf24' },
    { label: '当前出队', color: '#22d3ee' },
    { label: '已输出', color: '#4ade80' },
  ],
  onReplay: () => restart(true),
});
const startSelect = input.addSelect('优先', Array.from({ length: N }, (_, i) => i), start, (v) => { start = Number(v); restart(true); });

function indegreeOf(list) {
  const deg = Array(N).fill(0);
  for (const [, v] of list) deg[v]++;
  return deg;
}

function adjOf(list) {
  const adj = Array.from({ length: N }, () => []);
  for (const [u, v] of list) adj[u].push(v);
  return adj;
}

function isDag(list) {
  const deg = indegreeOf(list);
  const adj = adjOf(list);
  const q = [];
  for (let i = 0; i < N; i++) if (deg[i] === 0) q.push(i);
  let seen = 0;
  for (let h = 0; h < q.length; h++) {
    seen++;
    for (const v of adj[q[h]]) if (--deg[v] === 0) q.push(v);
  }
  return seen === N;
}

function dropText(t) {
  if (!t) return;
  if (t.sprite && t.sprite.material) t.sprite.material.dispose();
  t.remove();
}

function buildStage() {
  if (stage) stage.dispose();
  dropText(orderText);
  stage = new GraphStage(scene, {
    nodes: N,
    edges: edges.map(([u, v]) => [u, v]),
    directed: true,
    center: [320, 380, 0],
    ringRadius: isMobile ? 200 : 255,
    scale: isMobile ? 0.8 : 0.95,
    nodeRadius: 27,
    labelScale: 0.85,
  });
  orderText = new VText(scene, { text: '拓扑序：—', x: 320, y: 160, z: 0, color: '#fde047', scale: 0.72 });
}

function resetVisual() {
  const deg = indegreeOf(edges);
  for (let i = 0; i < N; i++) {
    stage.setNodeColor(i, C.await);
    stage.setDist(i, 'in=' + deg[i]);
  }
  for (const [u, v] of edges) {
    stage.setEdgeVisible(u, v, true);
    stage.setEdge(u, v, C.edge, 0.28);
  }
  stage.setActive(null);
  stage.setSource(0);
  orderText.setText('拓扑序：—');
}

function blocks(order, indeg, queue, current, note) {
  return {
    blocks: [
      { type: 'chips', label: '入度 in[]', items: indeg.map((d, i) => ({ text: i + ':' + d, cls: i === current ? 'current' : d === 0 ? 'visited' : '' })), empty: '—' },
      { type: 'chips', label: 'FIFO 队列', hint: '队首 → 队尾', items: queue.map((id, i) => ({ text: id, cls: i === 0 ? 'head' : id === current ? 'current' : '' })), empty: '空' },
      { type: 'chips', label: '拓扑序', items: order.map((id) => ({ text: id, cls: 'visited' })), empty: '—' },
      { type: 'text', label: '当前', value: note },
    ],
    footer: `已输出 <b>${order.length}/${N}</b> · 剩余 <b>${N - order.length}</b> · 队列 <b>${queue.length}</b>`,
  };
}

function addEdgeByText(text) {
  const m = String(text).trim().match(/^(\d+)\s*>\s*(\d+)$/);
  if (!m) { status.textContent = '加边格式：u>v（如 4>5）'; return; }
  const u = Number(m[1]), v = Number(m[2]);
  if (u >= N || v >= N || u === v) { status.textContent = '边无效：需要 0≤u,v<' + N + ' 且 u≠v'; return; }
  if (edges.some(([a, b]) => a === u && b === v)) { status.textContent = '边 ' + u + '→' + v + ' 已存在'; return; }
  edges.push([u, v]);
  if (!isDag(edges)) {
    edges.pop();
    status.textContent = '拒绝 ' + u + '→' + v + '：会形成环，拓扑排序要求 DAG';
    return;
  }
  restart(true);
}

function* runTopo() {
  director.reset();
  status.textContent = '';
  buildStage();
  resetVisual();
  const indeg = indegreeOf(edges);
  const adj = adjOf(edges);
  const queue = [];
  for (let i = 0; i < N; i++) if (indeg[i] === 0) queue.push(i);
  const si = queue.indexOf(start);
  if (si > 0) { queue.splice(si, 1); queue.unshift(start); }
  const order = [];
  const state = (note, current = null) => director.stateUpdate(blocks(order, indeg, queue, current, note));

  director.chapter('建立');
  yield S(() => director.beat({
    title: 'DAG 就位',
    why: 'Kahn 只处理有向无环图：反复取入度为 0 的节点，删掉它的出边，让邻居入度递减。',
    stateText: '6 节点 · ' + edges.length + ' 条有向边 · 入度标在节点下方',
    progress: 1,
    camera: SHOT_ESTABLISH,
    annotations: annos([{ id: 'hook', text: '谁的入度为 0，谁就能先出场', anchor: () => new THREE.Vector3(320, 500, 0), offset: [0, -22], className: 'gold' }]),
  }));
  state('统计全部节点入度');
  yield W(650);

  director.chapter('入度 0 入队');
  for (const id of queue) {
    stage.setNodeColor(id, C.queue);
    stage.setDist(id, 'in=0');
    stage.setActive(id);
    ripple(scene, stage.pos(id).x, stage.pos(id).y, stage.pos(id).z, C.queue, 54);
  }
  stage.setActive(null);
  yield S(() => director.beat({
    title: '入度 0 入队',
    why: '没有前置依赖的节点就是合法起点；它们按队列顺序等待出队。',
    stateText: queue.length ? '队列 [' + queue.join(', ') + ']' : '没有入度 0 节点 → 存在环',
    progress: 2,
    camera: SHOT_MEDIUM,
    annotations: annos([{ id: 'q', text: '队列：' + queue.join(' → '), anchor: () => new THREE.Vector3(320, 500, 0), offset: [0, -22] }]),
  }));
  state('入度归零 → 入队');
  yield W(650);

  const drain = function* (count) {
    let popped = 0;
    while (popped < count && queue.length) {
      const u = queue.shift();
      stage.setActive(u);
      stage.setNodeColor(u, C.current);
      status.textContent = '出队 ' + u + ' → 加入拓扑序，删除它的出边';
      state('出队 ' + u + '，删除出边', u);
      yield W(320);
      for (const v of adj[u]) {
        indeg[v]--;
        stage.setDist(v, 'in=' + indeg[v]);
        stage.setEdge(u, v, C.current, 0.95);
        stage.setEdgeLabelColor(u, v, 0x67e8f9);
        flow(scene, stage.pos(u).clone().add(new THREE.Vector3(0, 18, 0)), stage.pos(v).clone().add(new THREE.Vector3(0, 18, 0)), C.current);
        if (indeg[v] === 0) {
          if (v === start) queue.unshift(v); else queue.push(v);
          stage.setNodeColor(v, C.queue);
          ripple(scene, stage.pos(v).x, stage.pos(v).y, stage.pos(v).z, C.queue, 50);
        }
        state('删边 ' + u + '→' + v + '：in[' + v + '] → ' + indeg[v], u);
        yield W(180);
        stage.setEdgeVisible(u, v, false);
      }
      order.push(u);
      stage.setNodeColor(u, C.done);
      stage.setActive(null);
      orderText.setText('拓扑序：' + order.join(' → '));
      state('输出 ' + u + ' · 当前序列 ' + order.join('→'), u);
      yield W(260);
      popped++;
    }
    return popped;
  };

  director.chapter('首批出队');
  yield S(() => director.beat({
    title: '出队 · 删边',
    why: '取出队首，加入拓扑序；把它的每条出边删掉，目标节点入度减一。',
    stateText: '先处理 2 个队列节点',
    progress: 3,
    camera: SHOT_MEDIUM,
    annotations: annos([{ id: 'cur', text: '出队即固定拓扑位置', anchor: () => new THREE.Vector3(320, 500, 0), offset: [0, -22] }]),
  }));
  state('队列出队中');
  yield* drain(2);
  yield W(320);

  director.chapter('连锁归零');
  yield S(() => director.beat({
    title: '入度归零 → 入队',
    why: '邻居的入度被减到 0，说明它的前置都已完成，可以进入队列。',
    stateText: '多米诺继续倒下',
    progress: 4,
    camera: SHOT_MEDIUM,
    annotations: annos([{ id: 'chain', text: '入度归零的节点补进队尾', anchor: () => new THREE.Vector3(320, 500, 0), offset: [0, -22], className: 'gold' }]),
  }));
  yield* drain(2);
  yield W(320);

  director.chapter('队列推进');
  yield S(() => director.beat({
    title: '继续消去依赖',
    why: '队列非空就继续；同一层节点的先后可以互换，拓扑序不唯一。',
    stateText: '再处理 1 个节点',
    progress: 5,
    camera: SHOT_MEDIUM,
    annotations: annos([{ id: 'q2', text: '队列 ' + (queue.length ? queue.join(', ') : '空'), anchor: () => new THREE.Vector3(320, 500, 0), offset: [0, -22] }]),
  }));
  yield* drain(1);
  yield W(320);

  director.chapter('尾段');
  yield S(() => director.beat({
    title: '清空最后的队列',
    why: '所有出边已删除；最后一个节点出队后，拓扑序长度应等于 V。',
    stateText: '剩余 ' + Math.max(0, N - order.length) + ' 个节点',
    progress: 6,
    camera: SHOT_MEDIUM,
    annotations: annos([{ id: 'tail', text: '剩余节点没有前置依赖', anchor: () => new THREE.Vector3(320, 500, 0), offset: [0, -22] }]),
  }));
  yield* drain(1);
  if (order.length < N) yield* drain(N);
  yield W(420);

  director.chapter('拓扑序');
  stage.setActive(null);
  const complete = order.length === N;
  orderText.setText('拓扑序：' + (complete ? order.join(' → ') : '—（存在环）'));
  const finalText = complete ? order.join(' → ') : '无法排序：存在环';
  status.textContent = complete ? '拓扑排序(Kahn)：' + finalText + ' · O(V+E)' : '拓扑排序失败：剩余节点入度恒 > 0';
  yield S(() => director.beat({
    title: complete ? '拓扑序完成' : '检测到环',
    why: complete ? '顺序保证每条边都从前指向后；共 ' + N + ' 个节点全部输出。' : '队列为空但仍有节点，入度无法归零，图中存在环。',
    stateText: finalText,
    progress: 7,
    camera: SHOT_FINAL,
    annotations: annos([
      { id: 'final', text: 'Kahn：' + finalText, anchor: () => new THREE.Vector3(320, 520, 0), offset: [0, -22], className: 'final' },
      { id: 'size', text: 'V=' + N + ' · E=' + edges.length, anchor: () => new THREE.Vector3(320, 470, 0), offset: [0, -22], className: 'gold' },
    ]),
  }));
  state(complete ? '拓扑序长度 = V → 无环' : '仍有节点未输出 → 有环');
  yield W(900);

  director.chapter('复盘');
  yield S(() => director.beat({
    title: '入度表 + 队列',
    why: '每个节点入队/出队一次、每条边删除一次，所以复杂度 O(V+E)。',
    stateText: 'Kahn O(V+E) · 天然检测环',
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
  engine.queue(() => runTopo());
  if (autoPlay) engine.toggle();
}

input.addInput('加边 u>v', addEdgeByText, 8);
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
engine.queue(() => runTopo());
scene.start(engine);
