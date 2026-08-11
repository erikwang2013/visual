// AlgorithmLibrary/OptimalBST3D.js — 最优二叉搜索树：e[i][j]=min(e[i][r-1]+e[r+1][j])+w[i][j] 按区间长填表，根表驱动右侧建树（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('OptimalBST3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 700], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff;
const hint = new VText(scene, { text: '点击「运行演示」开始：最优二叉搜索树（键 k1..k5，查找概率已知）', x: 0, y: 308, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 265, z: 0, color: GOLD, scale: 0.72 });
const outT = new VText(scene, { text: '', x: 0, y: -268, z: 0, color: PALETTE.textGlow, scale: 0.6 });
const totalT = new VText(scene, { text: '', x: 0, y: -200, z: 0, color: GOLD, scale: 0.8 });

const P = [0, 0.15, 0.10, 0.05, 0.10, 0.20];
const Q = [0.05, 0.10, 0.05, 0.05, 0.05, 0.10];
const N = 5;
const e = Array.from({ length: N + 2 }, () => Array(N + 1).fill(0));
const w = Array.from({ length: N + 2 }, () => Array(N + 1).fill(0));
const root = Array.from({ length: N + 2 }, () => Array(N + 1).fill(0));
for (let i = 1; i <= N + 1; i++) { e[i][i - 1] = Q[i - 1]; w[i][i - 1] = Q[i - 1]; }
const steps = [];
for (let len = 1; len <= N; len++) {
  for (let i = 1; i + len - 1 <= N; i++) {
    const j = i + len - 1;
    e[i][j] = Infinity;
    w[i][j] = w[i][j - 1] + P[j] + Q[j];
    let br = i;
    const cands = [];
    for (let r = i; r <= j; r++) {
      const t = e[i][r - 1] + e[r + 1][j] + w[i][j];
      cands.push({ r, t: +t.toFixed(2) });
      if (t < e[i][j]) { e[i][j] = t; br = r; }
    }
    root[i][j] = br;
    steps.push({ len, i, j, w: +w[i][j].toFixed(2), cost: +e[i][j].toFixed(2), br, cands });
  }
}
const TORDER = [];
(function buildT(i, j) {
  if (i > j) return;
  const r = root[i][j];
  TORDER.push({ key: r, lo: i, hi: j });
  buildT(i, r - 1); buildT(r + 1, j);
})(1, N);

const KX = (i) => -160 + (i - 1) * 80;
const keys = [1, 2, 3, 4, 5].map(i => new VNode(scene, { radius: 26, x: KX(i), y: 180, z: 0, label: 'k' + i, color: BLUE, emissive: BLUE }));
const pT = [1, 2, 3, 4, 5].map(i => new VText(scene, { text: 'p=' + P[i].toFixed(2), x: KX(i), y: 213, z: 0, color: WHITE, scale: 0.5 }));
const cells = [];
for (let len = 1; len <= N; len++) for (let i = 1; i + len - 1 <= N; i++) {
  const j = i + len - 1;
  const box = new VBox(scene, { w: 52, h: 32, d: 32, x: -160 + (i + j - 2) * 40, y: 30 - (len - 1) * 45, z: 0, label: '', color: BLUE, emissive: BLUE });
  cells.push({ i, j, box });
}
const TPOS = { 1: [245, -12], 2: [300, 60], 3: [275, -150], 4: [315, -84], 5: [355, -12] };
const tNodes = [1, 2, 3, 4, 5].map(k => new VNode(scene, { radius: 24, x: TPOS[k][0], y: TPOS[k][1], z: 0, label: '', color: BLUE, emissive: BLUE }));
const tEdges = [
  tubeBetween(scene, { x: TPOS[2][0], y: TPOS[2][1], z: 0 }, { x: TPOS[1][0], y: TPOS[1][1], z: 0 }, { color: CYAN, opacity: 0, radius: 1.8 }),
  tubeBetween(scene, { x: TPOS[2][0], y: TPOS[2][1], z: 0 }, { x: TPOS[5][0], y: TPOS[5][1], z: 0 }, { color: CYAN, opacity: 0, radius: 1.8 }),
  tubeBetween(scene, { x: TPOS[5][0], y: TPOS[5][1], z: 0 }, { x: TPOS[4][0], y: TPOS[4][1], z: 0 }, { color: CYAN, opacity: 0, radius: 1.8 }),
  tubeBetween(scene, { x: TPOS[4][0], y: TPOS[4][1], z: 0 }, { x: TPOS[3][0], y: TPOS[3][1], z: 0 }, { color: CYAN, opacity: 0, radius: 1.8 })
];
new VText(scene, { text: '键 k1..k5 各有查找概率 p，q 为查找失败（哑键）概率 —— 找期望查找代价最小的 BST', x: 0, y: 250, z: 0, color: WHITE, scale: 0.68 });
new VText(scene, { text: 'e[i][j] = min_{r}(e[i][r−1] + e[r+1][j]) + w[i][j]：每加深一层，区间内全部键与哑键都多算一次', x: 0, y: -238, z: 0, color: WHITE, scale: 0.62 });

function cellOf(i, j) { return cells.find(c => c.i === i && c.j === j); }
function clearView() {
  keys.forEach(k => k.setColor(BLUE, BLUE));
  cells.forEach(c => { c.box.setColor(BLUE, BLUE); c.box.setText(''); });
  tNodes.forEach(n => { n.setColor(BLUE, BLUE); n.setText(''); });
  tEdges.forEach(t => { t.material.opacity = 0; });
  totalT.setText(''); stageT.setText(''); outT.setText('');
}

function* obGen() {
  yield S(() => outT.setText('最优 BST：高频键不代表要放树顶 —— 深度 × 概率才是代价，必须全局权衡'));
  yield W(650);
  for (const s of steps) {
    for (let k = s.i; k <= s.j; k++) keys[k - 1].setColor(RED, RED);
    cellOf(s.i, s.j).box.setColor(CYAN, CYAN);
    yield S(() => stageT.setText('区间 [k' + s.i + '..k' + s.j + ']（长 ' + s.len + '）：w = ' + s.w + '（区间概率和 = 下移一层的附加代价）'));
    yield W(420);
    for (const cd of s.cands) {
      keys[cd.r - 1].setColor(cd.r === s.br ? ORANGE : CYAN, cd.r === s.br ? ORANGE : CYAN);
      yield S(() => outT.setText('候选根 r=' + cd.r + '：e[' + s.i + '][' + (cd.r - 1) + '] + e[' + (cd.r + 1) + '][' + s.j + '] + ' + s.w + ' = ' + cd.t + (cd.r === s.br ? ' ← 当前最优' : '')));
      yield W(240);
    }
    const c = cellOf(s.i, s.j);
    c.box.setText(String(s.cost));
    c.box.setColor(GOLD, GOLD);
    keys.forEach(k => k.setColor(BLUE, BLUE));
    keys[s.br - 1].setColor(GOLD, GOLD);
    yield S(() => stageT.setText('e[' + s.i + '][' + s.j + '] = ' + s.cost + '（最优根 r=' + s.br + ' → 根表 root[' + s.i + '][' + s.j + '] = ' + s.br + '）'));
    yield W(480);
  }
  yield S(() => { totalT.setText('e[1][5] = ' + e[1][5].toFixed(2) + ' —— 整棵最优树的期望查找代价（含失败查找）'); stageT.setText('表填完！root[1][5] = 2 → 根是 k2，按根表递归展开左右子树'); });
  yield W(800);
  for (let idx = 0; idx < TORDER.length; idx++) {
    const n = TORDER[idx];
    tNodes[n.key - 1].setText('k' + n.key);
    tNodes[n.key - 1].setColor(GOLD, GOLD);
    if (idx > 0) tEdges[idx - 1].material.opacity = 0.85;
    yield S(() => stageT.setText('根表展开：区间 [' + n.lo + '..' + n.hi + '] 的根 = k' + n.key + '（root[' + n.lo + '][' + n.hi + '] = ' + n.key + '）'));
    yield W(450);
  }
  yield S(() => outT.setText('最优树：根 k2，左 k1，右子树根 k5（其左 k4，k4 左 k3）—— 频率最高的 k5(0.20) 在第 2 层'));
  yield W(750);
  yield S(() => { status.textContent = '最优BST期望代价 = ' + e[1][5].toFixed(2) + '（根 k2，k5 第 2 层）'; outT.setText('完成：期望代价 ' + e[1][5].toFixed(2) + '，O(n³) 时间 / O(n²) 空间；Knuth 优化可到 O(n²)'); });
  yield W(600);
}

function* runOB() {
  clearView();
  hint.setText('最优BST：按区间长度自底向上填 e 表，根表驱动建树');
  yield W(400);
  yield* obGen();
  yield S(() => { outT.setText(''); hint.setText('最优BST完成：期望代价 ' + e[1][5].toFixed(2) + '（根 k2），O(n³)'); });
}

panel.addButton('运行演示', () => engine.start(runOB()));
panel.addButton('清空', () => { engine.clear(); clearView(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；红 = 区间键，青 = 候选根，橙 = 暂优根，金 = 最优值/树节点；右侧根表长出最优树）');

scene.start(engine);
