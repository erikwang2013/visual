// AlgorithmLibrary/Euclidean3D.js — 欧几里得算法：gcd(a,b)=gcd(b, a mod b)，252 与 105 双色带逐轮对折，琥珀=整数倍、玫瑰=余数，最后金色 gcd=21（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Euclidean3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155, ROSE = 0xfb7185, VIOLET = 0xa78bfa, AMBER = 0xfbbf24;
const status = panel.addStatus('就绪');

const A0 = 252, B0 = 105;
function euclid(a, b) {
  const steps = [];
  while (b > 0) { const q = Math.floor(a / b), r = a % b; steps.push({ a, b, q, r }); a = b; b = r; }
  return { gcd: a, steps };
}
const { gcd, steps } = euclid(A0, B0);

const SCALE = 1.15;
const barA = new VBox(scene, { w: A0 * SCALE, h: 40, d: 40, x: 360, y: 485, z: 0, label: '252', color: VIOLET, emissive: VIOLET });
const barB = new VBox(scene, { w: B0 * SCALE, h: 40, d: 40, x: 360, y: 430, z: 0, label: '105', color: AMBER, emissive: AMBER });
new VText(scene, { text: 'a = 252', x: 60, y: 485, z: 0, color: VIOLET, scale: 0.5 });
new VText(scene, { text: 'b = 105', x: 60, y: 430, z: 0, color: AMBER, scale: 0.5 });
const gcdBox = new VBox(scene, { w: 90, h: 44, d: 44, x: 320, y: 380, z: 0, label: '', color: DIM, emissive: DIM });

const tempBoxes = [];
function addTemp(o) { tempBoxes.push(o); return o; }
function clearTemp() { tempBoxes.forEach(o => { try { o.remove(); } catch (e) {} }); tempBoxes.length = 0; }
function rebuild(a, b) {
  clearTemp();
  const q = Math.floor(a / b), r = a % b;
  const segW = b * SCALE;
  addTemp(new VBox(scene, { w: segW - 4, h: 36, d: 36, x: 360 + segW / 2, y: 335, z: 0, label: q + '×' + b, color: AMBER, emissive: AMBER }));
  if (r > 0) {
    addTemp(new VBox(scene, { w: r * SCALE - 4, h: 36, d: 36, x: 360 + segW + r * SCALE / 2, y: 335, z: 0, label: '余 ' + r, color: ROSE, emissive: ROSE }));
  }
}
function setCell(obj, v, color) { obj.setText(String(v)); if (color) obj.setColor(color, color); }

function* euGen() {
  yield S(() => { status.textContent = '欧几里得演示：gcd(252, 105)。直觉：两根木条，长条对折进短条，多出的一截就是余数；反复对折，最后剩下的就是公度量'; });
  yield W(650);
  for (let t = 0; t < steps.length; t++) {
    const s = steps[t];
    setCell(barA, String(s.a), VIOLET);
    setCell(barB, String(s.b), AMBER);
    yield S(() => { status.textContent = '第 ' + (t + 1) + ' 轮：' + s.a + ' ÷ ' + s.b + '，商 ' + s.q + '，余数 ' + s.r + '（余数严格小于除数，规模必收敛）'; });
    yield W(700);
    rebuild(s.a, s.b);
    if (s.r > 0) {
      yield S(() => { status.textContent = '琥珀段 = ' + s.q + ' × ' + s.b + '（整段减掉），玫瑰段 = 余数 ' + s.r + '；gcd(' + s.a + ',' + s.b + ') = gcd(' + s.b + ',' + s.r + ')'; });
    } else {
      yield S(() => { status.textContent = '余数 = 0！' + s.b + ' 整倍数地装进了 ' + s.a + '，它就是最大公约数'; });
    }
    yield W(800);
  }
  setCell(gcdBox, 'gcd = ' + gcd, GOLD);
  gcdBox.setColor(GOLD, GOLD);
  yield S(() => { status.textContent = 'gcd(252, 105) = ' + gcd + ' ✓：21 同时整除 252 与 105（252 = 12×21，105 = 5×21）'; });
  yield W(1000);
  yield S(() => { status.textContent = '为什么每次变小？余数 r < b，且 gcd(a,b) = gcd(b,r)，问题规模单调下降，算法必停'; });
  yield W(800);
  yield S(() => { status.textContent = '贝祖：21 = 5×105 − 2×252（扩展欧几里得可求系数）；复杂度 O(log min(a,b))，斐波那契数列是最坏情况'; });
  yield W(900);
  yield S(() => { status.textContent = '欧几里得演示完成：gcd(252, 105) = 21'; });
  yield W(400);
}

function* runEU() {
  clearTemp();
  setCell(barA, '252', VIOLET); setCell(barB, '105', AMBER);
  setCell(gcdBox, '', DIM);
  yield W(400);
  yield* euGen();
}

engine.queue(() => runEU());
panel.addButton('清空', () => { engine.clear(); clearTemp(); setCell(barA, '252', VIOLET); setCell(barB, '105', AMBER); setCell(gcdBox, '', DIM); status.textContent = ''; });

scene.start(engine);
