// AlgorithmLibrary/OptimalBST3D.js — 最优二叉搜索树：e[i][j]=min(e[i][r-1]+e[r+1][j])+w[i][j]，根表驱动建树
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('OptimalBST3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, ROSE = 0xfb7185, CYAN = 0x67e8f9, AMBER = 0xfbbf24, WHITE = 0xe2e8f0;
const hint = new VText(scene, { text: '点击「运行最优BST」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const P = [0, 0.15, 0.10, 0.05, 0.10, 0.20];
const Q = [0.05, 0.10, 0.05, 0.05, 0.05, 0.10];
const N = 5;

function optimalBST() {
  const e = Array.from({ length: N + 2 }, () => new Array(N + 1).fill(0));
  const w = Array.from({ length: N + 2 }, () => new Array(N + 1).fill(0));
  const root = Array.from({ length: N + 2 }, () => new Array(N + 1).fill(0));
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
  const tree = {};
  (function build(i, j, node) {
    if (i > j) return;
    const r = root[i][j];
    node.key = r; node.lo = i; node.hi = j;
    if (i <= r - 1) { node.left = {}; build(i, r - 1, node.left); }
    if (r + 1 <= j) { node.right = {}; build(r + 1, j, node.right); }
  })(1, N, tree);
  steps.push({ type: 'tree', tree, best: +e[1][N].toFixed(2) });
  return steps;
}
const obSteps = optimalBST();

const KX = (i) => -160 + (i - 1) * 80;
const keys = [1, 2, 3, 4, 5].map(i =>
  new VNode(scene, { radius: 26, x: KX(i), y: 180, z: 0, label: 'k' + i, color: DIM, emissive: DIM }));
const pT = [1, 2, 3, 4, 5].map(i =>
  new VText(scene, { text: 'p=' + P[i].toFixed(2), x: KX(i), y: 213, z: 0, color: PALETTE.textDim, scale: 0.5 }));
const cells = [];
for (let len = 1; len <= N; len++) for (let i = 1; i + len - 1 <= N; i++) {
  const j = i + len - 1;
  const cx = -160 + (i + j - 2) * 40, cy = 30 - (len - 1) * 45;
  const box = new VBox(scene, { w: 52, h: 32, d: 32, x: cx, y: cy, z: 0, label: '', color: DIM, emissive: DIM });
  cells.push({ i, j, box });
}
const totalT = new VText(scene, { text: '', x: 0, y: -195, z: 0, color: GOLD, scale: 0.8 });
new VText(scene, { text: '键 k1..k5 各有被查找概率 p，q 是查找失败（哑键）概率 —— 找一棵期望查找代价最小的 BST', x: 0, y: 248, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: 'e[i][j] = min(e[i][r−1] + e[r+1][j]) + w[i][j]：每加深一层，区间内全部键与哑键都多算一次', x: 0, y: -235, z: 0, color: PALETTE.textDim, scale: 0.62 });
const stageT = new VText(scene, { text: '', x: 0, y: 265, z: 0, color: GOLD, scale: 0.72 });
const outT = new VText(scene, { text: '', x: 0, y: -265, z: 0, color: PALETTE.textGlow, scale: 0.6 });

const TPOS = { 1: [245, -12], 2: [300, 60], 3: [275, -150], 4: [315, -84], 5: [355, -12] };
const tNodes = [1, 2, 3, 4, 5].map(k =>
  new VNode(scene, { radius: 24, x: TPOS[k][0], y: TPOS[k][1], z: 0, label: '', color: DIM, emissive: DIM }));
const tEdges = [
  tubeBetween(scene, { x: TPOS[2][0], y: TPOS[2][1], z: 0 }, { x: TPOS[1][0], y: TPOS[1][1], z: 0 }, { color: CYAN, opacity: 0, radius: 1.8 }),
  tubeBetween(scene, { x: TPOS[2][0], y: TPOS[2][1], z: 0 }, { x: TPOS[5][0], y: TPOS[5][1], z: 0 }, { color: CYAN, opacity: 0, radius: 1.8 }),
  tubeBetween(scene, { x: TPOS[5][0], y: TPOS[5][1], z: 0 }, { x: TPOS[4][0], y: TPOS[4][1], z: 0 }, { color: CYAN, opacity: 0, radius: 1.8 }),
  tubeBetween(scene, { x: TPOS[4][0], y: TPOS[4][1], z: 0 }, { x: TPOS[3][0], y: TPOS[3][1], z: 0 }, { color: CYAN, opacity: 0, radius: 1.8 })
];

function cellOf(i, j) { return cells.find(c => c.i === i && c.j === j); }
function resetAll() {
  engine.clear();
  keys.forEach(k => k.setColor(DIM, DIM));
  pT.forEach(t => t.setText('', { color: PALETTE.textDim }));
  cells.forEach(c => { c.box.setColor(DIM, DIM); c.box.setText(''); });
  tNodes.forEach(n => { n.setColor(DIM, DIM); n.setText(''); });
  tEdges.forEach(t => { t.material.opacity = 0; });
  totalT.setText(''); stageT.setText(''); outT.setText('');
}

function runOB() {
  resetAll();
  pT.forEach((t, i) => t.setText('p=' + P[i + 1].toFixed(2), { color: PALETTE.textDim }));
  hint.setText('高频键（k5=0.20）不代表要放树顶 —— 每个键的深度 × 概率加起来才是代价，必须全局权衡');
  C(700, () => {
    stageT.setText('按区间长度从小到大填表：先解决单键区间，再拼更长区间；w = 区间概率和 = 子树下移一层的附加代价');
    hint.setText('哑键 q 代表查找失败的位置，也要算进期望代价 —— 它们在叶子下方多一层就多一次概率');
  });
  for (const s of obSteps) {
    if (s.type === 'tree') break;
    C(650, () => {
      for (let k = s.i; k <= s.j; k++) keys[k - 1].setColor(ROSE, ROSE);
      const c = cellOf(s.i, s.j);
      c.box.setColor(CYAN, CYAN);
      stageT.setText(`区间 [k${s.i}..k${s.j}]（长 ${s.len}）：w = ${s.w} —— 若以此为整区间，所有键深度都 +1`);
      hint.setText(`w[${s.i}][${s.j}] = w[${s.i}][${s.j - 1}] + p${s.j} + q${s.j} = ${s.w}`);
    });
    C(550, () => {
      s.cands.forEach(({ r }) => keys[r - 1].setColor(r === s.br ? AMBER : CYAN, r === s.br ? AMBER : CYAN));
      stageT.setText(`枚举根 r = ${s.i}..${s.j}：取 e[i][r−1] + e[r+1][j] + w 最小，当前最优 r=${s.br}`);
      hint.setText('候选 = [' + s.cands.map(c => 'r' + c.r + '→' + c.t).join('，') + ']');
    });
    C(600, () => {
      const c = cellOf(s.i, s.j);
      c.box.setText(String(s.cost));
      c.box.setColor(GOLD, GOLD);
      keys.forEach(k => k.setColor(DIM, DIM));
      keys[s.br - 1].setColor(GOLD, GOLD);
      stageT.setText(`e[${s.i}][${s.j}] = ${s.cost}（最优根 r=${s.br}）—— 记录进根表 root[${s.i}][${s.j}] = ${s.br}`);
    });
  }
  C(900, () => {
    totalT.setText('e[1][5] = 2.75 —— 整棵最优树期望代价（含失败查找）');
    stageT.setText('表填完！root[1][5] = 2 → 根是 k2，随后按根表递归展开左右子树');
    hint.setText('根表：root[1][1]=1，root[3][5]=5，root[3][4]=4，root[3][3]=3');
  });
  const tree = obSteps[obSteps.length - 1].tree;
  const order = [];
  (function walk(n) {
    if (!n) return;
    order.push(n);
    walk(n.left); walk(n.right);
  })(tree);
  const TIPS = {
    '1': 'root[1][1] = 1 → k1 挂在 k2 左下方（单键区间，根就是自己）',
    '5': 'root[3][5] = 5 → k5 是右子树根',
    '4': 'root[3][4] = 4 → k4 挂在 k5 左侧',
    '3': 'root[3][3] = 3 → k3 挂在 k4 左侧 —— 建树完成！'
  };
  order.forEach((n, idx) => {
    C(750, () => {
      const p = TPOS[n.key];
      const nd = tNodes[n.key - 1];
      nd.setText('k' + n.key);
      nd.setColor(GOLD, GOLD);
      if (idx > 0) tEdges[idx - 1].material.opacity = 0.85;
      stageT.setText(TIPS[n.key] || ('root[1][5] = 2 → k2 为根；左子树 [1..1]，右子树 [3..5]'));
      hint.setText(n.lo === n.hi ? `子树区间 [${n.lo}..${n.hi}] 单键，深度 = 该键的查找比较次数` : `子树区间 [${n.lo}..${n.hi}] 的根 k${n.key}`);
    });
  });
  C(1000, () => {
    outT.setText('最优期望查找代价 = 2.75（含失败查找）—— 对比平衡树（k3 当根）要 2.80；按频率贪心也不行，必须全局最优');
    status.textContent = '最优BST期望代价 = 2.75（根 k2）';
    hint.setText('期望代价 = Σ p·深度 + Σ q·哑键深度：k5 频率最高却在第 2 层 —— 它在右子树里最贵，放深了反而省');
  });
  C(1300, () => {
    outT.setText('复杂度 O(n³) 时间 / O(n²) 空间；Knuth 四边形不等式可优化到 O(n²)');
    hint.setText('应用：单词预测键盘布局、编译器常量查找、数据库索引 —— 键的访问频率已知时选最优结构');
  });
}

panel.addButton('运行最优BST', runOB);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；上方格子 = e[i][j] 代价表，右侧按根表递归长出的最优 BST）');

scene.start(engine);
