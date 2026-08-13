// AlgorithmLibrary/SM23D.js — SM2 国密签名：toy 椭圆曲线 y²=x³+2x+3 (mod 97)、G=(3,6)、阶 n=5；点乘求公钥 P=dG，签名 (r,s)，验签 sG+tP（function* 生成器驱动，全部点运算运行时计算）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('SM23D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：SM2 签名 —— toy 曲线上的国密签名与验签', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 562, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: 445, z: 0, color: PALETTE.textGlow, scale: 0.44 });
const outT = new VText(scene, { text: '', x: 0, y: 70, z: 0, color: PALETTE.textGlow, scale: 0.62 });

new VText(scene, { text: 'E: y² = x³ + 2x + 3 (mod 97)   G = (3,6)   阶 n = 5（5G = 无穷远点）', x: 0, y: 505, z: 0, color: PALETTE.textGlow, scale: 0.5 });
const ptChips = [-10, 210, 430, 650].map((x, i) => new VBox(scene, { w: 200, h: 50, d: 50, x, y: 440, z: 0, label: ['G = (3,6)', '2G = ?', 'P = d·G = ?', '阶 n = 5'], color: [BLUE, DIM, DIM, PUR][i], emissive: [BLUE, DIM, DIM, PUR][i] }));
const keyChips = [-10, 320, 650].map((x, i) => new VBox(scene, { w: 200, h: 50, d: 50, x, y: 355, z: 0, label: ['私钥 d = 3', '消息哈希 z = 4', '随机数 k = 1'], color: [RED, CYAN, ORANGE][i], emissive: [RED, CYAN, ORANGE][i] }));
const sigChips = [155, 485].map((x, i) => new VBox(scene, { w: 200, h: 50, d: 50, x, y: 265, z: 0, label: ['r = ?', 's = ?'], color: [GOLD, GOLD][i], emissive: [GOLD, GOLD][i] }));
const verChips = [-10, 320, 650].map((x, i) => new VBox(scene, { w: 200, h: 50, d: 50, x, y: 175, z: 0, label: ['t = (r+s) mod n', 'sG + tP = ?', '验签结果'], color: [DIM, DIM, DIM][i], emissive: [DIM, DIM, DIM][i] }));

const P_MOD = 97, CA = 2, GX = 3, GY = 6, N = 5;
function invMod(a, p) {
  let [old_r, r] = [((a % p) + p) % p, p], [old_s, s] = [1, 0];
  while (r) { const q = Math.floor(old_r / r); [old_r, r] = [r, old_r - q * r]; [old_s, s] = [s, old_s - q * s]; }
  return ((old_s % p) + p) % p;
}
function addPt(P1, P2) {
  if (!P1) return P2;
  if (!P2) return P1;
  const [x1, y1] = P1, [x2, y2] = P2;
  if (x1 === x2 && (y1 + y2) % P_MOD === 0) return null;
  let lam;
  if (x1 === x2 && y1 === y2) lam = ((3 * x1 * x1 + CA) % P_MOD) * invMod((2 * y1) % P_MOD, P_MOD) % P_MOD;
  else lam = (((y2 - y1) % P_MOD) + P_MOD) % P_MOD * invMod((((x2 - x1) % P_MOD) + P_MOD) % P_MOD, P_MOD) % P_MOD;
  const x3 = ((lam * lam - x1 - x2) % P_MOD + P_MOD) % P_MOD;
  const y3 = ((lam * (x1 - x3) - y1) % P_MOD + P_MOD) % P_MOD;
  return [x3, y3];
}
const lamText = (P1, P2) => {
  if (P1[0] === P2[0] && P1[1] === P2[1]) return 'λ = (3x₁² + a) / (2y₁)';
  return 'λ = (y₂ − y₁) / (x₂ − x₁)';
};

function* sm2Gen() {
  yield S(() => { hint.setText('SM2：国标 GB/T 32918 椭圆曲线签名 —— Schnorr 风格，签名验签各一次点乘'); stageT.setText('toy 曲线：y² = x³ + 2x + 3 (mod 97)，G = (3,6)，阶 n = 5 —— 先求公钥 P = d·G'); });
  yield W(900);
  const G = [GX, GY];
  const d = 3, z = 4, k = 1;
  const P2 = addPt(G, G);
  ptChips[1].setText('2G = (' + P2[0] + ',' + P2[1] + ')');
  ptChips[1].setColor(WHITE, WHITE);
  yield S(() => { stageT.setText('2G = G + G：' + lamText(G, G) + ' = ' + ((3 * GX * GX + CA) % P_MOD) + '/' + ((2 * GY) % P_MOD) + ' mod 97 = 59 → (' + P2[0] + ',' + P2[1] + ')'); });
  yield W(850);
  const P3 = addPt(P2, G);
  ptChips[2].setText('P = 3G = (' + P3[0] + ',' + P3[1] + ')');
  ptChips[2].setColor(WHITE, WHITE);
  yield S(() => { stageT.setText('3G = 2G + G：λ = 58 → (' + P3[0] + ',' + P3[1] + ') —— 公钥 P = d·G = 3G'); eqT.setText('4G = (3,91) = −G，5G = O —— 确认阶 n = 5'); });
  yield W(950);
  yield S(() => { stageT.setText('签名（私钥 d=3，随机 k=1，消息哈希 z=4）：R = kG，r = x(R) mod n，s = k⁻¹(z + r·d) mod n'); eqT.setText('点乘 kG = 1·G = (3,6) → r = 3 mod 5 = 3'); });
  yield W(900);
  const R = G;
  const r = R[0] % N;
  sigChips[0].setText('r = ' + r);
  sigChips[0].setColor(WHITE, WHITE);
  yield W(500);
  const s = (z + r * d) * invMod(k, N) % N;
  sigChips[1].setText('s = ' + s);
  sigChips[1].setColor(WHITE, WHITE);
  yield S(() => { stageT.setText('s = 1⁻¹·(4 + 3×3) mod 5 = 13 mod 5 = ' + s + ' —— 签名 (r,s) = (' + r + ',' + s + ') 随消息一起发送'); eqT.setText('k 必须每次换新 —— 泄漏 k 即泄漏私钥 d（k 复用已被真实攻击）'); });
  yield W(1000);
  yield S(() => { stageT.setText('验签（只有公钥 P=(80,87)）：t = (r + s) mod n = ' + ((r + s) % N) + '；计算 sG + tP'); });
  yield W(850);
  const t = (r + s) % N;
  verChips[0].setText('t = (' + r + '+' + s + ') mod 5 = ' + t);
  verChips[0].setColor(WHITE, WHITE);
  yield W(500);
  const sG = addPt(G, addPt(G, G));
  const tP = addPt(P3, P3);
  const res = addPt(sG, tP);
  verChips[1].setText('sG + tP = 3G + P = (' + res[0] + ',' + res[1] + ')');
  verChips[1].setColor(WHITE, WHITE);
  yield S(() => { stageT.setText('sG + tP = 3G + 1·P = 3G + 3G = 6G = G（阶 5）→ (' + res[0] + ',' + res[1] + ')，x = ' + res[0]); });
  yield W(900);
  const ok = res[0] === r;
  verChips[2].setText(ok ? '验签通过 ✓' : '验签失败 ✗');
  verChips[2].setColor(ok ? GREEN : RED, ok ? GREEN : RED);
  yield S(() => { outT.setText('x(sG + tP) = ' + res[0] + ' = r = ' + r + ' —— ' + (ok ? '验签通过，签名有效' : '验签失败')); status.textContent = 'SM2：签名 (3,3) 验签通过'; hint.setText('为什么有效：只有知道 d 的人能造出满足 x(sG + tP) = r 的 (r,s) —— 点乘不可逆是安全基石'); });
  yield W(1100);
  yield S(() => { hint.setText('真实 SM2：256 位素域曲线 sm2p256v1，签名含 Z_A 与 SM3 消息摘要；我国数字证书、电子政务标配'); outT.setText('复杂度：签名 1 次点乘 + 1 次模逆；验签 2 次点乘 —— 均可预计算加速'); });
  yield W(1100);
  yield S(() => { hint.setText('SM2 演示完成：P = dG → (r,s) 签名 → sG + tP 验签'); outT.setText(''); });
  yield W(400);
}

function* runSM2() {
  hint.setText('SM2：toy 曲线签名');
  yield W(400);
  yield* sm2Gen();
}

engine.queue(() => runSM2());
panel.addButton('清空', () => {
  engine.clear();
  ptChips[1].setText('2G = ?'); ptChips[1].setColor(DIM, DIM);
  ptChips[2].setText('P = d·G = ?'); ptChips[2].setColor(DIM, DIM);
  sigChips.forEach(c => { c.setText('?'); c.setColor(GOLD, GOLD); });
  verChips[0].setText('t = (r+s) mod n');
  verChips[1].setText('sG + tP = ?');
  verChips[2].setText('验签结果');
  verChips.forEach(c => c.setColor(DIM, DIM));
  stageT.setText(''); eqT.setText(''); outT.setText('');
  hint.setText('已清空，可重新运行'); status.textContent = '';
});
panel.addLabel('（拖拽旋转视角，滚轮缩放；蓝 = 基点 G、紫 = 阶、红 = 私钥、青 = 哈希、橙 = 随机数、金 = 签名、绿 = 验签通过；点乘加法用 λ 公式逐步算出）');

scene.start(engine);
