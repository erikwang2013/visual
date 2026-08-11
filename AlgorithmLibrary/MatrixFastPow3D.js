// AlgorithmLibrary/MatrixFastPow3D.js — 矩阵快速幂：10 = 1010₂，二进制位决定「乘不乘」，每步矩阵自乘 —— 线性递推（斐波那契）秒算
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('MatrixFastPow3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, ROSE = 0xfb7185, CYAN = 0x67e8f9, VIOLET = 0xa78bfa, AMBER = 0xfbbf24;
const hint = new VText(scene, { text: '点击「运行矩阵快速幂」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const M0 = [[1, 1], [1, 0]];
const I = [[1, 0], [0, 1]];
const mm = (A, B) => [
  [A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1]],
  [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1]]
];
const M2 = mm(M0, M0), M4 = mm(M2, M2), M8 = mm(M4, M4), M16 = mm(M8, M8);
const M5 = mm(M2, M0), M10 = mm(M5, M5);
const bits = [1, 0, 1, 0];
const mSeq = [M0, M2, M4, M8, M16];
const rSeq = [M0, M2, M5, M10];
const fmtS = m => `[[${m[0][0]},${m[0][1]}],[${m[1][0]},${m[1][1]}]]`;

const bitBoxes = bits.map((b, i) => new VBox(scene, { w: 55, h: 46, d: 46, x: -150 + i * 75, y: 190, z: 0, label: String(b), color: b ? AMBER : DIM, emissive: b ? AMBER : DIM }));
new VText(scene, { text: '指数 10 = 1010₂（左 → 右逐位扫描）', x: 60, y: 235, z: 0, color: PALETTE.textDim, scale: 0.55 });
const mGrid = [[0, 0], [0, 0]].map((row, i) => row.map((v, j) => new VBox(scene, { w: 44, h: 44, d: 44, x: -15 + j * 46, y: 100 - i * 46, z: 0, label: '', color: DIM, emissive: DIM })));
const resGrid = [[0, 0], [0, 0]].map((row, i) => row.map((v, j) => new VBox(scene, { w: 44, h: 44, d: 44, x: -15 + j * 46, y: -25 - i * 46, z: 0, label: '', color: DIM, emissive: DIM })));
new VText(scene, { text: 'M 当前幂', x: -120, y: 60, z: 0, color: VIOLET, scale: 0.5 });
new VText(scene, { text: '结果 res', x: -120, y: -65, z: 0, color: AMBER, scale: 0.5 });
new VText(scene, { text: '矩阵快速幂：M 逐位自乘（M², M⁴, M⁸…），二进制位 = 1 时把 M 乘进 res —— 只需 log₂n 次乘法', x: 0, y: 255, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: '上 = M 的当前幂（每轮平方），下 = 结果 res（位 1 才乘）。M = [[1,1],[1,0]] 是斐波那契的「递推矩阵」', x: 0, y: -205, z: 0, color: PALETTE.textDim, scale: 0.62 });
const stageT = new VText(scene, { text: '', x: 0, y: 270, z: 0, color: GOLD, scale: 0.7 });
const eqT = new VText(scene, { text: '', x: 0, y: 145, z: 0, color: PALETTE.textGlow, scale: 0.58 });
const outT = new VText(scene, { text: '', x: 0, y: -245, z: 0, color: PALETTE.textGlow, scale: 0.62 });

function setGrid(grid, mat, color) {
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { grid[i][j].setText(String(mat[i][j])); if (color) grid[i][j].setColor(color, color); }
}
function resetAll() {
  engine.clear();
  bitBoxes.forEach((b, i) => { b.setColor(bits[i] ? AMBER : DIM, bits[i] ? AMBER : DIM); b.setText(String(bits[i])); });
  setGrid(mGrid, M0, DIM); setGrid(resGrid, I, DIM);
  stageT.setText(''); eqT.setText(''); outT.setText('');
}

function runMatrixFastPow() {
  resetAll();
  hint.setText('朴素思路：乘 10 次。快速幂：把 10 写成二进制 1010₂ —— 位 1 才乘，位 0 只平方，4 轮搞定');
  C(600, () => {
    setGrid(mGrid, M0, VIOLET);
    setGrid(resGrid, I, DIM);
    eqT.setText(`M = ${fmtS(M0)}，res = I = [[1,0],[0,1]]（单位阵）`, { color: PALETTE.textGlow });
    stageT.setText('准备：res 从单位阵 I 出发 —— 单位阵是矩阵乘法里的「1」');
    hint.setText('关键：指数只看二进制位。10 = 8 + 2 = 1010₂，所以 M¹⁰ = M⁸ × M² —— 把幂拆成二进制');
  });
  rSeq.forEach((rMat, i) => {
    const bit = bits[i];
    C(600, () => {
      bitBoxes[i].setColor(CYAN, CYAN);
      eqT.setText(`第 ${i + 1} 位：${bit}${bit ? '（要乘！）' : '（不乘）'}`, { color: bit ? AMBER : PALETTE.textDim });
      stageT.setText(`扫描二进制第 ${i + 1} 位 = ${bit} —— 这一位决定 res 是否乘上 M`);
    });
    C(750, () => {
      setGrid(mGrid, mSeq[i + 1], VIOLET);
      eqT.setText(`M ← M × M = ${fmtS(mSeq[i + 1])} —— 无论位是几，M 每轮都自乘一次`, { color: VIOLET });
      stageT.setText(`M 自乘：M = ${fmtS(mSeq[i])}² = ${fmtS(mSeq[i + 1])} —— 平方成本 O(8)，4 轮共 4 次乘法`);
      hint.setText('平方 = 幂次翻倍：M, M², M⁴, M⁸ —— 就像把指数左移一位，正好对应二进制位');
    });
    C(750, () => {
      setGrid(resGrid, rMat, bit ? GOLD : DIM);
      eqT.setText(bit ? `位 = 1 → res ← res × M = ${fmtS(rMat)}` : `位 = 0 → res 保持 ${fmtS(rMat)}`, { color: bit ? GOLD : PALETTE.textGlow });
      stageT.setText(bit ? `res 乘上当前 M：${fmtS(rMat)} —— 金色 = 本位的贡献` : `这一位是 0，res 不乘 —— 只把 M 平方完事`);
    });
    C(300, () => { bitBoxes[i].setColor(bit ? AMBER : DIM, bit ? AMBER : DIM); });
  });
  C(1000, () => {
    setGrid(resGrid, M10, GOLD);
    outT.setText(`res = ${fmtS(M10)} = M¹⁰ ✓ —— 只有 4 次矩阵乘法（朴素要 10 次）`);
    status.textContent = `矩阵快速幂：M¹⁰ = [[89,55],[55,34]]（4 次乘法 vs 朴素 10 次）`;
    hint.setText('斐波那契彩蛋：M^n = [[F(n+1),F(n)],[F(n),F(n−1)]] —— res[0][1] = 55 = F(10)，res[0][0] = 89 = F(11)');
  });
  C(1200, () => {
    outT.setText(`应用：线性递推（斐波那契 O(log n)）、马尔可夫链、图论路径计数、差分方程 —— 任何「x_{n+1} = A·x_n」都能用`);
    hint.setText('整数快速幂同理（模幂）：RSA 的 b^e mod m 也是逐位平方 —— 密码学里无处不在');
  });
}

panel.addButton('运行矩阵快速幂', runMatrixFastPow);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；紫 = M 自乘序列，金 = res 累乘，琥珀 = 二进制位 1，青 = 当前位）');

scene.start(engine);
