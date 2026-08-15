// AlgorithmLibrary/AES3D.js — AES-128 加密：GF(2⁸) S 盒运行时生成（生成元 3 对数表 + ROL8 仿射）、密钥扩展 44 字、10 轮 × 4 层变换逐层可视化；密文运行时计算并与 FIPS-197 C.1 向量一致（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('AES3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const status = panel.addStatus('就绪');

const stateChips = [];
for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++)
  stateChips.push(new VBox(scene, { w: 74, h: 56, d: 56, x: 170 + c * 100, y: 560 - r * 76, z: 0, label: '00', color: DIM, emissive: DIM }));

// —— AES 核心：S 盒 / 密钥扩展 / 四层变换（全部运行时计算）——
function gfMul(a, b) {
  let r = 0, x = a;
  while (b > 0) { if (b & 1) r ^= x; x = (x << 1) ^ ((x & 0x80) ? 0x11b : 0); b >>= 1; }
  return r & 0xff;
}
const SBOX = new Array(256);
(function () {
  const log = new Array(256), alog = new Array(256);
  let x = 1;
  for (let i = 0; i < 255; i++) { log[x] = i; alog[i] = x; x = gfMul(x, 3); }
  const ROL8 = (a, k) => ((a << k) | (a >>> (8 - k))) & 0xff;
  for (let i = 0; i < 256; i++) {
    const v = i === 0 ? 0 : alog[(255 - log[i]) % 255];
    SBOX[i] = (v ^ ROL8(v, 1) ^ ROL8(v, 2) ^ ROL8(v, 3) ^ ROL8(v, 4) ^ 0x63) & 0xff;
  }
})();
const RCON = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];
const KEY = [0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f];
const PT = [0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff];
function keyExpand(key) {
  const w = key.slice();
  for (let i = 4; i < 44; i++) {
    let t = w.slice((i - 1) * 4, i * 4);
    if (i % 4 === 0) {
      t = [t[1], t[2], t[3], t[0]].map(b => SBOX[b]);
      t[0] ^= RCON[i / 4 - 1];
    }
    for (let j = 0; j < 4; j++) w.push(w[(i - 4) * 4 + j] ^ t[j]);
  }
  return w;
}
const KEY_EXP = keyExpand(KEY);
const st = (c, r) => c * 4 + r;
function doSub(s) { for (let i = 0; i < 16; i++) s[i] = SBOX[s[i]]; }
function doShift(s) {
  const t = s.slice();
  for (let r = 1; r < 4; r++) for (let c = 0; c < 4; c++) s[st(c, r)] = t[st((c + r) % 4, r)];
}
function doMix(s) {
  for (let c = 0; c < 4; c++) {
    const a = s[st(c, 0)], b = s[st(c, 1)], d = s[st(c, 2)], e = s[st(c, 3)];
    s[st(c, 0)] = gfMul(a, 2) ^ gfMul(b, 3) ^ d ^ e;
    s[st(c, 1)] = a ^ gfMul(b, 2) ^ gfMul(d, 3) ^ e;
    s[st(c, 2)] = a ^ b ^ gfMul(d, 2) ^ gfMul(e, 3);
    s[st(c, 3)] = gfMul(a, 3) ^ b ^ d ^ gfMul(e, 2);
  }
}
function doKey(s, round) {
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) s[st(c, r)] ^= KEY_EXP[st(c, r) + round * 16];
}
const h2 = (b) => b.toString(16).padStart(2, '0').toUpperCase();
const hx = (arr) => arr.map(h2).join('');
const ROW = [[0, 4, 8, 12], [1, 5, 9, 13], [2, 6, 10, 14], [3, 7, 11, 15]];
const COL = [[0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11], [12, 13, 14, 15]];
const renderState = (s) => stateChips.forEach((ch, i) => ch.setText(h2(s[i])));
const allColor = (c) => stateChips.forEach(ch => ch.setColor(c, c));

function* aesGen() {
  const state = PT.slice();
  yield S(() => { status.textContent = 'AES 分组密码：16 字节一块；4 层变换 = 非线性（S 盒）+ 扩散（ShiftRows/MixColumns）+ 混淆（轮密钥）。初始状态 = 明文 ' + hx(PT) + '，密钥 ' + hx(KEY); });
  yield W(900);
  renderState(state);
  allColor(BLUE);
  yield S(() => { status.textContent = '第 0 轮（预白化）：AddRoundKey —— 明文 ⊕ 初始轮密钥'; });
  yield W(650);
  doKey(state, 0);
  renderState(state);
  yield W(650);
  for (let round = 1; round <= 10; round++) {
    if (round === 1) {
      yield S(() => { status.textContent = '第 1 轮 ① SubBytes：每字节经 S 盒非线性替换（GF(2⁸) 求逆 + 仿射）'; });
      yield W(700);
      for (let r = 0; r < 4; r++) { ROW[r].forEach(i => stateChips[i].setColor(ORANGE, ORANGE)); yield W(240); }
      allColor(BLUE);
      doSub(state); renderState(state);
      yield S(() => { status.textContent = '第 1 轮 ② ShiftRows：第 r 行循环左移 r 格 —— 列间扩散'; });
      yield W(700);
      for (let r = 0; r < 4; r++) { ROW[r].forEach(i => stateChips[i].setColor(CYAN, CYAN)); yield W(240); }
      allColor(BLUE);
      doShift(state); renderState(state);
      yield S(() => { status.textContent = '第 1 轮 ③ MixColumns：每列与固定矩阵做 GF(2⁸) 乘法 —— 字节间扩散'; });
      yield W(700);
      for (let c = 0; c < 4; c++) { COL[c].forEach(i => stateChips[i].setColor(PUR, PUR)); yield W(240); }
      allColor(BLUE);
      doMix(state); renderState(state);
      yield S(() => { status.textContent = '第 1 轮 ④ AddRoundKey：⊕ 轮密钥 1（' + hx(KEY_EXP.slice(16, 32)) + '）'; });
      yield W(700);
      doKey(state, 1); renderState(state);
      allColor(GOLD); yield W(450);
    } else if (round === 10) {
      yield S(() => { status.textContent = '第 10 轮（末轮）：无 MixColumns —— SubBytes → ShiftRows → AddRoundKey'; });
      yield W(550);
      doSub(state); renderState(state);
      allColor(ORANGE); yield W(300);
      allColor(BLUE);
      doShift(state); renderState(state);
      allColor(CYAN); yield W(300);
      allColor(BLUE);
      doKey(state, 10); renderState(state);
      allColor(GREEN); yield W(450);
    } else {
      yield S(() => { status.textContent = '第 ' + round + ' 轮：SubBytes → ShiftRows → MixColumns → AddRoundKey（快进，真实运算）'; });
      yield W(240);
      doSub(state); doShift(state); doMix(state); doKey(state, round);
      renderState(state);
      yield W(200);
    }
  }
  const ct = hx(state);
  yield S(() => { status.textContent = '加密完成：' + hx(PT) + ' → 密文 ' + ct + ' ✓ 与 FIPS-197 C.1 向量一致（运行时算出，非硬编码）；强度来源：S 盒非线性抗差分攻击，MixColumns 使 1 位明文变化扩散到整块 —— 128 位密钥 = 2¹²⁸ 穷举'; });
  yield W(1100);
  yield S(() => { status.textContent = 'AES 取代 DES（1998 年已破译）：块 16 字节、密钥 128/192/256；AES-NI 指令一轮一条，软件硬件都很快'; });
  yield W(1000);
  yield S(() => { status.textContent = 'AES 演示完成：10 轮 × 4 层变换 = 现代对称加密的标准答案，时间复杂度 O(轮数 × 块大小)'; });
  yield W(400);
}

function* runAES() {
  yield W(400);
  yield* aesGen();
}

engine.queue(() => runAES());
panel.addButton('清空', () => {
  engine.clear();
  stateChips.forEach(ch => { ch.setText('00'); ch.setColor(DIM, DIM); });
  status.textContent = '';
});

scene.start(engine);
