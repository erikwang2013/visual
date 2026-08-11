// AlgorithmLibrary/LZSS3D.js — LZSS 压缩：字面字节 + (距离,长度) 匹配指针
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VArrow } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('LZSS3D');

const scene = new Scene3D('scene', { cameraPos: [0, 360, 620], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「运行压缩」开始', x: 0, y: 260, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const INPUT = 'the cat sat on the mat';
const SP = 26, W = 24;
const pos = i => i < 11 ? { x: (i - 5) * SP, y: 170 } : { x: (i - 16) * SP, y: 95 };
const boxes = [];
for (let i = 0; i < INPUT.length; i++) {
  const p = pos(i);
  boxes.push(new VBox(scene, { w: W, h: W, d: W, x: p.x, y: p.y, z: 0, label: INPUT[i], color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
}
const arrow = new VArrow(scene, { x: 0, y: 245, z: 0 });
new VText(scene, { text: '输入（22 字符）', x: -330, y: 210, z: 0, color: PALETTE.textDim, scale: 0.7 });
const outText = new VText(scene, { text: '', x: 0, y: -40, z: 0, color: PALETTE.textGlow, scale: 0.8 });
const ratioT = new VText(scene, { text: '', x: 0, y: -105, z: 0, color: PALETTE.textDim, scale: 0.7 });

const tokens = [
  { type: 'lit', n: 9 },
  { type: 'match', off: 4, len: 3, src: [5, 7], dst: [9, 11] },
  { type: 'lit', n: 3 },
  { type: 'match', off: 15, len: 4, src: [0, 3], dst: [15, 18] },
  { type: 'lit', n: 3 },
];

function resetAll() {
  engine.clear();
  for (const b of boxes) b.setColor(PALETTE.node, PALETTE.nodeEmissive);
  arrow.moveTo(0, 245, 0, 1);
  outText.setText('');
  ratioT.setText('');
}

function runCompress() {
  resetAll();
  hint.setText('LZSS：遇到可匹配的历史内容输出指针，否则输出原文字节');
  const parts = [];
  let idx = 0, outBytes = 0;
  const next = () => {
    if (idx >= tokens.length) {
      const ratio = (INPUT.length / outBytes).toFixed(2);
      outText.setText('输出：' + parts.join(' '));
      ratioT.setText('22 字节 → ' + outBytes + ' 字节（' + ratio + '× 压缩，指针 2 字节/个）');
      status.textContent = 'LZSS 压缩完成：' + INPUT + ' → ' + parts.join(' ');
      hint.setText('解压：字面直接输出，指针按 (距离,长度) 回读窗口内容即可还原');
      return;
    }
    const t = tokens[idx]; idx++;
    if (t.type === 'lit') {
      const startIdx = t.n === 9 ? 0 : t.n === 3 && idx === 2 ? 12 : 19;
      const p0 = pos(startIdx);
      arrow.moveTo(p0.x, p0.y + 70, 0, 300);
      C(150, () => {
        for (let i = 0; i < t.n; i++) boxes[startIdx + i].setColor(BLUE, BLUE);
        hint.setText('字面 ' + t.n + ' 个字符直接写入输出（' + INPUT.slice(startIdx, startIdx + t.n) + '）');
      });
      C(700, () => {
        parts.push(INPUT.slice(startIdx, startIdx + t.n));
        outText.setText('输出：' + parts.join(' '));
        outBytes += t.n;
      });
      C(450, next);
    } else {
      const dstC = pos(Math.round((t.dst[0] + t.dst[1]) / 2));
      arrow.moveTo(dstC.x, dstC.y + 70, 0, 350);
      C(150, () => {
        for (let i = t.src[0]; i <= t.src[1]; i++) boxes[i].setColor(YELLOW, YELLOW);
        for (let i = t.dst[0]; i <= t.dst[1]; i++) boxes[i].setColor(GREEN, GREEN);
        hint.setText('窗口内找到重复：「' + INPUT.slice(t.dst[0], t.dst[1] + 1) + '」= 距 ' + t.off + ' 处，长 ' + t.len + ' → 指针 M(' + t.off + ',' + t.len + ')');
      });
      C(800, () => {
        parts.push('M(' + t.off + ',' + t.len + ')');
        outText.setText('输出：' + parts.join(' '));
        outBytes += 2;
      });
      C(450, next);
    }
  };
  next();
}

panel.addButton('运行压缩', runCompress);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；LZSS 是 LZ77 的改进版，压缩包算法基础）');

scene.start(engine);
