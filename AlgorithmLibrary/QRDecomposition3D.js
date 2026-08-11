// AlgorithmLibrary/QRDecomposition3D.js — QR 分解（Gram–Schmidt）：A = Q·R，Q 正交（列两两垂直、长度 1），R 上三角 —— 最小二乘与特征值算法的基石
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('QRDecomposition3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, ROSE = 0xfb7185, CYAN = 0x67e8f9, VIOLET = 0xa78bfa, AMBER = 0xfbbf24;
const hint = new VText(scene, { text: '点击「运行 QR 分解」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

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

const AX = j => -160 + j * 70;
const ARY = i => 185 - i * 50;
const QX = j => 250 + j * 70;
const RY = i => -65 - i * 50;

const cell = (v, x, y, sz = 38) => new VBox(scene, { w: sz, h: sz, d: sz, x, y, z: 0, label: String(v), color: DIM, emissive: DIM });
const aCells = A0.map((row, i) => row.map((v, j) => cell(v, AX(j), ARY(i))));
const qCells = A0.map((row, i) => row.map((v, j) => cell(0, QX(j), ARY(i))));
const rCells = A0.map((row, i) => row.map((v, j) => cell(0, AX(j), RY(i))));
new VText(scene, { text: 'QR 分解：A = Q × R —— Gram–Schmidt 逐列：先「投影减法」剥离旧方向，再「归一化」成单位向量', x: 0, y: 225, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: '左 = A，右 = Q（列两两垂直、长度 1）；中间 = 余量 u（玫瑰 = 刚被剥掉的投影）；下方 = R 上三角', x: 0, y: -210, z: 0, color: PALETTE.textDim, scale: 0.62 });
const stageT = new VText(scene, { text: '', x: 0, y: 255, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: 45, z: 0, color: PALETTE.textGlow, scale: 0.58 });
const outT = new VText(scene, { text: '', x: 0, y: -245, z: 0, color: PALETTE.textGlow, scale: 0.62 });

const extras = [];
function addTemp(makeFn) { const o = makeFn(); extras.push(o); return o; }
function clearExtras() { extras.forEach(o => { try { o.remove(); } catch (e) {} }); extras.length = 0; }
const f2 = v => Math.round(v * 100) / 100;
const uBoxes = vals => vals.map((v, i) => addTemp(() =>
  new VBox(scene, { w: 36, h: 36, d: 36, x: AX(i), y: 15, z: 0, label: String(f2(v)), color: DIM, emissive: DIM })));

function setCell(obj, v, color) { obj.setText(String(v)); if (color) obj.setColor(color, color); }
function resetAll() {
  engine.clear();
  clearExtras();
  A0.forEach((row, i) => row.forEach((v, j) => { setCell(aCells[i][j], v, DIM); }));
  qCells.forEach(row => row.forEach(c => { setCell(c, 0, DIM); }));
  rCells.forEach(row => row.forEach(c => { setCell(c, 0, DIM); }));
  stageT.setText(''); eqT.setText(''); outT.setText('');
}

function runQR() {
  resetAll();
  hint.setText('把 A 拆成 Q·R：第 1 列直接归一化；之后每列先减掉对已有正交基的投影（玫瑰），再归一化（金色）—— 逐列拼出正交基');
  colSteps.forEach((cs, j) => {
    C(620, () => {
      for (let i = 0; i < N; i++) aCells[i][j].setColor(CYAN, CYAN);
      stageT.setText(`第 ${j + 1} 列：取出 c${j + 1} = (${cs.cj.join(', ')})${j > 0 ? ' —— 准备剥离对 q1…q' + j + ' 的投影' : ' —— 第一列没有旧基可投影'}`);
      hint.setText(j > 0 ? '新列要与所有旧基正交：u = cj − r1j·q1 − r2j·q2 − …，把「重叠的部分」全部剥掉' : '第一列当方向直接归一化 —— 正交基的第一个成员诞生');
    });
    C(500, () => {
      cs._u = uBoxes(cs.cj);
      eqT.setText(`u = c${j + 1} = (${cs.cj.map(f2).join(', ')})`);
    });
    cs.proj.forEach((p, k) => {
      C(700, () => {
        for (let i = 0; i < N; i++) qCells[i][k].setColor(VIOLET, VIOLET);
        const rk = f2(p.rkj);
        setCell(rCells[k][j], rk, AMBER);
        stageT.setText(`投影系数 r${k + 1}${j + 1} = q${k + 1}·c${j + 1} = ${rk} —— 写进 R 第 ${k + 1} 行`);
        hint.setText('点积 = 对应分量相乘再求和，度量「c 在 q 方向上的分量」—— 这部分要全部减掉');
      });
      C(650, () => {
        p.before.forEach((v, i) => {
          if (Math.abs(v - p.after[i]) > 1e-9) cs._u[i].setColor(ROSE, ROSE);
          setCell(cs._u[i], f2(p.after[i]));
        });
        eqT.setText(`u = u − ${f2(p.rkj)}·q${k + 1} = (${p.after.map(f2).join(', ')})`, { color: ROSE });
        stageT.setText(`投影减法：u ← u − r${k + 1}${j + 1}·q${k + 1} —— 玫瑰色 = 刚被改动的分量`);
      });
      C(300, () => {
        for (let i = 0; i < N; i++) qCells[i][k].setColor(GOLD, GOLD);
      });
    });
    C(800, () => {
      setCell(rCells[j][j], f2(cs.norm), GOLD);
      cs.qj.forEach((q, i) => setCell(qCells[i][j], f2(q), GOLD));
      stageT.setText(`归一化：r${j + 1}${j + 1} = ‖u‖ = ${f2(cs.norm)}，q${j + 1} = u / ‖u‖ = (${cs.qj.map(f2).join(', ')}) —— 填入 Q 第 ${j + 1} 列`);
      hint.setText('归一化 = 除以模长把长度变成 1 —— 验证：‖q‖² = 各分量平方和 = 1');
    });
    C(350, () => {
      for (let i = 0; i < N; i++) aCells[i][j].setColor(DIM, DIM);
      if (cs._u) { cs._u.forEach(b => { try { b.remove(); } catch (e) {} }); cs._u = null; }
      eqT.setText('');
    });
  });
  C(1000, () => {
    const q1q2 = f2(Q[0][0] * Q[0][1] + Q[1][0] * Q[1][1] + Q[2][0] * Q[2][1]);
    for (let i = 0; i < N; i++) { qCells[i][0].setColor(VIOLET, VIOLET); qCells[i][1].setColor(AMBER, AMBER); qCells[i][2].setColor(CYAN, CYAN); }
    outT.setText(`正交检验：q1·q2 = ${q1q2} ≈ 0，‖q1‖ = ‖q2‖ = ‖q3‖ = 1 —— QᵀQ = I，A = Q·R 精确还原`);
    status.textContent = `QR 分解：Q = [[0.71,0.41,−0.58],[0.71,−0.41,0.58],[0,0.82,0.58]]，R = [[1.41,0.71,0.71],[0,1.22,0.41],[0,0,1.15]]`;
    hint.setText('为什么用 QR？最小二乘 Ax≈b：Qᵀ 作用后变成 R·x = Qᵀb —— 上三角一次回代，正交性保证数值稳定');
  });
  C(1200, () => {
    outT.setText('复杂度 O(n³)：每列投影 O(n²)。应用：最小二乘、QR 迭代求特征值、Householder/Given 反射是其数值变体');
    hint.setText('对比 LU：LU 解方阵更快，QR 对病态矩阵更稳 —— 科学计算里 QR 是更可靠的默认选择');
  });
}

panel.addButton('运行 QR 分解', runQR);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；青色 = 当前列，紫色 = 旧正交基，玫瑰 = 投影减法，琥珀 = R 系数，金色 = 归一化结果）');

scene.start(engine);
