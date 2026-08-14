// AlgorithmLibrary/Brotli3D.js — Brotli 压缩：静态字典命中（距离 93 → 词 92 "good"）+ 距离环回引（last 4 → 符号 5）+ 距离 1 重叠复制 RLE（"dddddd" 连锁展开）；3 条指令 15 位 / 120 位 = 8.0×（数据部分）（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VNode, VTorus } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Brotli3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, BLUE = 0x38bdf8, CYAN = 0x67e8f9;
const status = panel.addStatus('就绪');

const TXT = 'good gooddddddd';                 // 15 字符，索引 0..14
const RING0 = ['16', '15', '11', '4'];         // 距离环初始值，last = 4 环尾金
const lerp = (a, b, p) => a + (b - a) * p;
const ease = p => p * p * (3 - 2 * p);
const mx = k => 320 + (k - 7) * 36;            // 字符盒 x：68..572
const wx = j => 320 + (j - 3.5) * 56;          // 词表格 x：124..516
const ringX = k => 320 + (k - 1.5) * 76;       // 环格 x：206..434
const chipX = k => 320 + (k - 1) * 150;        // chip x：170..470

// ---- 字符行：15 字符盒（␣ 用 U+2423）+ 位置编号 ----
const charBox = [...TXT].map((ch, k) => new VBox(scene, { w: 32, h: 32, d: 32, x: mx(k), y: 440, z: 0, label: ch === ' ' ? '␣' : ch, color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
const posNo = [...TXT].map((_, k) => new VText(scene, { text: String(k), x: mx(k), y: 472, z: 0, color: PALETTE.textDim, scale: 0.38 }));

// ---- 指针球 + 焦点环（初始隐藏） ----
const cursorBall = new VNode(scene, { radius: 10, x: 68, y: 350, z: 0, color: GOLD, emissive: GOLD });
const focusRing = new VTorus(scene, { radius: 28, x: 68, y: 440, z: 0, color: PALETTE.highlight });
focusRing.mesh.visible = false;

// ---- 词表面板：8 格示意（id 89..96），仅 j=3（id 92）"good"，label 初始隐藏 F2 揭示 ----
const wordBox = [0, 1, 2, 3, 4, 5, 6, 7].map(j => {
  const b = new VBox(scene, { w: 52, h: 34, d: 12, x: wx(j), y: 720, z: 0, color: PALETTE.edge, emissive: PALETTE.edgeEmissive });
  b.mesh.material.transparent = true;
  b.mesh.material.opacity = 0.35;
  return b;
});
wordBox[3].setText('good');
wordBox[3].label.visible = false;
const wordIdx = [0, 1, 2, 3, 4, 5, 6, 7].map(j => new VText(scene, { text: String(89 + j), x: wx(j), y: 753, z: 0, color: PALETTE.textDim, scale: 0.35 }));

// ---- 距离环：4 格，初始 [16,15,11,4]，slot3 GOLD（last） ----
const ringBox = [0, 1, 2, 3].map(k => new VBox(scene, { w: 60, h: 34, d: 12, x: ringX(k), y: 610, z: 0, label: RING0[k], color: k === 3 ? GOLD : PALETTE.edge, emissive: k === 3 ? GOLD : PALETTE.edgeEmissive }));

// ---- chip 行：3 半透明空槽，F4/F11/F16 时 setEntry ----
const chipBox = [0, 1, 2].map(k => {
  const c = new VBox(scene, { w: 140, h: 34, d: 12, x: chipX(k), y: 560, z: 0, color: PALETTE.edge, emissive: PALETTE.edgeEmissive });
  c.mesh.material.transparent = true;
  c.mesh.material.opacity = 0.35;
  return c;
});

// ---- 虚线弧池 ×2 + 金粒子池 ×3（fxGroup 统一显隐） ----
const fxGroup = new THREE.Group();
fxGroup.visible = false;
scene.add(fxGroup);
const mkArc = color => {
  const v0 = new THREE.Vector3(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
  const curve = new THREE.QuadraticBezierCurve3(v0, v1, v2);
  const geo = new THREE.BufferGeometry();
  const line = new THREE.Line(geo, new THREE.LineDashedMaterial({ color, dashSize: 6, gapSize: 4, transparent: true, opacity: 0.9 }));
  return { v0, v1, v2, curve, geo, line };
};
const arcs = [mkArc(GOLD), mkArc(CYAN)];       // arc[0] GOLD 字典/RLE 复用，arc[1] CYAN 回引
arcs.forEach(a => fxGroup.add(a.line));
const setArc = (a, x0, y0, z0, x1, y1, z1, x2, y2, z2) => {
  a.v0.set(x0, y0, z0); a.v1.set(x1, y1, z1); a.v2.set(x2, y2, z2);
  a.geo.setFromPoints(a.curve.getPoints(24));
  a.line.computeLineDistances();
};
const parts = [0, 1, 2].map(() => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(4, 8, 8), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.9 }));
  fxGroup.add(m);
  return m;
});
const flyPts = [0, 1, 2].map(() => new THREE.Vector3());
const flyParticles = (curve, ms) => A(ms, p => { const e = ease(p); parts.forEach((v, i) => v.position.copy(curve.getPoint((e + i * 0.18) % 1, flyPts[i]))); });

// ---- 工具：球移动 / chip 落格 / 弧发射 / 环换值 / 全复位 ----
const moveBall = (toX, ms) => {
  const fromX = cursorBall.mesh.position.x;
  return A(ms, p => { cursorBall.mesh.position.x = lerp(fromX, toX, ease(p)); });
};
const setEntry = (box, text, s) => {
  box.setText(text);                           // setText 每次重算 sprite.scale
  if (box.label) {
    box.label.material.color.setHex(GOLD);     // 重施 GOLD 染色
    box.label.scale.multiplyScalar(s);         // chip 0.42
    box.label.visible = true;                  // resetAll 隐藏过 label，须补回
  }
};
// k=0 字典弧 C1 / k=1 回引弧 C2 / k=2 RLE 弧 C3（用前显式控制另一条弧 visible，DEFLATE 教训）
const fire = k => {
  if (k === 0) { setArc(arcs[0], 68, 440, 0, 208, 850, 0, 348, 720, 0); arcs[0].line.visible = true; arcs[1].line.visible = false; }
  if (k === 1) { setArc(arcs[1], 248, 440, 0, 158, 545, 0, 68, 440, 0); arcs[1].line.visible = true; arcs[0].line.visible = false; }
  if (k === 2) { setArc(arcs[0], 296, 440, 0, 314, 505, 0, 332, 440, 0); arcs[0].line.visible = true; arcs[1].line.visible = false; }
  fxGroup.visible = true;
};
const pulseBox = (box, ms) => A(ms, p => box.mesh.scale.setScalar(1 + 0.14 * Math.sin(p * Math.PI * 2)));
const ringSet = (vals, goldIdx) => {           // 距离环换值 + 重施 label 色/盒色
  vals.forEach((v, k) => {
    ringBox[k].setText(v);
    if (ringBox[k].label) { ringBox[k].label.material.color.setHex(k === goldIdx ? GOLD : 0xffffff); ringBox[k].label.visible = true; }
    ringBox[k].setColor(k === goldIdx ? GOLD : PALETTE.edge, k === goldIdx ? GOLD : PALETTE.edgeEmissive);
  });
};
function resetAll() {
  charBox.forEach(b => b.setColor(PALETTE.node, PALETTE.nodeEmissive));
  cursorBall.mesh.position.set(68, 350, 0);
  cursorBall.mesh.scale.setScalar(1);
  focusRing.mesh.visible = false;
  focusRing.mesh.position.set(68, 440, 0);
  wordBox.forEach(b => { b.setColor(PALETTE.edge, PALETTE.edgeEmissive); if (b.label) b.label.visible = false; });
  ringSet(RING0, 3);
  ringBox.forEach(b => b.mesh.scale.setScalar(1));
  chipBox.forEach(c => { if (c.label) c.label.visible = false; });
  fxGroup.visible = false;
  status.textContent = '';
}

function* brotliGen() {
  yield S(resetAll);
  // F0 开场
  yield S(() => { status.textContent = 'Brotli 压缩：静态字典 + 距离环 + RLE。输入 "good gooddddddd"（15 字符 = 120 位）；3 条指令 → 15 位'; });
  yield W(800);
  // F1 ① 静态字典命中：考察 "good"
  yield S(() => { for (let k = 0; k <= 3; k++) charBox[k].setColor(GOLD, GOLD); wordBox[3].label.visible = true; focusRing.mesh.visible = true; status.textContent = '① pos0 起考察 "good"：距离 93 已超过已产出字节 0 → 静态字典引用'; });
  yield moveBall(68, 400);
  yield W(900);
  // F2 距离 → 词号 92
  yield S(() => { wordBox[3].setColor(GOLD, GOLD); status.textContent = '① 距离 93 → 词号 92 = 93 − 0 − 1：4 字词表第 92 格 = "good"'; });
  yield W(1000);
  // F3 字典弧 + 粒子
  yield S(() => { fire(0); status.textContent = '① 弧线：pos0 → 词表第 92 格，取回 4 字词'; });
  yield flyParticles(arcs[0].curve, 700);
  // F4 指令 C1 落格
  yield S(() => {
    for (let k = 0; k <= 3; k++) charBox[k].setColor(GREEN, GREEN);
    wordBox[3].setColor(GREEN, GREEN);
    fxGroup.visible = false;
    setEntry(chipBox[0], '(0,4)@93', 0.42);
    status.textContent = '① 指令 C1：(0,4)@93 —— 插入 0、复制 4 字；数据位 8 位；消费 [0..3]';
  });
  yield W(1000);
  // F5 收尾 + 球 → pos4（字典引用不入距离环）
  yield S(() => { status.textContent = '① 字典引用不入距离环，环保持 [16,15,11,4]（last = 4）'; });
  yield moveBall(mx(4), 400);
  yield W(700);
  // F6 ② pos4 字面量 ␣
  yield S(() => { charBox[4].setColor(BLUE, BLUE); status.textContent = '② pos4：字面量 ␣（空格）无需距离，直接输出，消费 [4]'; });
  yield W(700);
  // F7 ② 向后引用：距离环编码
  yield S(() => { charBox[4].setColor(GREEN, GREEN); for (let k = 5; k <= 8; k++) charBox[k].setColor(GOLD, GOLD); status.textContent = '② pos5 起又是 "good"：向后引用需距离 5 → 用距离环编码'; });
  yield moveBall(mx(5), 400);
  yield W(900);
  // F8 距离环 last = 4 强调
  yield S(() => { status.textContent = '② 距离环：最近 4 个距离 [16,15,11,4]，last = 4（环尾高亮）'; });
  yield pulseBox(ringBox[3], 600);
  yield W(300);
  // F9 环换值 → [5,16,15,11]
  yield S(() => { ringSet(['5', '16', '15', '11'], 0); status.textContent = '② 符号 5 = last + 1 = 4 + 1：新距离 5 入环头，环 → [5,16,15,11]'; });
  yield pulseBox(ringBox[3], 600);
  yield W(500);
  // F10 回引弧 + 粒子
  yield S(() => { fire(1); status.textContent = '② 弧线：pos5 → pos0，距离 5 向后引用'; });
  yield flyParticles(arcs[1].curve, 700);
  // F11 指令 C2 落格
  yield S(() => {
    for (let k = 5; k <= 8; k++) charBox[k].setColor(GREEN, GREEN);
    fxGroup.visible = false;
    setEntry(chipBox[1], '(1,4)@5', 0.42);
    status.textContent = '② 指令 C2：(1,4)@5 —— 字面量 1 + 复制 4；数据位 4 位；消费 [4..8]';
  });
  yield W(1000);
  // F12 收尾 + 球 → pos9（普通复制入环）
  yield S(() => { status.textContent = '② 普通复制 → 距离 5 入环（环 [5,16,15,11]，last = 5）'; });
  yield moveBall(mx(9), 400);
  yield W(700);
  // F13 ③ RLE 段：pos9..14
  yield S(() => { for (let k = 9; k <= 14; k++) charBox[k].setColor(GOLD, GOLD); status.textContent = '③ pos9：连续 6 个 d → 距离 1 = 直接符号 16（NDIRECT=1），0 额外位'; });
  yield W(900);
  // F14 RLE 弧（复用 arc[0]）+ 粒子
  yield S(() => { fire(2); status.textContent = '③ 距离 1 = 重叠复制：每格复制前一个字节（RLE 连锁）'; });
  yield flyParticles(arcs[0].curve, 600);
  // F15 连锁展开 pos9..14 逐格染绿
  for (let k = 9; k <= 14; k++) {
    yield S(() => { charBox[k].setColor(GREEN, GREEN); status.textContent = '③ 连锁展开：pos9←pos8，pos10←pos9，…，逐格复制 6 次'; });
    yield W(220);
  }
  // F16 指令 C3 落格
  yield S(() => {
    fxGroup.visible = false;
    setEntry(chipBox[2], '(0,6)@1', 0.42);
    status.textContent = '③ 指令 C3：(0,6)@1 —— 复制 6；数据位 3 位；消费 [9..14]';
  });
  yield W(1000);
  // F17 编码完成（口径：数据部分，不含流头/树表）
  yield S(() => { for (let k = 0; k <= 14; k++) charBox[k].setColor(GREEN, GREEN); status.textContent = '③ 编码完成：3 条指令 15 位 / 120 位 = 8.0×（数据部分，不含流头/树表）'; });
  yield W(1400);
  // F18 彩蛋
  yield S(() => { focusRing.mesh.visible = false; status.textContent = '彩蛋：真实 brotli 流 c201000404480a428822598064fc57 同样 15 字节；上下文建模与树表本演示从略'; });
  yield W(1000);
}

engine.queue(() => brotliGen());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
