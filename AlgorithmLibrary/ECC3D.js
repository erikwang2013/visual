// AlgorithmLibrary/ECC3D.js — 椭圆曲线密码（ECC）：y²=x³+ax+b 上的点加法群 —— 17 位小域上运行时生成完整 kG 循环群（2G..18G, 19G=∞），演示倍点 + 加法（function* 生成器驱动，点运算全部运行时计算）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('ECC3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const status = panel.addStatus('就绪');

// —— 椭圆曲线核心：mod 17 上的点加法 / 倍点 / 点乘（全部运行时计算）——
const P = 17, CA = 2;
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
const MUL = [];
for (let k = 2; k <= 19; k++) MUL.push(ecMul(k, G0));
const G2 = MUL[0], G3 = MUL[1], G19 = MUL[17];
const fmt = (pt) => pt ? '(' + pt.x + ', ' + pt.y + ')' : '∞';

const box = (v, x, y, w = 66, color = DIM) => new VBox(scene, { w, h: 44, d: 44, x, y, z: 0, label: String(v), color, emissive: color });
const gBox = box(fmt(G0), 30, 700, 70);
const row1 = [0, 1, 2, 3, 4, 5].map(i => box('', 140 + i * 70, 700, 62));
const row2 = [0, 1, 2, 3, 4, 5].map(i => box('', 140 + i * 70, 540, 62));
const row3 = [0, 1, 2, 3, 4, 5].map(i => box('', 140 + i * 70, 380, 62));
new VText(scene, { text: 'G', x: 30, y: 745, z: 0, color: CYAN, scale: 0.46 });
const setCell = (obj, v, color) => { obj.setText(String(v)); if (color) obj.setColor(color, color); };

function* eccGen() {
  yield S(() => { status.textContent = 'ECC：曲线上的点构成「加法群」—— 点 + 点仍是曲线上的点，且形成循环结构。先验证 G = ' + fmt(G0) + ' 在曲线上：y² = ' + (G0.y * G0.y % P) + '，x³+2x+2 = ' + ((G0.x * G0.x * G0.x + 2 * G0.x + 2) % P) + ' ✓'; });
  yield W(900);
  gBox.setColor(CYAN, CYAN);
  yield S(() => { status.textContent = '基点 G = ' + fmt(G0) + '（青）—— mod 17 下曲线共有 19 个点（含 ∞），素数个点 ⇒ 循环群'; });
  yield W(750);
  setCell(row1[0], '2G = ' + fmt(G2), GOLD);
  yield S(() => { status.textContent = '倍点 2G = G + G：λ = (3x²+a)/(2y) = 77·9 mod 17 = 13；x₃ = 13²−10 = 6；y₃ = 13(5−6)−1 ≡ 3 → 2G = ' + fmt(G2) + '（相同点相加用切线）'; });
  yield W(900);
  setCell(row1[1], '3G = ' + fmt(G3), GOLD);
  yield S(() => { status.textContent = '加法 3G = 2G + G：λ = (y₂−y₁)/(x₂−x₁) = 2；x₃ = 4−5−6 ≡ 10；y₃ = 2(5−10)−1 ≡ 6 → 3G = ' + fmt(G3) + '。模逆元 2⁻¹ mod 17 = 9，分数在模算术里都是整数'; });
  yield W(900);
  for (let i = 2; i <= 5; i++) setCell(row1[i], (i + 2) + 'G = ' + fmt(MUL[i]), GOLD);
  yield S(() => { status.textContent = '4G = ' + fmt(MUL[2]) + '、5G = ' + fmt(MUL[3]) + '、6G = ' + fmt(MUL[4]) + '、7G = ' + fmt(MUL[5]) + ' —— kG 序列毫无规律（点开始乱跳）：知道 G 和 kG 反推 k = 椭圆曲线离散对数难题，这是 ECC 安全的基石'; });
  yield W(950);
  row2.forEach((b, i) => setCell(b, (8 + i) + 'G = ' + fmt(MUL[6 + i]), GOLD));
  yield S(() => { status.textContent = '8G..13G 落定 —— 7G = ' + fmt(MUL[5]) + ' 与 12G = ' + fmt(MUL[10]) + ' 互为 y 轴对称：x 相同，y 相加 = 17'; });
  yield W(950);
  row3.forEach((b, i) => setCell(b, (14 + i) + 'G = ' + fmt(MUL[12 + i]), GOLD));
  yield S(() => { status.textContent = '14G..18G 落定 —— 18G = ' + fmt(MUL[16]) + ' 与 G = ' + fmt(G0) + ' 也只有 y 不同：y 坐标成对出现 ±y'; });
  yield W(950);
  yield S(() => { status.textContent = '19G = ∞（无穷远点）—— 2G..18G 共 18 个非零元 + ∞ = 19 = n，群循环闭合，20G = 1G，G 是生成元。ECC: y²=x³+2x+2 mod 17，G=' + fmt(G0) + ' 阶 19，kG 全表运行时算出'; });
  yield W(1000);
  yield S(() => { status.textContent = '密码学意义：真实曲线用 256 位（secp256k1），穷举不可能 —— ECC 256 位 ≈ RSA 3072 位强度'; });
  yield W(900);
  yield S(() => { status.textContent = 'ECC 演示完成：点加法 → 倍点 → 循环群 kG → 19G = ∞。应用：ECDSA 签名、ECDH 交换、比特币'; });
  yield W(400);
}

function* runECC() {
  status.textContent = 'ECC：点群 + 倍点 + 循环';
  yield W(400);
  yield* eccGen();
}

engine.queue(() => runECC());
panel.addButton('清空', () => {
  engine.clear();
  setCell(gBox, fmt(G0), DIM);
  [...row1, ...row2, ...row3].forEach(b => setCell(b, '', DIM));
  status.textContent = '';
});

scene.start(engine);
