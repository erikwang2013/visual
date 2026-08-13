// AlgorithmLibrary/RateLimit3D.js — 令牌桶限流：桶里有多少令牌放行多少请求（rate=5/s，burst=10）（function* 生成器驱动）
// draw.io 风格实体图标：圆柱木桶（提手+箍环）= 令牌桶，金色圆片堆 = 令牌
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, easeInOut } from '../3D/VisualObject3D.js';
import { glowMaterial, PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('RateLimit3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, ROSE = 0xfb7185, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：令牌桶限流', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');

// —— draw.io 风格令牌桶：圆柱桶身（无盖看内部）+ 顶部箍环 + 提手 ——
const bucket = new THREE.Group();
const body = new THREE.Mesh(new THREE.CylinderGeometry(44, 54, 110, 28, 1, true),
  glowMaterial(0x60a5fa, { emissive: 0x1e40af, emissiveIntensity: 0.35, transparent: true, opacity: 0.9 }));
const rim = new THREE.Mesh(new THREE.TorusGeometry(46, 5, 10, 30),
  glowMaterial(0x93c5fd, { emissive: 0x3b82f6, emissiveIntensity: 0.55 }));
rim.rotation.x = Math.PI / 2; rim.position.y = 55;
const handle = new THREE.Mesh(new THREE.TorusGeometry(25, 3.5, 8, 26, Math.PI),
  glowMaterial(0x93c5fd, { emissive: 0x3b82f6, emissiveIntensity: 0.55 }));
handle.position.y = 82;
bucket.add(body, rim, handle);
bucket.position.set(340, 330, 0);
scene.add(bucket);

// 金色令牌：10 枚圆片堆在桶内，取走一枚上层自动下移
const discs = [];
const stack = new THREE.Group();
for (let i = 0; i < 10; i++) {
  const d = new THREE.Mesh(new THREE.CylinderGeometry(18, 18, 5, 22),
    glowMaterial(GREEN, { emissive: GREEN, emissiveIntensity: 0.85 }));
  d.position.y = -40 + i * 8.2;
  stack.add(d);
  discs.push(d);
}
stack.position.set(340, 330, 0);
scene.add(stack);
let stackCount = 10;
function setStack(n) {
  stackCount = n;
  discs.forEach((d, i) => { d.visible = i < n; d.position.y = -40 + i * 8.2; });
}
new VText(scene, { text: '令牌桶', x: 340, y: 458, z: 0, color: PALETTE.textGlow, scale: 0.55 });
new VText(scene, { text: '容量 10 · 补充速率 5/s', x: 700, y: 340, z: 0, color: PALETTE.textDim, scale: 0.45, wrapChars: 8 });

// 请求盒子 + 放行/拒绝区（文字在落点上方，互不遮挡）
const reqBox = new VBox(scene, { w: 56, h: 40, d: 40, x: 60, y: 415, z: 0, label: 'R1', color: YELLOW, emissive: YELLOW });
reqBox.mesh.visible = false;
new VText(scene, { text: '放行 ✓', x: 500, y: 395, z: 0, color: GREEN, scale: 0.62 });
new VText(scene, { text: '拒绝 ✗ 429', x: 500, y: 305, z: 0, color: ROSE, scale: 0.62 });
const stepT = new VText(scene, { text: '', x: 320, y: 555, z: 0, color: PALETTE.textGlow, scale: 0.72, wrapChars: 7 });

function resetAll() {
  setStack(10);
  reqBox.mesh.visible = false;
  stepT.setText('');
  rim.material.color.setHex(0x93c5fd);
  rim.material.emissiveIntensity = 0.55;
}

function* rlGen() {
  resetAll();
  yield S(() => hint.setText('令牌桶：桶里先存好令牌，请求来一个取一个 — 没令牌的直接拒掉，突发被削平'));
  yield S(() => { stepT.setText('桶里已有 10 枚令牌（burst=10）。1 秒内 12 个请求突然涌来…'); });
  yield W(500);
  for (let i = 0; i < 12; i++) {
    const ok = i < 10;
    yield S(() => {
      reqBox.setText('R' + (i + 1));
      reqBox.mesh.position.set(60, 415, 0);
      reqBox.mesh.visible = true;
      reqBox.setColor(YELLOW, YELLOW);
      stepT.setText('R' + (i + 1) + ' 到达 → 向桶里取令牌');
    });
    yield W(200);
    yield A(240, (p) => {
      reqBox.mesh.position.set(60 + 280 * p, 415 + (420 - 415) * p, 0);
      rim.material.color.setHex(ok ? YELLOW : ROSE);
      rim.material.emissiveIntensity = 0.9;
    });
    yield S(() => { rim.material.color.setHex(0x93c5fd); rim.material.emissiveIntensity = 0.55; });
    yield A(240, (p) => {
      if (ok) reqBox.mesh.position.set(340 + 160 * p, 420 + (330 - 420) * p, 0);
      else reqBox.mesh.position.set(340 + 160 * p, 420 + (240 - 420) * p, 0);
    });
    yield S(() => {
      if (ok) {
        setStack(stackCount - 1); // 从桶顶取走一枚
        reqBox.setColor(GREEN, GREEN);
        stepT.setText('桶里有令牌 → R' + (i + 1) + ' 取走 1 枚，放行 ✓');
      } else {
        reqBox.setColor(ROSE, ROSE);
        stepT.setText('桶空了 → R' + (i + 1) + ' 拿不到令牌，直接拒绝 ✗（HTTP 429）');
      }
    });
    yield W(340);
  }
  yield S(() => {
    stepT.setText('1 秒内 12 请求：10 个放行（耗尽存量），2 个拒绝 — 峰值被削成 10/s，然后按 5/s 补充');
    hint.setText('令牌桶可容忍短时突发（桶里存令牌），漏桶则恒定速率 — 生产限流标配，Redis Lua 秒实现');
  });
  yield W(900);
  yield S(() => {
    status.textContent = '令牌桶限流完成：burst=10，12 请求 → 放行 10、拒绝 2（429），后续按 rate=5/s 补充';
  });
  yield W(600);
}

engine.queue(() => rlGen());
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；金=令牌，黄=取令牌成功，红=桶空拒绝 429）');

scene.start(engine);
