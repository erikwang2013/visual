// AlgorithmLibrary/NTT3D.js — 数论变换：FFT 的孪生兄弟，把复数 ω 换成模素数 p 的整数单位根 —— 无浮点误差，结果精确可逆（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('NTT3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155, ROSE = 0xfb7185, VIOLET = 0xa78bfa, AMBER = 0xfbbf24;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：NTT 数论变换（模 998244353）', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 700, y: 440, z: 0, color: GOLD, scale: 0.5, wrapChars: 8 });
const eqT = new VText(scene, { text: '', x: 700, y: 345, z: 0, color: PALETTE.textGlow, scale: 0.45, wrapChars: 10 });
const outT = new VText(scene, { text: '', x: 700, y: 345, z: 0, color: PALETTE.textGlow, scale: 0.45, wrapChars: 10 });

const P = 998244353, G = 3, OM = 911660635;
const a = [1, 2, 3, 4];
const E = [4, -2], O = [6, -2];
const out = ['10', '173167434', '998244351', '825076915'];
const bt1 = ['X0 = 4 + 6 = 10', 'X2 = 4 − 6 ≡ 998244351'];
const bt2 = ['X1 ≡ 173167434', 'X3 ≡ 825076915'];

const box = (v, x, y, w = 92, color = DIM) => new VBox(scene, { w, h: 44, d: 44, x, y, z: 0, label: String(v), color, emissive: color });
const inBoxes = a.map((v, i) => box(v, 170 + i * 88, 450, 78));
const eBoxes = E.map((v, i) => box(v, 210 + i * 84, 350, 74));
const oBoxes = O.map((v, i) => box(v, 210 + i * 84, 305, 74));
const outBoxes = out.map((v, i) => box('', 170 + i * 88, 240, 78));
new VText(scene, { text: '输入 a', x: 40, y: 450, z: 0, color: CYAN, scale: 0.46 });
new VText(scene, { text: '偶部 2 点 NTT', x: 40, y: 350, z: 0, color: VIOLET, scale: 0.46 });
new VText(scene, { text: '奇部 2 点 NTT', x: 40, y: 305, z: 0, color: AMBER, scale: 0.46 });
new VText(scene, { text: '输出 X(k)', x: 40, y: 240, z: 0, color: GOLD, scale: 0.46 });
new VText(scene, { text: 'NTT = FFT 的整数版：ω 换模 p 的 4 次单位根', x: 700, y: 510, z: 0, color: PALETTE.textDim, scale: 0.4, wrapChars: 10 });
new VText(scene, { text: '每步整数模算术 —— 零浮点误差', x: 700, y: 300, z: 0, color: PALETTE.textDim, scale: 0.4, wrapChars: 10 });

function setCell(obj, v, color) { obj.setText(String(v)); if (color) obj.setColor(color, color); }
function clearView() {
  a.forEach((v, i) => setCell(inBoxes[i], v, DIM));
  E.forEach((v, i) => setCell(eBoxes[i], '', DIM));
  O.forEach((v, i) => setCell(oBoxes[i], '', DIM));
  outBoxes.forEach(b => setCell(b, '', DIM));
  stageT.setText(''); eqT.setText(''); outT.setText('');
}

function* nttGen() {
  yield S(() => { hint.setText('FFT 有浮点误差；找整数 ω 扮演 i：ω⁴=1、ω²=−1'); stageT.setText('输入 [1,2,3,4]，模 p = 998244353'); });
  yield W(700);
  for (let i = 0; i < 4; i++) inBoxes[i].setColor(CYAN, CYAN);
  yield S(() => hint.setText('p = 119×2²³+1，3 是原根 —— 数学保证 ω 存在'));
  yield W(600);
  eqT.setText('ω = g^((p−1)/4) = 3^249561088 ≡ ' + OM + ' (mod p)', { color: GOLD });
  yield S(() => { stageT.setText('验证 ω⁴ = 1、ω² = −1 —— 整数世界的「i」'); hint.setText('检查 ω² ≡ −1 (mod p) —— 与 i² = −1 同构！'); });
  yield W(800);
  yield S(() => { stageT.setText('分治：偶部 [1,3]（紫）、奇部 [2,4]（琥珀）'); eqT.setText('X(k) = E + ω^k·O；X(k+2) = E − ω^k·O', { color: PALETTE.textGlow }); });
  yield W(750);
  E.forEach((v, i) => setCell(eBoxes[i], v, VIOLET));
  eqT.setText('偶部：[1+3, 1−3] = [4, −2]', { color: VIOLET });
  yield S(() => stageT.setText('2 点变换 = 一次加减，整数无误差'));
  yield W(750);
  O.forEach((v, i) => setCell(oBoxes[i], v, AMBER));
  eqT.setText('奇部：[2+4, 2−4] = [6, −2]', { color: AMBER });
  yield S(() => stageT.setText('递归到底，每个 2 点块直接算完 —— 蝶形网络与 FFT 完全同构'));
  yield W(750);
  setCell(outBoxes[0], out[0], GOLD);
  setCell(outBoxes[2], out[2], GOLD);
  eqT.setText(bt1[0] + '；' + bt1[1], { color: GOLD });
  yield S(() => { stageT.setText('蝶形对 1：E0±O0，998244351 就是 −2 的模表示'); hint.setText('模算术的「负数」：p−2 = 998244351'); });
  yield W(850);
  setCell(outBoxes[1], out[1], GOLD);
  setCell(outBoxes[3], out[3], GOLD);
  eqT.setText(bt2[0] + '；' + bt2[1], { color: GOLD });
  yield S(() => { stageT.setText('蝶形对 2：E1 ± ω·O1 —— 乘法换成模乘'); hint.setText('浮点 FFT 有误差，NTT 是精确整数 —— 密码场景要的确定性'); });
  yield W(850);
  yield S(() => { eqT.setText(''); outT.setText('NTT(a) = [10, 173167434, 998244351, 825076915] ✓'); status.textContent = 'NTT：[1,2,3,4] → [10, 173167434, 998244351, 825076915]（mod 998244353）'; });
  yield W(1000);
  yield S(() => hint.setText('对比 FFT [10, −2−2i, −2, −2+2i]：同构但无误差'));
  yield W(400);
  yield S(() => { hint.setText('NTT 完成：4 点变换成功'); outT.setText('复杂度 O(n log n)。应用：模素数卷积、多项式密码学'); });
  yield W(1200);
  yield S(() => { hint.setText('家族：FWT 异或卷积、NTT 加法卷积、FFT 实数'); outT.setText(''); });
  yield W(800);
}

function* runNTT() {
  clearView();
  hint.setText('NTT：整数世界里的 FFT');
  yield W(400);
  yield* nttGen();
}

engine.queue(() => runNTT());
panel.addButton('清空', () => { engine.clear(); clearView(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；青 = 输入，紫/琥珀 = 偶/奇部，金 = 模算术蝶形输出）');

scene.start(engine);
