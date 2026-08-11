// AlgorithmLibrary/HalfPlane3D.js — 半平面交：每条金色直线切一刀，保留「指定侧」，凸多边形逐渐收缩 —— Sutherland–Hodgman 裁剪
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('HalfPlane3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, ROSE = 0xfb7185, CYAN = 0x67e8f9, VIOLET = 0xa78bfa, AMBER = 0xfbbf24;
const hint = new VText(scene, { text: '点击「运行半平面交」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const SC = 60;
const pos = p => [(p[0] - 2) * SC, -(p[1] - 2) * SC];
const R0 = [[-1, -1], [5, -1], [5, 5], [-1, 5]];
const steps = [
  { line: [[-1, 0], [5, 0]], ineq: 'y ≥ 0', after: [[-1, 0], [5, 0], [5, 5], [-1, 5]], msg: '下半平面被削平 —— 底部换上新交点' },
  { line: [[-1, -3], [6, 4]], ineq: 'y ≥ x − 2', after: [[2, 0], [5, 3], [5, 5], [-1, 5], [-1, 0]], msg: '斜线一刀：右下角被切掉，多出两个新顶点' },
  { line: [[-1, 5], [6, -2]], ineq: 'x + y ≤ 4', after: [[3, 1], [-1, 5], [-1, 0], [2, 0]], msg: '反斜线一刀：右上角被切 —— 5 顶点变 4' },
  { line: [[0, -2], [0, 6]], ineq: 'x ≥ 0', after: [[0, 4], [0, 0], [2, 0], [3, 1]], msg: '竖直一刀：左缘削平 —— 最终四边形诞生' }
];
const FINAL = steps[3].after;

const extras = [];
function addTemp(o) { extras.push(o); return o; }
function clearExtras() { extras.forEach(o => { try { o.remove(); } catch (e) {} }); extras.length = 0; }
function drawPoly(poly, color, edgeOpacity = 0.6) {
  poly.forEach((p, i) => {
    addTemp(new VNode(scene, { x: pos(p)[0], y: pos(p)[1], z: 0, radius: 9, label: `(${p[0]},${p[1]})`, color, emissive: color }));
    const q = poly[(i + 1) % poly.length];
    addTemp(tubeBetween(scene, pos(p), pos(q), { color, opacity: edgeOpacity, radius: 2.2 }));
  });
}

new VText(scene, { text: '半平面交：把平面切成 4 块的大矩形，被 4 条金色直线逐条裁剪 —— 每条线保留不等式指定的那一侧', x: 0, y: 225, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: '每步：金色线 = 新半平面边界（保留侧），新顶点随裁剪出现 —— 多边形始终凸，4 刀之后得到最终可行域', x: 0, y: -245, z: 0, color: PALETTE.textDim, scale: 0.62 });
const stageT = new VText(scene, { text: '', x: 0, y: 255, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: 270, z: 0, color: PALETTE.textGlow, scale: 0.52 });
const outT = new VText(scene, { text: '', x: 0, y: 290, z: 0, color: PALETTE.textGlow, scale: 0.5 });

function resetAll() {
  engine.clear();
  clearExtras();
  stageT.setText(''); eqT.setText(''); outT.setText('');
}

function runHalfPlane() {
  resetAll();
  hint.setText('半平面 = 直线一侧的所有点。半平面交 = 满足所有约束的点集 —— 凸多边形套凸多边形，交还是凸的');
  C(700, () => {
    drawPoly(R0, VIOLET);
    stageT.setText('初始：[-1,5]×[-1,5] 大矩形 —— 「所有约束都还没上场」的乐观可行域');
    hint.setText('Sutherland–Hodgman：逐边扫描旧多边形，内外切换处算交点 —— 顶点数只会少不会多');
  });
  steps.forEach((s, i) => {
    C(650, () => {
      addTemp(tubeBetween(scene, pos(s.line[0]), pos(s.line[1]), { color: GOLD, opacity: 0.85, radius: 2.4 }));
      addTemp(new VText(scene, { text: s.ineq, x: pos(s.line[1])[0] + 15, y: pos(s.line[1])[1], z: 0, color: GOLD, scale: 0.46 }));
      eqT.setText(`半平面 ${i + 1}：${s.ineq} —— 保留这条线的哪一侧？`, { color: GOLD });
      stageT.setText(`第 ${i + 1} 刀：${s.ineq}${i === 0 ? '（水平）' : i === 3 ? '（竖直）' : '（斜）'}`);
      hint.setText(i === 0 ? '先看半平面边界怎么「编码」：y ≥ 0 就是边界直线 y=0 的北侧' : '新半平面与旧多边形的边求交，交点成为新顶点 —— 旧的被削顶点退出舞台');
    });
    C(800, () => {
      clearExtras();
      drawPoly(s.after, i === steps.length - 1 ? GOLD : VIOLET);
      eqT.setText(`裁剪完成：${s.after.length} 个顶点 —— ${s.msg}`, { color: i === steps.length - 1 ? GOLD : PALETTE.textGlow });
      stageT.setText(s.msg);
    });
  });
  C(900, () => {
    clearExtras();
    drawPoly(FINAL, GOLD, 0.85);
    outT.setText(`可行域 = 四边形 (0,0),(2,0),(3,1),(0,4) ✓ —— 4 条半平面的交集，每条边都源自一把金刀`, { color: GOLD });
    status.textContent = `半平面交：4 刀裁剪得四边形 (0,0),(2,0),(3,1),(0,4)`;
    hint.setText('检查：每个顶点都满足全部 4 个不等式 —— 半平面交是「所有约束同时成立」的几何画像');
  });
  C(1200, () => {
    outT.setText('复杂度 O(n²)（增量）或 O(n log n)（极角排序）。应用：线性规划可行域、多边形裁剪、可见性计算、NPC 寻路');
    hint.setText('二分 + 半平面交 = 雷达/游戏里的「最大安全区」；对偶后就是凸包问题 —— 同一枚硬币的两面');
  });
}

panel.addButton('运行半平面交', runHalfPlane);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；紫 = 当前多边形，金 = 半平面刀/最终可行域，青 = 标签）');

scene.start(engine);
