// AlgorithmLibrary/FastPow3D.js — 快速幂：13=1101₂ 按位处理，位=1 时结果×底数、底数每步平方，最终 2^13=8192 仅 4 轮（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('FastPow3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, YELLOW = 0xfacc15, DIM = 0x334155;
const status = panel.addStatus('就绪');

const BASE = 2, EXP = 13;
const bits = [];
{ let e = EXP; while (e) { bits.push(e & 1); e >>= 1; } }
const bitBoxes = [];
bits.forEach((b, i) => {
  bitBoxes.push(new VBox(scene, { w: 56, h: 42, d: 42, x: 40, y: 505 - i * 60, z: 0, label: String(b), color: b ? YELLOW : DIM, emissive: b ? YELLOW : DIM }));
  new VText(scene, { text: '2^' + i + ' 位', x: 40, y: 543 - i * 60, z: 0, color: PALETTE.textDim, scale: 0.6 });
});
const baseBox = new VBox(scene, { w: 100, h: 64, d: 64, x: 210, y: 340, z: 0, label: '2', color: BLUE, emissive: BLUE });
const resBox = new VBox(scene, { w: 100, h: 64, d: 64, x: 520, y: 340, z: 0, label: '1', color: PUR, emissive: PUR });

function clearView() {
  bitBoxes.forEach((bx, i) => bx.setColor(bits[i] ? YELLOW : DIM, bits[i] ? YELLOW : DIM));
  baseBox.setText('2'); baseBox.setColor(BLUE, BLUE);
  resBox.setText('1'); resBox.setColor(PUR, PUR);
}

function* fpGen() {
  let base = BASE, res = 1;
  yield S(() => { status.textContent = '快速幂计算 2^13：13 = 8+4+1（二进制 1101₂），按位处理 —— 位=1 时结果×底数，底数每步平方'; });
  yield W(700);
  for (let i = 0; i < bits.length; i++) {
    const b = bits[i];
    bitBoxes[i].setColor(ORANGE, ORANGE);
    if (b) {
      res *= base;
      resBox.setText(String(res));
      resBox.setColor(ORANGE, ORANGE);
      yield S(() => { status.textContent = '第 ' + (i + 1) + ' 位（2^' + i + '）= 1 → 结果 × 底数 ' + base + ' = ' + res; });
      yield W(500);
      resBox.setColor(PUR, PUR);
    } else {
      yield S(() => { status.textContent = '第 ' + (i + 1) + ' 位（2^' + i + '）= 0 → 结果不变（2^' + Math.pow(2, i) + ' 跳过）'; });
      yield W(420);
    }
    base *= base;
    baseBox.setText(String(base));
    baseBox.setColor(ORANGE, ORANGE);
    yield S(() => { status.textContent = '底数平方：' + Math.sqrt(base) + '² = ' + base + '（为下一位准备 2^' + (2 * Math.pow(2, i)) + '）'; });
    yield W(420);
    baseBox.setColor(BLUE, BLUE);
    bitBoxes[i].setColor(b ? YELLOW : DIM, b ? YELLOW : DIM);
  }
  resBox.setColor(GREEN, GREEN);
  yield S(() => { status.textContent = '4 轮结束，结果 = ' + res + '：对比朴素连乘 13 次，快速幂只需 4 次平方 + 按位乘'; });
  yield W(1000);
  yield S(() => { status.textContent = '进阶：矩阵快速幂同法（平方+按位乘）—— 斐波那契、线性递推可做到 O(log n)'; });
  yield W(800);
}

function* runFP() {
  clearView();
  yield W(400);
  yield* fpGen();
  yield S(() => { status.textContent = '快速幂演示完成：2^13 = 8192，O(log 13) = 4 轮'; });
}

engine.queue(() => runFP());
panel.addButton('清空', () => { engine.clear(); clearView(); status.textContent = ''; });

scene.start(engine);
