// AlgorithmLibrary/RodCutting3D.js — 钢条切割：dp[i]=max(p[j]+dp[i-j]) 自底向上，含最优方案重构
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('RodCutting3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, CYAN = 0x67e8f9, AMBER = 0xfbbf24, WHITE = 0xe2e8f0;
const hint = new VText(scene, { text: '点击「运行钢条切割」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const P = [0, 1, 5, 8, 9, 10, 17, 17, 20];
const N = 8;

function rodCutting() {
  const dp = new Array(N + 1).fill(0);
  const cut = new Array(N + 1).fill(0);
  const steps = [];
  for (let i = 1; i <= N; i++) {
    let best = 0, bj = 0;
    const tries = [];
    for (let j = 1; j <= i; j++) {
      const val = P[j] + dp[i - j];
      tries.push({ j, val });
      if (val > best) { best = val; bj = j; }
    }
    dp[i] = best; cut[i] = bj;
    steps.push({ i, best, bj, tries, dp: [...dp], cut: [...cut] });
  }
  const pieces = [];
  let n = N;
  while (n > 0) { pieces.push(cut[n]); n -= cut[n]; }
  steps.push({ type: 'final', dp: [...dp], cut: [...cut], pieces });
  return steps;
}
const rcSteps = rodCutting();

const X = (i) => -240 + (i - 0.5) * 60;
const rod = [1, 2, 3, 4, 5, 6, 7, 8].map(i =>
  new VBox(scene, { w: 56, h: 46, d: 46, x: X(i), y: 150, z: 0, label: String(i), color: DIM, emissive: DIM }));
const priceT = [1, 2, 3, 4, 5, 6, 7, 8].map(i =>
  new VText(scene, { text: '价' + P[i], x: X(i), y: 192, z: 0, color: PALETTE.textDim, scale: 0.55 }));
const dpT = [1, 2, 3, 4, 5, 6, 7, 8].map(i =>
  new VText(scene, { text: 'dp' + i + ':0', x: X(i), y: 60, z: 0, color: PALETTE.textDim, scale: 0.5 }));
const bin1 = new VBox(scene, { w: 90, h: 56, d: 56, x: -110, y: -120, z: 0, label: '', color: DIM, emissive: DIM });
const bin2 = new VBox(scene, { w: 90, h: 56, d: 56, x: -10, y: -120, z: 0, label: '', color: DIM, emissive: DIM });
const totalT = new VText(scene, { text: '', x: 90, y: -120, z: 0, color: GOLD, scale: 0.8 });
new VText(scene, { text: '问题：一根长 8 的钢条可整卖也可切割零售，切多少刀免费 —— 怎么切收入最高？', x: 0, y: 225, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: 'dp[i] = max(p[j] + dp[i−j])：第一刀切 j，剩下 i−j 交给子问题；小问题先算 → 大问题直接查', x: 0, y: -190, z: 0, color: PALETTE.textDim, scale: 0.62 });
const stageT = new VText(scene, { text: '', x: 0, y: 255, z: 0, color: GOLD, scale: 0.72 });
const outT = new VText(scene, { text: '', x: 0, y: -225, z: 0, color: PALETTE.textGlow, scale: 0.62 });

function resetAll() {
  engine.clear();
  rod.forEach(r => { r.setColor(DIM, DIM); r.setText(r.text); });
  priceT.forEach((t, i) => t.setText('价' + P[i + 1], { color: PALETTE.textDim }));
  dpT.forEach((t, i) => t.setText('dp' + (i + 1) + ':0', { color: PALETTE.textDim }));
  bin1.setText(''); bin2.setText(''); totalT.setText('');
  stageT.setText(''); outT.setText('');
}

function runRod() {
  resetAll();
  hint.setText('核心洞察：切割问题的最优解 = 「第一刀」+「剩余段的最优解」—— 子问题结构相同 → DP');
  for (const s of rcSteps) {
    if (s.type === 'final') {
      C(1000, () => {
        rod.forEach(r => r.setColor(DIM, DIM));
        const [a, b] = s.pieces;
        rod[a - 1].setColor(GOLD, GOLD); rod[b - 1].setColor(GOLD, GOLD);
        bin1.setText('段 ' + a); bin2.setText('段 ' + b);
        bin1.setColor(GOLD, GOLD); bin2.setColor(GOLD, GOLD);
        totalT.setText('总价 = ' + s.dp[N] + ' 元');
        outT.setText('最优方案：切成长度 6 + 2 = 17 + 5 = ' + s.dp[N] + ' —— 整卖才 20，切着卖反而多 2 元！');
        status.textContent = '钢条切割最优收益 = ' + s.dp[N] + '（6+2）';
        hint.setText('dp 表 = ' + s.dp.slice(1).join(',') + '；注意：按单价贪心（2 元/单位）会切 4 段 2，只能卖 20 —— 贪心输了');
      });
      continue;
    }
    C(500, () => {
      stageT.setText(`计算 dp[${s.i}]：尝试第一刀 j = 1..${s.i}，取 p[j] + dp[${s.i}−j] 的最大值`);
      s.tries.forEach(({ j }) => {
        rod[j - 1].setColor(j === s.bj ? AMBER : CYAN, j === s.bj ? AMBER : CYAN);
        rod[j - 1].setText(String(j));
      });
    });
    C(600, () => {
      stageT.setText(`dp[${s.i}] = ${s.best}：最优第一刀 = 切 ${s.bj}（价 ${P[s.bj]} + dp[${s.i - s.bj}] = ${s.best}）`);
      dpT[s.i - 1].setText('dp' + s.i + ':' + s.best, { color: GOLD });
      rod.forEach(r => r.setColor(DIM, DIM));
      rod[s.bj - 1].setColor(GOLD, GOLD);
      hint.setText(`候选 = [${s.tries.map(t => t.j + '→' + t.val).join(', ')}]，最优 ${s.bj}`);
    });
  }
  C(1200, () => {
    outT.setText('复杂度 O(n²)：n 长度 × n 候选切法；还能用「单调性」优化到 O(n log n)');
    hint.setText('应用：原木切割定价、广告位分配、背包的连续版 —— 子问题复用的典型');
  });
}

panel.addButton('运行钢条切割', runRod);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；青色 = 本轮尝试的候选切法，金色 = 选中，右侧箱子装最优方案）');

scene.start(engine);
