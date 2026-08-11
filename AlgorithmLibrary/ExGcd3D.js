// AlgorithmLibrary/ExGcd3D.js — 扩展欧几里得：辗转相除求 gcd(48,18)，同时用正向递推解出 Bezout 系数 x、y（function* 生成器驱动）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('ExGcd3D');

const scene = new Scene3D('scene', { cameraPos: [0, 300, 640], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, CYAN = 0x67e8f9, AMBER = 0xfbbf24, ROSE = 0xfb7185;
const hint = new VText(scene, { text: '点击「运行演示」开始：扩展欧几里得', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');

// GA/GB 避开 GeneratorEngine 的导入名 A；预计算 3 步除法 + 正向递推表（每行是余数对 48、18 的组合系数）
const GA = 48, GB = 18;
const steps = [];
let a = GA, b = GB;
while (b !== 0) { const q = Math.floor(a / b), r = a % b; steps.push({ a, b, q, r }); a = b; b = r; }
const GCD = a;
const cs = [];
let x1 = 1, y1 = 0, x2 = 0, y2 = 1;
for (const s of steps) { const nx = x1 - s.q * x2, ny = y1 - s.q * y2; cs.push({ cx: nx, cy: ny }); x1 = x2; y1 = y2; x2 = nx; y2 = ny; }
const BX = x1, BY = y1;
const showBez = (c1, c2) => (c1 < 0 ? '−' : '') + Math.abs(c1) + '×' + GA + (c2 < 0 ? ' − ' : ' + ') + Math.abs(c2) + '×' + GB;

new VText(scene, { text: '普通欧几里得只求 gcd；扩展版每步还记录余数如何写成 48、18 的组合 → 递推表最后一行就是 x、y', x: 0, y: 225, z: 0, color: PALETTE.textDim, scale: 0.68 });
const stageT = new VText(scene, { text: '', x: 0, y: 255, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: 150, z: 0, color: PALETTE.textGlow, scale: 0.62 });
const gcdT = new VText(scene, { text: '', x: 0, y: -80, z: 0, color: GOLD, scale: 0.85 });
const backT = new VText(scene, { text: '', x: 0, y: -140, z: 0, color: PALETTE.textGlow, scale: 0.58 });
const outT = new VText(scene, { text: '', x: 0, y: -200, z: 0, color: PALETTE.textGlow, scale: 0.62 });

const mkBox = (x, color, label) => new VBox(scene, { w: 84, h: 56, d: 56, x, y: 30, z: 0, label, color, emissive: color });
const aBox = mkBox(-180, CYAN, 'a = ' + GA);
const bBox = mkBox(-60, CYAN, 'b = ' + GB);
const qBox = mkBox(60, AMBER, 'q = ?');
const rBox = mkBox(180, ROSE, 'r = ?');
['被除数 a', '除数 b', '商 q', '余 r'].forEach((t, c) => { new VText(scene, { text: t, x: -180 + c * 120, y: -15, z: 0, color: PALETTE.textDim, scale: 0.55 }); });

function resetAll() {
  aBox.setText('a = ' + GA); bBox.setText('b = ' + GB);
  qBox.setText('q = ?'); rBox.setText('r = ?');
  aBox.setColor(CYAN, CYAN); bBox.setColor(CYAN, CYAN);
  qBox.setColor(AMBER, AMBER); rBox.setColor(ROSE, ROSE);
  stageT.setText(''); eqT.setText(''); gcdT.setText(''); backT.setText(''); outT.setText('');
}

function* exgcdGen() {
  resetAll();
  yield S(() => hint.setText('扩展欧几里得：每步 a = q×b + r 缩小规模，同时把余数 r 表示为 48、18 的整数组合'));
  yield S(() => { stageT.setText('目标：解 x×48 + y×18 = gcd(48,18)。先走 3 步辗转相除'); });
  yield W(500);
  for (const [i, s] of steps.entries()) {
    yield S(() => {
      aBox.setText('a = ' + s.a); bBox.setText('b = ' + s.b);
      qBox.setText('q = ' + s.q); rBox.setText('r = ' + s.r);
      eqT.setText(s.a + ' = ' + s.q + '×' + s.b + ' + ' + s.r);
      backT.setText('余数 ' + s.r + ' = ' + showBez(cs[i].cx, cs[i].cy) + '（系数 ' + cs[i].cx + ', ' + cs[i].cy + '）');
      stageT.setText('第 ' + (i + 1) + ' 步：' + s.a + ' ÷ ' + s.b + ' = ' + s.q + ' 余 ' + s.r);
    });
    yield W(600);
  }
  yield S(() => {
    gcdT.setText('gcd(' + GA + ', ' + GB + ') = ' + GCD);
    stageT.setText('余数为 0，停止：最后的非零余数 ' + GCD + ' 即最大公约数');
  });
  yield W(600);
  yield S(() => {
    backT.setText('关键行：' + GCD + ' = ' + showBez(BX, BY) + ' —— 来自递推表，无需真的展开回代');
    stageT.setText('沿递推表找到 gcd 的系数：x = ' + BX + '，y = ' + BY);
  });
  yield W(600);
  yield S(() => {
    outT.setText('∴ ' + showBez(BX, BY) + ' = ' + GCD + ' ✓');
    status.textContent = '扩展欧几里得完成：x = ' + BX + ', y = ' + BY + '（' + showBez(BX, BY) + ' = ' + GCD + '）';
    hint.setText('递推表妙处：每一行都是「余数 = 48 与 18 的组合」，最后一行组合系数正是 x、y');
  });
  yield W(600);
  yield S(() => {
    outT.setText('应用：求模逆元（RSA 私钥）、线性丢番图方程、中国剩余定理。复杂度 O(log n)');
    hint.setText('Bezout 系数不唯一（可整体加减倍数），递推表给出的是最规范的一组');
  });
  yield W(700);
}

panel.addButton('运行演示', () => engine.start(exgcdGen()));
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；青 = a、b，琥珀 = 商 q，玫瑰 = 余数 r）');

scene.start(engine);
