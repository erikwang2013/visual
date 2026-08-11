// AlgorithmLibrary/TSPDP3D.js — 旅行商（状态压缩DP）：dp[mask][i]=min(dp[mask\{i}][k]+d[k][i])，回溯最优环
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('TSPDP3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, ROSE = 0xfb7185, CYAN = 0x67e8f9, WHITE = 0xe2e8f0;
const hint = new VText(scene, { text: '点击「运行TSP」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const D = [[0, 10, 25, 15], [10, 0, 40, 35], [25, 40, 0, 20], [15, 35, 20, 0]];
const N = 4;

function maskStr(m) { const b = []; for (let i = 1; i < N; i++) if (m & (1 << i)) b.push(i); return '{' + b.join(',') + '}'; }

function tsp() {
  const dp = {}, prev = {};
  const steps = [];
  for (let i = 1; i < N; i++) { dp[1 << i] = {}; dp[1 << i][i] = D[0][i]; steps.push({ mask: 1 << i, i, val: D[0][i], cands: [{ from: 0, val: D[0][i] }] }); }
  for (let size = 2; size < N; size++) {
    const masks = [];
    for (let sub = 0; sub < 8; sub++) { const m = sub << 1; let c = 0; for (let b = 1; b < N; b++) if (m & (1 << b)) c++; if (c === size) masks.push(m); }
    for (const m of masks) {
      dp[m] = {}; prev[m] = prev[m] || {};
      for (let i = 1; i < N; i++) if (m & (1 << i)) {
        let best = Infinity, bf = -1;
        const cands = [];
        for (let k = 1; k < N; k++) if (k !== i && (m & (1 << k))) {
          const v = dp[m & ~(1 << i)][k] + D[k][i];
          cands.push({ from: k, val: v });
          if (v < best) { best = v; bf = k; }
        }
        dp[m][i] = best; prev[m][i] = bf;
        steps.push({ mask: m, i, val: best, cands, from: bf });
      }
    }
  }
  const full = (1 << N) - 2;
  let ans = Infinity, ai = -1;
  const cands = [];
  for (let i = 1; i < N; i++) { const v = dp[full][i] + D[i][0]; cands.push({ i, val: v }); if (v <= ans) { ans = v; ai = i; } }
  let m = full, i = ai;
  const tour = [];
  while (true) {
    tour.push(i);
    if (m === (1 << i)) break;
    const k = prev[m][i];
    m &= ~(1 << i); i = k;
  }
  steps.push({ type: 'final', ans, cands, tour: [0, ...tour.reverse(), 0] });
  return steps;
}
const tspSteps = tsp();

const POS = [[-110, 150], [110, 150], [110, 40], [-110, 40]];
const cities = [0, 1, 2, 3].map(i =>
  new VNode(scene, { radius: 26, x: POS[i][0], y: POS[i][1], z: 0, label: String(i), color: DIM, emissive: DIM }));
const cityT = [0, 1, 2, 3].map(i =>
  new VText(scene, { text: '城' + i, x: POS[i][0], y: POS[i][1] + 42, z: 0, color: PALETTE.textDim, scale: 0.5 }));
const EDGES = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]];
const edgeT = {};
EDGES.forEach(([a, b]) => {
  edgeT[a + '-' + b] = tubeBetween(scene,
    { x: POS[a][0], y: POS[a][1], z: 0 }, { x: POS[b][0], y: POS[b][1], z: 0 },
    { color: PALETTE.edge, opacity: 0.35, radius: 2 });
});
const dT = [[0, 1, 0, 163], [2, 3, 0, 22], [0, 3, -140, 95], [1, 2, 140, 95], [0, 2, -45, 80], [1, 3, 45, 80]]
  .map(([a, b, x, y]) =>
    new VText(scene, { text: String(D[a][b]), x, y, z: 0, color: PALETTE.textDim, scale: 0.5 }));
function setEdge(a, b, color, op) { const t = edgeT[a + '-' + b]; t.material.color.setHex(color); t.material.opacity = op; }

const cells = [];
const yRow = { 1: 5, 2: -50, 3: -105 };
const defs = [];
for (let size = 1; size <= 3; size++) {
  let list;
  if (size === 1) list = [[2, 1], [4, 2], [8, 3]];
  if (size === 2) list = [[6, 1], [6, 2], [10, 1], [10, 3], [12, 2], [12, 3]];
  if (size === 3) list = [[14, 1], [14, 2], [14, 3]];
  list.forEach(([mask, i], idx) => {
    const cx = size === 2 ? -165 + idx * 66 : -120 + (i - 1) * 120;
    defs.push({ mask, i, box: new VBox(scene, { w: 52, h: 32, d: 32, x: cx, y: yRow[size], z: 0, label: '', color: DIM, emissive: DIM }) });
  });
}
defs.forEach(d => cells.push(d));
const ansT = new VText(scene, { text: '', x: 0, y: -160, z: 0, color: GOLD, scale: 0.8 });
new VText(scene, { text: '旅行商问题：从城 0 出发、访问其余 3 城恰好一次再回到 0 —— 求最短环（n=4 有 6 条环）', x: 0, y: 248, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: '状态压缩 DP：dp[mask][i] = 走过 mask 集合、停在 i 的最短路；答案 = min(dp[全][i] + d[i][0])', x: 0, y: -205, z: 0, color: PALETTE.textDim, scale: 0.62 });
const stageT = new VText(scene, { text: '', x: 0, y: 265, z: 0, color: GOLD, scale: 0.72 });
const outT = new VText(scene, { text: '', x: 0, y: -245, z: 0, color: PALETTE.textGlow, scale: 0.62 });

function cellOf(mask, i) { return cells.find(c => c.mask === mask && c.i === i); }
function resetAll() {
  engine.clear();
  cities.forEach(c => c.setColor(DIM, DIM));
  EDGES.forEach(([a, b]) => setEdge(a, b, PALETTE.edge, 0.35));
  cells.forEach(c => { c.box.setColor(DIM, DIM); c.box.setText(''); });
  ansT.setText(''); stageT.setText(''); outT.setText('');
}

function runTSP() {
  resetAll();
  hint.setText('n=4 时环有 (n−1)!/2 = 3 种；n=20 时有 6×10¹⁶ 种 —— 暴力永不可能，DP 用集合代替排列');
  C(700, () => {
    stageT.setText('mask 是二进制集合：第 i 位 = 1 表示城 i 已访问；dp[mask][i] 只看「去了哪些城 + 停在谁」');
    hint.setText('状态数 = 2ⁿ × n：把「排列顺序」压缩成「集合 + 终点」，这就是状态压缩');
  });
  for (const s of tspSteps) {
    if (s.type === 'final') break;
    const c = cellOf(s.mask, s.i);
    C(600, () => {
      c.box.setColor(CYAN, CYAN);
      if (s.cands.length === 1) {
        cities[s.i].setColor(ROSE, ROSE); setEdge(0, s.i, ROSE, 0.9);
        stageT.setText(`初始：只访问城 ${s.i} → dp[${maskStr(s.mask)}][${s.i}] = d[0→${s.i}] = ${s.val}`);
        hint.setText(`起点 0 直达城 ${s.i}，代价 ${s.val} —— 长度 1 的「部分路径」`);
      } else if (s.mask === 6 || s.mask === 10 || s.mask === 12) {
        const k = s.from;
        setEdge(k, s.i, ROSE, 0.9); cities[s.i].setColor(ROSE, ROSE);
        stageT.setText(`dp[${maskStr(s.mask)}][${s.i}] = dp[${maskStr(s.mask & ~(1 << s.i))}][${k}] + d[${k}→${s.i}] = ${s.val}`);
        hint.setText(`集合 ${maskStr(s.mask)} 只有一种拆法：最后一步只能从另一座城 ${k} 来`);
      } else {
        s.cands.forEach(({ from }) => setEdge(from, s.i, from === s.from ? ROSE : CYAN, from === s.from ? 0.9 : 0.5));
        stageT.setText(`dp[${maskStr(s.mask)}][${s.i}]：枚举最后一步的来源 k`);
        hint.setText('候选 = [' + s.cands.map(cd => '从' + cd.from + '来→' + cd.val).join('，') + '] → 取最小 ' + s.val);
      }
    });
    C(600, () => {
      c.box.setText(String(s.val));
      c.box.setColor(GOLD, GOLD);
      cities.forEach(cd => cd.setColor(DIM, DIM));
      EDGES.forEach(([a, b]) => setEdge(a, b, PALETTE.edge, 0.35));
      stageT.setText(`dp[${maskStr(s.mask)}][${s.i}] = ${s.val}（金色已锁定）—— 下一层直接复用`);
    });
  }
  const fin = tspSteps[tspSteps.length - 1];
  C(900, () => {
    stageT.setText('回程：答案 = min(dp[全][i] + d[i][0]) = min(' + fin.cands.map(c => c.val).join('，') + ') = ' + fin.ans);
    hint.setText('dp[全][i] 是「逛完所有城停在 i」，再走最后一段 d[i][0] 回到起点 —— 最优结束点 i=' + fin.cands[fin.cands.length - 1].i);
  });
  C(1000, () => {
    ansT.setText('最短环 = ' + fin.ans + '：' + fin.tour.join(' → '));
    stageT.setText('回溯 prev 表重建环：终点 ' + fin.tour[fin.tour.length - 2] + ' ← … ← 0，金色描出最优环');
    hint.setText('dp 表里只存了「值」，prev 表存「从哪来」—— 没有 prev 就只能算出答案、画不出路径');
  });
  for (let e = 0; e < 4; e++) {
    const [a, b] = [fin.tour[e], fin.tour[e + 1]];
    C(750, () => {
      setEdge(a, b, GOLD, 0.95);
      cities[a].setColor(GOLD, GOLD); cities[b].setColor(GOLD, GOLD);
      stageT.setText(`最优环第 ${e + 1} 段：城 ${a} → 城 ${b}（d = ${D[a][b]}）`);
    });
  }
  C(1000, () => {
    outT.setText('最短环 = 85：0 → 1 → 2 → 3 → 0 —— 最近邻贪心（0→1→3→2→0）要 90，每一步最近却全局绕远');
    status.textContent = 'TSP最短环 = 85（0→1→2→3→0）';
    hint.setText('贪心 90 = 10+35+20+25：第 2 步选 3（35 < 40）看似精明，却把长边 d[2→0]=25 留给结尾');
  });
  C(1300, () => {
    outT.setText('复杂度 O(n²·2ⁿ)：n=20 时约 4 亿次 —— 相比 6×10¹⁶ 种排列是天文数字级的提升');
    hint.setText('应用：物流配送、PCB 打孔、DNA 测序组装；实际常配 2-opt 局部搜索逼近更大规模');
  });
}

panel.addButton('运行TSP', runTSP);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；上方是 4 城与距离，下方三行格子 = dp[mask][终点] 状态表）');

scene.start(engine);
