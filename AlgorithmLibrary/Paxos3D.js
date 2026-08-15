// AlgorithmLibrary/Paxos3D.js — Paxos：两阶段多数票达成共识（Prepare/Promise/Accept）（function* 生成器驱动）
// draw.io 风格实体图标：服务器机架（正面 2 槽）= 共识节点，名称标签浮在机架前方
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { glowMaterial, PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Paxos3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, DIM = 0x334155;
const status = panel.addStatus('就绪');

// draw.io 风格节点：机架 + 正面 2 槽
function makeNode(x, y) {
  const g = new THREE.Group();
  const rack = new THREE.Mesh(new THREE.BoxGeometry(84, 84, 26),
    glowMaterial(0x60a5fa, { emissive: 0x1e40af, emissiveIntensity: 0.3 }));
  const slots = [];
  for (let k = 0; k < 2; k++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(64, 9, 3),
      glowMaterial(DIM, { emissive: DIM, emissiveIntensity: 0.15 }));
    s.position.set(0, k ? 22 : -22, 14.5);
    g.add(s);
    slots.push(s);
  }
  g.add(rack);
  g.position.set(x, y, 0);
  scene.add(g);
  return {
    setColor: (c, on) => {
      rack.material.color.setHex(c);
      rack.material.emissive.setHex(c);
      rack.material.emissiveIntensity = on ? 0.6 : 0.3;
      slots.forEach(s => { s.material.color.setHex(c); s.material.emissive.setHex(c); s.material.emissiveIntensity = on ? 0.45 : 0.15; });
    },
  };
}

const NX = [80, 200, 320, 440, 560];
const nodes = NX.map((x, i) => makeNode(x, 300));
NX.forEach((x, i) => new VText(scene, { text: 'P' + (i + 1), x, y: 300, z: 22, color: PALETTE.textGlow, scale: 0.58 }));

// 消息连线：从提议者到各节点
const msgLine = new VBox(scene, { w: 200, h: 3, d: 3, x: 0, y: 230, z: 0, label: '', color: YELLOW, emissive: YELLOW });
msgLine.mesh.visible = false;

function lineTo(srcIdx, dstIdx) {
  const x1 = NX[srcIdx], x2 = NX[dstIdx];
  msgLine.mesh.position.set((x1 + x2) / 2, 230, 0);
  msgLine.mesh.rotation.z = 0;
  msgLine.mesh.scale.set(Math.abs(x2 - x1) / 200, 1, 1);
  msgLine.mesh.visible = true;
}

function resetAll() {
  nodes.forEach(b => b.setColor(PALETTE.node, false));
  msgLine.mesh.visible = false;
}

function* paxosGen() {
  resetAll();
  yield S(() => { status.textContent = 'Paxos（共识协议）：先「准备」收集多数票，再「接受」提交值 — 分布式一致性的祖师爷。目标：5 节点对一个值达成一致，多数 3 票即 quorum'; });
  yield W(700);
  yield S(() => { nodes[2].setColor(YELLOW, true); status.textContent = '第 1 轮：提议者 P3 提出提案号 n=1，广播 Prepare(n=1)，等多数（3 个）Promise 回复'; });
  yield W(800);
  yield S(() => {
    [0, 1, 4].forEach(i => { lineTo(2, i); nodes[i].setColor(BLUE, true); });
    status.textContent = 'P1、P2、P5 回复 Promise（承诺只接受编号 ≥ n 的提案）— 3 票达成 quorum';
  });
  yield W(900);
  yield S(() => {
    [0, 1, 4].forEach(i => nodes[i].setColor(PALETTE.node, false));
    msgLine.mesh.visible = false;
    status.textContent = '第 2 轮：收到多数 Promise → P3 提交值 v=6，广播 Accept(6)，各节点记录';
  });
  yield W(900);
  yield S(() => {
    [0, 1, 2, 4].forEach(i => nodes[i].setColor(GREEN, true));
    status.textContent = 'P1、P2、P3、P5 接受 6 — 值 6 被锁定（Acceptor 记住编号 n=1 与值 6）';
  });
  yield W(900);
  yield S(() => {
    [0, 1, 2, 4].forEach(i => nodes[i].setColor(PALETTE.node, false));
    nodes[0].setColor(YELLOW, true);
    status.textContent = '新提议：P1 带着更高编号 n=2 来了，先 Prepare(n=2) — Acceptor 只会 Promise 编号更大的提案';
  });
  yield W(900);
  yield S(() => {
    lineTo(0, 2); lineTo(0, 4);
    nodes[2].setColor(BLUE, true); nodes[4].setColor(BLUE, true);
    status.textContent = 'Acceptor 回答：我已接受 6 → 新提议必须带上旧值 v=6（学习历史，编号大的提案继承旧值）';
  });
  yield W(900);
  yield S(() => {
    [0, 2, 4].forEach(i => nodes[i].setColor(GREEN, true));
    status.textContent = 'P1 Accept(6)：P3、P5 + 自己 → 多数接受 6；新编号提案被老值驯服，一致不分裂 — 协议：Prepare(编号) → Promise(最大编号/值) → Accept(值) → 多数即可';
  });
  yield W(900);
  yield S(() => { status.textContent = 'Paxos 演示完成：两轮 Prepare/Accept，值 6 被 5 节点锁定（quorum=3）；新提案 n=2 学习旧值 6 后一致收敛，不冲突分裂'; });
  yield W(600);
}

engine.queue(() => paxosGen());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
