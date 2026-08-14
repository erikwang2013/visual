// AlgorithmLibrary/Cholesky3D.js — Cholesky 分解：对称正定阵 A = L·Lᵀ —— 取「带平方根的下三角」，比 LU 少一半乘除法（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Cholesky3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GOLD = 0xfcd34d, CYAN = 0x22d3ee, DIM = 0x334155, ROSE = 0xfb7185, AMBER = 0xfbbf24;
const status = panel.addStatus('就绪');

const A0 = [[4, 12, -16], [12, 37, -43], [-16, -43, 98]];
const N = 3;

function cholesky(A) {
  const n = A.length;
  const L = Array.from({ length: n }, () => Array(n).fill(0));
  const steps = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = A[i][j];
      const terms = [];
      for (let k = 0; k < j; k++) { const t = L[i][k] * L[j][k]; s -= t; terms.push({ k, t }); }
      const v = (i === j) ? Math.sqrt(s) : s / L[j][j];
      L[i][j] = v;
      steps.push({ i, j, s, v, terms, diag: i === j });
    }
  }
  return { L, steps };
}
const { L, steps } = cholesky(A0);

const AX = j => 40 + j * 70;
const ARY = i => 460 - i * 50;
const LX = j => 290 + j * 70;
const cell = (v, x, y, sz = 40) => new VBox(scene, { w: sz, h: sz, d: sz, x, y, z: 0, label: String(v), color: DIM, emissive: DIM });
const aCells = A0.map((row, i) => row.map((v, j) => cell(v, AX(j), ARY(i))));
const lCells = A0.map((row, i) => row.map((v, j) => cell(0, LX(j), ARY(i))));
const cellColor = (i, j) => (i === j ? GOLD : AMBER);

function fmtV(v) { return Math.abs(Math.round(v) - v) < 1e-6 ? String(Math.round(v)) : String(Math.round(v * 1000) / 1000); }
function setCell(obj, v, color) { obj.setText(fmtV(v)); if (color) obj.setColor(color, color); }
function clearView() {
  A0.forEach((row, i) => row.forEach((v, j) => setCell(aCells[i][j], v, DIM)));
  lCells.forEach(row => row.forEach(c => setCell(c, 0, DIM)));
}

function* cholGen() {
  yield S(() => { status.textContent = 'Cholesky 分解：对称正定阵 A = L × Lᵀ，L 为下三角、对角元开平方根 —— 只算一半，比 LU 少一半乘除法'; });
  yield W(700);
  for (let t = 0; t < steps.length; t++) {
    const s = steps[t];
    const refs = [];
    s.terms.forEach(({ k }) => {
      if (!refs.some(([ri, rj]) => ri === s.i && rj === k)) refs.push([s.i, k]);
      if (s.j !== s.i && !refs.some(([ri, rj]) => ri === s.j && rj === k)) refs.push([s.j, k]);
    });
    aCells[s.i][s.j].setColor(CYAN, CYAN);
    yield S(() => { status.textContent = '填 L[' + s.i + '][' + s.j + ']：从 A[' + s.i + '][' + s.j + '] = ' + A0[s.i][s.j] + ' 出发，扣掉已填项的贡献（青色 = 当前格）'; });
    yield W(600);
    refs.forEach(([ri, rj]) => lCells[ri][rj].setColor(ROSE, ROSE));
    const v = Math.round(s.v * 1000) / 1000;
    setCell(lCells[s.i][s.j], v, cellColor(s.i, s.j));
    if (s.diag) {
      yield S(() => { status.textContent = '对角元：s = ' + A0[s.i][s.j] + s.terms.map(({ k }) => ' − L[' + s.i + '][' + k + ']²').join('') + ' = ' + fmtV(s.s) + ' → L[' + s.i + '][' + s.j + '] = √' + fmtV(s.s) + ' = ' + v + '（正定阵主子式恒正，根号内必为正）'; });
    } else {
      yield S(() => { status.textContent = '非对角元：扣掉交叉积后除以对角 L[' + s.j + '][' + s.j + ']（玫瑰 = 被引用的已填项）'; });
    }
    yield W(700);
    aCells[s.i][s.j].setColor(DIM, DIM);
    refs.forEach(([ri, rj]) => lCells[ri][rj].setColor(cellColor(ri, rj), cellColor(ri, rj)));
  }
  yield S(() => { status.textContent = 'L = [[2,0,0],[6,1,0],[-8,5,3]] —— 验证 L·Lᵀ = A ✓：第 1 行 (4,12,-16) ✓、第 2 行 (12,37,-43) ✓、第 3 行 (-16,-43,98) ✓'; });
  yield W(800);
  yield S(() => { status.textContent = '复杂度 O(n³/6) ≈ LU 的一半；应用：解 Ax=b 一次分解两次回代、Kalman 滤波、AᵀA 正规方程、MCMC'; });
  yield W(1000);
  yield S(() => { status.textContent = 'Cholesky 分解演示完成：L·Lᵀ = A ✓'; });
  yield W(400);
}

function* runChol() {
  clearView();
  yield W(400);
  yield* cholGen();
}

engine.queue(() => runChol());
panel.addButton('清空', () => { engine.clear(); clearView(); status.textContent = ''; });

scene.start(engine);
