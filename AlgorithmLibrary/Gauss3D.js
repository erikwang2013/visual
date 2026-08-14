// AlgorithmLibrary/Gauss3D.js — 高斯消元：3×4 增广矩阵逐行消元（Rₖ←Rₖ−f·Rₚ），主元绿色、消元行红色，回代得 x=1,y=2,z=3（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
applyTheme('Gauss3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff;
const ROWS = 3, COLS = 4;
const M0 = [[1, 1, 1, 6], [2, -1, 1, 3], [1, 2, -1, 2]];
const status = panel.addStatus('就绪');
const cells = [];
for (let r = 0; r < ROWS; r++) {
  cells[r] = [];
  for (let c = 0; c < COLS; c++) {
    const x = -250 + c * 95 + 320, y = 470 - r * 82;
    cells[r].push(new VBox(scene, { w: 58, h: 42, d: 42, x, y, z: 0, label: String(M0[r][c]), color: c === 3 ? ORANGE : BLUE, emissive: c === 3 ? ORANGE : BLUE }));
  }
}
const solLabels = ['x', 'y', 'z'].map((v, r) => new VText(scene, { text: '', x: 585, y: 474 - r * 82, z: 0, color: GREEN, scale: 0.95 }));

function fmt(v) { return Math.abs(v % 1) < 1e-9 ? String(Math.round(v)) : v.toFixed(2); }
function draw(M) {
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) cells[r][c].setText(fmt(M[r][c]));
}
function setRowColor(r, col, col3) {
  cells[r].forEach((box, k) => box.setColor(k === 3 ? (col3 || col) : col, k === 3 ? (col3 || col) : col));
}
function clearView() {
  draw(M0);
  for (let r = 0; r < ROWS; r++) setRowColor(r, BLUE, ORANGE);
  solLabels.forEach(s => s.setText(''));
}

function* gaussGen() {
  yield S(() => { status.textContent = '高斯消元：增广矩阵左边 3 列是系数、右边 1 列是常数 b，目标是把左下角消成 0（上三角），再自底向上回代'; });
  yield W(650);
  const M = M0.map(row => [...row]);
  for (let c = 0; c < ROWS; c++) {
    cells[c][c].setColor(GREEN, GREEN);
    yield S(() => { status.textContent = '第 ' + (c + 1) + ' 步：选取主元 (行 ' + (c + 1) + ', 列 ' + (c + 1) + ') = ' + fmt(M[c][c]) + '，用它消掉下方各行同列元素'; });
    yield W(500);
    for (let r = c + 1; r < ROWS; r++) {
      const f = M[r][c] / M[c][c];
      if (Math.abs(f) < 1e-12) continue;
      setRowColor(r, RED);
      yield S(() => { status.textContent = 'R' + (r + 1) + ' ← R' + (r + 1) + ' − ' + fmt(f) + '·R' + (c + 1) + '：因子 f = ' + fmt(M[r][c]) + ' ÷ ' + fmt(M[c][c]); });
      yield W(600);
      for (let k = c; k < COLS; k++) M[r][k] -= f * M[c][k];
      draw(M);
      setRowColor(r, BLUE, ORANGE);
      yield S(() => { status.textContent = '消元完成：R' + (r + 1) + ' = [' + M[r].map(fmt).join(', ') + ']，第 ' + (c + 1) + ' 列已归零'; });
      yield W(500);
    }
  }
  yield S(() => { status.textContent = '消元完毕，上三角成形：主对角线下方全为 0。回代：从最后一行自底向上解出 z → y → x'; });
  yield W(700);
  const x = [0, 0, 0];
  for (let r = ROWS - 1; r >= 0; r--) {
    let s = M[r][3];
    for (let c = r + 1; c < ROWS; c++) s -= M[r][c] * x[c];
    x[r] = s / M[r][r];
    setRowColor(r, GREEN);
    solLabels[r].setText('xyz'[r] + ' = ' + fmt(x[r]));
    yield S(() => { status.textContent = '回代第 ' + (ROWS - r) + ' 行：' + 'xyz'[r] + ' = (' + fmt(M[r][3]) + (r === 2 ? '' : ' − Σ 下方系数×解') + ') ÷ ' + fmt(M[r][r]) + ' = ' + fmt(x[r]); });
    yield W(700);
  }
  yield S(() => { status.textContent = '复杂度 O(n³)；主元为零时需交换行（列主元法）；矩阵求逆、行列式、LU 分解都是同一套行变换'; });
  yield W(800);
  yield S(() => { status.textContent = '高斯消元演示完成：x=' + fmt(x[0]) + ', y=' + fmt(x[1]) + ', z=' + fmt(x[2]) + '；检验 x+y+z=6 ✓、2x−y+z=3 ✓、x+2y−z=2 ✓'; });
  yield W(1000);
}

function* runG() {
  clearView();
  yield W(400);
  yield* gaussGen();
}

engine.queue(() => runG());
panel.addButton('清空', () => { engine.clear(); clearView(); status.textContent = ''; });

scene.start(engine);
