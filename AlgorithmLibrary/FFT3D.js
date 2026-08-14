// AlgorithmLibrary/FFT3D.js — 快速傅里叶变换：分治 + 蝶形运算 —— 多项式求值从 O(n²) 压到 O(n log n)，ω 的对称性让「一半计算」变「零计算」（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
applyTheme('FFT3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155, ROSE = 0xfb7185, VIOLET = 0xa78bfa, AMBER = 0xfbbf24;
const status = panel.addStatus('就绪');

const a = [1, 2, 3, 4];
const E = [4, -2], O = [6, -2];
const out = ['10', '−2−2i', '−2', '−2+2i'];
const bt1 = ['X0 = E0 + O0 = 4 + 6 = 10', 'X2 = E0 − O0 = 4 − 6 = −2'];
const bt2 = ['X1 = E1 + i·O1 = −2 + i·(−2) = −2−2i', 'X3 = E1 − i·O1 = −2 − i·(−2) = −2+2i'];

const box = (v, x, y, w = 80, color = DIM) => new VBox(scene, { w, h: 44, d: 44, x, y, z: 0, label: String(v), color, emissive: color });
const inBoxes = a.map((v, i) => box(v, -150 + i * 85 + 320, 500, 74));
const eBoxes = E.map((v, i) => box(v, -110 + i * 80 + 320, 440, 70));
const oBoxes = O.map((v, i) => box(v, -110 + i * 80 + 320, 380, 70));
const outBoxes = out.map((v, i) => box('', -150 + i * 85 + 320, 320, 74));

function setCell(obj, v, color) { obj.setText(String(v)); if (color) obj.setColor(color, color); }
function clearView() {
  a.forEach((v, i) => setCell(inBoxes[i], v, DIM));
  E.forEach((v, i) => setCell(eBoxes[i], '', DIM));
  O.forEach((v, i) => setCell(oBoxes[i], '', DIM));
  outBoxes.forEach(b => setCell(b, '', DIM));
}

function* fftGen() {
  yield S(() => { status.textContent = 'FFT 4 点变换：输入 a=[1,2,3,4]（n=4），求 ω⁰..ω³ 上的值。朴素 X(k)=Σa_j·ω^(jk) 要 16 次乘法，ω^(k+n/2)=−ω^k 对称性可省一半'; });
  yield W(700);
  for (let i = 0; i < 4; i++) inBoxes[i].setColor(CYAN, CYAN);
  yield S(() => { status.textContent = '分治：偶部 a0,a2=[1,3]，奇部 a1,a3=[2,4]。X(k)=E(k)+ω^k·O(k)，X(k+2)=E(k)−ω^k·O(k)'; });
  yield W(750);
  E.forEach((v, i) => setCell(eBoxes[i], v, VIOLET));
  yield S(() => { status.textContent = '偶部 2 点 FFT：[1+3,1−3]=[4,−2] —— 2 点 FFT 就是一次加减'; });
  yield W(750);
  O.forEach((v, i) => setCell(oBoxes[i], v, AMBER));
  yield S(() => { status.textContent = '奇部 2 点 FFT：[2+4,2−4]=[6,−2]，同款加减；递归到底直接算'; });
  yield W(750);
  setCell(outBoxes[0], out[0], GOLD);
  setCell(outBoxes[2], out[2], GOLD);
  yield S(() => { status.textContent = '蝶形对 1：ω⁰=1 → ' + bt1[0] + '；' + bt1[1] + '。ω²=−1，X2 与 X0 共用一次计算'; });
  yield W(800);
  setCell(outBoxes[1], out[1], GOLD);
  setCell(outBoxes[3], out[3], GOLD);
  yield S(() => { status.textContent = '蝶形对 2：ω¹=i → ' + bt2[0] + '；' + bt2[1] + '。i²=−1，乘一次 i 加出 X1、减出 X3'; });
  yield W(800);
  yield S(() => { status.textContent = 'FFT(a) = [10, −2−2i, −2, −2+2i] ✓（4 个蝶形 8 次乘加）；验证 X(0)=1+2+3+4=10，逆变换 ×1/n 再 FFT 还原'; });
  yield W(1000);
  yield S(() => { status.textContent = '复杂度 O(n log n)，应用：卷积/频谱/大整数乘法。卷积：两边 FFT → 逐点乘 → 逆 FFT，O(n²) 变 O(n log n)'; });
  yield W(700);
  yield S(() => { status.textContent = 'FFT 演示完成：[1,2,3,4] → [10, −2−2i, −2, −2+2i]，蝶形 4 个、乘法减半'; });
  yield W(800);
}

function* runFFT() {
  clearView();
  status.textContent = 'FFT：分治 + 蝶形合并';
  yield W(400);
  yield* fftGen();
}

engine.queue(() => runFFT());
panel.addButton('清空', () => { engine.clear(); clearView(); status.textContent = ''; });

scene.start(engine);
