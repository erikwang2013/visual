// AlgorithmLibrary/AStar3D.js
// A* 寻路：8×6 网格，绿色起点 S / 红色终点 E 固定，灰色随机障碍。
// open 表黄色、closed 表灰色逐格扩展，每格更新 f=g+h 标注，最终路径绿色高亮。
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('AStar3D');

const scene = new Scene3D('scene', { cameraPos: [0, 400, 580], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const COLS = 8, ROWS = 6, GAP = 66, SIZE = 46;
const START = [0, 0], END = [7, 5];
const C_BASE = PALETTE.node, C_BASE_EM = PALETTE.nodeEmissive;
const C_OBS = 0x475569, C_OBS_EM = 0x1e293b;
const C_OPEN = 0xfacc15, C_OPEN_EM = 0x713f12;
const C_CLOSED = 0x64748b, C_CLOSED_EM = 0x334155;
const C_PATH = 0x34d399, C_PATH_EM = 0x064e3b;
const C_START = 0x22c55e, C_START_EM = 0x166534;
const C_END = 0xef4444, C_END_EM = 0x7f1d1d;

const cells = [];       // [r][c] -> {box, label}
const obstacles = [];   // [r][c] -> bool

function cellPos(c, r) { return [(c - (COLS - 1) / 2) * GAP, 0, (r - (ROWS - 1) / 2) * GAP]; }
function isStart(c, r) { return c === START[0] && r === START[1]; }
function isEnd(c, r) { return c === END[0] && r === END[1]; }

function buildGrid() {
  for (const row of cells) for (const cell of row) { if (!cell) continue; cell.box.remove(); if (cell.label) cell.label.remove(); }
  cells.length = 0;
  for (let r = 0; r < ROWS; r++) {
    cells[r] = [];
    for (let c = 0; c < COLS; c++) {
      const [x, , z] = cellPos(c, r);
      const obs = obstacles[r][c];
      let color = C_BASE, em = C_BASE_EM, label = '';
      if (obs) { color = C_OBS; em = C_OBS_EM; }
      else if (isStart(c, r)) { color = C_START; em = C_START_EM; label = 'S'; }
      else if (isEnd(c, r)) { color = C_END; em = C_END_EM; label = 'E'; }
      const box = new VBox(scene, { w: SIZE, h: SIZE, d: SIZE, x, y: 0, z, label, color, emissive: em });
      cells[r][c] = { box, label: null };
    }
  }
}

function setCellColor(c, r, color, em) { cells[r][c].box.setColor(color, em); }

function spawnFLabel(c, r, f) {
  const [x, , z] = cellPos(c, r);
  let vt = cells[r][c].label;
  if (!vt) { vt = new VText(scene, { text: 'f=' + f, x, y: 58, z, color: '#fde68a', scale: 0.55 }); cells[r][c].label = vt; }
  else vt.setText('f=' + f, { color: '#fde68a', scale: 0.55 });
}

function clearLabels() {
  for (const row of cells) for (const cell of row) { if (cell && cell.label) { cell.label.remove(); cell.label = null; } }
}

function resetCells() {
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const obs = obstacles[r][c];
    if (obs) setCellColor(c, r, C_OBS, C_OBS_EM);
    else if (isStart(c, r)) setCellColor(c, r, C_START, C_START_EM);
    else if (isEnd(c, r)) setCellColor(c, r, C_END, C_END_EM);
    else setCellColor(c, r, C_BASE, C_BASE_EM);
  }
}

// A* 模型：返回 open/pop 步骤序列与最终路径（与渲染动画一一对应）
function aStarModel(obs) {
  const key = (c, r) => r * COLS + c;
  const h = (c, r) => Math.abs(c - END[0]) + Math.abs(r - END[1]);
  const g = new Map();
  const came = new Map();
  const inOpen = new Set();
  const closed = new Set();
  const open = [];
  const steps = [];
  g.set(key(START[0], START[1]), 0);
  open.push(START);
  inOpen.add(key(START[0], START[1]));
  steps.push({ t: 'open', c: START[0], r: START[1], f: h(START[0], START[1]), g: 0 });
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let found = false;
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) {
      const a = open[bi], b = open[i];
      if (g.get(key(b[0], b[1])) + h(b[0], b[1]) < g.get(key(a[0], a[1])) + h(a[0], a[1])) bi = i;
    }
    const cur = open.splice(bi, 1)[0];
    const k = key(cur[0], cur[1]);
    inOpen.delete(k);
    closed.add(k);
    const gv = g.get(k);
    steps.push({ t: 'pop', c: cur[0], r: cur[1], f: gv + h(cur[0], cur[1]), g: gv });
    if (isEnd(cur[0], cur[1])) { found = true; break; }
    for (const [dc, dr] of dirs) {
      const nc = cur[0] + dc, nr = cur[1] + dr;
      if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;
      if (obs[nr][nc]) continue;
      const k2 = key(nc, nr);
      if (closed.has(k2)) continue;
      const ng = gv + 1;
      if (!g.has(k2) || ng < g.get(k2)) {
        g.set(k2, ng);
        came.set(k2, [cur[0], cur[1]]);
        if (!inOpen.has(k2)) {
          inOpen.add(k2);
          open.push([nc, nr]);
          steps.push({ t: 'open', c: nc, r: nr, f: ng + h(nc, nr), g: ng });
        }
      }
    }
  }
  const path = [];
  if (found) { let p = END; while (p) { path.push(p); p = came.get(key(p[0], p[1])); } path.reverse(); }
  return { steps, path, found };
}

const status = panel.addStatus('');
const hint = new VText(scene, { text: '绿色 S 为起点，红色 E 为终点，灰色为障碍', x: 0, y: 250, z: 0, color: PALETTE.textGlow, scale: 0.85 });

function runAStar() {
  engine.clear();
  clearLabels();
  resetCells();
  const model = aStarModel(obstacles);
  const steps = model.steps;
  let i = 0;
  function stepNext() {
    if (i >= steps.length) { showPath(); return; }
    const s = steps[i];
    i++;
    if (s.t === 'open') {
      if (!isStart(s.c, s.r)) setCellColor(s.c, s.r, C_OPEN, C_OPEN_EM);
      spawnFLabel(s.c, s.r, s.f);
      hint.setText('扩展 (' + s.c + ',' + s.r + ')：g=' + s.g + '，h=' + (s.f - s.g) + '，f=' + s.f);
      C(140, stepNext);
    } else {
      if (!isStart(s.c, s.r) && !isEnd(s.c, s.r)) setCellColor(s.c, s.r, C_CLOSED, C_CLOSED_EM);
      const vt = cells[s.r][s.c].label;
      if (vt && !isEnd(s.c, s.r)) vt.setText('f=' + s.f, { color: PALETTE.textDim, scale: 0.55 });
      hint.setText('取出 f 最小节点 (' + s.c + ',' + s.r + ')：f=' + s.f + '，加入 closed');
      C(160, stepNext);
    }
  }
  function showPath() {
    if (!model.found) { hint.setText('A* 结束：未找到路径（点击「新图」再试）'); status.textContent = '未找到路径'; return; }
    let j = 0;
    function pathStep() {
      if (j >= model.path.length) {
        status.textContent = '路径长度 ' + (model.path.length - 1) + ' 步: ' + model.path.map((p) => '(' + p[0] + ',' + p[1] + ')').join(' → ');
        hint.setText('A* 完成：绿色为最短路径');
        return;
      }
      const [c, r] = model.path[j];
      if (!isStart(c, r) && !isEnd(c, r)) setCellColor(c, r, C_PATH, C_PATH_EM);
      j++;
      C(150, pathStep);
    }
    pathStep();
  }
  stepNext();
}

function randomObstacles() {
  const mask = [];
  for (let r = 0; r < ROWS; r++) {
    mask[r] = [];
    for (let c = 0; c < COLS; c++) mask[r][c] = !isStart(c, r) && !isEnd(c, r) && Math.random() < 0.22;
  }
  return mask;
}

function newGraph() {
  engine.clear();
  clearLabels();
  for (let tries = 0; tries < 50; tries++) {
    const mask = randomObstacles();
    if (aStarModel(mask).found) {
      obstacles.length = 0;
      for (const row of mask) obstacles.push([...row]);
      buildGrid();
      status.textContent = '';
      hint.setText('新图已生成，点击「运行 A*」开始寻路');
      return;
    }
  }
  obstacles.length = 0;
  for (const row of randomObstacles()) obstacles.push([...row]);
  buildGrid();
  hint.setText('新图已生成，点击「运行 A*」开始寻路');
}

function clearAll() {
  engine.clear();
  clearLabels();
  resetCells();
  status.textContent = '已清空';
  hint.setText('已清空，点击「运行 A*」开始寻路');
}

newGraph();

panel.addButton('运行 A*', runAStar);
panel.addButton('新图', newGraph);
panel.addButton('清空', clearAll);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
