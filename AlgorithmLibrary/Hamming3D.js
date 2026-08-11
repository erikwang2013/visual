// AlgorithmLibrary/Hamming3D.js — 汉明码 (7,4)：奇偶校验位 + 综合征纠错
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Hamming3D');

const scene = new Scene3D('scene', { cameraPos: [0, 330, 600], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, ROSE = 0xfb7185, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「运行编码」开始', x: 0, y: 250, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const SP = 76, X0 = -228, RY = 130;
const TYPE = ['', 'p1', 'p2', 'd1', 'p4', 'd2', 'd3', 'd4'];
const bits = [];
for (let b = 1; b <= 7; b++) {
  bits.push(new VBox(scene, { w: 62, h: 62, d: 62, x: X0 + (b - 1) * SP, y: RY, z: 0, label: '?', color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
  new VText(scene, { text: '位' + b + ' ' + TYPE[b], x: X0 + (b - 1) * SP, y: RY - 52, z: 0, color: PALETTE.textDim, scale: 0.55 });
}
const stepT = new VText(scene, { text: '', x: 0, y: 20, z: 0, color: PALETTE.textGlow, scale: 0.8 });
const synT = new VText(scene, { text: '', x: 0, y: -60, z: 0, color: PALETTE.textDim, scale: 0.7 });

const DATA = { 3: 1, 5: 0, 6: 1, 7: 1 };
const PARITY = { 1: { bits: [3, 5, 7], label: 'p1 = d1⊕d2⊕d4' }, 2: { bits: [3, 6, 7], label: 'p2 = d1⊕d3⊕d4' }, 4: { bits: [5, 6, 7], label: 'p4 = d2⊕d3⊕d4' } };

function resetAll() {
  engine.clear();
  for (const b of bits) { b.setColor(PALETTE.node, PALETTE.nodeEmissive); b.setText('?'); }
  stepT.setText('');
  synT.setText('');
}

function runEncode() {
  resetAll();
  hint.setText('汉明 (7,4)：4 个数据位 + 3 个校验位，任意 1 位翻转可自动纠正');
  C(200, () => {
    for (const [b, v] of Object.entries(DATA)) { bits[b - 1].setColor(BLUE, BLUE); bits[b - 1].setText(String(v)); }
    stepT.setText('写入数据位：d1=1 d2=0 d3=1 d4=1（数据 1011）');
  });
  C(900, () => {
    const p = PARITY[1];
    for (const b of p.bits) bits[b - 1].setColor(YELLOW, YELLOW);
    stepT.setText(p.label + ' = 1⊕0⊕1 = 0');
    hint.setText('校验位 p1 覆盖位 1,3,5,7：偶校验使 1 的个数为偶数');
  });
  C(800, () => {
    for (const b of PARITY[1].bits) bits[b - 1].setColor(BLUE, BLUE);
    bits[0].setColor(GREEN, GREEN); bits[0].setText('0');
    stepT.setText('p1 = 0 → 位 1 写 0');
    const p = PARITY[2];
    for (const b of p.bits) bits[b - 1].setColor(YELLOW, YELLOW);
    stepT.setText(p.label + ' = 1⊕1⊕1 = 1');
  });
  C(800, () => {
    for (const b of PARITY[2].bits) bits[b - 1].setColor(BLUE, BLUE);
    bits[1].setColor(GREEN, GREEN); bits[1].setText('1');
    stepT.setText('p2 = 1 → 位 2 写 1');
    const p = PARITY[4];
    for (const b of p.bits) bits[b - 1].setColor(YELLOW, YELLOW);
    stepT.setText(p.label + ' = 0⊕1⊕1 = 0');
  });
  C(800, () => {
    for (const b of PARITY[4].bits) bits[b - 1].setColor(BLUE, BLUE);
    bits[3].setColor(GREEN, GREEN); bits[3].setText('0');
    stepT.setText('p4 = 0 → 位 4 写 0');
  });
  C(700, () => {
    for (let b = 1; b <= 7; b++) bits[b - 1].setColor(GREEN, GREEN);
    stepT.setText('码字完成：0 1 1 0 0 1 1（0110011）发送到信道');
    hint.setText('传输：信道噪声可能翻转某个比特…');
  });
  C(1000, () => {
    bits[4].setColor(ROSE, ROSE); bits[4].setText('1');
    stepT.setText('信道翻转了位 5：0 → 1，接收码字 0110111');
    hint.setText('接收端重算三个校验位（综合征）找出错误位置');
  });
  C(900, () => {
    for (const b of PARITY[1].bits) bits[b - 1].setColor(YELLOW, YELLOW);
    stepT.setText('s1 = 位1⊕3⊕5⊕7 = 0⊕1⊕1⊕1 = 1（组 1 奇偶校验失败）');
  });
  C(800, () => {
    for (const b of PARITY[1].bits) bits[b - 1].setColor(ROSE, ROSE);
    for (const b of PARITY[2].bits) bits[b - 1].setColor(YELLOW, YELLOW);
    stepT.setText('s2 = 位2⊕3⊕6⊕7 = 1⊕1⊕1⊕1 = 0（组 2 通过）');
  });
  C(800, () => {
    for (const b of PARITY[2].bits) bits[b - 1].setColor(ROSE, ROSE);
    for (const b of PARITY[4].bits) bits[b - 1].setColor(YELLOW, YELLOW);
    stepT.setText('s4 = 位4⊕5⊕6⊕7 = 0⊕1⊕1⊕1 = 1（组 4 失败）');
  });
  C(800, () => {
    for (const b of PARITY[4].bits) bits[b - 1].setColor(ROSE, ROSE);
    synT.setText('综合征 = s4·4 + s2·2 + s1 = 101₂ = 5 → 错误定位在位 5');
    bits[4].setColor(ROSE, ROSE);
  });
  C(900, () => {
    bits[4].setColor(GREEN, GREEN); bits[4].setText('0');
    stepT.setText('纠正：位 5 翻回 0 → 码字还原 0110011');
    synT.setText('数据恢复 d1d2d3d4 = 1011 ✓（汉明距离 3，可纠 1 位错）');
    status.textContent = '汉明码完成：1011 → 0110011 → 传输翻位 5 → 综合征 5 → 自动纠正';
    hint.setText('汉明码是 ECC 内存、通信协议中纠错的基础（SEC-DED 也源于此）');
  });
}

panel.addButton('运行编码', runEncode);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；每个校验位覆盖一组数据位，错位由覆盖组唯一确定）');

scene.start(engine);
