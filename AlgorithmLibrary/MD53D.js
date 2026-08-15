// AlgorithmLibrary/MD53D.js — MD5 消息摘要：填充 → 4 轮×16 步压缩（F/G/H/I 非线性函数），A/B/C/D 寄存器流动，64 轮后输出 128 位摘要（function* 生成器驱动，结构式演示 + 标准测试向量）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('MD53D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const status = panel.addStatus('就绪');

const padChips = [110, 320, 530].map((x, i) => new VBox(scene, { w: 200, h: 52, d: 52, x, y: 690, z: 0, label: ['消息 "abc"', '填充：补 1 + 补 0 + 64 位长度', '512 位分组'], color: [BLUE, CYAN, PUR][i], emissive: [BLUE, CYAN, PUR][i] }));
const roundBoxes = [80, 240, 400, 560].map((x, i) => new VBox(scene, { w: 160, h: 58, d: 58, x, y: 565, z: 0, label: ['F：轮 1~16', 'G：轮 17~32', 'H：轮 33~48', 'I：轮 49~64'][i], color: DIM, emissive: DIM }));
const regChips = [80, 240, 400, 560].map((x, i) => new VBox(scene, { w: 110, h: 56, d: 56, x, y: 430, z: 0, label: ['A','B','C','D'][i], color: GOLD, emissive: GOLD }));

const FN = [
  'F(x,y,z) = (x∧y)∨(¬x∧z)',
  'G(x,y,z) = (x∧z)∨(y∧¬z)',
  'H(x,y,z) = x⊕y⊕z',
  'I(x,y,z) = y⊕(x∨¬z)'
];
const SHIFTS = [7,12,17,22, 7,12,17,22, 7,12,17,22, 7,12,17,22, 5,9,14,20, 5,9,14,20, 5,9,14,20, 5,9,14,20, 4,11,16,23, 4,11,16,23, 4,11,16,23, 4,11,16,23, 6,10,15,21, 6,10,15,21, 6,10,15,21, 6,10,15,21];

function* md5Gen() {
  yield S(() => { status.textContent = 'MD5：把任意长度消息压缩成固定 128 位；消息 "abc" 填充：补 1 + 补 0 + 最后 64 位写原始长度 → 512 位整数倍分组'; });
  yield W(900);
  yield S(() => { status.textContent = '填充完成：1 个 512 位分组 → 切成 16 个 32 位字 M[0..15]'; });
  yield W(700);
  yield S(() => { status.textContent = '压缩主循环：4 轮 × 16 步 = 64 步。每步 a = b + ((a + 轮函数(b,c,d) + M[k] + K[r]) <<< s[r])，然后 (a,b,c,d) ← (d,a,b,c)'; });
  yield W(900);
  for (let r = 1; r <= 64; r++) {
    const round = Math.floor((r - 1) / 16);
    roundBoxes[round].setColor(WHITE, WHITE);
    yield S(() => { status.textContent = '第 ' + r + '/64 步（' + ['F','G','H','I'][round] + ' 轮）：' + FN[round].replace(/x/g, 'b').replace(/y/g, 'c').replace(/z/g, 'd') + '；a = b + ((a + ' + ['F','G','H','I'][round] + '(b,c,d) + M[' + ((r - 1) % 16) + '] + K[' + r + ']) <<< ' + SHIFTS[r - 1] + ')'; });
    yield W(44);
    roundBoxes[round].setColor(DIM, DIM);
  }
  yield S(() => { status.textContent = '64 步完成：A/B/C/D 与 IV 相加 → 拼接成 128 位摘要；雪崩效应：改 1 比特，摘要约一半比特翻转'; });
  yield W(900);
  yield S(() => { status.textContent = 'MD5("abc") = 900150983cd24fb0d6963f7d28e17f72 ✓ 标准测试向量；2004 年王小云给出快速碰撞攻击，生日攻击下 2^64 即撞，已不抗碰撞'; });
  yield W(1100);
  yield S(() => { status.textContent = '现状：仍用于文件完整性校验、CDN ETag（低对抗场景）；安全哈希请用 SHA-256/3；复杂度 O(n)，每 64 字节分组 64 步'; });
  yield W(1100);
  yield S(() => { status.textContent = 'MD5 演示完成：填充 → 64 步压缩 → 128 位摘要'; });
  yield W(400);
}

function* runMD5() {
  yield W(400);
  yield* md5Gen();
}

engine.queue(() => runMD5());
panel.addButton('清空', () => {
  engine.clear();
  roundBoxes.forEach(c => c.setColor(DIM, DIM));
  status.textContent = '';
});

scene.start(engine);
