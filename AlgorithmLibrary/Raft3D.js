// AlgorithmLibrary/Raft3D.js — Raft 共识：超时竞选 → 多数票成 Leader → 日志复制并提交（function* 生成器驱动，解说入状态栏）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText } from '../3D/VisualObject3D.js';
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
  logs.push(new VText(scene, { text: '', x: (i - 2) * SPX + 320, y: 370, z: 0, color: GREEN, scale: 0.6 }));
}
const termT = new VText(scene, { text: '任期 term = 1', x: 320, y: 560, z: 0, color: GOLD, scale: 0.55 });
const c3 = nodes[2];
// 边 = 管 + 箭头组成 Group，以中点为组原点：整体 0→1 缩放模拟「画线过程」，箭头始终指向目标端
const ease = p => p * p * (3 - 2 * p);
function edgeGroup(a, b) {
  const va = a.clone(), vb = b.clone();
  const mid = new THREE.Vector3().addVectors(va, vb).multiplyScalar(0.5);
  const mat = new THREE.MeshBasicMaterial({ color: BLUE, transparent: true, opacity: 0.5 });
  const g = new THREE.Group();
  const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([va, vb]), 4, 2.2, 6), mat);
  tube.position.copy(mid).negate();
  g.add(tube);
  const d = new THREE.Vector3().subVectors(vb, va).normalize();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(7, 15, 8), mat);
  cone.position.copy(vb).sub(mid).addScaledVector(d, -22);
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
  g.add(cone);
  g.position.copy(mid);
  g.visible = false;
  scene.add(g);
  return { group: g, mesh: tube };
}
const tubes = [];
for (let i = 0; i < N; i++) {
  if (i === 2) continue;
  tubes.push({ ...edgeGroup(c3.mesh.position, nodes[i].mesh.position), target: i });
}
function* revealTubes() {
  tubes.forEach(t => { t.group.visible = true; t.group.scale.setScalar(0.01); });
  yield A(600, p => { const e = ease(p); tubes.forEach(t => t.group.scale.setScalar(0.01 + 0.99 * e)); });
}

function resetAll() {
  nodes.forEach((n, i) => { n.setColor(PALETTE.node, PALETTE.nodeEmissive); n.setText('S' + (i + 1)); });
  logs.forEach(t => t.setText(''));
  tubes.forEach(t => t.group.visible = false);
  termT.setText('任期 term = 1');
}

function* raftGen() {
  resetAll();
  yield S(() => { status.textContent = 'Raft 共识：5 节点集群，多数派 3/5 决定提交。S1-S5 初始全为 Follower，各自随机超时计时器倒计时'; });
  yield W(700);
  yield S(() => {
    c3.setColor(YELLOW, YELLOW);
    termT.setText('任期 term = 2');
    status.textContent = 'S3 计时器先到期 → 转为 Candidate，任期 +1，发起选举';
  });
  yield W(900);
  yield S(() => { status.textContent = 'S3 向其余 4 节点广播 RequestVote 请求票'; });
  yield* revealTubes();
  yield W(800);
  yield S(() => {
    tubes.forEach(t => { t.mesh.material.color.setHex(GREEN); });
    nodes.forEach((n, i) => { if (i !== 2) n.pulse(0.3); });
    status.textContent = '其余节点任期/日志均不落后 → 投赞成票给 S3';
  });
  yield W(800);
  yield S(() => {
    c3.setColor(GOLD, GOLD);
    tubes.forEach(t => t.group.visible = false);
    status.textContent = 'S3 获 5/5 票 > 多数 3/5 → 当选 Leader，心跳维持任期';
  });
  yield W(700);
  yield S(() => {
    nodes.forEach((n, i) => { if (i !== 2) n.setColor(GREEN, GREEN); });
    status.textContent = 'Client → Leader：SET x = 1 先落 Leader 日志，AppendEntries 复制给全部 Follower';
  });
  yield* revealTubes();
  yield W(800);
  yield S(() => {
    logs.forEach(t => t.setText('x=1'));
    nodes.forEach((n, i) => { if (i !== 2) n.setColor(PALETTE.node, PALETTE.nodeEmissive); });
    status.textContent = '过半 Follower 确认 → Leader 提交 x=1，通知所有节点应用';
  });
  yield W(900);
  yield S(() => {
    tubes.forEach(t => t.group.visible = false);
    logs.forEach(t => t.setText('x=1 ✓'));
    status.textContent = 'Raft 演示完成：S3 超时竞选（term=2）获 5/5 票当选 Leader → 复制并提交 x=1 至全部 5 节点；多数派 3/5 决定提交，崩溃后超时重选、新 Leader 补齐落后节点';
  });
  yield W(600);
}

engine.queue(() => raftGen());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
