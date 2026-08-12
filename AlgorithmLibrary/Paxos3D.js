// AlgorithmLibrary/Paxos3D.js — Paxos：两阶段多数票达成共识（Prepare/Promise/Accept）（function* 生成器驱动）
// draw.io 风格实体图标：服务器机架（正面 2 槽）= 共识节点，名称标签浮在机架前方
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, easeInOut } from '../3D/VisualObject3D.js';
import { glowMaterial, PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Paxos3D');

const scene = new Scene3D('scene', { cameraPos: [0, 330, 640], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, ROSE = 0xfb7185, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：Paxos 共识', x: 0, y: 255, z: 0, color: PALETTE.textGlow, scale: 0.85 });
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

const NX = [-240, -120, 0, 120, 240];
const nodes = NX.map((x, i) => makeNode(x, 100));
const nodeLabel = NX.map((x, i) => new VText(scene, { text: 'P' + (i + 1), x, y: 100, z: 22, color: PALETTE.textGlow, scale: 0.58 }));
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
  nodes.forEach(b => b.setColor(PALETTE.node, false));
  msgLine.mesh.visible = false;
  roundT.setText(''); stepT.setText(''); eqT.setText('');
}

function* paxosGen() {
  resetAll();
  yield S(() => hint.setText('Paxos：先「准备」收集多数票，再「接受」提交值 — 分布式一致性的祖师爷'));
  yield S(() => { stepT.setText('目标：5 节点对一个值达成一致（多数 3 票即可）'); });
  yield W(500);
  yield S(() => {
    nodes[2].setColor(YELLOW, true);
    roundT.setText('第 1 轮：提议者 P3 提出提案号 n=1');
    stepT.setText('P3 广播 Prepare(n=1) → 等多数（3 个）Promise 回复');
  });
  yield W(800);
  yield S(() => {
    [0, 1, 4].forEach(i => { lineTo(2, i); nodes[i].setColor(BLUE, true); });
    stepT.setText('P1、P2、P5 回复 Promise（接受此编号）— 3 票达成 quorum ✓');
  });
  yield W(900);
  yield S(() => {
    [0, 1, 4].forEach(i => nodes[i].setColor(PALETTE.node, false));
    msgLine.mesh.visible = false;
    roundT.setText('第 2 轮：P3 广播 Accept(6)');
    stepT.setText('收到多数 Promise → P3 提交值 v=6，各节点 Accept 记录');
  });
  yield W(900);
  yield S(() => {
    [0, 1, 2, 4].forEach(i => nodes[i].setColor(GREEN, true));
    stepT.setText('P1、P2、P3、P5 接受 6 → 值 6 被锁定（Acceptor 记住编号与值）');
  });
  yield W(900);
  yield S(() => {
    [0, 1, 2, 4].forEach(i => nodes[i].setColor(PALETTE.node, false));
    nodes[0].setColor(YELLOW, true);
    roundT.setText('新提议 P1 带着更高编号 n=2 来了');
    stepT.setText('P1 先 Prepare(n=2)：Acceptor 只会 Promise 编号更大的提案');
  });
  yield W(900);
  yield S(() => {
    lineTo(0, 2); lineTo(0, 4);
    nodes[2].setColor(BLUE, true); nodes[4].setColor(BLUE, true);
    stepT.setText('Acceptor 回答：我已接受 6 → 新提议必须带上旧值 v=6（学习历史）');
  });
  yield W(900);
  yield S(() => {
    [0, 2, 4].forEach(i => nodes[i].setColor(GREEN, true));
    roundT.setText('P1 Accept(6)：P3、P5 + 自己 → 多数接受 6');
    stepT.setText('P1 也提交 6 → 新编号提案被老值驯服，一致不分裂 — Paxos 的巧妙之处');
    eqT.setText('协议：Prepare(编号) → Promise(最大编号/值) → Accept(值) → 多数即可');
  });
  yield W(900);
  yield S(() => {
    status.textContent = 'Paxos 完成：两轮 Prepare/Accept，值 6 被 5 节点锁定（quorum=3），新旧提案一致';
    hint.setText('Paxos 靠「编号压制 + 学习旧值」保证不冲突 — Raft 是其更易实现的同类');
  });
  yield W(600);
}

engine.queue(() => paxosGen());
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；黄=提议者，蓝=Promise/Accept 回复，绿=达成共识）');

scene.start(engine);
