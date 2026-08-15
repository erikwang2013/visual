// AlgorithmLibrary/ELFHash3D.js — ELF 哈希：h = (h<<4) + 字符码，溢出时把高 4 位异或回低 8 位并清零 —— Unix 可执行文件符号表的哈希（function* 生成器驱动，解说入状态栏）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('ELFHash3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GOLD = 0xfcd34d, DIM = 0x334155, ROSE = 0xfb7185, CYAN = 0x67e8f9;
const status = panel.addStatus('就绪');
const ease = p => p * p * (3 - 2 * p);

const STR = 'helloworld';
const N = STR.length;
const BITS = 32;

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

// ---- 模块级预建对象（运行期仅改文字/颜色/显隐/缩放，绝不 new）----
const CX = k => 320 + (k - 4.5) * 60;
const charBoxes = STR.split('').map((ch, k) =>
  new VBox(scene, { w: 50, h: 50, d: 50, x: CX(k), y: 585, z: 0, label: ch, color: DIM, emissive: DIM }));
const bitBoxes = [...Array(BITS)].map((_, b) =>
  new VBox(scene, { w: 10, h: 10, d: 10, x: 134 + b * 12, y: 400, z: 0, label: b % 4 === 0 ? String(BITS - 1 - b) : '', color: DIM, emissive: DIM }));
const resultBox = new VBox(scene, { w: 200, h: 54, d: 40, x: 320, y: 195, z: 0, label: '', color: DIM, emissive: DIM });
resultBox.mesh.visible = false;

const setBits = h => bitBoxes.forEach((b, i) => {
  const on = ((h >>> (BITS - 1 - i)) & 1) === 1;
  b.setColor(on ? GOLD : DIM, on ? GOLD : DIM);
});
const hexOf = v => '0x' + v.toString(16).toUpperCase().padStart(8, '0');
function resetAll() {
  for (let k = 0; k < N; k++) { charBoxes[k].setColor(DIM, DIM); charBoxes[k].setText(STR[k]); charBoxes[k].mesh.scale.setScalar(1); }
  setBits(0);
  resultBox.mesh.visible = false;
}

function* runELF() {
  let foldCount = 0;
  yield S(() => { status.textContent = 'ELF 哈希：h = (h<<4) + 字符码；溢出时把高 4 位异或回低 8 位再清零 —— 信息不丢、分布均匀（Unix ELF 符号表用）。演示："helloworld"（10 字符）'; });
  yield W(700);
  for (let t = 0; t < elfSteps.length; t++) {
    const s = elfSteps[t];
    charBoxes[t].setColor(CYAN, CYAN);
    yield S(() => { status.textContent = '字符 ' + (t + 1) + ' "' + s.ch + '"（码 ' + s.code + '）：h = ' + s.shifted + '（左移 4 位）+ ' + s.code + ' = ' + s.h; });
    yield W(480);
    yield A(300, p => { const e = ease(p); charBoxes[t].mesh.scale.setScalar(1 + 0.3 * Math.sin(e * Math.PI)); });
    charBoxes[t].mesh.scale.setScalar(1);
    if (s.g !== 0) { charBoxes[t].setColor(ROSE, ROSE); foldCount++; }
    else charBoxes[t].setColor(GOLD, GOLD);
    setBits(s.h);
    yield S(() => {
      if (s.g !== 0) {
        status.textContent = '溢出！高 4 位 g = ' + hexOf(s.g) + ' → h ^= g>>>24; h &= ~g：折叠回低 8 位并清零 —— 最高位的贡献不白丢';
      } else {
        status.textContent = 'g = 0，寄存器还有空位：无需折叠，直接进入下一字符';
      }
    });
    yield W(700);
  }
  yield S(() => { status.textContent = '10 字符全部送入：ELF("helloworld") = ' + hexOf(FINAL) + '（' + FINAL + '）；共 ' + overflows + ' 次溢出折叠回低 8 位，全程无信息丢失'; });
  yield W(1000);
  resultBox.setText(hexOf(FINAL));
  resultBox.setColor(GOLD, GOLD);
  resultBox.mesh.visible = true;
  yield S(() => { status.textContent = 'ELFHash 演示完成："helloworld" → ' + hexOf(FINAL) + '（' + FINAL + '），' + overflows + ' 次溢出折叠回低 8 位；复杂度 O(n) 一次遍历，每字符常数次位运算，无乘法器也能跑'; });
  yield W(800);
}

engine.queue(() => runELF());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
