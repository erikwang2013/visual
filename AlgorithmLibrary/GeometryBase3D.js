// AlgorithmLibrary/GeometryBase3D.js — 几何工具箱三件套：叉积判转向 / 鞋带公式算面积 / 点到直线距离 —— 计算几何的地基（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('GeometryBase3D');

const scene = new Scene3D('scene', { cameraPos: [0, 60, 720], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：几何工具箱 —— 叉积 / 鞋带 / 点线距离', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 262, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: -8, z: 0, color: PALETTE.textGlow, scale: 0.52 });
const outT = new VText(scene, { text: '', x: 0, y: -230, z: 0, color: PALETTE.textGlow, scale: 0.6 });

const temp = [];
function addTemp(o) { temp.push(o); return o; }
function clearTemp() { temp.forEach(o => { try { o.remove(); } catch (e) {} }); temp.length = 0; }
const pt = (x, y, color, label, r = 12) => addTemp(new VNode(scene, { x, y, z: 0, radius: r, label, color, emissive: color }));
const seg = (a, b, color, opacity = 0.6, radius = 3) => addTemp(tubeBetween(scene, { x: a[0], y: a[1], z: 0 }, { x: b[0], y: b[1], z: 0 }, { color, opacity, radius }));

// ① 三点转向
const PA = [-170, 70], PB = [10, -30], PC = [150, 80];
// ② 四边形鞋带
const Q = [[-160, -130], [60, -175], [160, -60], [-40, 40]];
// ③ 点线距离：3x − 4y + 12 = 0，P = (16, 10) → d = 4
const La = [-60, -42], Lb = [60, 48], P0 = [16, 10];

function* showCross() {
  yield S(() => { stageT.setText('① 三点转向（叉积）：A(−170,70) B(10,−30) C(150,80)'); eqT.setText('AB = (180, −100)，AC = (320, 10)'); });
  yield W(600);
  pt(PA[0], PA[1], CYAN, 'A'); pt(PB[0], PB[1], CYAN, 'B'); pt(PC[0], PC[1], CYAN, 'C');
  seg(PA, PB, CYAN); seg(PA, PC, ORANGE);
  yield W(500);
  const cr = (PB[0] - PA[0]) * (PC[1] - PA[1]) - (PB[1] - PA[1]) * (PC[0] - PA[0]);
  yield S(() => { stageT.setText('cross = AB×AC = 180·10 − (−100)·320 = ' + cr); eqT.setText('cross > 0 → 从 A 看 B→C 是左转（逆时针）'); });
  yield W(650);
  pt(PC[0], PC[1], GREEN, 'C');
  yield S(() => { stageT.setText('cross = ' + cr + ' > 0 → 左转 ✓（叉积符号决定转向：>0 左 / <0 右 / =0 共线）'); outT.setText('① 结论：A→B→C 逆时针左转，cross = ' + cr); });
  yield W(900);
  clearTemp();
}

function* showArea() {
  yield S(() => { stageT.setText('② 多边形面积（鞋带公式）：四边形 4 顶点'); eqT.setText('S = ½·|Σ (xᵢ·yᵢ₊₁ − xᵢ₊₁·yᵢ)| —— 逐边累加交叉项'); });
  yield W(600);
  let sum = 0;
  for (let i = 0; i < Q.length; i++) {
    const j = (i + 1) % Q.length;
    pt(Q[i][0], Q[i][1], i === 0 ? RED : BLUE, String(i));
    seg(Q[i], Q[j], BLUE);
    const term = Q[i][0] * Q[j][1] - Q[j][0] * Q[i][1];
    sum += term;
    yield S(() => { stageT.setText('边 ' + i + '→' + j + '：x' + i + '·y' + j + ' − x' + j + '·y' + i + ' = ' + Q[i][0] + '·' + Q[j][1] + ' − ' + Q[j][0] + '·' + Q[i][1] + ' = ' + term); eqT.setText('累计 Σ = ' + sum); });
    yield W(550);
  }
  const area = Math.abs(sum) / 2;
  yield S(() => { stageT.setText('面积 = ½·|' + sum + '| = ' + area); eqT.setText('鞋带公式：顶点绕一圈的交叉项和的一半'); outT.setText('② 结论：多边形面积 = ' + area + ' 平方单位'); });
  yield W(900);
  clearTemp();
}

function* showDist() {
  yield S(() => { stageT.setText('③ 点到直线距离：线 3x − 4y + 12 = 0，点 P(16, 10)'); eqT.setText('d = |a·x₀ + b·y₀ + c| / √(a² + b²)'); });
  yield W(600);
  seg(La, Lb, GOLD);
  pt(P0[0], P0[1], CYAN, 'P');
  yield W(500);
  const num = Math.abs(3 * P0[0] - 4 * P0[1] + 12);
  const den = Math.sqrt(3 * 3 + 4 * 4);
  yield S(() => { stageT.setText('分子 = |3·16 − 4·10 + 12| = |' + (3 * P0[0] - 4 * P0[1] + 12) + '| = ' + num); eqT.setText('分母 = √(9 + 16) = 5'); });
  yield W(600);
  yield S(() => { stageT.setText('d = ' + num + ' / 5 = ' + (num / den) + '（垂线段紫色）'); outT.setText('③ 结论：P 到直线距离 = ' + num / den); });
  seg(P0, [P0[0] - 3 * 4, P0[1] + 4 * 4], PUR, 0.8, 2.5);
  yield W(900);
  clearTemp();
}

function* geomGen() {
  yield S(() => { hint.setText('几何工具箱：叉积判转向 / 鞋带公式算面积 / 点线距离 —— 三个基本操作拼出整个计算几何大厦'); stageT.setText('三段演示自上而下：①三点转向（叉积）②多边形面积（鞋带公式）③点到直线距离'); });
  yield W(700);
  yield* showCross();
  yield* showArea();
  yield* showDist();
  yield S(() => { hint.setText('复杂度：叉积/点线距离 O(1)；鞋带面积 O(n)（绕一圈）—— 三者是凸包、碰撞检测、多边形裁剪的共同基础'); outT.setText('应用：转向判定（Graham 扫描）、面积计算（地图/图形学）、距离分类（碰撞检测）—— 叉积也叫「楔积」'); });
  yield W(1100);
  yield S(() => { hint.setText('几何工具箱演示完成：左转判定 → 面积 → 距离 4'); outT.setText(''); });
  yield W(400);
}

function* runGeom() {
  hint.setText('几何工具箱：叉积 / 鞋带 / 点线距离');
  yield W(400);
  yield* geomGen();
}

engine.queue(() => runGeom());
panel.addButton('清空', () => { engine.clear(); clearTemp(); stageT.setText(''); eqT.setText(''); outT.setText(''); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；① 上区三点转向，② 中区鞋带面积，③ 下区点线距离；青/蓝 = 演示元素，金 = 直线，紫 = 垂线段）');

scene.start(engine);
