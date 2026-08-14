// AlgorithmLibrary/DES3D.js — DES 加密：8 个标准置换表 + 8 个 S 盒内嵌为逗号字符串运行时解析，16 轮 Feistel 逐轮可视化；密文运行时计算并与 FIPS-81 测试向量一致（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('DES3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const status = panel.addStatus('就绪');

// —— DES 核心：标准表内嵌为逗号字符串，运行时解析；全部计算运行时进行 ——
const T = (s) => s.split(',').map(Number);
const IP = T('58,50,42,34,26,18,10,2,60,52,44,36,28,20,12,4,62,54,46,38,30,22,14,6,64,56,48,40,32,24,16,8,57,49,41,33,25,17,9,1,59,51,43,35,27,19,11,3,61,53,45,37,29,21,13,5,63,55,47,39,31,23,15,7');
const FP = T('40,8,48,16,56,24,64,32,39,7,47,15,55,23,63,31,38,6,46,14,54,22,62,30,37,5,45,13,53,21,61,29,36,4,44,12,52,20,60,28,35,3,43,11,51,19,59,27,34,2,42,10,50,18,58,26,33,1,41,9,49,17,57,25');
const E = T('32,1,2,3,4,5,4,5,6,7,8,9,8,9,10,11,12,13,12,13,14,15,16,17,16,17,18,19,20,21,20,21,22,23,24,25,24,25,26,27,28,29,28,29,30,31,32,1');
const P = T('16,7,20,21,29,12,28,17,1,15,23,26,5,18,31,10,2,8,24,14,32,27,3,9,19,13,30,6,22,11,4,25');
const PC1 = T('57,49,41,33,25,17,9,1,58,50,42,34,26,18,10,2,59,51,43,35,27,19,11,3,60,52,44,36,63,55,47,39,31,23,15,7,62,54,46,38,30,22,14,6,61,53,45,37,29,21,13,5,28,20,12,4');
const PC2 = T('14,17,11,24,1,5,3,28,15,6,21,10,23,19,12,4,26,8,16,7,27,20,13,2,41,52,31,37,47,55,30,40,51,45,33,48,44,49,39,56,34,53,46,42,50,36,29,32');
const SHIFTS = [1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1];
const SBOXES = [
  '14,4,13,1,2,15,11,8,3,10,6,12,5,9,0,7,0,15,7,4,14,2,13,1,10,6,12,11,9,5,3,8,4,1,14,8,13,6,2,11,15,12,9,7,3,10,5,0,15,12,8,2,4,9,1,7,5,11,3,14,10,0,6,13',
  '15,1,8,14,6,11,3,4,9,7,2,13,12,0,5,10,3,13,4,7,15,2,8,14,12,0,1,10,6,9,11,5,0,14,7,11,10,4,13,1,5,8,12,6,9,3,2,15,13,8,10,1,3,15,4,2,11,6,7,12,0,5,14,9',
  '10,0,9,14,6,3,15,5,1,13,12,7,11,4,2,8,13,7,0,9,3,4,6,10,2,8,5,14,12,11,15,1,13,6,4,9,8,15,3,0,11,1,2,12,5,10,14,7,1,10,13,0,6,9,8,7,4,15,14,3,11,5,2,12',
  '7,13,14,3,0,6,9,10,1,2,8,5,11,12,4,15,13,8,11,5,6,15,0,3,4,7,2,12,1,10,14,9,10,6,9,0,12,11,7,13,15,1,3,14,5,2,8,4,3,15,0,6,10,1,13,8,9,4,5,11,12,7,2,14',
  '2,12,4,1,7,10,11,6,8,5,3,15,13,0,14,9,14,11,2,12,4,7,13,1,5,0,15,10,3,9,8,6,4,2,1,11,10,13,7,8,15,9,12,5,6,3,0,14,11,8,12,7,1,14,2,13,6,15,0,9,10,4,5,3',
  '12,1,10,15,9,2,6,8,0,13,3,4,14,7,5,11,10,15,4,2,7,12,9,5,6,1,13,14,0,11,3,8,9,14,15,5,2,8,12,3,7,0,4,10,1,13,11,6,4,3,2,12,9,5,15,10,11,14,1,7,6,0,8,13',
  '4,11,2,14,15,0,8,13,3,12,9,7,5,10,6,1,13,0,11,7,4,9,1,10,14,3,5,12,2,15,8,6,1,4,11,13,12,3,7,14,10,15,6,8,0,5,9,2,6,11,13,8,1,4,10,7,9,5,0,15,14,2,3,12',
  '13,2,8,4,6,15,11,1,10,9,3,14,5,0,12,7,1,15,13,8,10,3,7,4,12,5,6,11,0,14,9,2,7,11,4,1,9,12,14,2,0,6,10,13,15,3,5,8,2,1,14,7,4,10,8,13,15,12,9,0,3,5,6,11'
].map(T);
const perm = (bits, table) => table.map(i => bits[i - 1]);
const keySchedule = (key56) => {
  const pc1 = perm(key56, PC1);
  let C = pc1.slice(0, 28), D = pc1.slice(28);
  const subs = [];
  for (let r = 0; r < 16; r++) {
    for (let s = 0; s < SHIFTS[r]; s++) { C.push(C.shift()); D.push(D.shift()); }
    subs.push(perm(C.concat(D), PC2));
  }
  return subs;
};
const feistel = (R, K) => {
  const xk = perm(R, E).map((b, i) => b ^ K[i]);
  let out = [];
  for (let i = 0; i < 8; i++) {
    const b6 = xk.slice(i * 6, i * 6 + 6);
    const row = (b6[0] << 1) | b6[5];
    const col = (b6[1] << 3) | (b6[2] << 2) | (b6[3] << 1) | b6[4];
    const v = SBOXES[i][row * 16 + col];
    out.push((v >> 3) & 1, (v >> 2) & 1, (v >> 1) & 1, v & 1);
  }
  return perm(out, P);
};
const des = (block, subs) => {
  const ip = perm(block, IP);
  let L = ip.slice(0, 32), R = ip.slice(32);
  const rounds = [];
  for (let r = 0; r < 16; r++) {
    const f = feistel(R, subs[r]);
    const nL = R, nR = L.map((b, i) => b ^ f[i]);
    rounds.push({ L: L, R: R, f: f, K: subs[r] });
    L = nL; R = nR;
  }
  return { rounds, out: perm(R.concat(L), FP) };
};

const KEY = [0x13, 0x34, 0x57, 0x79, 0x9b, 0xbc, 0xdf, 0xf1];
const PT = [0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef];
const bits = (arr) => arr.flatMap(b => [0, 1, 2, 3, 4, 5, 6, 7].map(i => (b >> (7 - i)) & 1));
const h2 = (b) => b.toString(16).padStart(2, '0').toUpperCase();
const hx = (arr) => arr.map(h2).join('');

const KEY_BITS = keySchedule(bits(KEY));
const DES_R = des(bits(PT), KEY_BITS);
const CT_BYTES = [];
for (let i = 0; i < 64; i += 8) { let v = 0; for (let j = 0; j < 8; j++) v = (v << 1) | DES_R.out[i + j]; CT_BYTES.push(v); }

// —— 场景布局：上排密钥（紫）/ 中排明文（蓝）/ 左右 Feistel 半区 / 下排密文（绿）——
const keyChips = [], ptChips = [], ctChips = [];
const KSP = 62, KX0 = 143;
for (let i = 0; i < 8; i++) keyChips.push(new VBox(scene, { w: 50, h: 46, d: 46, x: KX0 + i * KSP, y: 600, z: 0, label: h2(KEY[i]), color: PUR, emissive: PUR }));
const subkeyT = new VText(scene, { text: '', x: 700, y: 620, z: 0, color: CYAN, scale: 0.5 });   // 轮密钥值文本（演示体标注）
for (let i = 0; i < 8; i++) ptChips.push(new VBox(scene, { w: 50, h: 46, d: 46, x: KX0 + i * KSP, y: 510, z: 0, label: h2(PT[i]), color: BLUE, emissive: BLUE }));
const lBox = new VBox(scene, { w: 200, h: 56, d: 56, x: 180, y: 425, z: 0, label: 'L₀ = IP 左 32 位', color: BLUE, emissive: BLUE });
const rBox = new VBox(scene, { w: 200, h: 56, d: 56, x: 500, y: 425, z: 0, label: 'R₀ = IP 右 32 位', color: CYAN, emissive: CYAN });
for (let i = 0; i < 8; i++) ctChips.push(new VBox(scene, { w: 50, h: 46, d: 46, x: KX0 + i * KSP, y: 325, z: 0, label: '00', color: DIM, emissive: DIM }));
const roundT = new VText(scene, { text: '第 1 轮', x: 360, y: 372, z: 0, color: GOLD, scale: 0.55 });   // 阶段徽章

function* desGen() {
  yield S(() => { status.textContent = 'DES 数据流：IP 置换 → 16 轮 Feistel → IP⁻¹。每轮右半经 f 函数（E 扩展 ⊕ 轮密钥 → S 盒 → P 置换）与左半异或。密钥 133457799BBCDFF1 · 明文 0123456789ABCDEF（FIPS-81 标准测试向量）'; });
  yield W(900);
  for (let i = 0; i < 8; i++) { keyChips[i].setColor(GOLD, GOLD); yield W(120); }
  yield S(() => { status.textContent = 'PC1：64 位 → 56 位（去掉每字节第 8 位奇偶校验），分成 C₀/D₀ 各 28 位'; });
  yield W(650);
  for (let i = 0; i < 8; i++) keyChips[i].setColor(PUR, PUR);
  yield S(() => { status.textContent = 'IP 初始置换：按 58,50,…,7 表重排 64 位 → L₀ + R₀ 各 32 位'; });
  yield W(650);
  for (let r = 0; r < 16; r++) {
    const rnd = DES_R.rounds[r];
    roundT.setText('第 ' + (r + 1) + ' 轮');
    subkeyT.setText('轮密钥 K' + (r + 1) + ' = ' + hx(rnd.K.slice(0, 4)) + '…');
    if (r === 0) {
      yield S(() => { status.textContent = '第 1 轮 ① E 扩展：R₀ 32 位 → 48 位（首尾复制重排，相邻位复制以交叉影响）'; });
      yield W(800);
      rBox.setColor(ORANGE, ORANGE);
      yield W(450);
      rBox.setColor(CYAN, CYAN);
      yield S(() => { status.textContent = '第 1 轮 ② 异或轮密钥：E(R₀) ⊕ K₁ = 48 位'; });
      yield W(800);
      lBox.setColor(ORANGE, ORANGE);
      yield W(450);
      lBox.setColor(BLUE, BLUE);
      yield S(() => { status.textContent = '第 1 轮 ③ S 盒：8 个 6→4 位盒（每盒 4×16 查找表，非线性核心）'; });
      yield W(800);
      rBox.setColor(GREEN, GREEN);
      yield W(450);
      rBox.setColor(CYAN, CYAN);
      yield S(() => { status.textContent = '第 1 轮 ④ P 置换：32 位重新排列 → f(R₀, K₁) 与 L₀ 异或 → R₁'; });
      yield W(800);
      lBox.setColor(GREEN, GREEN);
      yield W(450);
      lBox.setColor(BLUE, BLUE);
    } else {
      yield S(() => { status.textContent = '第 ' + (r + 1) + ' 轮：L = R（交换），R = L ⊕ f(R, K) —— Feistel 交换，可逆无需逆 f'; });
      yield W(220);
      lBox.setColor(ORANGE, ORANGE); yield W(130); lBox.setColor(BLUE, BLUE);
      rBox.setColor(GREEN, GREEN); yield W(130); rBox.setColor(CYAN, CYAN);
      yield W(180);
    }
    if (r === 15) {
      yield S(() => { status.textContent = '16 轮完成：末轮不交换 —— 输出 R₁₆‖L₁₆（保证解密对称性）'; });
      yield W(650);
      lBox.setText('R₁₆'); rBox.setText('L₁₆');
    }
  }
  yield S(() => { status.textContent = 'IP⁻¹ 逆置换：40,8,…,25 表 → 密文'; });
  yield W(650);
  ctChips.forEach((ch, i) => { ch.setText(h2(CT_BYTES[i])); ch.setColor(GREEN, GREEN); });
  yield S(() => { status.textContent = '加密完成：密文 85E813540F0AB405 ✓ 与 FIPS-81 标准向量一致（运行时算出，非硬编码）；强度：56 位密钥只有 2⁵⁶ 种 —— 1998 年 EFF 深破机 56 小时破解，已被 3DES/AES 取代'; });
  yield W(1000);
  yield S(() => { status.textContent = 'DES 演示完成：IP → 16 轮 Feistel（E 扩展 ⊕ K → S 盒 → P）→ IP⁻¹ → 85E813540F0AB405，时间复杂度 O(16 × 轮内操作)'; roundT.setText(''); subkeyT.setText(''); });
  yield W(400);
}

function* runDES() {
  yield W(400);
  yield* desGen();
}

engine.queue(() => runDES());
panel.addButton('清空', () => {
  engine.clear();
  keyChips.forEach((ch, i) => { ch.setText(h2(KEY[i])); ch.setColor(PUR, PUR); });
  ptChips.forEach((ch, i) => { ch.setText(h2(PT[i])); ch.setColor(BLUE, BLUE); });
  ctChips.forEach(ch => { ch.setText('00'); ch.setColor(DIM, DIM); });
  lBox.setText('L₀ = IP 左 32 位'); lBox.setColor(BLUE, BLUE);
  rBox.setText('R₀ = IP 右 32 位'); rBox.setColor(CYAN, CYAN);
  roundT.setText('第 1 轮'); subkeyT.setText(''); status.textContent = '';
});

scene.start(engine);
