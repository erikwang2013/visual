// AlgorithmLibrary/HopcroftKarp3D.js — Hopcroft-Karp：BFS 分层 + DFS 批量增广，O(E√V) 二分图最大匹配
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('HopcroftKarp3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, ROSE = 0xfb7185, VIOLET = 0xa78bfa, CYAN = 0x67e8f9, WHITE = 0xe2e8f0;
const hint = new VText(scene, { text: '点击「运行 Hopcroft-Karp」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

// 二分图：L 左列 / R 右列；边 L0:{R0,R1} L1:{R0,R2} L2:{R2} L3:{R1,R3}
const LX = -140, RX = 140, LY = [110, 35, -40, -115];
const EDGES = [[0, 0], [0, 1], [1, 0], [1, 2], [2, 2], [3, 1], [3, 3]];

function hopcroftKarp() {
  const adj = { 0: [0, 1], 1: [0, 2], 2: [2], 3: [1, 3] };
  const pairL = [-1, -1, -1, -1];
  const pairR = [-1, -1, -1, -1];
  const steps = [];
  let phase = 0;
  while (true) {
    const dist = [-1, -1, -1, -1];
    const q = [];
    for (let u = 0; u < 4; u++) if (pairL[u] === -1) { dist[u] = 0; q.push(u); }
    let stopLayer = Infinity;
    for (let head = 0; head < q.length; head++) {
      const u = q[head];
      if (dist[u] >= stopLayer) continue;
      for (const v of adj[u]) {
        if (pairR[v] === -1) stopLayer = dist[u] + 1;
        else if (dist[pairR[v]] === -1) { dist[pairR[v]] = dist[u] + 1; q.push(pairR[v]); }
      }
    }
    steps.push({ type: 'phase', phase: phase + 1, dist: [...dist], pairL: [...pairL], pairR: [...pairR] });
    if (stopLayer === Infinity) break;
    const seen = [false, false, false, false];
    const chain = [];
    let found = 0;
    const dfs = (u) => {
      seen[u] = true;
      for (const v of adj[u]) {
        if (pairR[v] === -1) {
          if (dist[u] + 1 === stopLayer) {
            chain.push([u, v]);
            pairR[v] = u; pairL[u] = v;
            return true;
          }
          continue;
        }
        if (!seen[pairR[v]] && dist[pairR[v]] === dist[u] + 1 && dfs(pairR[v])) {
          chain.push([u, v]);
          pairR[v] = u; pairL[u] = v;
          return true;
        }
      }
      return false;
    };
    for (let u = 0; u < 4; u++) {
      if (pairL[u] !== -1 || seen[u]) continue;
      chain.length = 0;
      const ok = dfs(u);
      steps.push({ type: ok ? 'chain' : 'fail', phase: phase + 1, u, chain: [...chain], pairL: [...pairL], pairR: [...pairR] });
      if (ok) found++;
    }
    steps.push({ type: 'phaseEnd', phase: phase + 1, pairL: [...pairL], pairR: [...pairR], found });
    phase++;
    if (found === 0) break;
  }
  return steps;
}
const hkSteps = hopcroftKarp();

const nodesL = [0, 1, 2, 3].map(i =>
  new VNode(scene, { radius: 24, x: LX, y: LY[i], z: 0, label: 'L' + i, color: VIOLET, emissive: VIOLET }));
const nodesR = [0, 1, 2, 3].map(j =>
  new VNode(scene, { radius: 24, x: RX, y: LY[j], z: 0, label: 'R' + j, color: CYAN, emissive: CYAN }));
const matchT = [0, 1, 2, 3].map(i =>
  new VText(scene, { text: '未匹配', x: LX, y: LY[i] - 42, z: 0, color: PALETTE.textDim, scale: 0.48 }));
const freeT = [0, 1, 2, 3].map(j =>
  new VText(scene, { text: '自由', x: RX, y: LY[j] - 42, z: 0, color: PALETTE.textDim, scale: 0.48 }));
const edges = EDGES.map(([u, v]) => {
  const tube = tubeBetween(scene, [LX, LY[u], 0], [RX, LY[v], 0], { color: PALETTE.edge, opacity: 0.5, radius: 2.4 });
  return { u, v, tube };
});
new VText(scene, { text: '二分图匹配：每个 L（任务/工人）配一个 R，一个 R 只能被一人占用 —— 最多配成几对？', x: 0, y: 225, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: 'Hopcroft-Karp = BFS 分层 + DFS 批量增广：每阶段找「最短」增广路并整体换位 → O(E√V)，远快于朴素 O(VE)', x: 0, y: -195, z: 0, color: PALETTE.textDim, scale: 0.62 });
const stageT = new VText(scene, { text: '', x: 0, y: 255, z: 0, color: GOLD, scale: 0.72 });
const outT = new VText(scene, { text: '', x: 0, y: -225, z: 0, color: PALETTE.textGlow, scale: 0.62 });

function edgeIdx(u, v) { return EDGES.findIndex(e => e[0] === u && e[1] === v); }
function paintBase() {
  edges.forEach(e => { e.tube.material.color.setHex(PALETTE.edge); e.tube.material.opacity = 0.5; });
}
function paintMatches(pairL) {
  paintBase();
  for (let u = 0; u < 4; u++) if (pairL[u] !== -1) {
    edges[edgeIdx(u, pairL[u])].tube.material.color.setHex(GOLD);
    edges[edgeIdx(u, pairL[u])].tube.material.opacity = 1;
  }
}
function setMatchTexts(pairL, pairR) {
  [0, 1, 2, 3].forEach(i => {
    matchT[i].setText(pairL[i] === -1 ? '未匹配' : 'L' + i + '→R' + pairL[i], { color: pairL[i] === -1 ? PALETTE.textDim : GOLD });
    freeT[i].setText(pairR[i] === -1 ? '自由' : 'R' + i + '←L' + pairR[i], { color: pairR[i] === -1 ? PALETTE.textDim : GOLD });
  });
}
function resetAll() {
  engine.clear();
  nodesL.forEach(n => { n.setColor(VIOLET, VIOLET); n.setText(n.label); });
  nodesR.forEach(n => { n.setColor(CYAN, CYAN); n.setText(n.label); });
  matchT.forEach(t => t.setText('未匹配', { color: PALETTE.textDim }));
  freeT.forEach(t => t.setText('自由', { color: PALETTE.textDim }));
  paintBase();
  stageT.setText(''); outT.setText('');
}
const LAYERS = {
  1: { L: [0, 0, 0, 0], R: [1, 1, 1, 1] },
  2: { L: [2, 1, 0, 3], R: [2, 3, 1, 4] }
};
function showLayers(ph) {
  const lay = LAYERS[ph];
  [0, 1, 2, 3].forEach(i => matchT[i].setText('层 ' + lay.L[i], { color: VIOLET }));
  [0, 1, 2, 3].forEach(j => freeT[j].setText('层 ' + lay.R[j], { color: CYAN }));
}

function runHK() {
  resetAll();
  hint.setText('朴素匈牙利一次只找一条增广路；HK 用 BFS 把所有 L 分层，DFS 一次换位多条 → 快一个 √V');
  for (const s of hkSteps) {
    if (s.type === 'phase') {
      if (s.phase === 3) {
        C(900, () => {
          stageT.setText('阶段 3：BFS 起点为空（没有未匹配 L）→ 算法终止');
          hint.setText('没有落单的 L，说明已是最大匹配 —— 最大匹配中未匹配 L 个数为 0');
        });
        continue;
      }
      C(800, () => {
        if (s.phase === 1) {
          showLayers(1);
          stageT.setText('阶段 1：BFS 从全部 4 个未匹配 L 出发（层 0）→ 所有 R 出现在层 1 → 最短增广路长度 = 1');
          hint.setText('BFS 只沿「自由边 L→R、匹配边 R→L」交替走；遇到自由 R 就记录当前层并停止扩展');
        } else {
          showLayers(2);
          stageT.setText('阶段 2：从唯一的未匹配 L2 出发 BFS → 交替路径 L2→R2→L1→R0→L0→R1→L3→R3，长度 4');
          hint.setText('分层结果：L2 层0 → R2 层1 → L1 层1 → R0 层2 → L0 层2 → R1 层3 → L3 层3 → R3 层4（自由！）');
        }
      });
    } else if (s.type === 'chain') {
      s.chain.forEach(([u, v], k) => {
        C(620, () => {
          const ei = edgeIdx(u, v);
          if (k === s.chain.length - 1) {
            edges[ei].tube.material.color.setHex(GREEN);
            edges[ei].tube.material.opacity = 1;
            stageT.setText(`终点！R${v} 自由未占用 → 增广路长度 ${s.chain.length}，准备整体换位`);
            hint.setText('换位 = 路径上所有边的匹配状态取反：非匹配边变成匹配，匹配边变成非匹配');
          } else {
            edges[ei].tube.material.color.setHex(ROSE);
            edges[ei].tube.material.opacity = 0.95;
            stageT.setText(`L${u} → R${v} 冲突：R${v} 已被占用 → 沿匹配边走到它的主人 L${s.pairR[v]}`);
          }
          nodesL[u].pulse(); nodesR[v].pulse();
        });
      });
      C(900, () => {
        paintMatches(s.pairL);
        setMatchTexts(s.pairL, s.pairR);
        stageT.setText(`换位完成：L${s.u} 的增广路一次到位，新增匹配 ${s.chain.length} 条边`);
        hint.setText(s.chain.length === 1 ? '自由边直接配对：无冲突，一条边就成' : '整条链取反后，匹配数 +1 —— 这就是 HK 每阶段的「批量」');
      });
    } else if (s.type === 'fail') {
      C(650, () => {
        nodesL[s.u].setColor(ROSE, ROSE); nodesL[s.u].pulse();
        matchT[s.u].setText('换不到', { color: ROSE });
        stageT.setText(`L${s.u}：候选 R 全被同层 L 占用 → 本阶段失败（落单，等下一阶段）`);
        hint.setText('失败说明最短增广路走不通；下一阶段 BFS 从它重新分层，路径就会变长');
      });
    } else {
      C(800, () => {
        stageT.setText(`阶段 ${s.phase} 结束：新增 ${s.found} 条不相交增广路 → 当前匹配 ${s.pairL.filter(x => x !== -1).length} 对`);
      });
    }
  }
  C(1100, () => {
    outT.setText('最大匹配 = 4（完美匹配）：L0–R1 + L1–R0 + L2–R2 + L3–R3 —— 两阶段搞定');
    status.textContent = 'Hopcroft-Karp 最大匹配 = 4（完美匹配）';
    hint.setText('数学保证：每阶段增广最短路，匹配数必 +1；无增广路 ⇔ 匹配最大（Berge 引理）');
  });
  C(1200, () => {
    outT.setText('复杂度 O(E√V)：BFS 每阶段 O(E)，DFS 沿层推进；阶段数 ≤ O(√V) —— 大二分图的标配');
    hint.setText('应用：任务-工人分配、课程选课冲突、GPU 并行任务调度、拼车配对');
  });
}

panel.addButton('运行 Hopcroft-Karp', runHK);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；阶段 2 观察 L2 的冲突链如何「整体换位」一次解决）');

scene.start(engine);
