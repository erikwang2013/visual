// AlgorithmLibrary/Gauss3D.js — 高斯消元：初等行变换解线性方程组（消元 + 回代）
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Gauss3D');

const scene = new Scene3D('scene', { cameraPos: [0, 300, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GREEN = 0x4ade80;
const ROWS = 3, COLS = 4;
const M0 = [[1, 1, 1, 6], [2, -1, 1, 3], [1, 2, -1, 2]];
const cells = [];
for (let r = 0; r < ROWS; r++) {
  cells[r] = [];
  for (let c = 0; c < COLS; c++) {
    const x = -250 + c * 95, y = 175 - r * 82;
    cells[r].push(new VBox(scene, { w: 58, h: 42, d: 42, x, y, z: 0, label: String(M0[r][c]), color: c === 3 ? PALETTE.orange : PALETTE.node, emissive: c === 3 ? PALETTE.orange : PALETTE.nodeEmissive }));
  }
}
['x', 'y', 'z', '= b'].forEach((t, c) => {
  new VText(scene, { text: t, x: -250 + c * 95, y: 245, z: 0, color: PALETTE.textDim, scale: 0.7 });
});
const hint = new VText(scene, { text: '点击「运行高斯」开始：消元求解', x: 0, y: 250, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');
const solLabels = [];

function fmt(v) { return Math.abs(v % 1) < 1e-9 ? String(Math.round(v)) : v.toFixed(2); }
function draw(M) {
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) cells[r][c].setText(fmt(M[r][c]));
}
function resetRowColor(r) {
  cells[r].forEach((box, c) => box.setColor(c === 3 ? PALETTE.orange : PALETTE.node, c === 3 ? PALETTE.orange : PALETTE.nodeEmissive));
}

function runGauss() {
  engine.clear();
  for (const s of solLabels) s.remove();
  solLabels.length = 0;
  draw(M0);
  for (let r = 0; r < ROWS; r++) resetRowColor(r);
  hint.setText('初始方程组（增广矩阵）');

  const M = M0.map(row => [...row]);
  const events = [];
  for (let c = 0; c < ROWS; c++) {
    events.push({ t: 'pivot', r: c, c });
    for (let r = c + 1; r < ROWS; r++) {
      const f = M[r][c] / M[c][c];
      if (Math.abs(f) < 1e-12) continue;
      for (let k = c; k < COLS; k++) M[r][k] -= f * M[c][k];
      events.push({ t: 'rowop', r, txt: 'R' + (r + 1) + ' ← R' + (r + 1) + ' − ' + fmt(f) + '·R' + (c + 1), M: M.map(row => [...row]) });
    }
  }
  const x = [0, 0, 0];
  for (let r = ROWS - 1; r >= 0; r--) {
    let s = M[r][3];
    for (let c = r + 1; c < ROWS; c++) s -= M[r][c] * x[c];
    x[r] = s / M[r][r];
    events.push({ t: 'solve', r, val: x[r], M: M.map(row => [...row]) });
  }

  let i = 0;
  const step = () => {
    if (i >= events.length) {
      status.textContent = '高斯消元完成：x=' + fmt(x[0]) + ', y=' + fmt(x[1]) + ', z=' + fmt(x[2]);
      hint.setText('回代完成：x=' + fmt(x[0]) + ', y=' + fmt(x[1]) + ', z=' + fmt(x[2]));
      return;
    }
    const e = events[i]; i++;
    if (e.t === 'pivot') {
      cells[e.r][e.c].setColor(GREEN, GREEN);
      hint.setText('选取主元：第 ' + (e.r + 1) + ' 行第 ' + (e.c + 1) + ' 列');
      C(500, step);
    } else if (e.t === 'rowop') {
      cells[e.r].forEach(box => box.setColor(PALETTE.highlight, PALETTE.highlightEmissive));
      hint.setText(e.txt);
      C(650, () => { draw(e.M); resetRowColor(e.r); step(); });
    } else {
      cells[e.r].forEach(box => box.setColor(PALETTE.highlight, PALETTE.highlightEmissive));
      const vt = new VText(scene, { text: 'xyz'[e.r] + ' = ' + fmt(e.val), x: 265, y: 195 - e.r * 82, z: 0, color: GREEN, scale: 0.95 });
      solLabels.push(vt);
      hint.setText('回代得 ' + 'xyz'[e.r] + ' = ' + fmt(e.val));
      C(700, () => { draw(e.M); resetRowColor(e.r); step(); });
    }
  };
  step();
}

panel.addButton('运行高斯', runGauss);
panel.addButton('清空', () => { engine.clear(); for (const s of solLabels) s.remove(); solLabels.length = 0; draw(M0); for (let r = 0; r < ROWS; r++) resetRowColor(r); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
