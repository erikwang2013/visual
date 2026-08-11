// AlgorithmLibrary/ECDH3D.js — ECDH 密钥交换：双方各藏私钥，公开交换公钥，各自算出同一个共享秘密 aA·aB·G = 12G = (0,11)（function* 生成器驱动，椭圆曲线点乘全部运行时计算）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('ECDH3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「运行演示」开始：ECDH —— 不传秘密，却算出同一个秘密（DH 的椭圆曲线版）', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 262, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: 148, z: 0, color: PALETTE.textGlow, scale: 0.44 });
const outT = new VText(scene, { text: '', x: 0, y: -235, z: 0, color: PALETTE.textGlow, scale: 0.62 });

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
const aPri = box('', -330, 175, 78);
const aPub = box('', -330, 45, 88);
const aShr = box('', -330, -95, 88);
const bPri = box('', 330, 175, 78);
const bPub = box('', 330, 45, 88);
const bShr = box('', 330, -95, 88);
const midBox = box('', 0, -95, 150);
new VText(scene, { text: '爱丽丝', x: -330, y: 230, z: 0, color: CYAN, scale: 0.5 });
new VText(scene, { text: '鲍勃', x: 330, y: 230, z: 0, color: ORANGE, scale: 0.5 });
new VText(scene, { text: '私钥', x: -385, y: 175, z: 0, color: RED, scale: 0.42 });
new VText(scene, { text: '公钥', x: -385, y: 45, z: 0, color: PUR, scale: 0.42 });
new VText(scene, { text: '共享秘密', x: -385, y: -95, z: 0, color: GREEN, scale: 0.42 });
new VText(scene, { text: '曲线 y²=x³+2x+2 (mod 17)，G = (5,1)，n = 19 —— ECDH：双方不传秘密，却算出同一个秘密', x: 0, y: 230, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: '核心等式：aA·(aB·G) = aB·(aA·G) —— 点乘交换律让两边殊途同归', x: 0, y: -205, z: 0, color: PALETTE.textDim, scale: 0.62 });
const setCell = (obj, v, color) => { obj.setText(String(v)); if (color) obj.setColor(color, color); };

function* ecdhGen() {
  yield S(() => { hint.setText('问题：公开信道协商密钥。DH 用模幂，ECDH 用点乘 —— 同样数学、更短的密钥'); stageT.setText('公开参数：曲线、基点 G = ' + fmt(G0) + '、阶 n = 19 —— 全世界都知道'); });
  yield W(900);
  setCell(aPri, 'aA = ' + AA, RED);
  setCell(bPri, 'aB = ' + AB, RED);
  yield S(() => { stageT.setText('各自掷私钥：爱丽丝 aA = ' + AA + '，鲍勃 aB = ' + AB + '（红）—— 私钥永远不出门'); });
  yield W(850);
  setCell(aPub, AA + 'G = ' + fmt(pubA), PUR);
  setCell(bPub, AB + 'G = ' + fmt(pubB), PUR);
  yield S(() => { stageT.setText('公钥 = 私钥 × G：爱丽丝 ' + AA + 'G = ' + fmt(pubA) + '；鲍勃 ' + AB + 'G = ' + fmt(pubB) + '（紫）'); eqT.setText('由公钥反推私钥 = 椭圆曲线离散对数难题 —— 安全'); });
  yield W(900);
  yield S(() => { stageT.setText('公开信道交换公钥：中间人能看到 ' + fmt(pubA) + ' 和 ' + fmt(pubB) + '，但反推不出 ' + AA + ' 或 ' + AB); });
  yield W(850);
  setCell(aShr, 'aA·Bpub = ' + fmt(shrA), GREEN);
  yield S(() => { stageT.setText('爱丽丝本地：aA × 鲍勃公钥 = ' + AA + '·' + fmt(pubB) + ' = ' + fmt(shrA)); eqT.setText('' + AA + '·' + fmt(pubB) + ' = ' + AA + '·(' + AB + 'G) = ' + (AA * AB) + 'G'); });
  yield W(900);
  setCell(bShr, 'aB·Apub = ' + fmt(shrB), GREEN);
  yield S(() => { stageT.setText('鲍勃本地：aB × 爱丽丝公钥 = ' + AB + '·' + fmt(pubA) + ' = ' + fmt(shrB) + ' —— 两个结果完全相同！'); eqT.setText('' + AB + '·' + fmt(pubA) + ' = ' + AB + '·(' + AA + 'G) = ' + (AA * AB) + 'G —— 交换律'); });
  yield W(900);
  setCell(midBox, '共享秘密 = ' + (AA * AB) + 'G = ' + fmt(SHR), GREEN);
  outT.setText('共享秘密 ' + fmt(SHR) + ' ✓ 双方一致，中间人算不出');
  status.textContent = 'ECDH: aA=' + AA + ', aB=' + AB + ' → 公钥 ' + fmt(pubA) + '/' + fmt(pubB) + ' → 共享秘密 ' + fmt(SHR);
  yield S(() => { stageT.setText('共享秘密诞生：双方都得到 ' + fmt(SHR) + '（绿）—— 通常取 x 坐标喂给 KDF 派生出对称密钥'); hint.setText('中间人缺了私钥，即使拿着两个公钥也算不出 ' + (AA * AB) + 'G —— 除非破解离散对数'); });
  yield W(1000);
  yield S(() => { hint.setText('ECDH 演示完成：私钥 → 公钥 → 交换 → ' + (AA * AB) + 'G = ' + fmt(SHR) + '。TLS 1.3 ECDHE 握手、Signal 协议都在用它'); outT.setText(''); });
  yield W(400);
}

function* runECDH() {
  hint.setText('ECDH：点乘版密钥交换');
  yield W(400);
  yield* ecdhGen();
}

panel.addButton('运行演示', () => engine.start(runECDH()));
panel.addButton('清空', () => {
  engine.clear();
  [aPri, aPub, aShr, bPri, bPub, bShr, midBox].forEach(b => setCell(b, '', DIM));
  stageT.setText(''); eqT.setText(''); outT.setText('');
  hint.setText('已清空，可重新运行'); status.textContent = '';
});
panel.addLabel('（拖拽旋转视角，滚轮缩放；青 = 爱丽丝，橙 = 鲍勃，红 = 私钥，紫 = 公钥，绿 = 共享秘密 12G=(0,11)）');

scene.start(engine);
