// AlgorithmLibrary/Euclidean3D.js — 欧几里得算法：gcd(a,b) = gcd(b, a mod b)，反复除到余数 0 —— 最后一次非零余数就是最大公约数
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Euclidean3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, ROSE = 0xfb7185, CYAN = 0x67e8f9, VIOLET = 0xa78bfa, AMBER = 0xfbbf24;
const hint = new VText(scene, { text: '点击「运行欧几里得」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const A0 = 252, B0 = 105;
function euclid(a, b) {
  const steps = [];
  while (b > 0) { const q = Math.floor(a / b), r = a % b; steps.push({ a, b, q, r }); a = b; b = r; }
  return { gcd: a, steps };
}
const { gcd, steps } = euclid(A0, B0);

const SCALE = 1.15;
const barA = new VBox(scene, { w: A0 * SCALE, h: 40, d: 40, x: 40, y: 165, z: 0, label: '252', color: VIOLET, emissive: VIOLET });
const barB = new VBox(scene, { w: B0 * SCALE, h: 40, d: 40, x: 40, y: 110, z: 0, label: '105', color: AMBER, emissive: AMBER });
new VText(scene, { text: 'a = 252', x: -240, y: 165, z: 0, color: VIOLET, scale: 0.5 });
new VText(scene, { text: 'b = 105', x: -240, y: 110, z: 0, color: AMBER, scale: 0.5 });
new VText(scene, { text: '欧几里得：gcd(a,b) = gcd(b, a mod b) —— 每次把大数换成「除以小数的余数」，余数严格变小，直到 0', x: 0, y: 225, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: '两条色带 = 252 与 105 的长度。每轮：琥珀段 = 整数倍（整段减去），玫瑰 = 余数（留下的部分）—— 最后剩的玫瑰就是 gcd', x: 0, y: -205, z: 0, color: PALETTE.textDim, scale: 0.62 });
const stageT = new VText(scene, { text: '', x: 0, y: 255, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: 55, z: 0, color: PALETTE.textGlow, scale: 0.58 });
const outT = new VText(scene, { text: '', x: 0, y: -245, z: 0, color: PALETTE.textGlow, scale: 0.62 });
const gcdBox = new VBox(scene, { w: 90, h: 44, d: 44, x: 0, y: -20, z: 0, label: '', color: DIM, emissive: DIM });

const tempBoxes = [];
function addTemp(o) { tempBoxes.push(o); return o; }
function clearTemp() { tempBoxes.forEach(o => { try { o.remove(); } catch (e) {} }); tempBoxes.length = 0; }
function rebuild(a, b) {
  clearTemp();
  const q = Math.floor(a / b), r = a % b;
  const segW = b * SCALE;
  const qSeg = addTemp(new VBox(scene, { w: segW - 4, h: 36, d: 36, x: 40 + segW / 2, y: 15, z: 0, label: `${q}×${b}`, color: AMBER, emissive: AMBER }));
  if (r > 0) {
    const rSeg = addTemp(new VBox(scene, { w: r * SCALE - 4, h: 36, d: 36, x: 40 + segW + r * SCALE / 2, y: 15, z: 0, label: `余 ${r}`, color: ROSE, emissive: ROSE }));
    return { qSeg, rSeg };
  }
  return { qSeg };
}

function setCell(obj, v, color) { obj.setText(String(v)); if (color) obj.setColor(color, color); }
function resetAll() {
  engine.clear();
  clearTemp();
  setCell(barA, '252', VIOLET); setCell(barB, '105', AMBER);
  setCell(gcdBox, '', DIM);
  stageT.setText(''); eqT.setText(''); outT.setText('');
}

function runEuclid() {
  resetAll();
  hint.setText('直觉：两根木条。把长条对折进短条里，多出来的那截就是余数 —— 用余数当新短条，反复对折，最后剩的就是公度量');
  steps.forEach((s, t) => {
    C(650, () => {
      setCell(barA, String(s.a), VIOLET);
      setCell(barB, String(s.b), AMBER);
      eqT.setText(`${s.a} = ${s.q} × ${s.b} + ${s.r}`, { color: PALETTE.textGlow });
      stageT.setText(`第 ${t + 1} 轮：${s.a} ÷ ${s.b} —— 商 ${s.q}，余数 ${s.r}`);
      hint.setText('余数定理：余数严格小于除数 —— 序列必在有限步内逼近 0，这正是「终止性」');
    });
    C(800, () => {
      const { qSeg, rSeg } = rebuild(s.a, s.b);
      if (rSeg) {
        stageT.setText(`琥珀段 = ${s.q} × ${s.b}（整段减掉），玫瑰段 = 余数 ${s.r} —— 下一轮就比玫瑰的尺寸`);
        hint.setText('关键观察：gcd(a, b) = gcd(b, r) —— 玫瑰段的长度和原两段的公因子完全一致，只是变小了');
      } else {
        stageT.setText(`余数 = 0！${s.b} 整倍数地装进了 ${s.a} —— 它就是最大公约数`);
      }
    });
  });
  C(900, () => {
    setCell(gcdBox, `gcd = ${gcd}`, GOLD);
    gcdBox.setColor(GOLD, GOLD);
    outT.setText(`gcd(252, 105) = ${gcd} ✓ —— ${steps.length} 轮就收敛：21 同时整除 252 与 105（252 = 12×21，105 = 5×21）`);
    status.textContent = `欧几里得：gcd(252, 105) = 21（${steps.length} 轮）`;
    hint.setText('为什么每次都变小？余数 r < b，而 gcd(a,b) = gcd(b,r) —— 问题规模单调下降，算法必停');
  });
  C(1200, () => {
    outT.setText(`贝祖：${gcd} = 5×105 − 2×252（扩展欧几里得求系数）。复杂度 O(log min(a,b))，斐波那契数列是最坏情况`);
    hint.setText('扩展版用途：模逆元（RSA 密钥生成、中国剩余定理）—— 欧几里得是数论的「减法之王」');
  });
}

panel.addButton('运行欧几里得', runEuclid);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；紫 = a 条，琥珀 = b 条，琥珀段 = 整倍数，玫瑰 = 余数，金色 = gcd）');

scene.start(engine);
