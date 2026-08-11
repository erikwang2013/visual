// AlgorithmLibrary/DPFib3D.js — 动态规划斐波那契：一维表 F[0..12]，自底向上逐格计算，操作数青色高亮、结果金色写入（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('DPFib3D');

const scene = new Scene3D('scene', { cameraPos: [0, 220, 620], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff;
const hint = new VText(scene, { text: '点击「运行演示」开始：DP 计算斐波那契 F[12]', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const outT = new VText(scene, { text: '', x: 0, y: -250, z: 0, color: PALETTE.textGlow, scale: 0.7 });

const N = 12;
const cellView = new Map();   // i -> VBox
const F = new Array(N + 1).fill(null);

function clearView() {
  cellView.forEach(c => scene.remove(c.box.mesh));
  cellView.clear();
}
function buildTable() {
  clearView();
  new VText(scene, { text: 'F', x: -470, y: 0, z: 0, color: CYAN, scale: 0.8 });
  for (let i = 0; i <= N; i++) {
    const box = new VBox(scene, { w: 58, h: 52, d: 16, x: (i - N / 2) * 70, y: 0, z: 0, label: F[i] === null ? '?' : String(F[i]), color: BLUE, emissive: BLUE });
    cellView.set(i, { box, val: F[i] });
  }
}
function setCell(i, v, c) {
  F[i] = v;
  const e = cellView.get(i);
  e.box.setText(String(v));
  e.box.setColor(c, c);
}
function setCellColor(i, c) { const e = cellView.get(i); if (e) e.box.setColor(c, c); }
function resetAll() { cellView.forEach((e, i) => setCellColor(i, BLUE)); }

function* fibGen() {
  F[0] = 0; F[1] = 1;
  buildTable();
  setCellColor(0, GOLD); setCellColor(1, GOLD);
  yield S(() => outT.setText('DP 斐波那契：边界 F[0]=0、F[1]=1 已知，自底向上用递推式 F[i]=F[i-1]+F[i-2] 填表'));
  yield W(650);
  for (let i = 2; i <= N; i++) {
    setCellColor(i - 1, CYAN);
    setCellColor(i - 2, ORANGE);
    yield S(() => outT.setText('F[' + i + '] = F[' + (i - 1) + '] + F[' + (i - 2) + '] = ' + F[i - 1] + ' + ' + F[i - 2]));
    yield W(420);
    const v = F[i - 1] + F[i - 2];
    setCell(i, v, GOLD);
    yield S(() => outT.setText('→ F[' + i + '] = ' + v + ' 写入表格（青 = 前一项，橙 = 前二项）'));
    yield W(500);
    setCellColor(i - 1, i - 1 <= 1 ? GOLD : BLUE);
    setCellColor(i - 2, i - 2 <= 1 ? GOLD : BLUE);
  }
  yield S(() => outT.setText('完成：F[' + N + '] = ' + F[N] + '；时间 O(n)、空间 O(n)（可优化为滚动两个变量 O(1)）'));
  yield W(650);
  yield S(() => { status.textContent = 'DP 斐波那契完成：F[' + N + '] = ' + F[N]; });
  yield W(450);
}

function* runFib() {
  hint.setText('DP：重叠子问题 + 记忆化表格，避免指数级重复计算');
  yield W(400);
  yield* fibGen();
  yield S(() => { outT.setText(''); hint.setText('DP 斐波那契完成：F[' + N + '] = ' + F[N] + '，O(n)'); });
}

panel.addButton('运行演示', () => engine.start(runFib()));
panel.addButton('清空', () => { engine.clear(); clearView(); hint.setText('已清空，可重新运行'); status.textContent = ''; outT.setText(''); });
panel.addLabel('（拖拽旋转视角，滚轮缩放；金 = 已填结果，青/橙 = 本次两个操作数）');

scene.start(engine);
