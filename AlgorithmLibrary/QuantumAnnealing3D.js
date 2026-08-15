// AlgorithmLibrary/QuantumAnnealing3D.js — 量子退火：经典爬坡困于局部最小 x=2，量子隧穿穿过势垒直达全局最优 x=5 —— 横场 Γ 从 1.0 缓慢降到 0（function* 生成器驱动，小球位置运行时插值）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
applyTheme('QuantumAnnealing3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, ROSE = 0xfb7185;
const status = panel.addStatus('就绪');
const E = p => p * p * (3 - 2 * p);
const ENERGY = [8, 5, 3, 6, 2, 1, 4, 7, 5, 9];
const GLOBAL = 5, LOCAL = 2, BAR_Y = 430;
const bars = ENERGY.map((e, i) => {
  const color = i === GLOBAL ? GREEN : i === LOCAL ? YELLOW : BLUE;
  const b = new VBox(scene, { w: 44, h: 12, d: 12, x: 50 + i * 60, y: BAR_Y, z: 0, label: String(e), color, emissive: color });
  b.mesh.scale.y = (e * 20) / 12; b.mesh.position.y = BAR_Y + (e * 20) / 2;
  return b;
});
const ballX = i => 50 + i * 60;
const ballY = i => BAR_Y + (ENERGY[i] * 20) / 2 + 22;
const ball = new VBox(scene, { w: 30, h: 30, d: 30, x: 50, y: ballY(0), z: 20, label: '', color: ROSE, emissive: ROSE });
const gammaBar = new VBox(scene, { w: 40, h: 4, d: 4, x: 700, y: 320, z: 0, label: '', color: ROSE, emissive: ROSE });
const setGamma = g => { gammaBar.setText('Γ ' + g.toFixed(1)); gammaBar.mesh.scale.y = 1 + g * 3; };
const resetBars = () => bars.forEach((b, i) => { const c = i === GLOBAL ? GREEN : i === LOCAL ? YELLOW : BLUE; b.setColor(c, c); });

function* qaGen() {
  yield S(() => { status.textContent = '量子退火：给系统加「量子涨落」能量，让解像波一样「隧穿」能量墙。优化问题：找能量最低的位置（如组合优化的最优调度/布线）；（柱高=能量，黄=局部陷阱，绿=全局最优，红球=量子态，Γ=涨落强度）'; });
  yield W(600);
  yield S(() => { ball.mesh.position.x = ballX(0); ball.mesh.position.y = ballY(0); status.textContent = '经典爬山：从 x=0 出发，能量 8 → 只往低处走'; });
  yield W(800);
  yield A(700, p => { const e = E(p); ball.mesh.position.x = ballX(0) + (ballX(1) - ballX(0)) * e; ball.mesh.position.y = ballY(0) + (ballY(1) - ballY(0)) * e; });
  yield S(() => { status.textContent = 'x=1：能量降到 5 ✓ 继续往下走'; });
  yield W(700);
  yield A(700, p => { const e = E(p); ball.mesh.position.x = ballX(1) + (ballX(2) - ballX(1)) * e; ball.mesh.position.y = ballY(1) + (ballY(2) - ballY(1)) * e; });
  yield S(() => { status.textContent = 'x=2：能量 3 — 左右都是上坡，经典方法到此为止（局部最优陷阱！）'; });
  yield W(900);
  yield S(() => { bars[LOCAL].setColor(ROSE, ROSE); setGamma(1.0); status.textContent = '量子退火登场：施加横向场 Γ=1.0，系统开始「量子化」——经典退火靠温度跳出局部最优，量子退火靠隧穿'; });
  yield W(900);
  yield A(800, p => { const e = E(p); ball.mesh.position.x = ballX(LOCAL) + (ballX(GLOBAL) - ballX(LOCAL)) * e; ball.mesh.position.y = ballY(LOCAL) + (ballY(GLOBAL) - ballY(LOCAL)) * e; });
  yield S(() => { bars[LOCAL].setColor(YELLOW, YELLOW); setGamma(0.6); status.textContent = '隧穿：粒子没爬山，直接「穿墙」从 x=2 到 x=5 — 量子效应跳过能量势垒'; });
  yield W(900);
  yield S(() => { setGamma(0); bars[GLOBAL].setColor(GREEN, GREEN); status.textContent = '退火完成：Γ 缓慢降到 0 → 系统收敛到 x=5，能量 1 = 全局最优解 ✓'; });
  yield W(900);
  yield S(() => { status.textContent = '对比：经典 8→5→3 停在局部最优 x=2；量子隧穿一步跨越势垒直达全局最优 x=5（能量 1）'; });
  yield W(900);
  yield S(() => { status.textContent = '量子退火演示完成：能量状态 10 个，经典爬坡困于局部最优 x=2（能量 3），横场 Γ 1.0→0 隧穿直达全局最优 x=5（能量 1）；对比经典逐级 O(n) 下降，隧穿一步跨越势垒'; });
  yield W(500);
}

engine.queue(() => qaGen());
panel.addButton('清空', () => {
  engine.clear();
  ball.mesh.position.set(50, ballY(0), 20);
  setGamma(0);
  resetBars();
  status.textContent = '';
});

scene.start(engine);
