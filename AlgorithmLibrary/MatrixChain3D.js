// AlgorithmLibrary/MatrixChain3D.js — 矩阵连乘：右上三角 m 表按链长自底向上填，分裂 k 两侧子问题黄色闪烁，最优分割金色写入 + 括号化方案还原（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('MatrixChain3D');

const scene = new Scene3D('scene', { cameraPos: [0, 330, 760], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, YELLOW = 0xfde047;
const hint = new VText(scene, { text: '点击「运行演示」开始：矩阵连乘（A1..A5，P=[5,4,6,2,7,3]）', x: 0, y: 315, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const outT = new VText(scene, { text: '', x: 0, y: -150, z: 0, color: PALETTE.textGlow, scale: 0.7 });

const P = [5, 4, 6, 2, 7, 3];
const N = P.length - 1;
const CW = 64, CH = 48, TY = 35;
const cellView = new Map();   // 'i-j' -> VBox
const matrixBox = [];         // Ai -> VBox
const m = Array.from({ length: N + 1 }, () => Array(N + 1).fill(0));
const s = Array.from({ length: N + 1 }, () => Array(N + 1).fill(0));

function cellX(j) { return (j - 3) * CW; }
function cellZ(i) { return (2 - i) * CH * 0.85; }
function clearView() {
  cellView.forEach(c => scene.remove(c.box.mesh));
  matrixBox.forEach(b => scene.remove(b.mesh));
  cellView.clear(); matrixBox.length = 0;
}
function buildView() {
  clearView();
  for (let i = 1; i <= N; i++) {
    const b = new VBox(scene, { w: 84, h: 44, d: 20, x: (i - 3) * 118, y: 260, z: 0, label: 'A' + i, color: BLUE, emissive: BLUE });
    matrixBox.push(b);
    new VText(scene, { text: P[i - 1] + '×' + P[i], x: (i - 3) * 118, y: 212, z: 0, color: WHITE, scale: 0.45 });
  }
  for (let i = 1; i <= N; i++) {
    for (let j = i; j <= N; j++) {
      const box = new VBox(scene, { w: 56, h: 42, d: 14, x: cellX(j), y: TY, z: cellZ(i), label: i === j ? '0' : '', color: BLUE, emissive: BLUE });
      cellView.set(i + '-' + j, { box });
    }
  }
  new VText(scene, { text: 'm[i][j] = min_{i≤k<j} m[i][k]+m[k+1][j] + p[i-1]·p[k]·p[j]', x: 0, y: 118, z: 0, color: GOLD, scale: 0.5 });
}
function setCell(i, j, v, c) {
  m[i][j] = v;
  const e = cellView.get(i + '-' + j);
  e.box.setText(String(v));
  e.box.setColor(c, c);
}
function setCellColor(i, j, c) { const e = cellView.get(i + '-' + j); if (e) e.box.setColor(c, c); }
function* flashCell(i, j, label) {
  if (i > j) return;
  setCellColor(i, j, YELLOW);
  yield S(() => outT.setText(label));
  yield W(170);
  setCellColor(i, j, BLUE);
}
function parens(i, j) {
  if (i === j) return 'A' + i;
  const k = s[i][j];
  return '(' + parens(i, k) + parens(k + 1, j) + ')';
}

function* mcGen() {
  yield S(() => outT.setText('矩阵连乘：m[i][j] = 最小标量乘法次数；先填链长 1（=0），再逐级增长'));
  yield W(600);
  for (let len = 2; len <= N; len++) {
    for (let i = 1; i <= N - len + 1; i++) {
      const j = i + len - 1;
      setCellColor(i, j, CYAN);
      yield S(() => outT.setText('——— m[' + i + '][' + j + ']（链长 ' + len + '）：尝试所有分割点 k ———'));
      yield W(380);
      let best = Infinity, bk = -1;
      const cands = [];
      for (let k = i; k < j; k++) {
        yield* flashCell(i, k, '左子 ' + 'm[' + i + '][' + k + ']=' + m[i][k]);
        yield* flashCell(k + 1, j, '右子 ' + 'm[' + (k + 1) + '][' + j + ']=' + m[k + 1][j]);
        const v = m[i][k] + m[k + 1][j] + P[i - 1] * P[k] * P[j];
        cands.push('k=' + k + '→' + v);
        yield S(() => outT.setText('k=' + k + '：' + m[i][k] + ' + ' + m[k + 1][j] + ' + ' + P[i - 1] + '×' + P[k] + '×' + P[j] + ' = ' + v + (v < best ? ' ← 暂优' : '')));
        yield W(300);
        if (v < best) { best = v; bk = k; }
      }
      setCell(i, j, best, GOLD);
      s[i][j] = bk;
      yield S(() => outT.setText('→ m[' + i + '][' + j + '] = ' + best + '（最优分割 k=' + bk + '）；候选：' + cands.join('、')));
      yield W(450);
    }
  }
  yield S(() => outT.setText('填表完成：m[1][' + N + '] = ' + m[1][N] + '。② 按 s 表递归还原括号化方案'));
  yield W(550);
  const tree = parens(1, N);
  yield S(() => outT.setText('最小代价 = ' + m[1][N] + '，方案：' + tree));
  yield W(800);
  for (let i = 1; i <= N; i++) matrixBox[i - 1].setColor(GREEN, GREEN);
  yield S(() => outT.setText('完成：全部矩阵绿色 = 方案 (A1(((A2A3)A4)A5)) 参与计算，O(n³)'));
  yield W(650);
  yield S(() => { status.textContent = '矩阵连乘最小代价 ' + m[1][N] + '，方案 ' + tree + '，O(n³)'; });
  yield W(450);
}

function* runMC() {
  buildView();
  hint.setText('矩阵连乘：右上三角 m 表，链长自底向上');
  yield W(400);
  yield* mcGen();
  yield S(() => { outT.setText(''); hint.setText('矩阵连乘完成：最小代价 192（(A1(((A2A3)A4)A5))），O(n³)'); });
}

panel.addButton('运行演示', () => engine.start(runMC()));
panel.addButton('清空', () => { engine.clear(); clearView(); hint.setText('已清空，可重新运行'); status.textContent = ''; outT.setText(''); });
panel.addLabel('（拖拽旋转视角，滚轮缩放；青 = 计算中，黄 = 分裂 k 两侧子问题闪烁，金 = 最优值，绿 = 全部矩阵）');

scene.start(engine);
