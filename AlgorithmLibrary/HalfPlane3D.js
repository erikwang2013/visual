// AlgorithmLibrary/HalfPlane3D.js — 半平面交：每条直线切一刀，保留「指定侧」，凸多边形逐渐收缩 —— Sutherland–Hodgman 裁剪（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('HalfPlane3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「运行演示」开始：半平面交 —— 4 条直线逐刀裁剪正方形', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 262, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: -70, z: 0, color: PALETTE.textGlow, scale: 0.56 });
const outT = new VText(scene, { text: '', x: 0, y: -150, z: 0, color: PALETTE.textGlow, scale: 0.62 });

const SC = 60;
const pos = p => [(p[0] - 2) * SC, -(p[1] - 2) * SC];
const R0 = [[-1, -1], [5, -1], [5, 5], [-1, 5]];
const steps = [
  { line: [[-1, 0], [5, 0]], inside: p => p[1] >= 0, ineq: 'y ≥ 0', msg: '下半平面被削平 —— 底部换上新交点' },
  { line: [[-1, -3], [6, 4]], inside: p => p[1] >= p[0] - 2, ineq: 'y ≥ x − 2', msg: '斜线一刀：右下角被切掉，多出两个新顶点' },
  { line: [[-1, 5], [6, -2]], inside: p => p[0] + p[1] <= 4, ineq: 'x + y ≤ 4', msg: '反斜线一刀：右上角被切 —— 顶点变少' },
  { line: [[0, -2], [0, 6]], inside: p => p[0] >= 0, ineq: 'x ≥ 0', msg: '竖直一刀：左缘削平 —— 最终多边形诞生' }
];

const temp = [];
function addTemp(o) { temp.push(o); return o; }
function clearTemp() { temp.forEach(o => { try { o.remove(); } catch (e) {} }); temp.length = 0; }
const pt = (x, y, color, label, r = 11) => addTemp(new VNode(scene, { x, y, z: 0, radius: r, label, color, emissive: color }));
const seg = (a, b, color, opacity = 0.65, radius = 2.5) => addTemp(tubeBetween(scene, { x: a[0], y: a[1], z: 0 }, { x: b[0], y: b[1], z: 0 }, { color, opacity, radius }));

function drawPoly(poly, color) {
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    seg(pos(p), pos(q), color);
    pt(pos(p)[0], pos(p)[1], color, '');
  }
}
function intersect(a, b, p, q) {
  const d = [b[0] - a[0], b[1] - a[1]], e = [q[0] - p[0], q[1] - p[1]];
  const den = d[0] * e[1] - d[1] * e[0];
  if (den === 0) return null;
  const t = ((p[0] - a[0]) * e[1] - (p[1] - a[1]) * e[0]) / den;
  return [a[0] + t * d[0], a[1] + t * d[1]];
}

function* clipGen(poly, st) {
  const p1 = pos(st.line[0]), p2 = pos(st.line[1]);
  const d = [p2[0] - p1[0], p2[1] - p1[1]];
  seg([p1[0] - d[0] * 0.8, p1[1] - d[1] * 0.8], [p2[0] + d[0] * 0.8, p2[1] + d[1] * 0.8], GOLD, 0.9, 3);
  yield S(() => { stageT.setText('新一刀：直线 ' + st.ineq + '（金色）—— 保留满足不等式的半平面'); });
  yield W(650);
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    const pin = st.inside(p), qin = st.inside(q);
    if (pin && qin) {
      out.push(p);
      yield S(() => stageT.setText('边 P' + i + '→Q：两点都在保留侧 → 全部保留'));
    } else if (pin && !qin) {
      out.push(p);
      const ip = intersect(st.line[0], st.line[1], p, q);
      out.push(ip);
      yield S(() => stageT.setText('边 P' + i + '→Q：P 在保留侧、Q 不在 → 保留 P 并求交点'));
    } else if (!pin && qin) {
      const ip = intersect(st.line[0], st.line[1], p, q);
      out.push(ip);
      yield S(() => stageT.setText('边 P' + i + '→Q：P 不在、Q 在保留侧 → 只求交点'));
    } else {
      yield S(() => stageT.setText('边 P' + i + '→Q：两点都不在保留侧 → 整边丢弃'));
    }
    yield W(480);
  }
  yield S(() => { stageT.setText(st.msg); eqT.setText('裁剪后顶点：' + out.map(p => '(' + p[0].toFixed(1) + ',' + p[1].toFixed(1) + ')').join(' ')); });
  yield W(700);
  return out;
}

function* halfPlaneGen() {
  yield S(() => { hint.setText('半平面交：Sutherland–Hodgman —— 每条线切一刀，保留指定侧，凸多边形逐刀收缩'); stageT.setText('初始：正方形 R0 = [−1,5]×[−1,5]，4 条线逐刀裁剪'); });
  yield W(700);
  let poly = R0;
  drawPoly(poly, BLUE);
  yield W(500);
  for (let k = 0; k < steps.length; k++) {
    poly = yield* clipGen(poly, steps[k]);
    clearTemp();
    drawPoly(poly, GREEN);
    yield W(400);
  }
  yield S(() => { outT.setText('半平面交完成：' + poly.map(p => '(' + p[0] + ',' + p[1] + ')').join(' → ') + ' —— 4 刀后正方形缩成四边形'); status.textContent = '最终区域：' + poly.map(p => '[' + p[0] + ',' + p[1] + ']').join(' '); });
  yield W(1000);
  yield S(() => { hint.setText('复杂度：每刀 O(当前顶点数) → 总 O(n·m)（n 边多边形 × m 条线）—— 半平面交是线性规划 2D 版本的内核'); outT.setText('应用：可视区域、多边形裁剪、凸集交集 —— 保留侧判定由不等式方向决定，交点用参数方程求解'); });
  yield W(1100);
  yield S(() => { hint.setText('半平面交演示完成：y≥0 → y≥x−2 → x+y≤4 → x≥0，最终四边形 [0,0]→[2,0]→[3,1]→[0,4]'); outT.setText(''); });
  yield W(400);
}

function* runHalf() {
  hint.setText('半平面交：逐刀裁剪');
  yield W(400);
  yield* halfPlaneGen();
}

panel.addButton('运行演示', () => engine.start(runHalf()));
panel.addButton('清空', () => { engine.clear(); clearTemp(); stageT.setText(''); eqT.setText(''); outT.setText(''); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；蓝 = 当前多边形，金 = 切割直线，绿 = 裁剪后多边形；交点用参数方程求出）');

scene.start(engine);
