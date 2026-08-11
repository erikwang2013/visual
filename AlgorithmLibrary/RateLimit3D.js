// AlgorithmLibrary/RateLimit3D.js — 令牌桶限流：桶里有多少令牌放行多少请求（rate=5/s，burst=10）
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('RateLimit3D');

const scene = new Scene3D('scene', { cameraPos: [0, 330, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, ROSE = 0xfb7185, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「令牌桶限流」开始', x: 0, y: 265, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

// 令牌桶：容量 10，10 个绿色令牌
const bucket = new VBox(scene, { w: 140, h: 150, d: 90, x: -270, y: -35, z: 0, label: '令牌桶', color: PALETTE.node, emissive: PALETTE.nodeEmissive });
new VText(scene, { text: '容量 10 · 补充速率 5/s', x: -270, y: 92, z: 0, color: PALETTE.textDim, scale: 0.6 });
const tokens = [];
for (let i = 0; i < 10; i++) {
  const r = Math.floor(i / 5), c = i % 5;
  tokens.push(new VBox(scene, { w: 30, h: 30, d: 14, x: -312 + c * 21, y: 10 - r * 40, z: 12, label: '', color: GREEN, emissive: GREEN }));
}

// 放行区 / 拒绝区
const allowedT = new VText(scene, { text: '', x: 90, y: 95, z: 0, color: PALETTE.textGlow, scale: 0.7 });
const rejectedT = new VText(scene, { text: '', x: 300, y: 95, z: 0, color: ROSE, scale: 0.7 });
const reqBox = new VBox(scene, { w: 56, h: 40, d: 40, x: -400, y: 185, z: 0, label: 'R1', color: YELLOW, emissive: YELLOW });
reqBox.mesh.visible = false;
const stepT = new VText(scene, { text: '', x: 0, y: -185, z: 0, color: PALETTE.textGlow, scale: 0.75 });

function resetAll() {
  engine.clear();
  tokens.forEach(t => (t.mesh.visible = true));
  reqBox.mesh.visible = false;
  allowedT.setText(''); rejectedT.setText(''); stepT.setText('');
  bucket.setColor(PALETTE.node, PALETTE.nodeEmissive);
}

function runRateLimit() {
  resetAll();
  hint.setText('令牌桶：桶里先存好令牌，请求来一个取一个 — 没令牌的直接拒掉，突发被削平');
  C(400, () => { stepT.setText('桶里已有 10 个令牌（burst=10）。1 秒内 12 个请求突然涌来…'); });
  for (let i = 0; i < 12; i++) {
    const ok = i < 10;
    C(200, () => {
      reqBox.setText('R' + (i + 1));
      reqBox.mesh.position.set(-400, 185, 0);
      reqBox.mesh.visible = true;
      stepT.setText('R' + (i + 1) + ' 到达 → 向桶里取令牌');
    });
    C(230, () => {
      reqBox.mesh.position.set(-270, 60, 0);
      if (ok) bucket.setColor(YELLOW, YELLOW); else bucket.setColor(ROSE, ROSE);
    });
    C(230, () => {
      if (ok) {
        tokens[9 - i].mesh.visible = false; // 从桶顶取走一个
        reqBox.mesh.position.set(90, 60, 8 * (i % 3));
        reqBox.setColor(GREEN, GREEN);
        allowedT.setText('放行 ' + (i + 1) + ' 个');
        stepT.setText('桶里有令牌 → R' + (i + 1) + ' 取走 1 个，放行 ✓');
      } else {
        reqBox.mesh.position.set(300, 60, 8 * (i - 10));
        reqBox.setColor(ROSE, ROSE);
        rejectedT.setText('拒绝 ' + (i - 9) + ' 个');
        stepT.setText('桶空了 → R' + (i + 1) + ' 拿不到令牌，直接拒绝 ✗（HTTP 429）');
      }
    });
    C(160, () => { bucket.setColor(PALETTE.node, PALETTE.nodeEmissive); });
  }
  C(900, () => {
    stepT.setText('1 秒内 12 请求：10 个放行（耗尽存量），2 个拒绝 — 峰值被削成 10/s，然后按 5/s 补充');
    hint.setText('令牌桶可容忍短时突发（桶里存令牌），漏桶则恒定速率 — 生产限流标配，Redis Lua 秒实现');
  });
  C(600, () => {
    status.textContent = '令牌桶限流完成：burst=10，12 请求 → 放行 10、拒绝 2（429），后续按 rate=5/s 补充';
  });
}

panel.addButton('令牌桶限流', runRateLimit);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；绿=令牌，黄=取令牌成功，红=桶空拒绝 429）');

scene.start(engine);
