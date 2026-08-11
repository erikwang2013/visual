// AlgorithmLibrary/ThreePC3D.js — 3PC：CanCommit/PreCommit/DoCommit 三阶段，解决 2PC 协调者崩溃阻塞（function* 生成器驱动）
// draw.io 风格实体图标：服务器机架（正面 2 槽）= 协调者/参与方，名称标签浮在机架前方
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, easeInOut } from '../3D/VisualObject3D.js';
import { glowMaterial, PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('ThreePC3D');

const scene = new Scene3D('scene', { cameraPos: [0, 330, 640], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, ROSE = 0xfb7185, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「运行演示」开始：3PC 事务', x: 0, y: 265, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');

// draw.io 风格节点：机架 + 正面 2 槽
function makeNode(x, y, w, h) {
  const g = new THREE.Group();
  const rack = new THREE.Mesh(new THREE.BoxGeometry(w, h, 26),
    glowMaterial(0x60a5fa, { emissive: 0x1e40af, emissiveIntensity: 0.3 }));
  const slots = [];
  for (let k = 0; k < 2; k++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(w - 20, 9, 3),
      glowMaterial(DIM, { emissive: DIM, emissiveIntensity: 0.15 }));
    s.position.set(0, k ? h * 0.26 : -h * 0.26, 14.5);
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

const coord = makeNode(0, 195, 120, 70);
const coordLabel = new VText(scene, { text: '协调者', x: 0, y: 195, z: 22, color: PALETTE.textGlow, scale: 0.62 });
const PX = [-210, 0, 210];
const parts = PX.map(x => makeNode(x, -55, 86, 86));
const partLabel = PX.map((x, i) => new VText(scene, { text: 'P' + (i + 1), x, y: -55, z: 22, color: PALETTE.textGlow, scale: 0.55 }));
new VText(scene, { text: '3 个参与方（A/B/C 代表多个副本）', x: 0, y: -145, z: 0, color: PALETTE.textDim, scale: 0.62 });

// 消息线：协调者 → 参与方
const msgLine = new VBox(scene, { w: 200, h: 3.5, d: 3.5, x: 0, y: 0, z: 0, label: '', color: YELLOW, emissive: YELLOW });
msgLine.mesh.visible = false;
function lineTo(dstX) {
  const x1 = 0, y1 = 195, x2 = dstX, y2 = -55;
  msgLine.mesh.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0);
  msgLine.mesh.rotation.z = Math.atan2(y2 - y1, x2 - x1);
  msgLine.mesh.scale.set(Math.hypot(x2 - x1, y2 - y1) / 200, 1, 1);
  msgLine.mesh.visible = true;
}

const phaseT = new VText(scene, { text: '', x: 0, y: 95, z: 0, color: PALETTE.textGlow, scale: 0.75 });
const stepT = new VText(scene, { text: '', x: 0, y: 45, z: 0, color: PALETTE.textGlow, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: -200, z: 0, color: PALETTE.textDim, scale: 0.68 });

function resetScene() {
  coord.setColor(PALETTE.node, false); coordLabel.setText('协调者');
  parts.forEach(p => p.setColor(PALETTE.node, false));
  partLabel.forEach((t, i) => t.setText('P' + (i + 1)));
  msgLine.mesh.visible = false;
  phaseT.setText(''); stepT.setText(''); eqT.setText('');
}

function* tpcGen() {
  resetScene();
  yield S(() => hint.setText('3PC：多一个 PreCommit 阶段，让协调者崩溃时大家也能安全收场 — 2PC 的改良版'));
  yield S(() => { phaseT.setText('阶段 1/3：CanCommit（能否提交？）'); stepT.setText('协调者广播 CanCommit，问各参与方：事务能提交吗？'); });
  yield W(700);
  yield S(() => {
    coord.setColor(YELLOW, true);
    PX.forEach((x, i) => { lineTo(x); parts[i].setColor(BLUE, true); });
    stepT.setText('P1、P2、P3 回复 Yes — 各节点资源已检查、事务已就绪');
  });
  yield W(800);
  yield S(() => {
    msgLine.mesh.visible = false;
    coord.setColor(BLUE, true);
    parts.forEach(p => p.setColor(PALETTE.node, false));
    phaseT.setText('阶段 2/3：PreCommit（预提交）');
    stepT.setText('全部 Yes → 协调者发 PreCommit：各节点写入 undo/redo 日志并 ACK');
  });
  yield W(800);
  yield S(() => {
    PX.forEach((x, i) => { lineTo(x); parts[i].setColor(BLUE, true); });
    stepT.setText('P1、P2、P3 记录日志完毕，回 ACK ✓ — 关键时刻到了…');
  });
  yield W(900);
  yield S(() => {
    msgLine.mesh.visible = false;
    coord.setColor(GREEN, true);
    phaseT.setText('阶段 3/3：DoCommit（正式提交）');
    stepT.setText('协调者广播 DoCommit → 各节点正式提交事务，三阶段完成 ✓');
  });
  yield W(800);
  yield S(() => {
    PX.forEach((x, i) => { lineTo(x); parts[i].setColor(GREEN, true); });
    stepT.setText('提交完成：数据库更新生效，分布式事务落下帷幕');
  });
  yield W(900);
  yield S(() => {
    resetScene();
    coord.setColor(ROSE, true); coordLabel.setText('协调者 ✗');
    phaseT.setText('故障场景：协调者在 PreCommit 后、DoCommit 前崩溃');
    stepT.setText('若 2PC 在这里崩溃：参与方永远等不到 COMMIT → 永久阻塞、锁死资源');
  });
  yield W(900);
  yield S(() => {
    PX.forEach((x, i) => { lineTo(x); parts[i].setColor(ROSE, true); });
    phaseT.setText('3PC 的答案：超时回滚');
    stepT.setText('3PC 中参与方已拿到 PreCommit → 超时后无法确认 → 统一执行 Abort 回滚');
    eqT.setText('对比：2PC = Prepare→Commit（协调者崩=卡死）；3PC = CanCommit→PreCommit→DoCommit（崩=超时回滚）');
  });
  yield W(900);
  yield S(() => {
    status.textContent = '3PC 完成：三阶段 CanCommit/PreCommit/DoCommit；协调者崩溃时参与方超时回滚，不再阻塞';
    hint.setText('3PC 用网络超时换可用性 — 但网络分区仍有分歧可能，生产多用 Raft 单点写入');
  });
  yield W(600);
}

panel.addButton('运行演示', () => engine.start(tpcGen()));
panel.addButton('清空', () => { engine.clear(); resetScene(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；黄=CanCommit 询问，蓝=PreCommit 预提交，绿=DoCommit 提交，红=崩溃/回滚）');

scene.start(engine);
