// AlgorithmLibrary/SM23D.js — SM2 国密签名：toy 椭圆曲线 y²=x³+2x+3 (mod 97)、G=(3,6)、阶 n=5；点乘求公钥 P=dG，签名 (r,s)，验签 sG+tP（function* 生成器驱动，全部点运算运行时计算）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('SM23D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const status = panel.addStatus('就绪');

const chip = (v, x, y, color) => new VBox(scene, { w: 140, h: 50, d: 50, x, y, z: 0, label: v, color, emissive: color });
const ptChips = [110, 250, 390, 530].map((x, i) => chip(['G = (3,6)', '2G = ?', 'P = d·G = ?', '阶 n = 5'][i], x, 720, [BLUE, DIM, DIM, PUR][i]));
const keyChips = [110, 320, 530].map((x, i) => chip(['私钥 d = 3', '消息哈希 z = 4', '随机数 k = 1'][i], x, 610, [RED, CYAN, ORANGE][i]));
const sigChips = [190, 450].map((x, i) => chip(['r = ?', 's = ?'][i], x, 500, GOLD));
const verChips = [110, 320, 530].map((x, i) => chip(['t = (r+s) mod n', 'sG + tP = ?', '验签结果'][i], x, 390, DIM));

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
  yield S(() => { status.textContent = 'SM2 国密签名（GB/T 32918，Schnorr 风格）：toy 曲线 y² = x³ + 2x + 3 (mod 97)，G = (3,6)，阶 n = 5 —— 先求公钥 P = d·G' });
  yield W(900);
  const G = [GX, GY];
  const d = 3, z = 4, k = 1;
  const P2 = addPt(G, G);
  ptChips[1].setText('2G = (' + P2[0] + ',' + P2[1] + ')');
  ptChips[1].setColor(WHITE, WHITE);
  yield S(() => { status.textContent = '2G = G + G：' + lamText(G, G) + ' = ' + ((3 * GX * GX + CA) % P_MOD) + '/' + ((2 * GY) % P_MOD) + ' mod 97 = 59 → (' + P2[0] + ',' + P2[1] + ')' });
  yield W(850);
  const P3 = addPt(P2, G);
  ptChips[2].setText('P = 3G = (' + P3[0] + ',' + P3[1] + ')');
  ptChips[2].setColor(WHITE, WHITE);
  yield S(() => { status.textContent = '3G = 2G + G：λ = 58 → (' + P3[0] + ',' + P3[1] + ') —— 公钥 P = d·G = 3G；4G = (3,91) = −G、5G = O 确认阶 n = 5' });
  yield W(950);
  yield S(() => { status.textContent = '签名：私钥 d = 3（红）、随机 k = 1（橙）、消息哈希 z = 4（青）；R = kG = 1·G = (3,6) → r = x(R) mod 5 = 3，s = k⁻¹(z + r·d) mod n' });
  yield W(900);
  const R = G;
  const r = R[0] % N;
  sigChips[0].setText('r = ' + r);
  sigChips[0].setColor(WHITE, WHITE);
  yield W(500);
  const s = (z + r * d) * invMod(k, N) % N;
  sigChips[1].setText('s = ' + s);
  sigChips[1].setColor(WHITE, WHITE);
  yield S(() => { status.textContent = 's = 1⁻¹·(4 + 3×3) mod 5 = 13 mod 5 = ' + s + ' —— 签名 (r,s) = (' + r + ',' + s + ') 随消息发送；k 必须每次换新，泄漏 k 即泄漏私钥 d（复用已被真实攻击）' });
  yield W(1000);
  yield S(() => { status.textContent = '验签（只有公钥 P = (80,87)）：t = (r + s) mod n = ' + ((r + s) % N) + '；计算 sG + tP' });
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
  yield S(() => { status.textContent = 'sG + tP = 3G + 1·P = 3G + 3G = 6G = G（阶 5）→ (' + res[0] + ',' + res[1] + ')，x = ' + res[0] });
  yield W(900);
  const ok = res[0] === r;
  verChips[2].setText(ok ? '验签通过 ✓' : '验签失败 ✗');
  verChips[2].setColor(ok ? GREEN : RED, ok ? GREEN : RED);
  yield S(() => { status.textContent = 'x(sG + tP) = ' + res[0] + ' = r = ' + r + ' → 验签通过 ✓（只有知 d 者能造出满足等式的 (r,s) —— 点乘不可逆是安全基石）' });
  yield W(1100);
  yield S(() => { status.textContent = '真实 SM2：sm2p256v1 曲线 + SM3 消息摘要，签名 1 次点乘 + 1 次模逆、验签 2 次点乘，均可预计算加速；我国数字证书、电子政务标配'; });
  yield W(1100);
  yield S(() => { status.textContent = 'SM2 演示完成：P = dG → (r,s) 签名 → sG + tP 验签通过' });
  yield W(400);
}

function* runSM2() {
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
  status.textContent = '';
});

scene.start(engine);
