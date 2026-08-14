// AlgorithmLibrary/NTT3D.js — 数论变换：FFT 的孪生兄弟，把复数 ω 换成模素数 p 的整数单位根 —— 无浮点误差，结果精确可逆（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
applyTheme('NTT3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const CYAN = 0x22d3ee, VIOLET = 0xa78bfa, AMBER = 0xfbbf24, GOLD = 0xfcd34d, DIM = 0x334155;
const status = panel.addStatus('就绪');

const P = 998244353, OM = 911660635;
const a = [1, 2, 3, 4];
const E = [4, -2], O = [6, -2];
const out = ['10', '173167434', '998244351', '825076915'];

const box = (v, x, y, w = 92, color = DIM) => new VBox(scene, { w, h: 44, d: 44, x, y, z: 0, label: String(v), color, emissive: color });
const inBoxes = a.map((v, i) => box(v, 170 + i * 88, 510, 78));
const eBoxes = E.map((v, i) => box(v, 210 + i * 84, 430, 74));
const oBoxes = O.map((v, i) => box(v, 210 + i * 84, 385, 74));
const outBoxes = out.map((v, i) => box('', 170 + i * 88, 330, 78));

function setCell(obj, v, color) { obj.setText(String(v)); if (color) obj.setColor(color, color); }
function clearView() {
  a.forEach((v, i) => setCell(inBoxes[i], v, DIM));
  E.forEach((v, i) => setCell(eBoxes[i], '', DIM));
  O.forEach((v, i) => setCell(oBoxes[i], '', DIM));
  outBoxes.forEach(b => setCell(b, '', DIM));
}

function* nttGen() {
  yield S(() => { status.textContent = 'NTT：FFT 有浮点误差，NTT 换整数 ω 扮演 i。输入 [1,2,3,4]，模 p = 998244353'; });
  yield W(700);
  for (let i = 0; i < 4; i++) inBoxes[i].setColor(CYAN, CYAN);
  yield S(() => { status.textContent = 'p = 119×2²³+1，3 是原根 —— 数学保证 ω 存在'; });
  yield W(600);
  yield S(() => { status.textContent = 'ω = 3^((p−1)/4) ≡ 911660635 (mod p)；验证 ω⁴ = 1、ω² ≡ −1 —— 整数世界的「i」'; });
  yield W(800);
  yield S(() => { status.textContent = '分治：偶部 [1,3]（紫）、奇部 [2,4]（琥珀）；X(k) = E + ω^k·O、X(k+2) = E − ω^k·O'; });
  yield W(750);
  E.forEach((v, i) => setCell(eBoxes[i], v, VIOLET));
  yield S(() => { status.textContent = '偶部 2 点变换：[1+3, 1−3] = [4, −2]，一次加减零浮点误差'; });
  yield W(750);
  O.forEach((v, i) => setCell(oBoxes[i], v, AMBER));
  yield S(() => { status.textContent = '奇部 2 点变换：[2+4, 2−4] = [6, −2]；递归到底，蝶形网络与 FFT 完全同构'; });
  yield W(750);
  setCell(outBoxes[0], out[0], GOLD);
  setCell(outBoxes[2], out[2], GOLD);
  yield S(() => { status.textContent = '蝶形对 1：X0 = 4+6 = 10，X2 = 4−6 ≡ 998244351 —— −2 的模表示 p−2'; });
  yield W(850);
  setCell(outBoxes[1], out[1], GOLD);
  setCell(outBoxes[3], out[3], GOLD);
  yield S(() => { status.textContent = '蝶形对 2：X1 = E1 + ω·O1 ≡ 173167434，X3 ≡ 825076915 —— 乘法换成模乘'; });
  yield W(850);
  yield S(() => { status.textContent = 'NTT(a) = [10, 173167434, 998244351, 825076915]（mod p）；对比 FFT [10, −2−2i, −2, −2+2i]：同构但零浮点误差'; });
  yield W(1000);
  yield S(() => { status.textContent = '复杂度 O(n log n)。应用：模素数卷积、多项式密码学（确定性是密码场景的刚需）'; });
  yield W(800);
  yield S(() => { status.textContent = 'NTT 演示完成：4 点变换成功，整数模算术精确可逆、零浮点误差'; });
  yield W(1200);
}

function* runNTT() {
  clearView();
  yield S(() => { status.textContent = 'NTT：整数世界里的 FFT（数论变换）'; });
  yield W(400);
  yield* nttGen();
}

engine.queue(() => runNTT());
panel.addButton('清空', () => { engine.clear(); clearView(); status.textContent = ''; });

scene.start(engine);
