// AlgorithmLibrary/NTT3D.js — 数论变换：FFT 的孪生兄弟，把复数 ω 换成模素数 p 的整数单位根 —— 无浮点误差，结果精确可逆（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('NTT3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155, ROSE = 0xfb7185, VIOLET = 0xa78bfa, AMBER = 0xfbbf24;
const hint = new VText(scene, { text: '点击「运行演示」开始：NTT 数论变换（模 998244353）', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 255, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: 105, z: 0, color: PALETTE.textGlow, scale: 0.52 });
const outT = new VText(scene, { text: '', x: 0, y: -245, z: 0, color: PALETTE.textGlow, scale: 0.62 });

const P = 998244353, G = 3, OM = 911660635;
const a = [1, 2, 3, 4];
const E = [4, -2], O = [6, -2];
const out = ['10', '173167434', '998244351', '825076915'];
const bt1 = ['X0 = 4 + 6 = 10', 'X2 = 4 − 6 ≡ 998244351（−2 mod p）'];
const bt2 = ['X1 = −2 + ω·(−2) ≡ 173167434', 'X3 = −2 − ω·(−2) ≡ 825076915'];

const box = (v, x, y, w = 92, color = DIM) => new VBox(scene, { w, h: 44, d: 44, x, y, z: 0, label: String(v), color, emissive: color });
const inBoxes = a.map((v, i) => box(v, -150 + i * 88, 160, 78));
const eBoxes = E.map((v, i) => box(v, -110 + i * 84, 55, 74));
const oBoxes = O.map((v, i) => box(v, -110 + i * 84, 10, 74));
const outBoxes = out.map((v, i) => box('', -150 + i * 88, -120, 78));
new VText(scene, { text: '输入 a', x: -330, y: 160, z: 0, color: CYAN, scale: 0.46 });
new VText(scene, { text: '偶部 2 点 NTT', x: -330, y: 55, z: 0, color: VIOLET, scale: 0.46 });
new VText(scene, { text: '奇部 2 点 NTT', x: -330, y: 10, z: 0, color: AMBER, scale: 0.46 });
new VText(scene, { text: '输出 X(k)', x: -330, y: -120, z: 0, color: GOLD, scale: 0.46 });
new VText(scene, { text: 'NTT：FFT 的整数版 —— ω 换成模 p 的 4 次单位根 911660635（= 3^((p−1)/4)），蝶形全在 mod 998244353 下做', x: 0, y: 225, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: '与 FFT 同构：偶/奇分治 → 蝶形合并，但每一步都是整数模算术 —— 零浮点误差，精确还原（FFT 的反例：1/3 无限循环）', x: 0, y: -205, z: 0, color: PALETTE.textDim, scale: 0.62 });

function setCell(obj, v, color) { obj.setText(String(v)); if (color) obj.setColor(color, color); }
function clearView() {
  a.forEach((v, i) => setCell(inBoxes[i], v, DIM));
  E.forEach((v, i) => setCell(eBoxes[i], '', DIM));
  O.forEach((v, i) => setCell(oBoxes[i], '', DIM));
  outBoxes.forEach(b => setCell(b, '', DIM));
  stageT.setText(''); eqT.setText(''); outT.setText('');
}

function* nttGen() {
  yield S(() => { hint.setText('问题：FFT 的复数运算有浮点误差，模算术里却能「精确」—— 找一个整数 ω 扮演 i：ω⁴ = 1 且 ω² = −1 (mod p)'); stageT.setText('输入 a = [1, 2, 3, 4]，工作世界 = 模 p = 998244353（p−1 被 4 整除的素数）'); });
  yield W(700);
  for (let i = 0; i < 4; i++) inBoxes[i].setColor(CYAN, CYAN);
  yield S(() => hint.setText('选 p = 119×2²³+1：3 是原根，g^((p−1)/4) 自动是 4 次单位根 —— 数学保证 ω 存在'));
  yield W(600);
  eqT.setText('ω = g^((p−1)/4) = 3^249561088 ≡ ' + OM + ' (mod p)', { color: GOLD });
  yield S(() => { stageT.setText('主角登场：ω = 911660635 —— 验证 ω⁴ = 1、ω² = −1，它就是整数世界里的「i」'); hint.setText('检查 ω²：911660635² mod p = 998244352 ≡ −1 —— 与 i² = −1 完全同构！'); });
  yield W(800);
  yield S(() => { stageT.setText('分治：偶部 [1,3]（紫）、奇部 [2,4]（琥珀）—— 结构上和 FFT 一模一样'); eqT.setText('X(k) = E(k²) + ω^k·O(k²)，X(k+2) = E(k²) − ω^k·O(k²)（都 mod p）', { color: PALETTE.textGlow }); });
  yield W(750);
  E.forEach((v, i) => setCell(eBoxes[i], v, VIOLET));
  eqT.setText('偶部 2 点 NTT：[1+3, 1−3] = [4, −2]（−2 ≡ p−2，先留着符号）', { color: VIOLET });
  yield S(() => stageT.setText('2 点变换 = 一次加减，整数无误差'));
  yield W(750);
  O.forEach((v, i) => setCell(oBoxes[i], v, AMBER));
  eqT.setText('奇部 2 点 NTT：[2+4, 2−4] = [6, −2]', { color: AMBER });
  yield S(() => stageT.setText('递归到底，每个 2 点块直接算完 —— 蝶形网络与 FFT 完全同构'));
  yield W(750);
  setCell(outBoxes[0], out[0], GOLD);
  setCell(outBoxes[2], out[2], GOLD);
  eqT.setText(bt1[0] + '；' + bt1[1], { color: GOLD });
  yield S(() => { stageT.setText('蝶形对 1：E0±O0（ω⁰ = 1，ω² = −1 让减号免费）—— 998244351 就是 −2 的模表示'); hint.setText('模算术的「负数」长这样：p−2 = 998244351 —— 输出里看到的都是 0…p−1 的整数'); });
  yield W(850);
  setCell(outBoxes[1], out[1], GOLD);
  setCell(outBoxes[3], out[3], GOLD);
  eqT.setText(bt2[0] + '；' + bt2[1], { color: GOLD });
  yield S(() => { stageT.setText('蝶形对 2：E1 ± ω·O1 —— 乘法换成模乘：ω·(−2) ≡ p − 2ω'); hint.setText('这里浮点 FFT 会引入误差，NTT 却是精确整数 —— 大数据/密码场景要的就是这份确定性'); });
  yield W(850);
  yield S(() => { outT.setText('NTT(a) = [10, 173167434, 998244351, 825076915] ✓ —— 每步精确，逆变换乘 p 的逆元即完美还原'); status.textContent = 'NTT：[1,2,3,4] → [10, 173167434, 998244351, 825076915]（mod 998244353）'; });
  yield W(1000);
  yield S(() => hint.setText('对比 FFT 的 [10, −2−2i, −2, −2+2i]：同构但无误差 —— 这就是竞赛/密码圈的默认卷积工具'));
  yield W(400);
  yield S(() => { hint.setText('NTT 完成：4 点变换得 [10, 173167434, 998244351, 825076915]'); outT.setText('复杂度 O(n log n)，乘法全部 mod p 整数运算。应用：模素数卷积、任意模数卷积（CRT 拆 3 个 NTT）、多项式密码学'); });
  yield W(1200);
  yield S(() => { hint.setText('家族：FWT 处理异或卷积，NTT 处理加法卷积，FFT 处理实数 —— 三分天下的卷积三兄弟'); outT.setText(''); });
  yield W(800);
}

function* runNTT() {
  clearView();
  hint.setText('NTT：整数世界里的 FFT');
  yield W(400);
  yield* nttGen();
}

panel.addButton('运行演示', () => engine.start(runNTT()));
panel.addButton('清空', () => { engine.clear(); clearView(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；青 = 输入，紫/琥珀 = 偶/奇部，金 = 模算术蝶形输出）');

scene.start(engine);
