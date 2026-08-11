// AlgorithmLibrary/SM43D.js — SM4 国密分组密码：32 轮 Feistel，轮密钥由 MK 经 T' 变换生成 —— 国密标准 GB/T 32907
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('SM43D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, ROSE = 0xfb7185, CYAN = 0x67e8f9, VIOLET = 0xa78bfa, AMBER = 0xfbbf24;
const hint = new VText(scene, { text: '点击「运行 SM4」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const MK = ['01234567', '89abcdef', 'fedcba98', '76543210'];
const rks = ['f12186f9', '41662b61', '5a6ab19a', '7ba92077'];
const X4 = ['27fad345', 'a18b4cb2', '11c1e22a', 'cc13e2ee'];
const CT = ['681edf34', 'd206965e', '86b3e94f', '536e4246'];

const box = (v, x, y, w = 96, color = DIM) => new VBox(scene, { w, h: 44, d: 44, x, y, z: 0, label: String(v), color, emissive: color });
const xBoxes = MK.map((v, i) => box(v, -165 + i * 88, 185, 80));
const rkBoxes = rks.map((v, i) => box('', -165 + i * 88, 70, 80));
const midBoxes = X4.map((v, i) => box('', -165 + i * 88, -45, 80));
const ctBoxes = CT.map((v, i) => box('', -165 + i * 88, -160, 80));
new VText(scene, { text: '明文 X0..X3', x: -335, y: 185, z: 0, color: CYAN, scale: 0.46 });
new VText(scene, { text: '轮密钥 rk0..rk3', x: -335, y: 70, z: 0, color: VIOLET, scale: 0.46 });
new VText(scene, { text: '轮状态 X4..X7', x: -335, y: -45, z: 0, color: AMBER, scale: 0.46 });
new VText(scene, { text: '密文 C', x: -335, y: -160, z: 0, color: GOLD, scale: 0.46 });
new VText(scene, { text: 'SM4：国密分组密码（GB/T 32907）—— 128 位明文 = 4 个 32 位字，32 轮 Feistel，S 盒查表 + 循环移位线性变换 T', x: 0, y: 250, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: '一轮：X[i+4] = X[i] ⊕ T(X[i+1] ⊕ X[i+2] ⊕ X[i+3] ⊕ rk[i]) —— 每轮只改一个字的「非对称 Feistel」', x: 0, y: -240, z: 0, color: PALETTE.textDim, scale: 0.62 });
const stageT = new VText(scene, { text: '', x: 0, y: 230, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: 115, z: 0, color: PALETTE.textGlow, scale: 0.55 });
const outT = new VText(scene, { text: '', x: 0, y: -215, z: 0, color: PALETTE.textGlow, scale: 0.62 });

function setCell(obj, v, color) { obj.setText(String(v)); if (color) obj.setColor(color, color); }
function resetAll() {
  engine.clear();
  MK.forEach((v, i) => setCell(xBoxes[i], v, DIM));
  rkBoxes.forEach(b => setCell(b, '', DIM));
  midBoxes.forEach(b => setCell(b, '', DIM));
  ctBoxes.forEach(b => setCell(b, '', DIM));
  stageT.setText(''); eqT.setText(''); outT.setText('');
}

function runSM4() {
  resetAll();
  hint.setText('SM4 = 中国商用分组密码：明文按 32 位字处理，每轮一个「T 函数」（S 盒 + 循环左移 2/10/18/24 位的异或）');
  C(600, () => {
    xBoxes.forEach(b => b.setColor(CYAN, CYAN));
    stageT.setText('明文 0123456789abcdeffedcba9876543210 —— 切分为 4 个字 X0..X3（青）');
    hint.setText('分组密码的「分组」= 128 位；每一轮输出的字位置轮转，32 轮后 4 个字逆序输出为密文');
  });
  C(750, () => {
    rkBoxes.forEach((b, i) => setCell(b, rks[i], VIOLET));
    eqT.setText('密钥扩展：MK 与固定参数 FK 异或后，经 T′（S 盒 + 循环左移 13/23）逐轮推出 rk[i]', { color: VIOLET });
    stageT.setText('密钥 0123456789abcdeffedcba9876543210 → 轮密钥 rk0..rk3（紫）：rk0 = f12186f9（标准测试向量 ✓）');
    hint.setText('扩展与加密共用同一套 S 盒，只是线性变换不同：加密用 L（左移 2,10,18,24），扩展用 L′（左移 13,23）');
  });
  C(800, () => {
    setCell(midBoxes[0], X4[0], AMBER);
    eqT.setText('第 1 轮：X4 = X0 ⊕ T(X1⊕X2⊕X3⊕rk0) = 01234567 ⊕ T(·) = 27fad345', { color: AMBER });
    stageT.setText('轮 1：新字 X4 = 27fad345（琥珀）—— T 函数内部先过 S 盒再循环异或');
  });
  C(800, () => {
    setCell(midBoxes[1], X4[1], AMBER);
    eqT.setText('第 2 轮：X5 = X1 ⊕ T(X2⊕X3⊕X4⊕rk1) = a18b4cb2', { color: AMBER });
    stageT.setText('轮 2：X5 = a18b4cb2 —— 每轮轮密钥不同（rk1 = 41662b61），这就是「密钥调度」的意义');
  });
  C(800, () => {
    setCell(midBoxes[2], X4[2], AMBER);
    eqT.setText('第 3 轮：X6 = X2 ⊕ T(X3⊕X4⊕X5⊕rk2) = 11c1e22a', { color: AMBER });
    stageT.setText('轮 3：X6 = 11c1e22a —— 32 轮中每一轮都把「窗口」向后推一个字');
  });
  C(800, () => {
    setCell(midBoxes[3], X4[3], AMBER);
    eqT.setText('第 4 轮：X7 = X3 ⊕ T(X4⊕X5⊕X6⊕rk3) = cc13e2ee', { color: AMBER });
    stageT.setText('轮 4：X7 = cc13e2ee —— 前 4 轮后，4 个字已全部被搅动过一遍');
    hint.setText('抗差分分析的设计：S 盒的差分均匀度 ≤ 2⁻⁶，加上 32 轮轮数，安全裕度充足');
  });
  C(1000, () => {
    ctBoxes.forEach((b, i) => setCell(b, CT[i], GOLD));
    eqT.setText('32 轮后反序输出：(X35, X34, X33, X32) 字节序整理 = 681edf34…（金）', { color: GOLD });
    stageT.setText('加密完成：C = 681edf34d206965e86b3e94f536e4246 —— 与标准测试向量完全一致 ✓');
    hint.setText('解密就是同一结构跑 32 轮，轮密钥反序 —— 国密算法家族（SM2/SM3/SM4）已进国际标准 ISO/IEC');
  });
  C(1200, () => {
    outT.setText('复杂度 O(32) 轮 × 常数；应用：国内商用密码体系、金融 IC 卡、SM 系列证书体系。与 AES 并列为两大分组密码');
    status.textContent = 'SM4：明文 0123456789abcdeffedcba9876543210 → 密文 681edf34d206965e86b3e94f536e4246（32 轮 Feistel）';
    hint.setText('对比 DES/AES：SM4 每轮只更新 1 个字（轻量轮函数），32 轮补足扩散 —— 麻雀虽小五脏俱全');
  });
}

panel.addButton('运行 SM4', runSM4);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；青 = 明文，紫 = 轮密钥，琥珀 = 轮状态，金 = 密文）');

scene.start(engine);
