// AlgorithmLibrary/ZAlgorithm3D.js — Z 算法：线性求 Z 数组，Z[i]≥m 且 i≥m+1 即匹配
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('ZAlgorithm3D');

const scene = new Scene3D('scene', { cameraPos: [0, 360, 700], fov: 50 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const S = 'aba$ababa'; // 模式 + '$' + 文本
const PAT = 'aba';
const M = PAT.length;
const GREEN = 0x4ade80, YELLOW = 0xfacc15, DIM = 0x475569, PURPLE = 0xa78bfa;
const SP = 52;
const sBoxes = S.split('').map((ch, c) => new VBox(scene, {
  w: 42, h: 42, d: 42, x: -220 + c * SP, y: 150, z: 0, label: ch,
  color: ch === '$' ? PURPLE : PALETTE.node, emissive: ch === '$' ? PURPLE : PALETTE.nodeEmissive
}));
PAT.split('').forEach((ch, c) => new VText(scene, { text: ch, x: -220 + c * SP, y: 225, z: 0, color: PALETTE.blue, scale: 0.7 }));
new VText(scene, { text: '模式', x: -270, y: 225, z: 0, color: PALETTE.textDim, scale: 0.6 });
const zLabels = S.split('').map((_, c) => new VText(scene, { text: '', x: -220 + c * SP, y: 105, z: 0, color: PALETTE.textGlow, scale: 0.75 }));
const hint = new VText(scene, { text: '点击「运行 Z算法」开始：计算 Z 数组', x: 0, y: 290, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');
const matchNote = new VText(scene, { text: '', x: 0, y: 20, z: 0, color: GREEN, scale: 0.85 });

function computeZ(str) {
  const z = Array(str.length).fill(0);
  let l = 0, r = 0;
  for (let i = 1; i < str.length; i++) {
    if (i <= r) z[i] = Math.min(r - i + 1, z[i - l]);
    while (i + z[i] < str.length && str[z[i]] === str[i + z[i]]) z[i]++;
    if (i + z[i] - 1 > r) { l = i; r = i + z[i] - 1; }
  }
  return z;
}

function resetColors() {
  sBoxes.forEach((b, c) => b.setColor(c === 3 ? PURPLE : PALETTE.node, c === 3 ? PURPLE : PALETTE.nodeEmissive));
  zLabels.forEach(t => t.setText(''));
  matchNote.setText('');
}

function runZAlgorithm() {
  engine.clear();
  resetColors();
  const z = computeZ(S);
  hint.setText('S = 模式$文本：Z[i] = S[i..] 与 S 前缀的最长公共长度；Z[i] ≥ ' + M + ' 且 i ≥ ' + (M + 1) + ' → 文本位置 i−' + M + ' 匹配');

  const matches = [];
  for (let i = M + 1; i < S.length; i++) if (z[i] >= M) matches.push(i - M);

  let i = 1;
  const step = () => {
    if (i >= S.length) {
      status.textContent = 'Z 算法完成：模式 ' + PAT + ' 匹配于位置 ' + matches.join('、');
      hint.setText('完成！匹配位置：' + matches.join('、'));
      matchNote.setText('匹配位置 ' + matches.join('、'));
      return;
    }
    const zi = z[i];
    sBoxes[i].setColor(YELLOW, YELLOW);
    zLabels[i].setText('Z[' + i + ']=' + zi);
    const isMatch = zi >= M && i >= M + 1;
    const seg = zi;
    for (let k = 0; k < seg; k++) {
      sBoxes[i + k].setColor(isMatch ? GREEN : YELLOW, isMatch ? GREEN : YELLOW);
      sBoxes[k].setColor(isMatch ? GREEN : DIM, isMatch ? GREEN : DIM);
    }
    hint.setText(zi === 0
      ? 'i=' + i + '：S[' + i + ']=\'' + S[i] + '\' ≠ 前缀首字符 → Z[' + i + ']=0'
      : 'i=' + i + '：S[' + i + '..' + (i + seg - 1) + '] 与 S[0..' + (seg - 1) + '] 相同 → Z[' + i + ']=' + seg + (isMatch ? '，≥ 模式长 → 匹配位置 ' + (i - M) : ''));
    C(700, () => {
      for (let k = 0; k < seg; k++) {
        sBoxes[i + k].setColor(isMatch ? GREEN : PALETTE.node, isMatch ? GREEN : PALETTE.nodeEmissive);
        sBoxes[k].setColor(PALETTE.node, PALETTE.nodeEmissive);
      }
      sBoxes[i].setColor(PALETTE.node, PALETTE.nodeEmissive);
      i++;
      step();
    });
  };
  step();
}

panel.addButton('运行 Z算法', runZAlgorithm);
panel.addButton('清空', () => { engine.clear(); resetColors(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
