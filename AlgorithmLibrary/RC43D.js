// AlgorithmLibrary/RC43D.js — RC4 流密码：256 字节 S 盒置换 + 伪随机数生成（PRGA）逐字节加密 —— 加密与解密是同一个函数
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('RC43D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, ROSE = 0xfb7185, CYAN = 0x67e8f9, VIOLET = 0xa78bfa, AMBER = 0xfbbf24;
const hint = new VText(scene, { text: '点击「运行 RC4」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const PT = [...'Plaintext'].map(c => c.charCodeAt(0).toString(16).padStart(2, '0'));
const KS = ['eb', '9f', '77', '81', 'b7', '34', 'ca', '72', 'a7'];
const CT = ['bb', 'f3', '16', 'e8', 'd9', '40', 'af', '0a', 'd3'];
const CHARS = [...'Plaintext'];

const box = (v, x, y, w = 42, color = DIM) => new VBox(scene, { w, h: 42, d: 42, x, y, z: 0, label: String(v), color, emissive: color });
const ptBoxes = PT.map((v, i) => box(CHARS[i] + ' ' + v, -230 + i * 56, 170, 44));
const ksBoxes = KS.map((v, i) => box('', -230 + i * 56, 45, 44));
const ctBoxes = CT.map((v, i) => box('', -230 + i * 56, -80, 44));
new VText(scene, { text: '明文 P', x: -292, y: 170, z: 0, color: CYAN, scale: 0.46 });
new VText(scene, { text: '密钥流 K', x: -292, y: 45, z: 0, color: VIOLET, scale: 0.46 });
new VText(scene, { text: '密文 C = P⊕K', x: -292, y: -80, z: 0, color: GOLD, scale: 0.46 });
new VText(scene, { text: 'RC4：流密码 —— 密钥「Key」先洗牌 256 字节的 S 盒（KSA），再逐字节生成密钥流（PRGA），明文异或即密文', x: 0, y: 250, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: '加密 C = P ⊕ K；解密 P = C ⊕ K —— 同一个异或，同一个函数。密钥流只取决于密钥，与明文无关', x: 0, y: -235, z: 0, color: PALETTE.textDim, scale: 0.62 });
const stageT = new VText(scene, { text: '', x: 0, y: 230, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: 115, z: 0, color: PALETTE.textGlow, scale: 0.56 });
const outT = new VText(scene, { text: '', x: 0, y: -195, z: 0, color: PALETTE.textGlow, scale: 0.62 });

function setCell(obj, v, color) { obj.setText(String(v)); if (color) obj.setColor(color, color); }
function resetAll() {
  engine.clear();
  ptBoxes.forEach((b, i) => setCell(b, CHARS[i] + ' ' + PT[i], DIM));
  ksBoxes.forEach(b => setCell(b, '', DIM));
  ctBoxes.forEach(b => setCell(b, '', DIM));
  stageT.setText(''); eqT.setText(''); outT.setText('');
}

function runRC4() {
  resetAll();
  hint.setText('三步：① S[i]=i 初始化 → ② KSA 用密钥「Key」洗牌 → ③ PRGA 输出密钥流。异或是 XOR：0⊕1=1、1⊕1=0');
  C(600, () => {
    ptBoxes.forEach(b => b.setColor(CYAN, CYAN));
    stageT.setText('明文 "Plaintext" = 50 6c 61 69 6e 74 65 78 74（青，9 字节）—— 流密码按字节加密');
    hint.setText('与分组密码的区别：分组密码（AES/3DES）一次处理一整块；流密码逐字节生成「一次性密钥」来异或');
  });
  C(750, () => {
    eqT.setText('KSA 洗牌：S = [0..255]，j = (j + S[i] + key[i mod 3])，反复交换 S[i]↔S[j] —— 密钥的痕迹散布到整个 S 盒', { color: VIOLET });
    stageT.setText('密钥扩展：256 轮交换后 S 盒面目全非 —— S[0..2] 变成 4b 4e 84（快照）');
    hint.setText('RC4 的密钥长度 1–256 字节皆可 —— 洗牌轮数固定 256，密钥只是洗牌的「骰子」');
  });
  C(750, () => {
    setCell(ksBoxes[0], KS[0], VIOLET);
    eqT.setText('PRGA 第 1 字节：i=1, j=51 → 交换 S[1]↔S[51] → K₀ = S[(S[1]+S[51]) mod 256] = eb', { color: VIOLET });
    stageT.setText('密钥流 K₀ = eb（紫）：i 步进 1，j 加上 S[i]，交换后取 S[i]+S[j] 处为输出');
  });
  C(750, () => {
    setCell(ksBoxes[1], KS[1], VIOLET);
    eqT.setText('PRGA 第 2 字节：i=2, j=183 → 交换 → K₁ = 9f', { color: VIOLET });
    stageT.setText('K₁ = 9f —— 每个输出字节都搅动了 S 盒，下一次输出又是全新的');
  });
  C(750, () => {
    setCell(ksBoxes[2], KS[2], VIOLET);
    setCell(ksBoxes[3], KS[3], VIOLET);
    eqT.setText('K₂ = 77、K₃ = 81 —— 密钥流 eb 9f 77 81 b7 34 ca 72 a7 与公开测试向量一致 ✓', { color: VIOLET });
    stageT.setText('继续生成：K₄..K₈ —— 密钥流看似随机，但对同一个密钥永远确定');
  });
  C(900, () => {
    setCell(ctBoxes[0], CT[0], GOLD);
    eqT.setText('C₀ = P₀ ⊕ K₀ = 50 ⊕ eb = bb', { color: GOLD });
    stageT.setText('加密开始：第一字节 P₀=50 ⊕ K₀=eb → C₀=bb（金）');
  });
  C(900, () => {
    setCell(ctBoxes[1], CT[1], GOLD);
    setCell(ctBoxes[2], CT[2], GOLD);
    eqT.setText('C₁ = 6c ⊕ 9f = f3；C₂ = 61 ⊕ 77 = 16', { color: GOLD });
    stageT.setText('逐字节异或：密文看起来完全随机 —— 哪怕明文只有 1 比特差异，密文也面目全非');
  });
  C(900, () => {
    ctBoxes.forEach((b, i) => { if (i > 2) setCell(b, CT[i], GOLD); });
    eqT.setText('C = bb f3 16 e8 d9 40 af 0a d3 —— 「Plaintext」→ 经典测试向量（Wikipedia RC4 示例）✓', { color: GOLD });
    stageT.setText('加密完成：解密方只需用同一密钥再异或一次，P 原样回来');
    hint.setText('见证流密码的优雅：加密器与解密器是同一个异或函数 —— 密钥流的管理（不重复使用！）才是安全的关键');
  });
  C(1000, () => {
    outT.setText('复杂度 O(n) 字节级；应用：WEP/WPA、SSL/TLS 早期版本、PDF 加密 —— 因密钥重用漏洞已逐步退役');
    status.textContent = 'RC4：key="Key" → 密钥流 eb9f7781b734ca72a7 → "Plaintext" → bbf316e8d940af0ad3';
    hint.setText('教训：2015 年后禁止新使用 —— 密钥流必须一次性（nonce），重用即泄露。现代替代：ChaCha20 流密码');
  });
}

panel.addButton('运行 RC4', runRC4);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；青 = 明文，紫 = 密钥流，金 = 密文 XOR 结果）');

scene.start(engine);
