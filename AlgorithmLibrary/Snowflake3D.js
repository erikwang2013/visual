// AlgorithmLibrary/Snowflake3D.js — Snowflake：64 位 ID = 41bit 时间戳 + 10bit 机器 + 12bit 序列（function* 生成器驱动）
// draw.io 风格实体图标：时钟（时间戳）/ 服务器（机器 ID）/ 计数柱（序列号）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { glowMaterial, PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Snowflake3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, DIM = 0x334155;
const status = panel.addStatus('就绪');

// —— 64 位 ID 三段：41bit 时间戳 + 10bit 机器 + 12bit 序列 ——
const segInfo = [
  { w: 340, x: 135, color: GREEN, bit: '41 bit', name: '毫秒时间戳' },
  { w: 110, x: 420, color: BLUE, bit: '10 bit', name: '机器 ID' },
  { w: 120, x: 555, color: YELLOW, bit: '12 bit', name: '序列号' },
];
const segs = segInfo.map(s => new VBox(scene, { w: s.w, h: 48, d: 40, x: s.x, y: 330, z: 0, label: s.bit + ' · ' + s.name, color: s.color, emissive: s.color }));

// —— draw.io 风格实体图标（对应三段，位于段上方） ——
const icons = new THREE.Group();
const dimMat = c => glowMaterial(c, { emissive: c, emissiveIntensity: 0.55 });
// 时钟（时间戳）：钟面圆环 + 时分指针
const clock = new THREE.Group();
const ring = new THREE.Mesh(new THREE.TorusGeometry(26, 4.5, 10, 36), dimMat(GREEN));
ring.rotation.x = Math.PI / 2;
const handMin = new THREE.Mesh(new THREE.BoxGeometry(4, 42, 3), glowMaterial(GREEN, { emissive: GREEN, emissiveIntensity: 0.9 }));
handMin.position.y = 20;
const handHour = new THREE.Mesh(new THREE.BoxGeometry(4, 28, 3), glowMaterial(GREEN, { emissive: GREEN, emissiveIntensity: 0.9 }));
handHour.position.y = 12;
const pin = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 4, 10), glowMaterial(GREEN, { emissive: GREEN, emissiveIntensity: 0.9 }));
const clockHands = new THREE.Group();
clockHands.add(handMin, handHour, pin);
clockHands.position.z = 6;
clock.add(ring, clockHands);
clock.position.set(135, 510, 0);
icons.add(clock);

// 服务器（机器 ID）：机架 + 前面板 3 槽
const server = new THREE.Group();
const rack = new THREE.Mesh(new THREE.BoxGeometry(104, 32, 26), dimMat(BLUE));
const slots = [];
for (let i = -1; i <= 1; i++) {
  const slot = new THREE.Mesh(new THREE.BoxGeometry(88, 6.5, 3), glowMaterial(DIM, { emissive: DIM, emissiveIntensity: 0.2 }));
  slot.position.set(0, i * 9.5, 14.5);
  server.add(slot);
  slots.push(slot);
}
server.add(rack);
server.position.set(420, 510, 0);
icons.add(server);

// 计数柱（序列号）：底座 + 3 根递增柱
const counter = new THREE.Group();
const cbase = new THREE.Mesh(new THREE.BoxGeometry(84, 5, 24), dimMat(YELLOW));
const bars = [];
const barH = [18, 32, 46];
for (let i = 0; i < 3; i++) {
  const bar = new THREE.Mesh(new THREE.BoxGeometry(20, 1, 20), dimMat(YELLOW));
  bar.position.set((i - 1) * 24, 2.5, 0);
  bar.userData.h = barH[i];
  counter.add(bar);
  bars.push(bar);
}
counter.add(cbase);
counter.position.set(555, 510, 0);
icons.add(counter);
scene.add(icons);

function setBars(h) {
  bars.forEach((b, i) => {
    const t = Math.min(h * 1.2, b.userData.h);
    b.scale.y = Math.max(t, 0.6);
    b.position.y = 2.5 + t / 2;
  });
}
setBars(0);

// 读数（三段当前值）
const srcT = [
  new VText(scene, { text: '', x: 135, y: 425, z: 0, color: GREEN, scale: 0.6 }),
  new VText(scene, { text: '', x: 420, y: 425, z: 0, color: BLUE, scale: 0.6 }),
  new VText(scene, { text: '', x: 555, y: 425, z: 0, color: YELLOW, scale: 0.6 }),
];

// 生成的 ID 展示
const idBox = new VBox(scene, { w: 520, h: 58, d: 44, x: 0, y: 165, z: 0, label: '', color: PALETTE.node, emissive: PALETTE.nodeEmissive });
const idT = new VText(scene, { text: '', x: 0, y: 165, z: 26, color: PALETTE.textGlow, scale: 0.62 });

const idOf = (ms, mid, seq) => ((BigInt(ms) << 22n) | (BigInt(mid) << 12n) | BigInt(seq)).toString();
const fmt = n => Number(n).toLocaleString('en-US');
function show(ms, mid, seq) {
  srcT[0].setText(fmt(ms)); srcT[1].setText(String(mid)); srcT[2].setText(String(seq));
  idT.setText('Snowflake ID = ' + idOf(ms, mid, seq));
}

function resetAll() {
  srcT.forEach(t => t.setText('')); idT.setText('');
  clockHands.rotation.z = 0;
  slots.forEach(s => s.material.emissiveIntensity = 0.2);
  setBars(0);
  segs.forEach(s => s.setColor(s.color, s.color));
}

function* sfGen() {
  resetAll();
  yield S(() => { status.textContent = '雪花算法：不用中心发号器，时间戳+机器+序列三段拼接出全局唯一、趋势递增的 64 位 ID（如订单号）'; });
  yield W(600);
  yield S(() => {
    segs.forEach(s => { s.setColor(DIM, 0); });
    status.textContent = '41 bit 时间戳：自 2020-01-01 起的毫秒数，可用约 69 年 — 决定 ID 顺序';
  });
  yield W(800);
  yield A(900, (p) => {
    segs[0].setColor(GREEN, GREEN);
    clockHands.rotation.z = p * Math.PI * 2;
  });
  yield S(() => { status.textContent = '时钟滴答 — 时间戳每秒都在增长，ID 的顺序由它保证'; });
  yield W(600);
  yield A(900, (p) => {
    segs[1].setColor(BLUE, BLUE);
    slots.forEach(s => { s.material.emissiveIntensity = 0.3 + 0.7 * Math.sin(p * Math.PI * 4); });
  });
  yield S(() => { status.textContent = '10 bit 机器 ID：每个服务实例一个编号（0~1023）— 保证跨机器不撞'; });
  yield W(600);
  yield A(900, (p) => {
    segs[2].setColor(YELLOW, YELLOW);
    setBars(p);
  });
  yield S(() => { status.textContent = '12 bit 序列号：同一毫秒内递增（0~4095）— 保证同机同毫秒不撞'; });
  yield W(600);
  yield S(() => {
    show(1746000000000, 1, 0);
    status.textContent = '生成第 1 个 ID：ms=1,746,000,000,000 · 机器 1 · 序列 0 → 左移拼接';
  });
  yield W(800);
  yield S(() => {
    clockHands.rotation.z += Math.PI * 2;
    show(1746000000001, 1, 0);
    status.textContent = '1 毫秒后：时间戳 +1 → ID 变大 — 趋势递增，数据库索引友好';
  });
  yield W(800);
  yield S(() => {
    show(1746000000002, 1, 0);
    status.textContent = '同一毫秒：序列号还没动，时间戳已经不同 — 依然唯一';
  });
  yield W(800);
  yield A(900, (p) => {
    show(1746000000002, 1, 1);
    setBars(0.5 + p * 0.5);
  });
  yield S(() => { status.textContent = '同毫秒第 2 个请求：序列 0→1 → ID 依然唯一 — 三段各司其职'; });
  yield W(600);
  yield S(() => {
    setBars(1);
    status.textContent = '41+10+12=63 bit → 拼接成 64 位：不用查表、不用锁，各机器各自飞（微信/美团/百度各有变种，也可用 Redis INCR 或 UUID v7 替代）';
  });
  yield W(900);
  yield S(() => {
    status.textContent = '雪花 ID 演示完成：41bit 时间戳 + 10bit 机器 + 12bit 序列 = 64 位全局唯一递增 ID（末例 ms=1,746,000,000,002 · 机器 1 · 序列 1）';
  });
  yield W(600);
}

engine.queue(() => sfGen());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
