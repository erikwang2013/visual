// AlgorithmLibrary/GeometryBase3D.js — 几何工具箱三件套：叉积判转向、鞋带公式算面积、点到直线距离 —— 凸包/多边形/碰撞检测的地基
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('GeometryBase3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, ROSE = 0xfb7185, CYAN = 0x67e8f9, VIOLET = 0xa78bfa, AMBER = 0xfbbf24;
const hint = new VText(scene, { text: '点击「运行几何工具箱」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const extras = [];
function addTemp(o) { extras.push(o); return o; }
function clearExtras() { extras.forEach(o => { try { o.remove(); } catch (e) {} }); extras.length = 0; }
const pt = (x, y, color, label, r = 11) => addTemp(new VNode(scene, { x, y, z: 0, radius: r, label, color, emissive: color }));
const line = (a, b, color, opacity = 0.55, radius = 2.5) => addTemp(tubeBetween(scene, a, b, { color, opacity, radius }));
const txt = (text, x, y, color, scale = 0.42) => addTemp(new VText(scene, { text, x, y, z: 0, color, scale }));

new VText(scene, { text: '几何工具箱：叉积判转向 / 鞋带公式算面积 / 点线距离 —— 三个基本操作拼出整个计算几何大厦', x: 0, y: 225, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: '三段演示自上而下：①三点转向（叉积）②多边形面积（鞋带公式）③点到直线距离 —— 金色 = 最终答案', x: 0, y: -245, z: 0, color: PALETTE.textDim, scale: 0.62 });
const stageT = new VText(scene, { text: '', x: 0, y: 255, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: 268, z: 0, color: PALETTE.textGlow, scale: 0.52 });
const outT = new VText(scene, { text: '', x: 0, y: 290, z: 0, color: PALETTE.textGlow, scale: 0.5 });

function resetAll() {
  engine.clear();
  clearExtras();
  stageT.setText(''); eqT.setText(''); outT.setText('');
}

function runGeometry() {
  resetAll();
  hint.setText('三件套是凸包（反复叉积）、多边形面积（反复鞋带）、碰撞检测（反复点线距离）的原子操作 —— 每个算法都从这三招开始');
  // 演示 1：叉积方向
  C(700, () => {
    pt(-60, 120, VIOLET, 'A(1,1)');
    pt(160, 70, VIOLET, 'B(5,2)');
    stageT.setText('① 叉积判转向：三点 A、B、C —— 问：从 AB 看 C 在左还是右？');
    hint.setText('叉积 (B−A)×(C−A)：> 0 逆时针（左），< 0 顺时针（右），= 0 共线 —— 凸包判断全看它');
  });
  C(700, () => {
    pt(40, -10, CYAN, 'C(2,4)');
    line([-60, 120, 0], [160, 70, 0], VIOLET, 0.6);
    line([-60, 120, 0], [40, -10, 0], CYAN, 0.45, 2);
    eqT.setText('AB = (4, 1)，AC = (1, 3)', { color: PALETTE.textGlow });
    stageT.setText('连线：AB（紫）+ AC（青）—— 向量夹角决定 C 的方位');
  });
  C(900, () => {
    eqT.setText('AB × AC = 4×3 − 1×1 = 11 > 0', { color: GOLD });
    outT.setText('① 结果：AB×AC = 11 > 0 → C 在 AB 左侧（逆时针 CCW）✓', { color: GOLD });
    stageT.setText('叉积 = 平行四边形有向面积：正数 = 左转。Graham 扫描每步都用它决定「该不该拐弯」');
  });
  C(500, () => { clearExtras(); eqT.setText(''); outT.setText(''); stageT.setText(''); });
  // 演示 2：鞋带公式
  C(700, () => {
    pt(-100, 50, VIOLET, 'P1(0,0)');
    pt(40, 40, VIOLET, 'P2(2,0)');
    pt(90, -30, VIOLET, 'P3(3,1)');
    stageT.setText('② 鞋带公式：四边形 (0,0),(2,0),(3,1),(0,4) —— 求面积');
    hint.setText('鞋带：沿边交叉相乘 Σxᵢyᵢ₊₁ − Σyᵢxᵢ₊₁，除以 2 —— 名字来自计算时叉乘项如鞋带般交错');
  });
  C(700, () => {
    pt(-80, -120, VIOLET, 'P4(0,4)');
    line([-100, 50, 0], [40, 40, 0], VIOLET, 0.55);
    line([40, 40, 0], [90, -30, 0], VIOLET, 0.55);
    line([90, -30, 0], [-80, -120, 0], VIOLET, 0.55);
    line([-80, -120, 0], [-100, 50, 0], VIOLET, 0.55);
    eqT.setText('Σxᵢyᵢ₊₁ = 0×0 + 2×1 + 3×4 + 0×0 = 14', { color: PALETTE.textGlow });
    stageT.setText('四边闭合 —— 鞋带第 1 行：每个点的 x 乘下一个点的 y');
  });
  C(900, () => {
    eqT.setText('Σyᵢxᵢ₊₁ = 0 → 面积 = |14 − 0| / 2 = 7', { color: GOLD });
    outT.setText('② 结果：面积 = 7 ✓（鞋带公式对任意简单多边形有效，凹凸都行）', { color: GOLD });
    stageT.setText('第 2 行：每个点的 y 乘下一个点的 x —— 两行相减取一半就是面积');
  });
  C(500, () => { clearExtras(); eqT.setText(''); outT.setText(''); stageT.setText(''); });
  // 演示 3：点到直线距离
  C(700, () => {
    pt(-130, -90, VIOLET, 'A(0,0)');
    pt(130, -230, VIOLET, 'B(3,4)');
    line([-130, -90, 0], [130, -230, 0], VIOLET, 0.6);
    stageT.setText('③ 点到直线距离：直线过 A(0,0)、B(3,4)，点 P(1,0) —— 问 P 离直线多远？');
    hint.setText('距离 = |AB × AP| / |AB| —— 分子是平行四边形面积，除以底边长就是高 = 距离');
  });
  C(800, () => {
    pt(20, -150, CYAN, 'P(1,0)');
    pt(-99, -107, GOLD, 'H', 7);
    line([20, -150, 0], [-99, -107, 0], GOLD, 0.75, 2.2);
    eqT.setText('AB×AP = |3×0 − 4×1| = 4，|AB| = 5', { color: PALETTE.textGlow });
    stageT.setText('P 到垂足 H 的金色垂线段 —— 垂线段长度就是距离');
  });
  C(900, () => {
    eqT.setText('距离 = 4 / 5 = 0.8', { color: GOLD });
    outT.setText('③ 结果：P(1,0) 到直线 AB 的距离 = 0.8 ✓', { color: GOLD });
    stageT.setText('叉积分子 ÷ 向量模长分母 —— 碰撞检测：距离 < 半径即相撞');
  });
  // 总结
  C(500, () => { clearExtras(); eqT.setText(''); outT.setText(''); stageT.setText(''); });
  C(1100, () => {
    outT.setText('三件套合体：Graham 凸包 = 反复叉积；多边形面积 = 反复鞋带；物理碰撞 = 反复点线距离 —— 计算几何从这三招起步');
    status.textContent = `几何工具箱：叉积 11（CCW）、鞋带面积 7、点线距离 0.8`;
    hint.setText('进阶：极角排序 + 叉积 = 凸包 O(n log n)；增量法 + 鞋带 = 任意多边形面积；SDF 距离场 = 游戏碰撞');
  });
}

panel.addButton('运行几何工具箱', runGeometry);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；紫 = 已知几何体，青 = 提问对象，金 = 垂线/答案）');

scene.start(engine);
