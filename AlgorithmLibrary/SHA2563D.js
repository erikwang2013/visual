// AlgorithmLibrary/SHA2563D.js — SHA-256：512 位分组 + 消息扩展 W[16..63] + 64 轮（Ch/Maj/Σ0/Σ1），8 寄存器 A~H，输出 256 位摘要（function* 生成器驱动，结构式演示 + 标准测试向量）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('SHA2563D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：SHA-256 —— 8 寄存器 + 64 轮压缩，输出 256 位摘要', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 562, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.44 });
const outT = new VText(scene, { text: '', x: 0, y: 70, z: 0, color: PALETTE.textGlow, scale: 0.62 });

const padChips = [90, 310, 530].map((x, i) => new VBox(scene, { w: 200, h: 50, d: 50, x, y: 640, z: 0, label: ['消息 "abc"', '填充 + 64 位长度', '512 位分组'], color: [BLUE, CYAN, PUR][i], emissive: [BLUE, CYAN, PUR][i] }));
const wChip = new VBox(scene, { w: 300, h: 50, d: 50, x: 320, y: 540, z: 0, label: 'W[0..63] 消息扩展', color: ORANGE, emissive: ORANGE });
const regChips = [0, 1, 2, 3, 4, 5, 6, 7].map(i => new VBox(scene, { w: 72, h: 50, d: 50, x: (i - 3.5) * 80 + 320, y: 430, z: 0, label: ['A','B','C','D','E','F','G','H'][i], color: GOLD, emissive: GOLD }));
new VText(scene, { text: 'A~H = 8 个 32 位寄存器（初值 = 前 8 个质数平方根小数部分）。每轮：T1 = h + Σ1(e) + Ch(e,f,g) + K[r] + W[r]；T2 = Σ0(a) + Maj(a,b,c)；然后 h=g,g=f,f=e,e=d+T1,d=c,c=b,b=a,a=T1+T2', x: 0, y: 365, z: 0, color: PALETTE.textDim, scale: 0.36 });
const fBoxes = [80, 240, 400, 560].map((x, i) => new VBox(scene, { w: 150, h: 54, d: 54, x, y: 230, z: 0, label: ['Ch(x,y,z) = (x∧y)⊕(¬x∧z)', 'Maj(x,y,z) = (x∧y)⊕(x∧z)⊕(y∧z)', 'Σ0 = ROTR²⊕ROTR¹³⊕ROTR²²', 'Σ1 = ROTR⁶⊕ROTR¹¹⊕ROTR²⁵'][i], color: DIM, emissive: DIM }));
new VText(scene, { text: 'W[r]：W[0..15] = 分组 16 字；W[16..63] = σ0(W[r−15]) + W[r−7] + σ1(W[r−2]) + W[r−16]', x: 0, y: 160, z: 0, color: PALETTE.textDim, scale: 0.36 });

function* sha256Gen() {
  yield S(() => { hint.setText('SHA-256：SHA-2 家族主力 —— 64 轮压缩 256 位输出，至今未找到有效碰撞'); stageT.setText('消息 "abc"：填充（补 1 + 补 0 + 64 位长度）→ 512 位分组 → 16 个字 → 消息扩展成 W[0..63]'); });
  yield W(950);
  yield S(() => { stageT.setText('W[0..15] = 分组的 16 个 32 位字；W[16..63] 由前面字非线性组合生成（σ0/σ1 循环移位异或）'); });
  yield W(750);
  yield S(() => { stageT.setText('64 轮压缩开始。轮 r：T1 = h + Σ1(e) + Ch(e,f,g) + K[r] + W[r]；T2 = Σ0(a) + Maj(a,b,c)'); eqT.setText('K[r] = 前 64 个质数立方根小数部分 —— 先算 T1/T2，再把寄存器链整体左移'); });
  yield W(900);
  for (let r = 1; r <= 64; r++) {
    yield S(() => { stageT.setText('第 ' + r + '/64 轮：T1 = h + Σ1(e) + Ch(e,f,g) + K[' + r + '] + W[' + (r - 1) + ']，T2 = Σ0(a) + Maj(a,b,c)，a = T1+T2'); eqT.setText('寄存器链：h=g g=f f=e e=d+T1 d=c c=b b=a a=T1+T2'); });
    yield W(42);
  }
  yield S(() => { stageT.setText('64 轮完成：A~H 与初始值相加 → 8 个 32 位字拼接成 256 位摘要'); eqT.setText('输出 = A+B+C+D+E+F+G+H（大端拼接）—— 512 位输入 → 256 位输出，有损 → 不可逆'); });
  yield W(900);
  yield S(() => { outT.setText('SHA-256("abc") = ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'); status.textContent = 'SHA-256("abc") = ba7816bf…f20015ad'; hint.setText('安全现状：无公开有效碰撞；应用 = 比特币 PoW、TLS、git 对象寻址、密码存储（加盐后）'); });
  yield W(1100);
  yield S(() => { hint.setText('变体：SHA-224/384/512 换截断与初值；SHA-256 抗碰撞强度理论 2^128（生日攻击下）'); outT.setText('复杂度：O(n)，每 512 位分组 64 轮 + 64 次扩展 —— 硬件加速（SHA-NI）下极快'); });
  yield W(1100);
  yield S(() => { hint.setText('SHA-256 演示完成：消息扩展 + 64 轮压缩 → 256 位摘要'); outT.setText(''); });
  yield W(400);
}

function* runSHA256() {
  hint.setText('SHA-256：256 位摘要');
  yield W(400);
  yield* sha256Gen();
}

engine.queue(() => runSHA256());
panel.addButton('清空', () => {
  engine.clear();
  fBoxes.forEach(c => c.setColor(DIM, DIM));
  stageT.setText(''); eqT.setText(''); outT.setText('');
  hint.setText('已清空，可重新运行'); status.textContent = '';
});
panel.addLabel('（拖拽旋转视角，滚轮缩放；顶排 = 填充流水线与消息扩展，金块 = 8 个寄存器 A~H，下排 = 四个运算构件 Ch/Maj/Σ0/Σ1；64 轮快速循环后输出标准测试向量）');

scene.start(engine);
