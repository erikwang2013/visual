// AlgorithmLibrary/RS3D.js — Reed-Solomon RS(7,3)：GF(2^8) 多项式编码 + 伴随式纠错
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('RS3D');

const scene = new Scene3D('scene', { cameraPos: [0, 360, 650], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, ROSE = 0xfb7185, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「运行编码」开始', x: 0, y: 255, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const mul = (a, b) => { let p = 0; for (let i = 0; i < 8; i++) { if (b & 1) p ^= a; const hi = a & 0x80; a = ((a << 1) & 0xff) ^ (hi ? 0x1d : 0); b >>= 1; } return p; };
const aPow = n => { let r = 1; for (let i = 0; i < n; i++) r = mul(r, 2); return r; };
const evalPolyHigh = (coeffs, x) => { let r = 0; for (const c of coeffs) r = mul(r, x) ^ c; return r; };
const GEN = [64, 120, 54, 15, 1];

const gx = [];
const GX = ['x⁴', 'x³', 'x²', 'x¹', 'x⁰'];
for (let i = 0; i < 5; i++) {
  gx.push(new VBox(scene, { w: 92, h: 50, d: 40, x: -228 + i * 114, y: 175, z: 0, label: String(GEN[4 - i]), color: DIM, emissive: 0 }));
  new VText(scene, { text: GX[i], x: -228 + i * 114, y: 142, z: 0, color: PALETTE.textDim, scale: 0.55 });
}
new VText(scene, { text: '生成多项式 g(x) = x⁴ + 15x³ + 54x² + 120x + 64（根 α⁰..α³）', x: 0, y: 218, z: 0, color: PALETTE.textDim, scale: 0.7 });

const MSG = [12, 34, 56];
const msgBoxes = [];
for (let i = 0; i < 3; i++) {
  msgBoxes.push(new VBox(scene, { w: 80, h: 56, d: 40, x: -110 + i * 110, y: 90, z: 0, label: '', color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
  new VText(scene, { text: '0x' + MSG[i].toString(16).padStart(2, '0'), x: -110 + i * 110, y: 52, z: 0, color: PALETTE.textDim, scale: 0.55 });
}
new VText(scene, { text: '消息（3 个符号）', x: -300, y: 110, z: 0, color: PALETTE.textDim, scale: 0.6 });

const cw = [];
const CW_LABEL = ['0C', '22', '38', 'F8', 'DC', '3E', '0C'];
const CW_TYPE = ['m0', 'm1', 'm2', 'c0', 'c1', 'c2', 'c3'];
for (let i = 0; i < 7; i++) {
  cw.push(new VBox(scene, { w: 62, h: 56, d: 40, x: -228 + i * 76, y: -35, z: 0, label: '', color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
  new VText(scene, { text: CW_TYPE[i], x: -228 + i * 76, y: -72, z: 0, color: PALETTE.textDim, scale: 0.5 });
}
new VText(scene, { text: '码字（3 消息 + 4 校验）', x: -310, y: -15, z: 0, color: PALETTE.textDim, scale: 0.6 });
const stepT = new VText(scene, { text: '', x: 0, y: 5, z: 0, color: PALETTE.textGlow, scale: 0.75 });
const sT = new VText(scene, { text: '', x: 0, y: -125, z: 0, color: PALETTE.textDim, scale: 0.7 });

function encodeSteps(msg) {
  const code = [...msg, 0, 0, 0, 0];
  const steps = [];
  for (let i = 0; i < msg.length; i++) {
    const coef = code[i];
    if (coef !== 0) for (let j = 0; j < 5; j++) code[i + j] ^= mul(GEN[4 - j], coef);
    steps.push(code.slice());
  }
  for (let i = 0; i < msg.length; i++) code[i] = msg[i];
  steps.push(code.slice());
  return steps;
}
const steps = encodeSteps(MSG);
const RS_CODE = steps[steps.length - 1];
const RSV = [...RS_CODE]; RSV[1] ^= 0x55;
const S = [0, 1, 2, 3].map(i => evalPolyHigh(RSV, aPow(i)));

function resetAll() {
  engine.clear();
  for (const b of gx) b.setColor(DIM, 0);
  for (const b of msgBoxes) { b.setColor(PALETTE.node, PALETTE.nodeEmissive); b.setText(''); }
  for (const b of cw) { b.setColor(PALETTE.node, PALETTE.nodeEmissive); b.setText(''); }
  stepT.setText('');
  sT.setText('');
}

function runEncode() {
  resetAll();
  hint.setText('Reed-Solomon RS(7,3)：GF(2^8) 上多项式编码，最多纠正 2 个符号错误');
  C(200, () => { for (const b of gx) b.setColor(YELLOW, YELLOW); });
  C(800, () => { for (const b of gx) b.setColor(GREEN, GREEN); });
  C(400, () => {
    for (let i = 0; i < 3; i++) { msgBoxes[i].setColor(BLUE, BLUE); msgBoxes[i].setText(String(MSG[i])); }
    stepT.setText('消息 [12, 34, 56]：信息多项式 m(x) 左移 4 位（乘 x⁴）');
  });
  C(900, () => {
    hint.setText('编码 = 多项式除法：m(x)·x⁴ ÷ g(x) 的余数即校验位');
    encodeStep(0);
  });

  function encodeStep(k) {
    if (k >= 3) {
      C(600, () => {
        for (let i = 0; i < 7; i++) { cw[i].setColor(GREEN, GREEN); cw[i].setText(CW_LABEL[i]); }
        stepT.setText('码字 = 12 34 56 F8 DC 3E 0C（' + CW_LABEL.join(' ') + '）发送');
        hint.setText('传输：信道噪声翻转了符号 1（34 → 119）…');
      });
      C(1100, () => {
        cw[1].setColor(ROSE, ROSE); cw[1].setText('77');
        stepT.setText('接收码字 = 12 119 56 F8 DC 3E 0C');
        sT.setText('伴随式 S' + [0, 1, 2, 3].map(i => '₍' + i + '₎=' + S[i]).join(' ') + '（非零 → 检测到错误）');
        hint.setText('接收端：码字多项式在根 α⁰..α³ 处求值（Sᵢ = c(αⁱ)），全零则无错');
      });
      C(1200, () => { tryFix(0); });
      return;
    }
    const cur = steps[k];
    C(150, () => {
      msgBoxes[k].setColor(YELLOW, YELLOW);
      stepT.setText('步骤 ' + (k + 1) + '：消除最高次系数 ' + cur[k] + '（GF 乘法减掉 gen 的倍数）');
    });
    C(800, () => {
      msgBoxes[k].setColor(GREEN, GREEN);
      for (let j = 0; j < 4; j++) {
        cw[3 + j].setColor(YELLOW, YELLOW);
        cw[3 + j].setText(cur[3 + j].toString(16).padStart(2, '0').toUpperCase());
      }
      stepT.setText('余数更新：' + [3, 4, 5, 6].map(j => cur[j].toString(16).padStart(2, '0').toUpperCase()).join(' '));
    });
    C(700, () => { for (let j = 0; j < 4; j++) cw[3 + j].setColor(PALETTE.node, PALETTE.nodeEmissive); encodeStep(k + 1); });
  }

  function tryFix(j) {
    if (j >= 7) { C(300, () => {}); return; }
    const trial = [...RSV]; trial[j] = RS_CODE[j];
    const ok = [0, 1, 2, 3].every(i => evalPolyHigh(trial, aPow(i)) === 0);
    C(150, () => { cw[j].setColor(YELLOW, YELLOW); stepT.setText('试错：假定符号 ' + j + ' 出错并翻转…'); });
    C(650, () => {
      if (ok) {
        cw[j].setColor(GREEN, GREEN); cw[j].setText(CW_LABEL[j]);
        sT.setText('S₍0..3₎ = 0 → 纠错成功！符号 ' + j + ' 恢复为 ' + CW_LABEL[j]);
        stepT.setText('码字还原 12 34 56 F8 DC 3E 0C ✓  消息恢复 [12, 34, 56]');
        status.textContent = 'RS(7,3) 完成：翻转符号 1 → 伴随式非零 → 试错纠正符号 1';
        hint.setText('RS 码可纠 t = (n-k)/2 = 2 个符号错误，CD/DVD/QR 码/卫星通信都在用');
      } else {
        cw[j].setColor(ROSE, ROSE);
        sT.setText('翻转符号 ' + j + ' 后 S 仍非零 → 该符号无误，继续试错…');
        C(500, () => { cw[j].setColor(PALETTE.node, PALETTE.nodeEmissive); cw[j].setText(''); tryFix(j + 1); });
      }
    });
  }
}

panel.addButton('运行编码', runEncode);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；有限域 GF(2^8) 用 0x11D 本原多项式，加减 = 异或）');

scene.start(engine);
