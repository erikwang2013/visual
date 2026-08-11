// AlgorithmLibrary/Biconnected3D.js — Tarjan：DFS 序 dfn + 回溯 low 找割点/桥，输出双连通分量
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Biconnected3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, DIM = 0x334155, ROSE = 0xfb7185, INDIGO = 0x818cf8, PUR = 0xc4b5fd, WHITE = 0xe2e8f0;
const hint = new VText(scene, { text: '点击「运行双连通」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const POS = { 0: [-160, 60, 0], 1: [-120, -70, 0], 2: [-50, 0, 0], 3: [50, 0, 0], 4: [120, -70, 0], 5: [160, 60, 0] };
const ADJ = { 0: [1, 2], 1: [0, 2], 2: [0, 1, 3], 3: [2, 4, 5], 4: [3, 5], 5: [4, 3] };
const EDGE_LIST = [[0, 1], [1, 2], [2, 0], [2, 3], [3, 4], [4, 5], [5, 3]];

function tarjan() {
  const dfn = {}, low = {}, parent = {};
  let time = 0;
  const steps = [];
  function dfs(u) {
    dfn[u] = low[u] = ++time;
    steps.push({ type: 'enter', u, dfn: { ...dfn }, low: { ...low } });
    let kids = 0;
    for (const v of ADJ[u]) {
      if (!dfn[v]) {
        parent[v] = u; kids++;
        dfs(v);
        low[u] = Math.min(low[u], low[v]);
        steps.push({ type: 'low', u, low: { ...low } });
        if (low[v] > dfn[u]) steps.push({ type: 'bridge', u, v });
        if (low[v] >= dfn[u]) steps.push({ type: 'cut', u, v, kids: kids > 1 || u !== 0 });
      } else if (v !== parent[u]) {
        steps.push({ type: 'backedge', u, v });
        low[u] = Math.min(low[u], dfn[v]);
        steps.push({ type: 'low', u, low: { ...low } });
      }
    }
  }
  dfs(0);
  return steps;
}
const tSteps = tarjan();

const nodes = [0, 1, 2, 3, 4, 5].map(i =>
  new VNode(scene, { radius: 26, x: POS[i][0], y: POS[i][1], z: 0, label: String(i), color: INDIGO, emissive: INDIGO }));
const stateT = [0, 1, 2, 3, 4, 5].map(i =>
  new VText(scene, { text: '未访问', x: POS[i][0], y: POS[i][1] - 44, z: 0, color: PALETTE.textDim, scale: 0.5 }));
const edges = EDGE_LIST.map(([u, v]) => {
  const tube = tubeBetween(scene, POS[u], POS[v], { color: PALETTE.edge, opacity: 0.5, radius: 2.4 });
  return { u, v, tube };
});
new VText(scene, { text: '割点：删除后图不连通；桥：删除后图不连通。两者都是网络的「单点故障」', x: 0, y: 225, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: 'Tarjan 一招两用：DFS 记录 dfn（访问序），回溯时算 low（能回到的最早祖先）；low[子] > dfn[父] → 桥，≥ → 割点', x: 0, y: -195, z: 0, color: PALETTE.textDim, scale: 0.62 });
const stageT = new VText(scene, { text: '', x: 0, y: 255, z: 0, color: GOLD, scale: 0.72 });
const outT = new VText(scene, { text: '', x: 0, y: -225, z: 0, color: PALETTE.textGlow, scale: 0.62 });

function findEdge(u, v) {
  return edges.findIndex(e => (e.u === u && e.v === v) || (e.u === v && e.v === u));
}
function resetAll() {
  engine.clear();
  nodes.forEach((n, i) => { n.setColor(INDIGO, INDIGO); n.setText(String(i)); });
  stateT.forEach(t => t.setText('未访问', { color: PALETTE.textDim }));
  edges.forEach(e => { e.tube.material.color.setHex(PALETTE.edge); e.tube.material.opacity = 0.5; });
  stageT.setText(''); outT.setText('');
}

function runBCC() {
  resetAll();
  hint.setText('先直观理解：删掉节点 2 或 3，图裂成两块 —— 它们是割点；删掉边 2-3 同理 —— 它是桥');
  for (const s of tSteps) {
    C(560, () => {
      if (s.type === 'enter') {
        nodes[s.u].setColor(GOLD, GOLD);
        stateT[s.u].setText('dfn = ' + s.dfn[s.u], { color: GOLD });
        stageT.setText(`DFS 进入节点 ${s.u}：dfn = ${s.dfn[s.u]}（访问顺序编号）`);
        hint.setText('low 初始 = dfn；子树回退时 low 只会变小（找到更早的祖先）');
      } else if (s.type === 'backedge') {
        const ei = findEdge(s.u, s.v);
        edges[ei].tube.material.color.setHex(ROSE);
        edges[ei].tube.material.opacity = 0.9;
        stageT.setText(`回边：${s.u} → ${s.v}（已访问，非父节点）→ low[${s.u}] 尝试取 dfn[${s.v}]`);
        hint.setText('回边是「捷径」：环的存在让 low 值变小，从而不被判为桥');
      } else if (s.type === 'low') {
        stateT[s.u].setText('low = ' + s.low[s.u], { color: PUR });
        stageT.setText(`回溯更新：low[${s.u}] = ${s.low[s.u]}（子树中最小的 dfn 值）`);
      } else if (s.type === 'bridge') {
        const ei = findEdge(s.u, s.v);
        edges[ei].tube.material.color.setHex(ROSE);
        edges[ei].tube.material.opacity = 1;
        stageT.setText(`判定桥：${s.u}-${s.v} —— low[${s.v}] > dfn[${s.u}]，子树无法「抄近道」绕回`);
        hint.setText('桥的两端之间没有任何回路：去掉它，图立刻分裂');
      } else {
        nodes[s.u].setColor(ROSE, ROSE); nodes[s.u].pulse();
        stateT[s.u].setText('割点！', { color: ROSE });
        stageT.setText(`判定割点：${s.u} —— 存在子树 ${s.v} 满足 low[${s.v}] ≥ dfn[${s.u}]，子树没有回路可绕过 ${s.u}`);
        hint.setText('根节点特例：只有 ≥2 棵子树时才是割点（本图中根 0 只有 1 棵子树，不是割点）');
      }
    });
  }
  C(1000, () => {
    outT.setText('双连通分量：{0,1,2} 环 ｜ {2,3} 桥 ｜ {3,4,5} 环 —— 每块内任意两点至少两条路');
    status.textContent = '割点 {2,3} ｜ 桥 {2-3} ｜ 分量 {0,1,2},{2,3},{3,4,5}';
    hint.setText('双连通分量内的故障是「冗余」的（两点之间多路可达），网络设计追求把它做大');
  });
  C(1200, () => {
    outT.setText('应用：通信骨干网的备用链路设计、图的桥检测（“割断哪根网线会断网？”）');
    hint.setText('复杂度 O(V+E)，一次 DFS 同时输出 dfn / low / 割点 / 桥 / 分量');
  });
}

panel.addButton('运行双连通', runBCC);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；两个环由桥 2-3 相连，割点 2 和 3 用红色标出）');

scene.start(engine);
