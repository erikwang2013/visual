// AlgorithmLibrary/LUDecomposition3D.js — LU 分解：高斯消元把 A 变成上三角 U，消元乘数 m 记进下三角 L（对角线 1），A = L·U；一次分解多次求解（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('LUDecomposition3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155, VIOLET = 0xa78bfa, AMBER = 0xfbbf24;
const status = panel.addStatus('就绪');

const A0 = [[2, 3, 1], [4, 7, 0], [-2, 4, 5]];
const N = 3;

function luDecompose(A) {
  const n = A.length;
  const L = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j ? 1 : 0));
  const U = A.map(r => [...r]);
  const steps = [];
  for (let k = 0; k < n; k++) {
    for (let i = k + 1; i < n; i++) {
      const m = U[i][k] / U[k][k];
      L[i][k] = m;
      const before = U.map(r => [...r]);
      for (let j = k; j < n; j++) U[i][j] -= m * U[k][j];
      steps.push({ k, i, m, before, after: U.map(r => [...r]) });
    }
  }
  return { L, U, steps };
}
const { L, U, steps } = luDecompose(A0);

const cell = (v, x, y, sz = 44) => new VBox(scene, { w: sz, h: sz, d: sz, x, y, z: 0, label: String(v), color: DIM, emissive: DIM });
const AX = j => 268 + j * 52;
const ARY = i => 500 - i * 52;
const uCells = A0.map((row, i) => row.map((v, j) => cell(v, AX(j), ARY(i))));
const lCells = A0.map((row, i) => row.map((v, j) => cell(0, 210 + j * 52, 408 - i * 52, 40)));
const uCells2 = A0.map((row, i) => row.map((v, j) => cell(0, 380 + j * 52, 408 - i * 52, 40)));

function fmt(v) { return Math.abs(v % 1) < 1e-9 ? String(Math.round(v)) : v.toFixed(2); }
function setCell(obj, v, color) { obj.setText(fmt(v)); if (color) obj.setColor(color, color); }
function clearView() {
  A0.forEach((row, i) => row.forEach((v, j) => setCell(uCells[i][j], v, DIM)));
  L.forEach((row, i) => row.forEach((v, j) => setCell(lCells[i][j], v, DIM)));
  U.forEach((row, i) => row.forEach((v, j) => setCell(uCells2[i][j], v, DIM)));
}

function* luGen() {
  yield S(() => { status.textContent = 'LU 分解：高斯消元把 A 变成上三角 U，消元乘数 m 写进下三角 L（对角线为 1），分解后 A = L·U。核心：第 k 列把第 k 行以下全部消成 0，m = U[i][k]/U[k][k]'; });
  yield W(700);
  for (let si = 0; si < steps.length; si++) {
    const s = steps[si];
    for (let j = 0; j < N; j++) uCells[s.k][j].setColor(CYAN, CYAN);
    yield S(() => { status.textContent = '第 ' + (si + 1) + ' 步：以 U[' + s.k + '][' + s.k + '] 为主元（青色），消第 ' + s.i + ' 行'; });
    yield W(600);
    yield S(() => { status.textContent = '乘数 m = U[' + s.i + '][' + s.k + '] ÷ U[' + s.k + '][' + s.k + '] = ' + fmt(s.m) + '，这一格写入 L[' + s.i + '][' + s.k + ']'; });
    yield W(450);
    setCell(lCells[s.i][s.k], s.m, AMBER);
    for (let j = s.k; j < N; j++) setCell(uCells[s.i][j], s.after[s.i][j], GOLD);
    yield S(() => { status.textContent = '行 ' + s.i + ' ← 行 ' + s.i + ' − ' + fmt(s.m) + ' × 行 ' + s.k + '：U[' + s.i + '][' + s.k + '] 消成 0，其余格更新（金色）'; });
    yield W(700);
    for (let j = 0; j < N; j++) uCells[s.k][j].setColor(DIM, DIM);
    setCell(lCells[s.i][s.k], s.m, VIOLET);
  }
  L.forEach((row, i) => row.forEach((v, j) => setCell(lCells[i][j], v, i === j ? CYAN : VIOLET)));
  U.forEach((row, i) => row.forEach((v, j) => setCell(uCells2[i][j], v, i > j ? DIM : GOLD)));
  yield S(() => { status.textContent = '消元完成：乘数 m 全部写入 L（对角线 1），上三角即为 U —— 检验 L·U = A'; });
  yield W(1000);
  yield S(() => { status.textContent = '验证 L·U：第 2 行 = 2×行1 + 行2 = (4,7,0) ✓；第 3 行 = (−1)×行1 + 7×行2 + 行3 = (−2,4,5) ✓ —— 分解成立'; });
  yield W(1100);
  yield S(() => { status.textContent = 'LU 分解演示完成：L·U = A ✓；一次分解、多次求解 —— 同一 A 换 100 个 b 也只消元一次（Ly=b、Ux=y 两次三角回代，复杂度 O(n³/3)）'; });
  yield W(1200);
  yield S(() => { status.textContent = '应用：解方程组、行列式（det = 对角积）、矩阵求逆、最小二乘正规方程'; });
  yield W(800);
}

function* runLU() {
  clearView();
  yield W(400);
  yield* luGen();
}

engine.queue(() => runLU());
panel.addButton('清空', () => { engine.clear(); clearView(); status.textContent = ''; });

scene.start(engine);
