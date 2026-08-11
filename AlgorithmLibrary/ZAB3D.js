// AlgorithmLibrary/ZAB3D.js — ZAB：Leader 选举 + 事务广播，zxid 严格有序（ZooKeeper 核心）
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('ZAB3D');

const scene = new Scene3D('scene', { cameraPos: [0, 330, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, ROSE = 0xfb7185, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「ZAB 协议」开始', x: 0, y: 255, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const NX = [-240, -120, 0, 120, 240];
const nodes = NX.map((x, i) => new VBox(scene, { w: 84, h: 84, d: 84, x, y: 110, z: 0, label: 'F' + (i + 1), color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
new VText(scene, { text: '5 节点集群：F1 当选 Leader（epoch 2）', x: 0, y: 210, z: 0, color: PALETTE.textDim, scale: 0.7 });

const logT = new VText(scene, { text: '', x: 0, y: 30, z: 0, color: PALETTE.textGlow, scale: 0.7 });
const stepT = new VText(scene, { text: '', x: 0, y: -40, z: 0, color: PALETTE.textGlow, scale: 0.75 });
const eqT = new VText(scene, { text: '', x: 0, y: -90, z: 0, color: PALETTE.textDim, scale: 0.68 });
const ackT = new VText(scene, { text: '', x: 0, y: -140, z: 0, color: PALETTE.textDim, scale: 0.68 });

// 广播连线（Leader → 每个 follower）
const bcast = NX.slice(1).map((x, i) => {
  const b = new VBox(scene, { w: 200, h: 3, d: 3, x: (NX[0] + x) / 2, y: 70, z: 0, label: '', color: BLUE, emissive: BLUE });
  b.mesh.rotation.z = 0;
  b.mesh.scale.set(Math.abs(x - NX[0]) / 200, 1, 1);
  b.mesh.visible = false;
  return b;
});

function resetAll() {
  engine.clear();
  nodes.forEach(b => b.setColor(PALETTE.node, PALETTE.nodeEmissive));
  bcast.forEach(b => (b.mesh.visible = false));
  logT.setText(''); stepT.setText(''); eqT.setText(''); ackT.setText('');
}

function runZAB() {
  resetAll();
  hint.setText('ZAB：先选 Leader，所有写事务走 Leader 广播 — ZooKeeper 的顺序一致性保证');
  C(300, () => { stepT.setText('第 1 步：集群启动，全部进入选举状态（各自投自己）'); });
  C(800, () => {
    nodes[0].setColor(YELLOW, YELLOW);
    logT.setText('F1 得 3 票（自己 + F2 + F5）→ 当选 Leader，epoch = 2');
    stepT.setText('第 2 步：多数票选举 — F1 成为 Leader，其他成为 Follower');
  });
  C(900, () => {
    nodes[0].setText('Leader');
    bcast.forEach(b => (b.mesh.visible = true));
    logT.setText('zxid = 2:1   set(a) = 1');
    stepT.setText('第 3 步：写请求 set(a)=1 → Leader 生成事务 (epoch:seq) = (2:1) 广播给所有 Follower');
  });
  C(900, () => {
    nodes.slice(1).forEach(b => b.setColor(BLUE, BLUE));
    eqT.setText('Follower 写本地日志并回 ACK → Leader 收到多数 ACK 后广播 COMMIT');
    ackT.setText('ACK ✓✓✓ → COMMIT：全部节点应用 set(a)=1');
  });
  C(900, () => {
    nodes.slice(1).forEach(b => b.setColor(PALETTE.node, PALETTE.nodeEmissive));
    logT.setText('zxid = 2:2   set(b) = 2');
    stepT.setText('第 4 步：下一个写请求 set(b)=2 → zxid 递增为 2:2（顺序永不回退）');
  });
  C(900, () => {
    nodes[3].setColor(ROSE, ROSE); nodes[3].setText('F3 ✗');
    stepT.setText('故障：F3 宕机，丢失了 2:2 事务');
  });
  C(900, () => {
    bcast.forEach(b => (b.mesh.visible = false));
    nodes[0].setColor(GREEN, GREEN);
    stepT.setText('恢复：Leader 发现 F3 落后 → 让 F3 从 Leader 补同步缺失的 2:2');
    eqT.setText('ZAB 恢复模式：先同步日志对齐，再进入广播模式 — 保证不丢已提交事务');
  });
  C(900, () => {
    nodes[3].setColor(PALETTE.node, PALETTE.nodeEmissive); nodes[3].setText('F3');
    status.textContent = 'ZAB 完成：选举 F1（epoch=2）→ 广播 2:1、2:2 → F3 崩溃后补同步恢复一致';
    hint.setText('ZAB 与 Raft 齐名 — ZooKeeper 用它的 zxid 全序保证实现分布式锁/协调');
  });
}

panel.addButton('ZAB 协议', runZAB);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；黄=Leader，蓝=广播/ACK，红=故障节点，绿=恢复）');

scene.start(engine);
