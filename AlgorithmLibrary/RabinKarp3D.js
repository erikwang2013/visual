// AlgorithmLibrary/RabinKarp3D.js — Rabin-Karp：滚动哈希 + 哈希相等时逐字符验证
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('RabinKarp3D');

const scene = new Scene3D('scene', { cameraPos: [0, 360, 820], fov: 50 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const TEXT = '2359023141526739921';
const PAT = '31415';
const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x60a5fa;
const SP = 38;
const tX = c => -360 + c * SP;
let curStart = 0;
const pX = c => -360 + (curStart + c) * SP;
const tBoxes = TEXT.split('').map((ch, c) => new VBox(scene, { w: 30, h: 34, d: 34, x: tX(c), y: 150, z: 0, label: ch, color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
const pBoxes = PAT.split('').map((ch, c) => new VBox(scene, { w: 30, h: 34, d: 34, x: pX(c), y: -20, z: 0, label: ch, color: BLUE, emissive: BLUE }));
const hint = new VText(scene, { text: '点击「运行Rabin-Karp」开始：滚动哈希匹配', x: 0, y: 250, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');
const hashLabel = new VText(scene, { text: '', x: 0, y: -90, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const formulaLabel = new VText(scene, { text: '', x: 0, y: -125, z: 0, color: PALETTE.text, scale: 0.7 });

function resetColors() {
  tBoxes.forEach(b => b.setColor(PALETTE.node, PALETTE.nodeEmissive));
  pBoxes.forEach(b => b.setColor(BLUE, BLUE));
}

function runRabinKarp() {
  engine.clear();
  resetColors();
  curStart = 0;
  pBoxes.forEach((b, c) => b.moveTo(pX(c), -20, 0, 400));
  const patHash = Number(PAT);
  hashLabel.setText('h(模式) = ' + patHash + '（5 位十进制数，基数 = 10）');
  formulaLabel.setText('');
  hint.setText('滚动哈希：窗内子串当作整数；右移一位 = 减去最高位 ×10⁴，乘 10，再加新位');

  const n = TEXT.length, m = PAT.length;
  const events = [];
  for (let s = 0; s <= n - m; s++) {
    const w = Number(TEXT.substr(s, m));
    events.push({ s, w, match: w === patHash });
  }

  let i = 0;
  const step = () => {
    if (i >= events.length) {
      status.textContent = 'Rabin-Karp 完成：匹配于位置 6（仅一次逐字符验证）';
      hint.setText('完成！哈希相等只出现一次，且逐字符验证成功');
      return;
    }
    const e = events[i];
    curStart = e.s;
    pBoxes.forEach((b, c) => b.moveTo(pX(c), -20, 0, 450));
    for (let k = 0; k < m; k++) tBoxes[e.s + k].setColor(YELLOW, YELLOW);
    const prev = i > 0 ? events[i - 1].w : null;
    formulaLabel.setText(prev !== null
      ? 'w' + e.s + ' = (' + prev + ' − ' + TEXT[e.s - 1] + '×10⁴) ×10 + ' + TEXT[e.s + m - 1] + ' = ' + e.w
      : 'w0 = ' + TEXT.substr(0, m) + ' = ' + e.w);
    hashLabel.setText('w' + e.s + ' = ' + e.w + (e.match ? ' = h(模式) ✓' : ' ≠ ' + patHash));
    if (e.match) {
      hint.setText('窗口 ' + e.s + ' 哈希与模式相等 → 逐字符验证');
      C(700, () => {
        for (let k = 0; k < m; k++) { tBoxes[e.s + k].setColor(GREEN, GREEN); pBoxes[k].setColor(GREEN, GREEN); }
        hint.setText('逐字符验证通过：匹配于位置 ' + e.s);
        C(700, step);
      });
      i++;
    } else {
      hint.setText('窗口 ' + e.s + '：哈希 ' + e.w + ' ≠ ' + patHash + '，直接跳过，无需逐字符比较');
      C(620, () => {
        for (let k = 0; k < m; k++) tBoxes[e.s + k].setColor(PALETTE.node, PALETTE.nodeEmissive);
        step();
      });
      i++;
    }
  };
  step();
}

panel.addButton('运行Rabin-Karp', runRabinKarp);
panel.addButton('清空', () => { engine.clear(); resetColors(); hashLabel.setText(''); formulaLabel.setText(''); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
