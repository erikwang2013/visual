// AlgorithmLibrary/HalfPlane3D.js — 半平面交：每条直线切一刀，保留「指定侧」，凸多边形逐渐收缩 —— Sutherland–Hodgman 裁剪（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
applyTheme('HalfPlane3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80;
const status = panel.addStatus('就绪');

const SC = 60;
const pos = p => [(p[0] - 2) * SC + 320, -(p[1] - 2) * SC + 300];
const E = p => p * p * (3 - 2 * p);
const pt2s = p => '(' + p[0].toFixed(1) + ',' + p[1].toFixed(1) + ')';
const R0 = [[-1, -1], [5, -1], [5, 5], [-1, 5]];
const steps = [
  { line: [[-1, 0], [5, 0]], inside: p => p[1] >= 0, ineq: 'y ≥ 0', msg: '下半平面被削平 —— 底部换上新交点' },
  { line: [[-1, -3], [6, 4]], inside: p => p[1] >= p[0] - 2, ineq: 'y ≥ x − 2', msg: '斜线一刀：右下角被切掉，多出两个新顶点' },
  { line: [[-1, 5], [6, -2]], inside: p => p[0] + p[1] <= 4, ineq: 'x + y ≤ 4', msg: '反斜线一刀：右上角被切 —— 顶点变少' },
  { line: [[0, -2], [0, 6]], inside: p => p[0] >= 0, ineq: 'x ≥ 0', msg: '竖直一刀：左缘削平 —— 最终多边形诞生' }
];

// ---- 对象池：顶点球 + 边管（模块级预建，生成器内零分配）----
const nodePool = [], nodeFree = [];
for (let i = 0; i < 8; i++) nodePool.push(new VNode(scene, { radius: 11, x: 0, y: 0, z: 0, label: '·', color: BLUE, emissive: BLUE }));
const edgePool = [], edgeFree = [];
for (let i = 0; i < 8; i++) {
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0)]);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 2, 2.5, 6, false), new THREE.MeshBasicMaterial({ color: BLUE, transparent: true, opacity: 0.55 }));
  tube.visible = false;
  scene.add(tube);
  edgePool.push({ tube, curve });
}
nodeFree.push(...nodePool); edgeFree.push(...edgePool);
function clearTemp() {
  nodeFree.length = 0; nodeFree.push(...nodePool);
  edgeFree.length = 0; edgeFree.push(...edgePool);
  nodePool.forEach(v => { v.mesh.visible = false; v.mesh.scale.setScalar(0.01); });
  edgePool.forEach(e => e.tube.visible = false);
}
function intersect(a, b, p, q) {
  const d = [b[0] - a[0], b[1] - a[1]], e = [q[0] - p[0], q[1] - p[1]];
  const den = d[0] * e[1] - d[1] * e[0];
  if (den === 0) return null;
  const t = ((p[0] - a[0]) * e[1] - (p[1] - a[1]) * e[0]) / den;
  return [a[0] + t * d[0], a[1] + t * d[1]];
}
function drawPoly(poly, color) {
  const nodes = [], edges = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    const a = pos(p), b = pos(q);
    const vn = nodeFree.pop();
    vn.mesh.position.set(a[0], a[1], 0);
    vn.mesh.scale.setScalar(0.01);
    vn.mesh.visible = true;
    vn.setText(pt2s(p));
    vn.setColor(color, color);
    nodes.push(vn);
    const e = edgeFree.pop();
    e.curve.points[0].set(a[0], a[1], 0);
    e.curve.points[1].set(b[0], b[1], 0);
    e.tube.geometry.dispose();
    e.tube.geometry = new THREE.TubeGeometry(e.curve, 2, 2.5, 6, false);
    e.tube.material.color.setHex(color);
    e.tube.material.opacity = 0;
    e.tube.visible = true;
    edges.push(e);
  }
  return { nodes, edges };
}
function drawLine(a, b, color) {
  const e = edgeFree.pop();
  e.curve.points[0].set(a[0], a[1], 0);
  e.curve.points[1].set(b[0], b[1], 0);
  e.tube.geometry.dispose();
  e.tube.geometry = new THREE.TubeGeometry(e.curve, 2, 3, 6, false);
  e.tube.material.color.setHex(color);
  e.tube.material.opacity = 0;
  e.tube.visible = true;
  return e;
}
function* popIn(view) {
  yield A(380, p => {
    view.nodes.forEach(vn => vn.mesh.scale.setScalar(0.01 + 0.99 * E(p)));
    view.edges.forEach(e => e.tube.material.opacity = 0.55 * E(p));
  });
}
function* fadeIn(e, opacity) { yield A(380, p => e.tube.material.opacity = opacity * E(p)); }

function* clipGen(poly, st) {
  const ln = drawLine(pos(st.line[0]), pos(st.line[1]), GOLD);
  yield S(() => { status.textContent = '新一刀：直线 ' + st.ineq + '（金色）—— 保留满足不等式的半平面'; });
  yield* fadeIn(ln, 0.9);
  yield W(400);
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    const pin = st.inside(p), qin = st.inside(q);
    if (pin && qin) {
      out.push(p);
      yield S(() => { status.textContent = '边 P' + i + '→Q：两点都在保留侧 → 全部保留'; });
    } else if (pin && !qin) {
      out.push(p);
      out.push(intersect(st.line[0], st.line[1], p, q));
      yield S(() => { status.textContent = '边 P' + i + '→Q：P 在保留侧、Q 不在 → 保留 P 并求交点'; });
    } else if (!pin && qin) {
      out.push(intersect(st.line[0], st.line[1], p, q));
      yield S(() => { status.textContent = '边 P' + i + '→Q：P 不在、Q 在保留侧 → 只求交点'; });
    } else {
      yield S(() => { status.textContent = '边 P' + i + '→Q：两点都不在保留侧 → 整边丢弃'; });
    }
    yield W(480);
  }
  yield S(() => { status.textContent = st.msg + ' —— 裁剪后顶点：' + out.map(pt2s).join(' '); });
  yield W(700);
  return out;
}

function* halfPlaneGen() {
  yield S(() => { status.textContent = '初始：正方形 R0 = [−1,5]×[−1,5]，4 条直线逐刀裁剪（Sutherland–Hodgman）'; });
  yield W(700);
  let poly = R0;
  let view = drawPoly(poly, BLUE);
  yield* popIn(view);
  yield W(400);
  for (let k = 0; k < steps.length; k++) {
    poly = yield* clipGen(poly, steps[k]);
    clearTemp();
    view = drawPoly(poly, GREEN);
    yield* popIn(view);
    yield W(400);
  }
  yield S(() => { status.textContent = '半平面交演示完成：4 条直线（y≥0 → y≥x−2 → x+y≤4 → x≥0）逐刀裁剪，正方形缩为凸四边形 [0,0]→[2,0]→[3,1]→[0,4]；每刀 O(当前顶点数)，总复杂度 O(n·m)（n 边多边形 × m 条线）'; });
  yield W(900);
}

engine.queue(() => halfPlaneGen());
panel.addButton('清空', () => { engine.clear(); clearTemp(); status.textContent = ''; });
scene.start(engine);
