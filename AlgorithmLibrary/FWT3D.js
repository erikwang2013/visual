// AlgorithmLibrary/FWT3D.js — 沃尔什-哈达玛变换：蝶形永远只有 (u+v, u−v) 两种运算 —— 异或卷积的专属加速器，连 ω 都不用（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
applyTheme('FWT3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155, ROSE = 0xfb7185, VIOLET = 0xa78bfa, AMBER = 0xfbbf24;
const status = panel.addStatus('就绪');

const a = [1, 2, 3, 4];
const L1 = [3, -1, 7, -1];
const out = ['10', '−2', '−4', '0'];

const box = (v, x, y, w = 74, color = DIM) => new VBox(scene, { w, h: 44, d: 44, x, y, z: 0, label: String(v), color, emissive: color });
const inBoxes = a.map((v, i) => box(v, 340 + (i - 1.5) * 85, 500));
const l1Boxes = L1.map((v, i) => box('', 340 + (i - 1.5) * 85, 420));
const outBoxes = out.map((v, i) => box('', 340 + (i - 1.5) * 85, 340));

function setCell(obj, v, color) { obj.setText(String(v)); if (color) obj.setColor(color, color); }
function clearView() {
  a.forEach((v, i) => setCell(inBoxes[i], v, DIM));
  l1Boxes.forEach(b => setCell(b, '', DIM));
  outBoxes.forEach(b => setCell(b, '', DIM));
}

function* fwtGen() {
  yield S(() => { status.textContent = 'FWT 4 点变换：输入 a=[1,2,3,4]。异或卷积 C[k]=ΣA[i]·B[k⊕i] 朴素 O(n²)；FWT 后逐点相乘再逆变换，中间全是纯加减'; });
  yield W(700);
  for (let i = 0; i < 4; i++) inBoxes[i].setColor(CYAN, CYAN);
  yield S(() => { status.textContent = '核心蝶形：(u,v) → (u+v, u−v)。4 点只要 2 层 × 2 对 = 4 个蝶形'; });
  yield W(600);
  setCell(l1Boxes[0], '3', VIOLET);
  setCell(l1Boxes[1], '−1', VIOLET);
  yield S(() => { status.textContent = '层 1 蝶形 1：第一对 (1,2) → (1+2, 1−2) = (3, −1)（紫），和放左、差放右。这一对蝶形就是乘一个 2×2 哈达玛矩阵 H₂'; });
  yield W(750);
  setCell(l1Boxes[2], '7', AMBER);
  setCell(l1Boxes[3], '−1', AMBER);
  yield S(() => { status.textContent = '层 1 蝶形 2：第二对 (3,4) → (3+4, 3−4) = (7, −1)（琥珀），两对互不干扰'; });
  yield W(750);
  setCell(outBoxes[0], out[0], GOLD);
  setCell(outBoxes[2], out[2], GOLD);
  yield S(() => { status.textContent = '层 2 蝶形 1：跨对合并 (3,7) → (3+7, 3−7) = (10, −4)（金），输出 0 号与 2 号落定。H₄ = H₂ ⊗ H₂（Kronecker 积）递归成层'; });
  yield W(800);
  setCell(outBoxes[1], out[1], GOLD);
  setCell(outBoxes[3], out[3], GOLD);
  yield S(() => { status.textContent = '层 2 蝶形 2：(−1,−1) → (−1−1, −1+1) = (−2, 0)，输出 1 号与 3 号落定，变换完成'; });
  yield W(800);
  yield S(() => { status.textContent = 'FWT(a) = [10, −2, −4, 0] ✓ —— 4 个纯加减蝶形，朴素异或卷积要 16 次乘加'; });
  yield W(1000);
  yield S(() => { status.textContent = '用武之地：A、B 各自 FWT → 逐点相乘 → 逆 FWT = 异或卷积，集合覆盖计数、图同态计数都靠它。复杂度 O(n log n)'; });
  yield W(700);
  yield S(() => { status.textContent = '家族图谱：FFT 用复数 ω，NTT 用整数 ω，FWT 连 ω 都不用。FWT 演示完成：[1,2,3,4] → [10, −2, −4, 0]'; });
  yield W(800);
}

function* runFWT() {
  clearView();
  status.textContent = 'FWT：纯加减蝶形';
  yield W(400);
  yield* fwtGen();
}

engine.queue(() => runFWT());
panel.addButton('清空', () => { engine.clear(); clearView(); status.textContent = ''; });

scene.start(engine);
