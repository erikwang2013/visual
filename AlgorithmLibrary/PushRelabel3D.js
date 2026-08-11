// AlgorithmLibrary/PushRelabel3D.js — Push-Relabel（预流推进）：局部 push/relabel，O(V³) 最坏
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('PushRelabel3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, ROSE = 0xfb7185, WHITE = 0xe2e8f0, AMBER = 0xfbbf24;
const hint = new VText(scene, { text: '点击「运行 Push-Relabel」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

// s=0 a=1 b=2 t=3
const POS = { 0: [0, 170, 0], 1: [-150, 0, 0], 2: [150, 0, 0], 3: [0, -170, 0] };
const E = [[0, 1, 2], [0, 2, 1], [1, 2, 1], [1, 3, 1], [2, 3, 2]];
const NAME = ['s', 'a', 'b', 't'];

function pushRelabel() {
  const f = E.map(() => 0);
  const h = [4, 0, 0, 0];
  const e = [0, 0, 0, 0];
  const steps = [];
  for (const [i, ed] of E.entries()) {
    if (ed[0] === 0) { f[i] = ed[2]; e[ed[1]] += ed[2]; steps.push({ type: 'preflow', i, f: [...f], h: [...h], e: [...e] }); }
  }
  const active = [1, 2].filter(v => e[v] > 0);
  while (active.length) {
    const u = active.shift();
    if (u === 0 || u === 3) continue;
    let pushed = false;
    for (const [i, ed] of E.entries()) {
      const fwd = ed[0] === u && f[i] < ed[2] && h[u] === h[ed[1]] + 1;
      if (fwd) {
        const d = Math.min(e[u], ed[2] - f[i]);
        f[i] += d; e[u] -= d; e[ed[1]] += d;
        steps.push({ type: 'push', u, v: ed[1], i, d, f: [...f], h: [...h], e: [...e] });
        pushed = true;
        if (ed[1] !== 3 && e[ed[1]] > 0 && !active.includes(ed[1])) active.push(ed[1]);
        if (e[u] === 0) break;
      }
    }
    if (!pushed) {
      let mh = Infinity;
      for (const [i, ed] of E.entries()) {
        if (ed[0] === u && f[i] < ed[2]) mh = Math.min(mh, h[ed[1]]);
        if (ed[1] === u && f[i] > 0) mh = Math.min(mh, h[ed[0]]);
      }
      h[u] = mh + 1;
      steps.push({ type: 'relabel', u, f: [...f], h: [...h], e: [...e] });
    }
    if (e[u] > 0 && u !== 0 && u !== 3) active.push(u);
  }
  return steps;
}
const prSteps = pushRelabel();

const nodes = [0, 1, 2, 3].map(i =>
  new VNode(scene, { radius: 27, x: POS[i][0], y: POS[i][1], z: 0, label: NAME[i], color: ROSE, emissive: ROSE }));
const stateT = [0, 1, 2, 3].map(i =>
  new VText(scene, { text: 'h=0 e=0', x: POS[i][0], y: POS[i][1] - 46, z: 0, color: WHITE, scale: 0.55 }));
const edgeObjs = E.map((ed, i) => {
  const a = POS[ed[0]], b = POS[ed[1]];
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const tube = tubeBetween(scene, a, b, { color: PALETTE.edge, opacity: 0.45, radius: 2.4 });
  const wt = new VText(scene, { text: '0/' + ed[2], x: mx, y: my, z: 8, color: PALETTE.textDim, scale: 0.55 });
  return { ed, tube, wt };
});
new VText(scene, { text: '与 FF 不同：Push-Relabel 不反复找增广路，而是让每个节点「局部」向邻居推过剩流量', x: 0, y: 225, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: '规则：只能从高度 h 高的节点推到 h−1 的节点（水流只能下山）；推不动就 relabel 抬高自己', x: 0, y: -205, z: 0, color: PALETTE.textDim, scale: 0.62 });
const stageT = new VText(scene, { text: '', x: 0, y: 255, z: 0, color: GOLD, scale: 0.72 });
const outT = new VText(scene, { text: '', x: 0, y: -235, z: 0, color: PALETTE.textGlow, scale: 0.62 });

function setAll(s) {
  [0, 1, 2, 3].forEach(i => {
    stateT[i].setText(NAME[i] + ': h=' + s.h[i] + ' e=' + s.e[i], { color: s.e[i] > 0 ? AMBER : WHITE });
  });
  edgeObjs.forEach(({ ed, tube, wt }, i) => {
    const used = s.f[i];
    wt.setText(used + '/' + ed[2], { color: used === ed[2] ? GREEN : (used > 0 ? GOLD : PALETTE.textDim) });
    tube.material.color.setHex(used === ed[2] ? GREEN : (used > 0 ? GOLD : PALETTE.edge));
  });
}
function resetAll() {
  engine.clear();
  nodes.forEach((n, i) => { n.setColor(ROSE, ROSE); n.setText(NAME[i]); });
  [0, 1, 2, 3].forEach(i => stateT[i].setText(NAME[i] + ': h=0 e=0', { color: WHITE }));
  edgeObjs.forEach(({ ed, tube, wt }) => {
    tube.material.color.setHex(PALETTE.edge); wt.setText('0/' + ed[2], { color: PALETTE.textDim });
  });
  stageT.setText(''); outT.setText('');
}

function runPR() {
  resetAll();
  hint.setText('预流推进：先把 s 的出边全部灌满（预流），再不断「推」掉节点上的过剩流量 e');
  C(700, () => {
    stageT.setText('初始化：h(s) = 4，h(其余) = 0；预流：s 的所有出边灌满（e 表示节点上的过剩流量）');
    hint.setText('预流阶段：f(s,a)=2, f(s,b)=1 —— 此时 a、b 都有过剩流量 e，等待「推」出');
  });
  for (const s of prSteps) {
    C(640, () => {
      if (s.type === 'preflow') {
        edgeObjs[s.i].tube.material.color.setHex(GREEN);
        stageT.setText('预流：s → ' + NAME[edgeObjs[s.i].ed[1]] + ' 灌满 ' + edgeObjs[s.i].ed[2] + ' 单位');
      } else if (s.type === 'push') {
        nodes[s.u].setColor(GOLD, GOLD); nodes[s.v].setColor(AMBER, AMBER);
        edgeObjs[s.i].tube.material.color.setHex(GOLD);
        stageT.setText(`push：${NAME[s.u]} 推 ${s.d} 单位给 ${NAME[s.v]}（h=${s.h[s.u]} > h=${s.h[s.v]}，满足下落条件）`);
        hint.setText('e(' + NAME[s.u] + ') −= ' + s.d + '，e(' + NAME[s.v] + ') += ' + s.d + ' —— 流量守恒只在局部成立');
      } else {
        nodes[s.u].setColor(ROSE, ROSE); nodes[s.u].pulse();
        stageT.setText(`relabel：${NAME[s.u]} 推不出去（邻居都更高或饱和）→ 高度提升到 ${s.h[s.u]}，拿到「下山许可」`);
        hint.setText('高度标号 h 保证流只朝汇的方向走；推不动就抬高，最终全部流进 t');
      }
      setAll(s);
    });
  }
  C(1100, () => {
    edgeObjs.forEach(({ tube }) => tube.material.color.setHex(PALETTE.edge));
    nodes.forEach(n => n.setColor(ROSE, ROSE));
    outT.setText('最大流 = ' + prSteps[prSteps.length - 1].e[3] + '（全部汇入 t）—— 无需路径搜索，纯局部操作');
    status.textContent = 'Push-Relabel 最大流 = ' + prSteps[prSteps.length - 1].e[3];
    hint.setText('优势：并行友好（每个节点独立决定），GPU 大规模流计算与芯片布线用它');
  });
  C(1200, () => {
    outT.setText('复杂度 O(V²E)（HLPP 优化到 O(V²√E)）—— 最坏情形优于 Dinic 的 O(V²E)');
    hint.setText('应用：网络路由容量规划、图像分割（Graph Cut）、航空调度');
  });
}

panel.addButton('运行 Push-Relabel', runPR);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；关注节点上的 e 值如何流动到 t）');

scene.start(engine);
