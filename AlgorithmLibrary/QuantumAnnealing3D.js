// AlgorithmLibrary/QuantumAnnealing3D.js — 量子退火：经典爬坡困于局部最小 x=2，量子隧穿穿过势垒直达全局最优 x=5 —— 横场 Γ 从 1.0 缓慢降到 0（function* 生成器驱动，小球位置运行时插值）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('QuantumAnnealing3D');

const scene = new Scene3D('scene', { cameraPos: [0, 330, 640], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, ROSE = 0xfb7185, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「运行演示」开始：量子退火 —— 隧穿 vs 爬坡', x: 0, y: 265, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const ENERGY = [8, 5, 3, 6, 2, 1, 4, 7, 5, 9];
const GLOBAL = 5, LOCAL = 2;
const bars = ENERGY.map((e, i) => {
  const color = i === GLOBAL ? GREEN : i === LOCAL ? YELLOW : BLUE;
  const b = new VBox(scene, { w: 44, h: 12, d: 12, x: -270 + i * 60, y: -90, z: 0, label: String(e), color, emissive: color });
  b.mesh.scale.y = (e * 20) / 12; b.mesh.position.y = -90 + (e * 20) / 2;
  return b;
});
new VText(scene, { text: '能量景观：越低越优。x=5 是全局最优（绿），x=2 是局部陷阱（黄）', x: 0, y: 175, z: 0, color: PALETTE.textDim, scale: 0.62 });
const ball = new VBox(scene, { w: 30, h: 30, d: 30, x: -270, y: 100, z: 20, label: '', color: ROSE, emissive: ROSE });
const ballX = i => -270 + i * 60;
const ballY = i => -90 + (ENERGY[i] * 20) / 2 + 22;
const gammaT = new VText(scene, { text: '', x: 280, y: 60, z: 0, color: PALETTE.textGlow, scale: 0.7 });
const gammaBar = new VBox(scene, { w: 40, h: 4, d: 4, x: 280, y: 45, z: 0, label: '', color: ROSE, emissive: ROSE });
const setGamma = g => { gammaT.setText('量子涨落 Γ = ' + g.toFixed(1)); gammaBar.mesh.scale.y = 1 + g * 3; };
const stepT = new VText(scene, { text: '', x: 0, y: -170, z: 0, color: PALETTE.textGlow, scale: 0.75 });
const resetBars = () => bars.forEach((b, i) => { const c = i === GLOBAL ? GREEN : i === LOCAL ? YELLOW : BLUE; b.setColor(c, c); });

function* qaGen() {
  yield S(() => { hint.setText('量子退火：给系统加「量子涨落」能量，让解像波一样「隧穿」能量墙 — 找到全局最优'); stepT.setText('优化问题：找能量最低的位置（如组合优化里的最优调度/布线）。经典方法先试试…'); });
  yield W(600);
  yield S(() => { ball.mesh.position.x = ballX(0); ball.mesh.position.y = ballY(0); stepT.setText('经典爬山：从 x=0 出发，能量 8 → 只往低处走'); });
  yield W(800);
  yield A(700, p => { ball.mesh.position.x = ballX(0) + (ballX(1) - ballX(0)) * p; ball.mesh.position.y = ballY(0) + (ballY(1) - ballY(0)) * p; });
  yield S(() => { stepT.setText('x=1：能量降到 5 ✓ 继续往下走'); });
  yield W(700);
  yield A(700, p => { ball.mesh.position.x = ballX(1) + (ballX(2) - ballX(1)) * p; ball.mesh.position.y = ballY(1) + (ballY(2) - ballY(1)) * p; });
  yield S(() => { stepT.setText('x=2：能量 3 — 左右都是上坡，经典方法到此为止（局部最优陷阱！）'); });
  yield W(900);
  yield S(() => { bars[LOCAL].setColor(ROSE, ROSE); setGamma(1.0); stepT.setText('量子退火登场：施加横向场 Γ=1.0，系统开始「量子化」'); hint.setText('经典退火靠温度跳出局部最优，量子退火靠隧穿 — D-Wave 量子退火机就是干这个的'); });
  yield W(900);
  yield A(800, p => { const e = p * p * (3 - 2 * p); ball.mesh.position.x = ballX(LOCAL) + (ballX(GLOBAL) - ballX(LOCAL)) * e; ball.mesh.position.y = ballY(LOCAL) + (ballY(GLOBAL) - ballY(LOCAL)) * e; });
  yield S(() => { bars[LOCAL].setColor(YELLOW, YELLOW); setGamma(0.6); stepT.setText('隧穿：粒子没爬山，直接「穿墙」从 x=2 到 x=5 — 量子效应跳过能量势垒'); });
  yield W(900);
  yield S(() => { setGamma(0); bars[GLOBAL].setColor(GREEN, GREEN); stepT.setText('退火完成：Γ 缓慢降到 0 → 系统收敛到 x=5，能量 1 = 全局最优解 ✓'); });
  yield W(900);
  yield S(() => { stepT.setText('对比：经典 8→5→3 停在局部最优；量子隧穿直达全局最优 1 — 组合优化问题的量子解法'); hint.setText('量子退火：调「涨落」像退火调「温度」— 已用于交通调度、蛋白质折叠、量子机器学习'); });
  yield W(900);
  yield S(() => { status.textContent = '量子退火完成：经典爬坡困在 x=2（能量 3），Γ 从 1→0 隧穿到全局最优 x=5（能量 1）'; });
  yield W(500);
}

panel.addButton('运行演示', () => engine.start(qaGen()));
panel.addButton('清空', () => {
  engine.clear();
  ball.mesh.position.set(-270, 100, 20);
  setGamma(0); gammaBar.mesh.scale.y = 1;
  stepT.setText(''); resetBars();
  hint.setText('已清空，可重新运行'); status.textContent = '';
});
panel.addLabel('（拖拽旋转视角，滚轮缩放；柱高=能量，黄=局部陷阱，绿=全局最优，红球=量子态，Γ=量子涨落强度）');

scene.start(engine);
