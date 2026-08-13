// AlgorithmLibrary/PollardRho3D.js — Pollard-Rho 分解：f(x)=x²+1 驱动的随机游走里，兔子与乌龟在环上碰撞 —— gcd(|x−y|, n) 暴露因子（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('PollardRho3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：Pollard-Rho 分解 8051 = 97 × 83', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 700, y: 440, z: 0, color: GOLD, scale: 0.5, wrapChars: 8 });
const eqT = new VText(scene, { text: '', x: 700, y: 345, z: 0, color: PALETTE.textGlow, scale: 0.45, wrapChars: 8 });
const outT = new VText(scene, { text: '', x: 700, y: 345, z: 0, color: PALETTE.textGlow, scale: 0.45, wrapChars: 8 });

const N = 8051;
const f = x => (x * x + 1) % N;
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { const t = a % b; a = b; b = t; } return a; }
function pollardRho(n) {
  let x = 2, y = 2;
  const steps = [];
  for (let i = 0; i < 12; i++) {
    x = f(x); y = f(f(y));
    const g = gcd(x - y, n);
    steps.push({ x, y, g, found: g > 1 && g < n });
    if (g > 1 && g < n) break;
  }
  return steps;
}
const steps = pollardRho(N);

const nBox = new VBox(scene, { w: 150, h: 54, d: 54, x: 130, y: 430, z: 0, label: 'n = 8051', color: DIM, emissive: DIM });
const fT = new VText(scene, { text: 'f(x) = x² + 1 (mod 8051)', x: 700, y: 490, z: 0, color: PALETTE.textDim, scale: 0.4, wrapChars: 10 });
const chip = (x, y, w = 110) => new VBox(scene, { w, h: 44, d: 44, x, y, z: 0, label: '', color: DIM, emissive: DIM });
const xChips = steps.map((s, i) => chip(160 + i * 110, 355));
const yChips = steps.map((s, i) => chip(160 + i * 110, 300));
const gChips = steps.map((s, i) => chip(160 + i * 110, 245));
new VText(scene, { text: '三行对照：紫=x 轨迹 · 橙=y 轨迹 · 金=gcd 撞出', x: 700, y: 395, z: 0, color: PALETTE.textDim, scale: 0.4, wrapChars: 10 });

function setCell(obj, v, color) { obj.setText(String(v)); if (color) obj.setColor(color, color); }

function* rhoGen() {
  yield S(() => { hint.setText('Pollard-Rho：随机游走必入环，兔龟赛跑抓公因子'); stageT.setText('目标：分解 8051，乌龟走 1 步、兔子走 2 步'); });
  yield W(700);
  setCell(nBox, 'n = 8051', CYAN);
  yield S(() => { stageT.setText('起点：x = y = 2，兔龟并肩出发'); eqT.setText('兔子两倍速，在环上追上乌龟'); });
  yield W(600);
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    setCell(xChips[i], 'x = ' + s.x, PUR);
    setCell(yChips[i], 'y = ' + s.y, ORANGE);
    yield S(() => { stageT.setText('第 ' + (i + 1) + ' 步：x = ' + s.x + '，y = ' + s.y); eqT.setText('x = ' + s.x + '，y = ' + s.y + ' —— 都在 f 轨道上绕圈'); });
    yield W(600);
    setCell(gChips[i], 'gcd = ' + s.g, s.found ? GOLD : DIM);
    if (s.found) {
      yield S(() => { stageT.setText('gcd = ' + s.g + ' 抓到因子：兔子追上乌龟'); eqT.setText('|x−y| = ' + Math.abs(s.x - s.y) + '，gcd = ' + s.g + '（1 < gcd < n）'); });
      setCell(xChips[i], 'x = ' + s.x, GOLD);
      setCell(yChips[i], 'y = ' + s.y, GOLD);
    } else {
      yield S(() => { stageT.setText('gcd = ' + s.g + ' 与 n 互素，继续绕圈'); eqT.setText('gcd(|x−y|, 8051) = ' + s.g); });
    }
    yield W(650);
  }
  const last = steps[steps.length - 1];
  yield S(() => { eqT.setText(''); outT.setText('8051 = ' + last.g + ' × ' + (N / last.g) + ' ✓，' + steps.length + ' 步完成'); status.textContent = 'Pollard-Rho：8051 = ' + last.g + ' × ' + (N / last.g) + '（' + steps.length + ' 步）'; hint.setText('为什么叫 ρ？序列入环的轨迹形似希腊字母 ρ'); });
  yield W(1100);
  yield S(() => { hint.setText('复杂度 O(√p)。应用：RSA 小因子攻击、整数分解'); outT.setText('优化：Brent 变体省一次 f；先试除小素数再上 Rho'); });
  yield W(1100);
  yield S(() => { hint.setText('Pollard-Rho 完成：8051 = 97 × 83'); outT.setText(''); });
  yield W(400);
}

function* runRho() {
  hint.setText('Pollard-Rho：兔龟赛跑');
  yield W(400);
  yield* rhoGen();
}

engine.queue(() => runRho());
panel.addButton('清空', () => { engine.clear(); stageT.setText(''); eqT.setText(''); outT.setText(''); setCell(nBox, 'n = 8051', DIM); xChips.forEach(c => setCell(c, '', DIM)); yChips.forEach(c => setCell(c, '', DIM)); gChips.forEach(c => setCell(c, '', DIM)); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；紫 = 乌龟轨迹，橙 = 兔子轨迹，金 = 撞出的因子；三行对照看兔龟如何靠拢）');

scene.start(engine);
