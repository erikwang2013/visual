// AlgorithmLibrary/Gossip3D.js — Gossip：感染式传播，每轮随机聊几人，全网快速知情（function* 生成器驱动）
// draw.io 风格实体图标：服务器机架（正面 2 槽）= 节点，名称标签浮在机架前方
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { glowMaterial, PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Gossip3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, DIM = 0x334155;
const status = panel.addStatus('就绪');

// draw.io 风格节点：机架 + 正面 2 槽
function makeNode(x, y) {
  const g = new THREE.Group();
  const rack = new THREE.Mesh(new THREE.BoxGeometry(72, 72, 24),
    glowMaterial(0x60a5fa, { emissive: 0x1e40af, emissiveIntensity: 0.3 }));
  const slots = [];
  for (let k = 0; k < 2; k++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(52, 8, 3),
      glowMaterial(DIM, { emissive: DIM, emissiveIntensity: 0.15 }));
    s.position.set(0, k ? 19 : -19, 13.5);
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

// 6 节点环形排列
const R = 150;
const pos = (i) => {
  const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
  return { x: Math.cos(a) * R + 320, y: Math.sin(a) * R * 0.75 + 355 };
};
const nodes = [0, 1, 2, 3, 4, 5].map((i) => {
  const p = pos(i);
  return makeNode(p.x, p.y);
});
[0, 1, 2, 3, 4, 5].forEach((i) => {
  const p = pos(i);
  new VText(scene, { text: 'N' + i, x: p.x, y: p.y, z: 20, color: PALETTE.textGlow, scale: 0.55 });
});

// 聊天连线（每轮显示）
const line = new VBox(scene, { w: 200, h: 2.5, d: 2.5, x: 320, y: 355, z: 0, label: '', color: YELLOW, emissive: YELLOW });
line.mesh.visible = false;

// 每轮聊天对（从 N0 出发模拟）
const ROUNDS = [
  { pairs: [[0, 1], [0, 2]] },
  { pairs: [[0, 3], [1, 4], [2, 5]] },
];
const lineTo = (a, b) => {
  const p1 = pos(a), p2 = pos(b);
  line.mesh.position.set((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, 0);
  line.mesh.rotation.z = Math.atan2(p2.y - p1.y, p2.x - p1.x);
  line.mesh.scale.set(Math.hypot(p2.x - p1.x, p2.y - p1.y) / 200, 1, 1);
  line.mesh.visible = true;
};

function resetAll() {
  nodes.forEach(b => b.setColor(DIM, false));
  line.mesh.visible = false;
}

function* gossipGen() {
  resetAll();
  yield S(() => { status.textContent = 'Gossip（谣言传播）：消息像流言一样扩散 — 每轮与随机几人分享，对数轮全群皆知；无中心、容错强。初始：N0 得知新消息（集群变更/新路由），其余节点不知情（知情 1/6）'; });
  yield W(700);
  yield S(() => { nodes[0].setColor(YELLOW, true); status.textContent = 't=0：N0 持有消息，准备开始「闲聊」— 知情 1/6'; });
  yield W(900);
  yield S(() => {
    ROUNDS[0].pairs.forEach(([a, b]) => lineTo(a, b));
    nodes[1].setColor(GREEN, true); nodes[2].setColor(GREEN, true);
    status.textContent = 't=1 第 1 轮：N0 与 N1、N2 闲聊，把消息带过去 — 知情 3/6（fanout=2，知情者翻三倍）';
  });
  yield W(900);
  yield S(() => {
    line.mesh.visible = false;
    ROUNDS[1].pairs.forEach(([a, b]) => lineTo(a, b));
    nodes[3].setColor(GREEN, true); nodes[4].setColor(GREEN, true); nodes[5].setColor(GREEN, true);
    status.textContent = 't=2 第 2 轮：N0、N1、N2 三人各自再聊 2 人 → N3、N4、N5 知情 — 知情 6/6，全群知情';
  });
  yield W(900);
  yield S(() => {
    line.mesh.visible = false;
    status.textContent = '传播完成：2 轮（log₂6 ≈ 2.6）全网知情 — 每轮消息数 O(n)，无需中心节点，任何节点挂了都不影响；Cassandra/Redis Cluster 的节点发现与状态同步靠它';
  });
  yield W(900);
  yield S(() => { status.textContent = 'Gossip 演示完成：6 节点 fanout=2，知情数 1 → 3 → 6，2 轮对数收敛（log₂6≈2.6）；每轮消息 O(n)、无中心、容错强'; });
  yield W(600);
}

engine.queue(() => gossipGen());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
