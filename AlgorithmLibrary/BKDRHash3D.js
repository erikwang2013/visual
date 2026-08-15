// AlgorithmLibrary/BKDRHash3D.js — BKDR 哈希：h = (h×31 + 字符码) mod 2³²，逐字符滚动混合，32 位寄存器位模式可视化（function* 生成器驱动，解说入状态栏）
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { Scene3D } from '../3D/Scene3D.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('BKDRHash3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const CYAN = 0x67e8f9, GOLD = 0xfcd34d, DIM = 0x334155;
const status = panel.addStatus('就绪');

const S1 = 'hello', S2 = 'world', SEED = 31, N = 5, BITS = 32;
function bkdr(s) {
  let h = 0;
  const steps = [];
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    const prev = h;
    h = (h * SEED + code) >>> 0;
    steps.push({ ch, code, prev, h });
  }
  return steps;
}
const steps1 = bkdr(S1), steps2 = bkdr(S2);
const H1 = steps1[N - 1].h, H2 = steps2[N - 1].h;

const CX = k => 320 + (k - 2) * 70;
const chars = S1.split('').map((ch, k) =>
  new VBox(scene, { w: 54, h: 54, d: 54, x: CX(k), y: 470, z: 0, label: ch, color: DIM, emissive: DIM }));
const codes = S1.split('').map((_, k) =>
  new VText(scene, { text: '', x: CX(k), y: 500, z: 0, color: PALETTE.textDim, scale: 0.42 }));
const regT = new VText(scene, { text: 'hash 寄存器（32 位）', x: 320, y: 255, z: 0, color: PALETTE.textDim, scale: 0.55 });
const hT = new VText(scene, { text: 'h = 0', x: 320, y: 382, z: 0, color: GOLD, scale: 0.66 });
const bits = [...Array(BITS)].map((_, b) =>
  new VBox(scene, { w: 11, h: 11, d: 11, x: 103 + b * 14, y: 300, z: 0, label: b % 4 === 0 ? String(BITS - 1 - b) : '', color: DIM, emissive: DIM }));

function setBits(h) {
  bits.forEach((b, i) => {
    const on = ((h >>> (BITS - 1 - i)) & 1) === 1;
    b.setColor(on ? GOLD : DIM, on ? GOLD : DIM);
  });
}
function resetAll() {
  chars.forEach((c, k) => { c.setColor(DIM, DIM); c.setText(S1[k]); });
  codes.forEach(t => t.setText(''));
  setBits(0);
  hT.setText('h = 0');
}

function* bkdrGen() {
  resetAll();
  yield S(() => { status.textContent = 'BKDR 哈希：把字符串逐字符滚成整数 h = (h × 31 + 字符码) mod 2³² —— 31 是小质数，乘法快且分布均匀，JDK 的 String.hashCode 正是它'; });
  yield W(700);
  yield S(() => { status.textContent = '「hello」5 个字符逐个送入寄存器（青 = 当前字符，金位 = 寄存器中的 1）'; });
  yield W(500);
  for (let t = 0; t < N; t++) {
    const s = steps1[t];
    yield S(() => {
      chars[t].setColor(CYAN, CYAN);
      codes[t].setText(String(s.code));
      status.textContent = '第 ' + (t + 1) + ' 字符 ' + s.ch + '（码 ' + s.code + '）：h = ' + s.prev + ' × 31 + ' + s.code;
    });
    yield W(600);
    yield S(() => {
      chars[t].setColor(GOLD, GOLD);
      setBits(s.h);
      hT.setText('h = ' + s.h);
      status.textContent = '滚入完成：h = ' + s.h + ' —— 乘 31 ≈ 左移 5 位再减自身，前序字符的贡献随位次保留，永不丢失';
    });
    yield W(650);
  }
  yield S(() => { status.textContent = '「hello」完成：BKDR(hello) = ' + H1 + '。换「world」送入同一个寄存器 —— 位序不同的词得到不同的哈希'; });
  yield W(900);
  yield S(() => {
    chars.forEach((c, k) => { c.setColor(DIM, DIM); c.setText(S2[k]); });
    codes.forEach(t => t.setText(''));
    setBits(0);
    hT.setText('h = 0');
    status.textContent = '「world」开始：第 1 字符 w（码 119）滚入';
  });
  yield W(500);
  for (let t = 0; t < N; t++) {
    const s = steps2[t];
    yield S(() => {
      chars[t].setColor(CYAN, CYAN);
      codes[t].setText(String(s.code));
      status.textContent = '第 ' + (t + 1) + ' 字符 ' + s.ch + '（码 ' + s.code + '）：h = ' + s.prev + ' × 31 + ' + s.code;
    });
    yield W(600);
    yield S(() => {
      chars[t].setColor(GOLD, GOLD);
      setBits(s.h);
      hT.setText('h = ' + s.h);
      status.textContent = '滚入完成：h = ' + s.h;
    });
    yield W(650);
  }
  yield S(() => { status.textContent = 'BKDRHash 演示完成：hello → ' + H1 + '，world → ' + H2 + '（位序不同 → 值不同，冲突少）；复杂度：O(n)（每字符一次乘法与加法）'; });
  yield W(1000);
}

engine.queue(() => bkdrGen());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
