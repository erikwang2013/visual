// AlgorithmLibrary/SM43D.js — SM4 国密分组密码：32 轮 Feistel，轮密钥由 MK 经 T' 变换生成 —— 国密标准 GB/T 32907
// draw.io 风格实体图标：服务器机架 4 行（明文/轮密钥/轮状态/密文），每行 4 槽 = 32 位数据字
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VTorus } from '../3D/VisualObject3D.js';
import { glowMaterial, PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('SM43D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, ROSE = 0xfb7185, CYAN = 0x67e8f9, VIOLET = 0xa78bfa, AMBER = 0xfbbf24;
const hint = new VText(scene, { text: '点击「运行 SM4」开始', x: 0, y: 290, z: 0, color: PALETTE.textGlow, scale: 0.78 });
const status = panel.addStatus('');

const MK = ['01234567', '89abcdef', 'fedcba98', '76543210'];
const rks = ['f12186f9', '41662b61', '5a6ab19a', '7ba92077'];
const X4 = ['27fad345', 'a18b4cb2', '11c1e22a', 'cc13e2ee'];
const CT = ['681edf34', 'd206965e', '86b3e94f', '536e4246'];

const ROW_Y = { plain: 155, key: 30, mid: -95, ct: -220 };
const XS = [-165, -77, 11, 99];
// draw.io 机架槽：槽盒 + 前方数据字标签
function makeSlot(x, y, w = 80) {
  const g = new THREE.Group();
  const rack = new THREE.Mesh(new THREE.BoxGeometry(w, 44, 26),
    glowMaterial(DIM, { emissive: 0x1e3a8a, emissiveIntensity: 0.35 }));
  const slot = new THREE.Mesh(new THREE.BoxGeometry(w - 16, 9, 3),
    glowMaterial(DIM, { emissive: DIM, emissiveIntensity: 0.15 }));
  slot.position.set(0, 0, 14.5);
  g.add(rack, slot);
  g.position.set(x, y, 0);
  scene.add(g);
  return g;
}
const rowGroups = {
  plain: MK.map((_, i) => makeSlot(XS[i], ROW_Y.plain)),
  key: rks.map((_, i) => makeSlot(XS[i], ROW_Y.key)),
  mid: X4.map((_, i) => makeSlot(XS[i], ROW_Y.mid)),
  ct: CT.map((_, i) => makeSlot(XS[i], ROW_Y.ct)),
};
// 数据字文本（机架前方 z=20，永远可见）
const cellT = {
  plain: MK.map((v, i) => new VText(scene, { text: v, x: XS[i], y: ROW_Y.plain, z: 20, color: CYAN, scale: 0.5 })),
  key: rks.map((v, i) => new VText(scene, { text: '', x: XS[i], y: ROW_Y.key, z: 20, color: VIOLET, scale: 0.5 })),
  mid: X4.map((v, i) => new VText(scene, { text: '', x: XS[i], y: ROW_Y.mid, z: 20, color: AMBER, scale: 0.5 })),
  ct: CT.map((v, i) => new VText(scene, { text: '', x: XS[i], y: ROW_Y.ct, z: 20, color: GOLD, scale: 0.5 })),
};
new VText(scene, { text: '明文 X0..X3', x: -395, y: ROW_Y.plain, z: 0, color: CYAN, scale: 0.5 });
new VText(scene, { text: '轮密钥 rk0..rk3', x: -395, y: ROW_Y.key, z: 0, color: VIOLET, scale: 0.5 });
new VText(scene, { text: '轮状态 X4..X7', x: -395, y: ROW_Y.mid, z: 0, color: AMBER, scale: 0.5 });
new VText(scene, { text: '密文 C', x: -395, y: ROW_Y.ct, z: 0, color: GOLD, scale: 0.5 });

const stageT = new VText(scene, { text: '', x: 0, y: 222, z: 0, color: GOLD, scale: 0.62, maxWidth: 820 });
const eqT = new VText(scene, { text: '', x: 0, y: 90, z: 0, color: PALETTE.textGlow, scale: 0.5, maxWidth: 780 });
const outT = new VText(scene, { text: '', x: 0, y: -290, z: 0, color: PALETTE.textGlow, scale: 0.58, maxWidth: 900 });
new VText(scene, { text: '一轮：X[i+4] = X[i] ⊕ T(X[i+1]⊕X[i+2]⊕X[i+3]⊕rk[i]) —— 32 轮后反序输出密文', x: 0, y: -330, z: 0, color: PALETTE.textDim, scale: 0.55, maxWidth: 900 });

// 轮数徽章（右侧）：旋转圆环 + 轮数
const badgeT = new VText(scene, { text: '', x: 322, y: 90, z: 0, color: GOLD, scale: 0.62 });
const badgeRing = new VTorus(scene, { radius: 42, x: 322, y: 90, z: 0, color: GOLD });

// 飞行数据字（轮函数输出 → 轮状态行）
const flyBox = new VBox(scene, { w: 34, h: 26, d: 26, x: 0, y: 0, z: 0, label: '', color: AMBER, emissive: AMBER });
flyBox.mesh.visible = false;

// 汇聚箭头（参与字 → 轮函数）用细线表示
const mergeLine = new VBox(scene, { w: 60, h: 3, d: 3, x: 0, y: 0, z: 0, label: '', color: CYAN, emissive: CYAN });
mergeLine.mesh.visible = false;

function setCell(kind, i, v, color) {
  cellT[kind][i].setText(v, { color });
  const g = rowGroups[kind][i];
  const m = g.children[0].material;
  m.color.setHex(color); m.emissive.setHex(color); m.emissiveIntensity = 0.55;
}
function resetAll() {
  engine.clear();
  flyBox.mesh.visible = false; mergeLine.mesh.visible = false;
  badgeT.setText('');
  ['plain', 'key', 'mid', 'ct'].forEach(kind => {
    XS.forEach((_, i) => {
      const g = rowGroups[kind][i];
      const m = g.children[0].material;
      m.color.setHex(DIM); m.emissive.setHex(0x1e3a8a); m.emissiveIntensity = 0.35;
      cellT[kind][i].setText(kind === 'plain' ? MK[i] : '');
    });
  });
  stageT.setText(''); eqT.setText(''); outT.setText('');
}

// 命令内进度动画
function pulseOf(mesh, p) { const s = 1 + 0.18 * Math.sin(p * Math.PI); mesh.scale.set(s, s, s); }
function spinOf(mesh, p) { mesh.rotation.z = p * Math.PI * 2; }
function bobOf(mesh, p, amp = 8) { mesh.position.y += amp * Math.sin(p * Math.PI); }

function runSM4() {
  resetAll();
  hint.setText('SM4 = 中国商用分组密码：128 位按 32 位字处理，每轮一个「T 函数」（S 盒 + 循环左移 2/10/18/24）');
  C(500, (p) => { rowGroups.plain.forEach((g, i) => pulseOf(g, Math.max(0, p - i * 0.1))); });
  C(600, () => {
    stageT.setText('明文 0123456789abcdeffedcba9876543210 —— 切分为 4 个字 X0..X3（青）');
    hint.setText('分组密码的「分组」= 128 位；每轮输出字位置轮转，32 轮后逆序输出为密文');
  });
  C(750, (p) => {
    rks.forEach((v, i) => setCell('key', i, v, VIOLET));
    rowGroups.key.forEach((g, i) => spinOf(g, Math.max(0, p - i * 0.12)));
    stageT.setText('密钥 → 轮密钥 rk0..rk3（紫）：rk0 = f12186f9（标准测试向量 ✓）');
    eqT.setText('密钥扩展：MK 与固定参数 FK 异或，经 T′（S 盒 + 左移 13/23）逐轮推出 rk[i]', { color: VIOLET });
  });
  C(800, () => {
    mergeLine.mesh.position.set((XS[0] + XS[3]) / 2, ROW_Y.plain - 20, 0);
    mergeLine.mesh.visible = true;
    rowGroups.plain.forEach(g => { g.children[0].material.emissiveIntensity = 0.8; });
    stageT.setText('第 1 轮：X0 ⊕ X1 ⊕ X2 ⊕ X3 ⊕ rk0 汇聚进 T 函数（青蓝线 = 数据汇流）');
  });
  C(900, (p) => {
    setCell('mid', 0, X4[0], AMBER);
    flyBox.mesh.visible = true;
    flyBox.mesh.position.set((XS[0]) * p, 90 - (90 - ROW_Y.mid) * p, 0);
    pulseOf(rowGroups.mid[0], p);
    eqT.setText('第 1 轮：X4 = X0 ⊕ T(X1⊕X2⊕X3⊕rk0) = 27fad345', { color: AMBER });
    stageT.setText('轮 1：新字 X4 = 27fad345（琥珀）—— T 函数内部先过 S 盒再循环异或');
    badgeT.setText('轮 1 / 32');
    if (p >= 0.95) flyBox.mesh.visible = false;
  });
  C(800, (p) => {
    mergeLine.mesh.visible = false;
    rowGroups.plain.forEach(g => { g.children[0].material.emissiveIntensity = 0.35; });
    setCell('mid', 1, X4[1], AMBER);
    flyBox.mesh.visible = true;
    flyBox.mesh.position.set((XS[1]) * p, 90 - (90 - ROW_Y.mid) * p, 0);
    spinOf(rowGroups.mid[1], p);
    eqT.setText('第 2 轮：X5 = X1 ⊕ T(X2⊕X3⊕X4⊕rk1) = a18b4cb2', { color: AMBER });
    stageT.setText('轮 2：X5 = a18b4cb2 —— 轮密钥轮换（rk1 = 41662b61），这就是「密钥调度」的意义');
    badgeT.setText('轮 2 / 32');
    if (p >= 0.95) flyBox.mesh.visible = false;
  });
  C(800, (p) => {
    setCell('mid', 2, X4[2], AMBER);
    flyBox.mesh.visible = true;
    flyBox.mesh.position.set((XS[2]) * p, 90 - (90 - ROW_Y.mid) * p, 0);
    bobOf(rowGroups.mid[2], p, 6);
    eqT.setText('第 3 轮：X6 = X2 ⊕ T(X3⊕X4⊕X5⊕rk2) = 11c1e22a', { color: AMBER });
    stageT.setText('轮 3：X6 = 11c1e22a —— 窗口逐字后移，S 盒把字节搅散（差分均匀度 ≤ 2⁻⁶）');
    badgeT.setText('轮 3 / 32');
    if (p >= 0.95) flyBox.mesh.visible = false;
  });
  C(800, (p) => {
    setCell('mid', 3, X4[3], AMBER);
    flyBox.mesh.visible = true;
    flyBox.mesh.position.set((XS[3]) * p, 90 - (90 - ROW_Y.mid) * p, 0);
    pulseOf(rowGroups.mid[3], p);
    eqT.setText('第 4 轮：X7 = X3 ⊕ T(X4⊕X5⊕X6⊕rk3) = cc13e2ee', { color: AMBER });
    stageT.setText('轮 4：X7 = cc13e2ee —— 前 4 轮后 4 个字已全部搅动过一遍，后续循环往复');
    badgeT.setText('轮 4 / 32');
    if (p >= 0.95) flyBox.mesh.visible = false;
  });
  C(1000, (p) => {
    CT.forEach((v, i) => setCell('ct', i, v, GOLD));
    const s = 1 + 0.1 * Math.sin(p * Math.PI);
    rowGroups.ct.forEach(g => { g.scale.set(s, s, s); if (p >= 1) g.scale.set(1, 1, 1); });
    eqT.setText('32 轮后反序输出：(X35, X34, X33, X32) 整理 = 681edf34…（金）', { color: GOLD });
    stageT.setText('加密完成：C = 681edf34d206965e86b3e94f536e4246 —— 与标准测试向量完全一致 ✓');
    hint.setText('解密就是同一结构跑 32 轮、轮密钥反序 —— 国密家族（SM2/SM3/SM4）已进国际标准 ISO/IEC');
    badgeT.setText('32 / 32 完成');
  });
  C(1200, () => {
    outT.setText('复杂度 O(32) 轮 × 常数；应用：国内商用密码体系、金融 IC 卡、SM 系列证书体系 —— 与 AES 并列为两大分组密码');
    status.textContent = 'SM4：明文 0123456789abcdeffedcba9876543210 → 密文 681edf34d206965e86b3e94f536e4246（32 轮 Feistel）';
    hint.setText('对比 DES/AES：SM4 每轮只更新 1 个字（轻量轮函数），32 轮补足扩散 —— 麻雀虽小五脏俱全');
  });
}

// 常驻动画：数据字浮动 + 徽章环旋转（与 scene.start 的 rAF 并存）
let idleT = 0, lastTs = performance.now();
function idleLoop() {
  requestAnimationFrame(idleLoop);
  const now = performance.now();
  const dt = Math.min((now - lastTs) / 1000, 0.05); lastTs = now;
  idleT += dt;
  const rows = [rowGroups.plain, rowGroups.key, rowGroups.mid, rowGroups.ct];
  const names = ['plain', 'key', 'mid', 'ct'];
  rows.forEach((row, r) => {
    row.forEach((g, i) => {
      g.position.y = ROW_Y[names[r]] + Math.sin(idleT * 0.9 + r * 1.7 + i * 0.8) * 2.5;
      const m = g.children[0].material;
      if (m.color.getHex() === DIM) m.emissiveIntensity = 0.35;
      else m.emissiveIntensity = 0.45 + 0.15 * Math.sin(idleT * 2 + i);
    });
  });
  badgeRing.update(dt);
}
idleLoop();

panel.addButton('运行 SM4', runSM4);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；青=明文，紫=轮密钥，琥珀=轮状态，金=密文；右侧=轮数徽章）');

scene.start(engine);
