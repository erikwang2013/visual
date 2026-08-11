// AlgorithmLibrary/ElGamal3D.js — ElGamal 加密：基于离散对数难题的公钥密码 —— 随机数 k 让同一明文每次加密结果都不同（概率性加密）
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('ElGamal3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, ROSE = 0xfb7185, CYAN = 0x67e8f9, VIOLET = 0xa78bfa, AMBER = 0xfbbf24;
const hint = new VText(scene, { text: '点击「运行 ElGamal」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const box = (v, x, y, w = 92, color = DIM) => new VBox(scene, { w, h: 44, d: 44, x, y, z: 0, label: String(v), color, emissive: color });
const gBox = box('g = 5', -300, 180, 86);
const pBox = box('p = 23', -205, 180, 86);
const xBox = box('x = 7', -110, 180, 86);
const yBox = box('', 40, 180, 92);
const kBox = box('', -300, 55, 86);
const c1Box = box('', -110, 55, 92);
const c2Box = box('', 40, 55, 92);
const sBox = box('', -300, -70, 86);
const invBox = box('', -205, -70, 86);
const mBox = box('', 40, -70, 92);
new VText(scene, { text: '密钥生成', x: -355, y: 180, z: 0, color: CYAN, scale: 0.46 });
new VText(scene, { text: '加密（鲍勃）', x: -355, y: 55, z: 0, color: AMBER, scale: 0.46 });
new VText(scene, { text: '解密（爱丽丝）', x: -355, y: -70, z: 0, color: GOLD, scale: 0.46 });
new VText(scene, { text: 'ElGamal：y = gˣ (mod p) 公开，x 保密 —— 离散对数求不出来，公钥才能放心发出去', x: 0, y: 250, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: '加密 (c₁, c₂) = (gᵏ, m·yᵏ) 用随机 k；解密 m = c₂·(c₁ˣ)⁻¹ —— 随机性 k 是「一次性涂改液」', x: 0, y: -235, z: 0, color: PALETTE.textDim, scale: 0.62 });
const stageT = new VText(scene, { text: '', x: 0, y: 230, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: 130, z: 0, color: PALETTE.textGlow, scale: 0.55 });
const outT = new VText(scene, { text: '', x: 0, y: -190, z: 0, color: PALETTE.textGlow, scale: 0.62 });

function setCell(obj, v, color) { obj.setText(String(v)); if (color) obj.setColor(color, color); }
function resetAll() {
  engine.clear();
  [gBox, pBox, xBox, yBox, kBox, c1Box, c2Box, sBox, invBox, mBox].forEach(b => setCell(b, '', DIM));
  stageT.setText(''); eqT.setText(''); outT.setText('');
}

function runElGamal() {
  resetAll();
  hint.setText('ElGamal（1985）：用「模幂」造加密 —— 加密必须带随机数 k，所以同一个 m 每次加密的密文都不同');
  C(600, () => {
    setCell(gBox, 'g = 5', CYAN);
    setCell(pBox, 'p = 23', CYAN);
    setCell(xBox, 'x = 7', ROSE);
    stageT.setText('爱丽丝选公开参数 g=5、p=23（青）和私钥 x=7（玫红）—— p 必须是大素数，这里 23 只做演示');
    hint.setText('模幂 y = gˣ mod p：x 次乘方后对 p 取余 —— 正向秒算，反向（由 y 求 x）是大难题');
  });
  C(750, () => {
    setCell(yBox, 'y = 17', VIOLET);
    eqT.setText('公钥：y = gˣ mod p = 5⁷ mod 23 = 78125 mod 23 = 17', { color: VIOLET });
    stageT.setText('公钥 y = 17（紫）公开发布 —— 全世界都知道 g, p, y，但求不出 x = 7');
  });
  C(750, () => {
    setCell(kBox, 'k = 3', AMBER);
    eqT.setText('鲍勃要发消息 m = 8：先掷随机数 k = 3（每次加密都重新掷！）', { color: AMBER });
    stageT.setText('随机数 k = 3（琥珀）—— 它是加密的「临时盐」，让密文随机化');
  });
  C(800, () => {
    setCell(c1Box, 'c₁ = 10', GOLD);
    eqT.setText('c₁ = gᵏ mod p = 5³ = 125 mod 23 = 10', { color: GOLD });
    stageT.setText('密文第一部分 c₁ = 10（金）：把随机数 k「藏进」指数里发过去');
  });
  C(800, () => {
    setCell(c2Box, 'c₂ = 20', GOLD);
    eqT.setText('c₂ = m·yᵏ mod p = 8·17³ mod 23 = 8·14 = 112 mod 23 = 20', { color: GOLD });
    stageT.setText('密文第二部分 c₂ = 20：明文 m=8 乘上共享秘密 yᵏ=14 —— 加密完成，密文 = (10, 20)');
    hint.setText('概率性加密的意义：同一个 m=8 换个 k 再加密，密文完全不同 —— 攻击者无法靠密文重复识别消息');
  });
  C(800, () => {
    setCell(sBox, 's = 14', VIOLET);
    eqT.setText('解密第一步：s = c₁ˣ mod p = 10⁷ mod 23 = 14 —— 只有爱丽丝能算（x 私密）', { color: VIOLET });
    stageT.setText('s = c₁ˣ = 14：注意 yᵏ = g^(xk) = (gᵏ)ˣ = c₁ˣ —— 两边殊途同归，这就是协议成立的核心等式');
  });
  C(800, () => {
    setCell(invBox, 's⁻¹ = 5', VIOLET);
    eqT.setText('s⁻¹ mod 23 = 5（5×14 = 70 ≡ 1）—— 模逆元把乘积还原', { color: VIOLET });
    stageT.setText('s 的模逆元 = 5 —— 扩展欧几里得一次搞定');
  });
  C(1000, () => {
    setCell(mBox, 'm = 8', GREEN);
    eqT.setText('m = c₂·s⁻¹ mod p = 20·5 = 100 mod 23 = 8 —— 明文完整还原 ✓', { color: GREEN });
    stageT.setText('解密完成：m = 8 ✓ —— 中间人只有 (10, 20)，没有 x 就解不开 s');
    hint.setText('安全性：破解 = 解离散对数或 Diffie-Hellman 问题 —— 标准假设下不可区分加密（CPA 安全）');
  });
  C(1200, () => {
    outT.setText('复杂度 O(log p) 次模幂；应用：GPG/OpenPGP 的加密机制、PGP 密钥、早期 TLS 的 DHE 变体');
    status.textContent = 'ElGamal：p=23, g=5, x=7, y=17；m=8, k=3 → (c₁,c₂)=(10,20) → 还原 m=8';
    hint.setText('家族：ElGamal 是 Diffie-Hellman 密钥交换的「加密化」—— 同一个数学核心，两种用途');
  });
}

panel.addButton('运行 ElGamal', runElGamal);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；青 = 公开参数，玫红 = 私钥，紫 = 公钥/共享秘密，琥珀 = 随机数，金 = 密文，绿 = 还原明文）');

scene.start(engine);
