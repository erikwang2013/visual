// AlgorithmLibrary/ArithmeticCoding3D.js — 算术编码：消息 ABACABA 映射为 [0,1) 内一个区间，
// 每步「细分窄缩 → 弹回全宽 + 比特 chip 落入位流行」，码字 0.0100110100₂（10 bit）恰好达到熵下界（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VNode, VTorus } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('ArithmeticCoding3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GOLD = 0xfde047, GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x60a5fa;
const status = panel.addStatus('就绪');

// ---- 演示体与步数据（全部硬编码，勿运行时计算；数值依据 /tmp/arithc_research.md §2 BigInt 验证） ----
const MSG = 'ABACABA';                                  // 7 字符，静态模型 P(A)=½、P(B)=¼、P(C)=¼
const SYM = ['A', 'B', 'A', 'C', 'A', 'B', 'A'];        // 每步符号（解码顺序恰为左→右）
const CELLS = [[0], [1, 2], [3], [4, 5], [6], [7, 8], [9]];   // 每步输出位落格 k=0..9
const BITS = ['0', '1', '0', '0', '1', '1', '0', '1', '0', '0'];  // 10 格比特（0/10/0/11/0/10/0 展平）
const OUT = ['0', '010', '0100', '010011', '0100110', '010011010', '0100110100'];  // 每步已输出位
const RANGE = [                                          // 每步区间端点（8 位截断，非四舍五入）
  '[0.00000000, 0.50000000)',
  '[0.25000000, 0.37500000)',
  '[0.25000000, 0.31250000)',
  '[0.29687500, 0.31250000)',
  '[0.29687500, 0.30468750)',
  '[0.30078125, 0.30273437)',
  '[0.30078125, 0.30175781)',
];

const lerp = (a, b, p) => a + (b - a) * p;
const ease = p => p * p * (3 - 2 * p);
const mxC = k => (k - 3) * 48 + 320;         // 字符盒/编号/金环 x：176..464
const bitX = k => (k - 4.5) * 44 + 320;      // 位流行格/比特文本 x：122..518

// ---- 区间条：底盒 + 三段（A绿/B黄/C蓝，静态比例 ½/¼/¼ 每步恒定） ----
const bgBar = new VBox(scene, { w: 560, h: 44, d: 26, x: 320, y: 660, z: 0, color: PALETTE.edge, emissive: PALETTE.edgeEmissive });
bgBar.mesh.material.transparent = true;
bgBar.mesh.material.opacity = 0.15;
const segA = new VBox(scene, { w: 280, h: 38, d: 12, x: 180, y: 660, z: 8, color: GREEN, emissive: GREEN });
const segB = new VBox(scene, { w: 140, h: 38, d: 12, x: 390, y: 660, z: 8, color: YELLOW, emissive: YELLOW });
const segC = new VBox(scene, { w: 140, h: 38, d: 12, x: 530, y: 660, z: 8, color: BLUE, emissive: BLUE });
[segA, segB, segC].forEach(s => { s.mesh.material.transparent = true; s.mesh.material.opacity = 0.75; });
// 段参数：静止 x / 屏幕边界 s0..s1 / 未选段（窄缩/弹回目标一律从静止态出发）
const SEG = {
  A: { seg: segA, sx: 180, s0: 40, s1: 320, oth: [segB, segC] },
  B: { seg: segB, sx: 390, s0: 320, s1: 460, oth: [segA, segC] },
  C: { seg: segC, sx: 530, s0: 460, s1: 600, oth: [segA, segB] },
};

// ---- 细分金标（选中段左右边界竖条，2×46×2）+ 概率/端点标签 ----
const mkBar = (w, h, x, y) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 2), new THREE.MeshBasicMaterial({ color: GOLD }));
  m.position.set(x, y, 14);
  m.visible = false;
  scene.add(m);
  return m;
};
const marks = [mkBar(2, 46, 40, 660), mkBar(2, 46, 320, 660)];
new VText(scene, { text: '½', x: 180, y: 735, z: 20, color: PALETTE.text, scale: 0.5 });
new VText(scene, { text: '¼', x: 390, y: 735, z: 20, color: PALETTE.text, scale: 0.5 });
new VText(scene, { text: '¼', x: 530, y: 735, z: 20, color: PALETTE.text, scale: 0.5 });
new VText(scene, { text: '0', x: 40, y: 735, z: 20, color: PALETTE.textDim, scale: 0.45 });
new VText(scene, { text: '1', x: 600, y: 735, z: 20, color: PALETTE.textDim, scale: 0.45 });

// ---- 位流行：10 空槽 + 10 比特文本（初始隐藏，下落即最终位） ----
const bitBox = BITS.map((_, k) => {
  const c = new VBox(scene, { w: 40, h: 40, d: 16, x: bitX(k), y: 530, z: 0, color: PALETTE.edge, emissive: PALETTE.edgeEmissive });
  c.mesh.material.transparent = true;
  c.mesh.material.opacity = 0.18;
  return c;
});
const bitText = BITS.map((b, k) => {
  const t = new VText(scene, { text: b, x: bitX(k), y: 530, z: 24, color: GOLD, scale: 0.55 });
  t.sprite.visible = false;
  return t;
});

// ---- 字符盒行（ABACABA）+ 位置编号 + 金环 + 金球 + 码字文本 ----
const box = [...MSG].map((ch, k) => new VBox(scene, { w: 38, h: 38, d: 38, x: mxC(k), y: 420, z: 0, label: ch, color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
const num = [...MSG].map((_, k) => new VText(scene, { text: String(k), x: mxC(k), y: 458, z: 10, color: PALETTE.textDim, scale: 0.45 }));
const ring = new VTorus(scene, { radius: 14, x: mxC(0), y: 420, z: 12, color: GOLD });
ring.mesh.visible = false;
const ball = new VNode(scene, { radius: 10, x: 40, y: 660, z: 18, color: GOLD, emissive: GOLD });
ball.mesh.visible = false;
const codeText = new VText(scene, { text: '0.0100110100₂', x: 320, y: 780, z: 20, color: GOLD, scale: 0.55 });
codeText.sprite.visible = false;

// ---- 全复位（清空按钮与生成器首帧共用） ----
function resetAll() {
  box.forEach(b => b.setColor(PALETTE.node, PALETTE.nodeEmissive));
  ring.mesh.visible = false;
  bgBar.mesh.scale.set(1, 1, 1); bgBar.mesh.position.set(320, 660, 0);
  segA.mesh.scale.set(1, 1, 1); segA.mesh.position.set(180, 660, 8); segA.mesh.material.opacity = 0.75;
  segB.mesh.scale.set(1, 1, 1); segB.mesh.position.set(390, 660, 8); segB.mesh.material.opacity = 0.75;
  segC.mesh.scale.set(1, 1, 1); segC.mesh.position.set(530, 660, 8); segC.mesh.material.opacity = 0.75;
  marks[0].position.set(40, 660, 14); marks[1].position.set(320, 660, 14);
  marks.forEach(m => { m.visible = false; });
  bitBox.forEach(c => { c.mesh.visible = true; c.mesh.material.opacity = 0.18; });
  bitText.forEach((t, k) => { t.sprite.visible = false; t.sprite.position.set(bitX(k), 530, 24); });
  ball.mesh.visible = false; ball.tweenPos = null;
  codeText.sprite.visible = false;
}

function* runArithCoding() {
  yield S(resetAll);
  yield S(() => { status.textContent = '算术编码：静态模型 P(A)=½，P(B)=¼，P(C)=¼；消息 ABACABA（7 字符）'; });
  yield W(1500);
  // 段 2：7 步编码主循环（每步细分窄缩 → 弹回全宽 + 比特 chip 落位流行）
  for (let i = 0; i < 7; i++) {
    const sym = SYM[i], T = SEG[sym], cells = CELLS[i];
    const wSel = T.s1 - T.s0, nsSel = wSel / 560, exSel = 560 / wSel;
    // 帧：ring 移到当前字符盒 + 状态栏
    yield S(() => {
      ring.mesh.visible = true;
      ring.moveTo(mxC(i), 420, 12, 300);
      status.textContent = '第 ' + (i + 1) + ' 步：读到『' + sym + '』，区间细分';
    });
    yield W(200);
    // 帧：段高亮（opacity）+ 细分金标移到选中段边界
    yield S(() => {
      segA.mesh.material.opacity = sym === 'A' ? 1 : 0.3;
      segB.mesh.material.opacity = sym === 'B' ? 1 : 0.3;
      segC.mesh.material.opacity = sym === 'C' ? 1 : 0.3;
      marks[0].position.x = T.s0; marks[1].position.x = T.s1;
      marks[0].visible = true; marks[1].visible = true;
    });
    yield W(300);
    // 帧：窄缩 A(420) — 条缩到选中段、选中段反扩、未选段塌缩
    yield A(420, p => {
      const e = ease(p);
      bgBar.mesh.position.x = lerp(320, T.sx, e);
      bgBar.mesh.scale.x = lerp(1, nsSel, e);
      T.seg.mesh.scale.x = lerp(1, exSel, e);
      T.oth.forEach(o => { o.mesh.scale.x = lerp(1, 0.001, e); o.mesh.material.opacity = lerp(0.3, 0, e); });
    });
    yield W(200);
    // 帧：弹回 A(480) + 第一个 chip 下落（合并进同一个 A；金标隐藏）
    yield S(() => {
      const k0 = cells[0];
      bitText[k0].sprite.position.set(bitX(k0), 700, 30);
      bitText[k0].sprite.visible = true;
      marks[0].visible = false; marks[1].visible = false;
    });
    yield A(480, p => {
      const e = ease(p);
      bgBar.mesh.position.x = lerp(T.sx, 320, e);
      bgBar.mesh.scale.x = lerp(nsSel, 1, e);
      T.seg.mesh.scale.x = lerp(exSel, 1, e);
      T.seg.mesh.material.opacity = lerp(1, 0.75, e);
      T.oth.forEach(o => { o.mesh.scale.x = lerp(0.001, 1, e); o.mesh.material.opacity = lerp(0, 0.75, e); });
      bitText[cells[0]].sprite.position.y = lerp(700, 530, e);
      bitText[cells[0]].sprite.position.z = lerp(30, 24, e);
    });
    // B/C 步第二个 chip：独立 A(480)（前一 chip 已落定）
    if (cells.length > 1) {
      yield S(() => {
        const k1 = cells[1];
        bitText[k1].sprite.position.set(bitX(k1), 700, 30);
        bitText[k1].sprite.visible = true;
      });
      yield A(480, p => {
        const e = ease(p);
        bitText[cells[1]].sprite.position.y = lerp(700, 530, e);
        bitText[cells[1]].sprite.position.z = lerp(30, 24, e);
      });
    }
    // 帧：状态栏区间
    yield S(() => { status.textContent = '第 ' + (i + 1) + ' 步 → 区间 ' + RANGE[i] + '，已输出 ' + OUT[i]; });
    yield W(200);
  }
  // 段 3：码字展开 + 金球滑到码值 + 解码回环
  yield S(() => {
    bitBox.forEach(c => { c.mesh.material.opacity = 1; });
    codeText.sprite.visible = true;
    status.textContent = '编码完成：位流 = 码字 0.0100110100₂（10 bit，十进制 0.30078125）';
  });
  yield W(600);
  yield S(() => {
    ball.mesh.visible = true;
    ball.mesh.position.set(40, 660, 18);
    status.textContent = '码值 = 区间左端点 0.30078125；全程无 E3 进位（端点均为 2 的幂）';
  });
  yield W(300);
  yield S(() => { ball.moveTo(208.44, 660, 18, 700); });
  yield A(700, () => {});
  yield S(() => { status.textContent = '解码回环：按码字 0.0100110100₂ 重新细分，还原消息'; });
  yield W(400);
  for (let k = 0; k < 7; k++) {
    yield S(() => { ring.mesh.visible = true; ring.moveTo(mxC(k), 420, 12, 300); box[k].setColor(GREEN, GREEN); });
    yield W(280);
  }
  yield S(() => { status.textContent = '解码回环 ✓：ABACABA = 原消息'; });
  yield W(700);
  yield S(() => { status.textContent = 'ABACABA → 0.0100110100₂（10 bit = 熵下界 4×1+2×2+1×2）'; });
  yield W(1500);
}

engine.queue(() => runArithCoding());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
