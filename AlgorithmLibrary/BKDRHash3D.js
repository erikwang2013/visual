// AlgorithmLibrary/BKDRHash3D.js — BKDR 哈希：h = h × 31 + 字符码，逐字符滚动混合，32 位位模式可视化（function* 生成器驱动）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('BKDRHash3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, ROSE = 0xfb7185, CYAN = 0x67e8f9, AMBER = 0xfbbf24;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：BKDR 哈希', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');

const S1 = 'hello', S2 = 'world', SEED = 31;

function bkdr(s, seed = SEED) {
  let h = 0;
  const steps = [];
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    const prev = h;
    h = (h * seed + code) >>> 0;
    steps.push({ ch, code, prev, h });
  }
  return steps;
}
const steps1 = bkdr(S1);
const steps2 = bkdr(S2);
const H1 = steps1[steps1.length - 1].h;
const H2 = steps2[steps2.length - 1].h;

const N = 5, BITS = 32;
const CX = k => -120 + k * 60 + 320;
const charBoxes = S1.split('').map((ch, k) =>
  new VBox(scene, { w: 50, h: 50, d: 50, x: CX(k), y: 470, z: 0, label: ch, color: DIM, emissive: DIM }));
const codeT = S1.split('').map((ch, k) =>
  new VText(scene, { text: '', x: CX(k), y: 496, z: 0, color: PALETTE.textDim, scale: 0.42 }));
const eqT = new VText(scene, { text: '', x: 320, y: 415, z: 0, color: PALETTE.textGlow, scale: 0.6 });
const hT = new VText(scene, { text: '', x: 320, y: 370, z: 0, color: GOLD, scale: 0.62 });
const bitBoxes = [...Array(BITS)].map((_, b) =>
  new VBox(scene, { w: 10, h: 10, d: 10, x: 103 + b * 14, y: 305, z: 0, label: b % 4 === 0 ? String((BITS - 1 - b)) : '', color: DIM, emissive: DIM }));
new VText(scene, { text: 'BKDR：乘 31 再加', x: 320, y: 525, z: 0, color: PALETTE.textDim, scale: 0.6 });
new VText(scene, { text: '下方 = 32 位寄存器的每一位（金色 = 1）；第 2 行演示「world」的哈希，字符被滚动送入同一个寄存器', x: 320, y: 230, z: 0, color: PALETTE.textDim, scale: 0.62 });
const stageT = new VText(scene, { text: '', x: 320, y: 560, z: 0, color: GOLD, scale: 0.72 });
const outT = new VText(scene, { text: '', x: 700, y: 420, z: 0, color: PALETTE.textGlow, scale: 0.55, wrapChars: 8 });

function setBits(h) { bitBoxes.forEach((b, i) => b.setColor(((h >>> (BITS - 1 - i)) & 1) === 1 ? GOLD : DIM, ((h >>> (BITS - 1 - i)) & 1) === 1 ? GOLD : DIM)); }
function resetAll() {
  for (let k = 0; k < N; k++) {
    charBoxes[k].setColor(DIM, DIM); charBoxes[k].setText(S1[k]);
    codeT[k].setText(''); codeT[k].sprite.position.set(CX(k), 496, 0);
  }
  setBits(0);
  eqT.setText(''); hT.setText(''); stageT.setText(''); outT.setText('');
}

function* bkdrGen() {
  resetAll();
  yield S(() => hint.setText('把字符串变成整数：h = (h × 31 + 字符码) mod 2³²。31 小质数 = 乘起来快 + 分布均匀，JDK 的 String.hashCode 就是它'));
  yield S(() => { stageT.setText('hello 逐个字符送入寄存器：前一位的贡献随 ×31 左移约 5 位，永不丢失'); });
  yield W(500);
  for (let t = 0; t < steps1.length; t++) {
    const s = steps1[t];
    yield S(() => {
      charBoxes[t].setColor(CYAN, CYAN);
      codeT[t].setText('' + s.ch + ' → ' + s.code);
      eqT.setText('h = ' + s.prev + ' × ' + SEED + ' + ' + s.code);
      stageT.setText('hello 第 ' + (t + 1) + ' 个字符：寄存器滚动混合');
    });
    yield W(600);
    yield S(() => {
      charBoxes[t].setColor(GOLD, GOLD);
      setBits(s.h);
      hT.setText('h = ' + s.h);
    });
    yield W(650);
  }
  yield S(() => {
    stageT.setText('hello 完成：哈希 = ' + H1 + '。第二行：把「world」也送进同一个 32 位寄存器');
    hint.setText('哈希的意义：字典查找 O(1) 平均 —— 但前提是冲突少；BKDR 用乘法让「ab」与「ba」不再同值');
  });
  yield W(900);
  for (let t = 0; t < steps2.length; t++) {
    const s = steps2[t];
    yield S(() => {
      eqT.setText('h = ' + s.prev + ' × ' + SEED + ' + ' + s.code);
      stageT.setText('world 第 ' + (t + 1) + ' 个字符：w=' + s.ch.charCodeAt(0) + ' 滚入');
    });
    yield W(550);
    yield S(() => {
      setBits(s.h);
      hT.setText('h = ' + s.h);
    });
    yield W(600);
  }
  yield S(() => {
    outT.setText('BKDR(hello) = ' + H1 + ' ≠ BKDR(world) = ' + H2 + ' —— 两个词位序不同，哈希值随之不同，这就是乘法的功劳');
    status.textContent = 'BKDR31: hello → ' + H1 + '，world → ' + H2 + '（不同）';
    hint.setText('改 seed（如 131）只改分布不改思路 — 适合做多哈希布隆过滤器');
  });
  yield W(1000);
  yield S(() => {
    outT.setText('复杂度 O(n)：一次遍历出哈希。应用：哈希表、布隆过滤器、字符串比较加速 —— 也是 Java/PHP/Redis 的家族成员');
    hint.setText('对比朴素累加和：累加 hello/world 得 532/552 容易撞；乘法把位次烙进每个字符的贡献，抗撞性天壤之别');
  });
  yield W(900);
}

engine.queue(() => bkdrGen());
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；金色位 = 寄存器中的 1，字符逐个滚入，乘法 + 加法的循环一眼看穿）');

scene.start(engine);
