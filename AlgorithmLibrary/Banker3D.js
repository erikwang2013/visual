// AlgorithmLibrary/Banker3D.js — 银行家算法：分配前先试算，只有能走完安全序列的请求才放行 —— 死锁避免的经典（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Banker3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, CYAN = 0x22d3ee, DIM = 0x334155;
const status = panel.addStatus('就绪');

// 经典例：资源 A=10 B=5 C=7。演示体（行标签/表名/单元格）模块级一次性预建，generator 内零 new
const ALLOC = [[0, 1, 0], [2, 0, 0], [3, 0, 2], [2, 1, 1], [0, 0, 2]];
const MAXM = [[7, 5, 3], [3, 2, 2], [9, 0, 2], [2, 2, 2], [4, 3, 3]];
const AVAIL0 = [3, 3, 2];
const NEED = MAXM.map((m, i) => m.map((v, j) => v - ALLOC[i][j]));
// 检查顺序：先试 P0（不满足，红）→ 安全序列 P1→P3→P4→P0→P2
const ORDER = [0, 1, 3, 4, 0, 2];
const rowY = [800, 750, 700, 650, 600];
const needX = [120, 210, 300];
const allocX = [390, 480, 570];
const needCells = {}, allocCells = {};
for (let i = 0; i < 5; i++) {
  new VText(scene, { text: 'P' + i, x: 55, y: rowY[i], z: 0, color: PALETTE.textGlow, scale: 0.5 });
  needCells[i] = NEED[i].map((v, j) => new VBox(scene, { w: 60, h: 36, d: 36, x: needX[j], y: rowY[i], z: 0, label: v, color: DIM, emissive: DIM }));
  allocCells[i] = ALLOC[i].map((v, j) => new VBox(scene, { w: 60, h: 36, d: 36, x: allocX[j], y: rowY[i], z: 0, label: v, color: DIM, emissive: DIM }));
}
const availCells = AVAIL0.map((v, j) => new VBox(scene, { w: 60, h: 40, d: 40, x: needX[j], y: 545, z: 0, label: v, color: CYAN, emissive: CYAN }));
let avail = [...AVAIL0];

function leq(a, b) { return a.every((v, i) => v <= b[i]); }

function* bankerGen() {
  yield S(() => { status.textContent = '银行家：系统像银行 —— 请求资源 = 贷款，只有「还完所有贷款还有可能」才批准。资源 A=10 B=5 C=7，Available=[3,3,2]，Need=Max−Allocation'; });
  yield W(800);
  const seq = [];
  for (let k = 0; k < ORDER.length; k++) {
    const i = ORDER[k];
    const ok = leq(NEED[i], avail);
    yield S(() => {
      needCells[i].forEach(c => c.setColor(ok ? GREEN : RED, ok ? GREEN : RED));
      const needStr = '[' + NEED[i].join(',') + ']', avStr = '[' + avail.join(',') + ']';
      status.textContent = '试算 P' + i + '：Need ' + needStr + ' ≤ Available ' + avStr + (ok ? ' ✓' : ' ✗ 资源不够，跳过（未入安全序列）');
    });
    yield W(800);
    if (ok) {
      avail = avail.map((v, j) => v + ALLOC[i][j]);
      seq.push('P' + i);
      yield S(() => {
        availCells.forEach((c, j) => { c.setText(avail[j]); c.setColor(GOLD, GOLD); });
        allocCells[i].forEach(c => c.setColor(GREEN, GREEN));
        status.textContent = 'P' + i + ' 完成并释放 Allocation，Available ← [' + avail.join(',') + ']（资源回笼）—— 安全序列追加 P' + i + '，当前 <' + seq.join(',') + '>';
      });
      yield W(700);
      availCells.forEach(c => c.setColor(CYAN, CYAN));
    }
    yield W(350);
  }
  yield S(() => { status.textContent = '安全序列 <P1, P3, P4, P0, P2>：每个进程都能跑完，系统永远不会死锁 —— 安全状态 = 存在安全序列，银行家只在分配后仍安全时才批准请求'; });
  yield W(1100);
  yield S(() => { status.textContent = '复杂度 O(n²·m)。应用：数据库事务预检、资源管理教学 —— 现实中很少用：需预知 Max，且不安全状态未必死锁（保守策略）'; });
  yield W(1100);
  yield S(() => { status.textContent = '银行家演示完成：试算后确认安全序列 <P1,P3,P4,P0,P2>，Available 由 [3,3,2] 升至 [10,5,7]；复杂度 O(n²·m)'; });
  yield W(400);
}

function* runBanker() {
  yield W(400);
  yield* bankerGen();
}

engine.queue(() => runBanker());
panel.addButton('清空', () => {
  engine.clear();
  for (let i = 0; i < 5; i++) {
    needCells[i].forEach((c, j) => { c.setColor(DIM, DIM); c.setText(NEED[i][j]); });
    allocCells[i].forEach((c, j) => { c.setColor(DIM, DIM); c.setText(ALLOC[i][j]); });
  }
  availCells.forEach((c, j) => { c.setColor(CYAN, CYAN); c.setText(AVAIL0[j]); });
  avail = [...AVAIL0];
  status.textContent = '';
});

scene.start(engine);
