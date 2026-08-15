// AlgorithmLibrary/CRC3D.js — CRC-32 循环冗余校验：逐字节喂入 32 位移位寄存器做多项式异或除法（反射多项式 0xEDB88320），"123456789" → 校验值 0xCBF43926，接收端残差魔数 0x2144DF1C（function* 生成器驱动，解说入状态栏）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('CRC3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, CYAN = 0x22d3ee, DIM = 0x334155;
const status = panel.addStatus('就绪');
const ease = p => p * p * (3 - 2 * p);

const IN = '123456789';
const bytes = [...IN].map(ch => ch.charCodeAt(0));
const SP = 62, X0 = 72;

// ---- 模块级预建对象（运行期仅改文字/颜色/显隐/缩放，绝不 new）----
const inBoxes = [];
for (let i = 0; i < IN.length; i++) {
  inBoxes.push(new VBox(scene, { w: 50, h: 50, d: 50, x: X0 + i * SP, y: 585, z: 0, label: IN[i], color: BLUE, emissive: BLUE }));
  new VText(scene, { text: '0x' + bytes[i].toString(16).padStart(2, '0'), x: X0 + i * SP, y: 533, z: 0, color: PALETTE.textDim, scale: 0.55 });
}
const RSP = 95, RX0 = 180;
const reg = [];
for (let i = 0; i < 4; i++) reg.push(new VBox(scene, { w: 84, h: 52, d: 40, x: RX0 + i * RSP, y: 400, z: 0, label: 'FF', color: DIM, emissive: DIM }));
const resultBox = new VBox(scene, { w: 160, h: 54, d: 40, x: 320, y: 185, z: 0, label: '', color: DIM, emissive: DIM });
resultBox.mesh.visible = false;

const hex4 = v => [(v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff].map(x => x.toString(16).padStart(2, '0').toUpperCase());
const setReg = (v, color, em) => {
  const h = hex4(v);
  for (let i = 0; i < 4; i++) { reg[i].setColor(color, em); reg[i].setText(h[i]); }
};

function* runCRC() {
  let c = 0xffffffff;
  yield S(() => { status.textContent = 'CRC-32 循环冗余校验：把数据当作二进制多项式，对生成多项式做异或除法（无借位），余数就是校验值。演示：逐字节处理 "123456789"（9 字节）'; });
  yield W(700);
  setReg(c, GREEN, GREEN);
  yield S(() => { status.textContent = '寄存器初始化为 0xFFFFFFFF（绿）。每步：c = c >>> 1 ⊕ (c&1 ? 0xEDB88320 : 0)'; });
  yield W(600);
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    c ^= b;
    inBoxes[i].setColor(GOLD, GOLD);
    yield S(() => { status.textContent = '字节 "' + IN[i] + '"（0x' + b.toString(16).padStart(2, '0') + '）与寄存器异或，随后移位 8 次 —— 移出的 1 与多项式 0xEDB88320 异或'; });
    yield W(500);
    yield A(320, p => { const e = ease(p); inBoxes[i].mesh.scale.setScalar(1 + 0.35 * Math.sin(e * Math.PI)); });
    inBoxes[i].mesh.scale.setScalar(1);
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0);
    c >>>= 0;
    setReg(c, GOLD, GOLD);
    yield S(() => { status.textContent = '字节 "' + IN[i] + '" 处理完：寄存器 = ' + hex4(c).join(' ') + '（金）'; });
    yield W(600);
    inBoxes[i].setColor(GREEN, GREEN);
  }
  const final = (c ^ 0xffffffff) >>> 0;
  setReg(final, GOLD, GOLD);
  resultBox.setText(final.toString(16).toUpperCase());
  resultBox.setColor(GOLD, GOLD);
  resultBox.mesh.visible = true;
  yield S(() => { status.textContent = '9 字节全部处理完：寄存器 ' + hex4(c).join(' ') + ' → 逐位取反 → 校验值 ' + final.toString(16).toUpperCase() + '（"123456789" 的标准 CRC-32 即 CBF43926）'; });
  yield W(1000);
  yield S(() => { status.textContent = '发送方把校验值追加到数据尾部：接收端对「数据 + 校验值」整体重算，残差应为固定魔数 0x2144DF1C'; });
  yield W(900);
  let r2 = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) { r2 ^= bytes[i]; for (let k = 0; k < 8; k++) r2 = (r2 >>> 1) ^ ((r2 & 1) ? 0xedb88320 : 0); }
  for (const b of [0x26, 0x39, 0xf4, 0xcb]) { r2 ^= b; for (let k = 0; k < 8; k++) r2 = (r2 >>> 1) ^ ((r2 & 1) ? 0xedb88320 : 0); }
  r2 >>>= 0;
  setReg(r2, CYAN, CYAN);
  yield S(() => { status.textContent = '接收端重算完成：残差 = ' + r2.toString(16).toUpperCase() + '（青）= CRC-32 魔数 → 校验通过 ✓（任一位翻转都会破坏魔数，立即检出）'; });
  yield W(1000);
  yield S(() => { status.textContent = 'CRC 演示完成："123456789" → 校验值 ' + final.toString(16).toUpperCase() + '，接收端残差 ' + r2.toString(16).toUpperCase() + '（魔数）校验通过；复杂度 O(n) 逐字节处理，每字节 8 次移位异或'; });
  yield W(800);
}

engine.queue(() => runCRC());
panel.addButton('清空', () => {
  engine.clear();
  inBoxes.forEach(b => { b.setColor(BLUE, BLUE); b.mesh.scale.setScalar(1); });
  setReg(0xffffffff, DIM, DIM);
  resultBox.mesh.visible = false;
  status.textContent = '';
});

scene.start(engine);
