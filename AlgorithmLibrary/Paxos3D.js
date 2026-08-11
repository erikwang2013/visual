// AlgorithmLibrary/Paxos3D.js — Paxos：两阶段多数票达成共识（Prepare/Promise/Accept）
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Paxos3D');

const scene = new Scene3D('scene', { cameraPos: [0, 330, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, ROSE = 0xfb7185, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「Paxos 共识」开始', x: 0, y: 255, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const NX = [-240, -120, 0, 120, 240];
const nodes = NX.map((x, i) => new VBox(scene, { w: 84, h: 84, d: 84, x, y: 100, z: 0, label: 'P' + (i + 1), color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
new VText(scene, { text: '5 个节点，多数 = 3 票（quorum）', x: 0, y: 200, z: 0, color: PALETTE.textDim, scale: 0.7 });

// 消息连线：从提议者到各节点
const msgLine = new VBox(scene, { w: 200, h: 3, d: 3, x: 0, y: 0, z: 0, label: '', color: YELLOW, emissive: YELLOW });
msgLine.mesh.visible = false;

const roundT = new VText(scene, { text: '', x: 0, y: 20, z: 0, color: PALETTE.textGlow, scale: 0.75 });
const stepT = new VText(scene, { text: '', x: 0, y: -60, z: 0, color: PALETTE.textGlow, scale: 0.75 });
const eqT = new VText(scene, { text: '', x: 0, y: -110, z: 0, color: PALETTE.textDim, scale: 0.68 });

function lineTo(srcIdx, dstIdx) {
  const x1 = NX[srcIdx], x2 = NX[dstIdx];
  msgLine.mesh.position.set((x1 + x2) / 2, 30, 0);
  msgLine.mesh.rotation.z = 0;
  msgLine.mesh.scale.set(Math.abs(x2 - x1) / 200, 1, 1);
  msgLine.mesh.visible = true;
}

function resetAll() {
  engine.clear();
  nodes.forEach(b => b.setColor(PALETTE.node, PALETTE.nodeEmissive));
  msgLine.mesh.visible = false;
  roundT.setText(''); stepT.setText(''); eqT.setText('');
}

function runPaxos() {
  resetAll();
  hint.setText('Paxos：先「准备」收集多数票，再「接受」提交值 — 分布式一致性的祖师爷');
  C(300, () => { stepT.setText('目标：5 节点对一个值达成一致（多数 3 票即可）'); });
  C(800, () => {
    nodes[2].setColor(YELLOW, YELLOW);
    roundT.setText('第 1 轮：提议者 P3 提出提案号 n=1');
    stepT.setText('P3 广播 Prepare(n=1) → 等多数（3 个）Promise 回复');
  });
  C(800, () => {
    [0, 1, 4].forEach(i => { lineTo(2, i); nodes[i].setColor(BLUE, BLUE); });
    stepT.setText('P1、P2、P5 回复 Promise（接受此编号）— 3 票达成 quorum ✓');
  });
  C(900, () => {
    [0, 1, 4].forEach(i => nodes[i].setColor(PALETTE.node, PALETTE.nodeEmissive));
    msgLine.mesh.visible = false;
    roundT.setText('第 2 轮：P3 广播 Accept(6)');
    stepT.setText('收到多数 Promise → P3 提交值 v=6，各节点 Accept 记录');
  });
  C(900, () => {
    [0, 1, 2, 4].forEach(i => nodes[i].setColor(GREEN, GREEN));
    stepT.setText('P1、P2、P3、P5 接受 6 → 值 6 被锁定（Acceptor 记住编号与值）');
  });
  C(900, () => {
    [0, 1, 2, 4].forEach(i => nodes[i].setColor(PALETTE.node, PALETTE.nodeEmissive));
    nodes[0].setColor(YELLOW, YELLOW);
    roundT.setText('新提议 P1 带着更高编号 n=2 来了');
    stepT.setText('P1 先 Prepare(n=2)：Acceptor 只会 Promise 编号更大的提案');
  });
  C(900, () => {
    lineTo(0, 2); lineTo(0, 4);
    nodes[2].setColor(BLUE, BLUE); nodes[4].setColor(BLUE, BLUE);
    stepT.setText('Acceptor 回答：我已接受 6 → 新提议必须带上旧值 v=6（学习历史）');
  });
  C(900, () => {
    [0, 2, 4].forEach(i => nodes[i].setColor(GREEN, GREEN));
    roundT.setText('P1 Accept(6)：P3、P5 + 自己 → 多数接受 6');
    stepT.setText('P1 也提交 6 → 新编号提案被老值驯服，一致不分裂 — Paxos 的巧妙之处');
    eqT.setText('协议：Prepare(编号) → Promise(最大编号/值) → Accept(值) → 多数即可');
  });
  C(900, () => {
    status.textContent = 'Paxos 完成：两轮 Prepare/Accept，值 6 被 5 节点锁定（quorum=3），新旧提案一致';
    hint.setText('Paxos 靠「编号压制 + 学习旧值」保证不冲突 — Raft 是其更易实现的同类');
  });
}

panel.addButton('Paxos 共识', runPaxos);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；黄=提议者，蓝=Promise/Accept 回复，绿=达成共识）');

scene.start(engine);
