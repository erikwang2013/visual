// AlgorithmLibrary/FastPow3D.js — 快速幂：按二进制位平方底数、按位乘入结果
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('FastPow3D');

const scene = new Scene3D('scene', { cameraPos: [0, 260, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const BASE = 2, EXP = 13;
const bits = [];
{ let e = EXP; while (e) { bits.push(e & 1); e >>= 1; } }
const GREEN = 0x4ade80, YELLOW = 0xfacc15;
const status = panel.addStatus('');
const hint = new VText(scene, { text: '点击「运行快速幂」开始：计算 2^13', x: 0, y: 250, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const bitBoxes = [];
bits.forEach((b, i) => {
  bitBoxes.push(new VBox(scene, { w: 56, h: 42, d: 42, x: -430, y: 135 - i * 70, z: 0, label: String(b), color: b ? YELLOW : PALETTE.node, emissive: b ? YELLOW : PALETTE.nodeEmissive }));
  new VText(scene, { text: '2^' + i, x: -430, y: 160 - i * 70, z: 0, color: PALETTE.textDim, scale: 0.6 });
});
const baseBox = new VBox(scene, { w: 100, h: 64, d: 64, x: -150, y: 40, z: 0, label: '2', color: PALETTE.blue, emissive: PALETTE.blue });
const resBox = new VBox(scene, { w: 100, h: 64, d: 64, x: 210, y: 40, z: 0, label: '1', color: PALETTE.purple, emissive: PALETTE.purple });
new VText(scene, { text: '底数（每步平方）', x: -150, y: 115, z: 0, color: PALETTE.textDim, scale: 0.7 });
new VText(scene, { text: '结果（位=1 时乘入）', x: 210, y: 115, z: 0, color: PALETTE.textDim, scale: 0.7 });
const eqLabel = new VText(scene, { text: '', x: 30, y: -185, z: 0, color: PALETTE.textGlow, scale: 0.95 });

function runFastPow() {
  engine.clear();
  bitBoxes.forEach((bx, i) => bx.setColor(bits[i] ? YELLOW : PALETTE.node, bits[i] ? YELLOW : PALETTE.nodeEmissive));
  baseBox.setText('2'); baseBox.setColor(PALETTE.blue, PALETTE.blue);
  resBox.setText('1'); resBox.setColor(PALETTE.purple, PALETTE.purple);
  eqLabel.setText('');
  hint.setText('13 = ' + bits.map((b, i) => b * Math.pow(2, i)).filter(v => v).join(' + ') + '，按二进制位从低位处理');

  let base = BASE, res = 1, i = 0;
  const step = () => {
    if (i >= bits.length) {
      status.textContent = '快速幂完成：2^13 = ' + res + '（仅 ' + bits.length + ' 次平方与按位乘法）';
      hint.setText('2^13 = ' + res);
      eqLabel.setText('2^13 = ' + res);
      resBox.setColor(GREEN, GREEN);
      return;
    }
    if (i > 0) bitBoxes[i - 1].setColor(bits[i - 1] ? YELLOW : PALETTE.node, bits[i - 1] ? YELLOW : PALETTE.nodeEmissive);
    const b = bits[i];
    bitBoxes[i].setColor(PALETTE.highlight, PALETTE.highlightEmissive);
    if (b) {
      res *= base;
      hint.setText('第 ' + (i + 1) + ' 位 = 1：结果 × 底数 → ' + res);
      C(420, () => { resBox.setText(String(res)); resBox.setColor(PALETTE.highlight, PALETTE.highlightEmissive); }, () => {});
      C(200, () => resBox.setColor(PALETTE.purple, PALETTE.purple));
    } else {
      hint.setText('第 ' + (i + 1) + ' 位 = 0：结果不变 = ' + res);
      C(420, () => {});
    }
    base *= base;
    C(420, () => { baseBox.setText(String(base)); baseBox.setColor(PALETTE.highlight, PALETTE.highlightEmissive); }, () => {});
    C(200, () => baseBox.setColor(PALETTE.blue, PALETTE.blue));
    i++;
    C(250, step);
  };
  step();
}

panel.addButton('运行快速幂', runFastPow);
panel.addButton('清空', () => { engine.clear(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
