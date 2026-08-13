// AlgorithmLibrary/EditDistance3D.js — 编辑距离：kitten→sitting 的 (m+1)×(n+1) DP 表逐格填，三种来源（上=删/左=插/对角=替）黄色闪烁取最小，回溯路径绿色（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('EditDistance3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, YELLOW = 0xfde047;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：编辑距离（kitten → sitting）', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');
const outT = new VText(scene, { text: '', x: 700, y: 420, z: 0, color: PALETTE.textGlow, scale: 0.55, wrapChars: 8 });

const SA = 'kitten', B = 'sitting';
const N = SA.length, M = B.length;
const cellView = new Map();   // 'i-j' -> VBox
const dp = Array.from({ length: M + 1 }, () => Array(N + 1).fill(0));
function clearView() {
  cellView.forEach(c => scene.remove(c.box.mesh));
  cellView.clear();
}
function buildTable() {
  clearView();
  for (let j = 1; j <= N; j++) new VText(scene, { text: SA[j - 1], x: 152 + j * 52, y: 613, z: 0, color: CYAN, scale: 0.6 });
  for (let i = 1; i <= M; i++) new VText(scene, { text: B[i - 1], x: 110, y: 590 - (i - 1) * 46, z: 0, color: CYAN, scale: 0.6 });
  for (let i = 0; i <= M; i++) {
    for (let j = 0; j <= N; j++) {
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
function* flashCell(i, j, label) {
  setCellColor(i, j, YELLOW);
  yield S(() => outT.setText(label));
  yield W(170);
  setCellColor(i, j, BLUE);
}

function* edGen() {
  yield S(() => outT.setText('编辑距离：d[i][j] = 把 B[0..i) 变 A[0..j) 的最少操作；来源 = 上(删)/左(插)/对角(替或匹配)'));
  yield W(650);
  for (let j = 1; j <= N; j++) { setCell(0, j, j, BLUE); }
  for (let i = 1; i <= M; i++) { setCell(i, 0, i, BLUE); }
  yield S(() => outT.setText('边界：首行 d[0][j]=j（全插入），首列 d[i][0]=i（全删除）'));
  yield W(550);
  for (let i = 1; i <= M; i++) {
    for (let j = 1; j <= N; j++) {
      const eq = SA[j - 1] === B[i - 1];
      setCellColor(i, j, CYAN);
      yield* flashCell(i - 1, j, '上（删除 ' + B[i - 1] + '）+1 = ' + (dp[i - 1][j] + 1));
      yield* flashCell(i, j - 1, '左（插入 ' + SA[j - 1] + '）+1 = ' + (dp[i][j - 1] + 1));
      yield* flashCell(i - 1, j - 1, eq ? '对角（匹配 ' + SA[j - 1] + '）+0 = ' + dp[i - 1][j - 1] : '对角（替换 ' + B[i - 1] + '→' + SA[j - 1] + '）+1 = ' + (dp[i - 1][j - 1] + 1));
      const up = dp[i - 1][j] + 1, left = dp[i][j - 1] + 1, diag = dp[i - 1][j - 1] + (eq ? 0 : 1);
      const v = eq ? diag : Math.min(diag, up, left);
      setCell(i, j, v, eq ? GOLD : ORANGE);
      yield S(() => outT.setText('d[' + i + '][' + j + '] = min(上 ' + up + ', 左 ' + left + ', 对角 ' + diag + ') = ' + v + (eq ? '（字符相同优先对角）' : '')));
      yield W(350);
    }
  }
  const dist = dp[M][N];
  yield S(() => outT.setText('填表完成：编辑距离 = d[' + M + '][' + N + '] = ' + dist + '。② 回溯：沿「来源最小」反向走出操作序列'));
  yield W(600);
  const ops = [];
  let i = M, j = N;
  while (i > 0 || j > 0) {
    setCellColor(i, j, GREEN);
    if (i > 0 && j > 0 && SA[j - 1] === B[i - 1]) { ops.unshift('保持 ' + SA[j - 1]); i--; j--; }
    else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) { ops.unshift('替换 ' + B[i - 1] + '→' + SA[j - 1]); i--; j--; }
    else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) { ops.unshift('删除 ' + B[i - 1]); i--; }
    else { ops.unshift('插入 ' + SA[j - 1]); j--; }
    yield S(() => outT.setText('回溯：' + ops.join('，')));
    yield W(380);
  }
  yield S(() => outT.setText('完成：编辑距离 ' + dist + '，操作：' + ops.join('，')));
  yield W(650);
  yield S(() => { status.textContent = '编辑距离(kitten, sitting) = ' + dist + '（' + ops.join('，') + '），O(nm)'; });
  yield W(450);
}

function* runED() {
  buildTable();
  hint.setText('编辑距离：黄 = 三种来源，金 = 匹配格，绿 = 回溯路径');
  yield W(400);
  yield* edGen();
  yield S(() => { outT.setText(''); hint.setText('编辑距离完成：kitten→sitting = 3，O(nm)'); });
}

engine.queue(() => runED());
panel.addButton('清空', () => { engine.clear(); clearView(); hint.setText('已清空，可重新运行'); status.textContent = ''; outT.setText(''); });
panel.addLabel('（拖拽旋转视角，滚轮缩放；黄 = 转移来源闪烁，金 = 匹配对角，橙 = 最小值格，绿 = 回溯路径）');

scene.start(engine);
