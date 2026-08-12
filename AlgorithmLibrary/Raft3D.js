// AlgorithmLibrary/Raft3D.js — Raft 共识：超时竞选 → 多数票成 Leader → 日志复制并提交（function* 生成器驱动）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, tubeBetween, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Raft3D');

const scene = new Scene3D('scene', { cameraPos: [0, 380, 720], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, BLUE = 0x60a5fa, GOLD = 0xfcd34d, YELLOW = 0xfacc15, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「▶ 演示」开始', x: 0, y: 330, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');

const N = 5, SPX = 160;
const nodes = [];
const states = [];
const logs = [];
for (let i = 0; i < N; i++) {
  nodes.push(new VNode(scene, { x: (i - 2) * SPX, y: 0, z: 0, radius: 26, label: 'S' + (i + 1), color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
  states.push(new VText(scene, { text: 'Follower', x: (i - 2) * SPX, y: 55, z: 0, color: PALETTE.textDim, scale: 0.6 }));
  logs.push(new VText(scene, { text: '', x: (i - 2) * SPX, y: -60, z: 0, color: GREEN, scale: 0.6 }));
}
const termT = new VText(scene, { text: '任期 term = 1', x: 0, y: 150, z: 0, color: PALETTE.textDim, scale: 0.75 });
const clientT = new VText(scene, { text: '', x: 0, y: -140, z: 0, color: PALETTE.textGlow, scale: 0.8 });
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
  clientT.setText('');
}

function* raftGen() {
  resetAll();
  yield S(() => hint.setText('Raft：节点分三种角色——Follower（从）、Candidate（竞选者）、Leader（主）'));
  yield S(() => {
    termT.setText('任期 term = 1');
    hint.setText('初始：所有节点都是 Follower，随机超时计时器倒计时');
  });
  yield W(600);
  yield S(() => {
    c3.setColor(YELLOW, YELLOW);
    states[2].setText('Candidate');
    termT.setText('任期 term = 2（S3 发起选举）');
    hint.setText('S3 的计时器先到期 → 变为 Candidate，任期 +1，先给自己投一票');
  });
  yield W(900);
  yield S(() => {
    tubes.forEach(t => t.mesh.visible = true);
    hint.setText('S3 广播 RequestVote 请求票给 S1、S2、S4、S5');
  });
  yield W(800);
  yield S(() => {
    tubes.forEach(t => { t.mesh.material.color.setHex(GREEN); });
    nodes.forEach((n, i) => { if (i !== 2) n.pulse(0.3); });
    states.forEach((t, i) => { if (i !== 2) t.setText('投票给 S3'); });
    hint.setText('其余节点看到 S3 任期最新且日志不落后 → 投赞成票');
  });
  yield W(800);
  yield S(() => {
    c3.setColor(GOLD, GOLD);
    states[2].setText('Leader');
    tubes.forEach(t => t.mesh.visible = false);
    states.forEach((t, i) => { if (i !== 2) t.setText('Follower'); });
    hint.setText('S3 获得 4 票（加自己 5/5）> 多数（3/5）→ 当选 Leader');
  });
  yield W(700);
  yield S(() => {
    clientT.setText('Client → Leader：SET x = 1');
    hint.setText('客户端只与 Leader 通信：写入请求先落到 Leader 日志');
  });
  yield W(800);
  yield S(() => {
    tubes.forEach(t => t.mesh.visible = true);
    nodes.forEach((n, i) => { if (i !== 2) n.setColor(GREEN, GREEN); });
    hint.setText('Leader 把日志条目「x=1」通过 AppendEntries 复制给所有 Follower');
  });
  yield W(700);
  yield S(() => {
    logs.forEach(t => t.setText('x=1'));
    nodes.forEach((n, i) => { if (i !== 2) n.setColor(PALETTE.node, PALETTE.nodeEmissive); });
    hint.setText('过半节点已确认收到 → Leader 提交日志，并通知所有节点提交');
  });
  yield W(900);
  yield S(() => {
    tubes.forEach(t => t.mesh.visible = false);
    logs.forEach(t => t.setText('x=1（已提交）'));
    status.textContent = 'Raft 提交完成：多数派确认 → x = 1 在 5 个节点上生效';
    hint.setText('节点崩溃也不怕：超时重新选举，新 Leader 通过日志索引补齐落后节点');
  });
  yield W(600);
}

engine.queue(() => raftGen());
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；etcd / Consul 等一致性存储的底层协议）');

scene.start(engine);
