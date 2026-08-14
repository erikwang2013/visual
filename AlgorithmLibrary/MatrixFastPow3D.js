// AlgorithmLibrary/MatrixFastPow3D.js — 矩阵快速幂：10=1010₂ 低位优先，位=1 时 res×M、M 每轮自乘，4 轮得 M¹⁰=[[89,55],[55,34]]（斐波那契 O(log n)）（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
applyTheme('MatrixFastPow3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155, VIOLET = 0xa78bfa, AMBER = 0xfbbf24;
const status = panel.addStatus('就绪');

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

const bitBoxes = bits.map((b, i) => new VBox(scene, { w: 55, h: 46, d: 46, x: 170 + i * 75, y: 575, z: 0, label: String(b), color: b ? AMBER : DIM, emissive: b ? AMBER : DIM }));
const mGrid = [[0, 0], [0, 0]].map((row, i) => row.map((v, j) => new VBox(scene, { w: 44, h: 44, d: 44, x: 305 + j * 46, y: 490 - i * 46, z: 0, label: '', color: DIM, emissive: DIM })));
const resGrid = [[0, 0], [0, 0]].map((row, i) => row.map((v, j) => new VBox(scene, { w: 44, h: 44, d: 44, x: 305 + j * 46, y: 365 - i * 46, z: 0, label: '', color: DIM, emissive: DIM })));
const fmtS = m => '[[' + m[0][0] + ',' + m[0][1] + '],[' + m[1][0] + ',' + m[1][1] + ']]';

function setGrid(grid, mat, color) {
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { grid[i][j].setText(String(mat[i][j])); if (color) grid[i][j].setColor(color, color); }
}
function clearView() {
  bitBoxes.forEach((b, i) => { b.setColor(bits[i] ? AMBER : DIM, bits[i] ? AMBER : DIM); b.setText(String(bits[i])); });
  setGrid(mGrid, M1, DIM); setGrid(resGrid, I, DIM);
}

function* mfpGen() {
  yield S(() => { status.textContent = '矩阵快速幂演示：M¹⁰ —— 10 = 1010₂，位 1 才乘、位 0 只平方，4 轮代替朴素 10 次乘法'; });
  yield W(650);
  yield S(() => { status.textContent = '初始：M = [[1,1],[1,0]]，res = I = [[1,0],[0,1]]（单位阵是矩阵乘法里的「1」）'; });
  yield W(500);
  for (let i = 0; i < 4; i++) {
    const bit = bits[i];
    bitBoxes[i].setColor(CYAN, CYAN);
    yield S(() => { status.textContent = '扫描第 ' + (i + 1) + ' 位（2^' + i + '）= ' + bit + (bit ? '（要乘！）' : '（不乘）'); });
    yield W(400);
    setGrid(mGrid, mSeq[i + 1], VIOLET);
    yield S(() => { status.textContent = 'M 自乘：M = ' + fmtS(mSeq[i]) + '² = ' + fmtS(mSeq[i + 1]) + ' —— 每轮平方，幂次翻倍'; });
    yield W(550);
    if (bit) {
      setGrid(resGrid, rSeq[i + 1], GOLD);
      yield S(() => { status.textContent = '位 = 1 → res ← res × M = ' + fmtS(rSeq[i + 1]) + '（金色）：贡献 2^' + i + ' 这一项'; });
      yield W(600);
    } else {
      setGrid(resGrid, rSeq[i + 1], DIM);
      yield S(() => { status.textContent = '位 = 0 → res 保持 = ' + fmtS(rSeq[i + 1]) + '：跳过 2^' + i + ' 项，只把 M 平方'; });
      yield W(450);
    }
    bitBoxes[i].setColor(bit ? AMBER : DIM, bit ? AMBER : DIM);
  }
  setGrid(resGrid, M10, GOLD);
  yield S(() => { status.textContent = '4 轮结束：M¹⁰ = ' + fmtS(M10) + ' ✓ —— 4 次乘法 vs 朴素 10 次'; });
  yield W(600);
  yield S(() => { status.textContent = '斐波那契彩蛋：M^n = [[F(n+1),F(n)],[F(n),F(n−1)]] —— res[0][1] = 55 = F(10)，res[0][0] = 89 = F(11)'; });
  yield W(600);
  yield S(() => { status.textContent = '应用：斐波那契 O(log n)、马尔可夫链、图论计数；模幂是 RSA 核心'; });
  yield W(500);
  yield S(() => { status.textContent = '矩阵快速幂演示完成：M¹⁰ = [[89,55],[55,34]]'; });
  yield W(400);
}

function* runMFP() {
  clearView();
  yield W(300);
  yield* mfpGen();
}

engine.queue(() => runMFP());
panel.addButton('清空', () => { engine.clear(); clearView(); status.textContent = ''; });

scene.start(engine);
