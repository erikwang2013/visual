// AlgorithmLibrary/TSPDP3D.js — 旅行商（状态压缩DP）：dp[mask][i]=min(dp[mask\{i}][k]+d[k][i]) 集合状态表自底向上填，最终回溯金色最优环 0→1→2→3→0=85（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('TSPDP3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：旅行商 TSP（4 城，求最短环）', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 565, z: 0, color: GOLD, scale: 0.72 });
const outT = new VText(scene, { text: '', x: 0, y: 70, z: 0, color: PALETTE.textGlow, scale: 0.62 });
const ansT = new VText(scene, { text: '', x: 0, y: 140, z: 0, color: GOLD, scale: 0.8 });

const D = [[0, 10, 25, 15], [10, 0, 40, 35], [25, 40, 0, 20], [15, 35, 20, 0]];
const N = 4;
function maskStr(m) { const b = []; for (let i = 1; i < N; i++) if (m & (1 << i)) b.push(i); return '{' + b.join(',') + '}'; }

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
const fcands = [];
for (let i = 1; i < N; i++) { const v = dp[full][i] + D[i][0]; fcands.push({ i, val: v }); if (v < ans) { ans = v; ai = i; } }
let m = full, i = ai;
const tour = [];
while (true) {
  tour.push(i);
  if (m === (1 << i)) break;
  const k = prev[m][i];
  m &= ~(1 << i); i = k;
}
const ftour = [0, ...tour.reverse(), 0];

const POS = [[210, 450], [430, 450], [430, 340], [210, 340]];
const cities = [0, 1, 2, 3].map(i => new VNode(scene, { radius: 26, x: POS[i][0], y: POS[i][1], z: 0, label: String(i), color: BLUE, emissive: BLUE }));
const cityT = [0, 1, 2, 3].map(i => new VText(scene, { text: '城' + i, x: POS[i][0], y: POS[i][1] + 42, z: 0, color: WHITE, scale: 0.5 }));
const EDGES = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]];
const edgeT = {};
EDGES.forEach(([a, b]) => {
  edgeT[a + '-' + b] = tubeBetween(scene, { x: POS[a][0], y: POS[a][1], z: 0 }, { x: POS[b][0], y: POS[b][1], z: 0 }, { color: PALETTE.edge, opacity: 0.35, radius: 2 });
});
[[0, 1, 320, 463], [2, 3, 320, 322], [0, 3, 180, 395], [1, 2, 460, 395], [0, 2, 275, 380], [1, 3, 365, 380]]
  .forEach(([a, b, x, y]) => new VText(scene, { text: String(D[a][b]), x, y, z: 0, color: WHITE, scale: 0.5 }));
function setEdge(a, b, color, op) { const t = edgeT[a < b ? a + '-' + b : b + '-' + a]; t.material.color.setHex(color); t.material.opacity = op; }

const cells = [];
const yRow = { 1: 305, 2: 250, 3: 195 };
for (let size = 1; size <= 3; size++) {
  let list;
  if (size === 1) list = [[2, 1], [4, 2], [8, 3]];
  if (size === 2) list = [[6, 1], [6, 2], [10, 1], [10, 3], [12, 2], [12, 3]];
  if (size === 3) list = [[14, 1], [14, 2], [14, 3]];
  list.forEach(([mask, i], idx) => {
    const cx = size === 2 ? 155 + idx * 66 : 200 + (i - 1) * 120;
    cells.push({ mask, i, box: new VBox(scene, { w: 52, h: 32, d: 32, x: cx, y: yRow[size], z: 0, label: '', color: BLUE, emissive: BLUE }) });
  });
}
new VText(scene, { text: '旅行商问题：从城 0 出发回到 0，求最短环', x: 0, y: 548, z: 0, color: WHITE, scale: 0.68 });
new VText(scene, { text: '状态压缩 DP：dp[mask][i] = 走过 mask 集合、停在 i 的最短路；答案 = min(dp[全][i] + d[i][0])', x: 0, y: 95, z: 0, color: WHITE, scale: 0.62 });

function cellOf(mask, i) { return cells.find(c => c.mask === mask && c.i === i); }
function clearView() {
  cities.forEach(c => c.setColor(BLUE, BLUE));
  EDGES.forEach(([a, b]) => setEdge(a, b, PALETTE.edge, 0.35));
  cells.forEach(c => { c.box.setColor(BLUE, BLUE); c.box.setText(''); });
  ansT.setText(''); stageT.setText(''); outT.setText('');
}

function* tspGen() {
  yield S(() => outT.setText('n=4 时环有 (n−1)!/2 = 3 种；n=20 时有 6×10¹⁶ 种 —— 暴力永不可能，DP 用集合代替排列'));
  yield W(650);
  yield S(() => stageT.setText('mask 是二进制集合：第 i 位 = 1 表示城 i 已访问；状态数 = 2ⁿ × n，把「排列顺序」压缩成「集合 + 终点」'));
  yield W(600);
  for (const s of steps) {
    const c = cellOf(s.mask, s.i);
    c.box.setColor(CYAN, CYAN);
    if (s.cands.length === 1) {
      cities[s.i].setColor(RED, RED); setEdge(0, s.i, RED, 0.9);
      yield S(() => stageT.setText('初始：只访问城 ' + s.i + ' → dp[' + maskStr(s.mask) + '][' + s.i + '] = d[0→' + s.i + '] = ' + s.val));
    } else if (s.mask === 6 || s.mask === 10 || s.mask === 12) {
      const k = s.from;
      setEdge(k, s.i, RED, 0.9); cities[s.i].setColor(RED, RED);
      yield S(() => stageT.setText('dp[' + maskStr(s.mask) + '][' + s.i + '] = dp[' + maskStr(s.mask & ~(1 << s.i)) + '][' + k + '] + d[' + k + '→' + s.i + '] = ' + s.val + '（集合只有一种拆法）'));
    } else {
      s.cands.forEach(({ from }) => setEdge(from, s.i, from === s.from ? RED : CYAN, from === s.from ? 0.9 : 0.5));
      yield S(() => stageT.setText('dp[' + maskStr(s.mask) + '][' + s.i + ']：枚举最后一步来源 k，候选 = [' + s.cands.map(cd => '从' + cd.from + '→' + cd.val).join('，') + '] → 取最小 ' + s.val));
    }
    yield W(520);
    c.box.setText(String(s.val));
    c.box.setColor(GOLD, GOLD);
    cities.forEach(cd => cd.setColor(BLUE, BLUE));
    EDGES.forEach(([a, b]) => setEdge(a, b, PALETTE.edge, 0.35));
    yield S(() => stageT.setText('dp[' + maskStr(s.mask) + '][' + s.i + '] = ' + s.val + '（金色锁定）—— 下一层直接复用'));
    yield W(380);
  }
  yield S(() => stageT.setText('回程：答案 = min(dp[全][i] + d[i][0]) = min(' + fcands.map(c => c.val).join('，') + ') = ' + ans + '（最优结束点 i=' + ai + '）'));
  yield W(650);
  yield S(() => { ansT.setText('最短环 = ' + ans + '：' + ftour.join(' → ')); stageT.setText('回溯 prev 表重建环：终点 ' + ftour[ftour.length - 2] + ' ← … ← 0，金色描出最优环'); });
  yield W(800);
  for (let e = 0; e < 4; e++) {
    const [a, b] = [ftour[e], ftour[e + 1]];
    setEdge(a, b, GOLD, 0.95);
    cities[a].setColor(GOLD, GOLD); cities[b].setColor(GOLD, GOLD);
    yield S(() => stageT.setText('最优环第 ' + (e + 1) + ' 段：城 ' + a + ' → 城 ' + b + '（d = ' + D[a][b] + '）'));
    yield W(480);
  }
  yield S(() => outT.setText('最短环 = 85：0 → 1 → 2 → 3 → 0 —— 最近邻贪心（0→1→3→2→0）要 90，每一步最近却全局绕远'));
  yield W(750);
  yield S(() => { status.textContent = 'TSP最短环 = 85（0→1→2→3→0）'; outT.setText('复杂度 O(n²·2ⁿ)：n=20 约 4 亿次，相比 6×10¹⁶ 种排列是天文级提升；实际常配 2-opt 逼近更大规模'); });
  yield W(600);
}

function* runTSP() {
  clearView();
  hint.setText('TSP：dp[mask][i] = min(dp[mask\{i}][k] + d[k][i])，状态压缩');
  yield W(400);
  yield* tspGen();
  yield S(() => { outT.setText(''); hint.setText('TSP完成：最短环 85（0→1→2→3→0），O(n²·2ⁿ)'); });
}

engine.queue(() => runTSP());
panel.addButton('清空', () => { engine.clear(); clearView(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；红 = 转移来源边，青 = 候选，金 = 锁定值/最优环；下方三行 = dp[mask][终点] 状态表）');

scene.start(engine);
