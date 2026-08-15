// AlgorithmLibrary/Raft3D.js — Raft 共识：超时竞选 → 多数票成 Leader → 日志复制并提交（function* 生成器驱动，解说入状态栏）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Raft3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, BLUE = 0x60a5fa, GOLD = 0xfcd34d, YELLOW = 0xfacc15;
const status = panel.addStatus('就绪');

const N = 5, SPX = 160;
const nodes = [], states = [], logs = [];
for (let i = 0; i < N; i++) {
  nodes.push(new VNode(scene, { x: (i - 2) * SPX + 320, y: 430, z: 0, radius: 26, label: 'S' + (i + 1), color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
  states.push(new VText(scene, { text: 'Follower', x: (i - 2) * SPX + 320, y: 488, z: 0, color: PALETTE.textDim, scale: 0.6 }));
  logs.push(new VText(scene, { text: '', x: (i - 2) * SPX + 320, y: 370, z: 0, color: GREEN, scale: 0.6 }));
}
const termT = new VText(scene, { text: '任期 term = 1', x: 320, y: 560, z: 0, color: GOLD, scale: 0.55 });
const c3 = nodes[2];
const tubes = [];
for (let i = 0; i < N; i++) {
  if (i === 2) continue;
  tubes.push({ mesh: tubeBetween(scene, c3.mesh.position, nodes[i].mesh.position, { color: BLUE, opacity: 0.5, radius: 2.2 }), target: i });
}

function resetAll() {
  nodes.forEach((n, i) => { n.setColor(PALETTE.node, PALETTE.nodeEmissive); n.setText('S' + (i + 1)); });
  states.forEach(t => t.setText('Follower'));
  logs.forEach(t => t.setText(''));
  tubes.forEach(t => t.mesh.visible = false);
  termT.setText('任期 term = 1');
}

function* raftGen() {
  resetAll();
  yield S(() => { status.textContent = 'Raft 共识：5 节点集群，多数派 3/5 决定提交。S1-S5 初始全为 Follower，各自随机超时计时器倒计时'; });
  yield W(700);
  yield S(() => {
    c3.setColor(YELLOW, YELLOW);
    states[2].setText('Candidate');
    termT.setText('任期 term = 2');
    status.textContent = 'S3 计时器先到期 → 转为 Candidate，任期 +1，发起选举';
  });
  yield W(900);
  yield S(() => {
    tubes.forEach(t => t.mesh.visible = true);
    status.textContent = 'S3 向其余 4 节点广播 RequestVote 请求票';
  });
  yield W(800);
  yield S(() => {
    tubes.forEach(t => { t.mesh.material.color.setHex(GREEN); });
    nodes.forEach((n, i) => { if (i !== 2) n.pulse(0.3); });
    states.forEach((t, i) => { if (i !== 2) t.setText('投票'); });
    status.textContent = '其余节点任期/日志均不落后 → 投赞成票给 S3';
  });
  yield W(800);
  yield S(() => {
    c3.setColor(GOLD, GOLD);
    states[2].setText('Leader');
    tubes.forEach(t => t.mesh.visible = false);
    states.forEach((t, i) => { if (i !== 2) t.setText('Follower'); });
    status.textContent = 'S3 获 5/5 票 > 多数 3/5 → 当选 Leader，心跳维持任期';
  });
  yield W(700);
  yield S(() => {
    tubes.forEach(t => t.mesh.visible = true);
    nodes.forEach((n, i) => { if (i !== 2) n.setColor(GREEN, GREEN); });
    status.textContent = 'Client → Leader：SET x = 1 先落 Leader 日志，AppendEntries 复制给全部 Follower';
  });
  yield W(800);
  yield S(() => {
    logs.forEach(t => t.setText('x=1'));
    nodes.forEach((n, i) => { if (i !== 2) n.setColor(PALETTE.node, PALETTE.nodeEmissive); });
    status.textContent = '过半 Follower 确认 → Leader 提交 x=1，通知所有节点应用';
  });
  yield W(900);
  yield S(() => {
    tubes.forEach(t => t.mesh.visible = false);
    logs.forEach(t => t.setText('x=1 ✓'));
    status.textContent = 'Raft 演示完成：S3 超时竞选（term=2）获 5/5 票当选 Leader → 复制并提交 x=1 至全部 5 节点；多数派 3/5 决定提交，崩溃后超时重选、新 Leader 补齐落后节点';
  });
  yield W(600);
}

engine.queue(() => raftGen());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
