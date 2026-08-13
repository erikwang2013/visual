// AlgorithmLibrary/ElGamal3D.js — ElGamal 加密：基于离散对数难题的公钥密码 —— 随机数 k 让同一明文每次加密结果都不同；加密 (c₁,c₂) = (gᵏ, m·yᵏ)，解密 m = c₂·(c₁ˣ)⁻¹（function* 生成器驱动，modpow/modinv 运行时计算）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('ElGamal3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：ElGamal —— 概率性加密', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 700, y: 440, z: 0, color: GOLD, scale: 0.5, wrapChars: 8 });
const eqT = new VText(scene, { text: '', x: 700, y: 345, z: 0, color: PALETTE.textGlow, scale: 0.45, wrapChars: 8 });
const outT = new VText(scene, { text: '', x: 700, y: 345, z: 0, color: PALETTE.textGlow, scale: 0.45, wrapChars: 8 });

const modpow = (b, e, m) => { let r = 1; b %= m; while (e) { if (e & 1) r = r * b % m; b = b * b % m; e >>= 1; } return r; };
const modinv = (a, m) => { let t = 0, nt = 1, r = m, nr = ((a % m) + m) % m; while (nr) { const q = Math.floor(r / nr); [t, nt] = [nt, t - q * nt]; [r, nr] = [nr, r - q * nr]; } return ((t % m) + m) % m; };
const P = 23, G = 5, X = 7, M = 8, K = 3;
const Y = modpow(G, X, P);
const C1 = modpow(G, K, P);
const YK = modpow(Y, K, P);
const C2 = (M * YK) % P;
const SS = modpow(C1, X, P);
const INV = modinv(SS, P);
const MR = (C2 * INV) % P;

const box = (v, x, y, w = 92, color = DIM) => new VBox(scene, { w, h: 44, d: 44, x, y, z: 0, label: String(v), color, emissive: color });
const gBox = box('g = ' + G, 20, 430, 86);
const pBox = box('p = ' + P, 115, 430, 86);
const xBox = box('x = ' + X, 210, 430, 86);
const yBox = box('', 360, 430, 92);
const kBox = box('', 20, 330, 86);
const c1Box = box('', 210, 330, 92);
const c2Box = box('', 360, 330, 92);
const sBox = box('', 20, 230, 86);
const invBox = box('', 115, 230, 86);
const mBox = box('', 360, 230, 92);
new VText(scene, { text: '密钥生成', x: -35, y: 430, z: 0, color: CYAN, scale: 0.46 });
new VText(scene, { text: '加密（鲍勃）', x: -35, y: 330, z: 0, color: ORANGE, scale: 0.46 });
new VText(scene, { text: '解密（爱丽丝）', x: -35, y: 230, z: 0, color: GOLD, scale: 0.46 });
new VText(scene, { text: 'ElGamal：y = gˣ mod p，x 保密', x: 700, y: 490, z: 0, color: PALETTE.textDim, scale: 0.4, wrapChars: 10 });
const setCell = (obj, v, color) => { obj.setText(String(v)); if (color) obj.setColor(color, color); };

function* elgamalGen() {
  yield S(() => { hint.setText('ElGamal：模幂造加密；随机数 k 使同一 m 每次密文不同'); stageT.setText('爱丽丝选 g/p（青）与私钥 x = ' + X + '（红）；p 必须是大素数'); });
  yield W(900);
  setCell(gBox, 'g = ' + G, CYAN);
  setCell(pBox, 'p = ' + P, CYAN);
  setCell(xBox, 'x = ' + X, RED);
  yield S(() => { stageT.setText('模幂 y = gˣ mod p：正向秒算，反向（由 y 求 x）是大难题'); });
  yield W(800);
  setCell(yBox, 'y = ' + Y, PUR);
  yield S(() => { stageT.setText('公钥 y = gˣ mod p = ' + Y + '（紫）公开发布；求不出 x'); });
  yield W(850);
  setCell(kBox, 'k = ' + K, ORANGE);
  yield S(() => { stageT.setText('鲍勃发 m = ' + M + '：掷随机数 k = ' + K + '（每次重掷）'); });
  yield W(800);
  setCell(c1Box, 'c₁ = ' + C1, GOLD);
  yield S(() => { stageT.setText('c₁ = gᵏ mod p = ' + C1 + ' —— k 藏进指数'); });
  yield W(850);
  setCell(c2Box, 'c₂ = ' + C2, GOLD);
  yield S(() => { stageT.setText('c₂ = m·yᵏ = ' + C2 + '；密文 = (' + C1 + ', ' + C2 + ')'); hint.setText('概率性：同一 m 换 k 密文完全不同，防重复识别'); });
  yield W(900);
  setCell(sBox, 's = ' + SS, PUR);
  yield S(() => { stageT.setText('s = c₁ˣ mod p = ' + SS + ' —— 只有爱丽丝能算（x 私密）'); eqT.setText('yᵏ = g^(xk) = (gᵏ)ˣ = c₁ˣ —— 殊途同归'); });
  yield W(900);
  setCell(invBox, 's⁻¹ = ' + INV, PUR);
  yield S(() => { stageT.setText('s⁻¹ = ' + INV + '（' + SS + '×' + INV + ' ≡ 1）—— 扩展欧几里得'); });
  yield W(850);
  setCell(mBox, 'm = ' + MR, GREEN);
  eqT.setText('');
  outT.setText('m = c₂·s⁻¹ = ' + MR + ' ✓ 明文还原');
  status.textContent = 'ElGamal: p=' + P + ' g=' + G + ' x=' + X + ' y=' + Y + '；m=' + M + ' k=' + K + ' → (c₁,c₂)=(' + C1 + ',' + C2 + ') → 还原 m=' + MR;
  yield S(() => { stageT.setText('解密：m = c₂·s⁻¹ = ' + MR + ' ✓；无 x 解不开 s'); hint.setText('安全性：破解 = 离散对数/DH 问题（CPA 安全）'); });
  yield W(1000);
  yield S(() => { hint.setText('ElGamal 完成：m ✓；GPG/OpenPGP 加密基于它'); outT.setText(''); });
  yield W(400);
}

function* runElGamal() {
  hint.setText('ElGamal：概率性公钥加密');
  yield W(400);
  yield* elgamalGen();
}

engine.queue(() => runElGamal());
panel.addButton('清空', () => {
  engine.clear();
  [gBox, pBox, xBox, yBox, kBox, c1Box, c2Box, sBox, invBox, mBox].forEach(b => setCell(b, '', DIM));
  stageT.setText(''); eqT.setText(''); outT.setText('');
  hint.setText('已清空，可重新运行'); status.textContent = '';
});
panel.addLabel('（拖拽旋转视角，滚轮缩放；青 = 公开参数，红 = 私钥，紫 = 公钥/共享秘密，橙 = 随机数，金 = 密文，绿 = 还原明文）');

scene.start(engine);
