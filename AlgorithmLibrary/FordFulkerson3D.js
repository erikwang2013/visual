// AlgorithmLibrary/FordFulkerson3D.js — Ford-Fulkerson：DFS 找增广路 + 残余网络反向边退流
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('FordFulkerson3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, ROSE = 0xfb7185, ORANGE = 0xfb923c, WHITE = 0xe2e8f0;
const hint = new VText(scene, { text: '点击「运行 Ford-Fulkerson」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

// s=0 a=1 b=2 t=3，所有容量 1
const POS = { 0: [0, 170, 0], 1: [-150, 0, 0], 2: [150, 0, 0], 3: [0, -170, 0] };
const E = [[0, 1, 1], [0, 2, 1], [1, 2, 1], [1, 3, 1], [2, 3, 1]];
const NAME = ['s', 'a', 'b', 't'];

function fordFulkerson() {
  const f = E.map(() => 0);
  const steps = [];
  let flow = 0;
  for (let it = 0; it < 10; it++) {
    const res = E.map((e, i) => e[2] - f[i]);
    const visited = new Array(4).fill(false);
    const parent = {};
    const stack = [0]; visited[0] = true;
    while (stack.length) {
      const u = stack.pop();
      if (u === 3) break;
      E.forEach((e, i) => {
        if (e[0] === u && res[i] > 0 && !visited[e[1]]) {
          visited[e[1]] = true; parent[e[1]] = { i, rev: false };
          stack.push(e[1]);
        }
        if (e[1] === u && f[i] > 0 && !visited[e[0]]) {
          visited[e[0]] = true; parent[e[0]] = { i, rev: true };
          stack.push(e[0]);
        }
      });
    }
    if (!visited[3]) { steps.push({ it, end: true, f: [...f], flow }); break; }
    const path = [];
    let v = 3;
    let bn = Infinity;
    while (v !== 0) {
      const p = parent[v];
      bn = Math.min(bn, p.rev ? f[p.i] : E[p.i][2] - f[p.i]);
      path.push({ ...p, v });
      v = p.rev ? E[p.i][1] : E[p.i][0];
    }
    path.reverse();
    for (const p of path) { if (p.rev) f[p.i] -= bn; else f[p.i] += bn; }
    flow += bn;
    steps.push({ it, path, bn, f: [...f], flow });
  }
  return steps;
}
const ffSteps = fordFulkerson();

const nodes = [0, 1, 2, 3].map(i =>
  new VNode(scene, { radius: 27, x: POS[i][0], y: POS[i][1], z: 0, label: NAME[i], color: ORANGE, emissive: ORANGE }));
const edgeObjs = E.map((e, i) => {
  const a = POS[e[0]], b = POS[e[1]];
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const tube = tubeBetween(scene, a, b, { color: PALETTE.edge, opacity: 0.45, radius: 2.4 });
  const wt = new VText(scene, { text: '0/1', x: mx, y: my, z: 8, color: PALETTE.textDim, scale: 0.55 });
  return { e, tube, wt };
});
const revTube = tubeBetween(scene, POS[2], POS[1], { color: ROSE, opacity: 0, radius: 2.0 });
const revT = new VText(scene, { text: '反向边（退流）', x: 0, y: -18, z: 8, color: ROSE, scale: 0.5 });
new VText(scene, { text: '问题：从 s 到 t 最多能送多少流量？所有边容量 1（标签 f/容量）', x: 0, y: 225, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: 'Ford-Fulkerson：反复用 DFS 在残余网络找「增广路」，直到无路可走 —— 贪心可能走错，靠反向边纠正', x: 0, y: -205, z: 0, color: PALETTE.textDim, scale: 0.62 });
const stageT = new VText(scene, { text: '', x: 0, y: 255, z: 0, color: GOLD, scale: 0.72 });
const outT = new VText(scene, { text: '', x: 0, y: -235, z: 0, color: PALETTE.textGlow, scale: 0.62 });
const flowT = new VText(scene, { text: '当前总流量 = 0', x: 0, y: 195, z: 0, color: WHITE, scale: 0.7 });

function setEdges(f) {
  edgeObjs.forEach(({ e, tube, wt }, i) => {
    const used = f[i];
    wt.setText(used + '/' + e[2], { color: used === e[2] ? GREEN : (used > 0 ? GOLD : PALETTE.textDim) });
    tube.material.color.setHex(used === e[2] ? GREEN : (used > 0 ? GOLD : PALETTE.edge));
  });
}
function resetAll() {
  engine.clear();
  nodes.forEach((n, i) => { n.setColor(ORANGE, ORANGE); n.setText(NAME[i]); });
  setEdges(E.map(() => 0));
  revTube.material.opacity = 0;
  flowT.setText('当前总流量 = 0', { color: WHITE });
  stageT.setText(''); outT.setText('');
}

function runFF() {
  resetAll();
  hint.setText('经典思想：只要从 s 到 t 还有「残余容量 > 0」的路径，就沿它送流 —— 这就是增广路');
  for (const s of ffSteps) {
    if (s.end) {
      C(1000, () => {
        stageT.setText('DFS 从 s 出发找不到任何到 t 的路 → 终止');
        outT.setText('最大流 = ' + s.flow + '（s 的出边全部饱和，割 {s} | {a,b,t} 容量 = 2）');
        status.textContent = '最大流 = ' + s.flow;
        hint.setText('最大流 = 最小割：割 {s} 与其余节点的所有跨边容量之和恰为 2');
      });
      break;
    }
    C(700, () => {
      nodes.forEach(n => n.setColor(ORANGE, ORANGE));
      stageT.setText(`第 ${s.it + 1} 次增广：DFS 沿 s → a → b → t 探索（所有边容量 1）`);
      flowT.setText('当前总流量 = ' + s.flow, { color: GOLD });
      hint.setText('DFS 按邻接顺序探索：s 先尝试 a，a 再尝试 b，b 最后到 t —— 找到第一条路');
    });
    s.path.forEach((p, k) => {
      C(560, () => {
        if (p.rev) {
          revTube.material.opacity = 0.85;
          revT.setText('反向边：退流 b←a（撤销 a→b 的 1 单位）', { color: ROSE });
          stageT.setText('增广路使用反向边 b→a：撤销 a→b 的 1 单位流（让给新流量）');
        } else {
          edgeObjs[p.i].tube.material.color.setHex(GOLD);
          stageT.setText(`沿边 ${NAME[E[p.i][0]]}→${NAME[E[p.i][1]]} 前进（残余容量 ${s.bn}）`);
        }
        nodes[p.u].pulse();
      });
    });
    C(700, () => {
      setEdges(s.f);
      flowT.setText('增广完成！总流量 = ' + s.flow, { color: GREEN });
      stageT.setText(`第 ${s.it + 1} 次增广完成：路径瓶颈 = ${s.bn}，已更新边上的 f/容量`);
      hint.setText('沿增广路各边加上 1 单位流；之后出现「反向边」供退流 —— 这是 FF 能纠错的关键');
    });
  }
  C(1200, () => {
    outT.setText('复杂度：O(最大流 × E) —— 每次增广至少 +1 流量；实际中用 BFS（Edmonds-Karp）更稳');
    hint.setText('Dinic 用分层图一次找多条增广路 → O(V²E)，是竞赛标配；工业界用 Push-Relabel');
  });
}

panel.addButton('运行 Ford-Fulkerson', runFF);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；贪心先走 s→a→b→t，再用反向边退流纠正）');

scene.start(engine);
