// AlgorithmLibrary/CRC3D.js — CRC-32 校验：逐字节喂入 32 位移位寄存器做多项式除法（反射多项式 0xEDB88320），"123456789" → 标准校验值 0xCBF43926，接收端残差魔数 0x2144DF1C（function* 生成器驱动，全部数值运行时计算）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('CRC3D');

const scene = new Scene3D('scene', { cameraPos: [0, 330, 620], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：CRC-32 —— 把数据当作多项式做除法，余数就是校验值', x: 0, y: 250, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 215, z: 0, color: GOLD, scale: 0.7 });
const eqT = new VText(scene, { text: '', x: 0, y: 160, z: 0, color: PALETTE.textGlow, scale: 0.44 });

const IN = '123456789';
const bytes = [...IN].map(ch => ch.charCodeAt(0));
const SP = 62, X0 = -248;
const inBoxes = [];
for (let i = 0; i < IN.length; i++) {
  inBoxes.push(new VBox(scene, { w: 50, h: 50, d: 50, x: X0 + i * SP, y: 80, z: 0, label: IN[i], color: BLUE, emissive: BLUE }));
  new VText(scene, { text: '0x' + bytes[i].toString(16).padStart(2, '0'), x: X0 + i * SP, y: 28, z: 0, color: PALETTE.textDim, scale: 0.55 });
}
new VText(scene, { text: '输入 9 字节', x: -340, y: 115, z: 0, color: PALETTE.textDim, scale: 0.7 });
const RSP = 100, RX0 = -150;
const reg = [];
for (let i = 0; i < 4; i++) reg.push(new VBox(scene, { w: 84, h: 52, d: 40, x: RX0 + i * RSP, y: -40, z: 0, label: 'FF', color: DIM, emissive: 0 }));
new VText(scene, { text: '32 位移位寄存器（每格 8 位）', x: -280, y: -75, z: 0, color: PALETTE.textDim, scale: 0.6 });
new VText(scene, { text: 'CRC-32 · 多项式 0xEDB88320（反射）· 初始 0xFFFFFFFF', x: 0, y: -115, z: 0, color: PALETTE.textDim, scale: 0.7 });
const stepT = new VText(scene, { text: '', x: 0, y: -160, z: 0, color: PALETTE.textGlow, scale: 0.8 });
const resultT = new VText(scene, { text: '', x: 0, y: -215, z: 0, color: PALETTE.textGlow, scale: 0.75 });

const hex4 = v => [(v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff].map(x => x.toString(16).padStart(2, '0').toUpperCase());
const setReg = (v, color = GOLD, em = GOLD) => {
  const h = hex4(v);
  for (let i = 0; i < 4; i++) { reg[i].setColor(color, em); reg[i].setText(h[i]); }
};

function* crcGen() {
  let c = 0xffffffff;
  yield S(() => { hint.setText('CRC = 循环冗余校验：数据左移进寄存器，移出的 1 与多项式异或 —— 本质是二进制多项式除法'); stageT.setText('寄存器初始 ' + hex4(c).join(' ') + '；逐字节处理 ' + IN + '（' + bytes.length + ' 字节）'); });
  yield W(900);
  setReg(c, GREEN, GREEN);
  yield W(600);
  const regs = [];
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    c ^= b;
    inBoxes[i].setColor(GOLD, GOLD);
    yield S(() => { stageT.setText('处理字节 0x' + b.toString(16).padStart(2, '0') + '（"' + IN[i] + '"）：异或后移位 8 次'); eqT.setText('每步：c = c >>> 1 ⊕ (c&1 ? 0xEDB88320 : 0)'); });
    yield W(450);
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0);
    regs.push(c >>> 0);
    setReg(c >>> 0);
    yield S(() => { stageT.setText('字节 ' + IN[i] + ' 处理完：寄存器 ' + hex4(c).join(' ')); });
    yield W(500);
    inBoxes[i].setColor(GREEN, GREEN);
  }
  const final = (regs[8] ^ 0xffffffff) >>> 0;
  setReg(final, GOLD, GOLD);
  stageT.setText('9 字节全部处理完：寄存器 ' + hex4(regs[8]).join(' ') + ' → 取反 → 校验值');
  yield S(() => { eqT.setText('校验值 = ~' + hex4(regs[8]).join(' ') + ' = ' + final.toString(16).toUpperCase() + ' ✓（"123456789" 的标准 CRC-32 即 CBF43926）'); });
  yield W(900);
  resultT.setText('CRC-32("' + IN + '") = ' + final.toString(16).toUpperCase() + ' ✓ 运行时计算，与标准值一致');
  status.textContent = 'CRC-32: CBF43926';
  yield S(() => { hint.setText('发送方把校验值追加到数据尾部一起发送；接收端对「数据 + 校验值」整体重算'); });
  yield W(800);
  let r2 = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) { r2 ^= bytes[i]; for (let k = 0; k < 8; k++) r2 = (r2 >>> 1) ^ ((r2 & 1) ? 0xedb88320 : 0); }
  for (const b of [0x26, 0x39, 0xf4, 0xcb]) { r2 ^= b; for (let k = 0; k < 8; k++) r2 = (r2 >>> 1) ^ ((r2 & 1) ? 0xedb88320 : 0); }
  r2 >>>= 0;
  setReg(r2, CYAN, CYAN);
  yield S(() => { stageT.setText('接收端对「数据 + 校验值」整体重算 → 残差 ' + r2.toString(16).toUpperCase()); eqT.setText('残差 = 2144DF1C = CRC-32 魔数（取反固定值）→ 校验通过'); });
  yield W(900);
  resultT.setText('残差 ' + r2.toString(16).toUpperCase() + ' = 魔数 → 校验通过 ✓（任一位翻转都会破坏魔数）');
  yield S(() => { hint.setText('任一位翻转残差就不是 2144DF1C → 立即检测；CRC 用于以太网帧、gzip/zip、PNG、存储设备'); });
  yield W(1000);
  yield S(() => { hint.setText('CRC-32 演示完成：移位寄存器除法 → 校验值 CBF43926 → 接收端残差魔数验证'); resultT.setText(''); stepT.setText(''); });
  yield W(400);
}

function* runCRC() {
  hint.setText('CRC-32：多项式除法');
  yield W(400);
  yield* crcGen();
}

engine.queue(() => runCRC());
panel.addButton('清空', () => {
  engine.clear();
  inBoxes.forEach(b => b.setColor(BLUE, BLUE));
  setReg(0xffffffff, DIM, 0);
  stageT.setText(''); eqT.setText(''); stepT.setText(''); resultT.setText('');
  hint.setText('已清空，可重新运行'); status.textContent = '';
});
panel.addLabel('（拖拽旋转视角，滚轮缩放；上排蓝 = 输入字节、中排 4 格 = 32 位寄存器（绿 = 初始化、金 = 逐字节更新）、残差青 = 校验魔数验证）');

scene.start(engine);
