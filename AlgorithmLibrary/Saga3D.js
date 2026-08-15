// AlgorithmLibrary/Saga3D.js — Saga 长事务：分步提交，任一步失败就反向补偿（支付失败 → 回补库存+取消订单）（function* 生成器驱动，解说入状态栏）
// draw.io 风格实体图标：服务器机架（正面 2 槽）= 业务步骤，步骤名标签浮在机架前方
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { glowMaterial, PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Saga3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, BLUE = 0x67e8f9, ROSE = 0xfb7185, DIM = 0x334155;
const status = panel.addStatus('就绪');

// draw.io 风格节点：机架 + 正面 2 槽
function makeNode(x, y) {
  const g = new THREE.Group();
  const rack = new THREE.Mesh(new THREE.BoxGeometry(130, 72, 26),
    glowMaterial(0x60a5fa, { emissive: 0x1e40af, emissiveIntensity: 0.3 }));
  const slots = [];
  for (let k = 0; k < 2; k++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(110, 9, 3),
      glowMaterial(DIM, { emissive: DIM, emissiveIntensity: 0.15 }));
    s.position.set(0, k ? 19 : -19, 14.5);
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

// 4 个业务步骤
const STEP = [
  { name: '下单', x: 120 },
  { name: '扣库存', x: 260 },
  { name: '支付', x: 400 },
  { name: '发货', x: 540 },
];
const stepBoxes = STEP.map(s => makeNode(s.x, 370));

// 正向箭头（步骤间）与反向补偿箭头
const fwdArrows = [];
const revArrows = [];
for (let i = 0; i < 3; i++) {
  const cx = (STEP[i].x + STEP[i + 1].x) / 2;
  fwdArrows.push(new VBox(scene, { w: 70, h: 4, d: 4, x: cx, y: 370, z: 0, label: '', color: BLUE, emissive: BLUE }));
  revArrows.push(new VBox(scene, { w: 70, h: 4, d: 4, x: cx, y: 320, z: 0, label: '', color: ROSE, emissive: ROSE }));
}
fwdArrows.forEach(a => (a.mesh.visible = false));
revArrows.forEach(a => (a.mesh.visible = false));

function resetAll() {
  stepBoxes.forEach(b => b.setColor(PALETTE.node, false));
  fwdArrows.forEach(a => (a.mesh.visible = false));
  revArrows.forEach(a => (a.mesh.visible = false));
}

function* sagaGen() {
  resetAll();
  yield S(() => { status.textContent = 'Saga 长事务：4 个独立本地事务串成一条链（绿=成功，红=失败/补偿；蓝箭头=正向执行，红箭头=反向补偿），失败就从失败前一步开始反向补偿'; });
  yield W(600);
  yield S(() => {
    stepBoxes[0].setColor(GREEN, true);
    status.textContent = '第 1 步 下单 ✓：订单创建成功，本地事务立即提交，不持有全局锁';
  });
  yield W(700);
  yield S(() => {
    fwdArrows[0].mesh.visible = true;
    stepBoxes[1].setColor(GREEN, true);
    status.textContent = '第 2 步 扣库存 ✓：仓库系统减库存，同样立即生效';
  });
  yield W(700);
  yield S(() => {
    fwdArrows[1].mesh.visible = true;
    stepBoxes[2].setColor(ROSE, true);
    status.textContent = '第 3 步 支付失败！：余额不足/渠道拒付，Saga 链中断';
  });
  yield W(900);
  yield S(() => { status.textContent = '已产生副作用（订单、扣库存）不能假装没发生 → 从失败前一步开始反向补偿，执行反向业务动作把已提交的步骤「撤销」'; });
  yield W(800);
  yield S(() => {
    revArrows[1].mesh.visible = true;
    stepBoxes[1].setColor(ROSE, true);
    status.textContent = '补偿第 1 步：回补库存 — 把扣掉的库存加回去（库存系统收到反向操作）';
  });
  yield W(800);
  yield S(() => {
    revArrows[0].mesh.visible = true;
    stepBoxes[0].setColor(ROSE, true);
    status.textContent = '补偿第 2 步：取消订单 — 订单状态改回「已取消」';
  });
  yield W(900);
  yield S(() => { status.textContent = 'Saga 演示完成：4 步链第 3 步支付失败 → 逆序补偿「回补库存」「取消订单」，副作用全部撤销（补偿表：下单↔取消订单 · 扣库存↔回补库存 · 支付↔退款），无全局锁'; });
  yield W(600);
}

engine.queue(() => sagaGen());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
