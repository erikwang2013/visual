// AlgorithmLibrary/DPLCS3D.js
// 最长公共子序列：Table3D 填表（表/递归/记忆三种遍历顺序），
// 回溯沿 LCS 路径高亮，匹配字符依次飞入顶部结果串。
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Table3D } from '../3D/modes/Table3D.js';
import { VText, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE } from '../3D/Glow.js';

const scene = new Scene3D('scene', { cameraPos: [0, 300, 680], fov: 55 });
const engine = new AnimationEngine({ speed: 1.5 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const status = panel.addStatus('');
const hint = new VText(scene, { text: '输入串A、串B，选择模式开始', x: 0, y: 250, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const resultText = new VText(scene, { text: 'LCS: ', x: -330, y: 215, z: 0, color: PALETTE.text, scale: 0.9 });
const flyTexts = [];
let table = null;

function clearAll() {
  for (const t of flyTexts) t.remove();
  flyTexts.length = 0;
  resultText.setText('LCS: ');
  if (table) {
    for (const row of table.cells) for (const b of row) if (b) b.remove();
    for (const l of table.rowLabels) l.remove();
    for (const l of table.colLabels) l.remove();
    table = null;
  }
}

// ---- 模型（与 /tmp/3dtest/2i_model.mjs 一致）----
function lcsModel(A, B, mode) {
  const n = A.length, m = B.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  const events = [];
  if (mode === 'table') {
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
      if (A[j - 1] === B[i - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      events.push({ i, j, v: dp[i][j], eq: A[j - 1] === B[i - 1] });
    }
  } else {
    const done = Array.from({ length: m + 1 }, () => Array(n + 1).fill(false));
    let recorded = 0;
    const rec = (i, j) => {
      if (i === 0 || j === 0) return 0;
      if (done[i][j]) return dp[i][j];
      let v, eq = false;
      if (A[j - 1] === B[i - 1]) { eq = true; v = rec(i - 1, j - 1) + 1; }
      else v = Math.max(rec(i - 1, j), rec(i, j - 1));
      dp[i][j] = v;
      done[i][j] = true;
      if (recorded < 2000) { events.push({ i, j, v, eq }); recorded++; }
      return v;
    };
    rec(m, n);
  }
  const result = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (A[j - 1] === B[i - 1]) { result.unshift(A[j - 1]); i--; j--; }
    else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
    else j--;
  }
  return { dp, events, result: result.join('') };
}

function spawnChar(ch, cellBox, idx) {
  const p = cellBox.mesh.position;
  const from = { x: p.x, y: p.y + 40, z: p.z };
  const to = { x: -330 + (4 + idx) * 42, y: 215, z: 0 };
  const vt = new VText(scene, { text: ch, x: from.x, y: from.y, z: from.z, color: PALETTE.textGlow, scale: 0.9 });
  vt.sprite.scale.set(0.1, 0.05, 1);
  flyTexts.push(vt);
  C(250, (p) => { const s = 0.01 + p * 0.99; vt.sprite.scale.set(90 * s, 45 * s, 1); }, () => vt.sprite.scale.set(0.1, 0.05, 1));
  C(450, (p) => {
    const t = easeInOut(p);
    vt.sprite.position.set(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, from.z + (to.z - from.z) * t);
  }, () => vt.sprite.position.set(from.x, from.y, from.z));
}

function runLCS(mode) {
  engine.clear();
  clearAll();
  let A = aInput.value.trim(), B = bInput.value.trim();
  if (!A) A = 'abc'; if (!B) B = 'ac';
  const cap = mode === 'rec' ? 6 : 10;
  A = A.slice(0, cap); B = B.slice(0, cap);
  aInput.value = A; bInput.value = B;
  const rows = B.length + 1, cols = A.length + 1;
  table = new Table3D(scene, { rows, cols, cellW: 52, cellH: 46, startX: 0, startY: 95 });
  table.create();
  for (let j = 1; j <= A.length; j++) table.colLabels[j].setText(A[j - 1]);
  for (let i = 1; i <= B.length; i++) table.setRowLabel(i, B[i - 1]);
  const { dp, events, result } = lcsModel(A, B, mode);
  const labels = { table: '动态规划填表', rec: '朴素递归（重复子问题反复计算）', memo: '记忆化递归（每个状态只算一次）' };
  C(1, () => hint.setText(labels[mode] + '：逐格计算 LCS 长度'), () => {});
  for (const e of events) {
    table.highlightCell(e.i, e.j, C);
    table.setCell(e.i, e.j, String(e.v), C);
    if (e.eq) C(1, () => hint.setText('A[' + (e.j - 1) + ']=' + A[e.j - 1] + ' = B[' + (e.i - 1) + ']，dp=左上+1'), () => {});
    else C(1, () => hint.setText('不相等，取 max(上=' + dp[e.i - 1][e.j] + ', 左=' + dp[e.i][e.j - 1] + ')'), () => {});
  }
  C(1, () => hint.setText('回溯：从右下沿 LCS 路径找出公共字符'), () => {});
  const bt = [];
  let i = B.length, j = A.length, idx = 0;
  while (i > 0 && j > 0) {
    if (A[j - 1] === B[i - 1]) { bt.push({ i, j, ch: A[j - 1] }); i--; j--; }
    else if (table.cells[i - 1][j].text >= table.cells[i][j - 1].text) { bt.push({ i, j }); i--; }
    else { bt.push({ i, j }); j--; }
  }
  for (const s of bt) {
    table.highlightCell(s.i, s.j, C);
    if (s.ch) spawnChar(s.ch, table.cells[s.i][s.j], idx++);
    C(1, () => hint.setText(s.ch ? '匹配 ' + s.ch + '，加入结果' : '沿最大值方向移动'), () => {});
  }
  C(1, () => {
    resultText.setText('LCS: ' + result);
    status.textContent = 'LCS("' + A + '","' + B + '") = "' + result + '"';
    hint.setText('完成：最长公共子序列为 "' + result + '"，长度 ' + result.length);
  }, () => {});
}

const aInput = panel.addInput('串A', () => runLCS('table'), 10);
aInput.value = 'abc';
const bInput = panel.addInput('串B', () => runLCS('table'), 10);
bInput.value = 'ac';
panel.addButton('LCS表', () => runLCS('table'));
panel.addButton('LCS 递归', () => runLCS('rec'));
panel.addButton('LCS 记忆', () => runLCS('memo'));
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
