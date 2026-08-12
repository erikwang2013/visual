// AlgorithmLibrary/ECDSA3D.js — ECDSA 数字签名：椭圆曲线版 DSA —— 签名 r = x₁ mod n、s = k⁻¹(e + r·dA)；验签 u1G + u2Q 还原 kG，x₁ 对上即通过（function* 生成器驱动，点乘全部运行时计算）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('ECDSA3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：ECDSA —— 数字签名', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 262, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: 148, z: 0, color: PALETTE.textGlow, scale: 0.44 });
const outT = new VText(scene, { text: '', x: 0, y: -235, z: 0, color: PALETTE.textGlow, scale: 0.62 });

// —— 椭圆曲线核心：mod 17 点运算 + 模逆（运行时计算）——
const P = 17, CA = 2, N = 19;
const G0 = { x: 5, y: 1 };
const modinv = (a, m) => { let t = 0, nt = 1, r = m, nr = ((a % m) + m) % m; while (nr) { const q = Math.floor(r / nr); [t, nt] = [nt, t - q * nt]; [r, nr] = [nr, r - q * nr]; } return ((t % m) + m) % m; };
const ecAdd = (Q1, Q2) => {
  if (!Q1) return Q2;
  if (!Q2) return Q1;
  let lam;
  if (Q1.x === Q2.x) {
    if ((Q1.y + Q2.y) % P === 0) return null;
    lam = ((3 * Q1.x * Q1.x + CA) % P) * modinv(2 * Q1.y, P) % P;
  } else {
    lam = (((Q2.y - Q1.y) % P) + P) % P * modinv((((Q2.x - Q1.x) % P) + P) % P, P) % P;
  }
  const x3 = (lam * lam - Q1.x - Q2.x) % P;
  const y3 = (lam * (Q1.x - x3) - Q1.y) % P;
  return { x: ((x3 % P) + P) % P, y: ((y3 % P) + P) % P };
};
const ecMul = (k, pt) => { let R = null, Q = pt; while (k) { if (k & 1) R = ecAdd(R, Q); Q = ecAdd(Q, Q); k >>= 1; } return R; };
const DA = 7, E = 10, K = 5;
const Q0 = ecMul(DA, G0), KG = ecMul(K, G0);
const R = KG.x % N;
const S_ = (modinv(K, N) * ((E + R * DA) % N)) % N;
const WV = modinv(S_, N), U1 = (E * WV) % N, U2 = (R * WV) % N;
const PP = ecAdd(ecMul(U1, G0), ecMul(U2, Q0));
const fmt = (pt) => pt ? '(' + pt.x + ', ' + pt.y + ')' : '∞';

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
new VText(scene, { text: 'ECDSA：私钥 dA，公钥 Q=dA·G', x: 0, y: 235, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: '签名 r = x₁ mod n（x₁ 来自 kG），s = k⁻¹(e + r·dA) mod n。验签 w = s⁻¹：u1G + u2Q 还原 kG，x₁ 对得上即通过', x: 0, y: -205, z: 0, color: PALETTE.textDim, scale: 0.62 });
const setCell = (obj, v, color) => { obj.setText(String(v)); if (color) obj.setColor(color, color); };

function* ecdsaGen() {
  yield S(() => { hint.setText('ECDSA = 椭圆曲线数字签名：把 DSA 的模幂换成点乘 —— 密钥短 6 倍，速度还更快'); stageT.setText('密钥对：私钥 dA = ' + DA + '（红，保密）→ 公钥 Q = dA·G = ' + fmt(Q0)); });
  yield W(900);
  setCell(dBox, 'dA = ' + DA, RED);
  setCell(qBox, 'Q = ' + DA + 'G = ' + fmt(Q0), PUR);
  yield S(() => { stageT.setText('公钥 Q = ' + fmt(Q0) + '（紫）公开 —— 比特币地址 = Base58(哈希(Q))'); });
  yield W(850);
  setCell(kBox, 'k = ' + K, ORANGE);
  yield S(() => { stageT.setText('签名准备：摘要 e = ' + E + '（消息哈希），随机数 k = ' + K + ' —— 每次签名重新掷 k'); eqT.setText('Sony PS3 事件教训：k 重用 → 私钥被直接算出'); });
  yield W(850);
  setCell(kgBox, 'kG = ' + K + 'G = ' + fmt(KG), ORANGE);
  yield S(() => { stageT.setText('第一步：kG = ' + fmt(KG) + '（橙）—— 随机点定下签名的「锚」'); });
  yield W(850);
  setCell(rBox, 'r = ' + R, GOLD);
  yield S(() => { stageT.setText('r = x₁ mod n = ' + KG.x + ' mod ' + N + ' = ' + R + '（金）—— 签名第一半 = 随机点的 x 坐标'); });
  yield W(850);
  setCell(sBox, 's = ' + S_, GOLD);
  yield S(() => { stageT.setText('s = k⁻¹(e + r·dA) = ' + modinv(K, N) + '·(' + E + ' + ' + R + '·' + DA + ') = ' + S_ + ' —— 私钥、摘要、随机数焊进 s'); eqT.setText('k⁻¹ mod ' + N + ' = ' + modinv(K, N) + '（' + K + '×' + modinv(K, N) + ' ≡ 1）。签名 = (r, s) = (' + R + ', ' + S_ + ')'); });
  yield W(900);
  setCell(wBox, 'w = ' + WV, CYAN);
  setCell(u1Box, 'u1 = ' + U1, CYAN);
  setCell(u2Box, 'u2 = ' + U2, CYAN);
  yield S(() => { stageT.setText('验签（只有公钥）：w = s⁻¹ mod n = ' + WV + '；u1 = e·w = ' + U1 + '；u2 = r·w = ' + U2); hint.setText('u1G + u2Q 的设计：u2Q = u2·dA·G，s⁻¹ 里的 dA 与 Q 里的 dA 自动约掉'); });
  yield W(900);
  setCell(pBox, 'P = u1G + u2Q = ' + fmt(PP), GREEN);
  yield S(() => { stageT.setText('P = ' + U1 + 'G + ' + U2 + '·Q = ' + fmt(PP) + ' —— u2·Q 中的 dA 与 s 中的 dA⁻¹ 抵消，奇迹般地还原出 kG'); eqT.setText('推导：s⁻¹(e·G + r·Q) = k⁻¹·(e + r·dA)·G = kG —— 代数环环相扣'); });
  yield W(950);
  setCell(ckBox, 'x₁′ = ' + PP.x + ' = r ✓ 验签通过', GREEN);
  outT.setText('核对：P 的 x 坐标 ' + PP.x + ' = 签名里的 r = ' + R + ' → 签名真实有效 ✓');
  status.textContent = 'ECDSA: dA=' + DA + ', Q=' + fmt(Q0) + ', e=' + E + ', k=' + K + ' → (r,s)=(' + R + ',' + S_ + ')；验签 P=' + fmt(PP) + '，x₁′=' + PP.x + '=r ✓';
  yield S(() => { stageT.setText('验签通过 ✓ —— 篡改消息（e 变）或伪造签名都会使等式破裂'); hint.setText('认证 + 完整性 + 不可否认，一次签名全部达成'); });
  yield W(1000);
  yield S(() => { hint.setText('ECDSA 演示完成：dA → Q → (r,s) → u1G+u2Q → x₁′ = r ✓。与 SM2 同家族，比特币/以太坊/TLS 都在用它'); outT.setText(''); });
  yield W(400);
}

function* runECDSA() {
  hint.setText('ECDSA：点乘版数字签名');
  yield W(400);
  yield* ecdsaGen();
}

engine.queue(() => runECDSA());
panel.addButton('清空', () => {
  engine.clear();
  [dBox, qBox, kBox, kgBox, rBox, sBox, wBox, u1Box, u2Box, pBox, ckBox].forEach(b => setCell(b, '', DIM));
  stageT.setText(''); eqT.setText(''); outT.setText('');
  hint.setText('已清空，可重新运行'); status.textContent = '';
});
panel.addLabel('（拖拽旋转视角，滚轮缩放；红 = 私钥，紫 = 公钥，橙 = 随机数，金 = 签名 (r,s)，青 = 验签数，绿 = 通过）');

scene.start(engine);
