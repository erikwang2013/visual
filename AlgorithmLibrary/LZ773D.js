// AlgorithmLibrary/LZ773D.js — LZ77：滑动窗口 + 三元组 (偏移, 长度, 下一字符)
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VArrow } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('LZ773D');

const scene = new Scene3D('scene', { cameraPos: [0, 380, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x60a5fa, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「运行压缩」开始', x: 0, y: 260, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const INPUT = 'ABABABABC', W = 5;
const SP = 50, X0 = -INPUT.length * SP / 2 + SP / 2;
const boxes = [];
for (let i = 0; i < INPUT.length; i++) {
  boxes.push(new VBox(scene, { w: 40, h: 40, d: 40, x: X0 + i * SP, y: 60, z: 0, label: INPUT[i], color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
}
const arrow = new VArrow(scene, { x: X0, y: 140, z: 0 });
const frame = new VBox(scene, { w: W * SP + 30, h: 66, d: 56, x: X0 + 2 * SP, y: 60, z: 0, color: PALETTE.edge, emissive: PALETTE.edgeEmissive });
frame.mesh.material.transparent = true;
frame.mesh.material.opacity = 0.12;
new VText(scene, { text: '输入序列（窗口大小 = ' + W + '）', x: X0 - 250, y: 60, z: 0, color: PALETTE.textDim, scale: 0.7 });
const outText = new VText(scene, { text: '', x: 0, y: -70, z: 0, color: PALETTE.textGlow, scale: 0.8 });
const winText = new VText(scene, { text: '', x: 0, y: -120, z: 0, color: PALETTE.textDim, scale: 0.7 });

// 预计算 tokens：(offset, length, next) — 长度 0 表示字面量
const tokens = [];
for (let i = 0; i < INPUT.length; ) {
  const start = Math.max(0, i - W);
  let bestOff = 0, bestLen = 0;
  for (let o = 1; o <= i - start; o++) {
    let l = 0;
    while (l < W && i + l < INPUT.length && INPUT[i + l] === INPUT[i - o + l]) l++;
    if (l > bestLen) { bestLen = l; bestOff = o; }
  }
  if (bestLen === 0) { tokens.push({ off: 0, len: 0, next: INPUT[i], pos: i }); i++; }
  else { tokens.push({ off: bestOff, len: bestLen, next: INPUT[i + bestLen], pos: i }); i += bestLen + 1; }
}

function resetAll() {
  engine.clear();
  for (const b of boxes) b.setColor(PALETTE.node, PALETTE.nodeEmissive);
  arrow.moveTo(X0, 140, 0, 1);
  outText.setText('');
  winText.setText('');
}

function runCompress() {
  resetAll();
  hint.setText('LZ77：在滑动窗口中寻找最长匹配，输出 (偏移, 长度, 下一字符) 三元组');
  let done = 0;
  const next = () => {
    if (done >= tokens.length) {
      const out = tokens.map(t => t.len === 0 ? t.next : '(' + t.off + ',' + t.len + ',' + t.next + ')').join(' ');
      status.textContent = '压缩完成：' + INPUT + ' → ' + out + '（9 字符 → ' + out.replace(/ /g, '').length + '）';
      hint.setText('解压时按窗口内偏移复制即可还原原始数据');
      return;
    }
    const t = tokens[done]; done++;
    const winEnd = Math.min(t.pos + W, INPUT.length);
    const winStart = Math.max(0, t.pos - W);
    const frameX = X0 + ((winStart + winEnd - 1) / 2 - (INPUT.length - 1) / 2) * SP;
    frame.moveTo(frameX, 60, 0, 350);
    if (t.len === 0) {
      arrow.moveTo(X0 + (t.pos - (INPUT.length - 1) / 2) * SP, 140, 0, 350);
      C(150, () => boxes[t.pos].setColor(PALETTE.highlight, PALETTE.highlightEmissive));
      winText.setText('窗口 [' + winStart + ', ' + winEnd + ')：无匹配');
      hint.setText('字符「' + t.next + '」在窗口中无匹配 → 字面量输出 ' + t.next);
      C(850, () => {
        boxes[t.pos].setColor(GREEN, GREEN);
        outText.setText('输出：' + tokens.slice(0, done).map(x => x.len === 0 ? x.next : '(' + x.off + ',' + x.len + ',' + x.next + ')').join(' '));
      });
    } else {
      arrow.moveTo(X0 + (t.pos + t.len / 2 - (INPUT.length - 1) / 2) * SP, 140, 0, 350);
      C(150, () => {
        for (let i = t.pos; i < t.pos + t.len; i++) boxes[i].setColor(YELLOW, YELLOW);
        boxes[t.pos + t.len].setColor(BLUE, BLUE);
      });
      winText.setText('窗口 [' + winStart + ', ' + winEnd + ')：向前 ' + t.off + ' 位匹配 ' + t.len + ' 个字符');
      hint.setText('窗口前 ' + t.off + ' 位起有 ' + t.len + ' 个字符与当前相同 → (' + t.off + ', ' + t.len + ', ' + t.next + ')');
      C(950, () => {
        for (let i = t.pos; i < t.pos + t.len; i++) boxes[i].setColor(GREEN, GREEN);
        boxes[t.pos + t.len].setColor(GREEN, GREEN);
        outText.setText('输出：' + tokens.slice(0, done).map(x => x.len === 0 ? x.next : '(' + x.off + ',' + x.len + ',' + x.next + ')').join(' '));
      });
    }
    C(600, next);
  };
  next();
}

panel.addButton('运行压缩', runCompress);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；DEFLATE / gzip / PNG 的前身）');

scene.start(engine);
