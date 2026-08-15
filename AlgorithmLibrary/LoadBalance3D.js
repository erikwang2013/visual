// AlgorithmLibrary/LoadBalance3D.js — 负载均衡：加权轮询，请求按权重分发（S1 权重 2）（function* 生成器驱动，解说入状态栏）
// draw.io 风格实体图标：左侧负载均衡器机盒 + 3 台服务器机架（正面 3 槽），请求落入槽位即处理完成
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { glowMaterial, applyTheme } from '../3D/Glow.js';
applyTheme('LoadBalance3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const YELLOW = 0xfacc15, BLUE = 0x67e8f9, DIM = 0x334155;
const status = panel.addStatus('就绪');
const ease = p => p * p * (3 - 2 * p);

// —— 左侧负载均衡器（小机盒 + 双箭头标识） ——
const lb = new VBox(scene, { w: 96, h: 56, d: 56, x: -10, y: 360, z: 0, label: '负载均衡器', color: BLUE, emissive: BLUE });

// —— 3 台服务器机架：机箱 + 正面 3 槽（draw.io 服务器图标） ——
const SX = [110, 320, 530];
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
  g.position.set(SX[i], 220, 0);
  scene.add(g);
  return slots;
}
const servers = [0, 1, 2].map((_, i) => ({ w: [2, 1, 1][i], count: 0, slots: makeRack(i) }));

// 请求盒子（从 LB 出发落到目标机架槽位）；计数在机架下方，绝不进盒子内部
const reqBox = new VBox(scene, { w: 56, h: 40, d: 40, x: -10, y: 450, z: 0, label: 'R1', color: YELLOW, emissive: YELLOW });
reqBox.mesh.visible = false;

// 加权轮询序列：S1 两连发（权重 2）→ S2 → S3 → 循环
const SEQ = [0, 0, 1, 2, 0, 0, 1, 2, 0, 0];

function resetAll() {
  servers.forEach(s => {
    s.count = 0;
    s.slots.forEach(x => { x.material.emissiveIntensity = 0.15; });
  });
  reqBox.mesh.visible = false;
  reqBox.setText('R1');
  reqBox.setColor(YELLOW, YELLOW);
}

function* runLoadBalance() {
  resetAll();
  yield S(() => { status.textContent = '加权轮询：权重高的服务器分到更多请求 — 后端「负载均衡器」的核心调度。10 个请求依次到达 LB，按权重 2:1:1 轮流分发'; });
  yield W(400);
  for (let i = 0; i < SEQ.length; i++) {
    const si = SEQ[i], s = servers[si];
    yield S(() => {
      reqBox.setText('R' + (i + 1));
      reqBox.mesh.position.set(-10, 450, 0);
      reqBox.mesh.visible = true;
      reqBox.setColor(YELLOW, YELLOW);
      status.textContent = 'R' + (i + 1) + ' 到达 LB → 轮转到 S' + (si + 1) + '（权重 ' + s.w + '）';
    });
    yield W(240);
    yield A(280, (p) => {
      const e = ease(p);
      reqBox.mesh.position.set(-10 + (SX[si] + 10) * e, 450 + (240 - 450) * e, 30 * e);
    });
    yield S(() => {
      s.slots.forEach(x => { x.material.emissiveIntensity = 0.15; });
      s.slots[0].material.emissiveIntensity = 0.9;
      status.textContent = 'R' + (i + 1) + ' 飞向 S' + (si + 1) + ' 机架';
    });
    yield W(260);
    yield S(() => {
      reqBox.mesh.visible = false; // 落入槽位
      s.slots[1].material.emissiveIntensity = 0.9;
      s.count++;
      status.textContent = 'R' + (i + 1) + ' 落入 S' + (si + 1) + ' 槽位 — 处理完成';
    });
    yield W(280);
    yield S(() => { s.slots.forEach(x => { x.material.emissiveIntensity = 0.15; }); });
    yield W(180);
  }
  yield S(() => {
    servers.forEach((s, i) => {
      s.slots.forEach(x => { x.material.emissiveIntensity = 0.6; });
    });
    status.textContent = '结果：S1 接 6 个（权重 2 占比 50%）· S2 接 2 个 · S3 接 2 个 — 按 2:1:1 精确分配；加权轮询适合权重不同的后端（如新老机器混部），Nginx/HAProxy/LVS 都在用';
  });
  yield W(800);
  yield S(() => { status.textContent = '负载均衡演示完成：加权轮询 10 请求 → S1×6、S2×2、S3×2，比例 2:1:1，无服务器空转'; });
  yield W(600);
}

engine.queue(() => runLoadBalance());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
