// AlgorithmLibrary/Banker3D.js — 银行家算法：分配前先试算，只有能走完安全序列的请求才放行 —— 死锁避免的经典（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Banker3D');

const scene = new Scene3D('scene', { cameraPos: [0, 260, 700], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「运行演示」开始：银行家 —— 试算安全序列 <P1,P3,P4,P0,P2>', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 262, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: -120, z: 0, color: PALETTE.textGlow, scale: 0.54 });
const outT = new VText(scene, { text: '', x: 0, y: -235, z: 0, color: PALETTE.textGlow, scale: 0.62 });

// 经典例：资源 A=10 B=5 C=7
const ALLOC = [[0, 1, 0], [2, 0, 0], [3, 0, 2], [2, 1, 1], [0, 0, 2]];
const MAXM = [[7, 5, 3], [3, 2, 2], [9, 0, 2], [2, 2, 2], [4, 3, 3]];
const AVAIL0 = [3, 3, 2];
const NEED = MAXM.map((m, i) => m.map((v, j) => v - ALLOC[i][j]));
// 检查顺序：先试 P0（不满足，红）→ 然后安全序列 P1→P3→P4→P0→P2
const ORDER = [0, 1, 3, 4, 0, 2];
const rowY = [130, 85, 40, -5, -50];
const cellX = [-170, -40, 90];
const needCells = {}, allocCells = {};
for (let i = 0; i < 5; i++) {
  new VText(scene, { text: 'P' + i, x: -330, y: rowY[i], z: 0, color: PALETTE.textGlow, scale: 0.5 });
  needCells[i] = NEED[i].map((v, j) => new VBox(scene, { w: 74, h: 36, d: 36, x: cellX[j], y: rowY[i], z: 0, label: v, color: DIM, emissive: DIM }));
  allocCells[i] = ALLOC[i].map((v, j) => new VBox(scene, { w: 74, h: 36, d: 36, x: cellX[j] + 195, y: rowY[i], z: 0, label: v, color: DIM, emissive: DIM }));
}
new VText(scene, { text: 'Need（还需）', x: -40, y: 175, z: 0, color: PALETTE.textDim, scale: 0.4 });
new VText(scene, { text: 'Allocation（已占）', x: 155, y: 175, z: 0, color: PALETTE.textDim, scale: 0.4 });
const availCells = AVAIL0.map((v, j) => new VBox(scene, { w: 74, h: 40, d: 40, x: cellX[j], y: -100, z: 0, label: v, color: CYAN, emissive: CYAN }));
new VText(scene, { text: 'Available（可用）', x: -40, y: -65, z: 0, color: PALETTE.textDim, scale: 0.4 });
const seqT = new VText(scene, { text: '', x: 0, y: -170, z: 0, color: GOLD, scale: 0.56 });
let avail = [...AVAIL0];

function leq(a, b) { return a.every((v, i) => v <= b[i]); }

function* bankerGen() {
  yield S(() => { hint.setText('银行家：把系统当银行 —— 请求资源 = 贷款，只有「还完所有贷款还有可能」才批准'); stageT.setText('资源 A=10 B=5 C=7；Available = [3,3,2]；Need = Max − Allocation'); });
  yield W(800);
  const seq = [];
  for (let k = 0; k < ORDER.length; k++) {
    const i = ORDER[k];
    const ok = leq(NEED[i], avail);
    needCells[i].forEach(c => c.setColor(ok ? GREEN : RED, ok ? GREEN : RED));
    yield S(() => {
      const needStr = '[' + NEED[i].join(',') + ']', avStr = '[' + avail.join(',') + ']';
      stageT.setText('检查 P' + i + '：Need ' + needStr + ' ≤ Available ' + avStr + (ok ? ' ✓' : ' ✗（资源不够）'));
      eqT.setText(ok ? '满足 → 假定 P' + i + ' 执行完，释放 Allocation 归还系统' : '不满足 → 现在不能批准 P' + i + '，跳过（未入安全序列）');
      seqT.setText('安全序列（已确认）：<' + seq.join(', ') + '>');
    });
    yield W(800);
    if (ok) {
      avail = avail.map((v, j) => v + ALLOC[i][j]);
      seq.push('P' + i);
      availCells.forEach((c, j) => { c.setText(avail[j]); c.setColor(GOLD, GOLD); });
      allocCells[i].forEach(c => c.setColor(GREEN, GREEN));
      yield S(() => { stageT.setText('P' + i + ' 完成并释放：Available ← [' + avail.join(',') + ']（资源回笼）'); eqT.setText('安全序列追加 P' + i); });
      yield W(700);
      availCells.forEach(c => c.setColor(CYAN, CYAN));
    }
    yield W(350);
  }
  yield S(() => { outT.setText('安全序列 <P1, P3, P4, P0, P2> —— 每个进程都能跑完，系统永远不会死锁'); status.textContent = '银行家：状态安全，序列 <P1,P3,P4,P0,P2>'; hint.setText('核心：安全状态 = 存在安全序列。银行家只在「分配后仍安全」时才批准请求'); });
  yield W(1100);
  yield S(() => { hint.setText('复杂度 O(n²·m)。应用：数据库事务预检、资源管理教学 —— 现实中很少用，因需预知 Max'); outT.setText('反例：不安全状态也可能不死锁（保守）；已知最大需求是硬前提，否则退化为死锁检测'); });
  yield W(1100);
  yield S(() => { hint.setText('银行家演示完成：安全序列 <P1,P3,P4,P0,P2>，Available 从 [3,3,2] 涨到 [10,5,7]'); outT.setText(''); seqT.setText(''); });
  yield W(400);
}

function* runBanker() {
  hint.setText('银行家：试算安全序列');
  yield W(400);
  yield* bankerGen();
}

panel.addButton('运行演示', () => engine.start(runBanker()));
panel.addButton('清空', () => { engine.clear(); stageT.setText(''); eqT.setText(''); outT.setText(''); seqT.setText(''); for (let i = 0; i < 5; i++) { needCells[i].forEach((c, j) => { c.setColor(DIM, DIM); c.setText(NEED[i][j]); }); allocCells[i].forEach((c, j) => { c.setColor(DIM, DIM); c.setText(ALLOC[i][j]); }); } availCells.forEach((c, j) => { c.setColor(CYAN, CYAN); c.setText(AVAIL0[j]); }); avail = [...AVAIL0]; hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；青 = Available，绿 = 满足并释放，红 = 不满足跳过；Need ≤ Available 是放行判据）');

scene.start(engine);
