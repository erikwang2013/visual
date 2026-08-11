// AlgorithmLibrary/BKDRHash3D.js — BKDR 哈希：h = h × 31 + 字符码，逐字符滚动混合，32 位位模式可视化
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('BKDRHash3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, ROSE = 0xfb7185, CYAN = 0x67e8f9, AMBER = 0xfbbf24;
const hint = new VText(scene, { text: '点击「运行 BKDR 哈希」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

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
const CX = k => -120 + k * 60;
const charBoxes = S1.split('').map((ch, k) =>
  new VBox(scene, { w: 50, h: 50, d: 50, x: CX(k), y: 170, z: 0, label: ch, color: DIM, emissive: DIM }));
const codeT = S1.split('').map((ch, k) =>
  new VText(scene, { text: '', x: CX(k), y: 210, z: 0, color: PALETTE.textDim, scale: 0.42 }));
const eqT = new VText(scene, { text: '', x: 0, y: 115, z: 0, color: PALETTE.textGlow, scale: 0.6 });
const hT = new VText(scene, { text: '', x: 0, y: 70, z: 0, color: GOLD, scale: 0.62 });
const bitBoxes = [...Array(BITS)].map((_, b) =>
  new VBox(scene, { w: 10, h: 10, d: 10, x: -217 + b * 14, y: 5, z: 0, label: b % 4 === 0 ? String((BITS - 1 - b)) : '', color: DIM, emissive: DIM }));
new VText(scene, { text: 'BKDR 哈希：每个字符「乘 31 再相加」—— 31 是质数，让相邻字符的贡献错开位次，冲突远少于朴素求和', x: 0, y: 225, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: '下方 = 32 位寄存器的每一位（金色 = 1）；第 2 行演示「world」的哈希，字符被滚动送入同一个寄存器', x: 0, y: -70, z: 0, color: PALETTE.textDim, scale: 0.62 });
const stageT = new VText(scene, { text: '', x: 0, y: 255, z: 0, color: GOLD, scale: 0.72 });
const outT = new VText(scene, { text: '', x: 0, y: -120, z: 0, color: PALETTE.textGlow, scale: 0.62 });

function setBits(h) { bitBoxes.forEach((b, i) => b.setColor(((h >>> (BITS - 1 - i)) & 1) === 1 ? GOLD : DIM, ((h >>> (BITS - 1 - i)) & 1) === 1 ? GOLD : DIM)); }
function resetAll() {
  engine.clear();
  for (let k = 0; k < N; k++) {
    charBoxes[k].setColor(DIM, DIM); charBoxes[k].setText(S1[k]);
    codeT[k].setText(''); codeT[k].moveTo(CX(k), 210, 0, 1);
  }
  setBits(0);
  eqT.setText(''); hT.setText(''); stageT.setText(''); outT.setText('');
}
function animateHash(label, stepsArr, targetT, useRow2) {
  const boxes = useRow2 ? null : charBoxes;
  stepsArr.forEach((s, t) => {
    C(560, () => {
      const bx = useRow2 ? null : boxes[t];
      if (!useRow2) { bx.setColor(CYAN, CYAN); }
      codeT[t].setText(`'${s.ch}' → ${s.code}`, { color: PALETTE.textDim });
      eqT.setText(`h = ${s.prev} × ${SEED} + ${s.code}`);
    });
    C(700, () => {
      if (!useRow2) { boxes[t].setColor(GOLD, GOLD); }
      setBits(s.h);
      hT.setText(`h = ${s.h}`, { color: GOLD });
      stageT.setText(`${label} 第 ${t + 1} 个字符：寄存器滚动混合 —— 前一位的贡献随 ×31 左移约 5 位，永不丢失`);
    });
  });
  C(650, () => { targetT.setText(`哈希值 = ${stepsArr[stepsArr.length - 1].h}`); });
}

function runBKDR() {
  resetAll();
  hint.setText('把字符串变成整数：h = (h × 31 + 字符码) mod 2³²。31 小质数 = 乘起来快 + 分布均匀，JDK 的 String.hashCode 就是它');
  animateHash('hello', steps1, outT, false);
  C(900, () => {
    stageT.setText('第一行完成。第二行：把「world」也送进同一个 32 位寄存器，看两个词是否撞出同一个哈希');
    hint.setText('哈希的意义：字典查找 O(1) 平均 —— 但前提是冲突少；BKDR 用乘法让「ab」与「ba」不再同值');
  });
  animateHash('world', steps2, null, true);
  C(1100, () => {
    outT.setText(`BKDR(hello) = ${H1} ≠ BKDR(world) = ${H2} —— 两个词位序不同，哈希值随之不同，这就是乘法的功劳`);
    status.textContent = `BKDR31: hello → ${H1}，world → ${H2}（不同）`;
    hint.setText('改 seed（如 131）只改分布不改思路 —— 换 seed 得 hello → ' + bkdr(S1, 131)[4].h + '，适合做多哈希布隆过滤器');
  });
  C(1200, () => {
    outT.setText('复杂度 O(n)：一次遍历出哈希。应用：哈希表、布隆过滤器、字符串比较加速 —— 也是 Java/PHP/Redis 的家族成员');
    hint.setText('对比朴素累加和：累加 hello/world 得 532/552 容易撞；乘法把位次烙进每个字符的贡献，抗撞性天壤之别');
  });
}

panel.addButton('运行 BKDR 哈希', runBKDR);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；金色位 = 寄存器中的 1，字符逐个滚入，乘法 + 加法的循环一眼看穿）');

scene.start(engine);
