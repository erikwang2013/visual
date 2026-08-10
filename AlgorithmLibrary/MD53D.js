// AlgorithmLibrary/MD53D.js — MD5：4 轮×16 步压缩函数，A/B/C/D 寄存器流动，雪崩效应
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('MD53D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, AMBER = 0xfbbf24, ROSE = 0xfb7185, BLUE = 0x38bdf8;
const hint = new VText(scene, { text: '点击「运行 MD5」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const MSG = 'Hello';
const K = [0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501, 0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be, 0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821, 0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x2441453, 0xd8a1e681, 0xe7d3fbc8, 0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a, 0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c, 0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70, 0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x4881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665, 0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1, 0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1, 0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391];
const S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
const rol = (v, n) => ((v << n) | (v >>> (32 - n))) >>> 0;
const Fn = (x, y, z) => (x & y) | (~x & z), Gn = (x, y, z) => (x & z) | (y & ~z), Hn = (x, y, z) => x ^ y ^ z, In = (x, y, z) => y ^ (x | ~z);
function md5Run(str) {
  const bytes = new TextEncoder().encode(str);
  const len = bytes.length;
  const padded = [...bytes, 0x80];
  while (padded.length % 64 !== 56) padded.push(0);
  const bitLen = (len * 8) >>> 0;
  for (let i = 0; i < 8; i++) padded.push((bitLen >>> (8 * i)) & 0xff);
  const W = [];
  for (let i = 0; i < 64; i += 4) W.push((padded[i] | padded[i + 1] << 8 | padded[i + 2] << 16 | padded[i + 3] << 24) >>> 0);
  let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476;
  const snaps = [];
  for (let t = 0; t < 64; t++) {
    let f, g;
    if (t < 16) { f = Fn(b, c, d); g = t; }
    else if (t < 32) { f = Gn(b, c, d); g = (5 * t + 1) % 16; }
    else if (t < 48) { f = Hn(b, c, d); g = (3 * t + 5) % 16; }
    else { f = In(b, c, d); g = (7 * t) % 16; }
    const tmp = d; d = c; c = b;
    b = (b + rol((a + f + K[t] + W[g]) >>> 0, S[t])) >>> 0;
    a = tmp;
    snaps.push({ A: a, B: b, C: c, D: d, w: g, t, round: Math.floor(t / 16) });
  }
  return { snap: snaps, hex: [a, b, c, d].map(v => (v >>> 0).toString(16).padStart(8, '0')).join('') };
}
const run1 = md5Run(MSG);
const run2 = md5Run('Hellp');

const WX = [];
for (let i = 0; i < 16; i++) {
  WX.push(new VBox(scene, { w: 26, h: 22, d: 22, x: (i - 7.5) * 32, y: 90, z: 0, label: 'W' + i, color: DIM, emissive: DIM }));
}
const regs = [
  new VBox(scene, { w: 120, h: 60, d: 60, x: -165, y: -95, z: 0, label: 'A 67452301', color: ROSE, emissive: ROSE }),
  new VBox(scene, { w: 120, h: 60, d: 60, x: -55, y: -95, z: 0, label: 'B efcdab89', color: AMBER, emissive: AMBER }),
  new VBox(scene, { w: 120, h: 60, d: 60, x: 55, y: -95, z: 0, label: 'C 98badcfe', color: BLUE, emissive: BLUE }),
  new VBox(scene, { w: 120, h: 60, d: 60, x: 165, y: -95, z: 0, label: 'D 10325476', color: GREEN, emissive: GREEN }),
];
new VText(scene, { text: '消息 "Hello" → 填充到 512bit → 16 个字 W[0..15]', x: 0, y: 145, z: 0, color: PALETTE.textDim, scale: 0.7 });
new VText(scene, { text: 'F/G/H/I 非线性函数 · 循环左移 · 模加 K 常量', x: 0, y: -168, z: 0, color: PALETTE.textDim, scale: 0.6 });
const roundT = new VText(scene, { text: '', x: 0, y: 190, z: 0, color: GOLD, scale: 0.75 });
const outT = new VText(scene, { text: '', x: 0, y: -220, z: 0, color: PALETTE.textGlow, scale: 0.7 });

function resetAll() {
  engine.clear();
  WX.forEach(b => b.setColor(DIM, DIM));
  regs.forEach((r, i) => r.setText(['A 67452301', 'B efcdab89', 'C 98badcfe', 'D 10325476'][i]));
  roundT.setText(''); outT.setText('');
}

function runMD5() {
  resetAll();
  hint.setText('MD5 将消息压缩为 128bit 摘要；流程：补位 → 分块 → 4 轮×16 步压缩 → 拼接输出');
  C(800, () => {
    roundT.setText('消息填充完成：Hello(5B) + 0x80 + 零填充 + 长度 → 一个 512bit 块 = 16 个字');
  });
  for (let t = 0; t < 64; t += 2) {
    const s = run1.snap[t], s2 = run1.snap[Math.min(t + 1, 63)];
    C(300, () => {
      WX.forEach((b, i) => b.setColor(i === s.w || i === s2.w ? GOLD : DIM, i === s.w || i === s2.w ? GOLD : DIM));
      regs[0].setText('A ' + s.A.toString(16).padStart(8, '0'));
      regs[1].setText('B ' + s.B.toString(16).padStart(8, '0'));
      regs[2].setText('C ' + s.C.toString(16).padStart(8, '0'));
      regs[3].setText('D ' + s.D.toString(16).padStart(8, '0'));
      roundT.setText(`第 ${s.round + 1} 轮 · 步 ${s.t + 1}：a = b + rol(a + f(b,c,d) + K[${s.t}] + W[${s.w}], ${S[s.t]})`);
      hint.setText(`F/G/H/I 函数混合 b,c,d，叠加 K 常量与 W 字，循环左移 ${S[s.t]} 位`);
    });
  }
  C(900, () => {
    WX.forEach(b => b.setColor(DIM, DIM));
    roundT.setText('4 轮 64 步完成 → 拼接 A|B|C|D');
    outT.setText('MD5("Hello") = ' + run1.hex);
    status.textContent = 'MD5("Hello") = ' + run1.hex + ' —— 128bit 摘要';
    hint.setText('MD5 已可碰撞（工程改用 SHA-256/SM3），但仍是理解压缩函数的经典教材');
  });
  C(1100, () => {
    outT.setText('雪崩效应：MD5("Hellp") = ' + run2.hex + ' —— 仅改 1 个字符，摘要几乎全变');
    status.textContent = '雪崩：输入改 1 字符，输出从 ' + run1.hex + ' 变为 ' + run2.hex;
    hint.setText('密码学哈希必须满足雪崩性：任何 1 bit 输入变化 → 约一半输出 bit 翻转');
  });
}

panel.addButton('运行 MD5', runMD5);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；消息 "Hello"，对照 "Hellp" 观察雪崩）');

scene.start(engine);
