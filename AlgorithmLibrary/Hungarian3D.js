// AlgorithmLibrary/Hungarian3D.js — 匈牙利算法（指派问题）：行减 → 列减 → 独立零覆盖（König）→ 未覆盖则调整 delta → 求最小总成本，3×3 成本矩阵（function* 生成器驱动，解说入状态栏）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Hungarian3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd;
const status = panel.addStatus('就绪');

const C = [[8, 12, 5], [6, 4, 9], [7, 11, 3]];
const N = 3;
const CELL_X = j => (j - 1) * 90 + 320, CELL_Y = i => (2 - i) * 90 + 390;
const cellView = new Map();   // 'i-j' -> VBox
const rowLbl = [], colLbl = [];
let M = [];      // 当前成本矩阵
let assign = []; // 最终指派：行 i -> 列 assign[i]

for (let i = 0; i < N; i++) {
  rowLbl.push(new VText(scene, { text: '行' + i, x: 120, y: CELL_Y(i), z: 0, color: PALETTE.textDim, scale: 0.5 }));
}
for (let j = 0; j < N; j++) {
  colLbl.push(new VText(scene, { text: '列' + j, x: CELL_X(j), y: 655, z: 0, color: PALETTE.textDim, scale: 0.5 }));
}
for (let i = 0; i < N; i++) {
  for (let j = 0; j < N; j++) {
    const box = new VBox(scene, { w: 78, h: 78, d: 16, x: CELL_X(j), y: CELL_Y(i), z: 0, label: String(C[i][j]), color: BLUE, emissive: BLUE });
    cellView.set(i + '-' + j, box);
  }
}

const setCellColor = (i, j, c) => cellView.get(i + '-' + j).setColor(c, c);
const setCellText = (i, j, t) => cellView.get(i + '-' + j).setText(String(t));
function resetCells() { for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) setCellColor(i, j, BLUE); }
function markZeros() { for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (M[i][j] === 0) setCellColor(i, j, GREEN); }

// 零图上的最大匹配（Kuhn DFS，纯数据计算）
function zeroMatch() {
  const adj = [];
  for (let i = 0; i < N; i++) { const a = []; for (let j = 0; j < N; j++) if (M[i][j] === 0) a.push(j); adj.push(a); }
  const mr = Array(N).fill(-1);
  function dfs(u, vis) {
    for (const v of adj[u]) {
      if (vis[v]) continue;
      vis[v] = 1;
      if (mr[v] === -1 || dfs(mr[v], vis)) { mr[v] = u; return true; }
    }
    return false;
  }
  for (let u = 0; u < N; u++) dfs(u, Array(N).fill(0));
  return mr;
}
// König 定理：最小零覆盖线 = 未标记行 + 标记列
function minCover(mr) {
  const adj = [];
  for (let i = 0; i < N; i++) { const a = []; for (let j = 0; j < N; j++) if (M[i][j] === 0) a.push(j); adj.push(a); }
  const markedR = Array(N).fill(0), markedC = Array(N).fill(0), q = [];
  for (let u = 0; u < N; u++) if (!mr.includes(u)) { markedR[u] = 1; q.push(u); }
  while (q.length) {
    const u = q.shift();
    for (const v of adj[u]) {
      if (markedC[v]) continue;
      markedC[v] = 1;
      if (mr[v] !== -1 && !markedR[mr[v]]) { markedR[mr[v]] = 1; q.push(mr[v]); }
    }
  }
  const rows = [], cols = [];
  for (let i = 0; i < N; i++) if (!markedR[i]) rows.push(i);
  for (let j = 0; j < N; j++) if (markedC[j]) cols.push(j);
  return { rows, cols };
}

function* hungarianGen() {
  M = C.map(r => r.slice());
  assign = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) setCellText(i, j, M[i][j]);
  resetCells();
  yield S(() => { status.textContent = '匈牙利算法（指派问题）：3×3 成本矩阵，每行选 1 格、每列选 1 格使总成本最小。步骤：行减 → 列减 → 独立零覆盖 → 未覆盖则调整'; });
  yield W(900);
  for (let i = 0; i < N; i++) {
    const m = Math.min(...M[i]);
    for (let j = 0; j < N; j++) setCellColor(i, j, CYAN);
    rowLbl[i].setText('行' + i + ' −' + m);
    yield S(() => { status.textContent = '行减：第 ' + i + ' 行最小元素 ' + m + '（青色高亮），整行减去它 → 该行出现 0'; });
    yield W(380);
    for (let j = 0; j < N; j++) { M[i][j] -= m; setCellText(i, j, M[i][j]); }
  }
  resetCells(); markZeros();
  yield S(() => { status.textContent = '行减完成：每行至少一个 0（绿色）。行减量：行0 −5、行1 −4、行2 −3'; });
  yield W(800);
  for (let j = 0; j < N; j++) {
    let m = Infinity;
    for (let i = 0; i < N; i++) m = Math.min(m, M[i][j]);
    if (m > 0) {
      for (let i = 0; i < N; i++) setCellColor(i, j, ORANGE);
      colLbl[j].setText('列' + j + ' −' + m);
      yield S(() => { status.textContent = '列减：第 ' + j + ' 列最小元素 ' + m + '（橙色高亮），整列减去它'; });
      yield W(380);
      for (let i = 0; i < N; i++) { M[i][j] -= m; setCellText(i, j, M[i][j]); }
    }
  }
  resetCells(); markZeros();
  let mr = zeroMatch();
  const pairs = [];
  for (let v = 0; v < N; v++) if (mr[v] !== -1) pairs.push('(' + mr[v] + ',' + v + ')');
  for (let v = 0; v < N; v++) if (mr[v] !== -1) setCellColor(mr[v], v, GOLD);
  yield S(() => { status.textContent = '列减完成：最大独立零（同行同列只取 1 个，金色）= ' + pairs.length + ' 个 ' + pairs.join('、') + ' < 3 → 零不够，需最小覆盖线'; });
  yield W(900);
  const cov = minCover(mr);
  for (const i of cov.rows) for (let j = 0; j < N; j++) if (M[i][j] !== 0) setCellColor(i, j, PUR);
  for (const j of cov.cols) for (let i = 0; i < N; i++) if (M[i][j] !== 0) setCellColor(i, j, PUR);
  yield S(() => { status.textContent = '最小覆盖（König）：' + (cov.rows.length + cov.cols.length) + ' 条线 = 行 ' + cov.rows.join('、') + ' + 列 ' + cov.cols.join('、') + '（紫色）< 3 → 需要调整'; });
  yield W(900);
  let d = Infinity;
  for (let i = 0; i < N; i++) if (!cov.rows.includes(i)) for (let j = 0; j < N; j++) if (!cov.cols.includes(j)) d = Math.min(d, M[i][j]);
  yield S(() => { status.textContent = '调整：未覆盖格最小元素 delta = ' + d + ' —— 未覆盖行减 ' + d + '、覆盖行列交叉点加 ' + d + '，出现新零'; });
  yield W(700);
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const inR = cov.rows.includes(i), inC = cov.cols.includes(j);
      if (!inR && !inC) M[i][j] -= d;
      else if (inR && inC) M[i][j] += d;
      setCellText(i, j, M[i][j]);
    }
  }
  resetCells(); markZeros();
  yield S(() => { status.textContent = '调整完成：重新统计独立零'; });
  yield W(800);
  mr = zeroMatch();
  for (let v = 0; v < N; v++) if (mr[v] !== -1) setCellColor(mr[v], v, GOLD);
  assign = [];
  for (let v = 0; v < N; v++) assign[mr[v]] = v;
  const total = C.reduce((s, r, i) => s + r[assign[i]], 0);
  yield S(() => { status.textContent = '独立零 = 3 个（金色）：指派 = ' + C.map((r, i) => '行' + i + '→列' + assign[i]).join('、') + '，总成本 = ' + total; });
  yield W(800);
  yield S(() => { status.textContent = 'Hungarian 演示完成：3×3 成本矩阵，最小指派 = ' + C.map((r, i) => '行' + i + '→列' + assign[i]).join('、') + '，总成本 ' + total + '；复杂度 O(n³)'; });
  yield W(900);
}

function* runHungarian() {
  yield S(() => { status.textContent = '匈牙利算法：行减 → 列减 → 独立零覆盖，3×3 指派问题求最小总成本'; });
  yield W(400);
  yield* hungarianGen();
}

engine.queue(() => runHungarian());
panel.addButton('清空', () => {
  engine.clear();
  M = C.map(r => r.slice());
  assign = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { setCellText(i, j, M[i][j]); setCellColor(i, j, BLUE); }
  for (let i = 0; i < N; i++) rowLbl[i].setText('行' + i);
  for (let j = 0; j < N; j++) colLbl[j].setText('列' + j);
  status.textContent = '';
});

scene.start(engine);
