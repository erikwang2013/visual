// AlgorithmLibrary/BoyerMoore3D.js — Boyer-Moore：从右往左匹配 + 坏字符规则跳跃
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VArrow } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('BoyerMoore3D');

const scene = new Scene3D('scene', { cameraPos: [0, 380, 900], fov: 50 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const TEXT = 'HERE IS A SIMPLE EXAMPLE';
const PAT = 'EXAMPLE';
const GREEN = 0x4ade80, YELLOW = 0xfacc15, RED = 0xf87171;
const SP = 38;
const tX = c => -400 + c * SP;
let curStart = 0;
const pX = c => -400 + (curStart + c) * SP;
const tBoxes = TEXT.split('').map((ch, c) => new VBox(scene, { w: 30, h: 34, d: 34, x: tX(c), y: 150, z: 0, label: ch, color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
const pBoxes = PAT.split('').map((ch, c) => new VBox(scene, { w: 30, h: 34, d: 34, x: pX(c), y: -20, z: 0, label: ch, color: PALETTE.blue, emissive: PALETTE.blue }));
const arrow = new VArrow(scene, { x: 0, y: 60, z: 0, down: true });
const hint = new VText(scene, { text: '点击「运行Boyer-Moore」开始：从右往左比较', x: 0, y: 250, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');
const lastLabel = new VText(scene, { text: '', x: 0, y: -90, z: 0, color: PALETTE.text, scale: 0.75 });
const cmpLabel = new VText(scene, { text: '', x: 0, y: -125, z: 0, color: PALETTE.textGlow, scale: 0.8 });

function lastOcc(ch) {
  for (let j = PAT.length - 1; j >= 0; j--) if (PAT[j] === ch) return j;
  return -1;
}

function resetColors() {
  tBoxes.forEach(b => b.setColor(PALETTE.node, PALETTE.nodeEmissive));
  pBoxes.forEach(b => b.setColor(PALETTE.blue, PALETTE.blue));
}

function runBoyerMoore() {
  engine.clear();
  resetColors();
  curStart = 0;
  pBoxes.forEach((b, c) => b.moveTo(pX(c), -20, 0, 400));
  lastLabel.setText('坏字符表（最后一次出现位置）：' + PAT.split('').map((ch, j) => ch + '→' + j).join('  '));
  cmpLabel.setText('');
  hint.setText('模式 ' + PAT + '：先比较最右字符；失配用「坏字符规则」决定跳跃步数');

  const events = [];
  let s = 0;
  while (s <= TEXT.length - PAT.length) {
    let j = PAT.length - 1;
    const cmps = [];
    while (j >= 0 && TEXT[s + j] === PAT[j]) { cmps.push({ i: s + j, j, ok: true }); j--; }
    if (j < 0) { events.push({ t: 'match', s, cmps }); break; }
    cmps.push({ i: s + j, j, ok: false });
    const shift = j - lastOcc(TEXT[s + j]);
    events.push({ t: 'try', s, cmps, shift, bad: TEXT[s + j], j, last: lastOcc(TEXT[s + j]) });
    s += shift;
  }

  let i = 0;
  const step = () => {
    if (i >= events.length) {
      status.textContent = 'Boyer-Moore 完成：' + PAT + ' 匹配于位置 ' + events[events.length - 1].s;
      hint.setText('匹配成功！共 ' + events.length + ' 次对齐尝试（朴素算法需 ' + (TEXT.length - PAT.length + 1) + ' 次）');
      cmpLabel.setText('');
      return;
    }
    const e = events[i];
    if (e.t === 'match') {
      e.cmps.forEach(c => { tBoxes[c.i].setColor(GREEN, GREEN); pBoxes[c.j].setColor(GREEN, GREEN); });
      arrow.moveTo(tX(e.s + PAT.length - 1), 60, 0, 300);
      hint.setText('第 ' + (i + 1) + ' 次对齐：7 个字符全部匹配 → 找到于位置 ' + e.s);
      C(900, step);
      i++;
      return;
    }
    curStart = e.s;
    pBoxes.forEach((b, c) => b.moveTo(pX(c), -20, 0, 500));
    const bad = e.cmps[e.cmps.length - 1];
    const doCmps = (k) => {
      if (k >= e.cmps.length) {
        tBoxes[bad.i].setColor(RED, RED); pBoxes[bad.j].setColor(RED, RED);
        cmpLabel.setText('坏字符 \'' + e.bad + '\'：j=' + e.j + '，last[\'' + e.bad + '\']=' + e.last + ' → 右移 ' + e.shift);
        hint.setText('第 ' + (i + 1) + ' 次对齐失配：text[' + bad.i + ']=\'' + e.bad + '\' ≠ \'' + PAT[e.j] + '\'，模式右移 ' + e.shift + ' 位');
        C(700, () => { resetColors(); step(); });
        i++;
        return;
      }
      const c = e.cmps[k];
      arrow.moveTo(tX(c.i), 60, 0, 300);
      tBoxes[c.i].setColor(YELLOW, YELLOW); pBoxes[c.j].setColor(YELLOW, YELLOW);
      hint.setText('text[' + c.i + ']=\'' + TEXT[c.i] + '\' 与 pattern[' + c.j + ']=\'' + PAT[c.j] + '\' 匹配 ✓');
      C(500, () => { tBoxes[c.i].setColor(PALETTE.node, PALETTE.nodeEmissive); pBoxes[c.j].setColor(PALETTE.blue, PALETTE.blue); doCmps(k + 1); });
    };
    C(500, () => doCmps(0));
  };
  step();
}

panel.addButton('运行Boyer-Moore', runBoyerMoore);
panel.addButton('清空', () => { engine.clear(); resetColors(); lastLabel.setText(''); cmpLabel.setText(''); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
