// AlgorithmLibrary/LZ773D.js — LZ77：滑动窗口找最长匹配，输出 (偏移, 长度, 下一字符)；窗框/前瞻框/金分界条/金球 + 虚线弧粒子流（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VNode } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('LZ773D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const FRAME = 0x94a3b8, GOLD = 0xfde047, CYAN = 0x67e8f9, RED = 0xfb7185, GREEN = 0x4ade80;
const status = panel.addStatus('就绪');

const TXT = 'ABABABCABABCDEF', WIN = 6;   // 15 字符，索引 0..14
const CHIP_TXT = ['(0,0,A)', '(0,0,B)', '(2,4,C)', '(5,5,D)', '(0,0,E)', '(0,0,F)'];
const consumed = [];                       // 已消费索引集，resetAll 清空

const lerp = (a, b, p) => a + (b - a) * p;
const ease = p => p * p * (3 - 2 * p);
const mx = k => (k - 7) * 40 + 320;
const winX = p => mx(p - 6) + 100;         // 仅 p>=6 时用
const lookX = p => mx(p) + Math.min(5, 14 - p) * 20;  // 仅 p<=11 时用

// ---- 字符盒 + 位置编号 ----
const box = [...TXT].map((ch, k) => new VBox(scene, { w: 38, h: 38, d: 38, x: mx(k), y: 420, z: 0, label: ch, color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
const num = [...TXT].map((_, k) => new VText(scene, { text: String(k), x: mx(k), y: 458, z: 10, color: PALETTE.textDim, scale: 0.45 }));

// ---- 窗框（滑动窗口）与前瞻框：同构 4 细条 ----
const mkBar = (w, h, x, y) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 2), new THREE.MeshBasicMaterial({ color: FRAME }));
  m.position.set(x, y, 0);
  return m;
};
const winGroup = new THREE.Group();
const bars = [mkBar(2, 128, -132, 0), mkBar(2, 128, 132, 0), mkBar(264, 2, 0, -64), mkBar(264, 2, 0, 64)];
bars.forEach(b => winGroup.add(b));
winGroup.position.set(180, 420, 0);
winGroup.visible = false;                  // p>=6 才可见
scene.add(winGroup);

const lookGroup = new THREE.Group();
const lookBars = [mkBar(2, 128, -132, 0), mkBar(2, 128, 132, 0), mkBar(264, 2, 0, -64), mkBar(264, 2, 0, 64)];
lookBars.forEach(b => lookGroup.add(b));
lookGroup.position.set(140, 420, 0);       // p<=11 才可见
scene.add(lookGroup);

// ---- 分界金竖条 + 金球 ----
const divider = new THREE.Mesh(new THREE.BoxGeometry(2.5, 128, 2), new THREE.MeshBasicMaterial({ color: GOLD }));
divider.position.set(19, 420, 0);
scene.add(divider);
const ball = new VNode(scene, { radius: 10, x: 40, y: 330, z: 0, color: GOLD, emissive: GOLD });

// ---- chip 行：6 盒 + 6 文本，初始全隐 ----
const chipBox = CHIP_TXT.map((_, k) => {
  const c = new VBox(scene, { w: 104, h: 36, d: 18, x: (k - 2.5) * 104 + 320, y: 560, z: 0, color: PALETTE.edge, emissive: PALETTE.edgeEmissive });
  c.mesh.material.transparent = true;
  c.mesh.material.opacity = 0.18;
  c.mesh.visible = false;
  return c;
});
const chipText = CHIP_TXT.map((t, k) => {
  const c = new VText(scene, { text: t, x: (k - 2.5) * 104 + 320, y: 560, z: 24, color: GOLD, scale: 0.5 });
  c.sprite.visible = false;
  return c;
});

// ---- 虚线弧池 ×2 + 金粒子池 ×3（fxGroup 统一显隐） ----
const fxGroup = new THREE.Group();
fxGroup.visible = false;
scene.add(fxGroup);
const mkArc = () => {
  const v0 = new THREE.Vector3(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
  const curve = new THREE.QuadraticBezierCurve3(v0, v1, v2);
  const geo = new THREE.BufferGeometry();
  const line = new THREE.Line(geo, new THREE.LineDashedMaterial({ color: CYAN, dashSize: 5, gapSize: 3, transparent: true, opacity: 0.9 }));
  return { v0, v1, v2, curve, geo, line };
};
const arcs = [mkArc(), mkArc()];
arcs.forEach(a => fxGroup.add(a.line));
const setArc = (a, x0, y0, z0, x1, y1, z1, x2, y2, z2) => {
  a.v0.set(x0, y0, z0); a.v1.set(x1, y1, z1); a.v2.set(x2, y2, z2);
  a.geo.setFromPoints(a.curve.getPoints(18));
  a.line.computeLineDistances();
};
setArc(arcs[0], 24, 470, 30, 140, 545, 60, 256, 470, 30);
setArc(arcs[1], 104, 470, 30, 300, 545, 60, 496, 470, 30);
const parts = [0, 1, 2].map(() => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(3.5, 8, 8), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.9 }));
  fxGroup.add(m);
  return m;
});

// ---- 工具：同帧四组 lerp / 粒子沿弧 / 搜索态复位 / 全复位 ----
const shiftTo = (p, ms) => {
  const lx0 = lookGroup.position.x, wx0 = winGroup.position.x;
  const dx0 = divider.position.x, bx0 = ball.mesh.position.x;
  return A(ms, t => {
    const e = ease(t);
    if (p <= 11) lookGroup.position.x = lerp(lx0, lookX(p), e);
    if (p >= 6) winGroup.position.x = lerp(wx0, winX(p), e);
    divider.position.x = lerp(dx0, mx(p) - 21, e);
    ball.mesh.position.x = lerp(bx0, mx(p), e);
  });
};
const flyParts = [0, 1, 2].map(() => new THREE.Vector3());
const flyParticles = (curve, ms) => A(ms, p => parts.forEach((v, i) => v.position.copy(curve.getPoint((p + i * 0.18) % 1, flyParts[i]))));
const resetSearch = () => {
  box.forEach((b, k) => b.setColor(consumed.includes(k) ? GREEN : PALETTE.node, consumed.includes(k) ? GREEN : PALETTE.nodeEmissive));
};
function resetAll() {
  consumed.length = 0;
  box.forEach(b => b.setColor(PALETTE.node, PALETTE.nodeEmissive));
  winGroup.visible = false;
  winGroup.position.set(180, 420, 0);
  lookGroup.visible = true;
  lookGroup.position.set(140, 420, 0);
  divider.position.set(19, 420, 0);
  ball.mesh.position.set(40, 330, 0);
  chipBox.forEach(c => { c.mesh.visible = false; });
  chipText.forEach(c => { c.sprite.visible = false; });
  fxGroup.visible = false;
}

function* runLZ77() {
  yield S(resetAll);
  yield S(() => { status.textContent = 'LZ77 压缩：滑动窗口 ' + WIN + ' 位，窗口内找最长匹配，输出 (偏移, 长度, 下一字符)；TXT = ' + TXT + '（15 字符）'; });
  yield W(600);
  // ① pos0：字面量 A
  yield S(() => { box[0].setColor(GOLD, GOLD); });
  yield W(400);
  yield S(() => { box[0].setColor(GREEN, GREEN); consumed.push(0); chipBox[0].mesh.visible = true; chipText[0].sprite.visible = true; status.textContent = '① pos0：窗口为空，无匹配 → 输出字面量 A'; });
  yield W(500);
  // ② pos1：字面量 B
  yield shiftTo(1, 600);
  yield S(() => { resetSearch(); box[1].setColor(GOLD, GOLD); });
  yield W(400);
  yield S(() => { box[1].setColor(GREEN, GREEN); consumed.push(1); chipBox[1].mesh.visible = true; chipText[1].sprite.visible = true; status.textContent = '② pos1：窗口 [0..0] 内无 B → 输出字面量 B'; });
  yield W(500);
  // ③ pos2：偏移 1 失配，偏移 2 重叠匹配 (2,4,C)
  yield shiftTo(2, 600);
  yield S(() => { resetSearch(); status.textContent = '③ pos2：窗口 [0..1] = "AB"，尝试候选偏移'; });
  yield W(100);
  yield S(() => { box[1].setColor(GOLD, GOLD); box[2].setColor(GOLD, GOLD); });
  yield W(350);
  yield S(() => { box[1].setColor(RED, RED); box[2].setColor(RED, RED); status.textContent = '③ 偏移 1：源 [1]="B" ≠ 目标 [2]="A" → 失配'; });
  yield W(450);
  yield S(() => { box[1].setColor(GREEN, GREEN); box[2].setColor(PALETTE.node, PALETTE.nodeEmissive); });
  yield W(100);
  yield S(() => { for (let k = 0; k <= 5; k++) box[k].setColor(GOLD, GOLD); status.textContent = '③ 偏移 2：源 [0..1]="AB" ↔ 目标 [2..5]，连中 4 位'; });
  yield W(500);
  yield S(() => { box[6].setColor(GOLD, GOLD); status.textContent = '③ 第 5 位 [6]="C" ≠ 源 "A" → 停止；重叠匹配（距离 2 < 长度 4，源在目标内部）→ (2,4,C)'; });
  yield W(350);
  yield S(() => { setArc(arcs[0], 24, 470, 30, 140, 545, 60, 256, 470, 30); fxGroup.visible = true; });
  yield flyParticles(arcs[0].curve, 650);
  yield S(() => { fxGroup.visible = false; for (let k = 0; k <= 6; k++) box[k].setColor(GREEN, GREEN); consumed.push(2, 3, 4, 5, 6); chipBox[2].mesh.visible = true; chipText[2].sprite.visible = true; status.textContent = '③ pos2：输出 (2,4,C)，消费 [2..6]，游标 → pos7'; });
  yield W(550);
  // ④ pos7：窗框现、重叠匹配 (5,5,D)
  yield S(() => { winGroup.visible = true; winGroup.position.set(180, 420, 0); });
  yield shiftTo(7, 650);
  yield S(() => { resetSearch(); status.textContent = '④ pos7：窗口 [1..6]="BABABC"，最长匹配 o=5：源 [2..6] ↔ 目标 [7..11]'; });
  yield S(() => { for (let k = 2; k <= 11; k++) box[k].setColor(GOLD, GOLD); });
  yield W(500);
  yield S(() => { box[12].setColor(GOLD, GOLD); status.textContent = '④ 第 6 位 [12]="D" ≠ 源循环 "A" → 停止 → (5,5,D)'; });
  yield W(350);
  yield S(() => { setArc(arcs[1], 104, 470, 30, 300, 545, 60, 496, 470, 30); fxGroup.visible = true; });
  yield flyParticles(arcs[1].curve, 650);
  yield S(() => { fxGroup.visible = false; for (let k = 2; k <= 12; k++) box[k].setColor(GREEN, GREEN); consumed.push(7, 8, 9, 10, 11, 12); chipBox[3].mesh.visible = true; chipText[3].sprite.visible = true; status.textContent = '④ pos7：输出 (5,5,D)，消费 [7..12]，游标 → pos13'; });
  yield W(550);
  // ⑤ pos13：字面量 E
  yield S(() => { lookGroup.visible = false; });
  yield shiftTo(13, 650);
  yield S(() => { resetSearch(); box[13].setColor(GOLD, GOLD); });
  yield W(400);
  yield S(() => { box[13].setColor(GREEN, GREEN); consumed.push(13); chipBox[4].mesh.visible = true; chipText[4].sprite.visible = true; status.textContent = '⑤ pos13：窗口 [7..12] 内无 E → 输出字面量 E'; });
  yield W(500);
  // ⑥ pos14：字面量 F
  yield shiftTo(14, 600);
  yield S(() => { resetSearch(); box[14].setColor(GOLD, GOLD); });
  yield W(400);
  yield S(() => { box[14].setColor(GREEN, GREEN); consumed.push(14); chipBox[5].mesh.visible = true; chipText[5].sprite.visible = true; status.textContent = '⑥ pos14：窗口 [8..13] 内无 F → 输出字面量 F'; });
  yield W(500);
  // ⑦ 完成
  yield S(() => { status.textContent = 'LZ77 完成：15 字符 → 6 个 token：A B (2,4,C) (5,5,D) E F；重复串只记 (偏移,长度)，解压按窗口内偏移复制即可还原'; });
  yield W(800);
}

engine.queue(() => runLZ77());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
