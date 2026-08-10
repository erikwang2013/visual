// AlgorithmLibrary/RLE3D.js — 游程编码：连续相同字符 → 字符+计数
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VArrow } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('RLE3D');

const scene = new Scene3D('scene', { cameraPos: [0, 380, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「运行压缩」开始', x: 0, y: 260, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const INPUT = 'AAAABBBCCDAA';
const SP = 54, X0 = -INPUT.length * SP / 2 + SP / 2;
const boxes = [];
for (let i = 0; i < INPUT.length; i++) {
  boxes.push(new VBox(scene, { w: 44, h: 44, d: 44, x: X0 + i * SP, y: 90, z: 0, label: INPUT[i], color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
}
const arrow = new VArrow(scene, { x: X0, y: 170, z: 0 });
new VText(scene, { text: '输入（12 字符）', x: X0 - 240, y: 90, z: 0, color: PALETTE.textDim, scale: 0.7 });
const outText = new VText(scene, { text: '', x: 0, y: -60, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const ratioT = new VText(scene, { text: '', x: 0, y: -120, z: 0, color: PALETTE.textDim, scale: 0.7 });

const runs = [];
for (let i = 0; i < INPUT.length; ) {
  let j = i;
  while (j < INPUT.length && INPUT[j] === INPUT[i]) j++;
  runs.push({ ch: INPUT[i], len: j - i, start: i });
  i = j;
}

function resetAll() {
  engine.clear();
  for (const b of boxes) b.setColor(PALETTE.node, PALETTE.nodeEmissive);
  arrow.moveTo(X0, 170, 0, 1);
  outText.setText('');
  ratioT.setText('');
}

function runCompress() {
  resetAll();
  hint.setText('RLE：扫描序列，连续相同字符压缩为「字符 + 出现次数」');
  let done = 0;
  const next = () => {
    if (done >= runs.length) {
      const out = runs.map(r => r.ch + r.len).join(' ');
      outText.setText('压缩结果：' + out);
      ratioT.setText('12 字符 → ' + out.replace(/ /g, '').length + ' 个字符（' + (INPUT.length / out.replace(/ /g, '').length).toFixed(2) + '× 压缩）');
      status.textContent = 'RLE 压缩完成：' + INPUT + ' → ' + out;
      hint.setText('解压时把每个「字符+计数」展开为连续字符即可还原');
      return;
    }
    const r = runs[done]; done++;
    arrow.moveTo(X0 + (r.start + r.len / 2 - 0.5) * SP, 170, 0, 350);
    C(150, () => { for (let i = r.start; i < r.start + r.len; i++) boxes[i].setColor(YELLOW, YELLOW); });
    hint.setText('连续 ' + r.len + ' 个「' + r.ch + '」→ 记作 ' + r.ch + r.len);
    C(750, () => {
      for (let i = r.start; i < r.start + r.len; i++) boxes[i].setColor(GREEN, GREEN);
      outText.setText('压缩结果：' + runs.slice(0, done).map(x => x.ch + x.len).join(' '));
    });
    C(500, next);
  };
  next();
}

panel.addButton('运行压缩', runCompress);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；适合重复多、稀疏图像等数据）');

scene.start(engine);
