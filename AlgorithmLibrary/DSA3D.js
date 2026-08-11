// AlgorithmLibrary/DSA3D.js — DSA 数字签名：NIST 标准 —— 子群 q 上签名、模 p 验证，SHA 摘要 e 卷入 —— 签名防篡改防伪造
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('DSA3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, ROSE = 0xfb7185, CYAN = 0x67e8f9, VIOLET = 0xa78bfa, AMBER = 0xfbbf24;
const hint = new VText(scene, { text: '点击「运行 DSA」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const box = (v, x, y, w = 92, color = DIM) => new VBox(scene, { w, h: 44, d: 44, x, y, z: 0, label: String(v), color, emissive: color });
const pBox = box('', -350, 175, 72);
const qBox = box('', -265, 175, 72);
const gBox = box('', -180, 175, 72);
const xBox = box('', -95, 175, 72);
const yBox = box('', -10, 175, 88);
const kBox = box('', -350, 25, 72);
const rBox = box('', -95, 25, 72);
const sBox = box('', -10, 25, 72);
const wBox = box('', -350, -125, 72);
const u1Box = box('', -265, -125, 72);
const u2Box = box('', -180, -125, 72);
const vBox = box('', -10, -125, 88);
new VText(scene, { text: '密钥生成', x: -410, y: 175, z: 0, color: CYAN, scale: 0.46 });
new VText(scene, { text: '签名', x: -410, y: 25, z: 0, color: AMBER, scale: 0.46 });
new VText(scene, { text: '验签', x: -410, y: -125, z: 0, color: GOLD, scale: 0.46 });
new VText(scene, { text: 'DSA（NIST 1991）：参数 (p, q, g)，私钥 x，公钥 y = gˣ mod p —— 签名 (r, s) 用随机数 k 一次性生成', x: 0, y: 250, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: 'r = (gᵏ mod p) mod q；s = k⁻¹(e + x·r) mod q。验签 w = s⁻¹，v = (g^u1·y^u2 mod p) mod q = r 即通过', x: 0, y: -235, z: 0, color: PALETTE.textDim, scale: 0.62 });
const stageT = new VText(scene, { text: '', x: 0, y: 230, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: 100, z: 0, color: PALETTE.textGlow, scale: 0.55 });
const outT = new VText(scene, { text: '', x: 0, y: -190, z: 0, color: PALETTE.textGlow, scale: 0.62 });

function setCell(obj, v, color) { obj.setText(String(v)); if (color) obj.setColor(color, color); }
function resetAll() {
  engine.clear();
  [pBox, qBox, gBox, xBox, yBox, kBox, rBox, sBox, wBox, u1Box, u2Box, vBox].forEach(b => setCell(b, '', DIM));
  stageT.setText(''); eqT.setText(''); outT.setText('');
}

function runDSA() {
  resetAll();
  hint.setText('DSA = 美国 NIST 数字签名标准：签名在 160 位子群 q 上做（快），验证把指数「搬回」模 p 大域 —— 双模数结构');
  C(600, () => {
    setCell(pBox, 'p = 23', CYAN);
    setCell(qBox, 'q = 11', CYAN);
    setCell(gBox, 'g = 4', CYAN);
    setCell(xBox, 'x = 7', ROSE);
    stageT.setText('参数：大素数 p = 23、子群阶 q = 11（q | p−1）、生成元 g = 4（青）；私钥 x = 7（玫红）');
    hint.setText('q 必须整除 p−1：23−1 = 22 = 2×11 —— g = 4 是子群生成元（4¹¹ mod 23 = 1）');
  });
  C(750, () => {
    setCell(yBox, 'y = 8', VIOLET);
    eqT.setText('公钥：y = gˣ mod p = 4⁷ mod 23 = 8（紫）—— 与 ElGamal 同款离散对数，但多一层 q 子群', { color: VIOLET });
    stageT.setText('公钥 y = 8 发布 —— 求 x 需要解 mod 23 的离散对数');
  });
  C(750, () => {
    setCell(kBox, 'k = 3', AMBER);
    eqT.setText('签名准备：消息摘要 e = 4，随机数 k = 3 —— k 必须每次全新，重用作废', { color: AMBER });
    stageT.setText('e = 4（消息 SHA 摘要），k = 3（随机数）');
  });
  C(800, () => {
    setCell(rBox, 'r = 7', GOLD);
    eqT.setText('r = (gᵏ mod p) mod q = (4³ mod 23) mod 11 = 18 mod 11 = 7', { color: GOLD });
    stageT.setText('r = 7：先模 p 后模 q —— 把大域上的点投影进小子群');
  });
  C(800, () => {
    setCell(sBox, 's = 3', GOLD);
    eqT.setText('s = k⁻¹(e + x·r) mod q = 4·(4 + 7·7) mod 11 = 4·9 = 36 mod 11 = 3', { color: GOLD });
    stageT.setText('s = 3：私钥 x 与摘要 e 被卷进 s —— 签名 = (r, s) = (7, 3)');
    hint.setText('k⁻¹ mod 11 = 4（3×4 = 12 ≡ 1）—— 与 ECDSA 一样，k 泄漏 = 私钥泄漏（经典教训：PS3 破解事件）');
  });
  C(900, () => {
    setCell(wBox, 'w = 4', CYAN);
    setCell(u1Box, 'u1 = 5', CYAN);
    setCell(u2Box, 'u2 = 6', CYAN);
    eqT.setText('验签：w = s⁻¹ mod q = 4；u1 = e·w = 20 mod 11 = 5；u2 = r·w = 28 mod 11 = 6', { color: CYAN });
    stageT.setText('验签者只有公钥：三个数 w、u1、u2（青）先算好');
  });
  C(900, () => {
    setCell(vBox, 'v = 7', GREEN);
    eqT.setText('v = (g^u1 · y^u2 mod p) mod q = (4⁵·8⁶ mod 23) mod 11 = (12·13 = 156 ≡ 18) mod 11 = 7', { color: GREEN });
    stageT.setText('v = 7：指数分解 —— g^(e·w)·y^(r·w) = g^((e + x·r)·w) = gᵏ，秘密地复原出 r 的来源');
  });
  C(1000, () => {
    eqT.setText('v = 7 与 r = 7 相等 → 签名有效 ✓（篡改 e 或 (r,s) 都会让 v ≠ r）', { color: GREEN });
    stageT.setText('验签通过 ✓ —— 数学保证：只有持私钥 x 才能生成使 v = r 的签名');
    hint.setText('完整性：e 是摘要，消息改动 → e 变 → u1 变 → v ≠ r → 拒绝。认证 + 完整性一次到位');
  });
  C(1200, () => {
    outT.setText('复杂度：签名 1 次模幂 + 1 次求逆，验签 2 次模幂；应用：DSA 证书、SSH 旧版、美国联邦政府标准签名');
    status.textContent = 'DSA：p=23, q=11, g=4, x=7, y=8；e=4, k=3 → (r,s)=(7,3)；验签 v=7=r ✓';
    hint.setText('家族：DSA → ECDSA（椭圆曲线版，密钥短 6 倍）→ EdDSA（现代选择）。DSA 是签名领域的老兵');
  });
}

panel.addButton('运行 DSA', runDSA);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；青 = 参数/验签数，玫红 = 私钥，紫 = 公钥，琥珀 = 随机数，金 = 签名，绿 = 通过）');

scene.start(engine);
