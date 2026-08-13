// AlgorithmLibrary/DSA3D.js — DSA 数字签名：NIST 标准 —— 子群 q 上签名、模 p 验证；r = (g^k mod p) mod q，s = k⁻¹(e + x·r) mod q，验签 v = r（function* 生成器驱动，modpow/modinv 运行时计算）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('DSA3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：DSA —— 数字签名标准', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 700, y: 440, z: 0, color: GOLD, scale: 0.5, wrapChars: 8 });
const eqT = new VText(scene, { text: '', x: 700, y: 345, z: 0, color: PALETTE.textGlow, scale: 0.45, wrapChars: 8 });
const outT = new VText(scene, { text: '', x: 700, y: 345, z: 0, color: PALETTE.textGlow, scale: 0.45, wrapChars: 8 });

const modpow = (b, e, m) => { let r = 1; b %= m; while (e) { if (e & 1) r = r * b % m; b = b * b % m; e >>= 1; } return r; };
const modinv = (a, m) => { let t = 0, nt = 1, r = m, nr = a % m; while (nr) { const q = Math.floor(r / nr); [t, nt] = [nt, t - q * nt]; [r, nr] = [nr, r - q * nr]; } return ((t % m) + m) % m; };
const P = 23, Q = 11, G = 4, X = 7, E = 8, K = 3;
const Y = modpow(G, X, P);
const R = modpow(G, K, P) % Q;
const S_ = modinv(K, Q) * ((E + X * R) % Q) % Q;
const WV = modinv(S_, Q), U1 = (E * WV) % Q, U2 = (R * WV) % Q;
const V = (modpow(G, U1, P) * modpow(Y, U2, P) % P) % Q;

const box = (v, x, y, w = 92, color = DIM) => new VBox(scene, { w, h: 44, d: 44, x, y, z: 0, label: String(v), color, emissive: color });
const pBox = box('', -30, 430, 72);
const qBox = box('', 55, 430, 72);
const gBox = box('', 140, 430, 72);
const xBox = box('', 225, 430, 72);
const yBox = box('', 310, 430, 88);
const kBox = box('', -30, 330, 72);
const rBox = box('', 225, 330, 72);
const sBox = box('', 310, 330, 72);
const wBox = box('', -30, 230, 72);
const u1Box = box('', 55, 230, 72);
const u2Box = box('', 140, 230, 72);
const vBox = box('', 310, 230, 88);
new VText(scene, { text: '密钥生成', x: -40, y: 430, z: 0, color: CYAN, scale: 0.46 });
new VText(scene, { text: '签名', x: -40, y: 330, z: 0, color: ORANGE, scale: 0.46 });
new VText(scene, { text: '验签', x: -40, y: 230, z: 0, color: GOLD, scale: 0.46 });
new VText(scene, { text: 'DSA：参数 (p,q,g)，私钥 x，公钥 y = gˣ mod p', x: 700, y: 490, z: 0, color: PALETTE.textDim, scale: 0.4, wrapChars: 10 });
const setCell = (obj, v, color) => { obj.setText(String(v)); if (color) obj.setColor(color, color); };

function* dsaGen() {
  yield S(() => { hint.setText('DSA：签名在子群 q 上做，验证在模 p 大域上验'); stageT.setText('参数 p = ' + P + '、q = ' + Q + '、g = ' + G + '（q 整除 p−1）'); });
  yield W(900);
  setCell(pBox, 'p = ' + P, CYAN);
  setCell(qBox, 'q = ' + Q, CYAN);
  setCell(gBox, 'g = ' + G, CYAN);
  setCell(xBox, 'x = ' + X, RED);
  yield S(() => { stageT.setText('密钥生成：p/q/g（青）；私钥 x = ' + X + '（红，保密）'); eqT.setText('g^q mod p = ' + modpow(G, Q, P) + ' = 1 ✓ —— g 是生成元'); });
  yield W(900);
  setCell(yBox, 'y = ' + Y, PUR);
  yield S(() => { stageT.setText('公钥 y = gˣ mod p = ' + Y + '（紫）；求 x 需解离散对数'); eqT.setText('由 y 反推 x：大素数下解离散对数不可能'); });
  yield W(900);
  setCell(kBox, 'k = ' + K, ORANGE);
  yield S(() => { stageT.setText('签名：摘要 e = ' + E + '，随机数 k = ' + K + ' —— k 必须全新'); });
  yield W(850);
  setCell(rBox, 'r = ' + R, GOLD);
  yield S(() => { stageT.setText('r = (gᵏ mod p) mod q = ' + R + ' —— 大域点投影进子群'); });
  yield W(850);
  setCell(sBox, 's = ' + S_, GOLD);
  yield S(() => { stageT.setText('s = k⁻¹(e + x·r) mod q = ' + S_ + ' —— 私钥焊进 s'); eqT.setText('k⁻¹ mod ' + Q + ' = ' + modinv(K, Q) + '；签名 = (' + R + ', ' + S_ + ')'); });
  yield W(900);
  setCell(wBox, 'w = ' + WV, CYAN);
  setCell(u1Box, 'u1 = ' + U1, CYAN);
  setCell(u2Box, 'u2 = ' + U2, CYAN);
  yield S(() => { stageT.setText('验签：w = s⁻¹ = ' + WV + '，u1 = e·w = ' + U1 + '，u2 = r·w = ' + U2); hint.setText('g^u1·y^u2 = g^((e+x·r)·w) = g^k —— 复原 r 的来源'); });
  yield W(900);
  setCell(vBox, 'v = ' + V, GREEN);
  yield S(() => { stageT.setText('v = (g^u1·y^u2 mod p) mod q = ' + V); eqT.setText('g^' + U1 + ' = ' + modpow(G, U1, P) + '，y^' + U2 + ' = ' + modpow(Y, U2, P) + ' → 积 mod q = ' + V); });
  yield W(950);
  eqT.setText('');
  outT.setText('v = ' + V + ' 与 r = ' + R + ' 相等 → 签名有效 ✓');
  status.textContent = 'DSA: p=23 q=11 g=4 x=7 y=8；e=8 k=3 → (r,s)=(7,8)；验签 v=7=r ✓';
  yield S(() => { stageT.setText('v = ' + V + ' = r = ' + R + ' → 验签通过 ✓'); hint.setText('消息改动 → v ≠ r → 拒绝；认证 + 完整性一次到位'); });
  yield W(1000);
  yield S(() => { hint.setText('DSA 完成：v = r ✓；家族：DSA → ECDSA → EdDSA'); outT.setText(''); });
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
