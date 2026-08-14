// AlgorithmLibrary/ECDH3D.js — ECDH 密钥交换：双方各藏私钥，公开交换公钥，各自算出同一个共享秘密 aA·aB·G = 12G = (0,11)（function* 生成器驱动，椭圆曲线点乘全部运行时计算）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('ECDH3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const status = panel.addStatus('就绪');

// —— 椭圆曲线核心：mod 17 点运算（运行时计算）——
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
const AA = 2, AB = 6;
const pubA = ecMul(AA, G0), pubB = ecMul(AB, G0);
const shrA = ecMul(AA, pubB), shrB = ecMul(AB, pubA), SHR = ecMul(12, G0);
const fmt = (pt) => pt ? '(' + pt.x + ', ' + pt.y + ')' : '∞';

const box = (v, x, y, w = 92, color = DIM) => new VBox(scene, { w, h: 44, d: 44, x, y, z: 0, label: String(v), color, emissive: color });
const aPri = box('', 160, 700, 78);
const aPub = box('', 160, 550, 88);
const aShr = box('', 160, 400, 88);
const bPri = box('', 480, 700, 78);
const bPub = box('', 480, 550, 88);
const bShr = box('', 480, 400, 88);
const midBox = box('', 320, 320, 150);
const setCell = (obj, v, color) => { obj.setText(String(v)); if (color) obj.setColor(color, color); };

function* ecdhGen() {
  yield S(() => { status.textContent = '问题：公开信道协商密钥。DH 用模幂，ECDH 用点乘 —— 同样数学、更短的密钥。公开参数：曲线 y²=x³+2x+2、基点 G = ' + fmt(G0) + '、阶 n = 19（全世界都知道）'; });
  yield W(900);
  setCell(aPri, 'aA = ' + AA, RED);
  setCell(bPri, 'aB = ' + AB, RED);
  yield S(() => { status.textContent = '各自掷私钥：爱丽丝 aA = ' + AA + '，鲍勃 aB = ' + AB + '（红）—— 私钥永远不出门'; });
  yield W(850);
  setCell(aPub, AA + 'G = ' + fmt(pubA), PUR);
  setCell(bPub, AB + 'G = ' + fmt(pubB), PUR);
  yield S(() => { status.textContent = '公钥 = 私钥 × G：爱丽丝 ' + AA + 'G = ' + fmt(pubA) + '，鲍勃 ' + AB + 'G = ' + fmt(pubB) + '（紫）；由公钥反推私钥 = 椭圆曲线离散对数难题 —— 安全'; });
  yield W(900);
  yield S(() => { status.textContent = '公开信道交换公钥：中间人能看到 ' + fmt(pubA) + ' 和 ' + fmt(pubB) + '，但反推不出 ' + AA + ' 或 ' + AB; });
  yield W(850);
  setCell(aShr, 'aA·Bpub = ' + fmt(shrA), GREEN);
  yield S(() => { status.textContent = '爱丽丝本地：aA × 鲍勃公钥 = ' + AA + '·' + fmt(pubB) + ' = ' + fmt(shrA) + '（= ' + (AA * AB) + 'G）'; });
  yield W(900);
  setCell(bShr, 'aB·Apub = ' + fmt(shrB), GREEN);
  yield S(() => { status.textContent = '鲍勃本地：aB × 爱丽丝公钥 = ' + AB + '·' + fmt(pubA) + ' = ' + fmt(shrB) + ' —— 点乘交换律让两边殊途同归！'; });
  yield W(900);
  setCell(midBox, '共享秘密 = ' + (AA * AB) + 'G = ' + fmt(SHR), GREEN);
  yield S(() => { status.textContent = '共享秘密 ' + fmt(SHR) + ' ✓ 双方一致，中间人算不出；通常取 x 坐标喂给 KDF 派生出对称密钥'; });
  yield W(1000);
  yield S(() => { status.textContent = 'ECDH 演示完成：私钥 → 公钥 → 交换 → ' + (AA * AB) + 'G = ' + fmt(SHR) + '。TLS 1.3 ECDHE 握手、Signal 协议都在用它；数据：aA=' + AA + ', aB=' + AB + ' → 公钥 ' + fmt(pubA) + '/' + fmt(pubB) + ' → 共享秘密 ' + fmt(SHR); });
  yield W(400);
}

function* runECDH() {
  yield W(400);
  yield* ecdhGen();
}

engine.queue(() => runECDH());
panel.addButton('清空', () => {
  engine.clear();
  [aPri, aPub, aShr, bPri, bPub, bShr, midBox].forEach(b => setCell(b, '', DIM));
  status.textContent = '';
});

scene.start(engine);
