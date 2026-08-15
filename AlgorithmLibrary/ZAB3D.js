// AlgorithmLibrary/ZAB3D.js — ZAB：Leader 选举 + 事务广播，zxid 严格有序（ZooKeeper 核心）（function* 生成器驱动，解说入状态栏）
// draw.io 风格实体图标：服务器机架（正面 2 槽）= 节点，角色标签浮在机架前方
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { glowMaterial, PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('ZAB3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, ROSE = 0xfb7185, DIM = 0x334155;
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
const nodes = NX.map((x, i) => makeNode(x, 430));
const nodeLabel = NX.map((x, i) => new VText(scene, { text: 'F' + (i + 1), x, y: 430, z: 22, color: PALETTE.textGlow, scale: 0.58 }));

// 广播连线（Leader → 每个 follower）
const bcast = NX.slice(1).map((x, i) => {
  const b = new VBox(scene, { w: 200, h: 3, d: 3, x: (NX[0] + x) / 2, y: 360, z: 0, label: '', color: BLUE, emissive: BLUE });
  b.mesh.scale.set(Math.abs(x - NX[0]) / 200, 1, 1);
  b.mesh.visible = false;
  return b;
});

function resetAll() {
  nodes.forEach(b => b.setColor(PALETTE.node, false));
  nodeLabel.forEach((t, i) => t.setText('F' + (i + 1)));
  bcast.forEach(b => (b.mesh.visible = false));
}

function* zabGen() {
  resetAll();
  yield S(() => { status.textContent = 'ZAB（ZooKeeper Atomic Broadcast）：先选 Leader，所有写事务走 Leader 广播，zxid 严格有序。F1-F5 启动进入选举，各自投自己'; });
  yield W(600);
  yield S(() => {
    nodes[0].setColor(YELLOW, true);
    nodeLabel[0].setText('Leader');
    status.textContent = '选举：F1 得 3 票（自己 + F2 + F5）> 多数 → 当选 Leader，epoch = 2；其余成为 Follower';
  });
  yield W(800);
  yield S(() => {
    bcast.forEach(b => (b.mesh.visible = true));
    status.textContent = '写请求 set(a)=1 → Leader 生成事务 zxid = 2:1，广播给所有 Follower';
  });
  yield W(800);
  yield S(() => {
    nodes.slice(1).forEach(b => b.setColor(BLUE, true));
    status.textContent = 'Follower 写本地日志并回 ACK → Leader 收到多数 ACK 后广播 COMMIT，全部节点应用 set(a)=1';
  });
  yield W(900);
  yield S(() => {
    nodes.slice(1).forEach(b => b.setColor(PALETTE.node, false));
    status.textContent = '下一个写请求 set(b)=2 → zxid 递增为 2:2（epoch:seq 全序，永不回退）';
  });
  yield W(900);
  yield S(() => {
    nodes[3].setColor(ROSE, true);
    nodeLabel[3].setText('F3 ✗');
    status.textContent = '故障：F3 宕机，丢失 2:2 事务';
  });
  yield W(900);
  yield S(() => {
    bcast.forEach(b => (b.mesh.visible = false));
    nodes[0].setColor(GREEN, true);
    status.textContent = '恢复：Leader 发现 F3 落后 → ZAB 恢复模式，F3 从 Leader 补同步缺失的 2:2，先对齐日志再回到广播模式';
  });
  yield W(900);
  yield S(() => {
    nodes[3].setColor(PALETTE.node, false);
    nodeLabel[3].setText('F3');
    status.textContent = 'ZAB 演示完成：选举 F1（epoch=2，3/5 票）→ zxid 2:1、2:2 全序广播 → F3 崩溃后补同步恢复一致，不丢已提交事务';
  });
  yield W(600);
}

engine.queue(() => zabGen());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
