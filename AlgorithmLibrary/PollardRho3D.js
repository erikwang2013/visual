// AlgorithmLibrary/PollardRho3D.js — Pollard-Rho 分解：f(x)=x²+1 驱动的随机游走里，兔子与乌龟在环上碰撞 —— gcd(|x−y|, n) 暴露因子（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('PollardRho3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「运行演示」开始：Pollard-Rho 分解 8051 = 97 × 83', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 262, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: 130, z: 0, color: PALETTE.textGlow, scale: 0.58 });
const outT = new VText(scene, { text: '', x: 0, y: -245, z: 0, color: PALETTE.textGlow, scale: 0.62 });

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

const nBox = new VBox(scene, { w: 150, h: 54, d: 54, x: -190, y: 170, z: 0, label: 'n = 8051', color: DIM, emissive: DIM });
const fT = new VText(scene, { text: 'f(x) = x² + 1 (mod 8051)', x: 60, y: 170, z: 0, color: PALETTE.textDim, scale: 0.52 });
const chip = (x, y, w = 110) => new VBox(scene, { w, h: 44, d: 44, x, y, z: 0, label: '', color: DIM, emissive: DIM });
const xChips = steps.map((s, i) => chip(-160 + i * 110, 95));
const yChips = steps.map((s, i) => chip(-160 + i * 110, 40));
const gChips = steps.map((s, i) => chip(-160 + i * 110, -15));
new VText(scene, { text: '乌龟 x（走 1 步）', x: -285, y: 95, z: 0, color: PUR, scale: 0.42 });
new VText(scene, { text: '兔子 y（走 2 步）', x: -285, y: 40, z: 0, color: ORANGE, scale: 0.42 });
new VText(scene, { text: 'gcd(|x−y|, n)', x: -285, y: -15, z: 0, color: PALETTE.textDim, scale: 0.42 });

function setCell(obj, v, color) { obj.setText(String(v)); if (color) obj.setColor(color, color); }

function* rhoGen() {
  yield S(() => { hint.setText('Pollard-Rho：随机游走必入环（状态有限），环上的碰撞点让 |x−y| 与 n 共享因子 —— 兔龟赛跑抓公因子'); stageT.setText('目标：分解 8051。乌龟 x 走 1 步、兔子 y 走 2 步，同跑在 f 的轨道上'); });
  yield W(700);
  setCell(nBox, 'n = 8051', CYAN);
  yield S(() => { stageT.setText('起点：x = y = 2（乌龟与兔子并肩出发）'); eqT.setText('f(x) = x² + 1 (mod 8051)，两倍速让兔子在环上追上乌龟'); });
  yield W(600);
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    setCell(xChips[i], 'x = ' + s.x, PUR);
    setCell(yChips[i], 'y = ' + s.y, ORANGE);
    yield S(() => { stageT.setText('第 ' + (i + 1) + ' 步：乌龟走一步 → x = ' + s.x + '；兔子走两步 → y = ' + s.y); eqT.setText('x = f(x) = ' + s.x + '，y = f(f(y)) = ' + s.y + ' —— 两者都在 f 的轨道上绕圈'); });
    yield W(600);
    setCell(gChips[i], 'gcd = ' + s.g, s.found ? GOLD : DIM);
    if (s.found) {
      yield S(() => { stageT.setText('gcd = ' + s.g + '：1 < ' + s.g + ' < 8051 —— 抓到因子！兔子在环上追上了乌龟'); eqT.setText('|x−y| = ' + Math.abs(s.x - s.y) + ' 同时被 ' + s.g + ' 整除 —— 两序列模 ' + s.g + ' 重合，模 8051 差一个因子'); });
      setCell(xChips[i], 'x = ' + s.x, GOLD);
      setCell(yChips[i], 'y = ' + s.y, GOLD);
    } else {
      yield S(() => { stageT.setText('gcd = ' + s.g + '：与 n 互素，没撞到 —— 继续绕圈'); eqT.setText('gcd(|' + s.x + ' − ' + s.y + '|, 8051) = ' + s.g); });
    }
    yield W(650);
  }
  const last = steps[steps.length - 1];
  yield S(() => { outT.setText('8051 = ' + last.g + ' × ' + (N / last.g) + ' ✓ —— ' + steps.length + ' 步抓到 ' + last.g + '，剩 ' + (N / last.g) + ' 也是素数，分解完成'); status.textContent = 'Pollard-Rho：8051 = ' + last.g + ' × ' + (N / last.g) + '（' + steps.length + ' 步）'; hint.setText('为什么叫 ρ？序列从起点出发，走一段直线后入环，形状像希腊字母 ρ —— 碰撞就发生在环上'); });
  yield W(1100);
  yield S(() => { hint.setText('复杂度 O(√p)（p = 最小素因子）。应用：RSA 小因子攻击、整数分解工具箱 —— 常与试除、ECM、二次筛配合'); outT.setText('优化：Brent 变体省一次 f；先试除小素数再上 Rho —— 大整数分解的日常第一件武器'); });
  yield W(1100);
  yield S(() => { hint.setText('Pollard-Rho 演示完成：8051 = 97 × 83，兔龟在环上碰撞得因子'); outT.setText(''); });
  yield W(400);
}

function* runRho() {
  hint.setText('Pollard-Rho：兔龟赛跑');
  yield W(400);
  yield* rhoGen();
}

panel.addButton('运行演示', () => engine.start(runRho()));
panel.addButton('清空', () => { engine.clear(); stageT.setText(''); eqT.setText(''); outT.setText(''); setCell(nBox, 'n = 8051', DIM); xChips.forEach(c => setCell(c, '', DIM)); yChips.forEach(c => setCell(c, '', DIM)); gChips.forEach(c => setCell(c, '', DIM)); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；紫 = 乌龟轨迹，橙 = 兔子轨迹，金 = 撞出的因子；三行对照看兔龟如何靠拢）');

scene.start(engine);
