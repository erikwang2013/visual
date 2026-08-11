// AlgorithmLibrary/LoadBalance3D.js — 负载均衡：加权轮询，请求按权重分发（S1 权重 2）
// draw.io 风格实体图标：左侧负载均衡器机盒 + 3 台服务器机架（正面 3 槽），请求落入槽位即处理完成
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { glowMaterial, PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('LoadBalance3D');

const scene = new Scene3D('scene', { cameraPos: [0, 330, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, ROSE = 0xfb7185, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「加权轮询」开始', x: 0, y: 265, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

// —— 左侧负载均衡器（小机盒 + 双箭头标识） ——
const lb = new VBox(scene, { w: 96, h: 56, d: 56, x: -330, y: 60, z: 0, label: '负载均衡器', color: BLUE, emissive: BLUE });

// —— 3 台服务器机架：机箱 + 正面 3 槽（draw.io 服务器图标） ——
const SX = [-210, 0, 210];
function makeRack(i) {
  const g = new THREE.Group();
  const rack = new THREE.Mesh(new THREE.BoxGeometry(150, 84, 40),
    glowMaterial(0x60a5fa, { emissive: 0x1e40af, emissiveIntensity: 0.3 }));
  const slots = [];
  for (let k = 0; k < 3; k++) {
    const slot = new THREE.Mesh(new THREE.BoxGeometry(128, 8, 3),
      glowMaterial(DIM, { emissive: DIM, emissiveIntensity: 0.15 }));
    slot.position.set(0, -21 + k * 21, 21.5);
    g.add(slot);
    slots.push(slot);
  }
  g.add(rack);
  g.position.set(SX[i], -80, 0);
  scene.add(g);
  return slots;
}
const servers = [0, 1, 2].map((_, i) => ({ w: [2, 1, 1][i], count: 0, slots: makeRack(i) }));
[0, 1, 2].forEach(i => new VText(scene, { text: 'S' + (i + 1) + ' · 权重 ' + servers[i].w, x: SX[i], y: -18, z: 0, color: PALETTE.textGlow, scale: 0.66 }));

// 请求盒子（从 LB 出发落到目标机架槽位）；计数在机架下方，绝不进盒子内部
const reqBox = new VBox(scene, { w: 56, h: 40, d: 40, x: -330, y: 150, z: 0, label: 'R1', color: YELLOW, emissive: YELLOW });
reqBox.mesh.visible = false;
const countT = [0, 1, 2].map(i => new VText(scene, { text: '', x: SX[i], y: -150, z: 0, color: PALETTE.textGlow, scale: 0.68 }));
const stepT = new VText(scene, { text: '', x: 0, y: 118, z: 0, color: PALETTE.textGlow, scale: 0.75 });
new VText(scene, { text: '3 台服务器：S1 权重 2 · S2 权重 1 · S3 权重 1 — 按权重比例分派', x: 0, y: -212, z: 0, color: PALETTE.textDim, scale: 0.66 });

// 加权轮询序列：S1 两连发（权重 2）→ S2 → S3 → 循环
const SEQ = [0, 0, 1, 2, 0, 0, 1, 2, 0, 0];

function resetAll() {
  engine.clear();
  servers.forEach(s => {
    s.count = 0;
    s.slots.forEach(x => { x.material.emissiveIntensity = 0.15; });
  });
  countT.forEach(t => t.setText(''));
  reqBox.mesh.visible = false;
  stepT.setText('');
}

function runLB() {
  resetAll();
  hint.setText('加权轮询：权重高的服务器分到更多请求 — 后端「负载均衡器」的核心调度');
  C(400, () => { stepT.setText('10 个请求依次到达 LB → 按权重 2:1:1 轮流分发'); });
  SEQ.forEach((si, i) => {
    const s = servers[si];
    C(220, () => {
      reqBox.setText('R' + (i + 1));
      reqBox.mesh.position.set(-330, 150, 0);
      reqBox.mesh.visible = true;
      reqBox.setColor(YELLOW, YELLOW);
      stepT.setText('R' + (i + 1) + ' 到达 LB → 轮转到 S' + (si + 1) + '（权重 ' + s.w + '）');
    });
    C(260, () => {
      reqBox.mesh.position.set(SX[si], -60, 30);
      s.slots.forEach(x => { x.material.emissiveIntensity = 0.15; });
      s.slots[0].material.emissiveIntensity = 0.9;
      stepT.setText('R' + (i + 1) + ' 飞向 S' + (si + 1) + ' 机架');
    });
    C(260, () => {
      reqBox.mesh.visible = false; // 落入槽位
      s.slots[1].material.emissiveIntensity = 0.9;
      s.count++;
      countT[si].setText(s.count + ' 请求');
      stepT.setText('R' + (i + 1) + ' 落入 S' + (si + 1) + ' 槽位 — 处理完成');
    });
    C(180, () => { s.slots.forEach(x => { x.material.emissiveIntensity = 0.15; }); });
  });
  C(800, () => {
    servers.forEach((s, i) => {
      s.slots.forEach(x => { x.material.emissiveIntensity = 0.6; });
      countT[i].setText(s.count + ' 请求');
    });
    stepT.setText('结果：S1 接 6 个（权重 2 占比 50%）· S2 接 2 个 · S3 接 2 个 — 按 2:1:1 精确分配');
    hint.setText('加权轮询适合权重不同的后端（如新老机器混部）— Nginx/HAProxy/LVS 都在用');
  });
  C(600, () => {
    status.textContent = '加权轮询完成：10 请求 → S1×6、S2×2、S3×2，比例 2:1:1，无服务器空转';
  });
}

panel.addButton('加权轮询', runLB);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；黄=请求分发瞬间，绿=处理完成，计数=各服务器接收量）');

scene.start(engine);
