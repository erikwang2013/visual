// AlgorithmLibrary/DEFLATE3D.js — DEFLATE 压缩：LZ77 阶段（滑动窗口找最长匹配 → 字面量/(距离,长度)）+ Huffman 阶段（按频率建树 → 0/1 码字 → 比特流）（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VNode } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('DEFLATE3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GOLD = 0xfde047, GREEN = 0x4ade80, RED = 0xfb7185, CYAN = 0x67e8f9, BLUE = 0x38bdf8, YELLOW = 0xfacc15, WHITE = 0xffffff;
const status = panel.addStatus('就绪');

const TXT = 'abcabcabxabcab';                        // 14 字符，索引 0..13
const SYM = ['a', 'b', 'c', 'x', 'L5', 'D3', 'D6'];  // Huffman 符号序
const FREQ = [1, 1, 1, 1, 2, 1, 1];
const CODE = ['010', '011', '100', '110', '00', '101', '111'];       // 码字（与 SYM 同序）
const BITS = [['a', '010'], ['b', '011'], ['c', '100'], ['L5', '00'], ['D3', '101'], ['x', '110'], ['L5', '00'], ['D6', '111']];
const CHIP_TXT = ['a', 'b', 'c', '(3,5)', 'x', '(6,5)'];
const consumed = [];

const lerp = (a, b, p) => a + (b - a) * p;
const ease = p => p * p * (3 - 2 * p);
const mx = k => 64 + k * 40;      // 字符盒 x
const winX = k => 40 * k - 96;    // 窗框 x
const fx = j => 64 + j * 80;      // 频率行/树叶子 x
const cx = k => 64 + k * 104;     // chip x
const bx = k => 45 + k * 72;      // 比特流盒/阴影盒 x
const cw = j => 44 + j * 88;      // 码字表盒 x

// ---- 字符盒×14 + 位置编号×14 ----
const charBox = [...TXT].map((ch, k) => new VBox(scene, { w: 38, h: 38, d: 38, x: mx(k), y: 420, z: 0, label: ch, color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
const posNo = [...TXT].map((_, k) => new VText(scene, { text: String(k), x: mx(k), y: 458, z: 10, color: PALETTE.textDim, scale: 0.4 }));

// ---- 窗框（4 细条，同 LZ773D）+ 分界金条 + 金球 ----
const mkBar = (w, h, x, y) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 2), new THREE.MeshBasicMaterial({ color: 0x94a3b8 }));
  m.position.set(x, y, 0);
  return m;
};
const winGroup = new THREE.Group();
[mkBar(2, 128, -132, 0), mkBar(2, 128, 132, 0), mkBar(264, 2, 0, -64), mkBar(264, 2, 0, 64)].forEach(b => winGroup.add(b));
winGroup.position.set(204, 420, 0);
winGroup.visible = false;
scene.add(winGroup);
const divider = new THREE.Mesh(new THREE.BoxGeometry(2.5, 128, 2), new THREE.MeshBasicMaterial({ color: GOLD }));
divider.position.set(42, 420, 0);
scene.add(divider);
const ball = new VNode(scene, { radius: 10, x: 64, y: 320, z: 0, color: GOLD, emissive: GOLD });

// ---- ✕ 失配标记 ----
const xMark = new VText(scene, { text: '✕', x: 0, y: 368, z: 10, color: RED, scale: 0.7 });
xMark.sprite.visible = false;

// ---- chip 行 ×6：盒 + 文本，初始全隐 ----
const chipBox = CHIP_TXT.map((_, k) => {
  const c = new VBox(scene, { w: 104, h: 36, d: 18, x: cx(k), y: 535, z: 0, color: PALETTE.edge, emissive: PALETTE.edgeEmissive });
  c.mesh.material.transparent = true;
  c.mesh.material.opacity = 0.18;
  c.mesh.visible = false;
  return c;
});
const chipText = CHIP_TXT.map((t, k) => {
  const c = new VText(scene, { text: t, x: cx(k), y: 535, z: 24, color: GOLD, scale: 0.5 });
  c.sprite.visible = false;
  return c;
});

// ---- 频率行盒×7 + 频率编号×7（常显） ----
const freqBox = SYM.map((s, j) => new VBox(scene, { w: 44, h: 44, d: 44, x: fx(j), y: 400, z: 0, label: s, color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
const freqNum = FREQ.map((v, j) => new VText(scene, { text: String(v), x: fx(j), y: 440, z: 10, color: PALETTE.textDim, scale: 0.4 }));

// ---- 阶段二分界横条 ----
const stageBar = new THREE.Mesh(new THREE.BoxGeometry(560, 3, 2), new THREE.MeshBasicMaterial({ color: 0x475569 }));
stageBar.position.set(320, 386, 0);
scene.add(stageBar);

// ---- Huffman 树：叶子×7 常显（BLUE），内部节点×6 初始隐藏（YELLOW scale 0.01） ----
const leaf = SYM.map((s, j) => new VNode(scene, { radius: 20, x: fx(j), y: 490, z: 0, label: s, color: BLUE, emissive: BLUE }));
const mkIn = (name, x, y, r) => {
  const v = new VNode(scene, { radius: r, x, y, z: 0, label: name, color: YELLOW, emissive: YELLOW });
  v.mesh.scale.setScalar(0.01);
  v.mesh.visible = false;
  return v;
};
const PN = { P1: mkIn('P1', 104, 582, 20), P2: mkIn('P2', 344, 582, 20), P3: mkIn('P3', 424, 582, 20), P4: mkIn('P4', 244, 674, 20), P5: mkIn('P5', 384, 674, 20), root: mkIn('根', 314, 812, 26) };
const TP = { a: [64, 490], b: [144, 490], c: [224, 490], x: [304, 490], L5: [384, 490], D3: [464, 490], D6: [544, 490], P1: [104, 582], P2: [344, 582], P3: [424, 582], P4: [244, 674], P5: [384, 674], root: [314, 812] };
const EDGES = [['P1', 'a', 0], ['P1', 'b', 1], ['P2', 'c', 0], ['P2', 'D3', 1], ['P3', 'x', 0], ['P3', 'D6', 1], ['P4', 'L5', 0], ['P4', 'P1', 1], ['P5', 'P2', 0], ['P5', 'P3', 1], ['root', 'P4', 0], ['root', 'P5', 1]];
const edgeView = new Map();   // 树边动态创建（唯一例外），resetAll 时 remove+dispose
const mkEdge = (pa, ch, bit) => {
  const [px, py] = TP[pa], [qx, qy] = TP[ch];
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(px, py, 0), new THREE.Vector3((px + qx) / 2, (py + qy) / 2, 26), new THREE.Vector3(qx, qy, 0));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 14, 2.4, 6), new THREE.MeshBasicMaterial({ color: BLUE, transparent: true, opacity: 0 }));
  scene.add(mesh);
  const lbl = new VText(scene, { text: String(bit), x: (px + qx) / 2, y: (py + qy) / 2 + 26, z: 8, color: WHITE, scale: 0.55 });
  lbl.sprite.visible = false;
  edgeView.set(ch, { mesh, curve, lbl });
};

// ---- 码字表：7 盒 + 压缩率盒（透明基座常显），字符/码字/压缩率文本初始隐 ----
const cwBox = SYM.map((_, j) => {
  const b = new VBox(scene, { w: 60, h: 34, d: 18, x: cw(j), y: 755, z: 0, color: PALETTE.edge, emissive: PALETTE.edgeEmissive });
  b.mesh.material.transparent = true;
  b.mesh.material.opacity = 0.18;
  return b;
});
const ratioBox = new VBox(scene, { w: 60, h: 34, d: 18, x: 608, y: 755, z: 0, color: GOLD, emissive: GOLD });
ratioBox.mesh.material.transparent = true;
ratioBox.mesh.material.opacity = 0.18;
const cwChar = SYM.map((s, j) => new VText(scene, { text: s, x: cw(j), y: 755, z: 26, color: CYAN, scale: 0.5 }));
const cwCode = CODE.map((c, j) => new VText(scene, { text: c, x: cw(j), y: 721, z: 10, color: WHITE, scale: 0.45 }));
cwChar.forEach(t => t.sprite.visible = false);
cwCode.forEach(t => t.sprite.visible = false);

// ---- 比特流盒×8 + 文本 / 分组标签×2 / 「=22 位」 / 阴影盒×8 + 文本（全隐） ----
const bitBox = BITS.map((_, k) => new VBox(scene, { w: 52, h: 30, d: 16, x: bx(k), y: 652, z: 0, color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
const bitText = BITS.map((b, k) => new VText(scene, { text: b[1], x: bx(k), y: 652, z: 20, color: GOLD, scale: 0.5 }));
const grpLbl = [new VText(scene, { text: '第 9 位', x: 168, y: 610, z: 10, color: PALETTE.textDim, scale: 0.38 }), new VText(scene, { text: '第 17 位', x: 384, y: 610, z: 10, color: PALETTE.textDim, scale: 0.38 })];
const shadowBox = BITS.map((_, k) => new VBox(scene, { w: 52, h: 24, d: 10, x: bx(k), y: 690, z: 0, color: PALETTE.edge, emissive: PALETTE.edgeEmissive }));
const shadowText = [3, 6, 9, 11, 14, 17, 19, 22].map((v, k) => new VText(scene, { text: String(v), x: bx(k), y: 690, z: 10, color: PALETTE.textDim, scale: 0.4 }));
bitBox.forEach(b => b.mesh.visible = false);
bitText.forEach(t => t.sprite.visible = false);
grpLbl.forEach(t => t.sprite.visible = false);
shadowBox.forEach(b => b.mesh.visible = false);
shadowText.forEach(t => t.sprite.visible = false);

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
setArc(arcs[0], 124, 470, 30, 194, 545, 60, 264, 470, 30);
setArc(arcs[1], 264, 470, 30, 364, 545, 60, 464, 470, 30);
const parts = [0, 1, 2].map(() => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(3.5, 8, 8), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.9 }));
  fxGroup.add(m);
  return m;
});

// ---- 工具：窗框/分界条/金球同帧三组 lerp / 粒子沿弧 / chip 显示 / 合并完成 / 全复位 ----
const shiftTo = (k, ms, text) => {
  const wx0 = winGroup.position.x, dx0 = divider.position.x, bx0 = ball.mesh.position.x;
  winGroup.visible = true;
  return A(ms, t => {
    const e = ease(t);
    winGroup.position.x = lerp(wx0, winX(k), e);
    divider.position.x = lerp(dx0, mx(k) - 22, e);
    ball.mesh.position.x = lerp(bx0, mx(k), e);
    if (text) status.textContent = text;
  });
};
const flyPts = [0, 1, 2].map(() => new THREE.Vector3());
const flyParticles = (curve, ms) => A(ms, p => { const e = ease(p); parts.forEach((v, i) => v.position.copy(curve.getPoint((e + i * 0.18) % 1, flyPts[i]))); });
const showChip = k => { chipBox[k].mesh.visible = true; chipText[k].sprite.visible = true; };
const pulseLeaf = j => A(420, p => leaf[j].mesh.scale.setScalar(1 + 0.14 * Math.sin(p * Math.PI * 2)));
const mergeDone = (pa, ch1, ch2, label) => {  // 单帧 S 内瞬时完成合并（P2/P3/P4/P5/根）
  const v = PN[pa];
  v.mesh.visible = true;
  v.setText(label);
  v.mesh.scale.setScalar(1);
  mkEdge(pa, ch1, 0); mkEdge(pa, ch2, 1);
  const e1 = edgeView.get(ch1), e2 = edgeView.get(ch2);
  e1.mesh.material.opacity = 0.85; e2.mesh.material.opacity = 0.85;
  e1.lbl.sprite.visible = true; e2.lbl.sprite.visible = true;
};
function resetAll() {
  consumed.length = 0;
  charBox.forEach(b => { b.setColor(PALETTE.node, PALETTE.nodeEmissive); b.mesh.visible = true; });
  posNo.forEach(t => t.sprite.visible = true);
  winGroup.visible = false;
  winGroup.position.set(204, 420, 0);
  divider.position.set(42, 420, 0);
  ball.mesh.position.set(64, 320, 0);
  xMark.sprite.visible = false;
  fxGroup.visible = false;
  arcs.forEach(a => a.line.visible = true);
  setArc(arcs[0], 124, 470, 30, 194, 545, 60, 264, 470, 30);
  setArc(arcs[1], 264, 470, 30, 364, 545, 60, 464, 470, 30);
  chipBox.forEach(c => c.mesh.visible = false);
  chipText.forEach(c => c.sprite.visible = false);
  leaf.forEach(v => { v.mesh.visible = true; v.mesh.scale.setScalar(1); v.setColor(BLUE, BLUE); });
  Object.values(PN).forEach(v => { v.mesh.visible = false; v.mesh.scale.setScalar(0.01); });
  edgeView.forEach(e => { scene.remove(e.mesh); e.mesh.geometry.dispose(); e.mesh.material.dispose(); scene.remove(e.lbl.sprite); });
  edgeView.clear();
  freqBox.forEach(b => { b.setColor(PALETTE.node, PALETTE.nodeEmissive); b.mesh.visible = true; });
  freqNum.forEach(t => t.sprite.visible = true);
  cwBox.forEach(b => b.mesh.visible = true);
  ratioBox.mesh.visible = true;
  cwChar.forEach(t => t.sprite.visible = false);
  cwCode.forEach(t => t.sprite.visible = false);
  bitBox.forEach(b => b.mesh.visible = false);
  bitText.forEach(t => t.sprite.visible = false);
  grpLbl.forEach(t => t.sprite.visible = false);
  shadowBox.forEach(b => b.mesh.visible = false);
  shadowText.forEach(t => t.sprite.visible = false);
  status.textContent = '';
}

function* runDEFLATE() {
  // ============ 阶段一 LZ77（F1-F35） ============
  yield S(() => { resetAll(); status.textContent = 'DEFLATE 压缩：LZ77 阶段 —— 滑动窗口内找最长匹配，输出 字面量 或 (距离,长度)；TXT = abcabcabxabcab（14 字符）'; });
  yield W(600);
  yield S(() => { charBox[0].setColor(GOLD, GOLD); status.textContent = '① pos0：窗口为空，无匹配'; });
  yield W(400);
  yield S(() => { charBox[0].setColor(GREEN, GREEN); consumed.push(0); showChip(0); status.textContent = '① 输出字面量 a → token[1]=a，消费 [0]'; });
  yield W(500);
  yield shiftTo(1, 600, '② pos1：窗口 = "a"');
  yield S(() => { charBox[1].setColor(GOLD, GOLD); status.textContent = '② 窗口 [0..0] 内无 b → 输出字面量 b'; });
  yield W(400);
  yield S(() => { charBox[1].setColor(GREEN, GREEN); consumed.push(1); showChip(1); status.textContent = '② token[2]=b，消费 [1]'; });
  yield shiftTo(2, 600, '③ pos2：窗口 = "ab"，尝试候选偏移');
  yield S(() => { charBox[1].setColor(GOLD, GOLD); charBox[2].setColor(GOLD, GOLD); status.textContent = '③ 偏移 d=1：源 [1] = "b" ↔ 目标 [2] = "c"'; });
  yield W(300);
  yield S(() => { charBox[1].setColor(RED, RED); xMark.sprite.position.set(144, 368, 10); xMark.sprite.visible = true; status.textContent = '③ 偏移 d=1：源 "b" ≠ 目标 "c" → 失配'; });
  yield W(450);
  yield S(() => { charBox[1].setColor(PALETTE.node, PALETTE.nodeEmissive); xMark.sprite.visible = false; charBox[0].setColor(GOLD, GOLD); charBox[2].setColor(GOLD, GOLD); status.textContent = '③ 偏移 d=2：源 [0] = "a" ↔ 目标 [2] = "c"'; });
  yield W(300);
  yield S(() => { charBox[0].setColor(RED, RED); xMark.sprite.position.set(144, 368, 10); xMark.sprite.visible = true; status.textContent = '③ 偏移 d=2：源 "a" ≠ 目标 "c" → 失配，放弃'; });
  yield W(450);
  yield S(() => { xMark.sprite.visible = false; charBox[0].setColor(PALETTE.node, PALETTE.nodeEmissive); charBox[2].setColor(GREEN, GREEN); consumed.push(2); showChip(2); status.textContent = '③ d=1、d=2 均失配 → 输出字面量 c → token[3]=c，消费 [2]，游标 → pos3'; });
  yield shiftTo(3, 600, '④ pos3：窗口 = "abc"，尝试候选偏移');
  yield S(() => { for (let k = 0; k <= 2; k++) charBox[k].setColor(GOLD, GOLD); for (let k = 3; k <= 7; k++) charBox[k].setColor(GOLD, GOLD); status.textContent = '④ 偏移 d=3：源 [0..2] = "abc" 循环 ↔ 目标 [3..7]，连中 5 位（重叠匹配：距离 3 < 长度 5，源在目标内部）'; });
  yield W(600);
  yield S(() => { charBox[8].setColor(GOLD, GOLD); status.textContent = '④ 第 6 位 [8] = "x" ≠ 源循环 "c" → 停止 → 输出 (3,5)'; });
  yield S(() => { setArc(arcs[0], 124, 470, 30, 194, 545, 60, 264, 470, 30); fxGroup.visible = true; status.textContent = '④ 弧线示意源 [0..2] → 目标 [3..7]'; });
  yield flyParticles(arcs[0].curve, 650);
  yield S(() => { fxGroup.visible = false; for (let k = 0; k <= 2; k++) charBox[k].setColor(PALETTE.node, PALETTE.nodeEmissive); for (let k = 3; k <= 7; k++) charBox[k].setColor(GREEN, GREEN); consumed.push(3, 4, 5, 6, 7); showChip(3); status.textContent = '④ 输出 (3,5)，消费 [3..7]，游标 → pos8'; });
  yield W(600);
  yield shiftTo(8, 600, '⑤ pos8：窗口 [2..7] = "abcabc"，无 x → 输出字面量 x');
  yield S(() => { charBox[8].setColor(GREEN, GREEN); consumed.push(8); showChip(4); status.textContent = '⑤ token[5]=x，消费 [8]'; });
  yield W(600);
  yield shiftTo(9, 600, '⑥ pos9：窗口 [3..8]，找最长匹配');
  yield S(() => { for (let k = 3; k <= 7; k++) charBox[k].setColor(GOLD, GOLD); for (let k = 9; k <= 13; k++) charBox[k].setColor(GOLD, GOLD); arcs[0].line.visible = false; setArc(arcs[1], 264, 470, 30, 364, 545, 60, 464, 470, 30); fxGroup.visible = true; status.textContent = '⑥ 偏移 d=6：源 [3..7] = "abcab" ↔ 目标 [9..13]，连中 5 位（到串尾）→ 输出 (6,5)'; });
  yield flyParticles(arcs[1].curve, 650);
  yield S(() => { fxGroup.visible = false; for (let k = 3; k <= 8; k++) charBox[k].setColor(PALETTE.node, PALETTE.nodeEmissive); for (let k = 9; k <= 13; k++) charBox[k].setColor(GREEN, GREEN); consumed.push(9, 10, 11, 12, 13); showChip(5); winGroup.visible = false; divider.position.set(42, 420, 0); ball.mesh.position.set(64, 320, 0); charBox.forEach(b => b.mesh.visible = false); posNo.forEach(t => t.sprite.visible = false); status.textContent = '⑥ 输出 (6,5)，消费 [9..13]。LZ77 完成：14 字符 → 6 个 token：a b c (3,5) x (6,5)；压缩率 112/44 ≈ 2.5×（原始 14×8=112 位 / token 44 位）'; });
  // ============ 阶段切换（F36） ============
  yield S(() => { PN.root.setText('根'); status.textContent = 'Huffman 阶段：8 个符号（匹配 token 拆为 长度L5 + 距离D3/D6 两符号）→ 按频率建树；频率：a1 b1 c1 x1 L5×2 D3×1 D6×1'; });
  yield W(500);
  // ============ 阶段二 Huffman（F37-F87） ============
  yield A(420, p => { status.textContent = '① 考察符号 a（1 次）、b（1 次）、c（1 次）、x（1 次）、L5（2 次）、D3（1 次）、D6（1 次）'; leaf[0].mesh.scale.setScalar(1 + 0.14 * Math.sin(p * Math.PI * 2)); });
  yield pulseLeaf(1); yield pulseLeaf(2); yield pulseLeaf(3); yield pulseLeaf(4); yield pulseLeaf(5); yield pulseLeaf(6);
  yield S(() => { leaf[0].setColor(GOLD, GOLD); leaf[1].setColor(GOLD, GOLD); status.textContent = '② 取最小两棵：a(1) 与 b(1)'; });
  yield W(350);
  yield S(() => { PN.P1.mesh.visible = true; PN.P1.setText('P1(2)'); status.textContent = '② 合并 a+b → 节点 P1(2)'; });
  yield A(380, p => PN.P1.mesh.scale.setScalar(0.01 + 0.99 * ease(p)));
  yield S(() => { mkEdge('P1', 'a', 0); mkEdge('P1', 'b', 1); arcs[0].line.visible = false; arcs[1].line.visible = false; fxGroup.visible = true; status.textContent = '② 左 0 = a，右 1 = b'; });
  yield flyParticles(edgeView.get('a').curve, 300);
  yield flyParticles(edgeView.get('b').curve, 300);
  yield A(300, p => { const e1 = edgeView.get('a'), e2 = edgeView.get('b'); e1.mesh.material.opacity = 0.85 * p; e2.mesh.material.opacity = 0.85 * p; e1.lbl.sprite.visible = true; e2.lbl.sprite.visible = true; });
  yield S(() => { leaf[0].setColor(BLUE, BLUE); leaf[1].setColor(BLUE, BLUE); PN.P1.setColor(YELLOW, YELLOW); fxGroup.visible = false; status.textContent = '② 建树完成：P1(2)'; });
  yield S(() => { leaf[2].setColor(GOLD, GOLD); leaf[5].setColor(GOLD, GOLD); status.textContent = '③ 取最小两棵：c(1) 与 D3(1)'; });
  yield W(300);
  yield S(() => { mergeDone('P2', 'c', 'D3', 'P2(2)'); leaf[2].setColor(BLUE, BLUE); leaf[5].setColor(BLUE, BLUE); PN.P2.setColor(YELLOW, YELLOW); fxGroup.visible = true; status.textContent = '③ 合并 c+D3 → 节点 P2(2)，左 0 = c，右 1 = D3'; });
  yield flyParticles(edgeView.get('c').curve, 300);
  yield flyParticles(edgeView.get('D3').curve, 300);
  yield S(() => { leaf[3].setColor(GOLD, GOLD); leaf[6].setColor(GOLD, GOLD); fxGroup.visible = false; status.textContent = '④ 取最小两棵：x(1) 与 D6(1)'; });
  yield W(300);
  yield S(() => { mergeDone('P3', 'x', 'D6', 'P3(2)'); leaf[3].setColor(BLUE, BLUE); leaf[6].setColor(BLUE, BLUE); PN.P3.setColor(YELLOW, YELLOW); fxGroup.visible = true; status.textContent = '④ 合并 x+D6 → 节点 P3(2)，左 0 = x，右 1 = D6'; });
  yield flyParticles(edgeView.get('x').curve, 300);
  yield flyParticles(edgeView.get('D6').curve, 300);
  yield S(() => { leaf[4].setColor(GOLD, GOLD); PN.P1.setColor(GOLD, GOLD); fxGroup.visible = false; status.textContent = '⑤ 取最小两棵：L5(2) 与 P1(2)'; });
  yield W(300);
  yield S(() => { mergeDone('P4', 'L5', 'P1', 'P4(4)'); leaf[4].setColor(BLUE, BLUE); PN.P1.setColor(YELLOW, YELLOW); PN.P4.setColor(YELLOW, YELLOW); fxGroup.visible = true; status.textContent = '⑤ 合并 L5+P1 → 节点 P4(4)，左 0 = L5，右 1 = P1'; });
  yield flyParticles(edgeView.get('L5').curve, 300);
  yield flyParticles(edgeView.get('P1').curve, 300);
  yield S(() => { PN.P2.setColor(GOLD, GOLD); PN.P3.setColor(GOLD, GOLD); fxGroup.visible = false; status.textContent = '⑥ 取最小两棵：P2(2) 与 P3(2)'; });
  yield W(300);
  yield S(() => { mergeDone('P5', 'P2', 'P3', 'P5(4)'); PN.P2.setColor(YELLOW, YELLOW); PN.P3.setColor(YELLOW, YELLOW); PN.P5.setColor(YELLOW, YELLOW); fxGroup.visible = true; status.textContent = '⑥ 合并 P2+P3 → 节点 P5(4)，左 0 = P2，右 1 = P3'; });
  yield flyParticles(edgeView.get('P2').curve, 300);
  yield flyParticles(edgeView.get('P3').curve, 300);
  yield S(() => { PN.P4.setColor(GOLD, GOLD); PN.P5.setColor(GOLD, GOLD); fxGroup.visible = false; status.textContent = '⑦ 取最小两棵：P4(4) 与 P5(4)'; });
  yield W(300);
  yield S(() => { mergeDone('root', 'P4', 'P5', '根(8)'); PN.P4.setColor(YELLOW, YELLOW); PN.P5.setColor(YELLOW, YELLOW); fxGroup.visible = true; status.textContent = '⑦ 合并 P4+P5 → 根(8)。建树完成：7 个符号、6 次合并'; });
  yield flyParticles(edgeView.get('P4').curve, 300);
  yield flyParticles(edgeView.get('P5').curve, 300);
  yield S(() => { fxGroup.visible = false; ['P4', 'L5'].forEach(nm => edgeView.get(nm).mesh.material.color.setHex(GOLD)); status.textContent = '⑧ 从根沿 0 走到 L5：00'; });
  yield W(450);
  yield S(() => { ['P1', 'a', 'b'].forEach(nm => edgeView.get(nm).mesh.material.color.setHex(GOLD)); status.textContent = '⑧ 沿 0 走到 P1：010 → a，011 → b'; });
  yield A(600, p => { cwChar[0].sprite.visible = true; cwCode[0].sprite.visible = true; status.textContent = '⑧ 码字：a = 010'; });
  yield S(() => { cwChar[1].sprite.visible = true; cwCode[1].sprite.visible = true; status.textContent = '⑧ 码字：b = 011'; });
  yield S(() => { cwChar[2].sprite.visible = true; cwCode[2].sprite.visible = true; status.textContent = '⑧ 码字：c = 100'; });
  yield S(() => { cwChar[4].sprite.visible = true; cwCode[4].sprite.visible = true; status.textContent = '⑧ 码字：L5 = 00'; });
  yield S(() => { cwChar[5].sprite.visible = true; cwCode[5].sprite.visible = true; status.textContent = '⑧ 码字：D3 = 101'; });
  yield S(() => { cwChar[3].sprite.visible = true; cwCode[3].sprite.visible = true; status.textContent = '⑧ 码字：x = 110'; });
  yield S(() => { cwChar[6].sprite.visible = true; cwCode[6].sprite.visible = true; status.textContent = '⑧ 码字：D6 = 111'; });
  yield S(() => { cwChar.forEach(t => t.sprite.visible = true); cwCode.forEach(t => t.sprite.visible = true); status.textContent = '⑨ 完整码字表（左 0 右 1）：a=010 b=011 c=100 x=110 L5=00 D3=101 D6=111'; });
  yield A(600, p => { bitBox[0].mesh.visible = true; bitText[0].sprite.visible = true; status.textContent = '⑩ 比特流：a → 010'; });
  yield S(() => { bitBox[1].mesh.visible = true; bitText[1].sprite.visible = true; status.textContent = '⑩ 比特流：a b → 010 011'; });
  yield S(() => { bitBox[2].mesh.visible = true; bitText[2].sprite.visible = true; status.textContent = '⑩ 比特流：a b c → 010 011 100'; });
  yield S(() => { bitBox[3].mesh.visible = true; bitText[3].sprite.visible = true; grpLbl[0].sprite.visible = true; status.textContent = '⑩ 比特流：L5 → 00，第 10 位起；至此 9 位'; });
  yield S(() => { bitBox[4].mesh.visible = true; bitText[4].sprite.visible = true; status.textContent = '⑩ 比特流：D3 → 101，至此 14 位'; });
  yield S(() => { bitBox[5].mesh.visible = true; bitText[5].sprite.visible = true; status.textContent = '⑩ 比特流：x → 110，至此 17 位'; });
  yield S(() => { bitBox[6].mesh.visible = true; bitText[6].sprite.visible = true; grpLbl[1].sprite.visible = true; status.textContent = '⑩ 比特流：L5 → 00，第 18 位起；至此 19 位'; });
  yield S(() => { bitBox[7].mesh.visible = true; bitText[7].sprite.visible = true; status.textContent = '⑩ 比特流：D6 → 111，至此 22 位'; });
  yield W(600);
  yield S(() => { status.textContent = '⑩ 总长 22 位 = 0100111000010111000111；⑪ 压缩率 = 112 / 22 ≈ 5.1×（理想熵下界：不含块头、Huffman 树表与校验码；6 个 token 若直接编码约 44 位）'; });
  yield W(800);
}

engine.queue(() => runDEFLATE());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
