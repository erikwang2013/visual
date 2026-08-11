// AlgorithmLibrary/MinCostFlow3D.js — 最小费用最大流：每次选「最便宜」的增广路（Bellman-Ford 找路）
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('MinCostFlow3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, TEAL = 0x2dd4bf, WHITE = 0xe2e8f0, ROSE = 0xfb7185;
const hint = new VText(scene, { text: '点击「运行最小费用流」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

// s=0 a=1 b=2 t=3；边 = [u, v, cap, cost]
const POS = { 0: [0, 170, 0], 1: [-150, 0, 0], 2: [150, 0, 0], 3: [0, -170, 0] };
const E = [[0, 1, 3, 1], [0, 2, 3, 3], [1, 2, 2, 1], [1, 3, 2, 4], [2, 3, 3, 1]];
const NAME = ['s', 'a', 'b', 't'];

function minCostFlow() {
  const f = E.map(() => 0);
  const steps = [];
  let flow = 0, cost = 0;
  for (let it = 0; it < 10; it++) {
    const dist = [0, Infinity, Infinity, Infinity];
    const parent = new Array(4).fill(null);
    for (let r = 0; r < 4; r++) {
      let changed = false;
      E.forEach((e, i) => {
        if (f[i] < e[2] && dist[e[0]] + e[3] < dist[e[1]]) {
          dist[e[1]] = dist[e[0]] + e[3]; parent[e[1]] = { i, rev: false }; changed = true;
        }
        if (f[i] > 0 && dist[e[1]] - e[3] < dist[e[0]]) {
          dist[e[0]] = dist[e[1]] - e[3]; parent[e[0]] = { i, rev: true }; changed = true;
        }
      });
      if (!changed) break;
    }
    if (!parent[3]) break;
    const path = [];
    let v = 3, bn = Infinity;
    while (v !== 0) {
      const p = parent[v];
      bn = Math.min(bn, p.rev ? f[p.i] : E[p.i][2] - f[p.i]);
      path.push({ ...p, v });
      v = p.rev ? E[p.i][1] : E[p.i][0];
    }
    path.reverse();
    for (const p of path) { if (p.rev) f[p.i] -= bn; else f[p.i] += bn; }
    flow += bn;
    const pc = path.reduce((s, p) => s + (p.rev ? -E[p.i][3] : E[p.i][3]), 0) * bn;
    cost += pc;
    steps.push({ it, path, bn, pc, flow, cost, f: [...f], dist });
  }
  return steps;
}
const mcfSteps = minCostFlow();

const nodes = [0, 1, 2, 3].map(i =>
  new VNode(scene, { radius: 27, x: POS[i][0], y: POS[i][1], z: 0, label: NAME[i], color: TEAL, emissive: TEAL }));
const edgeObjs = E.map((e, i) => {
  const a = POS[e[0]], b = POS[e[1]];
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const tube = tubeBetween(scene, a, b, { color: PALETTE.edge, opacity: 0.45, radius: 2.4 });
  const wt = new VText(scene, { text: '0/' + e[2], x: mx, y: my + 12, z: 8, color: PALETTE.textDim, scale: 0.5 });
  const ct = new VText(scene, { text: 'cost ' + e[3], x: mx, y: my - 14, z: 8, color: ROSE, scale: 0.48 });
  return { e, tube, wt, ct };
});
new VText(scene, { text: '带费用网络：每条边 (容量, 费用)。目标：送 4 单位流，总费用最小', x: 0, y: 225, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: '核心思想：每次增广都选「当前单位费用最短」的路 → 贪心保证全局最优（费用线性）', x: 0, y: -205, z: 0, color: PALETTE.textDim, scale: 0.62 });
const stageT = new VText(scene, { text: '', x: 0, y: 255, z: 0, color: GOLD, scale: 0.72 });
const outT = new VText(scene, { text: '', x: 0, y: -235, z: 0, color: PALETTE.textGlow, scale: 0.62 });
const flowT = new VText(scene, { text: '流 = 0 ｜ 费用 = 0', x: 0, y: 195, z: 0, color: WHITE, scale: 0.7 });

function setAll(s) {
  edgeObjs.forEach(({ e, tube, wt }, i) => {
    const used = s.f[i];
    wt.setText(used + '/' + e[2], { color: used === e[2] ? GREEN : (used > 0 ? GOLD : PALETTE.textDim) });
    tube.material.color.setHex(used === e[2] ? GREEN : (used > 0 ? GOLD : PALETTE.edge));
  });
  flowT.setText(`流 = ${s.flow} ｜ 费用 = ${s.cost}`, { color: WHITE });
}
function resetAll() {
  engine.clear();
  nodes.forEach((n, i) => { n.setColor(TEAL, TEAL); n.setText(NAME[i]); });
  edgeObjs.forEach(({ e, tube, wt }) => {
    tube.material.color.setHex(PALETTE.edge); wt.setText('0/' + e[2], { color: PALETTE.textDim });
  });
  flowT.setText('流 = 0 ｜ 费用 = 0', { color: WHITE });
  stageT.setText(''); outT.setText('');
}

function runMCF() {
  resetAll();
  hint.setText('最小费用流 = 最大流 + 费用目标：运输/排班/路由里「花最少的钱送最多的货」');
  for (const s of mcfSteps) {
    C(700, () => {
      stageT.setText(`第 ${s.it + 1} 轮：Bellman-Ford 找单位费用最短路（可能含反向负费用边）`);
      hint.setText('最短路 dist = [' + s.dist.join(', ') + '] —— 到 t 的当前最短单位费用');
    });
    s.path.forEach((p) => {
      C(600, () => {
        if (p.rev) {
          edgeObjs[p.i].tube.material.color.setHex(ROSE);
          stageT.setText('沿反向边走（费用为负，等于退钱）：撤销 ' + E[p.i][3] + ' 单位费用');
        } else {
          edgeObjs[p.i].tube.material.color.setHex(GOLD);
          stageT.setText(`路径经过 ${NAME[E[p.i][0]]}→${NAME[E[p.i][1]]}（费用 ${E[p.i][3]}）`);
        }
        nodes[p.v].pulse();
      });
    });
    C(800, () => {
      setAll(s);
      stageT.setText(`增广 ${s.bn} 单位，本轮费用 ${s.bn}×${s.pc / s.bn} = ${s.pc} —— 总费用 ${s.cost}`);
      hint.setText('本轮选中的是最便宜的路：贪心选路 → 费用全局最优（最小费用流定理）');
    });
  }
  C(1100, () => {
    edgeObjs.forEach(({ tube }) => tube.material.color.setHex(PALETTE.edge));
    outT.setText('4 单位流，最小总费用 = ' + mcfSteps[mcfSteps.length - 1].cost + '（s→a→b→t 两单位 + s→b→t 一单位 + s→a→t 一单位）');
    status.textContent = '最小费用流：4 单位 / 费用 ' + mcfSteps[mcfSteps.length - 1].cost;
    hint.setText('应用：物流调运（每公里运费）、网络流量计费、航空公司机队调度');
  });
  C(1200, () => {
    outT.setText('负费用反向边模拟「退单重发」—— 这就是为什么每轮必须重跑最短路（SPFA/Bellman-Ford）');
    hint.setText('代价：O(最大流 × E·V)；容量大时用费用流 + Dijkstra 势能优化（Johnson 重加权思想）');
  });
}

panel.addButton('运行最小费用流', runMCF);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；每条边标注 流量/容量 与 单位费用）');

scene.start(engine);
