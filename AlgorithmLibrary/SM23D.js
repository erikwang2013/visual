// AlgorithmLibrary/SM23D.js — SM2 国密签名：椭圆曲线上的 Schnorr 风格签名 —— 国密标准 GB/T 32918，签名与验证各一次点乘
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('SM23D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, ROSE = 0xfb7185, CYAN = 0x67e8f9, VIOLET = 0xa78bfa, AMBER = 0xfbbf24;
const hint = new VText(scene, { text: '点击「运行 SM2」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const box = (v, x, y, w = 88, color = DIM) => new VBox(scene, { w, h: 44, d: 44, x, y, z: 0, label: String(v), color, emissive: color });
const dBox = box('', -330, 175, 78);
const paBox = box('', -225, 175, 88);
const kGbox = box('', -95, 175, 88);
const rBox = box('', 40, 175, 70);
const sBox = box('', 145, 175, 70);
const sgBox = box('', -330, 25, 78);
const tpBox = box('', -225, 25, 88);
const pBox = box('', -95, 25, 88);
const ckBox = box('', 40, 25, 178);
new VText(scene, { text: '签名', x: -380, y: 175, z: 0, color: CYAN, scale: 0.46 });
new VText(scene, { text: '验签', x: -380, y: 25, z: 0, color: GOLD, scale: 0.46 });
new VText(scene, { text: 'SM2 签名（GB/T 32918）：私钥 dA 签，公钥 PA = dA·G 验 —— 曲线 y²=x³+2x+2 (mod 17)，n = 19，G = (5,1)', x: 0, y: 250, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: '签名 r = (e + x₁) mod n（x₁ 来自随机 kG）；s = (1+dA)⁻¹·(k − r·dA) mod n。验签：sG + t·PA 还原 x₁，比对 r', x: 0, y: -235, z: 0, color: PALETTE.textDim, scale: 0.62 });
const stageT = new VText(scene, { text: '', x: 0, y: 230, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: 105, z: 0, color: PALETTE.textGlow, scale: 0.55 });
const outT = new VText(scene, { text: '', x: 0, y: -190, z: 0, color: PALETTE.textGlow, scale: 0.62 });

function setCell(obj, v, color) { obj.setText(String(v)); if (color) obj.setColor(color, color); }
function resetAll() {
  engine.clear();
  [dBox, paBox, kGbox, rBox, sBox, sgBox, tpBox, pBox, ckBox].forEach(b => setCell(b, '', DIM));
  stageT.setText(''); eqT.setText(''); outT.setText('');
}

function runSM2() {
  resetAll();
  hint.setText('SM2 = 国密椭圆曲线签名（类似 ECDSA 但代数形式不同）：签名者出示「我掌握了 dA」的数学证明，验签者只需公钥');
  C(600, () => {
    setCell(dBox, 'dA = 7', ROSE);
    setCell(paBox, 'PA = 7G = (0, 6)', VIOLET);
    stageT.setText('密钥对：私钥 dA = 7（玫红）→ 公钥 PA = 7G = (0, 6)（紫）公开发布');
    hint.setText('曲线 19 个点（素数阶 n=19）—— 现实中用 256 位素数阶曲线（sm2p256v1），这里缩小为演示用');
  });
  C(750, () => {
    eqT.setText('待签名消息摘要 e = 10，掷随机数 k = 8（每次签名都要新 k，泄漏 k 即泄漏私钥！）', { color: AMBER });
    stageT.setText('签名准备：e = 10（消息哈希），k = 8（随机数）');
  });
  C(800, () => {
    setCell(kGbox, 'kG = (13, 7)', AMBER);
    eqT.setText('kG = 8G = (13, 7) —— 随机数藏在椭圆曲线点上', { color: AMBER });
    stageT.setText('第一步：计算 kG = (13, 7)（琥珀），取 x₁ = 13');
  });
  C(800, () => {
    setCell(rBox, 'r = 4', GOLD);
    eqT.setText('r = (e + x₁) mod n = (10 + 13) mod 19 = 4 —— 摘要与随机点绑定', { color: GOLD });
    stageT.setText('r = 4（金）：签名第一半 —— 把消息摘要 e 与随机点 x 坐标焊在一起');
  });
  C(800, () => {
    setCell(sBox, 's = 7', GOLD);
    eqT.setText('s = (1+dA)⁻¹·(k − r·dA) = 8⁻¹·(8 − 4·7) = 12·18 ≡ 7 (mod 19)', { color: GOLD });
    stageT.setText('s = 7：签名第二半 —— 用私钥把 r 和 k 锁死，别人没有 dA 伪造不出来');
    hint.setText('8⁻¹ mod 19 = 12（8×12 = 96 ≡ 1）；k − r·dA = −20 ≡ 18 —— 负数在模算术里翻转成正数');
  });
  C(900, () => {
    setCell(sgBox, 'sG = 7G = (0, 6)', CYAN);
    setCell(tpBox, 'tPA = 11·PA = G', CYAN);
    eqT.setText('验签：t = (r+s) mod n = 11；t·PA = 11·7G = 77G ≡ G（77 mod 19 = 1）', { color: CYAN });
    stageT.setText('验签者只有公钥：计算 sG = (0, 6) 与 t·PA = G（青）—— 两条路径即将汇合');
  });
  C(900, () => {
    setCell(pBox, 'P = sG + tPA = 8G = (13, 7)', GREEN);
    eqT.setText('sG + t·PA = 7G + G = 8G = (13, 7) —— 与签名者的 kG 殊途同归！', { color: GREEN });
    stageT.setText('P = (13, 7)：验签者算出的点 x₁′ = 13 —— 数学保证 sG + tPA = kG');
  });
  C(1000, () => {
    setCell(ckBox, '(e + x₁′) mod n = 4 = r ✓ 验签通过', GREEN);
    eqT.setText('核对：(e + x₁′) mod n = (10 + 13) mod 19 = 4 —— 与签名里的 r = 4 相等，签名真实有效 ✓', { color: GREEN });
    stageT.setText('验签通过 ✓ —— 攻击者没有 dA 就无法构造 s 使两路重合');
    hint.setText('为什么必须验 e？e 是消息哈希 —— 篡改消息 → e 变 → r 对不上 → 验签失败，完整性保住了');
  });
  C(1200, () => {
    outT.setText('复杂度：签名 1 次点乘，验签 2 次点乘（可优化为 1 次 Shamir 双标量）；应用：国密证书、网银 U 盾、政务系统');
    status.textContent = 'SM2：dA=7, PA=(0,6), e=10, k=8 → (r,s)=(4,7)；验签 (e+x₁′)mod n = 4 = r ✓';
    hint.setText('与 ECDSA 的区别：SM2 的 r 直接焊进 e（Schnorr 风格），ECDSA 用 s⁻¹ 的除法结构 —— 两种都安全，SM2 是国标');
  });
}

panel.addButton('运行 SM2', runSM2);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；玫红 = 私钥，紫 = 公钥，琥珀 = 随机数，金 = 签名 (r,s)，青 = 验签路径，绿 = 通过）');

scene.start(engine);
