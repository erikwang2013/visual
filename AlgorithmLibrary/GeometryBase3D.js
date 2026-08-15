// AlgorithmLibrary/GeometryBase3D.js — 几何工具箱三件套：叉积判转向 / 鞋带公式算面积 / 点到直线距离（function* 生成器驱动，解说入状态栏）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
applyTheme('GeometryBase3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff;
const status = panel.addStatus('就绪');

// ① 三点转向（屏幕坐标）
const PA = [150, 370], PB = [330, 270], PC = [470, 380];
// ② 四边形鞋带
const Q = [[160, 170], [380, 125], [480, 240], [280, 340]];
// ③ 点线距离：3x − 4y + 12 = 0，P(336,310) → d = 44
const La = [260, 258], Lb = [380, 348], P0 = [336, 310];

// ---- 视觉对象池：点节点 / 连线管，模块级预建（峰值 4 点 4 线，池 5+6） ----
const nodePool = [], nodeFree = [];
for (let i = 0; i < 5; i++) {
  const vn = new VNode(scene, { radius: 12, x: 0, y: 0, z: 0, label: '', color: CYAN, emissive: CYAN });
  vn.mesh.visible = false; vn.mesh.scale.setScalar(0.01);
  nodePool.push(vn);
}
const segPool = [], segFree = [];
for (let i = 0; i < 6; i++) {
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0)]);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 2, 3, 6, false), new THREE.MeshBasicMaterial({ color: BLUE, transparent: true, opacity: 0.6 }));
  tube.visible = false; scene.add(tube);
  segPool.push({ tube, curve });
}
function resetFree() {
  nodeFree.length = 0; nodePool.forEach(v => { v.mesh.visible = false; v.mesh.scale.setScalar(0.01); }); nodeFree.push(...nodePool);
  segFree.length = 0; segPool.forEach(s => { s.tube.visible = false; }); segFree.push(...segPool);
}
function pt(x, y, color, label) {
  const vn = nodeFree.pop(); if (!vn) return;
  vn.mesh.position.set(x, y, 0); vn.mesh.scale.setScalar(1); vn.mesh.visible = true;
  vn.setText(label); vn.setColor(color, color);
  return vn;
}
function seg(a, b, color, opacity = 0.6) {
  const s = segFree.pop(); if (!s) return;
  s.curve.points[0].set(a[0], a[1], 0);
  s.curve.points[1].set(b[0], b[1], 0);
  s.tube.geometry.dispose();
  s.tube.geometry = new THREE.TubeGeometry(s.curve, 2, 3, 6, false);
  s.tube.material.color.setHex(color); s.tube.material.opacity = opacity;
  s.tube.visible = true;
}

function* showCross() {
  yield S(() => { status.textContent = '① 三点转向（叉积）：A(150,370) B(330,270) C(470,380)，cross = AB×AC 决定 B→C 相对 A 的转向'; });
  yield W(600);
  pt(PA[0], PA[1], CYAN, 'A'); pt(PB[0], PB[1], CYAN, 'B');
  const cNode = pt(PC[0], PC[1], CYAN, 'C');
  seg(PA, PB, CYAN); seg(PA, PC, ORANGE);
  yield W(450);
  const cr = (PB[0] - PA[0]) * (PC[1] - PA[1]) - (PB[1] - PA[1]) * (PC[0] - PA[0]);
  yield S(() => { status.textContent = 'cross = 180×10 − (−100)×320 = ' + cr + ' > 0 → 从 A 看 B→C 是左转（逆时针）'; });
  yield W(700);
  cNode.setColor(GREEN, GREEN);
  yield S(() => { status.textContent = '① 结论：A→B→C 逆时针左转（cross = ' + cr + '）；符号约定：>0 左转 / <0 右转 / =0 共线'; });
  yield W(900);
  resetFree();
}

function* showArea() {
  yield S(() => { status.textContent = '② 多边形面积（鞋带公式）：四边形 4 顶点，逐边累加交叉项 xᵢ·yᵢ₊₁ − xᵢ₊₁·yᵢ'; });
  yield W(600);
  let sum = 0;
  for (let i = 0; i < Q.length; i++) {
    const j = (i + 1) % Q.length;
    pt(Q[i][0], Q[i][1], i === 0 ? RED : BLUE, String(i));
    seg(Q[i], Q[j], BLUE);
    const term = Q[i][0] * Q[j][1] - Q[j][0] * Q[i][1];
    sum += term;
    yield S(() => { status.textContent = '边 ' + i + '→' + j + '：' + Q[i][0] + '×' + Q[j][1] + ' − ' + Q[j][0] + '×' + Q[i][1] + ' = ' + term + '，累计 Σ = ' + sum; });
    yield W(550);
  }
  const area = Math.abs(sum) / 2;
  yield S(() => { status.textContent = '面积 = ½×|' + sum + '| = ' + area + ' 平方单位（交叉项和的一半，绕一圈）'; });
  yield W(900);
  resetFree();
}

function* showDist() {
  yield S(() => { status.textContent = '③ 点到直线距离：线 3x − 4y + 12 = 0，点 P(336,310)；d = |a·x₀ + b·y₀ + c| ÷ √(a² + b²)'; });
  yield W(600);
  seg(La, Lb, GOLD);
  pt(P0[0], P0[1], CYAN, 'P');
  yield W(450);
  const num = Math.abs(3 * P0[0] - 4 * P0[1] + 12);
  const den = Math.sqrt(3 * 3 + 4 * 4);
  yield S(() => { status.textContent = '分子 = |3×336 − 4×310 + 12| = |' + (3 * P0[0] - 4 * P0[1] + 12) + '| = ' + num + '，分母 = √(9+16) = 5'; });
  yield W(600);
  seg(P0, [P0[0] - 12, P0[1] + 16], PUR, 0.8);
  yield S(() => { status.textContent = 'd = ' + num + ' ÷ 5 = ' + (num / den) + '（紫色垂线段）→ ③ 结论：P 到直线距离 = ' + num / den; });
  yield W(900);
  resetFree();
}

function* geomGen() {
  yield S(() => { status.textContent = '几何工具箱：三段演示 —— ① 三点转向（叉积）② 多边形面积（鞋带公式）③ 点到直线距离'; });
  yield W(700);
  yield* showCross();
  yield* showArea();
  yield* showDist();
  yield S(() => { status.textContent = '复杂度：叉积 / 点线距离 O(1)，鞋带面积 O(n)（绕一圈）；三者是凸包（Graham 扫描）、碰撞检测、多边形裁剪的共同基础'; });
  yield W(1000);
  yield S(() => { status.textContent = '几何工具箱演示完成：叉积 cross = 33800 判左转 → 鞋带面积 = 37900 → 点线距离 d = 44；复杂度：叉积/点线距离 O(1)、鞋带 O(n)'; });
  yield W(900);
}

function* runGeom() {
  resetFree();
  yield S(() => { status.textContent = '几何工具箱：叉积判转向 / 鞋带公式算面积 / 点线距离 —— 点击「▶ 播放」或 ?demo=1 自动演示'; });
  yield W(400);
  yield* geomGen();
}

engine.queue(() => runGeom());
panel.addButton('清空', () => { engine.clear(); resetFree(); status.textContent = ''; });

scene.start(engine);
