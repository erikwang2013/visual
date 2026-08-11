// AlgorithmLibrary/ThreePC3D.js — 3PC：CanCommit/PreCommit/DoCommit 三阶段，解决 2PC 协调者崩溃阻塞
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('ThreePC3D');

const scene = new Scene3D('scene', { cameraPos: [0, 330, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, ROSE = 0xfb7185, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「三阶段提交」开始', x: 0, y: 265, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const coord = new VBox(scene, { w: 120, h: 70, d: 70, x: 0, y: 195, z: 0, label: '协调者', color: PALETTE.node, emissive: PALETTE.nodeEmissive });
const PX = [-210, 0, 210];
const parts = PX.map(x => new VBox(scene, { w: 86, h: 86, d: 86, x, y: -55, z: 0, label: 'P' + (PX.indexOf(x) + 1), color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
new VText(scene, { text: '3 个参与方（A/B/C 代表多个副本）', x: 0, y: -145, z: 0, color: PALETTE.textDim, scale: 0.62 });

// 消息线：协调者 → 参与方
const msgLine = new VBox(scene, { w: 200, h: 3.5, d: 3.5, x: 0, y: 0, z: 0, label: '', color: YELLOW, emissive: YELLOW });
msgLine.mesh.visible = false;
function lineTo(dstX) {
  const x1 = 0, y1 = 195, x2 = dstX, y2 = -55;
  msgLine.mesh.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0);
  msgLine.mesh.rotation.z = Math.atan2(y2 - y1, x2 - x1);
  msgLine.mesh.scale.set(Math.hypot(x2 - x1, y2 - y1) / 200, 1, 1);
  msgLine.mesh.visible = true;
}

const phaseT = new VText(scene, { text: '', x: 0, y: 95, z: 0, color: PALETTE.textGlow, scale: 0.75 });
const stepT = new VText(scene, { text: '', x: 0, y: 45, z: 0, color: PALETTE.textGlow, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: -200, z: 0, color: PALETTE.textDim, scale: 0.68 });

function resetAll() {
  engine.clear();
  coord.setColor(PALETTE.node, PALETTE.nodeEmissive); coord.setText('协调者');
  parts.forEach(p => p.setColor(PALETTE.node, PALETTE.nodeEmissive));
  msgLine.mesh.visible = false;
  phaseT.setText(''); stepT.setText(''); eqT.setText('');
}

function run3PC() {
  resetAll();
  hint.setText('3PC：多一个 PreCommit 阶段，让协调者崩溃时大家也能安全收场 — 2PC 的改良版');
  C(400, () => { phaseT.setText('阶段 1/3：CanCommit（能否提交？）'); stepT.setText('协调者广播 CanCommit，问各参与方：事务能提交吗？'); });
  C(800, () => {
    coord.setColor(YELLOW, YELLOW);
    PX.forEach((x, i) => {
      lineTo(x);
      parts[i].setColor(BLUE, BLUE);
    });
    stepT.setText('P1、P2、P3 回复 Yes — 各节点资源已检查、事务已就绪');
  });
  C(800, () => {
    msgLine.mesh.visible = false;
    coord.setColor(BLUE, BLUE);
    parts.forEach(p => p.setColor(PALETTE.node, PALETTE.nodeEmissive));
    phaseT.setText('阶段 2/3：PreCommit（预提交）');
    stepT.setText('全部 Yes → 协调者发 PreCommit：各节点写入 undo/redo 日志并 ACK');
  });
  C(800, () => {
    PX.forEach((x, i) => { lineTo(x); parts[i].setColor(BLUE, BLUE); });
    stepT.setText('P1、P2、P3 记录日志完毕，回 ACK ✓ — 关键时刻到了…');
  });
  C(900, () => {
    msgLine.mesh.visible = false;
    coord.setColor(GREEN, GREEN);
    phaseT.setText('阶段 3/3：DoCommit（正式提交）');
    stepT.setText('协调者广播 DoCommit → 各节点正式提交事务，三阶段完成 ✓');
  });
  C(800, () => {
    PX.forEach((x, i) => { lineTo(x); parts[i].setColor(GREEN, GREEN); });
    stepT.setText('提交完成：数据库更新生效，分布式事务落下帷幕');
  });
  C(900, () => {
    resetAll();
    coord.setColor(ROSE, ROSE); coord.setText('协调者 ✗');
    phaseT.setText('故障场景：协调者在 PreCommit 后、DoCommit 前崩溃');
    stepT.setText('若 2PC 在这里崩溃：参与方永远等不到 COMMIT → 永久阻塞、锁死资源');
  });
  C(900, () => {
    PX.forEach((x, i) => { lineTo(x); parts[i].setColor(ROSE, ROSE); });
    phaseT.setText('3PC 的答案：超时回滚');
    stepT.setText('3PC 中参与方已拿到 PreCommit → 超时后无法确认 → 统一执行 Abort 回滚');
    eqT.setText('对比：2PC = Prepare→Commit（协调者崩=卡死）；3PC = CanCommit→PreCommit→DoCommit（崩=超时回滚）');
  });
  C(900, () => {
    status.textContent = '3PC 完成：三阶段 CanCommit/PreCommit/DoCommit；协调者崩溃时参与方超时回滚，不再阻塞';
    hint.setText('3PC 用网络超时换可用性 — 但网络分区仍有分歧可能，生产多用 Raft 单点写入');
  });
}

panel.addButton('三阶段提交', run3PC);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；黄=CanCommit 询问，蓝=PreCommit 预提交，绿=DoCommit 提交，红=崩溃/回滚）');

scene.start(engine);
