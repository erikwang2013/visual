// AlgorithmLibrary/FFT3D.js — 快速傅里叶变换：分治 + 蝶形运算 —— 多项式求值从 O(n²) 压到 O(n log n)，ω 的对称性让「一半计算」变「零计算」（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('FFT3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155, ROSE = 0xfb7185, VIOLET = 0xa78bfa, AMBER = 0xfbbf24;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：FFT 4 点变换', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 700, y: 440, z: 0, color: GOLD, scale: 0.5, wrapChars: 8 });
const eqT = new VText(scene, { text: '', x: 700, y: 345, z: 0, color: PALETTE.textGlow, scale: 0.45, wrapChars: 8 });
const outT = new VText(scene, { text: '', x: 700, y: 345, z: 0, color: PALETTE.textGlow, scale: 0.45, wrapChars: 8 });

const a = [1, 2, 3, 4];
const E = [4, -2], O = [6, -2];
const out = ['10', '−2−2i', '−2', '−2+2i'];
const bt1 = ['X0 = E0 + O0 = 4 + 6 = 10', 'X2 = E0 − O0 = 4 − 6 = −2'];
const bt2 = ['X1 = E1 + i·O1 = −2 + i·(−2) = −2−2i', 'X3 = E1 − i·O1 = −2 − i·(−2) = −2+2i'];

const box = (v, x, y, w = 80, color = DIM) => new VBox(scene, { w, h: 44, d: 44, x, y, z: 0, label: String(v), color, emissive: color });
const inBoxes = a.map((v, i) => box(v, -150 + i * 85 + 320, 450, 74));
const eBoxes = E.map((v, i) => box(v, -110 + i * 80 + 320, 340, 70));
const oBoxes = O.map((v, i) => box(v, -110 + i * 80 + 320, 290, 70));
const outBoxes = out.map((v, i) => box('', -150 + i * 85 + 320, 225, 74));
new VText(scene, { text: '输入 a', x: 10, y: 450, z: 0, color: CYAN, scale: 0.46 });
new VText(scene, { text: '偶部 2 点 FFT', x: 10, y: 340, z: 0, color: VIOLET, scale: 0.46 });
new VText(scene, { text: '奇部 2 点 FFT', x: 10, y: 290, z: 0, color: AMBER, scale: 0.46 });
new VText(scene, { text: '输出 X(k)', x: 10, y: 225, z: 0, color: GOLD, scale: 0.46 });
new VText(scene, { text: 'FFT：4 点 → 偶/奇两部 → 蝶形合并；ω = i 的幂定加/减', x: 700, y: 490, z: 0, color: PALETTE.textDim, scale: 0.4, wrapChars: 10 });

function setCell(obj, v, color) { obj.setText(String(v)); if (color) obj.setColor(color, color); }
function clearView() {
  a.forEach((v, i) => setCell(inBoxes[i], v, DIM));
  E.forEach((v, i) => setCell(eBoxes[i], '', DIM));
  O.forEach((v, i) => setCell(oBoxes[i], '', DIM));
  outBoxes.forEach(b => setCell(b, '', DIM));
  stageT.setText(''); eqT.setText(''); outT.setText('');
}

function* fftGen() {
  yield S(() => { hint.setText('朴素 O(n²)；FFT 戏法：ω^(k+n/2) = −ω^k 对称性'); stageT.setText('输入 a=[1,2,3,4]（n=4）：求 ω⁰..ω³ 上的值'); });
  yield W(700);
  for (let i = 0; i < 4; i++) inBoxes[i].setColor(CYAN, CYAN);
  yield S(() => hint.setText('X(k)=Σa_j·ω^(jk)：直接算 16 次乘法；ω 对称性可省一半'));
  yield W(600);
  yield S(() => { stageT.setText('分治：偶部 a0,a2=[1,3]，奇部 a1,a3=[2,4]'); eqT.setText('X(k)=E(k²)+ω^k·O(k²)，X(k+2)=E(k²)−ω^k·O(k²)'); });
  yield W(750);
  yield S(() => hint.setText('两个「半个」FFT 拼整个：一半加 ω^k 倍、一半减'));
  yield W(300);
  E.forEach((v, i) => setCell(eBoxes[i], v, VIOLET));
  eqT.setText('偶部 2 点 FFT：[1+3,1−3]=[4,−2]');
  yield S(() => stageT.setText('2 点 FFT = 一次加减：4 与 −2'));
  yield W(750);
  O.forEach((v, i) => setCell(oBoxes[i], v, AMBER));
  eqT.setText('奇部 2 点 FFT：[2+4,2−4]=[6,−2]');
  yield S(() => stageT.setText('同款：6 与 −2；递归到底直接算'));
  yield W(750);
  setCell(outBoxes[0], out[0], GOLD);
  setCell(outBoxes[2], out[2], GOLD);
  eqT.setText(bt1[0] + '；' + bt1[1]);
  yield S(() => { stageT.setText('蝶形对 1：ω⁰=1 → X0=E0+O0，X2=E0−O0'); hint.setText('ω²=−1：X2/X0 共用一次计算 ——「一半变零」出处'); });
  yield W(800);
  setCell(outBoxes[1], out[1], GOLD);
  setCell(outBoxes[3], out[3], GOLD);
  eqT.setText(bt2[0] + '；' + bt2[1]);
  yield S(() => { stageT.setText('蝶形对 2：ω¹=i → X1=E1+i·O1，X3=E1−i·O1'); hint.setText('i²=−1：乘一次 i 加出 X1 减出 X3 —— 一蝶两果'); });
  yield W(800);
  yield S(() => { eqT.setText(''); outT.setText('FFT(a) = [10,−2−2i,−2,−2+2i] ✓（4 蝶 8 乘加）'); status.textContent = 'FFT：[1,2,3,4] → [10, −2−2i, −2, −2+2i]（蝶形 4 个，乘法减半）'; });
  yield W(1000);
  yield S(() => hint.setText('验证：X(0)=1+2+3+4=10；逆变换 ×1/n 再 FFT 还原'));
  yield W(400);
  yield S(() => { hint.setText('FFT 完成：4 点变换得 [10,−2−2i,−2,−2+2i]'); eqT.setText(''); outT.setText('复杂度 O(n log n)。应用：卷积/频谱/大整数乘法'); });
  yield W(1200);
  yield S(() => { hint.setText('卷积：两边 FFT → 逐点乘 → 逆 FFT：O(n log n) 顶替 O(n²)'); outT.setText(''); });
  yield W(800);
}

function* runFFT() {
  clearView();
  hint.setText('FFT：分治 + 蝶形合并');
  yield W(400);
  yield* fftGen();
}

engine.queue(() => runFFT());
panel.addButton('清空', () => { engine.clear(); clearView(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；青 = 输入，紫/琥珀 = 偶/奇部，金 = 蝶形合并输出）');

scene.start(engine);
