// AlgorithmLibrary/DSA3D.js — DSA 数字签名：NIST 标准 —— 子群 q 上签名、模 p 验证；r = (g^k mod p) mod q，s = k⁻¹(e + x·r) mod q，验签 v = r（function* 生成器驱动，modpow/modinv 运行时计算）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('DSA3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：DSA —— 数字签名标准', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 262, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: 148, z: 0, color: PALETTE.textGlow, scale: 0.44 });
const outT = new VText(scene, { text: '', x: 0, y: -235, z: 0, color: PALETTE.textGlow, scale: 0.62 });

const modpow = (b, e, m) => { let r = 1; b %= m; while (e) { if (e & 1) r = r * b % m; b = b * b % m; e >>= 1; } return r; };
const modinv = (a, m) => { let t = 0, nt = 1, r = m, nr = a % m; while (nr) { const q = Math.floor(r / nr); [t, nt] = [nt, t - q * nt]; [r, nr] = [nr, r - q * nr]; } return ((t % m) + m) % m; };
const P = 23, Q = 11, G = 4, X = 7, E = 8, K = 3;
const Y = modpow(G, X, P);
const R = modpow(G, K, P) % Q;
const S_ = modinv(K, Q) * ((E + X * R) % Q) % Q;
const WV = modinv(S_, Q), U1 = (E * WV) % Q, U2 = (R * WV) % Q;
const V = (modpow(G, U1, P) * modpow(Y, U2, P) % P) % Q;

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
new VText(scene, { text: '密钥生成', x: -360, y: 175, z: 0, color: CYAN, scale: 0.46 });
new VText(scene, { text: '签名', x: -360, y: 25, z: 0, color: ORANGE, scale: 0.46 });
new VText(scene, { text: '验签', x: -360, y: -125, z: 0, color: GOLD, scale: 0.46 });
new VText(scene, { text: 'DSA：参数 (p,q,g)，私钥 x，公钥 y = gˣ mod p', x: 0, y: 220, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: 'r = (gᵏ mod p) mod q；s = k⁻¹(e + x·r) mod q。验签 w = s⁻¹，v = (g^u1·y^u2 mod p) mod q = r 即通过', x: 0, y: -205, z: 0, color: PALETTE.textDim, scale: 0.62 });
const setCell = (obj, v, color) => { obj.setText(String(v)); if (color) obj.setColor(color, color); };

function* dsaGen() {
  yield S(() => { hint.setText('DSA = 数字签名：保证「消息没被改 + 确实是私钥持有者发的」。双模数结构 —— 签名在小子群 q 上做，验证把指数搬回大域 p'); stageT.setText('参数 p = ' + P + '、q = ' + Q + '、g = ' + G + ' —— q 整除 p−1：' + P + '−1 = ' + (P - 1) + ' = 2×' + Q); });
  yield W(900);
  setCell(pBox, 'p = ' + P, CYAN);
  setCell(qBox, 'q = ' + Q, CYAN);
  setCell(gBox, 'g = ' + G, CYAN);
  setCell(xBox, 'x = ' + X, RED);
  yield S(() => { stageT.setText('密钥生成：大素数 p = ' + P + '、子群阶 q = ' + Q + '、生成元 g = ' + G + '（青）；私钥 x = ' + X + '（红，保密）'); eqT.setText('g 是子群生成元：g^q mod p = ' + G + '^' + Q + ' mod ' + P + ' = ' + modpow(G, Q, P) + ' = 1 ✓'); });
  yield W(900);
  setCell(yBox, 'y = ' + Y, PUR);
  yield S(() => { stageT.setText('公钥 y = gˣ mod p = ' + G + '^' + X + ' mod ' + P + ' = ' + Y + '（紫）发布 —— 求 x 需解离散对数'); eqT.setText('离散对数单向性：由 y = ' + Y + ' 反推 x = ' + X + '，大素数下不可能'); });
  yield W(900);
  setCell(kBox, 'k = ' + K, ORANGE);
  yield S(() => { stageT.setText('签名准备：消息摘要 e = ' + E + '（SHA 哈希），随机数 k = ' + K + ' —— k 必须每次全新，重用作废'); });
  yield W(850);
  setCell(rBox, 'r = ' + R, GOLD);
  yield S(() => { stageT.setText('r = (gᵏ mod p) mod q = (' + modpow(G, K, P) + ') mod ' + Q + ' = ' + R + ' —— 先模 p 后模 q，把大域上的点投影进子群'); });
  yield W(850);
  setCell(sBox, 's = ' + S_, GOLD);
  yield S(() => { stageT.setText('s = k⁻¹(e + x·r) mod q = ' + modinv(K, Q) + '·(' + E + ' + ' + X + '·' + R + ') mod ' + Q + ' = ' + S_ + ' —— 私钥、摘要、随机数焊进 s'); eqT.setText('k⁻¹ mod ' + Q + ' = ' + modinv(K, Q) + '（' + K + '×' + modinv(K, Q) + ' ≡ 1）。签名 = (r, s) = (' + R + ', ' + S_ + ')'); });
  yield W(900);
  setCell(wBox, 'w = ' + WV, CYAN);
  setCell(u1Box, 'u1 = ' + U1, CYAN);
  setCell(u2Box, 'u2 = ' + U2, CYAN);
  yield S(() => { stageT.setText('验签（只有公钥）：w = s⁻¹ mod q = ' + WV + '；u1 = e·w = ' + U1 + '；u2 = r·w = ' + U2); hint.setText('u1、u2 的设计目的：g^u1·y^u2 = g^(e·w)·g^(x·r·w) = g^((e + x·r)·w) = g^k —— 秘密地复原 r 的来源'); });
  yield W(900);
  setCell(vBox, 'v = ' + V, GREEN);
  yield S(() => { stageT.setText('v = (g^u1 · y^u2 mod p) mod q = (' + modpow(G, U1, P) + '·' + modpow(Y, U2, P) + ' mod ' + P + ') mod ' + Q + ' = ' + V); eqT.setText('g^' + U1 + ' mod ' + P + ' = ' + modpow(G, U1, P) + '，y^' + U2 + ' = ' + Y + '^' + U2 + ' mod ' + P + ' = ' + modpow(Y, U2, P) + ' → 积 ' + (modpow(G, U1, P) * modpow(Y, U2, P) % P) + ' mod ' + Q + ' = ' + V); });
  yield W(950);
  outT.setText('v = ' + V + ' 与 r = ' + R + ' 相等 → 签名有效 ✓');
  status.textContent = 'DSA: p=23 q=11 g=4 x=7 y=8；e=8 k=3 → (r,s)=(7,8)；验签 v=7=r ✓';
  yield S(() => { stageT.setText('v = ' + V + ' = r = ' + R + ' → 验签通过 ✓ —— 只有持私钥 x 者能生成使等式成立的签名'); hint.setText('消息改动 → e 变 → u1 变 → v ≠ r → 拒绝。认证 + 完整性一次到位'); });
  yield W(1000);
  yield S(() => { hint.setText('DSA 演示完成：(p,q,g) → 私钥 x → 公钥 y → 签名 (r,s) → 验签 v = r ✓。家族：DSA → ECDSA → EdDSA'); outT.setText(''); });
  yield W(400);
}

function* runDSA() {
  hint.setText('DSA：子群签名 + 大域验签');
  yield W(400);
  yield* dsaGen();
}

engine.queue(() => runDSA());
panel.addButton('清空', () => {
  engine.clear();
  [pBox, qBox, gBox, xBox, yBox, kBox, rBox, sBox, wBox, u1Box, u2Box, vBox].forEach(b => setCell(b, '', DIM));
  stageT.setText(''); eqT.setText(''); outT.setText('');
  hint.setText('已清空，可重新运行'); status.textContent = '';
});
panel.addLabel('（拖拽旋转视角，滚轮缩放；青 = 参数/验签数，红 = 私钥，紫 = 公钥，橙 = 随机数，金 = 签名 (r,s)，绿 = 验签通过）');

scene.start(engine);
