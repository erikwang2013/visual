// AlgorithmLibrary/SHA2563D.js — SHA-256：8 寄存器 + 64 轮 + 消息扩展 W[16..63]，输出 256bit 摘要
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('SHA2563D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, CYAN = 0x67e8f9, BLUE = 0x38bdf8, ROSE = 0xfb7185;
const hint = new VText(scene, { text: '点击「运行 SHA-256」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const MSG = 'Hello';
const HK = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
const rr = (v, n) => (v >>> n) | (v << (32 - n));
const sr = (v, n) => v >>> n;
function sha256Run(str) {
  const bytes = new TextEncoder().encode(str);
  const len = bytes.length;
  const padded = [...bytes, 0x80];
  while (padded.length % 64 !== 56) padded.push(0);
  for (let i = 7; i >= 0; i--) padded.push((Math.floor(len * 8 / Math.pow(2, 8 * i))) & 0xff);
  const W = [];
  for (let i = 0; i < 64; i += 4) W.push(((padded[i] << 24) | (padded[i + 1] << 16) | (padded[i + 2] << 8) | padded[i + 3]) >>> 0);
  for (let t = 16; t < 64; t++) {
    const s0 = rr(W[t - 15], 7) ^ rr(W[t - 15], 18) ^ sr(W[t - 15], 3);
    const s1 = rr(W[t - 2], 17) ^ rr(W[t - 2], 19) ^ sr(W[t - 2], 10);
    W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0;
  }
  let a = 0x6a09e667, b = 0xbb67ae85, c = 0x3c6ef372, d = 0xa54ff53a, e = 0x510e527f, f = 0x9b05688c, g = 0x1f83d9ab, h = 0x5be0cd19;
  const snaps = [];
  for (let t = 0; t < 64; t++) {
    const S1 = rr(e, 6) ^ rr(e, 11) ^ rr(e, 25);
    const ch = (e & f) ^ (~e & g);
    const t1 = (h + S1 + ch + HK[t] + W[t]) >>> 0;
    const S0 = rr(a, 2) ^ rr(a, 13) ^ rr(a, 22);
    const maj = (a & b) ^ (a & c) ^ (b & c);
    const t2 = (S0 + maj) >>> 0;
    h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    snaps.push({ A: a, B: b, C: c, D: d, E: e, F: f, G: g, H: h, t, w: W[t] });
  }
  const st = [a, b, c, d, e, f, g, h].map(v => (v >>> 0).toString(16).padStart(8, '0')).join('');
  return { snap: snaps, hex: st, W };
}
const run1 = sha256Run(MSG);
const run2 = sha256Run('Hellp');

const INIT = ['6a09e667', 'bb67ae85', '3c6ef372', 'a54ff53a', '510e527f', '9b05688c', '1f83d9ab', '5be0cd19'];
const regBoxes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((name, i) => {
  const x = (i - 3.5) * 62;
  return new VBox(scene, { w: 50, h: 44, d: 44, x, y: 105, z: 0, label: name + ' ' + INIT[i], color: i < 4 ? CYAN : BLUE, emissive: i < 4 ? CYAN : BLUE });
});
const wk = [];
for (let i = 0; i < 16; i++) {
  wk.push(new VBox(scene, { w: 26, h: 20, d: 20, x: (i - 7.5) * 32, y: -35, z: 0, label: 'W' + i, color: DIM, emissive: DIM }));
}
const rounds = [];
for (let r = 0; r < 64; r++) {
  rounds.push(new VBox(scene, { w: 7, h: 8, d: 8, x: (r - 31.5) * 8.2, y: -105, z: 0, color: DIM, emissive: DIM }));
}
new VText(scene, { text: '8 个寄存器 A–H（初值取自前 8 素数平方根小数部分）', x: 0, y: 175, z: 0, color: PALETTE.textDim, scale: 0.7 });
new VText(scene, { text: '消息扩展 W[16..63]：σ0/σ1 异或混合 · 64 轮压缩', x: 0, y: -10, z: 0, color: PALETTE.textDim, scale: 0.65 });
new VText(scene, { text: '64 轮进度（每轮：T1=Σ1(e)+Ch(e,f,g)+K+W · T2=Σ0(a)+Maj(a,b,c)）', x: 0, y: -140, z: 0, color: PALETTE.textDim, scale: 0.6 });
const roundT = new VText(scene, { text: '', x: 0, y: 205, z: 0, color: GOLD, scale: 0.75 });
const outT = new VText(scene, { text: '', x: 0, y: -185, z: 0, color: PALETTE.textGlow, scale: 0.65 });

function resetAll() {
  engine.clear();
  regBoxes.forEach((r, i) => r.setText(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'][i] + ' ' + INIT[i]));
  wk.forEach((b, i) => { b.setColor(DIM, DIM); b.setText('W' + i); });
  rounds.forEach(b => b.setColor(DIM, DIM));
  roundT.setText(''); outT.setText('');
}

function runSHA() {
  resetAll();
  hint.setText('SHA-256 输出 256bit；与 MD5 相比：8 个寄存器、64 轮、更强的扩展，至今抗碰撞');
  C(800, () => {
    roundT.setText('消息 "Hello" 填充为 512bit 块；W[0..15] 直接取自块，W[16..63] 由 σ0/σ1 扩展生成');
  });
  for (let t = 0; t < 64; t += 4) {
    const s = run1.snap[t];
    C(340, () => {
      const wIdx = t + 3;
      for (let i = 0; i < 16; i++) wk[i].setColor(i === (wIdx % 16) ? GOLD : DIM, i === (wIdx % 16) ? GOLD : DIM);
      for (let r = 0; r < 64; r++) rounds[r].setColor(r <= t + 3 ? GREEN : DIM, r <= t + 3 ? GREEN : DIM);
      regBoxes.forEach((b, i) => {
        const v = [s.A, s.B, s.C, s.D, s.E, s.F, s.G, s.H][i];
        b.setText(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'][i] + ' ' + (v >>> 0).toString(16).padStart(8, '0'));
      });
      roundT.setText(`第 ${t + 1}–${t + 4} 轮：T1 = Σ1(e)+Ch(e,f,g)+K[${t}]+W[${t}]，T2 = Σ0(a)+Maj(a,b,c)`);
      hint.setText('每轮 8 寄存器整体右移一位：h←g←f←e←(d+T1)←c←b←a←(T1+T2)，全部模 2³²');
    });
  }
  C(900, () => {
    roundT.setText('64 轮完成 → 与初始向量模加 → 拼接 8 个字');
    outT.setText('SHA-256("Hello") = ' + run1.hex);
    status.textContent = 'SHA-256("Hello") = ' + run1.hex + ' —— 256bit 摘要';
    hint.setText('SHA-256 是比特币工作量证明与 TLS 的核心原语，至今未被实际攻破');
  });
  C(1100, () => {
    outT.setText('雪崩：SHA-256("Hellp") = ' + run2.hex + ' —— 1 字符之差，64 位 hex 面目全非');
    status.textContent = '雪崩：' + run1.hex + ' → ' + run2.hex;
    hint.setText('SHA-3（Keccak）是新标准：海绵结构、无长度扩展攻击，可并行');
  });
}

panel.addButton('运行 SHA-256', runSHA);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；消息 "Hello"，对照 "Hellp"）');

scene.start(engine);
