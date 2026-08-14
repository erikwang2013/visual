// AlgorithmLibrary/QRDecomposition3D.js — QR 分解（Gram–Schmidt）：A = Q·R，Q 正交（列两两垂直、长度 1），R 上三角 —— 逐列「投影减法 + 归一化」（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('QRDecomposition3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GOLD = 0xfcd34d, CYAN = 0x22d3ee, DIM = 0x334155, ROSE = 0xfb7185, AMBER = 0xfbbf24, VIOLET = 0xa78bfa;
const status = panel.addStatus('就绪');

const A0 = [[1, 1, 0], [1, 0, 1], [0, 1, 1]];
const N = 3;

function gramSchmidt(A) {
  const n = A.length;
  const Q = Array.from({ length: n }, () => Array(n).fill(0));
  const R = Array.from({ length: n }, () => Array(n).fill(0));
  const colSteps = [];
  for (let j = 0; j < n; j++) {
    const cj = A.map(r => r[j]);
    let u = [...cj];
    const proj = [];
    for (let k = 0; k < j; k++) {
      const qk = Q.map(r => r[k]);
      const rkj = qk.reduce((s, q, i) => s + q * cj[i], 0);
      R[k][j] = rkj;
      const before = [...u];
      u = u.map((v, i) => v - rkj * qk[i]);
      proj.push({ k, rkj, before, after: [...u] });
    }
    const norm = Math.sqrt(u.reduce((s, v) => s + v * v, 0));
    R[j][j] = norm;
    const qj = u.map(v => v / norm);
    for (let i = 0; i < n; i++) Q[i][j] = qj[i];
    colSteps.push({ j, cj, proj, norm, u, qj });
  }
  return { Q, R, colSteps };
}
const { Q, R, colSteps } = gramSchmidt(A0);

const AX = j => 40 + j * 70;
const ARY = i => 600 - i * 32;
const QX = j => 450 + j * 70;
const RY = i => 436 - i * 28;
const UY = 486;

const cell = (v, x, y, sz = 38) => new VBox(scene, { w: sz, h: sz, d: sz, x, y, z: 0, label: String(v), color: DIM, emissive: DIM });
const aCells = A0.map((row, i) => row.map((v, j) => cell(v, AX(j), ARY(i))));
const qCells = A0.map((row, i) => row.map((v, j) => cell(0, QX(j), ARY(i))));
const rCells = A0.map((row, i) => row.map((v, j) => cell(0, AX(j), RY(i))));

const extras = [];
function addTemp(makeFn) { const o = makeFn(); extras.push(o); return o; }
function clearExtras() { extras.forEach(o => { try { o.remove(); } catch (e) {} }); extras.length = 0; }
const f2 = v => Math.round(v * 100) / 100;

function setCell(obj, v, color) { obj.setText(String(f2(v))); if (color) obj.setColor(color, color); }
function clearView() {
  clearExtras();
  A0.forEach((row, i) => row.forEach((v, j) => setCell(aCells[i][j], v, DIM)));
  qCells.forEach(row => row.forEach(c => setCell(c, 0, DIM)));
  rCells.forEach(row => row.forEach(c => setCell(c, 0, DIM)));
}

function* qrGen() {
  yield S(() => { status.textContent = 'QR 分解：把 A 拆成 Q·R —— Q 的列两两正交、长度 1，R 上三角；逐列「投影减法 + 归一化」'; });
  yield W(700);
  for (let j = 0; j < colSteps.length; j++) {
    const cs = colSteps[j];
    let uBoxesArr = null;
    for (let i = 0; i < N; i++) aCells[i][j].setColor(CYAN, CYAN);
    yield S(() => { status.textContent = '第 ' + (j + 1) + ' 列：c' + (j + 1) + ' = (' + cs.cj.map(f2).join(', ') + ')' + (j > 0 ? '，剥离旧投影' : '，直接归一化') + '（青色 = 当前列）'; });
    yield W(620);
    yield S(() => { status.textContent = j > 0 ? '正交化：u = cj − r1j·q1 − r2j·q2 − …，把重叠分量全部剥掉' : '第一列直接当方向归一化 —— 正交基的第一个成员'; });
    yield W(300);
    uBoxesArr = cs.cj.map((v, i) => addTemp(() => new VBox(scene, { w: 36, h: 36, d: 36, x: AX(i), y: UY, z: 0, label: String(f2(v)), color: DIM, emissive: DIM })));
    for (let k = 0; k < cs.proj.length; k++) {
      const p = cs.proj[k];
      for (let i = 0; i < N; i++) qCells[i][k].setColor(VIOLET, VIOLET);
      const rk = f2(p.rkj);
      setCell(rCells[k][j], rk, AMBER);
      yield S(() => { status.textContent = 'r' + (k + 1) + (j + 1) + ' = q' + (k + 1) + '·c' + (j + 1) + ' = ' + rk + ' → 写进 R（紫色 = 旧正交基，琥珀 = R 系数）'; });
      yield W(700);
      yield S(() => { status.textContent = '点积度量 c 在 q 方向的分量 —— 要全部减掉'; });
      yield W(300);
      p.before.forEach((v, i) => {
        if (Math.abs(v - p.after[i]) > 1e-9) uBoxesArr[i].setColor(ROSE, ROSE);
        setCell(uBoxesArr[i], p.after[i]);
      });
      yield S(() => { status.textContent = '投影减法：u ← u − ' + f2(p.rkj) + '·q' + (k + 1) + ' = (' + p.after.map(f2).join(', ') + ')（玫瑰 = 被改动）'; });
      yield W(650);
      for (let i = 0; i < N; i++) qCells[i][k].setColor(GOLD, GOLD);
    }
    setCell(rCells[j][j], cs.norm, GOLD);
    cs.qj.forEach((q, i) => setCell(qCells[i][j], q, GOLD));
    yield S(() => { status.textContent = '归一化：r' + (j + 1) + (j + 1) + ' = ‖u‖ = ' + f2(cs.norm) + '，q' + (j + 1) + ' = u/‖u‖，验证 ‖q‖² = 1（金色 = 归一化结果）'; });
    yield W(800);
    for (let i = 0; i < N; i++) aCells[i][j].setColor(DIM, DIM);
    if (uBoxesArr) { uBoxesArr.forEach(b => { try { b.remove(); } catch (e) {} }); uBoxesArr = null; }
  }
  const q1q2 = f2(Q[0][0] * Q[0][1] + Q[1][0] * Q[1][1] + Q[2][0] * Q[2][1]);
  for (let i = 0; i < N; i++) { qCells[i][0].setColor(VIOLET, VIOLET); qCells[i][1].setColor(AMBER, AMBER); qCells[i][2].setColor(CYAN, CYAN); }
  yield S(() => { status.textContent = '检验：q1·q2 = ' + q1q2 + ' ≈ 0，QᵀQ = I ✓ —— Q = [[0.71,0.41,-0.58],[0.71,-0.41,0.58],[0,0.82,0.58]]，R = [[1.41,0.71,0.71],[0,1.22,0.41],[0,0,1.15]]'; });
  yield W(1000);
  yield S(() => { status.textContent = '复杂度 O(n³)：每列投影 O(n²)；应用：最小二乘 Ax≈b 数值稳定、QR 迭代求特征值；Householder/Givens 为数值变体'; });
  yield W(1200);
  yield S(() => { status.textContent = 'QR 分解演示完成：A = Q·R ✓'; });
  yield W(400);
}

function* runQR() {
  clearView();
  yield W(400);
  yield* qrGen();
}

engine.queue(() => runQR());
panel.addButton('清空', () => { engine.clear(); clearView(); status.textContent = ''; });

scene.start(engine);
