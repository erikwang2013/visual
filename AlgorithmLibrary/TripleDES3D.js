// AlgorithmLibrary/TripleDES3D.js — 3DES(三重 DES)：E-D-E 三段接力，加密-解密-加密 —— 用「解密」当中间层，兼容双倍密钥长度的历史方案
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('TripleDES3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, ROSE = 0xfb7185, CYAN = 0x67e8f9, VIOLET = 0xa78bfa, AMBER = 0xfbbf24;
const hint = new VText(scene, { text: '点击「运行 3DES」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const P = '0011223344556677';
const M1 = 'cadb6782ee2b4823';
const M2 = 'fab4adda0412602c';
const CT = '109aeac4d79bfadd';
const K = ['0123456789abcdef', '23456789abcdef01', '456789abcdef0123'];

const box = (v, x, y, w = 132, color = DIM) => new VBox(scene, { w, h: 44, d: 44, x, y, z: 0, label: String(v), color, emissive: color });
const pBox = box(P, -270, 160, 120);
const m1Box = box('', -90, 160, 120);
const m2Box = box('', 90, 160, 120);
const ctBox = box('', 270, 160, 120);
const kBoxes = K.map((v, i) => box('', -180 + i * 150, 40, 110));
new VText(scene, { text: '明文 P', x: -270, y: 215, z: 0, color: CYAN, scale: 0.46 });
new VText(scene, { text: '中间 1', x: -90, y: 215, z: 0, color: VIOLET, scale: 0.46 });
new VText(scene, { text: '中间 2', x: 90, y: 215, z: 0, color: VIOLET, scale: 0.46 });
new VText(scene, { text: '密文 C', x: 270, y: 215, z: 0, color: GOLD, scale: 0.46 });
new VText(scene, { text: '3DES（Triple DES，NIST SP 800-67）：C = E(K₃, D(K₂, E(K₁, P))) —— 三段 64 位 DES 接力，密钥总长 168 位', x: 0, y: 250, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: '中间用「解密」而非「加密」：当 K₁=K₂ 时退化为单 DES —— 向后兼容老系统，这是 3DES 最巧的设计', x: 0, y: -240, z: 0, color: PALETTE.textDim, scale: 0.62 });
const stageT = new VText(scene, { text: '', x: 0, y: 230, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: 90, z: 0, color: PALETTE.textGlow, scale: 0.56 });
const outT = new VText(scene, { text: '', x: 0, y: -210, z: 0, color: PALETTE.textGlow, scale: 0.62 });

function setCell(obj, v, color) { obj.setText(String(v)); if (color) obj.setColor(color, color); }
function resetAll() {
  engine.clear();
  setCell(pBox, P, DIM);
  [m1Box, m2Box, ctBox].forEach(b => setCell(b, '', DIM));
  kBoxes.forEach(b => setCell(b, '', DIM));
  stageT.setText(''); eqT.setText(''); outT.setText('');
}

function run3DES() {
  resetAll();
  hint.setText('背景：DES 的 56 位密钥在 1998 年被暴力破解机 22 小时攻破 —— 3DES 不发明新算法，把 DES 串 3 次（168 位密钥）');
  C(600, () => {
    pBox.setColor(CYAN, CYAN);
    kBoxes.forEach((b, i) => setCell(b, K[i], VIOLET));
    stageT.setText('准备：明文 P = 0011223344556677（64 位），三把独立密钥 K₁ K₂ K₃（紫）');
    hint.setText('DES 块大小 64 位 —— 每段处理一个块；3DES 块大小仍是 64 位，密钥 168 位');
  });
  C(800, () => {
    setCell(m1Box, M1, VIOLET);
    eqT.setText('第 1 段：E(K₁, P) —— 标准 DES 加密：P → 16 轮 Feistel → cadb6782ee2b4823', { color: VIOLET });
    stageT.setText('加密（E，青→紫）：单 DES 全套流程 —— IP 置换、16 轮 S 盒 Feistel、FP 置换');
    hint.setText('安全性只翻一倍？不 —— 用 K₁ 加密后「再解密」而不是「再加密」，挡住了中间相遇攻击（2^112 而非 2^56）');
  });
  C(800, () => {
    setCell(m2Box, M2, AMBER);
    eqT.setText('第 2 段：D(K₂, ·) —— 用第二把密钥「解密」！这不是解密明文，而是反向搅动中间态', { color: AMBER });
    stageT.setText('解密（D，紫→琥珀）：fab4adda0412602c —— 密钥不同，过程与加密完全相同，只是轮密钥反序');
    hint.setText('历史原因：70 年代的双密钥方案（K₁=K₃，112 位）银行系统大量在用，中间夹解密使单 DES 成为它的特例');
  });
  C(800, () => {
    setCell(ctBox, CT, GOLD);
    eqT.setText('第 3 段：E(K₃, ·) —— 第三把密钥再加密：最终 C = 109aeac4d79bfadd', { color: GOLD });
    stageT.setText('加密（E，琥珀→金）：输出密文 109aeac4d79bfadd —— 与权威测试向量（NIST 示例）完全一致 ✓');
    hint.setText('三段全部用 64 位 DES 原语 —— 硬件加速器、芯片级实现直接复用，这是 3DES 统治金融行业 20 年的原因');
  });
  C(1000, () => {
    outT.setText('C = E(K₃, D(K₂, E(K₁, P))) = 109aeac4d79bfadd ✓ —— 解密时反着来：P = D(K₁, E(K₂, D(K₃, C)))');
    status.textContent = '3DES-EDE：0011223344556677 → 109aeac4d79bfadd（E-D-E 三段，K₁K₂K₃ 三把 56 位密钥）';
    hint.setText('现状：NIST 2023 年正式淘汰 3DES（新数据禁止使用）—— 它完成了历史使命，接力棒交给 AES');
  });
  C(1200, () => {
    outT.setText('复杂度 O(3×16) 轮 DES；应用（历史）：金融交易（ISO 8583）、EMV 银行卡、WPA 早期版本。今日替代：AES');
    hint.setText('家族对比：DES → 3DES（加长度）→ AES（全新结构 Rijndael）—— 密码学的演进就是不断用新设计替换旧设计');
  });
}

panel.addButton('运行 3DES', run3DES);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；青 = 明文，紫 = 加密段，琥珀 = 解密段，金 = 密文）');

scene.start(engine);
