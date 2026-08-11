// AlgorithmLibrary/LoadBalance3D.js — 负载均衡：加权轮询，请求按权重分发（S1 权重 2）
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('LoadBalance3D');

const scene = new Scene3D('scene', { cameraPos: [0, 330, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, ROSE = 0xfb7185, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「加权轮询」开始', x: 0, y: 265, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

// 3 台服务器：S1 权重 2，S2、S3 权重 1
const SX = [-210, 0, 210];
const servers = [{ w: 2, count: 0 }, { w: 1, count: 0 }, { w: 1, count: 0 }].map((s, i) => ({
  ...s,
  box: new VBox(scene, { w: 150, h: 84, d: 84, x: SX[i], y: -80, z: 0, label: 'S' + (i + 1), color: PALETTE.node, emissive: PALETTE.nodeEmissive }),
}));
new VText(scene, { text: '3 台服务器：S1 权重 2 · S2 权重 1 · S3 权重 1', x: 0, y: -190, z: 0, color: PALETTE.textDim, scale: 0.7 });

// 请求盒子（从左侧进入，落到目标服务器）
const reqBox = new VBox(scene, { w: 56, h: 40, d: 40, x: -340, y: 170, z: 0, label: 'R1', color: YELLOW, emissive: YELLOW });
reqBox.mesh.visible = false;
const countT = servers.map((s, i) => new VText(scene, { text: '', x: SX[i], y: -18, z: 0, color: PALETTE.textGlow, scale: 0.68 }));
const stepT = new VText(scene, { text: '', x: 0, y: 85, z: 0, color: PALETTE.textGlow, scale: 0.75 });

// 加权轮询序列：S1 两连发（权重 2）→ S2 → S3 → 循环
const SEQ = [0, 0, 1, 2, 0, 0, 1, 2, 0, 0];

function resetAll() {
  engine.clear();
  servers.forEach((s, i) => { s.count = 0; s.box.setColor(PALETTE.node, PALETTE.nodeEmissive); countT[i].setText(''); });
  reqBox.mesh.visible = false;
  stepT.setText('');
}

function runLB() {
  resetAll();
  hint.setText('加权轮询：权重高的服务器分到更多请求 — 后端「负载均衡器」的核心调度');
  C(400, () => { stepT.setText('10 个请求依次到达 → 负载均衡器按权重 2:1:1 轮流分发'); });
  SEQ.forEach((si, i) => {
    const s = servers[si];
    C(220, () => {
      reqBox.setText('R' + (i + 1));
      reqBox.mesh.position.set(-340, 170, 0);
      reqBox.mesh.visible = true;
      stepT.setText('R' + (i + 1) + ' 到达 → 轮转到 S' + (si + 1) + '（权重 ' + s.w + '）');
    });
    C(260, () => {
      reqBox.mesh.position.set(SX[si], 40, 0);
      s.box.setColor(YELLOW, YELLOW);
    });
    C(260, () => {
      reqBox.mesh.position.set(SX[si], -80, 0);
      reqBox.mesh.visible = false;
      s.count++;
      countT[si].setText(s.count + ' 请求');
      s.box.setColor(GREEN, GREEN);
    });
    C(180, () => { s.box.setColor(PALETTE.node, PALETTE.nodeEmissive); });
  });
  C(800, () => {
    servers.forEach((s, i) => { s.box.setColor(GREEN, GREEN); countT[i].setText(s.count + ' 请求'); });
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
