// AlgorithmLibrary/RecQueens3D.js — N 皇后回溯（4×4）：DFS 逐行尝试，冲突格红 ✗、安全格绿 ✓，死路整行回溯，找到第 1 个解 [1,3,0,2]（function* 生成器驱动，回溯搜索全运行时计算）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('RecQueens3D');

const scene = new Scene3D('scene', { cameraPos: [0, 320, 620], fov: 50 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「运行演示」开始：N 皇后回溯 —— 4×4 棋盘上放 4 个互不攻击的皇后', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 262, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: -135, z: 0, color: PALETTE.textGlow, scale: 0.42 });
const outT = new VText(scene, { text: '', x: 0, y: -222, z: 0, color: PALETTE.textGlow, scale: 0.6 });

const NQ = 4;
const grid = [];
for (let r = 0; r < NQ; r++) {
  for (let c = 0; c < NQ; c++) {
    grid.push(new VBox(scene, { w: 76, h: 76, d: 76, x: -132 + c * 88, y: 205 - r * 88, z: 0, label: '', color: DIM, emissive: DIM }));
  }
}
new VText(scene, { text: '行坐标自上而下 0~3；冲突 = 同列或同对角线（|Δ行| = |Δ列|）', x: 0, y: -100, z: 0, color: PALETTE.textDim, scale: 0.34 });

function* queensGen() {
  const board = new Array(NQ).fill(-1);
  const cell = (r, c) => grid[r * NQ + c];
  const conflict = (r, c) => {
    for (let i = 0; i < r; i++) {
      if (board[i] === c) return true;
      if (Math.abs(board[i] - c) === r - i) return true;
    }
    return false;
  };
  const fmt = () => '[' + board.map(v => (v >= 0 ? v : '_')).join(',') + ']';
  yield S(() => { hint.setText('回溯 = 递归 + 剪枝：放不下就「撤销上一步」换条路 —— 穷举但每步只尝试可行的位置'); stageT.setText('规则：4 个皇后互相不能同列、不能同对角线。第 0 行从第 0 列开始尝试'); });
  yield W(950);
  let row = 0, col = 0;
  let attempts = 0;
  while (true) {
    if (row === NQ) break;
    let found = false;
    for (; col < NQ; col++) {
      attempts++;
      cell(row, col).setColor(WHITE, WHITE);
      yield S(() => { stageT.setText('尝试 r' + row + 'c' + col + '：与已放皇后比较（同列？对角线？）'); eqT.setText('board = ' + fmt()); });
      yield W(420);
      if (conflict(row, col)) {
        cell(row, col).setColor(RED, RED);
        cell(row, col).setText('✗');
        yield S(() => { stageT.setText('r' + row + 'c' + col + ' 冲突 → 剪枝，试下一列'); });
        yield W(420);
        cell(row, col).setColor(DIM, DIM);
        cell(row, col).setText('');
      } else {
        cell(row, col).setColor(GREEN, GREEN);
        cell(row, col).setText('✓');
        yield W(420);
        board[row] = col;
        cell(row, col).setColor(GOLD, GOLD);
        cell(row, col).setText('Q');
        yield S(() => { stageT.setText('r' + row + 'c' + col + ' 安全 → 放皇后，深入第 ' + (row + 2) + ' 行'); eqT.setText('board = ' + fmt()); });
        yield W(520);
        found = true;
        break;
      }
    }
    if (!found) {
      yield S(() => { stageT.setText('第 ' + (row + 1) + ' 行全部冲突 → 回溯：撤掉 r' + (row - 1) + 'c' + board[row - 1] + ' 的皇后，换下一列'); eqT.setText('board = ' + fmt()); });
      yield W(600);
      row--;
      col = board[row] + 1;
      cell(row, col - 1).setColor(DIM, DIM);
      cell(row, col - 1).setText('');
      board[row] = -1;
      yield W(400);
    } else {
      row++; col = 0;
    }
  }
  const sol = board.join(',');
  yield S(() => { stageT.setText('第 4 行放定 → 找到解 [' + sol + '] —— 4 个皇后互不攻击'); eqT.setText('尝试了 ' + attempts + ' 个格子（全穷举是 4^4 = 256）'); });
  yield W(900);
  grid.forEach(g => g.setColor(GREEN, GREEN));
  outT.setText('解 [' + sol + ']：行 0→列 1，行 1→列 3，行 2→列 0，行 3→列 2 ✓');
  status.textContent = 'N皇后：找到解 [' + sol + ']';
  yield S(() => { hint.setText('4 皇后共 2 个解（另一个是 [2,0,3,1] 的镜像）；8 皇后有 92 个解'); });
  yield W(1100);
  yield S(() => { hint.setText('复杂度：最坏 O(N!) 尝试；回溯剪枝后平均远低于穷举 —— N 皇后是回溯法的教科书案例'); outT.setText('递归深度 = 行数 N；本演示用显式栈版：一行循环 + 手动出栈（与递归等价）'); });
  yield W(1100);
  yield S(() => { hint.setText('N 皇后演示完成：DFS 逐行尝试 → 冲突剪枝 → 回溯 → 找到第 1 个解'); outT.setText(''); });
  yield W(400);
}

function* runQueens() {
  hint.setText('N 皇后：DFS + 回溯');
  yield W(400);
  yield* queensGen();
}

panel.addButton('运行演示', () => engine.start(runQueens()));
panel.addButton('清空', () => {
  engine.clear();
  grid.forEach(g => { g.setText(''); g.setColor(DIM, DIM); });
  stageT.setText(''); eqT.setText(''); outT.setText('');
  hint.setText('已清空，可重新运行'); status.textContent = '';
});
panel.addLabel('（拖拽旋转视角，滚轮缩放；棋盘 16 格 = 尝试区：红 ✗ 冲突剪枝、绿 ✓ 安全、金 Q 已放皇后、回溯时皇后被撤下；显式栈版回溯全部运行时计算）');

scene.start(engine);
