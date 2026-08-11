// AlgorithmLibrary/PollardRho3D.js — Pollard-Rho 分解：f(x)=x²+1 驱动的随机游走里，兔子与乌龟在环上碰撞 —— gcd(|x−y|, n) 暴露因子
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('PollardRho3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, ROSE = 0xfb7185, CYAN = 0x67e8f9, VIOLET = 0xa78bfa, AMBER = 0xfbbf24;
const hint = new VText(scene, { text: '点击「运行 Pollard-Rho」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const N = 8051;
const f = x => (x * x + 1) % N;
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a; }
function pollardRho(n) {
  let x = 2, y = 2;
  const steps = [];
  for (let i = 0; i < 10; i++) {
    x = f(x); y = f(f(y));
    const g = gcd(x - y, n);
    steps.push({ x, y, g, found: g > 1 && g < n });
    if (g > 1 && g < n) break;
  }
  return steps;
}
const steps = pollardRho(N);

const nBox = new VBox(scene, { w: 150, h: 54, d: 54, x: -190, y: 170, z: 0, label: 'n = 8051', color: DIM, emissive: DIM });
const fT = new VText(scene, { text: '', x: 60, y: 170, z: 0, color: PALETTE.textDim, scale: 0.56 });
const chip = (x, y, w = 110) => new VBox(scene, { w, h: 44, d: 44, x, y, z: 0, label: '', color: DIM, emissive: DIM });
const xChips = steps.map((s, i) => chip(-160 + i * 110, 95));
const yChips = steps.map((s, i) => chip(-160 + i * 110, 40));
const gChips = steps.map((s, i) => chip(-160 + i * 110, -15));
new VText(scene, { text: '乌龟 x（走 1 步）', x: -285, y: 95, z: 0, color: VIOLET, scale: 0.42 });
new VText(scene, { text: '兔子 y（走 2 步）', x: -285, y: 40, z: 0, color: AMBER, scale: 0.42 });
new VText(scene, { text: 'gcd(|x−y|, n)', x: -285, y: -15, z: 0, color: PALETTE.textDim, scale: 0.42 });
new VText(scene, { text: 'Pollard-Rho：随机游走必入环（状态有限），环上的碰撞点让 |x−y| 与 n 共享因子 —— 兔龟赛跑抓公因子', x: 0, y: 225, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: 'f(x) = x² + 1 (mod n)；起点 x = y = 2。三行 = 乌龟轨迹 / 兔子轨迹 / 每步的 gcd —— 金色 = 抓到因子', x: 0, y: -205, z: 0, color: PALETTE.textDim, scale: 0.62 });
const stageT = new VText(scene, { text: '', x: 0, y: 255, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: 130, z: 0, color: PALETTE.textGlow, scale: 0.58 });
const outT = new VText(scene, { text: '', x: 0, y: -245, z: 0, color: PALETTE.textGlow, scale: 0.62 });

function setCell(obj, v, color) { obj.setText(String(v)); if (color) obj.setColor(color, color); }
function resetAll() {
  engine.clear();
  setCell(nBox, 'n = 8051', DIM);
  xChips.forEach(c => setCell(c, '', DIM));
  yChips.forEach(c => setCell(c, '', DIM));
  gChips.forEach(c => setCell(c, '', DIM));
  fT.setText(''); eqT.setText(''); stageT.setText(''); outT.setText('');
}

function runRho() {
  resetAll();
  fT.setText('f(x) = x² + 1 (mod 8051)', { color: PALETTE.textDim });
  hint.setText('直觉：8051 模 97 的世界很小，只有 97 个位置 —— 序列很快撞进同一个点，那里藏着的公因子就能被抓出来');
  C(600, () => {
    setCell(nBox, 'n = 8051', CYAN);
    eqT.setText('起点：x = y = 2（乌龟与兔子并肩出发）');
    stageT.setText('目标：分解 8051。让两条序列在同一函数 f 下赛跑 —— 兔子速度是乌龟的两倍');
    hint.setText('为什么两倍速？两条序列必在环上相遇，兔子从后方追上乌龟 —— 相遇点就是「碰撞」');
  });
  steps.forEach((s, i) => {
    C(650, () => {
      setCell(xChips[i], `x = ${s.x}`, VIOLET);
      setCell(yChips[i], `y = ${s.y}`, AMBER);
      eqT.setText(`第 ${i + 1} 步：x = f(x) = ${s.x}；y = f(f(y)) = ${s.y}`, { color: PALETTE.textGlow });
      stageT.setText(`乌龟走一步 ${s.x}，兔子走两步 ${s.y} —— 两者都在 f 的轨道上绕圈`);
      hint.setText(`f 的值永远在 0…${N - 1} 之间 —— 轨道必入环，入环后兔龟迟早重合`);
    });
    C(550, () => {
      setCell(gChips[i], `gcd = ${s.g}`, s.found ? GOLD : DIM);
      eqT.setText(`gcd(|${s.x} − ${s.y}|, 8051) = ${s.g}`, { color: s.found ? GOLD : PALETTE.textGlow });
      if (s.found) {
        stageT.setText(`gcd = ${s.g}：1 < ${s.g} < 8051 —— 抓到因子！兔子在环上追上了乌龟`);
        hint.setText(`|x−y| = ${Math.abs(s.x - s.y)} 同时被 97 整除 —— 两个序列模 97 重合，模 8051 差一个因子`);
      } else {
        stageT.setText(`gcd = ${s.g}：与 n 互素，没撞到 —— 继续绕圈`);
      }
    });
  });
  C(1000, () => {
    outT.setText(`8051 = ${steps[steps.length - 1].g} × ${N / steps[steps.length - 1].g} ✓ —— ${steps.length} 步抓到 97，剩 83 也是素数，分解完成`);
    status.textContent = `Pollard-Rho：8051 = 97 × 83（${steps.length} 步）`;
    hint.setText('为什么叫 ρ？序列从起点出发，走一段直线后入环，形状像希腊字母 ρ —— 碰撞就发生在环上');
  });
  C(1200, () => {
    outT.setText('复杂度 O(√p)（p = 最小素因子）。应用：RSA 小因子攻击、整数分解工具箱 —— 常与试除、ECM、二次筛配合');
    hint.setText('优化：Brent 变体省一次 f；先试除小素数再上 Rho —— 大整数分解的日常第一件武器');
  });
}

panel.addButton('运行 Pollard-Rho', runRho);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；紫色 = 乌龟轨迹，琥珀 = 兔子轨迹，金色 = 撞出的因子，三行对照看碰撞）');

scene.start(engine);
