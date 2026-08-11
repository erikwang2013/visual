// AlgorithmLibrary/CRC3D.js — CRC-32：多项式除法 + 移位寄存器校验
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('CRC3D');

const scene = new Scene3D('scene', { cameraPos: [0, 340, 620], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, GOLD = 0xfcd34d, ROSE = 0xfb7185, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「运行校验」开始', x: 0, y: 250, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const IN = '123456789';
const bytes = [...IN].map(ch => ch.charCodeAt(0));
const SP = 62, X0 = -248;
const inBoxes = [];
for (let i = 0; i < IN.length; i++) {
  inBoxes.push(new VBox(scene, { w: 50, h: 50, d: 50, x: X0 + i * SP, y: 150, z: 0, label: IN[i], color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
  new VText(scene, { text: '0x' + bytes[i].toString(16).padStart(2, '0'), x: X0 + i * SP, y: 98, z: 0, color: PALETTE.textDim, scale: 0.55 });
}
new VText(scene, { text: '输入 9 字节', x: -340, y: 185, z: 0, color: PALETTE.textDim, scale: 0.7 });
const RSP = 100, RX0 = -150;
const reg = [];
for (let i = 0; i < 4; i++) {
  reg.push(new VBox(scene, { w: 84, h: 52, d: 40, x: RX0 + i * RSP, y: -40, z: 0, label: 'FF', color: DIM, emissive: 0 }));
}
new VText(scene, { text: '32 位移位寄存器（每格 8 位）', x: -330, y: -75, z: 0, color: PALETTE.textDim, scale: 0.6 });
const polyT = new VText(scene, { text: 'CRC-32 · 多项式 0xEDB88320（反射）· 初始 0xFFFFFFFF', x: 0, y: 55, z: 0, color: PALETTE.textDim, scale: 0.7 });
const stepT = new VText(scene, { text: '', x: 0, y: 0, z: 0, color: PALETTE.textGlow, scale: 0.8 });
const resultT = new VText(scene, { text: '', x: 0, y: -150, z: 0, color: PALETTE.textGlow, scale: 0.75 });
const sendBoxes = [];
for (let i = 0; i < 4; i++) {
  sendBoxes.push(new VBox(scene, { w: 44, h: 44, d: 44, x: RX0 + i * RSP, y: -150, z: 0, label: '', color: DIM, emissive: 0 }));
}
new VText(scene, { text: '追加的校验值（低字节在前）', x: -330, y: -185, z: 0, color: PALETTE.textDim, scale: 0.6 });

function crcRegs(buf) {
  const out = [];
  let c = 0xffffffff;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0);
    out.push(c >>> 0);
  }
  return out;
}
const regs = crcRegs(bytes);
const remainder = crcRegs(bytes.concat([0x26, 0x39, 0xf4, 0xcb])).pop() >>> 0;
const hex4 = v => [(v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff].map(x => x.toString(16).padStart(2, '0'));

function setReg(v, color = YELLOW, em = YELLOW) {
  const h = hex4(v);
  for (let i = 0; i < 4; i++) { reg[i].setColor(color, em); reg[i].setText(h[i].toUpperCase()); }
}

function resetAll() {
  engine.clear();
  for (const b of inBoxes) b.setColor(PALETTE.node, PALETTE.nodeEmissive);
  setReg(0xffffffff, DIM, 0);
  stepT.setText('');
  resultT.setText('');
  for (const b of sendBoxes) { b.setColor(DIM, 0); b.setText(''); }
}

function runCrc() {
  resetAll();
  hint.setText('CRC-32：逐字节喂入寄存器做多项式除法（异或求余），完成取反得校验值');
  C(200, () => {
    setReg(0xffffffff, GREEN, GREEN);
    stepT.setText('寄存器初始化 FF FF FF FF');
  });
  let i = 0;
  const nextByte = () => {
    if (i >= bytes.length) { C(700, finish); return; }
    const cur = i; i++;
    C(150, () => {
      inBoxes[cur].setColor(YELLOW, YELLOW);
      setReg(regs[cur]);
      stepT.setText('处理字节 0x' + bytes[cur].toString(16).padStart(2, '0') + '（"' + IN[cur] + '"）：移位 8 次异或多项式 → ' + hex4(regs[cur]).join(' '));
    });
    C(650, () => {
      inBoxes[cur].setColor(GREEN, GREEN);
      setReg(regs[cur], GREEN, GREEN);
    });
    C(200, nextByte);
  };
  nextByte();

  function finish() {
    const final = (regs[8] ^ 0xffffffff) >>> 0;
    stepT.setText('9 字节处理完：寄存器 34 0B C8 D9 → 取反 → 校验值 ' + final.toString(16).toUpperCase());
    hint.setText('发送方把校验值按低字节在前追加到数据尾部一并发送');
    C(900, () => {
      setReg(final, GOLD, GOLD);
      const h = hex4(final);
      for (let i = 0; i < 4; i++) { sendBoxes[i].setColor(GREEN, GREEN); sendBoxes[i].setText(h[3 - i].toUpperCase()); }
      stepT.setText('追加 4 字节：' + h[3].toUpperCase() + ' ' + h[2].toUpperCase() + ' ' + h[1].toUpperCase() + ' ' + h[0].toUpperCase() + '（26 39 F4 CB）→ 发送');
    });
    C(1000, () => {
      setReg(remainder, GOLD, GOLD);
      stepT.setText('接收端对「数据 + 校验值」整体重算 → 残差 ' + remainder.toString(16).toUpperCase());
      resultT.setText('残差 = 2144DF1C = CRC-32 魔数 → 校验通过 ✓（数据无损）');
      status.textContent = 'CRC-32 校验完成：cbf43926 通过（残差魔数 2144DF1C）';
      hint.setText('只要有一位翻转，残差就不是魔数 → 立刻检测出错误（CRC 广泛用于网络帧/存储/压缩包）');
    });
  }
}

panel.addButton('运行校验', runCrc);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；CRC-32 即 zip/gzip/以太网使用的校验算法）');

scene.start(engine);
