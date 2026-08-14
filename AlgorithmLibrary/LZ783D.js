// AlgorithmLibrary/LZ783D.js — LZ78：字典编码，输出 (条目号, 下一字符)；字符盒/字典格/chip 行/金球 + 虚线弧粒子流（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VNode, VTorus } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('LZ783D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GOLD = 0xfcd34d, GREEN = 0x4ade80;
const status = panel.addStatus('就绪');

const TXT = 'ABABABCABAB';                 // 11 字符，索引 0..10
const lerp = (a, b, p) => a + (b - a) * p;
const ease = p => p * p * (3 - 2 * p);
const mx = k => (k - 5) * 40 + 320;        // 字符盒 x：120..520
const dictX = k => 56 + 88 * k;            // 字典格 x：56..496
const chipX = k => (k - 2.5) * 96 + 320;   // chip x：80..560

// ---- 字符盒 + 位置编号 ----
const charBox = [...TXT].map((ch, k) => new VBox(scene, { w: 38, h: 38, d: 38, x: mx(k), y: 430, z: 0, label: ch, color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
const posNo = [...TXT].map((_, k) => new VText(scene, { text: String(k), x: mx(k), y: 468, z: 0, color: PALETTE.textDim, scale: 0.45 }));

// ---- 指针球 + 焦点环 ----
const cursorBall = new VNode(scene, { radius: 10, x: 120, y: 340, z: 0, color: GOLD, emissive: GOLD });
const focusRing = new VTorus(scene, { radius: 30, x: 120, y: 430, z: 0, color: PALETTE.highlight });
focusRing.mesh.visible = false;            // 初始隐藏，分镜中显隐/移动

// ---- 字典格（6 格）+ 索引号，无 label ----
const dictBox = [0, 1, 2, 3, 4, 5].map(k => new VBox(scene, { w: 86, h: 40, d: 30, x: dictX(k), y: 680, z: 0, color: PALETTE.edge, emissive: PALETTE.edgeEmissive }));
const idxNo = [0, 1, 2, 3, 4, 5].map(k => new VText(scene, { text: String(k), x: dictX(k), y: 710, z: 0, color: PALETTE.textDim, scale: 0.4 }));

// ---- chip 行：6 半透明空槽 + 文本（VBox 懒创建 label），无 label ----
const chipBox = [0, 1, 2, 3, 4, 5].map(k => {
  const c = new VBox(scene, { w: 96, h: 34, d: 10, x: chipX(k), y: 560, z: 24, color: PALETTE.edge, emissive: PALETTE.edgeEmissive });
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
const arcs = [mkArc(GOLD), mkArc(PALETTE.highlight)];
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

// ---- 工具：球移动 / 条目染色 / 弧+粒子发射 / 全复位 ----
const moveBall = (toX, ms) => {
  const fromX = cursorBall.mesh.position.x;
  return A(ms, p => { cursorBall.mesh.position.x = lerp(fromX, toX, ease(p)); });
};
const setEntry = (box, text, s) => {
  box.setText(text);                       // setText 每次重算 sprite.scale
  if (box.label) {
    box.label.material.color.setHex(GOLD); // 重施 GOLD 染色
    box.label.scale.multiplyScalar(s);     // 条目 0.6 / chip 0.42
    box.label.visible = true;              // resetAll 隐藏过 label，setText 不恢复 visible，须补回
  }
};
// g=格索引, c=chip 索引, ch=字符段中点 x（null → 无弧1，如串尾 (2,∅)）
const fire = (g, c, ch) => {
  const gx = dictX(g), cx = chipX(c);
  setArc(arcs[0], gx, 680, 0, (gx + cx) / 2, 820, 12, cx, 560, 24);
  if (ch) {
    setArc(arcs[1], gx, 680, 0, (gx + ch[0]) / 2, 850, 0, ch[0], 430, 0);
    arcs[1].line.visible = true;
  } else {
    arcs[1].line.visible = false;
  }
  arcs[0].line.visible = true;
  fxGroup.visible = true;
};
const flyPts = [0, 1, 2].map(() => new THREE.Vector3());
const flyParticles = (curve, ms) => A(ms, p => { const e = ease(p); parts.forEach((v, i) => v.position.copy(curve.getPoint((e + i * 0.18) % 1, flyPts[i]))); });
function resetAll() {
  charBox.forEach(b => b.setColor(PALETTE.node, PALETTE.nodeEmissive));
  cursorBall.mesh.position.set(120, 340, 0);
  focusRing.mesh.visible = false;
  focusRing.mesh.position.set(120, 430, 0);
  dictBox.forEach(b => {
    b.setColor(PALETTE.edge, PALETTE.edgeEmissive);
    if (b.label) b.label.visible = false;  // label 懒创建，可能不存在
  });
  chipBox.forEach(c => {
    if (c.label) c.label.visible = false;  // chip 空槽保持可见，仅清文本
  });
  fxGroup.visible = false;
  status.textContent = '';
}

function* lz78Gen() {
  yield S(resetAll);
  // F0 就绪
  yield S(() => { status.textContent = 'LZ78 压缩演示：串 "ABABABCABAB"（11 字符），字典当前为空。规则：从当前 pos 找最长匹配前缀，输出 (条目号, 下一字符)；命中跳多字符，字面量只跳 1 格'; });
  yield W(600);
  // F1 ① pos0
  yield S(() => { charBox[0].setColor(GOLD, GOLD); focusRing.mesh.visible = true; cursorBall.pulse(); status.textContent = '① pos0：考察字符 A —— 字典为空，无前缀可匹配，只能按字面量处理'; });
  yield W(500);
  // F2 ① 输出 (0,A)
  yield S(() => {
    dictBox[1].setColor(GREEN, GREEN);
    setEntry(dictBox[1], 'A', 0.6);
    setEntry(chipBox[0], '(0,A)', 0.42);
    fire(0, 0, [120]);
    status.textContent = '① 输出 (0,A)：0 表示「字典为空」，直接写下字符 A；建条目 1「A」，消费 [0]，游标→1';
  });
  yield flyParticles(arcs[0].curve, 650);
  // F3 收尾 + 球 →1
  yield S(() => { charBox[0].setColor(GREEN, GREEN); fxGroup.visible = false; });
  yield moveBall(160, 450);
  yield W(400);
  // F4 ② pos1
  yield S(() => { charBox[1].setColor(GOLD, GOLD); focusRing.moveTo(160, 430, 0, 300); cursorBall.pulse(); status.textContent = '② pos1：考察字符 B —— 条目 1 只有「A」，B 不在字典 → 字面量处理'; });
  yield W(450);
  // F5 ② 输出 (0,B)
  yield S(() => {
    dictBox[2].setColor(GREEN, GREEN);
    setEntry(dictBox[2], 'B', 0.6);
    setEntry(chipBox[1], '(0,B)', 0.42);
    fire(0, 1, [160]);
    status.textContent = '② 输出 (0,B)：建条目 2「B」，消费 [1]，游标→2';
  });
  yield flyParticles(arcs[0].curve, 650);
  // F6 收尾 + 球 →2
  yield S(() => { charBox[1].setColor(GREEN, GREEN); fxGroup.visible = false; });
  yield moveBall(200, 450);
  yield W(400);
  // F7 ③ pos2：条目 1 命中
  yield S(() => { charBox[2].setColor(GOLD, GOLD); dictBox[1].setColor(GOLD, GOLD); focusRing.moveTo(200, 430, 0, 300); cursorBall.pulse(); status.textContent = '③ pos2：考察字符 A —— 「A」在条目 1 → 前缀 "A" 匹配，续读下一字符'; });
  yield W(450);
  // F8 ③ 续读失配
  yield S(() => { charBox[3].setColor(GOLD, GOLD); focusRing.moveTo(240, 430, 0, 300); status.textContent = '③ 续读 B：前缀 "AB" 不在字典 → 停止匹配'; });
  yield W(450);
  // F9 ③ 输出 (1,B)
  yield S(() => {
    dictBox[1].setColor(GREEN, GREEN);
    dictBox[3].setColor(GREEN, GREEN);
    setEntry(dictBox[3], 'AB', 0.6);
    setEntry(chipBox[2], '(1,B)', 0.42);
    fire(1, 2, [220]);
    status.textContent = '③ 输出 (1,B)：最长匹配前缀 "A"（条目 1）+ 下一字符 B；建条目 3「AB」，消费 [2..3]，游标→4';
  });
  yield flyParticles(arcs[0].curve, 650);
  // F10 收尾 + 球 →4
  yield S(() => { charBox[2].setColor(GREEN, GREEN); charBox[3].setColor(GREEN, GREEN); fxGroup.visible = false; });
  yield moveBall(280, 450);
  yield W(400);
  // F11 ④ pos4
  yield S(() => { charBox[4].setColor(GOLD, GOLD); dictBox[1].setColor(GOLD, GOLD); focusRing.moveTo(280, 430, 0, 300); cursorBall.pulse(); status.textContent = '④ pos4：考察字符 A —— 「A」在条目 1 → 续读'; });
  yield W(400);
  // F12 ④ 续读 AB
  yield S(() => { charBox[5].setColor(GOLD, GOLD); dictBox[3].setColor(GOLD, GOLD); focusRing.moveTo(320, 430, 0, 300); status.textContent = '④ 续读 B：前缀 "AB" 在条目 3 → 续读'; });
  yield W(400);
  // F13 ④ 续读失配
  yield S(() => { charBox[6].setColor(GOLD, GOLD); focusRing.moveTo(360, 430, 0, 300); status.textContent = '④ 续读 C：前缀 "ABC" 不在字典 → 停止匹配'; });
  yield W(400);
  // F14 ④ 输出 (3,C)
  yield S(() => {
    dictBox[1].setColor(GREEN, GREEN);
    dictBox[3].setColor(GREEN, GREEN);
    dictBox[4].setColor(GREEN, GREEN);
    setEntry(dictBox[4], 'ABC', 0.6);
    setEntry(chipBox[3], '(3,C)', 0.42);
    fire(3, 3, [320]);
    status.textContent = '④ 输出 (3,C)：最长匹配前缀 "AB"（条目 3）+ 下一字符 C；建条目 4「ABC」，消费 [4..6]，游标→7';
  });
  yield flyParticles(arcs[0].curve, 650);
  // F15 收尾 + 球 →7
  yield S(() => { for (let k = 4; k <= 6; k++) charBox[k].setColor(GREEN, GREEN); fxGroup.visible = false; });
  yield moveBall(400, 450);
  yield W(400);
  // F16 ⑤ pos7
  yield S(() => { charBox[7].setColor(GOLD, GOLD); dictBox[1].setColor(GOLD, GOLD); focusRing.moveTo(400, 430, 0, 300); cursorBall.pulse(); status.textContent = '⑤ pos7：考察字符 A —— 「A」在条目 1 → 续读'; });
  yield W(400);
  // F17 ⑤ 续读 AB
  yield S(() => { charBox[8].setColor(GOLD, GOLD); dictBox[3].setColor(GOLD, GOLD); focusRing.moveTo(440, 430, 0, 300); status.textContent = '⑤ 续读 B：前缀 "AB" 在条目 3 → 续读'; });
  yield W(400);
  // F18 ⑤ 续读失配
  yield S(() => { charBox[9].setColor(GOLD, GOLD); focusRing.moveTo(480, 430, 0, 300); status.textContent = '⑤ 续读 A：前缀 "ABA" 不在字典 → 停止匹配'; });
  yield W(400);
  // F19 ⑤ 输出 (3,A)
  yield S(() => {
    dictBox[1].setColor(GREEN, GREEN);
    dictBox[3].setColor(GREEN, GREEN);
    dictBox[5].setColor(GREEN, GREEN);
    setEntry(dictBox[5], 'ABA', 0.6);
    setEntry(chipBox[4], '(3,A)', 0.42);
    fire(3, 4, [440]);
    status.textContent = '⑤ 输出 (3,A)：最长匹配前缀 "AB"（条目 3）+ 下一字符 A；建条目 5「ABA」，消费 [7..9]，游标→10';
  });
  yield flyParticles(arcs[0].curve, 650);
  // F20 收尾 + 球 →10
  yield S(() => { for (let k = 7; k <= 9; k++) charBox[k].setColor(GREEN, GREEN); fxGroup.visible = false; });
  yield moveBall(520, 450);
  yield W(400);
  // F21 ⑥ pos10
  yield S(() => { charBox[10].setColor(GOLD, GOLD); dictBox[2].setColor(GOLD, GOLD); focusRing.moveTo(520, 430, 0, 300); cursorBall.pulse(); status.textContent = '⑥ pos10：考察字符 B —— 「B」在条目 2 → 续读，但已到串尾：输出 (2,∅)，∅ 表示无后续字符'; });
  yield W(500);
  // F22 ⑥ 输出 (2,∅)：仅弧0，无弧1
  yield S(() => {
    dictBox[2].setColor(GREEN, GREEN);
    setEntry(chipBox[5], '(2,∅)', 0.42);
    fire(2, 5, null);
    status.textContent = '⑥ 输出 (2,∅)：串尾终止，消费 [10]，不建新条目（字典到条目 5 为止）';
  });
  yield flyParticles(arcs[0].curve, 650);
  // F23 收尾
  yield S(() => { charBox[10].setColor(GREEN, GREEN); fxGroup.visible = false; });
  yield W(400);
  // F24 编码完成
  yield S(() => { status.textContent = '编码完成：6 个输出项 (0,A)(0,B)(1,B)(3,C)(3,A)(2,∅)；解码验证 A+B+AB+ABC+ABA+B = ABABABCABAB ✓ 与原文一致'; });
  yield W(600);
  // F25 结束
  yield S(() => { focusRing.mesh.visible = false; status.textContent = 'LZ78 演示结束：字典条目越建越长，重复串用条目号代替，实现压缩'; });
  yield W(500);
  // F26 生成器自然返回
}

engine.queue(() => lz78Gen());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
