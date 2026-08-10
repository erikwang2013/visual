// AlgorithmLibrary/SM33D.js — SM3（国密）：8 寄存器 + 64 轮 + P0/P1 置换，GB/T 32905-2016
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('SM33D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, DIM = 0x334155, RED = 0xf87171, GOLD2 = 0xfbbf24, ROSE = 0xfb7185;
const hint = new VText(scene, { text: '点击「运行 SM3」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const MSG = 'Hello';
const rol = (v, n) => ((v << n) | (v >>> (32 - n))) >>> 0;
const P0 = X => (X ^ rol(X, 9) ^ rol(X, 17)) >>> 0;
const P1 = X => (X ^ rol(X, 15) ^ rol(X, 23)) >>> 0;
function sm3Run(str) {
  const bytes = new TextEncoder().encode(str);
  const len = bytes.length;
  const padded = [...bytes, 0x80];
  while (padded.length % 64 !== 56) padded.push(0);
  for (let i = 7; i >= 0; i--) padded.push((Math.floor(len * 8 / Math.pow(2, 8 * i))) & 0xff);
  const W = [];
  for (let i = 0; i < 64; i += 4) W.push(((padded[i] << 24) | (padded[i + 1] << 16) | (padded[i + 2] << 8) | padded[i + 3]) >>> 0);
  for (let j = 16; j < 68; j++) {
    W[j] = (P1(W[j - 16] ^ W[j - 9] ^ rol(W[j - 3], 15)) ^ rol(W[j - 13], 7) ^ W[j - 6]) >>> 0;
  }
  const WP = [];
  for (let j = 0; j < 64; j++) WP[j] = (W[j] ^ W[j + 4]) >>> 0;
  let A = 0x7380166f, B = 0x4914b2b9, C = 0x172442d7, D = 0xda8a0600, E = 0xa96f30bc, F = 0x163138aa, G = 0xe38dee4d, H = 0xb0fb0e4e;
  const snaps = [];
  for (let j = 0; j < 64; j++) {
    const T = j < 16 ? 0x79cc4519 : 0x7a879d8a;
    const FF = j < 16 ? (X, Y, Z) => X ^ Y ^ Z : (X, Y, Z) => ((X & Y) | (X & Z) | (Y & Z)) >>> 0;
    const GG = j < 16 ? (X, Y, Z) => X ^ Y ^ Z : (X, Y, Z) => ((X & Y) | (~X & Z)) >>> 0;
    const SS1 = rol((rol(A, 12) + E + rol(T, j % 32)) >>> 0, 7);
    const SS2 = (SS1 ^ rol(A, 12)) >>> 0;
    const TT1 = (FF(A, B, C) + D + SS2 + WP[j]) >>> 0;
    const TT2 = (GG(E, F, G) + H + SS1 + W[j]) >>> 0;
    D = C; C = rol(B, 9); B = A; A = TT1;
    H = G; G = rol(F, 19); F = E; E = P0(TT2);
    snaps.push({ A, B, C, D, E, F, G, H, j, w: W[j], wp: WP[j], phase: j < 16 ? '前 16 轮 FF/GG=异或（扩散快）' : '后 48 轮 FF/GG=逻辑门（雪崩强）' });
  }
  const hex = [A, B, C, D, E, F, G, H].map(v => (v >>> 0).toString(16).padStart(8, '0')).join('');
  return { snap: snaps, hex };
}
const run1 = sm3Run(MSG);
const run2 = sm3Run('Hellp');

const INIT = ['7380166f', '4914b2b9', '172442d7', 'da8a0600', 'a96f30bc', '163138aa', 'e38dee4d', 'b0fb0e4e'];
const regBoxes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((name, i) => {
  const x = (i - 3.5) * 62;
  return new VBox(scene, { w: 50, h: 44, d: 44, x, y: 105, z: 0, label: name + ' ' + INIT[i], color: i < 4 ? RED : GOLD2, emissive: i < 4 ? RED : GOLD2 });
});
const wk = [];
for (let i = 0; i < 16; i++) {
  wk.push(new VBox(scene, { w: 26, h: 20, d: 20, x: (i - 7.5) * 32, y: -35, z: 0, label: 'W' + i, color: DIM, emissive: DIM }));
}
const rounds = [];
for (let r = 0; r < 64; r++) {
  rounds.push(new VBox(scene, { w: 7, h: 8, d: 8, x: (r - 31.5) * 8.2, y: -105, z: 0, color: DIM, emissive: DIM }));
}
new VText(scene, { text: 'SM3 国密标准（GB/T 32905-2016）· 8 寄存器 IV 为国密常数', x: 0, y: 175, z: 0, color: PALETTE.textDim, scale: 0.7 });
new VText(scene, { text: '消息扩展 W[16..67] 用 P1 置换；W′[j] = W[j] ⊕ W[j+4]', x: 0, y: -10, z: 0, color: PALETTE.textDim, scale: 0.65 });
new VText(scene, { text: '压缩每轮：SS1←((A<<<12)+E+(T<<<j))<<<7 · FF/GG · P0 置换 · 寄存器级联', x: 0, y: -140, z: 0, color: PALETTE.textDim, scale: 0.6 });
const roundT = new VText(scene, { text: '', x: 0, y: 205, z: 0, color: GOLD, scale: 0.75 });
const outT = new VText(scene, { text: '', x: 0, y: -185, z: 0, color: PALETTE.textGlow, scale: 0.65 });

function resetAll() {
  engine.clear();
  regBoxes.forEach((r, i) => r.setText(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'][i] + ' ' + INIT[i]));
  wk.forEach((b, i) => { b.setColor(DIM, DIM); b.setText('W' + i); });
  rounds.forEach(b => b.setColor(DIM, DIM));
  roundT.setText(''); outT.setText('');
}

function runSM3() {
  resetAll();
  hint.setText('SM3 与 SHA-256 同构：256bit 摘要、64 轮；区别在 P0/P1 置换与 FF/GG 门 —— 国产自研');
  C(800, () => {
    roundT.setText('消息 "Hello" 填充为 512bit 块 → 16 个字 → P1 扩展出 W[16..67]');
  });
  for (let j = 0; j < 64; j += 4) {
    const s = run1.snap[j];
    C(340, () => {
      const wi = (j + 3) % 16;
      for (let i = 0; i < 16; i++) wk[i].setColor(i === wi ? ROSE : DIM, i === wi ? ROSE : DIM);
      for (let r = 0; r < 64; r++) rounds[r].setColor(r <= j + 3 ? GOLD : DIM, r <= j + 3 ? GOLD : DIM);
      regBoxes.forEach((b, i) => {
        const v = [s.A, s.B, s.C, s.D, s.E, s.F, s.G, s.H][i];
        b.setText(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'][i] + ' ' + (v >>> 0).toString(16).padStart(8, '0'));
      });
      roundT.setText(`第 ${j + 1}–${j + 4} 轮（${s.phase}）`);
      hint.setText('SS1/SS2 由 A,E 与轮常量 T 旋转生成；TT1/TT2 分别驱动左右寄存器；P0 置换 E');
    });
  }
  C(900, () => {
    roundT.setText('64 轮完成 → 与初始 IV 模加 → 拼接 8 个字（256bit）');
    outT.setText('SM3("Hello") = ' + run1.hex);
    status.textContent = 'SM3("Hello") = ' + run1.hex + ' —— 国密 256bit 摘要';
    hint.setText('SM3 用于国密 TLS/证书/区块链，安全性对标 SHA-256');
  });
  C(1100, () => {
    outT.setText('雪崩：SM3("Hellp") = ' + run2.hex + ' —— 1 字符之差，摘要全变');
    status.textContent = '雪崩：' + run1.hex + ' → ' + run2.hex;
    hint.setText('与 SHA-256 相比，SM3 的 P0/P1 双置换使差分路径更难构造');
  });
}

panel.addButton('运行 SM3', runSM3);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；消息 "Hello"，对照 "Hellp"）');

scene.start(engine);
