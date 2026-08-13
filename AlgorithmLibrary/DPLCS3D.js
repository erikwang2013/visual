// AlgorithmLibrary/DPLCS3D.js — 最长公共子序列：dp 表逐格填（相等→左上+1，否则 max 上/左），回溯沿 LCS 路径金色高亮、匹配字符飞入顶部结果串（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('DPLCS3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：最长公共子序列 LCS', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');
const outT = new VText(scene, { text: '', x: 700, y: 420, z: 0, color: PALETTE.textGlow, scale: 0.55, wrapChars: 8 });
const resultT = new VText(scene, { text: 'LCS: ', x: 160, y: 640, z: 0, color: GOLD, scale: 0.9 });

const SA = 'ABCBDAB', B = 'BDCABA';
const NR = B.length + 1, NC = SA.length + 1;
const cellView = new Map();   // 'i-j' -> VBox
const flyTexts = [];
const dp = Array.from({ length: NR }, () => Array(NC).fill(0));

function clearView() {
  cellView.forEach(c => scene.remove(c.box.mesh));
  flyTexts.forEach(t => scene.remove(t.sprite));
  cellView.clear(); flyTexts.length = 0;
}
function buildTable() {
  clearView();
  for (let j = 1; j < NC; j++) new VText(scene, { text: SA[j - 1], x: 152 + j * 52, y: 613, z: 0, color: CYAN, scale: 0.6 });
  for (let i = 1; i < NR; i++) new VText(scene, { text: B[i - 1], x: 110, y: 590 - (i - 1) * 46, z: 0, color: CYAN, scale: 0.6 });
  for (let i = 0; i < NR; i++) {
    for (let j = 0; j < NC; j++) {
      const box = new VBox(scene, { w: 48, h: 42, d: 14, x: 152 + j * 52, y: 590 - i * 46, z: 0, label: String(dp[i][j]), color: BLUE, emissive: BLUE });
      cellView.set(i + '-' + j, { box });
    }
  }
}
function setCell(i, j, v, c) {
  dp[i][j] = v;
  const e = cellView.get(i + '-' + j);
  e.box.setText(String(v));
  e.box.setColor(c, c);
}
function setCellColor(i, j, c) { const e = cellView.get(i + '-' + j); if (e) e.box.setColor(c, c); }
function* spawnChar(ch, i, j) {
  const p = cellView.get(i + '-' + j).box.mesh.position;
  const from = { x: p.x, y: p.y + 40, z: p.z };
  const to = { x: 160 + (4 + flyTexts.length) * 42, y: 640, z: 0 };
  const vt = new VText(scene, { text: ch, x: from.x, y: from.y, z: from.z, color: GOLD, scale: 0.9 });
  flyTexts.push(vt);
  yield* A(600, p => { vt.sprite.position.set(from.x + (to.x - from.x) * p, from.y + (to.y - from.y) * p, from.z + (to.z - from.z) * p); });
}

function* lcsGen() {
  yield S(() => outT.setText('LCS("' + A + '","' + B + '")：相等 → 左上+1；不等 → max(上, 左)'));
  yield W(650);
  for (let i = 1; i < NR; i++) {
    for (let j = 1; j < NC; j++) {
      setCellColor(i, j, CYAN);
      if (SA[j - 1] === B[i - 1]) {
        const v = dp[i - 1][j - 1] + 1;
        setCell(i, j, v, GOLD);
        yield S(() => outT.setText('A[' + (j - 1) + ']=' + SA[j - 1] + ' = B[' + (i - 1) + '] → dp=' + (v - 1) + '+1 = ' + v));
      } else {
        const v = Math.max(dp[i - 1][j], dp[i][j - 1]);
        setCell(i, j, v, BLUE);
        yield S(() => outT.setText('A[' + (j - 1) + ']=' + SA[j - 1] + ' ≠ B[' + (i - 1) + '] → max(上 ' + dp[i - 1][j] + ', 左 ' + dp[i][j - 1] + ') = ' + v));
      }
      yield W(300);
    }
  }
  yield S(() => outT.setText('填表完成（右下角 = LCS 长度）。② 回溯：相等字符走左上并收入结果，否则走上/左较大者'));
  yield W(650);
  const result = [];
  let i = NR - 1, j = NC - 1;
  while (i > 0 && j > 0) {
    setCellColor(i, j, ORANGE);
    if (SA[j - 1] === B[i - 1]) {
      const ch = SA[j - 1];
      yield S(() => outT.setText('匹配 ' + ch + ' → 加入结果，走左上'));
      yield W(380);
      yield* spawnChar(ch, i, j);
      result.unshift(ch);
      i--; j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      yield S(() => outT.setText('上(' + dp[i - 1][j] + ') ≥ 左(' + dp[i][j - 1] + ') → 上行'));
      yield W(280);
      i--;
    } else {
      yield S(() => outT.setText('左(' + dp[i][j - 1] + ') > 上(' + dp[i - 1][j] + ') → 左移'));
      yield W(280);
      j--;
    }
  }
  const lcs = result.join('');
  resultT.setText('LCS: ' + lcs);
  yield S(() => outT.setText('完成：LCS = "' + lcs + '"，长度 ' + lcs.length + '，O(nm)'));
  yield W(600);
  yield S(() => { status.textContent = 'LCS("' + A + '","' + B + '") = "' + lcs + '"'; });
  yield W(450);
}

function* runLCS() {
  buildTable();
  hint.setText('LCS：dp 表 + 回溯，匹配字符飞入结果串');
  yield W(400);
  yield* lcsGen();
  yield S(() => { outT.setText(''); hint.setText('LCS 完成："BCBA"，长度 4，O(nm)'); });
}

engine.queue(() => runLCS());
panel.addButton('清空', () => { engine.clear(); clearView(); hint.setText('已清空，可重新运行'); status.textContent = ''; outT.setText(''); resultT.setText('LCS: '); });
panel.addLabel('（拖拽旋转视角，滚轮缩放；金 = 相等格，橙 = 回溯路径；匹配字符从表格飞入顶部结果串）');

scene.start(engine);
