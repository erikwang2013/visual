// AlgorithmLibrary/LZ783D.js — LZ78：动态字典，输出 (字典索引, 新字符)
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VArrow } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('LZ783D');

const scene = new Scene3D('scene', { cameraPos: [0, 380, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x60a5fa, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「运行压缩」开始', x: 0, y: 260, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const INPUT = 'ABABABABAB';
const SP = 48, X0 = -INPUT.length * SP / 2 + SP / 2;
const boxes = [];
for (let i = 0; i < INPUT.length; i++) {
  boxes.push(new VBox(scene, { w: 38, h: 38, d: 38, x: X0 + i * SP, y: 120, z: 0, label: INPUT[i], color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
}
const arrow = new VArrow(scene, { x: X0, y: 200, z: 0 });
new VText(scene, { text: '输入：' + INPUT, x: X0 - 230, y: 120, z: 0, color: PALETTE.textDim, scale: 0.7 });
const dictTitle = new VText(scene, { text: '字典（编码时动态构建）', x: 0, y: -10, z: 0, color: PALETTE.textDim, scale: 0.7 });
const outText = new VText(scene, { text: '', x: 0, y: -110, z: 0, color: PALETTE.textGlow, scale: 0.8 });

// 预计算 tokens 与字典增长
const tokens = [];
const dict = [''];
for (let i = 0; i < INPUT.length; ) {
  let idx = 0, len = 0;
  for (let k = 1; k < dict.length; k++) {
    if (INPUT.startsWith(dict[k], i) && dict[k].length > len) { idx = k; len = dict[k].length; }
  }
  const next = INPUT[i + len] || '';
  tokens.push({ idx, len, next, start: i, dictIdx: dict.length });
  dict.push(dict[idx] + next);
  i += len + (next ? 1 : 0);
}
const dictBoxes = [];

function resetAll() {
  engine.clear();
  for (const b of boxes) b.setColor(PALETTE.node, PALETTE.nodeEmissive);
  arrow.moveTo(X0, 200, 0, 1);
  outText.setText('');
  for (const p of dictBoxes) { p[0].remove(); p[1].remove(); }
  dictBoxes.length = 0;
}

function runCompress() {
  resetAll();
  hint.setText('LZ78：维护动态字典，输出 (最长前缀的字典号, 下一字符) 对');
  let done = 0;
  const next = () => {
    if (done >= tokens.length) {
      const out = tokens.map(t => '(' + t.idx + ',' + (t.next || '∅') + ')').join(' ');
      status.textContent = '压缩完成：' + INPUT + ' → ' + out + '（10 字符 → ' + out.replace(/ /g, '').length + ' 字符）';
      hint.setText('字典随输入增长；解压时同步重建字典即可还原');
      return;
    }
    const t = tokens[done]; done++;
    arrow.moveTo(X0 + (t.start + t.len / 2 - (INPUT.length - 1) / 2) * SP, 200, 0, 350);
    C(150, () => {
      for (let i = t.start; i < t.start + t.len; i++) boxes[i].setColor(YELLOW, YELLOW);
      if (t.next) boxes[t.start + t.len].setColor(BLUE, BLUE);
    });
    hint.setText('最长前缀「' + dict[t.idx] + '」（字典 ' + t.idx + ' 号）+' + (t.next || '结束') + ' → (' + t.idx + ',' + (t.next || '∅') + ')，字典新增 ' + t.dictIdx + ' 号「' + dict[t.dictIdx] + '」');
    C(950, () => {
      for (let i = t.start; i < t.start + t.len; i++) boxes[i].setColor(GREEN, GREEN);
      if (t.next) boxes[t.start + t.len].setColor(GREEN, GREEN);
      outText.setText('输出：' + tokens.slice(0, done).map(x => '(' + x.idx + ',' + (x.next || '∅') + ')').join(' '));
      const n = dictBoxes.length;
      const dx = -260 + n * 150;
      const ib = new VBox(scene, { w: 56, h: 40, d: 30, x: dx, y: -40, z: 0, label: String(t.dictIdx), color: DIM, emissive: DIM });
      const pb = new VBox(scene, { w: 70, h: 40, d: 30, x: dx + 72, y: -40, z: 0, label: dict[t.dictIdx], color: GREEN, emissive: GREEN });
      dictBoxes.push([ib, pb]);
    });
    C(550, next);
  };
  next();
}

panel.addButton('运行压缩', runCompress);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；LZW / GIF 是它的变体）');

scene.start(engine);
