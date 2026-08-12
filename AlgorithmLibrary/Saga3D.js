// AlgorithmLibrary/Saga3D.js — Saga 长事务：分步提交，任一步失败就反向补偿（支付失败 → 回补库存+取消订单）（function* 生成器驱动）
// draw.io 风格实体图标：服务器机架（正面 2 槽）= 业务步骤，步骤名标签浮在机架前方
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, easeInOut } from '../3D/VisualObject3D.js';
import { glowMaterial, PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Saga3D');

const scene = new Scene3D('scene', { cameraPos: [0, 330, 640], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, ROSE = 0xfb7185, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：Saga 事务', x: 0, y: 265, z: 0, color: PALETTE.textGlow, scale: 0.85 });
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
  { name: '下单', x: -270 },
  { name: '扣库存', x: -90 },
  { name: '支付', x: 90 },
  { name: '发货', x: 270 },
];
const stepBoxes = STEP.map(s => makeNode(s.x, 55));
const stepLabel = STEP.map((s, i) => new VText(scene, { text: (i + 1) + ' ' + s.name, x: s.x, y: 55, z: 22, color: PALETTE.textGlow, scale: 0.6 }));

// 正向箭头（步骤间）与反向补偿箭头
const fwdArrows = [];
const revArrows = [];
for (let i = 0; i < 3; i++) {
  const cx = (STEP[i].x + STEP[i + 1].x) / 2;
  fwdArrows.push(new VBox(scene, { w: 70, h: 4, d: 4, x: cx, y: 55, z: 0, label: '', color: BLUE, emissive: BLUE }));
  revArrows.push(new VBox(scene, { w: 70, h: 4, d: 4, x: cx, y: 5, z: 0, label: '', color: ROSE, emissive: ROSE }));
}
fwdArrows.forEach(a => (a.mesh.visible = false));
revArrows.forEach(a => (a.mesh.visible = false));
new VText(scene, { text: '正向执行 →', x: 0, y: 95, z: 0, color: PALETTE.textDim, scale: 0.6 });
new VText(scene, { text: '← 反向补偿', x: 0, y: -18, z: 0, color: PALETTE.textDim, scale: 0.6 });

const stepT = new VText(scene, { text: '', x: 0, y: -95, z: 0, color: PALETTE.textGlow, scale: 0.75 });
const eqT = new VText(scene, { text: '', x: 0, y: -150, z: 0, color: PALETTE.textDim, scale: 0.68 });

function resetAll() {
  stepBoxes.forEach(b => b.setColor(PALETTE.node, false));
  stepLabel.forEach((t, i) => t.setText((i + 1) + ' ' + STEP[i].name));
  fwdArrows.forEach(a => (a.mesh.visible = false));
  revArrows.forEach(a => (a.mesh.visible = false));
  stepT.setText(''); eqT.setText('');
}

function* sagaGen() {
  resetAll();
  yield S(() => hint.setText('Saga：长事务拆成小步各自提交，失败就逆着补偿 — 微服务跨库事务的答案'));
  yield S(() => { stepT.setText('电商下单 = 4 个独立本地事务串成一条链：下单 → 扣库存 → 支付 → 发货'); });
  yield W(500);
  yield S(() => {
    stepBoxes[0].setColor(GREEN, true);
    stepT.setText('第 1 步：下单 ✓ — 订单创建成功（本地事务立即提交，不持有全局锁）');
  });
  yield W(700);
  yield S(() => {
    fwdArrows[0].mesh.visible = true;
    stepBoxes[1].setColor(GREEN, true);
    stepT.setText('第 2 步：扣库存 ✓ — 仓库系统减库存，同样立即生效');
  });
  yield W(700);
  yield S(() => {
    fwdArrows[1].mesh.visible = true;
    stepBoxes[2].setColor(ROSE, true); stepLabel[2].setText('3 支付 ✗');
    stepT.setText('第 3 步：支付失败！— 余额不足/渠道拒付，Saga 链中断');
  });
  yield W(900);
  yield S(() => {
    stepT.setText('已产生副作用（订单、扣库存）不能假装没发生 → 从失败前一步开始反向补偿');
    hint.setText('补偿 = 执行反向业务动作，把已提交的步骤「撤销」— 这就是 Saga 的核心理念');
  });
  yield W(800);
  yield S(() => {
    revArrows[1].mesh.visible = true;
    stepBoxes[1].setColor(ROSE, true); stepLabel[1].setText('2 回补库存');
    stepT.setText('补偿第 1 步：回补库存 — 把扣掉的库存加回去（库存系统收到反向操作）');
  });
  yield W(800);
  yield S(() => {
    revArrows[0].mesh.visible = true;
    stepBoxes[0].setColor(ROSE, true); stepLabel[0].setText('1 取消订单');
    stepT.setText('补偿第 2 步：取消订单 — 订单状态改回「已取消」');
  });
  yield W(900);
  yield S(() => {
    stepT.setText('补偿完成：所有副作用被撤销，系统回到一致性状态 — 没有全局锁，性能好');
    eqT.setText('Saga 补偿表：下单→取消订单 · 扣库存→回补库存 · 支付→退款 — 每步都要写补偿动作');
  });
  yield W(600);
  yield S(() => {
    status.textContent = 'Saga 完成：4 步链在第 3 步支付失败 → 逆序补偿「回补库存」「取消订单」，长事务安全回滚';
  });
  yield W(600);
}

engine.queue(() => sagaGen());
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；绿=步骤成功，红=失败/补偿，蓝箭头=正向执行，红箭头=反向补偿）');

scene.start(engine);
