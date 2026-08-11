// AlgorithmLibrary/StoneMerge3D.js — 石子合并（区间 DP）：dp[i][j] = min(dp[i][k]+dp[k+1][j]) + sum(i..j)
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('StoneMerge3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, ROSE = 0xfb7185, CYAN = 0x67e8f9, WHITE = 0xe2e8f0;
const hint = new VText(scene, { text: '点击「运行石子合并」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const ST = [4, 1, 2, 7];
const N = 4;
const PX = [-180, -60, 60, 180];

function stoneMerge() {
  const ps = [0];
  ST.forEach(s => ps.push(ps[ps.length - 1] + s));
  const dp = Array.from({ length: N }, () => new Array(N).fill(0));
  const steps = [];
  for (let len = 2; len <= N; len++) {
    for (let i = 0; i + len <= N; i++) {
      const j = i + len - 1;
      dp[i][j] = Infinity;
      let bk = i;
      for (let k = i; k < j; k++) {
        const v = dp[i][k] + dp[k + 1][j];
        if (v < dp[i][j]) { dp[i][j] = v; bk = k; }
      }
      dp[i][j] += ps[j + 1] - ps[i];
      steps.push({ len, i, j, bk, cost: dp[i][j], sum: ps[j + 1] - ps[i] });
    }
  }
  return steps;
}
const smSteps = stoneMerge();

const nodes = [0, 1, 2, 3].map(i =>
  new VNode(scene, { radius: 26, x: PX[i], y: 130, z: 0, label: String(ST[i]), color: DIM, emissive: DIM }));
const sumT = [0, 1, 2, 3].map(i =>
  new VText(scene, { text: '石子 ' + ST[i], x: PX[i], y: 172, z: 0, color: PALETTE.textDim, scale: 0.5 }));
const dpCells = [];
for (let len = 2; len <= N; len++) for (let i = 0; i + len <= N; i++) {
  const j = i + len - 1;
  const cx = -90 + (i + j) * 60, cy = 40 - (len - 2) * 55;
  const box = new VBox(scene, { w: 64, h: 34, d: 34, x: cx, y: cy, z: 0, label: '', color: DIM, emissive: DIM });
  dpCells.push({ i, j, box });
}
const totalT = new VText(scene, { text: '', x: 0, y: -100, z: 0, color: GOLD, scale: 0.85 });
new VText(scene, { text: '一圈石子排成行，相邻两堆才能合并，代价 = 两堆重量之和 —— 求合并成一堆的最小总代价', x: 0, y: 225, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: '区间 DP：dp[i][j] = min(dp[i][k] + dp[k+1][j]) + sum(i..j) —— 枚举最后一次合并的分界点 k', x: 0, y: -185, z: 0, color: PALETTE.textDim, scale: 0.62 });
const stageT = new VText(scene, { text: '', x: 0, y: 255, z: 0, color: GOLD, scale: 0.72 });
const outT = new VText(scene, { text: '', x: 0, y: -225, z: 0, color: PALETTE.textGlow, scale: 0.62 });

function cellOf(i, j) { return dpCells.find(c => c.i === i && c.j === j); }
function resetAll() {
  engine.clear();
  nodes.forEach((n, i) => { n.setColor(DIM, DIM); n.setText(String(ST[i])); });
  sumT.forEach((t, i) => t.setText('石子 ' + ST[i], { color: PALETTE.textDim }));
  dpCells.forEach(c => { c.box.setColor(DIM, DIM); c.box.setText(''); });
  totalT.setText(''); stageT.setText(''); outT.setText('');
}

function runMerge() {
  resetAll();
  hint.setText('目标 24：先并 1+2（代价 3）→ 再并 4+3（代价 7）→ 最后 7+7（代价 14），共 24');
  C(600, () => {
    stageT.setText('区间 DP 按「长度从小到大」计算：先解决相邻两堆，再解决更长区间');
    hint.setText('dp[i][j] 只依赖更短的区间 dp —— 所以长度递增枚举就保证子问题已就绪');
  });
  for (const s of smSteps) {
    C(600, () => {
      const c = cellOf(s.i, s.j);
      nodes[s.i].setColor(ROSE, ROSE); nodes[s.j].setColor(ROSE, ROSE);
      c.box.setColor(CYAN, CYAN);
      stageT.setText(`长度 ${s.len}：dp[${s.i}][${s.j}] 枚举分界 k=${s.i}..${s.j - 1}，最优 k=${s.bk}`);
      hint.setText(`区间和 = ${s.sum} → dp[${s.i}][${s.j}] = 子问题最小 + ${s.sum} = ${s.cost}`);
    });
    C(650, () => {
      const c = cellOf(s.i, s.j);
      c.box.setText('dp ' + s.cost);
      c.box.setColor(GOLD, GOLD);
      nodes.forEach((n, k) => { n.setColor(k === s.i ? GOLD : DIM, k === s.i ? GOLD : DIM); });
      stageT.setText(`dp[${s.i}][${s.j}] = ${s.cost}（合并区间 [${s.i}..${s.j}] 的最小代价）`);
      if (s.len === N) {
        totalT.setText('总代价 = ' + s.cost + '（区间 [0..3] 合并成一堆）');
        status.textContent = '石子合并最小代价 = ' + s.cost;
      }
    });
  }
  C(1100, () => {
    outT.setText('最优合并次序：先并 1+2=3（代价 3），再并 4+3=7（代价 7），最后 7+7=14 → 共 24');
    hint.setText('对比：若先并 4+1（代价 5），总代价会到 26 —— 合并顺序真的影响总代价！');
  });
  C(1200, () => {
    outT.setText('复杂度 O(n³)：n² 个区间 × 每个 O(n) 个分界点；四边形不等式可优化到 O(n²)');
    hint.setText('应用：矩阵链乘、多边形三角剖分、Huffman 的区间版 —— 区间 DP 三件套');
  });
}

panel.addButton('运行石子合并', runMerge);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；下方格子是 dp[i][j]，长度从 2 到 4 逐层填满）');

scene.start(engine);
