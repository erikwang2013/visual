// AlgorithmLibrary/Snowflake3D.js — Snowflake：64 位 ID = 41bit 时间戳 + 10bit 机器 + 12bit 序列
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Snowflake3D');

const scene = new Scene3D('scene', { cameraPos: [0, 330, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, ROSE = 0xfb7185, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「雪花 ID」开始', x: 0, y: 265, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

// 64 位 ID 三段式：41bit 时间戳 + 10bit 机器 + 12bit 序列
const segInfo = [
  { w: 340, x: -185, color: GREEN, bit: '41 bit', name: '毫秒时间戳' },
  { w: 110, x: 100, color: BLUE, bit: '10 bit', name: '机器 ID' },
  { w: 120, x: 235, color: YELLOW, bit: '12 bit', name: '序列号' },
];
const segs = segInfo.map(s => new VBox(scene, { w: s.w, h: 52, d: 40, x: s.x, y: 55, z: 0, label: s.bit + ' · ' + s.name, color: s.color, emissive: s.color }));
new VText(scene, { text: '64 位 = 63 bit 数据 + 1 bit 符号位（恒 0），ID 全序单调递增', x: 0, y: 118, z: 0, color: PALETTE.textDim, scale: 0.62 });

// 三个数据源读数
const srcT = [
  new VText(scene, { text: '', x: -185, y: 205, z: 0, color: GREEN, scale: 0.6 }),
  new VText(scene, { text: '', x: 100, y: 205, z: 0, color: BLUE, scale: 0.6 }),
  new VText(scene, { text: '', x: 235, y: 205, z: 0, color: YELLOW, scale: 0.6 }),
];
new VText(scene, { text: '时间戳 ms（自 2020-01-01）', x: -185, y: 235, z: 0, color: PALETTE.textDim, scale: 0.55 });
new VText(scene, { text: '机器 ID', x: 100, y: 235, z: 0, color: PALETTE.textDim, scale: 0.55 });
new VText(scene, { text: '序列号', x: 235, y: 235, z: 0, color: PALETTE.textDim, scale: 0.55 });

// 生成的 ID 展示
const idBox = new VBox(scene, { w: 520, h: 58, d: 44, x: 0, y: -60, z: 0, label: '', color: PALETTE.node, emissive: PALETTE.nodeEmissive });
const idT = new VText(scene, { text: '', x: 0, y: -60, z: 26, color: PALETTE.textGlow, scale: 0.62 });
const stepT = new VText(scene, { text: '', x: 0, y: -145, z: 0, color: PALETTE.textGlow, scale: 0.75 });

const idOf = (ms, mid, seq) => ((BigInt(ms) << 22n) | (BigInt(mid) << 12n) | BigInt(seq)).toString();
const fmt = n => Number(n).toLocaleString('en-US');
function show(ms, mid, seq) {
  srcT[0].setText(fmt(ms)); srcT[1].setText(String(mid)); srcT[2].setText(String(seq));
  idT.setText('Snowflake ID = ' + idOf(ms, mid, seq));
}

function resetAll() {
  engine.clear();
  srcT.forEach(t => t.setText('')); idT.setText(''); stepT.setText('');
}

function runSnowflake() {
  resetAll();
  hint.setText('Snowflake：不用中心发号器，时间戳+机器+序列三段拼接出全球唯一 ID — 雪花算法');
  C(400, () => { stepT.setText('目标：分布式环境生成全局唯一、趋势递增的 64 位 ID（如订单号）'); });
  C(800, () => {
    segs.forEach(s => { s.setColor(DIM, 0); });
    stepT.setText('41 bit 时间戳：自 2020-01-01 起的毫秒数，可用约 69 年 — 决定 ID 顺序');
  });
  C(800, () => {
    segs[0].setColor(GREEN, GREEN);
    stepT.setText('10 bit 机器 ID：每个服务实例一个编号（0~1023）— 保证跨机器不撞');
  });
  C(800, () => {
    segs[1].setColor(BLUE, BLUE);
    stepT.setText('12 bit 序列号：同一毫秒内递增（0~4095）— 保证同机同毫秒不撞');
  });
  C(800, () => {
    segs[2].setColor(YELLOW, YELLOW);
    show(1746000000000, 1, 0);
    stepT.setText('生成第 1 个 ID：ms=1,746,000,000,000 · 机器 1 · 序列 0 → 左移拼接');
  });
  C(800, () => {
    show(1746000000001, 1, 0);
    stepT.setText('1 毫秒后：时间戳 +1 → ID 变大 — 趋势递增，数据库索引友好');
  });
  C(800, () => {
    show(1746000000002, 1, 0);
    stepT.setText('同一毫秒：第 1 个请求序列 0 → 4095 个内部件用不完');
  });
  C(800, () => {
    show(1746000000002, 1, 1);
    stepT.setText('同毫秒第 2 个请求：序列 0→1 → ID 依然唯一 — 三段各司其职');
  });
  C(900, () => {
    stepT.setText('41+10+12=63 bit → 拼接成 64 位：不用查表、不用锁，各机器各自飞');
    hint.setText('Snowflake 是分布式 ID 之王 — 微信/美团/百度各有变种，也可用 Redis INCR 或 UUID v7 替代');
  });
  C(600, () => {
    status.textContent = 'Snowflake 完成：41bit 时间戳 + 10bit 机器 + 12bit 序列 = 64 位全局唯一递增 ID';
  });
}

panel.addButton('雪花 ID', runSnowflake);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；绿=时间戳段，蓝=机器段，黄=序列段，底部=拼出的完整 ID）');

scene.start(engine);
