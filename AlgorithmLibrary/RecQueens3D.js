// AlgorithmLibrary/RecQueens3D.js — N 皇后回溯（4×4）：DFS 逐行尝试，冲突格红 ✗、安全格绿 ✓，死路整行回溯，找到第 1 个解 [1,3,0,2]（function* 生成器驱动，回溯搜索全运行时计算）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
applyTheme('RecQueens3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, WHITE = 0xffffff, DIM = 0x334155;
const status = panel.addStatus('就绪');

const NQ = 4;
const grid = [];
for (let r = 0; r < NQ; r++) {
  for (let c = 0; c < NQ; c++) {
    grid.push(new VBox(scene, { w: 76, h: 76, d: 76, x: 188 + c * 88, y: 505 - r * 88, z: 0, label: '', color: DIM, emissive: DIM }));
  }
}

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

function* runQueens() {
  board.fill(-1);
  let attempts = 0;
  yield S(() => { status.textContent = 'N 皇后回溯 = 递归 + 剪枝：4 个皇后互不同列、不同对角线；第 0 行从第 0 列开始尝试'; });
  yield W(950);
  let row = 0, col = 0;
  while (true) {
    if (row === NQ) break;
    let found = false;
    for (; col < NQ; col++) {
      attempts++;
      cell(row, col).setColor(WHITE, WHITE);
      yield S(() => { status.textContent = '尝试 r' + row + 'c' + col + '：与已放皇后比较（同列？对角线？）board = ' + fmt(); });
      yield W(420);
      if (conflict(row, col)) {
        cell(row, col).setColor(RED, RED);
        cell(row, col).setText('✗');
        yield S(() => { status.textContent = 'r' + row + 'c' + col + ' 冲突 → 剪枝，试下一列'; });
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
        yield S(() => { status.textContent = 'r' + row + 'c' + col + ' 安全 → 放皇后，深入第 ' + (row + 2) + ' 行；board = ' + fmt(); });
        yield W(520);
        found = true;
        break;
      }
    }
    if (!found) {
      yield S(() => { status.textContent = '第 ' + (row + 1) + ' 行全部冲突 → 回溯：撤掉 r' + (row - 1) + 'c' + board[row - 1] + ' 的皇后，换下一列'; });
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
  const sol = board;
  const posMap = sol.map((c, r) => '行 ' + r + '→列 ' + c).join('，');
  yield S(() => { status.textContent = '第 4 行放定 → 找到解 [' + sol.join(',') + ']：' + posMap + ' ✓（共尝试 ' + attempts + ' 个格子，全穷举是 4^4 = 256）'; });
  yield W(900);
  grid.forEach(g => g.setColor(GREEN, GREEN));
  yield S(() => { status.textContent = '4 皇后共 2 个解（另一个是 [2,0,3,1] 的镜像）；8 皇后有 92 个解'; });
  yield W(1100);
  yield S(() => { status.textContent = '复杂度最坏 O(N!) 尝试，回溯剪枝后平均远低于穷举；递归深度 = 行数 N —— 回溯法的教科书案例'; });
  yield W(1100);
  yield S(() => { status.textContent = 'N 皇后演示完成：4×4 棋盘 DFS 逐行尝试 → 冲突剪枝 → 回溯 → 找到第 1 个解 [1,3,0,2]（共尝试 ' + attempts + ' 格，4 皇后共 2 解）'; });
  yield W(400);
}

engine.queue(() => runQueens());
panel.addButton('清空', () => {
  engine.clear();
  board.fill(-1);
  grid.forEach(g => { g.setText(''); g.setColor(DIM, DIM); });
  status.textContent = '';
});

scene.start(engine);
