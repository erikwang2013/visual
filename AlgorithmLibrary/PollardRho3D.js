// AlgorithmLibrary/PollardRho3D.js — Pollard-Rho 分解：f(x)=x²+1 驱动的随机游走里，兔子与乌龟在环上碰撞 —— gcd(|x−y|, n) 暴露因子（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
applyTheme('PollardRho3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const CYAN = 0x22d3ee, GOLD = 0xfcd34d, PUR = 0xc4b5fd, ORANGE = 0xfb923c, DIM = 0x334155;
const status = panel.addStatus('就绪');

const N = 8051;
const f = x => (x * x + 1) % N;
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { const t = a % b; a = b; b = t; } return a; }
function pollardRho(n) {
  let x = 2, y = 2;
  const steps = [];
  for (let i = 0; i < 12; i++) {
    x = f(x); y = f(f(y));
    const g = gcd(x - y, n);
    steps.push({ x, y, g, found: g > 1 && g < n });
    if (g > 1 && g < n) break;
  }
  return steps;
}
const steps = pollardRho(N);

const nBox = new VBox(scene, { w: 160, h: 48, d: 48, x: 140, y: 535, z: 0, label: 'n = 8051', color: DIM, emissive: DIM });
const chip = (x, y, w = 104) => new VBox(scene, { w, h: 40, d: 40, x, y, z: 0, label: '', color: DIM, emissive: DIM });
const xChips = steps.map((s, i) => chip(250 + i * 110, 415));
const yChips = steps.map((s, i) => chip(250 + i * 110, 370));
const gChips = steps.map((s, i) => chip(250 + i * 110, 325));

function setCell(obj, v, color) { obj.setText(String(v)); if (color) obj.setColor(color, color); }

function* rhoGen() {
  yield S(() => { status.textContent = 'Pollard-Rho：随机游走必入环。目标分解 8051 = 97 × 83，乌龟走 1 步、兔子走 2 步'; });
  yield W(700);
  setCell(nBox, 'n = 8051', CYAN);
  yield S(() => { status.textContent = '起点 x = y = 2，兔龟并肩出发；兔子两倍速，会在环上追上乌龟'; });
  yield W(600);
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    setCell(xChips[i], 'x = ' + s.x, PUR);
    setCell(yChips[i], 'y = ' + s.y, ORANGE);
    yield S(() => { status.textContent = '第 ' + (i + 1) + ' 步：x = ' + s.x + '，y = ' + s.y + ' —— 都在 f 轨道上绕圈'; });
    yield W(600);
    setCell(gChips[i], 'gcd = ' + s.g, s.found ? GOLD : DIM);
    if (s.found) {
      setCell(xChips[i], 'x = ' + s.x, GOLD);
      setCell(yChips[i], 'y = ' + s.y, GOLD);
      yield S(() => { status.textContent = 'gcd = ' + s.g + ' 抓到因子：兔子追上乌龟，1 < gcd < 8051，分解成功'; });
    } else {
      yield S(() => { status.textContent = 'gcd = ' + s.g + ' 与 n 互素，继续绕圈'; });
    }
    yield W(650);
  }
  const last = steps[steps.length - 1];
  yield S(() => { status.textContent = '8051 = ' + last.g + ' × ' + (N / last.g) + '，' + steps.length + ' 步完成。为什么叫 ρ？序列入环的轨迹形似希腊字母 ρ'; });
  yield W(1100);
  yield S(() => { status.textContent = '复杂度 O(√p)。应用：RSA 小因子攻击、整数分解；优化：Brent 变体省一次 f，先试除小素数再上 Rho'; });
  yield W(1100);
  yield S(() => { status.textContent = 'Pollard-Rho 演示完成：8051 = 97 × 83'; });
  yield W(400);
}

function* runRho() {
  yield S(() => { status.textContent = 'Pollard-Rho：兔龟赛跑（Floyd 判环）'; });
  yield W(400);
  yield* rhoGen();
}

engine.queue(() => runRho());
panel.addButton('清空', () => { engine.clear(); setCell(nBox, 'n = 8051', DIM); xChips.forEach(c => setCell(c, '', DIM)); yChips.forEach(c => setCell(c, '', DIM)); gChips.forEach(c => setCell(c, '', DIM)); status.textContent = ''; });

scene.start(engine);
