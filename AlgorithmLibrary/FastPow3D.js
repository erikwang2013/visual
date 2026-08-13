// AlgorithmLibrary/FastPow3D.js — 快速幂：13=1101₂ 按位处理，位=1 时结果×底数、底数每步平方，最终 2^13=8192 仅 4 轮（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('FastPow3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, YELLOW = 0xfacc15, DIM = 0x334155;
const status = panel.addStatus('就绪');
const hint = new VText(scene, { text: '点击「▶ 演示」开始：计算 2^13（二进制 1101₂）', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const stageT = new VText(scene, { text: '', x: 700, y: 440, z: 0, color: GOLD, scale: 0.5, wrapChars: 8 });
const eqLabel = new VText(scene, { text: '', x: 700, y: 345, z: 0, color: PALETTE.textGlow, scale: 0.45, wrapChars: 8 });

const BASE = 2, EXP = 13;
const bits = [];
{ let e = EXP; while (e) { bits.push(e & 1); e >>= 1; } }
const bitBoxes = [];
bits.forEach((b, i) => {
  bitBoxes.push(new VBox(scene, { w: 56, h: 42, d: 42, x: 40, y: 440 - i * 70, z: 0, label: String(b), color: b ? YELLOW : DIM, emissive: b ? YELLOW : DIM }));
  new VText(scene, { text: '2^' + i + ' 位', x: 40, y: 465 - i * 70, z: 0, color: PALETTE.textDim, scale: 0.6 });
});
const baseBox = new VBox(scene, { w: 100, h: 64, d: 64, x: 210, y: 340, z: 0, label: '2', color: BLUE, emissive: BLUE });
const resBox = new VBox(scene, { w: 100, h: 64, d: 64, x: 520, y: 340, z: 0, label: '1', color: PUR, emissive: PUR });
new VText(scene, { text: '底数（每步平方）', x: 210, y: 415, z: 0, color: PALETTE.textDim, scale: 0.7 });
new VText(scene, { text: '结果（位=1 时乘入）', x: 520, y: 415, z: 0, color: PALETTE.textDim, scale: 0.7 });
new VText(scene, { text: '2^13 = 2^8 × 2^4 × 2^1：指数拆二进制，只 4 轮', x: 700, y: 490, z: 0, color: PALETTE.textDim, scale: 0.4, wrapChars: 10 });

function clearView() {
  bitBoxes.forEach((bx, i) => bx.setColor(bits[i] ? YELLOW : DIM, bits[i] ? YELLOW : DIM));
  baseBox.setText('2'); baseBox.setColor(BLUE, BLUE);
  resBox.setText('1'); resBox.setColor(PUR, PUR);
  eqLabel.setText(''); stageT.setText('');
}

function* fpGen() {
  let base = BASE, res = 1;
  yield S(() => { hint.setText('13 = ' + bits.map((b, i) => b * Math.pow(2, i)).filter(v => v).join('+') + '，按二进制位从低位处理'); stageT.setText('核心：x^13 = x^8·x^4·x —— 预算 x²,x⁴,x⁸ 按需乘入'); });
  yield W(700);
  for (let i = 0; i < bits.length; i++) {
    const b = bits[i];
    bitBoxes[i].setColor(ORANGE, ORANGE);
    if (b) {
      res *= base;
      resBox.setText(String(res));
      resBox.setColor(ORANGE, ORANGE);
      yield S(() => { stageT.setText('第 ' + (i + 1) + ' 位（2^' + i + '）= 1 → 结果 × 底数 ' + base + ' = ' + res); eqLabel.setText('2^' + (Math.pow(2, i)) + ' × ' + (res / base) + ' → ' + res); });
      yield W(500);
      resBox.setColor(PUR, PUR);
    } else {
      yield S(() => stageT.setText('第 ' + (i + 1) + ' 位（2^' + i + '）= 0 → 结果不变（2^' + Math.pow(2, i) + ' 跳过）'));
      yield W(420);
    }
    base *= base;
    baseBox.setText(String(base));
    baseBox.setColor(ORANGE, ORANGE);
    yield S(() => stageT.setText('底数平方：' + Math.sqrt(base) + '² = ' + base + '（为下一位准备 2^' + (2 * Math.pow(2, i)) + '）'));
    yield W(420);
    baseBox.setColor(BLUE, BLUE);
    bitBoxes[i].setColor(b ? YELLOW : DIM, b ? YELLOW : DIM);
  }
  resBox.setColor(GREEN, GREEN);
  eqLabel.setText('2^13 = ' + res);
  yield S(() => { status.textContent = '快速幂完成：2^13 = ' + res + '（仅 ' + bits.length + ' 次平方与按位乘法）'; stageT.setText('对比朴素乘 13 次：快速幂只 4 轮平方 + 按位乘'); });
  yield W(1000);
  yield S(() => { hint.setText('2^13 = ' + res + ' ✓（快速幂，4 轮）'); stageT.setText('进阶：矩阵快速幂同法 —— 斐波那契 O(log n)'); });
  yield W(800);
}

function* runFP() {
  clearView();
  hint.setText('快速幂：按二进制位平方底数、按位乘入结果');
  yield W(400);
  yield* fpGen();
  yield S(() => hint.setText('快速幂完成：2^13 = 8192，O(log 13) = 4 轮'));
}

engine.queue(() => runFP());
panel.addButton('清空', () => { engine.clear(); clearView(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；黄 = 位=1，灰 = 位=0，橙 = 正在处理，蓝 = 底数，紫 = 结果，绿 = 最终答案）');

scene.start(engine);
