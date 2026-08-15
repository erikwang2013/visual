// AlgorithmLibrary/TSPDP3D.js — 旅行商（状态压缩DP）：dp[mask][i]=min(dp[mask\{i}][k]+d[k][i]) 集合状态表自底向上填，最终回溯金色最优环 0→1→2→3→0=85（function* 生成器驱动）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('TSPDP3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, CYAN = 0x22d3ee, WHITE = 0xffffff;
const status = panel.addStatus('就绪');

const D = [[0, 10, 25, 15], [10, 0, 40, 35], [25, 40, 0, 20], [15, 35, 20, 0]];
const N = 4;
function maskStr(m) { const b = []; for (let i = 1; i < N; i++) if (m & (1 << i)) b.push(i); return '{' + b.join(',') + '}'; }

// ---- 预计算步骤表（模块级常量）：dp/prev/steps/最优环 ----
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

// ---- 常驻城市 + 边（运行期仅改颜色/显隐，绝不 new）----
const POS = [[210, 700], [430, 700], [430, 580], [210, 580]];
const cities = [0, 1, 2, 3].map(i => new VNode(scene, { radius: 26, x: POS[i][0], y: POS[i][1], z: 0, label: String(i), color: BLUE, emissive: BLUE }));
const cityT = [0, 1, 2, 3].map(i => new VText(scene, { text: '城' + i, x: POS[i][0], y: POS[i][1] + 42, z: 0, color: WHITE, scale: 0.5 }));
const EDGES = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]];
const edgeMesh = {}, distT = {};
EDGES.forEach(([a, b]) => {
  const key = a + '-' + b;
  edgeMesh[key] = tubeBetween(scene, { x: POS[a][0], y: POS[a][1], z: 0 }, { x: POS[b][0], y: POS[b][1], z: 0 }, { color: PALETTE.edge, opacity: 0.35, radius: 2 });
});
[[0, 1, 320, 713], [2, 3, 320, 562], [0, 3, 180, 645], [1, 2, 460, 645], [0, 2, 275, 630], [1, 3, 365, 630]]
  .forEach(([a, b, x, y]) => { distT[a + '-' + b] = new VText(scene, { text: String(D[a][b]), x, y, z: 0, color: WHITE, scale: 0.5 }); });
function setEdge(a, b, color, op) { const t = edgeMesh[a < b ? a + '-' + b : b + '-' + a]; t.material.color.setHex(color); t.material.opacity = op; }
function setAllEdges(color, op) { EDGES.forEach(([a, b]) => setEdge(a, b, color, op)); }

// ---- dp 状态表：三行（集合大小 1/2/3）+ 子集徽章 ----
const cells = [];
const yRow = { 1: 455, 2: 400, 3: 345 };
for (let size = 1; size <= 3; size++) {
  let list;
  if (size === 1) list = [[2, 1], [4, 2], [8, 3]];
  if (size === 2) list = [[6, 1], [6, 2], [10, 1], [10, 3], [12, 2], [12, 3]];
  if (size === 3) list = [[14, 1], [14, 2], [14, 3]];
  list.forEach(([mask, i], idx) => {
    const cx = size === 2 ? 155 + idx * 66 : 200 + (i - 1) * 120;
    const box = new VBox(scene, { w: 52, h: 32, d: 32, x: cx, y: yRow[size], z: 0, label: '', color: BLUE, emissive: BLUE });
    box.mesh.visible = false;
    const badge = new VText(scene, { text: maskStr(mask), x: cx, y: yRow[size] + 32, z: 0, color: PALETTE.textDim, scale: 0.4 });
    badge.sprite.visible = false;
    cells.push({ mask, i, box, badge });
  });
}
[['|S|=1', yRow[1]], ['|S|=2', yRow[2]], ['|S|=3', yRow[3]]]
  .forEach(([t, y]) => new VText(scene, { text: t, x: 100, y, z: 0, color: PALETTE.textDim, scale: 0.42 }));

function cellOf(mask, i) { return cells.find(c => c.mask === mask && c.i === i); }
function resetScene() {
  cities.forEach(c => { c.setColor(BLUE, BLUE); c.mesh.visible = true; });
  cityT.forEach(t => { t.sprite.visible = true; });
  Object.values(edgeMesh).forEach(m => { m.visible = true; });
  Object.values(distT).forEach(t => { t.sprite.visible = true; });
  setAllEdges(PALETTE.edge, 0.35);
  cells.forEach(c => { c.box.setText(''); c.box.setColor(BLUE, BLUE); c.box.mesh.visible = false; c.badge.sprite.visible = false; });
}
function hideScene() {
  cities.forEach(c => { c.mesh.visible = false; });
  cityT.forEach(t => { t.sprite.visible = false; });
  Object.values(edgeMesh).forEach(m => { m.visible = false; });
  Object.values(distT).forEach(t => { t.sprite.visible = false; });
  cells.forEach(c => { c.box.setText(''); c.box.mesh.visible = false; c.badge.sprite.visible = false; });
}

function* runTSP() {
  resetScene();
  yield S(() => { status.textContent = '旅行商（TSP）：从城 0 出发访问全部 4 城后回到 0，求最短环。暴力枚举 (n-1)!/2 = 3 种环；n=20 时达 6×10¹⁶ 种 —— 状态压缩 DP 用集合代替排列'; });
  yield W(1000);
  yield S(() => { status.textContent = '状态表示：mask 第 i 位 = 1 表示城 i 已访问；dp[mask][i] = 走过 mask 集合、停在 i 的最短路；转移 dp[mask][i] = min(dp[mask\\{i}][k] + d[k][i])，按集合大小自底向上填表'; });
  yield W(800);
  for (const s of steps) {
    const c = cellOf(s.mask, s.i);
    c.box.mesh.visible = true; c.badge.sprite.visible = true;
    c.box.setColor(CYAN, CYAN);
    if (s.cands.length === 1) {
      cities[s.i].setColor(RED, RED); setEdge(0, s.i, RED, 0.9);
      yield S(() => { status.textContent = '初始：只访问城 ' + s.i + ' → dp[' + maskStr(s.mask) + '][' + s.i + '] = d[0→' + s.i + '] = ' + s.val; });
    } else if (s.mask === 6 || s.mask === 10 || s.mask === 12) {
      const k = s.from;
      setEdge(k, s.i, RED, 0.9); cities[s.i].setColor(RED, RED);
      yield S(() => { status.textContent = 'dp[' + maskStr(s.mask) + '][' + s.i + ']：集合只有一种拆法，dp[' + maskStr(s.mask & ~(1 << s.i)) + '][' + k + '] + d[' + k + '→' + s.i + '] = ' + s.val; });
    } else {
      s.cands.forEach(({ from }) => setEdge(from, s.i, from === s.from ? RED : CYAN, from === s.from ? 0.9 : 0.5));
      yield S(() => { status.textContent = 'dp[' + maskStr(s.mask) + '][' + s.i + ']：枚举最后一步来源 k，候选 [' + s.cands.map(cd => '从' + cd.from + '→' + cd.val).join('，') + '] → 取最小 ' + s.val; });
    }
    yield W(600);
    c.box.setText(String(s.val));
    c.box.setColor(GOLD, GOLD);
    cities.forEach(cd => cd.setColor(BLUE, BLUE));
    setAllEdges(PALETTE.edge, 0.35);
    yield S(() => { status.textContent = 'dp[' + maskStr(s.mask) + '][' + s.i + '] = ' + s.val + '（金色锁定）—— 供更大集合直接复用'; });
    yield W(500);
  }
  yield S(() => { status.textContent = '回程：ans = min(dp[全][i] + d[i][0])，候选 [' + fcands.map(c => c.val).join('，') + '] → 最短 ' + ans + '（最优终点城 ' + ai + '）'; });
  yield W(700);
  yield S(() => { status.textContent = '回溯 prev 表重建最优环：' + ftour.join(' → '); });
  yield W(600);
  for (let e = 0; e < 4; e++) {
    const [a, b] = [ftour[e], ftour[e + 1]];
    setEdge(a, b, GOLD, 0.95);
    cities[a].setColor(GOLD, GOLD); cities[b].setColor(GOLD, GOLD);
    yield S(() => { status.textContent = '最优环第 ' + (e + 1) + ' 段：城 ' + a + ' → 城 ' + b + '（d = ' + D[a][b] + '）'; });
    yield W(520);
  }
  yield S(() => { status.textContent = 'TSPDP 演示完成：4 城最短环 ' + ftour.join('→') + ' = ' + ans + '（最近邻贪心 0→1→3→2→0 需 90，局部最近 ≠ 全局最优）；O(n²·2ⁿ) 时间，O(n·2ⁿ) 空间'; });
  yield W(900);
}

engine.queue(() => runTSP());
panel.addButton('清空', () => { engine.clear(); hideScene(); status.textContent = ''; });

scene.start(engine);
