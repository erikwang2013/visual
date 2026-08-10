// AlgorithmLibrary/Vigenere3D.js — 维吉尼亚密码：多表替换，密钥循环
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VArrow } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Vigenere3D');

const scene = new Scene3D('scene', { cameraPos: [0, 380, 660], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x60a5fa, DIM = 0x334155;
const P = 'ATTACKATDAWN', KEY = 'LEMON';
const N = P.length;
const hint = new VText(scene, { text: '点击「运行加密」开始', x: 0, y: 310, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

// 三行：明文 / 密钥（循环）/ 密文
const SP = 52, X0 = -N * SP / 2;
const pBoxes = [], kBoxes = [], cBoxes = [];
for (let i = 0; i < N; i++) {
  const x = X0 + i * SP;
  pBoxes.push(new VBox(scene, { w: 42, h: 42, d: 42, x, y: 180, z: 0, label: P[i], color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
  kBoxes.push(new VBox(scene, { w: 42, h: 42, d: 42, x, y: 80, z: 0, label: KEY[i % KEY.length], color: DIM, emissive: DIM }));
  cBoxes.push(new VBox(scene, { w: 42, h: 42, d: 42, x, y: -20, z: 0, label: '', color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
}
const arrow = new VArrow(scene, { x: X0, y: 120, z: 0 });
new VText(scene, { text: '明文 P', x: X0 - 60, y: 180, z: 0, color: PALETTE.textDim, scale: 0.7 });
new VText(scene, { text: '密钥 K（循环）', x: X0 - 60, y: 80, z: 0, color: PALETTE.textDim, scale: 0.7 });
new VText(scene, { text: '密文 C', x: X0 - 60, y: -20, z: 0, color: PALETTE.textDim, scale: 0.7 });
const result = new VText(scene, { text: '', x: 0, y: -120, z: 0, color: PALETTE.textGlow, scale: 0.85 });

function resetAll() {
  engine.clear();
  for (const b of pBoxes) b.setColor(PALETTE.node, PALETTE.nodeEmissive);
  for (const b of kBoxes) b.setColor(DIM, DIM);
  for (const b of cBoxes) { b.setColor(PALETTE.node, PALETTE.nodeEmissive); b.setText(''); }
  arrow.moveTo(X0, 120, 0, 1);
  result.setText('');
}

function runEncrypt() {
  resetAll();
  hint.setText('维吉尼亚密码：C = (P + K) mod 26，密钥 LEMON 循环使用');
  let done = 0;
  const next = () => {
    if (done >= N) {
      const cipher = cBoxes.map(b => b.text).join('');
      result.setText('密文：' + cipher);
      status.textContent = '加密完成：' + P + ' → ' + cipher;
      hint.setText('同一明文字母因密钥不同而加密为不同字母，无法用频率分析破解');
      return;
    }
    const i = done; done++;
    const k = KEY[i % KEY.length];
    const pv = P[i].charCodeAt(0) - 65;
    const kv = k.charCodeAt(0) - 65;
    const cv = (pv + kv) % 26;
    arrow.moveTo(X0 + i * SP, 120, 0, 250);
    C(150, () => {
      pBoxes[i].setColor(YELLOW, YELLOW);
      kBoxes[i].setColor(BLUE, BLUE);
    });
    hint.setText('第 ' + (i + 1) + ' 位：' + P[i] + '(' + pv + ') + ' + k + '(' + kv + ') = ' + (pv + kv) + ' mod 26 = ' + cv);
    C(700, () => {
      const cc = String.fromCharCode(65 + cv);
      cBoxes[i].setColor(GREEN, GREEN);
      cBoxes[i].setText(cc);
      pBoxes[i].setColor(PALETTE.node, PALETTE.nodeEmissive);
      kBoxes[i].setColor(DIM, DIM);
      result.setText('密文：' + cBoxes.map(b => b.text).join(''));
    });
    hint.setText(P[i] + ' → ' + String.fromCharCode(65 + cv));
    C(450, next);
  };
  next();
}

panel.addButton('运行加密', runEncrypt);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
