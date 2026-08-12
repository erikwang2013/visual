// AlgorithmLibrary/MatrixFastPow3D.js — 矩阵快速幂：10=1010₂ 低位优先，位=1 时 res×M、M 每轮自乘，4 轮得 M¹⁰=[[89,55],[55,34]]（斐波那契 O(log n)）（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('MatrixFastPow3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155, VIOLET = 0xa78bfa, AMBER = 0xfbbf24;
const hint = new VText(scene, { text: '点击「运行演示」开始：矩阵快速幂 M^10', x: 0, y: 250, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 270, z: 0, color: GOLD, scale: 0.7 });
const eqT = new VText(scene, { text: '', x: 0, y: 145, z: 0, color: PALETTE.textGlow, scale: 0.58 });
const outT = new VText(scene, { text: '', x: 0, y: -245, z: 0, color: PALETTE.textGlow, scale: 0.62 });

const M0 = [[1, 1], [1, 0]];
const I = [[1, 0], [0, 1]];
const mm = (a, b) => [
  [a[0][0] * b[0][0] + a[0][1] * b[1][0], a[0][0] * b[0][1] + a[0][1] * b[1][1]],
  [a[1][0] * b[0][0] + a[1][1] * b[1][0], a[1][0] * b[0][1] + a[1][1] * b[1][1]]
];
const M1 = M0, M2 = mm(M1, M1), M4 = mm(M2, M2), M8 = mm(M4, M4), M16 = mm(M8, M8);
const M10 = mm(M2, M8);
const bits = [0, 1, 0, 1];           // 10 = 1010₂，低位优先：2^1 和 2^3 是 1
const mSeq = [M1, M2, M4, M8, M16];  // 每轮平方后 M 的值（第 i 轮：mSeq[i] → mSeq[i+1]）
const rSeq = [I, I, M2, M2, M10];    // 每轮结束后 res 的值（位=1 才变化）

const bitBoxes = bits.map((b, i) => new VBox(scene, { w: 55, h: 46, d: 46, x: -150 + i * 75, y: 190, z: 0, label: String(b), color: b ? AMBER : DIM, emissive: b ? AMBER : DIM }));
new VText(scene, { text: '指数 10 = 1010₂（左→右 = 低位→高位）', x: 60, y: 200, z: 0, color: PALETTE.textDim, scale: 0.55 });
const mGrid = [[0, 0], [0, 0]].map((row, i) => row.map((v, j) => new VBox(scene, { w: 44, h: 44, d: 44, x: -15 + j * 46, y: 100 - i * 46, z: 0, label: '', color: DIM, emissive: DIM })));
const resGrid = [[0, 0], [0, 0]].map((row, i) => row.map((v, j) => new VBox(scene, { w: 44, h: 44, d: 44, x: -15 + j * 46, y: -25 - i * 46, z: 0, label: '', color: DIM, emissive: DIM })));
new VText(scene, { text: 'M 当前幂', x: -120, y: 60, z: 0, color: VIOLET, scale: 0.5 });
new VText(scene, { text: '结果 res', x: -120, y: -65, z: 0, color: AMBER, scale: 0.5 });
new VText(scene, { text: '矩阵快速幂：M 逐位自乘，位=1 时乘进 res', x: 0, y: 310, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: '上 = M 的当前幂（每轮平方），下 = 结果 res（位 1 才乘）。M = [[1,1],[1,0]] 是斐波那契的「递推矩阵」', x: 0, y: -205, z: 0, color: PALETTE.textDim, scale: 0.62 });
const fmtS = m => '[[' + m[0][0] + ',' + m[0][1] + '],[' + m[1][0] + ',' + m[1][1] + ']]';

function setGrid(grid, mat, color) {
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { grid[i][j].setText(String(mat[i][j])); if (color) grid[i][j].setColor(color, color); }
}
function clearView() {
  bitBoxes.forEach((b, i) => { b.setColor(bits[i] ? AMBER : DIM, bits[i] ? AMBER : DIM); b.setText(String(bits[i])); });
  setGrid(mGrid, M1, DIM); setGrid(resGrid, I, DIM);
  stageT.setText(''); eqT.setText(''); outT.setText('');
}

function* mfpGen() {
  yield S(() => { hint.setText('朴素要乘 10 次。快速幂：10 = 1010₂ —— 位 1 才乘，位 0 只平方，4 轮搞定'); stageT.setText('M = ' + fmtS(M1) + '，res = I = [[1,0],[0,1]]（单位阵是矩阵乘法里的「1」）'); });
  yield W(700);
  for (let i = 0; i < 4; i++) {
    const bit = bits[i];
    bitBoxes[i].setColor(CYAN, CYAN);
    eqT.setText('扫描第 ' + (i + 1) + ' 位（2^' + i + '）= ' + bit + (bit ? '（要乘！）' : '（不乘）'));
    yield S(() => stageT.setText('这一位决定 res 是否乘上 M；但 M 无论位是几，每轮都自乘一次'));
    yield W(420);
    setGrid(mGrid, mSeq[i + 1], VIOLET);
    eqT.setText('M ← M × M = ' + fmtS(mSeq[i + 1]) + '（平方，幂次翻倍）');
    yield S(() => stageT.setText('M 自乘：M = ' + fmtS(mSeq[i]) + '² = ' + fmtS(mSeq[i + 1]) + ' —— 平方成本 8 次标量乘，恰好对应二进制位的「翻倍」'));
    yield W(550);
    if (bit) {
      setGrid(resGrid, rSeq[i + 1], GOLD);
      eqT.setText('位 = 1 → res ← res × M = ' + fmtS(rSeq[i + 1]));
      yield S(() => stageT.setText('res 乘上当前 M（金色）：贡献 2^' + i + ' 这一项 —— M^10 的二进制拆分累积中'));
      yield W(650);
    } else {
      setGrid(resGrid, rSeq[i + 1], DIM);
      eqT.setText('位 = 0 → res 保持 = ' + fmtS(rSeq[i + 1]));
      yield S(() => stageT.setText('这一位是 0，res 不乘（跳过 2^' + i + ' 项）—— 只把 M 平方完事'));
      yield W(450);
    }
    bitBoxes[i].setColor(bit ? AMBER : DIM, bit ? AMBER : DIM);
  }
  setGrid(resGrid, M10, GOLD);
  yield S(() => { outT.setText('res = ' + fmtS(M10) + ' = M¹⁰ ✓ —— 只做了 4 次矩阵乘法（朴素要 10 次）'); status.textContent = '矩阵快速幂：M¹⁰ = [[89,55],[55,34]]（4 次乘法 vs 朴素 10 次）'; });
  yield W(1000);
  yield S(() => stageT.setText('斐波那契彩蛋：M^n = [[F(n+1),F(n)],[F(n),F(n−1)]] —— res[0][1] = 55 = F(10)，res[0][0] = 89 = F(11)'));
  yield W(800);
  yield S(() => outT.setText('应用：线性递推（斐波那契 O(log n)）、马尔可夫链、图论路径计数 —— 任何「xₙ₊₁ = A·xₙ」都能用；整数快速幂（模幂）是 RSA 的核心'));
  yield W(900);
  yield S(() => { hint.setText('矩阵快速幂完成：M¹⁰ = [[89,55],[55,34]]'); outT.setText(''); });
  yield W(400);
}

function* runMFP() {
  clearView();
  hint.setText('矩阵快速幂：M 逐位自乘，位=1 时乘入 res');
  yield W(400);
  yield* mfpGen();
}

panel.addButton('运行演示', () => engine.start(runMFP()));
panel.addButton('清空', () => { engine.clear(); clearView(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；紫 = M 自乘序列，金 = res 累乘，琥珀 = 二进制位 1，青 = 当前位）');

scene.start(engine);
