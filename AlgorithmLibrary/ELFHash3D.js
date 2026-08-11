// AlgorithmLibrary/ELFHash3D.js — ELF 哈希：h = (h<<4) + 字符码，溢出时把高 4 位异或回低 8 位并清零 —— Unix 可执行文件的哈希（function* 生成器驱动）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('ELFHash3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, ROSE = 0xfb7185, CYAN = 0x67e8f9, AMBER = 0xfbbf24;
const hint = new VText(scene, { text: '点击「运行演示」开始：ELF 哈希', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');

const STR = 'helloworld';
const N = STR.length;

function elf(str) {
  let h = 0;
  const steps = [];
  for (const ch of str) {
    const code = ch.charCodeAt(0);
    const shifted = (h << 4) >>> 0;
    h = (shifted + code) >>> 0;
    const g = h & 0xf0000000;
    if (g) { h = (h ^ (g >>> 24)) >>> 0; h = (h & ~g) >>> 0; }
    steps.push({ ch, code, shifted, g, h });
  }
  return steps;
}
const elfSteps = elf(STR);
const FINAL = elfSteps[elfSteps.length - 1].h;
const overflows = elfSteps.filter(s => s.g !== 0).length;

const BITS = 32;
const CX = k => -270 + k * 60;
const charBoxes = STR.split('').map((ch, k) =>
  new VBox(scene, { w: 50, h: 50, d: 50, x: CX(k), y: 170, z: 0, label: ch, color: DIM, emissive: DIM }));
const codeT = STR.split('').map((ch, k) =>
  new VText(scene, { text: '', x: CX(k), y: 210, z: 0, color: PALETTE.textDim, scale: 0.42 }));
const eqT = new VText(scene, { text: '', x: 0, y: 115, z: 0, color: PALETTE.textGlow, scale: 0.6 });
const hT = new VText(scene, { text: '', x: 0, y: 70, z: 0, color: GOLD, scale: 0.62 });
const bitBoxes = [...Array(BITS)].map((_, b) =>
  new VBox(scene, { w: 10, h: 10, d: 10, x: -186 + b * 12, y: 5, z: 0, label: b % 4 === 0 ? String(BITS - 1 - b) : '', color: DIM, emissive: DIM }));
new VText(scene, { text: 'ELF 哈希：字符先左移 4 位再加 —— 溢出时高 4 位 g 被「异或回低 8 位」再清零，信息不丢、分布更均匀', x: 0, y: 225, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: '红色 = 发生溢出的字符（g ≠ 0）；下方 = 32 位寄存器，金色位 = 1 —— ELF 是 Unix 可执行文件符号表的哈希', x: 0, y: -70, z: 0, color: PALETTE.textDim, scale: 0.62 });
const stageT = new VText(scene, { text: '', x: 0, y: 255, z: 0, color: GOLD, scale: 0.72 });
const outT = new VText(scene, { text: '', x: 0, y: -120, z: 0, color: PALETTE.textGlow, scale: 0.62 });

function setBits(h) { bitBoxes.forEach((b, i) => b.setColor(((h >>> (BITS - 1 - i)) & 1) === 1 ? GOLD : DIM, ((h >>> (BITS - 1 - i)) & 1) === 1 ? GOLD : DIM)); }
function resetAll() {
  for (let k = 0; k < N; k++) {
    charBoxes[k].setColor(DIM, DIM); charBoxes[k].setText(STR[k]);
    codeT[k].setText('');
  }
  setBits(0);
  eqT.setText(''); hT.setText(''); stageT.setText(''); outT.setText('');
}

function* elfGen() {
  resetAll();
  yield S(() => hint.setText('ELF 的思路 = 移位混合：每字符 h <<= 4 再加，溢出位不扔掉 —— 高 4 位异或回低 8 位，等于让每个字符参与两次混合'));
  yield S(() => { stageT.setText('「helloworld」逐个字符送入寄存器：h = (h<<4) + 字符码'); });
  yield W(500);
  for (let t = 0; t < elfSteps.length; t++) {
    const s = elfSteps[t];
    yield S(() => {
      charBoxes[t].setColor(CYAN, CYAN);
      codeT[t].setText('' + s.ch + ' → ' + s.code);
      eqT.setText('h = ' + s.shifted + '（左移 4 位）+ ' + s.code + ' = ' + s.h);
      stageT.setText('字符 ' + (t + 1) + '：寄存器左移 4 位腾出 1 个十六进制位，把新字符塞进低位');
      hint.setText('为什么左移 4 位？一个十六进制位 = 4 个二进制位 —— 每次新字符占一格，老字符依次向高位滚动');
    });
    yield W(560);
    yield S(() => {
      setBits(s.h);
      hT.setText('h = ' + s.h);
      if (s.g !== 0) {
        charBoxes[t].setColor(ROSE, ROSE);
        eqT.setText('溢出！g = 0x' + (s.g >>> 28).toString(16) + ' → h ^= g>>>24; h &= ~g');
        stageT.setText('寄存器满溢出：高 4 位 g = 0x' + (s.g >>> 28).toString(16) + ' 异或回低 8 位并清零 —— 最高位不白丢');
        hint.setText('h &= ~g 把高 4 位清成 0；h ^= g>>>24 把这几位的贡献「折叠」进低 8 位 —— 32 位之内，信息永不丢失');
      } else {
        stageT.setText('寄存器还有空位：g = 0，无需折叠，直接进入下一个字符');
      }
    });
    yield W(700);
  }
  yield S(() => {
    outT.setText('ELF("' + STR + '") = ' + FINAL + ' —— 共 ' + overflows + ' 次溢出被折叠回低 8 位，全程无信息丢失');
    status.textContent = 'ELF 哈希：' + STR + ' → ' + FINAL + '（' + overflows + ' 次溢出折叠）';
    hint.setText('折叠操作 O(1)：每个字符均摊两次位运算 —— ELF 符号表用它把符号名散到桶里，冲突率在散列家族里名列前茅');
  });
  yield W(1200);
  yield S(() => {
    outT.setText('对比：BKDR 乘 31、ELF 移位异或 —— 一个靠乘法扩散，一个靠移位折叠；都做「一次遍历 O(n)」的散列');
    hint.setText('应用：Unix a.out/ELF 符号表、链接器符号索引、文本指纹 —— 位运算实现，硬件上极快，无乘法器也能跑');
  });
  yield W(1000);
}

panel.addButton('运行演示', () => engine.start(elfGen()));
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；红色 = 溢出折叠字符，金色位 = 寄存器中的 1，看溢出位如何被救回低 8 位）');

scene.start(engine);
