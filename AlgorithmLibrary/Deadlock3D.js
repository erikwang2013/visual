// AlgorithmLibrary/Deadlock3D.js — 死锁检测：资源分配图逐边画入，发现「请求-分配」环即死锁
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Deadlock3D');

const scene = new Scene3D('scene', { cameraPos: [0, 330, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, ROSE = 0xfb7185, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「死锁检测」开始', x: 0, y: 265, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

// 进程（上排）与资源（下排）
const procs = ['P1', 'P2', 'P3'].map((n, i) => new VBox(scene, { w: 92, h: 92, d: 92, x: -200 + i * 200, y: 120, z: 0, label: n, color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
const resBoxes = [new VBox(scene, { w: 92, h: 92, d: 92, x: -100, y: -95, z: 0, label: 'R1', color: BLUE, emissive: BLUE }),
  new VBox(scene, { w: 92, h: 92, d: 92, x: 100, y: -95, z: 0, label: 'R2', color: BLUE, emissive: BLUE })];
new VText(scene, { text: '资源实例点（每资源 1 个）', x: 0, y: -165, z: 0, color: PALETTE.textDim, scale: 0.6 });
// 实例点放在盒子前面板右上角，避开居中的 R1/R2 标签（标签半宽 20.5，点半宽 9）
const dotT = [
  new VText(scene, { text: '●', x: -66, y: -73, z: 20, color: PALETTE.textGlow, scale: 0.6 }),
  new VText(scene, { text: '●', x: 134, y: -73, z: 20, color: PALETTE.textGlow, scale: 0.6 }),
];

// 5 条边：请求边 P→R（黄），分配边 R→P（蓝）；前 4 条成环
const EDGES = [
  { a: [-200, 120], b: [-100, -95], kind: 'request', cycle: true },
  { a: [-100, -95], b: [0, 120], kind: 'alloc', cycle: true },
  { a: [0, 120], b: [100, -95], kind: 'request', cycle: true },
  { a: [100, -95], b: [-200, 120], kind: 'alloc', cycle: true },
  { a: [200, 120], b: [-100, -95], kind: 'request', cycle: false },
];
const edgeBoxes = EDGES.map(e => new VBox(scene, { w: 200, h: 3.5, d: 3.5, x: 0, y: 0, z: 0, label: '', color: e.kind === 'request' ? YELLOW : BLUE, emissive: e.kind === 'request' ? YELLOW : BLUE }));
edgeBoxes.forEach(b => (b.mesh.visible = false));
function drawEdge(i) {
  const e = EDGES[i], b = edgeBoxes[i];
  b.mesh.position.set((e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2, 0);
  b.mesh.rotation.z = Math.atan2(e.b[1] - e.a[1], e.b[0] - e.a[0]);
  b.mesh.scale.set(Math.hypot(e.b[0] - e.a[0], e.b[1] - e.a[1]) / 200, 1, 1);
  b.mesh.visible = true;
}
function edgeColor(i, c) { edgeBoxes[i].setColor(c, c); }

const stepT = new VText(scene, { text: '', x: 0, y: 30, z: 0, color: PALETTE.textGlow, scale: 0.75 });
const eqT = new VText(scene, { text: '', x: 0, y: -125, z: 0, color: PALETTE.textDim, scale: 0.68 });

function resetAll() {
  engine.clear();
  procs.forEach(p => p.setColor(PALETTE.node, PALETTE.nodeEmissive));
  procs[0].setText('P1'); procs[1].setText('P2'); procs[2].setText('P3');
  edgeBoxes.forEach(b => (b.mesh.visible = false));
  stepT.setText(''); eqT.setText('');
}

function runDeadlock() {
  resetAll();
  hint.setText('资源分配图：进程请求资源（黄箭头）＋ 资源分配给进程（蓝箭头）— 有环就有死锁');
  C(400, () => { stepT.setText('3 个进程 P1/P2/P3，2 种资源 R1/R2（各 1 个实例）。边一条条画出来…'); });
  C(700, () => { drawEdge(0); stepT.setText('边 1：P1 正在请求 R1（P1→R1 黄色请求边）'); });
  C(700, () => { drawEdge(1); stepT.setText('边 2：R1 已分配给了 P2（R1→P2 蓝色分配边）— R1 被 P2 占用'); });
  C(700, () => { drawEdge(2); stepT.setText('边 3：P2 正在请求 R2（P2→R2）'); });
  C(700, () => { drawEdge(3); stepT.setText('边 4：R2 已分配给了 P1（R2→P1）— R2 被 P1 占用'); });
  C(700, () => { drawEdge(4); stepT.setText('边 5：P3 也在请求 R1（只等 R1，暂时不构成环）'); });
  C(900, () => {
    EDGES.forEach((e, i) => { if (e.cycle) edgeColor(i, ROSE); });
    procs[0].setColor(ROSE, ROSE); procs[1].setColor(ROSE, ROSE);
    resBoxes.forEach(r => r.setColor(ROSE, ROSE));
    stepT.setText('环检测：P1→R1→P2→R2→P1 — 红色环闭合！检测到死锁');
    eqT.setText('P1 握着 R2 等 R1；P2 握着 R1 等 R2 — 谁都不放手，僵持到底');
  });
  C(900, () => {
    procs[2].setColor(GREEN, GREEN);
    stepT.setText('P3 只是「等 R1」，不在环上 — 它没死锁，只是排队等待');
    eqT.setText('死锁四条件：互斥 + 持有等待 + 不可剥夺 + 循环等待 — 环是充要的可见证据');
  });
  C(900, () => {
    edgeColor(0, ROSE); procs[0].setColor(PALETTE.node, PALETTE.nodeEmissive); procs[0].setText('P1 ✗');
    stepT.setText('处置：终止 P1 释放 R2 → R2 归还系统 → 环断开，P2 拿到 R2 继续跑');
    hint.setText('实际系统：用「等待图」周期找环（MySQL InnoDB 就是这么检测行锁死锁的）');
  });
  C(900, () => {
    status.textContent = '死锁检测完成：资源分配图发现环 P1→R1→P2→R2→P1 → 死锁成立，终止 P1 断环恢复';
  });
}

panel.addButton('死锁检测', runDeadlock);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；黄=请求边，蓝=分配边，红=死锁环，绿=非死锁进程）');

scene.start(engine);
