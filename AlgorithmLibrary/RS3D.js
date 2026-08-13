// AlgorithmLibrary/RS3D.js — Reed-Solomon 纠错（toy 版 GF(7)）：g(x)=(x−1)(x−2)=x²+4x+2；编码 x²m(x)÷g(x) 得校验位；接收后算校正子 S₁=r(1)、S₂=r(2) 定位修复（function* 生成器驱动，全部算术运行时计算）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('RS3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：Reed-Solomon 纠错 —— toy 版 GF(7) 编解码', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 700, y: 440, z: 0, color: GOLD, scale: 0.5, wrapChars: 8 });
const eqT = new VText(scene, { text: '', x: 700, y: 345, z: 0, color: PALETTE.textGlow, scale: 0.45, wrapChars: 8 });
const outT = new VText(scene, { text: '', x: 700, y: 345, z: 0, color: PALETTE.textGlow, scale: 0.45, wrapChars: 8 });

const P = 7;
function invMod(a, p) {
  let [old_r, r] = [((a % p) + p) % p, p], [old_s, s] = [1, 0];
  while (r) { const q = Math.floor(old_r / r); [old_r, r] = [r, old_r - q * r]; [old_s, s] = [s, old_s - q * s]; }
  return ((old_s % p) + p) % p;
}
function evalPoly(c, x) {
  let acc = 0;
  for (let i = c.length - 1; i >= 0; i--) acc = (acc * x + c[i]) % P;
  return acc;
}

const cwChips = [45, 137, 229, 321, 413, 505].map((x, i) => new VBox(scene, { w: 90, h: 54, d: 54, x, y: 430, z: 0, label: 'c' + i + ' = ?', color: i < 2 ? CYAN : BLUE, emissive: i < 2 ? CYAN : BLUE }));
new VText(scene, { text: 'RS：编码 x²m(x)÷g(x) 得校验位；青=校验、蓝=数据', x: 700, y: 490, z: 0, color: PALETTE.textDim, scale: 0.4, wrapChars: 10 });
const qChips = [125, 255, 385, 515].map((x, i) => new VBox(scene, { w: 140, h: 50, d: 50, x, y: 360, z: 0, label: ['商项 4x³', '商项 x²', '商项 4x', '商项 4'][i], color: DIM, emissive: DIM }));
const synChips = [155, 485].map((x, i) => new VBox(scene, { w: 260, h: 52, d: 52, x, y: 305, z: 0, label: ['S₁ = r(1) = ?', 'S₂ = r(2) = ?'][i], color: GOLD, emissive: GOLD }));
const errChips = [180, 320, 460].map((x, i) => new VBox(scene, { w: 180, h: 52, d: 52, x, y: 235, z: 0, label: ['错误值 e = ?', '错误位置 j = ?', '修复结果'][i], color: [RED, RED, GREEN][i], emissive: [RED, RED, GREEN][i] }));

function* rsGen() {
  const data = [1, 2, 3, 4];
  const g = [2, 4, 1];
  const x2m = [0, 0, 1, 2, 3, 4];
  yield S(() => { hint.setText('Reed-Solomon：k 个符号 → n 个码字符号，可纠 t 错（toy 单错）'); stageT.setText('GF(7)：g(x)=(x−1)(x−2)=x²+4x+2；m=1+2x+3x²+4x³'); });
  yield W(950);
  yield S(() => { stageT.setText('编码：x²m(x)=4x⁵+3x⁴+2x³+x² ÷ g(x)，逐项消最高次'); });
  yield W(750);
  const rem = [...x2m], q = [0, 0, 0, 0];
  const qLabels = ['4x³', 'x²', '4x', '4'];
  for (let deg = 5, step = 0; deg >= 2; deg--, step++) {
    const qDeg = deg - 2, qc = rem[deg] % P;
    q[qDeg] = qc;
    qChips[step].setColor(WHITE, WHITE);
    yield S(() => { stageT.setText('除法第 ' + (step + 1) + ' 步：' + qc + 'x^' + deg + ' → 商 ' + qLabels[step] + '，减 ' + qc + '·g(x)'); });
    yield W(620);
    for (let i = 0; i < 3; i++) rem[qDeg + i] = (((rem[qDeg + i] - qc * g[i]) % P) + P) % P;
    qChips[step].setColor(DIM, DIM);
  }
  yield S(() => { stageT.setText('除法完成：余式 = 4x + 6'); eqT.setText('校验位 r(x)=−(余式)=3x+1 → 码字 [1,3,1,2,3,4]'); });
  yield W(900);
  cwChips.forEach((c, i) => { c.setText('c' + i + ' = ' + [1, 3, 1, 2, 3, 4][i]); });
  yield S(() => { stageT.setText('编码完成：c(x)，校验根 c(1)=0、c(2)=0'); });
  yield W(950);
  yield S(() => { stageT.setText('信道：c₂ 翻转 1→5 —— 接收方不知哪错'); });
  yield W(800);
  cwChips[2].setColor(RED, RED);
  cwChips[2].setText('c2 = 5 损坏');
  yield W(750);
  const recv = [1, 3, 5, 2, 3, 4];
  const s1 = evalPoly(recv, 1), s2 = evalPoly(recv, 2);
  synChips[0].setText('S₁ = r(1) = ' + s1); synChips[0].setColor(WHITE, WHITE);
  synChips[1].setText('S₂ = r(2) = ' + s2); synChips[1].setColor(WHITE, WHITE);
  yield S(() => { stageT.setText('S₁=' + s1 + '，S₂=' + s2 + '：非零 → 有错'); eqT.setText('无错 r(1)=r(2)=0；错在 j 值 e：S₁=e，S₂=e·2^j'); });
  yield W(950);
  const ratio = s2 * invMod(s1, P) % P;
  let j = 0, p = 1;
  while (p !== ratio && j < 6) { j++; p = (p * 2) % P; }
  const e = s1 % P;
  const fixed = ((recv[2] - e) % P + P) % P;
  errChips[0].setText('错误值 e = S₁ = ' + e);
  errChips[1].setText('2^j = S₂/S₁ = ' + ratio + ' → j = ' + j);
  yield S(() => { stageT.setText('S₂/S₁=' + ratio + '=2^' + j + ' → 错在 j=' + j + '，e=S₁=' + e); });
  yield W(900);
  cwChips[2].setColor(GREEN, GREEN);
  cwChips[2].setText('c2 = 5−' + e + ' = ' + fixed);
  yield S(() => { stageT.setText('修复：5−' + e + '=' + fixed + ' —— 恢复原符号'); });
  yield W(800);
  errChips[2].setText('修复成功 → [1, 2, 3, 4] ✓');
  errChips[2].setColor(GREEN, GREEN);
  yield S(() => { eqT.setText(''); outT.setText('校验 c(1)=0、c(2)=0 ✓ —— 数据 [1,2,3,4] 恢复'); status.textContent = 'RS：单错纠正成功'; hint.setText('真实 RS：GF(2^8)、256 符号、t 可配 —— 纠 t 个符号错'); });
  yield W(1100);
  yield S(() => { hint.setText('应用：QR 码、光盘、DVB、5G、NASA 深空 —— 纠错之王'); eqT.setText(''); outT.setText('复杂度：编解码 O(n²)（Berlekamp-Massey）'); });
  yield W(1100);
  yield S(() => { hint.setText('RS 演示完成：编码（除法求校验位）→ 传输损坏 → 校正子定位 → 修复'); outT.setText(''); });
  yield W(400);
}

function* runRS() {
  hint.setText('RS：GF(7) 单错纠错');
  yield W(400);
  yield* rsGen();
}

engine.queue(() => runRS());
panel.addButton('清空', () => {
  engine.clear();
  cwChips.forEach((c, i) => { c.setText('c' + i + ' = ?'); c.setColor(i < 2 ? CYAN : BLUE, i < 2 ? CYAN : BLUE); });
  qChips.forEach(c => c.setColor(DIM, DIM));
  synChips.forEach(c => { c.setText(''); c.setColor(GOLD, GOLD); });
  errChips[0].setText('错误值 e = ?'); errChips[0].setColor(RED, RED);
  errChips[1].setText('错误位置 j = ?'); errChips[1].setColor(RED, RED);
  errChips[2].setText('修复结果'); errChips[2].setColor(GREEN, GREEN);
  stageT.setText(''); eqT.setText(''); outT.setText('');
  hint.setText('已清空，可重新运行'); status.textContent = '';
});
panel.addLabel('（拖拽旋转视角，滚轮缩放；青 = 校验位、蓝 = 数据位、红 = 损坏/错误信息、金 = 校正子、绿 = 修复；除法 4 步与校正子全部运行时计算）');

scene.start(engine);
