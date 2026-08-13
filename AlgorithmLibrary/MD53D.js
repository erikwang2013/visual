// AlgorithmLibrary/MD53D.js — MD5 消息摘要：填充 → 4 轮×16 步压缩（F/G/H/I 非线性函数），A/B/C/D 寄存器流动，64 轮后输出 128 位摘要（function* 生成器驱动，结构式演示 + 标准测试向量）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('MD53D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：MD5 —— 填充 + 4 轮 64 步压缩，输出 128 位摘要', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 562, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: 440, z: 0, color: PALETTE.textGlow, scale: 0.48 });
const outT = new VText(scene, { text: '', x: 0, y: 70, z: 0, color: PALETTE.textGlow, scale: 0.62 });

const padChips = [-10, 210, 430].map((x, i) => new VBox(scene, { w: 200, h: 52, d: 52, x, y: 490, z: 0, label: ['消息 "abc"', '填充：补 1 + 补 0 + 64 位长度', '512 位分组'], color: [BLUE, CYAN, PUR][i], emissive: [BLUE, CYAN, PUR][i] }));
const roundBoxes = [50, 230, 410, 590].map((x, i) => new VBox(scene, { w: 160, h: 58, d: 58, x, y: 405, z: 0, label: ['F：轮 1~16', 'G：轮 17~32', 'H：轮 33~48', 'I：轮 49~64'][i], color: DIM, emissive: DIM }));
const regChips = [50, 230, 410, 590].map((x, i) => new VBox(scene, { w: 110, h: 56, d: 56, x, y: 320, z: 0, label: ['A','B','C','D'][i], color: GOLD, emissive: GOLD }));
new VText(scene, { text: 'A/B/C/D = 4 个 32 位寄存器（初值 IV：67452301 efcdab89 98badcfe 10325476）—— 每轮轮流被更新', x: 0, y: 272, z: 0, color: PALETTE.textDim, scale: 0.38 });

const FN = [
  'F(x,y,z) = (x∧y)∨(¬x∧z)',
  'G(x,y,z) = (x∧z)∨(y∧¬z)',
  'H(x,y,z) = x⊕y⊕z',
  'I(x,y,z) = y⊕(x∨¬z)'
];
const SHIFTS = [7,12,17,22, 7,12,17,22, 7,12,17,22, 7,12,17,22, 5,9,14,20, 5,9,14,20, 5,9,14,20, 5,9,14,20, 4,11,16,23, 4,11,16,23, 4,11,16,23, 4,11,16,23, 6,10,15,21, 6,10,15,21, 6,10,15,21, 6,10,15,21];

function* md5Gen() {
  yield S(() => { hint.setText('MD5：把任意长度消息压缩成固定 128 位 —— 哈希函数鼻祖之一，如今仅用于校验不用于安全'); stageT.setText('消息 "abc"：补 1、补 0、最后 64 位写原始长度 → 整成 512 位整数倍分组'); });
  yield W(900);
  yield S(() => { stageT.setText('填充完成：1 个 512 位分组 → 切成 16 个 32 位字 M[0..15]'); });
  yield W(700);
  yield S(() => { stageT.setText('压缩主循环：4 轮 × 16 步 = 64 步。第 r 步用 M[r mod 16]、常数 K[r]、循环左移 s[r] 更新一个寄存器'); eqT.setText('a = b + ((a + 轮函数(b,c,d) + M[k] + K[r]) <<< s[r])，然后 (a,b,c,d) ← (d,a,b,c)'); });
  yield W(900);
  for (let r = 1; r <= 64; r++) {
    const round = Math.floor((r - 1) / 16);
    roundBoxes[round].setColor(WHITE, WHITE);
    yield S(() => { stageT.setText('第 ' + r + '/64 步（' + ['F','G','H','I'][round] + ' 轮）：' + FN[round].replace('x','b').replace('y','c').replace('z','d')); eqT.setText('a = b + ((a + ' + ['F','G','H','I'][round] + '(b,c,d) + M[' + ((r - 1) % 16) + '] + K[' + r + ']) <<< ' + SHIFTS[r - 1] + ')'); });
    yield W(44);
    roundBoxes[round].setColor(DIM, DIM);
  }
  yield S(() => { stageT.setText('64 步完成：A/B/C/D 与 IV 相加 → 拼接成 128 位摘要'); eqT.setText('雪崩效应：改 1 个比特，摘要约一半比特翻转'); });
  yield W(900);
  yield S(() => { outT.setText('MD5("abc") = 900150983cd24fb0d6963f7d28e17f72'); status.textContent = 'MD5("abc") = 900150983cd24fb0d6963f7d28e17f72'; hint.setText('为什么过时：2004 年王小云给出快速碰撞攻击 —— 生日攻击下 2^64 就能撞出同摘要，已不抗碰撞'); });
  yield W(1100);
  yield S(() => { hint.setText('现状：MD5 仍常见于文件完整性校验、CDN ETag（低对抗场景）；安全哈希请用 SHA-256/3'); outT.setText('复杂度：O(n) 每 64 字节分组 64 步；输出 128 位 —— 短但太短'); });
  yield W(1100);
  yield S(() => { hint.setText('MD5 演示完成：填充 → 64 步压缩 → 128 位摘要'); outT.setText(''); });
  yield W(400);
}

function* runMD5() {
  hint.setText('MD5：128 位摘要');
  yield W(400);
  yield* md5Gen();
}

engine.queue(() => runMD5());
panel.addButton('清空', () => {
  engine.clear();
  roundBoxes.forEach(c => c.setColor(DIM, DIM));
  stageT.setText(''); eqT.setText(''); outT.setText('');
  hint.setText('已清空，可重新运行'); status.textContent = '';
});
panel.addLabel('（拖拽旋转视角，滚轮缩放；顶排 = 填充流水线，中排 4 块 = F/G/H/I 四轮、白闪 = 当前轮，金块 = A/B/C/D 寄存器；末尾输出标准测试向量）');

scene.start(engine);
