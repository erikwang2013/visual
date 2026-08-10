// AlgorithmLibrary/EditDistance3D.js
// 编辑距离：两个输入串的字符 VBox 序列 + (m+1)×(n+1) DP 表网格（VBox + 值），
// 逐格填充时高亮上（删除）/左（插入）/对角（替换）三种转移来源，
// 回溯路径绿色逐格高亮，状态文本显示编辑距离与操作序列。
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
import { pop } from '../3D/effects/Fx.js';
import * as THREE from 'three';
applyTheme('EditDistance3D');

const scene = new Scene3D('scene', { cameraPos: [0, 260, 780], fov: 54 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const status = panel.addStatus('');
const hint = new VText(scene, { text: '输入两个字符串，点击「求解」计算编辑距离', x: 0, y: 315, z: 0, color: PALETTE.textGlow, scale: 0.85 });

const CW = 46, CH = 42, TY = 70;
const DARK = 0x334155, DARK_EM = 0x1e293b;
let A = '', B = '';
let cells = [];     // cells[i][j]
let aBoxes = [], bBoxes = [];
let dp = null;
let halfC = 0, halfR = 0;

const px = (j) => (j - halfC) * CW;
const pz = (i) => (halfR - i) * CH * 0.85;

// 格子高亮（cyan=当前格，green=回溯路径格）
function hl(box, color, em) {
  const from = box.mesh.material.color.getHex();
  C(280, (p) => {
    box.mesh.material.color.lerpColors(new THREE.Color(from), new THREE.Color(color), Math.min(p * 1.2, 1));
    box.mesh.material.emissive.setHex(em);
  }, () => { box.mesh.material.color.setHex(from); box.mesh.material.emissive.setHex(PALETTE.nodeEmissive); });
}

function toNode(i, j) {
  const box = cells[i][j];
  C(220, (p) => box.mesh.material.color.lerpColors(new THREE.Color(PALETTE.highlight), new THREE.Color(PALETTE.node), p), () => {});
}

// 转移来源闪黄：分别对应 上=删除、左=插入、对角=替换/匹配
function flash(i, j, label) {
  const box = cells[i][j];
  const from = box.mesh.material.color.getHex();
  C(1, () => { status.textContent = '来源：' + label; }, () => {});
  C(130, (p) => box.mesh.material.color.lerpColors(new THREE.Color(from), new THREE.Color(PALETTE.yellow), p), () => box.mesh.material.color.setHex(from));
  C(130, (p) => box.mesh.material.color.lerpColors(new THREE.Color(PALETTE.yellow), new THREE.Color(from), p), () => box.mesh.material.color.setHex(from));
}

function setVal(i, j, v) {
  const box = cells[i][j];
  const prev = box.text;
  let fx = false;
  C(220, () => { if (!fx) { fx = true; pop(scene, box.mesh); } box.setText(String(v)); }, () => box.setText(prev));
}

function clearAll() {
  engine.clear();
  for (const row of cells) for (const box of row) if (box) box.remove();
  for (const b of aBoxes) b.remove();
  for (const b of bBoxes) b.remove();
  cells = []; aBoxes = []; bBoxes = []; dp = null;
  hint.setText('输入两个字符串，点击「求解」计算编辑距离');
  status.textContent = '已清空';
}

function run() {
  engine.clear();
  clearAll();
  A = aInput.value.trim().slice(0, 8); B = bInput.value.trim().slice(0, 8);
  if (!A) A = 'kitten';
  if (!B) B = 'sitting';
  aInput.value = A; bInput.value = B;
  const n = A.length, m = B.length;
  halfC = n / 2; halfR = m / 2;
  dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) {
    cells[i] = [];
    for (let j = 0; j <= n; j++) {
      cells[i][j] = new VBox(scene, { w: CW - 8, h: CH - 8, d: 18, x: px(j), y: TY, z: pz(i), label: '', color: DARK, emissive: DARK_EM });
    }
  }
  // 字符序列：上行 A（对齐列），左列 B（对齐行）
  for (let j = 1; j <= n; j++) {
    aBoxes.push(new VBox(scene, { w: 32, h: 32, d: 14, x: px(j), y: TY + 54, z: (halfR + 1) * CH * 0.85, label: A[j - 1], color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
  }
  for (let i = 1; i <= m; i++) {
    bBoxes.push(new VBox(scene, { w: 32, h: 32, d: 14, x: -halfC * CW - 54, y: TY, z: pz(i), label: B[i - 1], color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
  }
  // 边界：首行（插入）、首列（删除）
  for (let j = 0; j <= n; j++) { dp[0][j] = j; setVal(0, j, j); toNode(0, j); }
  for (let i = 1; i <= m; i++) { dp[i][0] = i; setVal(i, 0, i); toNode(i, 0); }
  C(1, () => { status.textContent = '边界：d[0][j]=j（插入）、d[i][0]=i（删除）'; }, () => {});
  // 逐格填表：上=删 B[i-1]、左=插 A[j-1]、对角=替换/匹配
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const eq = A[j - 1] === B[i - 1];
      hl(cells[i][j], PALETTE.highlight, PALETTE.highlightEmissive);
      C(1, () => { status.textContent = 'd[' + i + '][' + j + ']：' + B[i - 1] + ' 与 ' + A[j - 1] + (eq ? ' 相同 → 取对角' : ' 不同 → 三种来源取最小'); }, () => {});
      flash(i - 1, j, '上（删除 ' + B[i - 1] + '）+1');
      flash(i, j - 1, '左（插入 ' + A[j - 1] + '）+1');
      flash(i - 1, j - 1, eq ? '对角（匹配 ' + A[j - 1] + '）+0' : '对角（替换 ' + B[i - 1] + '→' + A[j - 1] + '）+1');
      const up = dp[i - 1][j] + 1, left = dp[i][j - 1] + 1, diag = dp[i - 1][j - 1] + (eq ? 0 : 1);
      let v;
      if (eq) v = diag;
      else if (diag <= up && diag <= left) v = diag;
      else if (up <= left) v = up;
      else v = left;
      dp[i][j] = v;
      setVal(i, j, v);
      toNode(i, j);
      C(1, () => { status.textContent = 'd[' + i + '][' + j + '] = ' + v; }, () => {});
    }
  }
  // 右下角绿色高亮 + 回溯路径
  const dist = dp[m][n];
  hl(cells[m][n], PALETTE.green, PALETTE.greenEmissive);
  const ops = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && A[j - 1] === B[i - 1]) { ops.unshift('保持 ' + A[j - 1]); i--; j--; }
    else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) { ops.unshift('替换 ' + B[i - 1] + '→' + A[j - 1]); i--; j--; }
    else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) { ops.unshift('删除 ' + B[i - 1]); i--; }
    else if (j > 0) { ops.unshift('插入 ' + A[j - 1]); j--; }
    else break;
    hl(cells[i][j], PALETTE.green, PALETTE.greenEmissive);
    C(1, () => { status.textContent = '回溯路径：' + ops.join('，'); }, () => {});
  }
  C(1, () => {
    hint.setText('编辑距离 = ' + dist + '，操作：' + ops.join('，'));
    status.textContent = '编辑距离(' + A + ', ' + B + ') = ' + dist + '（' + ops.join('，') + '）';
  }, () => {});
}

const aInput = panel.addInput('串A', () => run(), 10);
aInput.value = 'kitten';
const bInput = panel.addInput('串B', () => run(), 10);
bInput.value = 'sitting';
panel.addButton('求解', run);
panel.addButton('清空', clearAll);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
