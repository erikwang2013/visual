// AlgorithmLibrary/TCC3D.js — TCC 分布式事务：Try 冻结 → Confirm 扣款 / Cancel 解冻（function* 生成器驱动，解说入状态栏）
// draw.io 风格实体图标：协调者服务器（大机架）+ 两个账户服务器（小机架），金色方块 = 资金
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { glowMaterial, PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('TCC3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, ROSE = 0xfb7185, DIM = 0x334155, GOLD = 0xfcd34d;
const status = panel.addStatus('就绪');

// draw.io 风格节点：机架 + 正面 3 槽
function makeNode(x, y, w, h) {
  const g = new THREE.Group();
  const rack = new THREE.Mesh(new THREE.BoxGeometry(w, h, 26),
    glowMaterial(0x60a5fa, { emissive: 0x1e40af, emissiveIntensity: 0.3 }));
  const slots = [];
  for (let k = 0; k < 3; k++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(w - 24, 9, 3),
      glowMaterial(DIM, { emissive: DIM, emissiveIntensity: 0.15 }));
    s.position.set(0, (k - 1) * 19, 14.5);
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

// 协调者（上） + 账户 A/B（下）
const coord = makeNode(320, 495, 150, 74);
const coordLabel = new VText(scene, { text: '协调者', x: 320, y: 495, z: 22, color: PALETTE.textGlow, scale: 0.62 });
const AX = [110, 530];
const accs = AX.map(x => makeNode(x, 245, 110, 96));
const accLabel = AX.map((x, i) => new VText(scene, { text: '账户 ' + (i ? 'B' : 'A') + '（余额 200）', x, y: 245, z: 22, color: PALETTE.textGlow, scale: 0.55 }));

// 消息连线（协调者 ↔ 账户）
const msgLine = new VBox(scene, { w: 210, h: 3, d: 3, x: 320, y: 370, z: 0, label: '', color: YELLOW, emissive: YELLOW });
msgLine.mesh.visible = false;
function lineTo(aIdx, sx, ex) {
  const x1 = sx, x2 = AX[aIdx];
  msgLine.mesh.position.set((x1 + x2) / 2, 370, 0);
  msgLine.mesh.rotation.z = 0;
  msgLine.mesh.scale.set(Math.abs(x2 - x1) / 210, 1, 1);
  msgLine.mesh.visible = true;
}

// 资金方块（100 元）
const money = new VBox(scene, { w: 44, h: 30, d: 30, x: AX[0], y: 160, z: 0, label: '100', color: GOLD, emissive: GOLD });

function resetScene() {
  coord.setColor(PALETTE.node, false);
  accs.forEach(a => a.setColor(PALETTE.node, false));
  accLabel.forEach((t, i) => t.setText('账户 ' + (i ? 'B' : 'A') + '（余额 200）'));
  msgLine.mesh.visible = false;
}

function* tccGen() {
  resetScene();
  yield S(() => { status.textContent = 'TCC 事务：Try 冻结 → Confirm 提交 / Cancel 回滚（黄=协调者，蓝=Try 冻结，绿=Confirm 成功，红=失败/Cancel 解冻）。转账 100：账户 A（转出）与账户 B（转入）两个独立服务'; });
  yield W(600);
  yield S(() => {
    coord.setColor(YELLOW, true);
    status.textContent = '① Try：协调者发请求，A、B 各自「冻结/预留」资金 — 不实际扣款';
  });
  yield W(700);
  yield S(() => {
    lineTo(0, 0, -105); accs[0].setColor(BLUE, true);
    status.textContent = '账户 A 收到 Try → 冻结 100 元：余额 200 → 冻结 100（可用 100），准备转出';
  });
  yield W(700);
  yield S(() => {
    lineTo(1, 0, 105); accs[1].setColor(BLUE, true);
    status.textContent = '账户 B 收到 Try → 预留 100 元额度：冻结 100（可用 100），准备转入';
  });
  yield W(900);
  yield S(() => { status.textContent = '两个 Try 都成功 → 协调者决定 Confirm；如果任一失败 → 全部 Cancel 解冻 — 二阶段提交的分布式改良'; });
  yield W(800);
  yield S(() => {
    coord.setColor(GREEN, true);
    accs.forEach(a => a.setColor(GREEN, true));
    status.textContent = '② Confirm：A 真正扣款，B 真正入账 — 资金从 A 飞向 B';
  });
  yield W(500);
  yield A(900, (p) => {
    money.mesh.position.set(AX[0] + (AX[1] - AX[0]) * p, 160 - 40 * Math.sin(p * Math.PI), 0);
  });
  yield S(() => {
    accLabel[0].setText('账户 A（余额 100）');
    accLabel[1].setText('账户 B（余额 300）');
    status.textContent = 'Confirm 完成：A 余额 200→100，B 余额 200→300 — 转账成功 ✓';
  });
  yield W(900);
  yield S(() => { resetScene(); status.textContent = '再看失败路径：B 服务故障 → 协调者必须撤销 A 的冻结'; });
  yield W(600);
  yield S(() => {
    coord.setColor(ROSE, true);
    accs[0].setColor(BLUE, true);
    lineTo(0, 0, -105);
    status.textContent = 'Try(A) 冻结成功 ✓（100 元被锁定）';
  });
  yield W(700);
  yield S(() => {
    lineTo(1, 0, 105);
    accs[1].setColor(ROSE, true); accLabel[1].setText('账户 B ✗ 服务故障');
    status.textContent = 'Try(B) 失败：B 宕机/超时 → 不能假装成功';
  });
  yield W(800);
  yield S(() => {
    lineTo(0, 0, -105);
    accs[0].setColor(ROSE, true); accLabel[0].setText('账户 A（余额 200 · 解冻）');
    status.textContent = '③ Cancel：协调者通知 A 解冻 — 100 元回到可用余额，一切如初';
  });
  yield W(900);
  yield S(() => {
    msgLine.mesh.visible = false;
    status.textContent = 'Cancel 完成：A 解冻 100 → 余额恢复 200 — 部分成功被彻底撤销（Try 冻结 ↔ Cancel 解冻，每步可回滚）';
  });
  yield W(700);
  yield S(() => { status.textContent = 'TCC 演示完成：成功路径 Try(冻结 100) → Confirm(A 扣 100、B 入 100)；失败路径 Try(B) 故障 → Cancel(A) 解冻，余额恢复 200，事务一致'; });
  yield W(600);
}

engine.queue(() => tccGen());
panel.addButton('清空', () => { engine.clear(); resetScene(); status.textContent = ''; });

scene.start(engine);
