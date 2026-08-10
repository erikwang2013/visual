// AlgorithmLibrary/ExGcd3D.js — 扩展欧几里得：ax+by=gcd(a,b) 的整数解
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('ExGcd3D');

const scene = new Scene3D('scene', { cameraPos: [0, 260, 700], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const A = 48, B = 18;
const GREEN = 0x4ade80, YELLOW = 0xfacc15;
const aBox = new VBox(scene, { w: 80, h: 56, d: 56, x: -400, y: 170, z: 0, label: String(A), color: PALETTE.blue, emissive: PALETTE.blue });
const bBox = new VBox(scene, { w: 80, h: 56, d: 56, x: -280, y: 170, z: 0, label: String(B), color: PALETTE.purple, emissive: PALETTE.purple });
const qBox = new VBox(scene, { w: 80, h: 56, d: 56, x: -150, y: 170, z: 0, label: '?', color: PALETTE.node, emissive: PALETTE.nodeEmissive });
const rBox = new VBox(scene, { w: 80, h: 56, d: 56, x: -30, y: 170, z: 0, label: '?', color: PALETTE.node, emissive: PALETTE.nodeEmissive });
['被除数 a', '除数 b', '商 q', '余 r'].forEach((t, c) => {
  new VText(scene, { text: t, x: -400 + c * 130, y: 235, z: 0, color: PALETTE.textDim, scale: 0.7 });
});
const hint = new VText(scene, { text: '点击「运行扩展欧几里得」开始', x: 0, y: 250, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');
const rows = [];
const notes = [];

function runExGcd() {
  engine.clear();
  for (const t of rows) t.remove();
  for (const t of notes) t.remove();
  rows.length = 0; notes.length = 0;
  aBox.setText(String(A)); aBox.setColor(PALETTE.blue, PALETTE.blue);
  bBox.setText(String(B)); bBox.setColor(PALETTE.purple, PALETTE.purple);
  qBox.setText('?'); rBox.setText('?');
  qBox.setColor(PALETTE.node, PALETTE.nodeEmissive); rBox.setColor(PALETTE.node, PALETTE.nodeEmissive);
  hint.setText('求 ' + A + ' 与 ' + B + ' 的最大公约数：辗转相除');

  const steps = [];
  let a = A, b = B;
  while (b) { const q = Math.floor(a / b), r = a % b; steps.push({ a, b, q, r }); a = b; b = r; }
  const g = a;

  let i = 0;
  const step = () => {
    if (i >= steps.length) {
      const vt = new VText(scene, { text: 'gcd(' + A + ', ' + B + ') = ' + g, x: 0, y: 45, z: 0, color: GREEN, scale: 1.05 });
      notes.push(vt);
      hint.setText('gcd = ' + g + '，开始回代构造整数解');
      back();
      return;
    }
    const s = steps[i]; i++;
    aBox.setText(String(s.a)); bBox.setText(String(s.b));
    qBox.setText(String(s.q)); rBox.setText(String(s.r));
    qBox.setColor(YELLOW, YELLOW); rBox.setColor(GREEN, GREEN);
    const row = new VText(scene, { text: s.a + ' = ' + s.q + ' × ' + s.b + ' + ' + s.r, x: -210, y: 100 - (i - 1) * 52, z: 0, color: s.r ? PALETTE.text : PALETTE.textDim, scale: 0.75 });
    rows.push(row);
    hint.setText('第 ' + i + ' 步：' + s.a + ' ÷ ' + s.b + ' = ' + s.q + ' 余 ' + s.r);
    C(s.r ? 750 : 900, step);
  };
  step();

  function back() {
    let x1 = 1, y1 = 0, x2 = 0, y2 = 1;
    for (const s of steps) {
      const nx = x1 - s.q * x2, ny = y1 - s.q * y2;
      x1 = x2; y1 = y2; x2 = nx; y2 = ny;
    }
    const t1 = new VText(scene, { text: '回代（自下而上）：余数用前一步式代入', x: 20, y: -5, z: 0, color: PALETTE.text, scale: 0.75 });
    notes.push(t1);
    const t2 = new VText(scene, { text: 'g = ' + g + ' = ' + x1 + '·' + A + ' + ' + y1 + '·' + B + '（展开代入后）', x: 20, y: -55, z: 0, color: PALETTE.text, scale: 0.75 });
    notes.push(t2);
    const finalT = new VText(scene, { text: '∴ ' + x2 + '×' + A + ' + ' + y2 + '×' + B + ' = ' + (x2 * A + y2 * B), x: 20, y: -120, z: 0, color: GREEN, scale: 1.0 });
    notes.push(finalT);
    status.textContent = '扩展欧几里得完成：x = ' + x2 + ', y = ' + y2 + '（' + x2 + '×' + A + ' + ' + y2 + '×' + B + ' = ' + g + '）';
    hint.setText('整数解 x = ' + x2 + ', y = ' + y2);
    C(700, () => {});
  }
}

panel.addButton('运行扩展欧几里得', runExGcd);
panel.addButton('清空', () => { engine.clear(); for (const t of rows) t.remove(); for (const t of notes) t.remove(); rows.length = 0; notes.length = 0; hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
