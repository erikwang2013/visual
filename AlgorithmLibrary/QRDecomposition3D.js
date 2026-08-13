// AlgorithmLibrary/QRDecomposition3D.js — QR 分解（Gram–Schmidt）：A = Q·R，Q 正交（列两两垂直、长度 1），R 上三角 —— 逐列「投影减法 + 归一化」（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('QRDecomposition3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155, ROSE = 0xfb7185, VIOLET = 0xa78bfa, AMBER = 0xfbbf24;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：QR 分解 A = Q·R', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 700, y: 440, z: 0, color: GOLD, scale: 0.5, wrapChars: 8 });
const eqT = new VText(scene, { text: '', x: 700, y: 345, z: 0, color: PALETTE.textGlow, scale: 0.45, wrapChars: 8 });
const outT = new VText(scene, { text: '', x: 700, y: 345, z: 0, color: PALETTE.textGlow, scale: 0.45, wrapChars: 8 });

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
const ARY = i => 440 - i * 32;
const QX = j => 450 + j * 70;
const RY = i => 288 - i * 28;

const cell = (v, x, y, sz = 38) => new VBox(scene, { w: sz, h: sz, d: sz, x, y, z: 0, label: String(v), color: DIM, emissive: DIM });
const aCells = A0.map((row, i) => row.map((v, j) => cell(v, AX(j), ARY(i))));
const qCells = A0.map((row, i) => row.map((v, j) => cell(0, QX(j), ARY(i))));
const rCells = A0.map((row, i) => row.map((v, j) => cell(0, AX(j), RY(i))));
new VText(scene, { text: '左 A · 右 Q（正交列）· 下方 R（上三角）', x: 700, y: 490, z: 0, color: PALETTE.textDim, scale: 0.4, wrapChars: 10 });

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
  stageT.setText(''); eqT.setText(''); outT.setText('');
}

function* qrGen() {
  yield S(() => { hint.setText('把 A 拆成 Q·R：逐列投影减法 + 归一化'); stageT.setText('Gram–Schmidt：投影减法剥旧方向，再归一化成单位向量'); });
  yield W(700);
  for (let j = 0; j < colSteps.length; j++) {
    const cs = colSteps[j];
    let uBoxesArr = null;
    for (let i = 0; i < N; i++) aCells[i][j].setColor(CYAN, CYAN);
    yield S(() => stageT.setText('第 ' + (j + 1) + ' 列：c' + (j + 1) + ' = (' + cs.cj.map(f2).join(', ') + ')' + (j > 0 ? '，剥离旧投影' : '，直接归一化')));
    yield W(620);
    yield S(() => hint.setText(j > 0 ? '正交化：u = cj − r1j·q1 − r2j·q2 − …，重叠分量全剥掉' : '第一列当方向直接归一化 —— 正交基第一成员'));
    yield W(300);
    uBoxesArr = cs.cj.map((v, i) => addTemp(() => new VBox(scene, { w: 36, h: 36, d: 36, x: AX(i), y: 320, z: 0, label: String(f2(v)), color: DIM, emissive: DIM })));
    eqT.setText('u = c' + (j + 1) + ' = (' + cs.cj.map(f2).join(', ') + ')');
    for (let k = 0; k < cs.proj.length; k++) {
      const p = cs.proj[k];
      for (let i = 0; i < N; i++) qCells[i][k].setColor(VIOLET, VIOLET);
      const rk = f2(p.rkj);
      setCell(rCells[k][j], rk, AMBER);
      yield S(() => stageT.setText('r' + (k + 1) + (j + 1) + ' = q' + (k + 1) + '·c' + (j + 1) + ' = ' + rk + ' → 写进 R'));
      yield W(700);
      yield S(() => hint.setText('点积度量 c 在 q 方向的分量 —— 要全部减掉'));
      yield W(300);
      p.before.forEach((v, i) => {
        if (Math.abs(v - p.after[i]) > 1e-9) uBoxesArr[i].setColor(ROSE, ROSE);
        setCell(uBoxesArr[i], p.after[i]);
      });
      eqT.setText('u = u − ' + f2(p.rkj) + '·q' + (k + 1) + ' = (' + p.after.map(f2).join(', ') + ')', { color: ROSE });
      yield S(() => stageT.setText('投影减法：u ← u − r' + (k + 1) + (j + 1) + '·q' + (k + 1) + '（玫瑰 = 被改动）'));
      yield W(650);
      for (let i = 0; i < N; i++) qCells[i][k].setColor(GOLD, GOLD);
    }
    setCell(rCells[j][j], cs.norm, GOLD);
    cs.qj.forEach((q, i) => setCell(qCells[i][j], q, GOLD));
    yield S(() => stageT.setText('归一化：r' + (j + 1) + (j + 1) + ' = ‖u‖ = ' + f2(cs.norm) + '，q' + (j + 1) + ' = u/‖u‖'));
    yield W(800);
    yield S(() => hint.setText('归一化：除以模长，验证 ‖q‖² = 1'));
    yield W(300);
    for (let i = 0; i < N; i++) aCells[i][j].setColor(DIM, DIM);
    if (uBoxesArr) { uBoxesArr.forEach(b => { try { b.remove(); } catch (e) {} }); uBoxesArr = null; }
    eqT.setText('');
  }
  const q1q2 = f2(Q[0][0] * Q[0][1] + Q[1][0] * Q[1][1] + Q[2][0] * Q[2][1]);
  for (let i = 0; i < N; i++) { qCells[i][0].setColor(VIOLET, VIOLET); qCells[i][1].setColor(AMBER, AMBER); qCells[i][2].setColor(CYAN, CYAN); }
  yield S(() => { eqT.setText(''); outT.setText('检验：q1·q2 = ' + q1q2 + ' ≈ 0，QᵀQ = I ✓'); status.textContent = 'QR 分解：Q = [[0.71,0.41,-0.58],[0.71,-0.41,0.58],[0,0.82,0.58]]，R = [[1.41,0.71,0.71],[0,1.22,0.41],[0,0,1.15]]'; });
  yield W(1000);
  yield S(() => { hint.setText('应用：最小二乘 Ax≈b 数值稳定、QR 迭代求特征值'); outT.setText('复杂度 O(n³)：每列投影 O(n²)；Householder/Givens 是数值变体'); });
  yield W(1200);
  yield S(() => { hint.setText('QR 分解完成：A = Q·R ✓'); outT.setText(''); });
  yield W(400);
}

function* runQR() {
  clearView();
  hint.setText('QR 分解：逐列投影减法 + 归一化');
  yield W(400);
  yield* qrGen();
}

engine.queue(() => runQR());
panel.addButton('清空', () => { engine.clear(); clearView(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；青色 = 当前列，紫色 = 旧正交基，玫瑰 = 投影减法，琥珀 = R 系数，金色 = 归一化结果）');

scene.start(engine);
