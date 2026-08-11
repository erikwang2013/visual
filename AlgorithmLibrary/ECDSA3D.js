// AlgorithmLibrary/ECDSA3D.js — ECDSA 数字签名：椭圆曲线版 DSA —— 签名在曲线上做，验签用 u1G + u2Q 还原随机点 —— 比特币/以太坊签名标准
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('ECDSA3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, ROSE = 0xfb7185, CYAN = 0x67e8f9, VIOLET = 0xa78bfa, AMBER = 0xfbbf24;
const hint = new VText(scene, { text: '点击「运行 ECDSA」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const box = (v, x, y, w = 92, color = DIM) => new VBox(scene, { w, h: 44, d: 44, x, y, z: 0, label: String(v), color, emissive: color });
const dBox = box('', -340, 175, 74);
const qBox = box('', -250, 175, 92);
const kBox = box('', -140, 175, 74);
const kgBox = box('', -50, 175, 92);
const rBox = box('', 80, 175, 62);
const sBox = box('', 175, 175, 62);
const wBox = box('', -340, 25, 74);
const u1Box = box('', -250, 25, 74);
const u2Box = box('', -140, 25, 74);
const pBox = box('', -50, 25, 92);
const ckBox = box('', 80, 25, 158);
new VText(scene, { text: '签名', x: -395, y: 175, z: 0, color: CYAN, scale: 0.46 });
new VText(scene, { text: '验签', x: -395, y: 25, z: 0, color: GOLD, scale: 0.46 });
new VText(scene, { text: 'ECDSA：私钥 dA，公钥 Q = dA·G；曲线 y²=x³+2x+2 (mod 17)，n = 19，G = (5,1) —— 比特币 secp256k1 的缩小版', x: 0, y: 250, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: '签名 r = x₁ mod n（x₁ 来自 kG），s = k⁻¹(e + r·dA) mod n。验签 w = s⁻¹：u1G + u2Q 还原 kG，x₁ 对得上即通过', x: 0, y: -235, z: 0, color: PALETTE.textDim, scale: 0.62 });
const stageT = new VText(scene, { text: '', x: 0, y: 230, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: 105, z: 0, color: PALETTE.textGlow, scale: 0.55 });
const outT = new VText(scene, { text: '', x: 0, y: -190, z: 0, color: PALETTE.textGlow, scale: 0.62 });

function setCell(obj, v, color) { obj.setText(String(v)); if (color) obj.setColor(color, color); }
function resetAll() {
  engine.clear();
  [dBox, qBox, kBox, kgBox, rBox, sBox, wBox, u1Box, u2Box, pBox, ckBox].forEach(b => setCell(b, '', DIM));
  stageT.setText(''); eqT.setText(''); outT.setText('');
}

function runECDSA() {
  resetAll();
  hint.setText('ECDSA = 椭圆曲线数字签名：把 DSA 的模幂换成点乘 —— 密钥短 6 倍，速度还更快，互联网与区块链的事实标准');
  C(600, () => {
    setCell(dBox, 'dA = 7', ROSE);
    setCell(qBox, 'Q = 7G = (0, 6)', VIOLET);
    stageT.setText('密钥对：私钥 dA = 7（玫红）→ 公钥 Q = 7G = (0, 6)（紫）');
    hint.setText('真实场景：比特币地址 = Base58(哈希(Q)) —— 公钥公开，私钥就是钱包的命根子');
  });
  C(750, () => {
    setCell(kBox, 'k = 5', AMBER);
    eqT.setText('摘要 e = 10，随机数 k = 5 —— 每次签名重新掷 k（Sony PS3 事件：k 重用 → 私钥被算出）', { color: AMBER });
    stageT.setText('签名准备：e = 10（消息哈希），k = 5（随机数）');
  });
  C(800, () => {
    setCell(kgBox, 'kG = 5G = (9, 16)', AMBER);
    eqT.setText('kG = (9, 16)，取 x₁ = 9 —— 随机点定下签名的「锚」', { color: AMBER });
    stageT.setText('第一步：kG = 5G = (9, 16)（琥珀）');
  });
  C(800, () => {
    setCell(rBox, 'r = 9', GOLD);
    eqT.setText('r = x₁ mod n = 9 mod 19 = 9', { color: GOLD });
    stageT.setText('r = 9（金）：签名第一半 = 随机点的 x 坐标');
  });
  C(800, () => {
    setCell(sBox, 's = 7', GOLD);
    eqT.setText('s = k⁻¹(e + r·dA) = 4·(10 + 9·7) = 4·16 = 64 mod 19 = 7', { color: GOLD });
    stageT.setText('s = 7：k⁻¹ mod 19 = 4（5×4 = 20 ≡ 1）—— 私钥、摘要、随机数三位一体焊进 s');
  });
  C(900, () => {
    setCell(wBox, 'w = 11', CYAN);
    setCell(u1Box, 'u1 = 15', CYAN);
    setCell(u2Box, 'u2 = 4', CYAN);
    eqT.setText('验签：w = s⁻¹ mod n = 11（7×11 = 77 ≡ 1）；u1 = e·w = 110 mod 19 = 15；u2 = r·w = 99 mod 19 = 4', { color: CYAN });
    stageT.setText('验签者只有公钥：w、u1、u2（青）—— u1G + u2Q 的设计让 dA 自动约掉');
  });
  C(900, () => {
    setCell(pBox, 'P = 15G + 4Q = (9, 16)', GREEN);
    eqT.setText('P = u1·G + u2·Q = 15G + 4·(7G) = 15G + 28G = 43G ≡ 5G = (9, 16)（43 mod 19 = 5）', { color: GREEN });
    stageT.setText('P = (9, 16)：u2·Q 中的 dA 与 s 中的 dA⁻¹ 抵消，奇迹般地还原出 kG');
    hint.setText('推导：s⁻¹(e·G + r·Q) = k⁻¹·(e + r·dA)·G = kG —— 代数环环相扣');
  });
  C(1000, () => {
    setCell(ckBox, 'x₁′ = 9 = r ✓ 验签通过', GREEN);
    eqT.setText('核对：P 的 x 坐标 9 = 签名里的 r —— 签名真实有效 ✓', { color: GREEN });
    stageT.setText('验签通过 ✓ —— 篡改消息（e 变）或伪造签名都会使等式破裂');
  });
  C(1200, () => {
    outT.setText('复杂度：签名 1 次点乘 + 1 次求逆，验签 2 次点乘；应用：比特币/以太坊交易签名、TLS 证书、数字钱包');
    status.textContent = 'ECDSA：dA=7, Q=(0,6), e=10, k=5 → (r,s)=(9,7)；验签 P=(9,16)，x₁′=9=r ✓';
    hint.setText('与 SM2 对比：数学等价家族，SM2 的 r 里焊了 e（Schnorr 系），ECDSA 独立验 e —— 都已是 ISO 标准');
  });
}

panel.addButton('运行 ECDSA', runECDSA);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；玫红 = 私钥，紫 = 公钥，琥珀 = 随机数，金 = 签名 (r,s)，青 = 验签数，绿 = 通过）');

scene.start(engine);
