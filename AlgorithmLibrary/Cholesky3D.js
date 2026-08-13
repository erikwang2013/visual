// AlgorithmLibrary/Cholesky3D.js — Cholesky 分解：对称正定阵 A = L·Lᵀ —— 取「带平方根的下三角」，比 LU 少一半乘除法（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Cholesky3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155, ROSE = 0xfb7185, VIOLET = 0xa78bfa, AMBER = 0xfbbf24;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：Cholesky 分解 A = L·Lᵀ', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 320, y: 555, z: 0, color: GOLD, scale: 0.72, wrapChars: 7 });
const eqT = new VText(scene, { text: '', x: 700, y: 405, z: 0, color: PALETTE.textGlow, scale: 0.45, wrapChars: 8 });
const outT = new VText(scene, { text: '', x: 700, y: 330, z: 0, color: PALETTE.textGlow, scale: 0.45, wrapChars: 8 });

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
const ARY = i => 420 - i * 50;
const LX = j => 290 + j * 70;
const cell = (v, x, y, sz = 40) => new VBox(scene, { w: sz, h: sz, d: sz, x, y, z: 0, label: String(v), color: DIM, emissive: DIM });
const aCells = A0.map((row, i) => row.map((v, j) => cell(v, AX(j), ARY(i))));
const lCells = A0.map((row, i) => row.map((v, j) => cell(0, LX(j), ARY(i))));
new VText(scene, { text: 'Cholesky：对称正定阵 A = L × Lᵀ —— L 是下三角，对角元开平方根。L 与 Lᵀ 互为镜像，只算一半', x: 700, y: 520, z: 0, color: PALETTE.textDim, scale: 0.42, wrapChars: 8 });
new VText(scene, { text: '左 = A（对称正定），右 = L（下三角）—— 逐格填：先扣已填项，对角开方（金），非对角除以对角（琥珀）', x: 700, y: 470, z: 0, color: PALETTE.textDim, scale: 0.42, wrapChars: 8 });
const cellColor = (i, j) => (i === j ? GOLD : AMBER);

function fmtV(v) { return Math.abs(Math.round(v) - v) < 1e-6 ? String(Math.round(v)) : String(Math.round(v * 1000) / 1000); }
function setCell(obj, v, color) { obj.setText(fmtV(v)); if (color) obj.setColor(color, color); }
function clearView() {
  A0.forEach((row, i) => row.forEach((v, j) => setCell(aCells[i][j], v, DIM)));
  lCells.forEach(row => row.forEach(c => setCell(c, 0, DIM)));
  stageT.setText(''); eqT.setText(''); outT.setText('');
}

function* cholGen() {
  yield S(() => { hint.setText('核心：A 的第 (i,j) 格 = L 第 i 行与 L 第 j 行的点积 —— 所以 L[i][j] 可从 A[i][j] 反推，对角元先就位'); stageT.setText('自左上往右下填：每个新格只依赖「它左上方已就位的格」—— 行与列同步推进'); });
  yield W(700);
  for (let t = 0; t < steps.length; t++) {
    const s = steps[t];
    const refs = [];
    s.terms.forEach(({ k }) => {
      if (!refs.some(([ri, rj]) => ri === s.i && rj === k)) refs.push([s.i, k]);
      if (s.j !== s.i && !refs.some(([ri, rj]) => ri === s.j && rj === k)) refs.push([s.j, k]);
    });
    aCells[s.i][s.j].setColor(CYAN, CYAN);
    yield S(() => stageT.setText('填 L[' + s.i + '][' + s.j + ']：从 A[' + s.i + '][' + s.j + '] = ' + A0[s.i][s.j] + ' 出发，扣掉已填项的贡献'));
    yield W(600);
    refs.forEach(([ri, rj]) => lCells[ri][rj].setColor(ROSE, ROSE));
    const v = Math.round(s.v * 1000) / 1000;
    setCell(lCells[s.i][s.j], v, cellColor(s.i, s.j));
    if (s.diag) {
      eqT.setText('s = ' + A0[s.i][s.j] + s.terms.map(({ k }) => ' − L[' + s.i + '][' + k + ']²').join('') + ' = ' + fmtV(s.s) + ' → L[' + s.i + '][' + s.j + '] = √' + fmtV(s.s) + ' = ' + v, { color: GOLD });
      yield S(() => { stageT.setText('对角元：扣掉 ΣL² 后开平方根 —— 正定性保证根号内恒为正'); hint.setText('为什么能开方？正定阵的所有主子式 > 0，每一步根号下的数都严格大于 0 —— 分解永不失败'); });
    } else {
      eqT.setText('s = ' + A0[s.i][s.j] + s.terms.map(({ k }) => ' − L[' + s.i + '][' + k + ']·L[' + s.j + '][' + k + ']').join('') + ' = ' + fmtV(s.s) + ' → L[' + s.i + '][' + s.j + '] = s / L[' + s.j + '][' + s.j + '] = ' + v, { color: AMBER });
      yield S(() => stageT.setText('非对角元：扣掉交叉积后除以 L[' + s.j + '][' + s.j + '] —— 玫瑰色 = 被引用的已填项'));
    }
    yield W(700);
    aCells[s.i][s.j].setColor(DIM, DIM);
    refs.forEach(([ri, rj]) => lCells[ri][rj].setColor(cellColor(ri, rj), cellColor(ri, rj)));
    eqT.setText('');
  }
  yield S(() => { outT.setText('L = [[2,0,0],[6,1,0],[-8,5,3]] —— 验证 L·Lᵀ = A ✓：第 1 行 (4,12,-16) ✓，第 2 行 (12,37,-43) ✓'); status.textContent = 'Cholesky 分解：L = [[2,0,0],[6,1,0],[-8,5,3]]（L·Lᵀ = A 验证通过）'; });
  yield W(1000);
  yield S(() => { hint.setText('用途：解 Ax=b 只需一次分解、两次三角回代 —— 比 LU 快一倍，且 L 直接给出「平方根协方差」矩阵'); outT.setText('复杂度 O(n³/6) = LU 一半。应用：高斯过程、Kalman 滤波、AᵀA 正规方程、MCMC'); });
  yield W(1200);
  yield S(() => { hint.setText('Cholesky 完成：L·Lᵀ = A ✓'); outT.setText(''); });
  yield W(400);
}

function* runChol() {
  clearView();
  hint.setText('Cholesky：逐格扣减 + 对角开方');
  yield W(400);
  yield* cholGen();
}

engine.queue(() => runChol());
panel.addButton('清空', () => { engine.clear(); clearView(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；青色 = 当前格，玫瑰 = 引用的已填项，金色 = 对角元开方，琥珀 = 非对角元除对角）');

scene.start(engine);
