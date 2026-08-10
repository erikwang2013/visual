// AlgorithmLibrary/MatrixChain3D.js
// 矩阵连乘（矩阵链乘法）：n=5 个矩阵横向排布（VBox + VText 标注维度 p 序列），
// 右上三角 DP 表 m[i][j] 按链长自底向上逐格填写（当前格 cyan 高亮，未计算格暗色），
// 填表后按最优分裂点 s 表回溯，绿色高亮矩阵链并输出最优括号化方案。
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
import { pop } from '../3D/effects/Fx.js';
import * as THREE from 'three';
applyTheme('MatrixChain3D');

const scene = new Scene3D('scene', { cameraPos: [0, 230, 840], fov: 52 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const status = panel.addStatus('');
const hint = new VText(scene, { text: 'p = [5, 4, 6, 2, 7, 3]，5 个矩阵，点击「求解」', x: 0, y: 385, z: 0, color: PALETTE.textGlow, scale: 0.85 });

const N = 5;                 // 矩阵个数
const P = [5, 4, 6, 2, 7, 3]; // 维度序列，共 N+1 项
const CW = 64, CH = 48, TY = 40;
const DARK = 0x334155, DARK_EM = 0x1e293b;

const matrixBoxes = [];
const dimTexts = [];
let cells = [];   // cells[i][j]（1 <= i <= j <= N）
let m = null, s = null;

const cellX = (j) => (j - 3) * CW;
const cellZ = (i) => (2 - i) * CH * 0.85;
const hexStr = (c) => '#' + c.toString(16).padStart(6, '0');

function buildMatrices() {
  const y = 265;
  for (let i = 0; i < N; i++) {
    const x = (i - 2) * 118;
    const box = new VBox(scene, { w: 84, h: 52, d: 34, x, y, z: 0, label: 'A' + (i + 1), color: PALETTE.node, emissive: PALETTE.nodeEmissive });
    matrixBoxes.push(box);
    const dim = new VText(scene, { text: P[i] + '×' + P[i + 1], x, y: y - 52, z: 0, color: PALETTE.textDim, scale: 0.7 });
    dimTexts.push(dim);
  }
}

function buildTable() {
  m = Array.from({ length: N + 1 }, () => new Array(N + 1).fill(0));
  s = Array.from({ length: N + 1 }, () => new Array(N + 1).fill(0));
  for (let i = 1; i <= N; i++) {
    cells[i] = [];
    for (let j = i; j <= N; j++) {
      const box = new VBox(scene, { w: CW - 8, h: CH - 8, d: 22, x: cellX(j), y: TY, z: cellZ(i), label: '', color: DARK, emissive: DARK_EM });
      cells[i][j] = box;
    }
    cells[i][i].setText('0'); // 对角线 m[i][i] = 0
  }
}

// 当前格高亮 cyan（未计算格为暗色）
function hlCyan(i, j) {
  const box = cells[i][j];
  const from = box.mesh.material.color.getHex();
  C(280, (p) => {
    box.mesh.material.color.lerpColors(new THREE.Color(from), new THREE.Color(PALETTE.highlight), Math.min(p * 1.2, 1));
    box.mesh.material.emissive.setHex(PALETTE.highlightEmissive);
  }, () => { box.mesh.material.color.setHex(from); box.mesh.material.emissive.setHex(from === DARK ? DARK_EM : PALETTE.nodeEmissive); });
}

function toNode(i, j) {
  const box = cells[i][j];
  C(240, (p) => box.mesh.material.color.lerpColors(new THREE.Color(PALETTE.highlight), new THREE.Color(PALETTE.node), p), () => {});
}

// 参与计算的两个已填格子闪黄
function flashCell(i, j) {
  const box = cells[i][j];
  const from = box.mesh.material.color.getHex();
  C(140, (p) => box.mesh.material.color.lerpColors(new THREE.Color(from), new THREE.Color(PALETTE.yellow), p), () => box.mesh.material.color.setHex(from));
  C(140, (p) => box.mesh.material.color.lerpColors(new THREE.Color(PALETTE.yellow), new THREE.Color(from), p), () => box.mesh.material.color.setHex(from));
}

function setVal(i, j, v) {
  const box = cells[i][j];
  const prev = box.text;
  let fx = false;
  C(260, () => { if (!fx) { fx = true; pop(scene, box.mesh); } box.setText(String(v)); }, () => box.setText(prev));
}

function parens(i, j) {
  if (i === j) return 'A' + i;
  return '(' + parens(i, s[i][j]) + parens(s[i][j] + 1, j) + ')';
}

function solve() {
  engine.clear();
  clearAll();
  buildMatrices();
  buildTable();
  hint.setText('按链长自底向上填表：m[i][j] = min(m[i][k] + m[k+1][j] + p[i-1]·p[k]·p[j])');
  for (let len = 2; len <= N; len++) {
    for (let i = 1; i + len - 1 <= N; i++) {
      const j = i + len - 1;
      hlCyan(i, j);
      let best = Infinity, bestK = -1;
      for (let k = i; k < j; k++) {
        const cand = m[i][k] + m[k + 1][j] + P[i - 1] * P[k] * P[j];
        flashCell(i, k);
        flashCell(k + 1, j);
        C(1, () => { status.textContent = 'm[' + i + '][' + j + '] k=' + k + '：' + m[i][k] + '+' + m[k + 1][j] + '+' + P[i - 1] + '·' + P[k] + '·' + P[j] + ' = ' + cand; }, () => {});
        if (cand < best) { best = cand; bestK = k; }
      }
      m[i][j] = best; s[i][j] = bestK;
      setVal(i, j, best);
      toNode(i, j);
      C(1, () => { status.textContent = 'm[' + i + '][' + j + '] = ' + best + '（最优分裂点 k=' + bestK + '）'; }, () => {});
    }
  }
  const expr = parens(1, N);
  for (let i = 0; i < N; i++) {
    C(300, () => matrixBoxes[i].setColor(PALETTE.green, PALETTE.greenEmissive), () => matrixBoxes[i].setColor(PALETTE.node, PALETTE.nodeEmissive));
  }
  C(1, () => {
    hint.setText('最优括号化：' + expr + '，乘法次数 = ' + m[1][N]);
    status.textContent = '矩阵连乘 ' + expr + ' 最少 ' + m[1][N] + ' 次乘法';
  }, () => {});
}

function clearAll() {
  engine.clear();
  for (let i = 1; i <= N; i++) if (cells[i]) for (let j = i; j <= N; j++) if (cells[i][j]) { cells[i][j].remove(); cells[i][j] = null; }
  cells = [];
  for (const b of matrixBoxes) b.remove();
  for (const t of dimTexts) t.remove();
  matrixBoxes.length = 0;
  dimTexts.length = 0;
  m = null; s = null;
  hint.setText('p = [5, 4, 6, 2, 7, 3]，5 个矩阵，点击「求解」');
  status.textContent = '已清空';
}

panel.addButton('求解', solve);
panel.addButton('清空', clearAll);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
