// AlgorithmLibrary/Caesar3D.js — 凯撒密码：字母表移位加密
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VArrow } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Caesar3D');

const scene = new Scene3D('scene', { cameraPos: [0, 380, 700], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x60a5fa, DIM = 0x334155;
const K = 3;
const hint = new VText(scene, { text: '点击「运行加密」开始', x: 0, y: 320, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

// 明文字母表（上）与移位后的密文字母表（下）
const plainBoxes = {}, cipherBoxes = {};
const SP = 34, X0 = -26 * SP / 2;
for (let i = 0; i < 26; i++) {
  const ch = String.fromCharCode(65 + i);
  plainBoxes[i] = new VBox(scene, { w: 26, h: 26, d: 26, x: X0 + i * SP, y: 175, z: 0, label: ch, color: PALETTE.node, emissive: PALETTE.nodeEmissive });
  cipherBoxes[i] = new VBox(scene, { w: 26, h: 26, d: 26, x: X0 + i * SP, y: 95, z: 0, label: '·', color: DIM, emissive: DIM });
}
new VText(scene, { text: '明文字母表', x: 0, y: 225, z: 0, color: PALETTE.textDim, scale: 0.7 });
new VText(scene, { text: '密文字母表（右移 ' + K + ' 位）', x: 0, y: 145, z: 0, color: PALETTE.textDim, scale: 0.7 });

// 消息行与密文行
const MSG = 'HELLO WORLD';
const mX = -440 + 44, mSP = 88;
const msgBoxes = [], outBoxes = [];
for (let i = 0; i < MSG.length; i++) {
  const c = MSG[i];
  const mb = new VBox(scene, { w: 56, h: 56, d: 56, x: mX + i * mSP, y: -60, z: 0, label: c === ' ' ? '␣' : c, color: c === ' ' ? DIM : PALETTE.node, emissive: c === ' ' ? DIM : PALETTE.nodeEmissive });
  const ob = new VBox(scene, { w: 56, h: 56, d: 56, x: mX + i * mSP, y: -160, z: 0, label: '', color: PALETTE.node, emissive: PALETTE.nodeEmissive });
  msgBoxes.push(mb); outBoxes.push(ob);
}
const arrow = new VArrow(scene, { x: mX, y: 10, z: 0 });
new VText(scene, { text: '明文', x: -520, y: -60, z: 0, color: PALETTE.textDim, scale: 0.7 });
new VText(scene, { text: '密文', x: -520, y: -160, z: 0, color: PALETTE.textDim, scale: 0.7 });

function resetAll() {
  engine.clear();
  for (const b of Object.values(plainBoxes)) b.setColor(PALETTE.node, PALETTE.nodeEmissive);
  for (const b of Object.values(cipherBoxes)) { b.setColor(DIM, DIM); b.setText('·'); }
  for (const b of msgBoxes) b.setColor(b.text === '␣' ? DIM : PALETTE.node, PALETTE.nodeEmissive);
  for (const b of outBoxes) { b.setColor(PALETTE.node, PALETTE.nodeEmissive); b.setText(''); }
  arrow.moveTo(mX, 10, 0, 1);
}

function runEncrypt() {
  resetAll();
  hint.setText('凯撒密码：每个字母向后移动 ' + K + ' 位，C = (P + k) mod 26');
  let done = 0;
  const next = () => {
    if (done >= MSG.length) {
      status.textContent = '加密完成：' + MSG.replace(/ /g, '') + ' → ' + MSG.split('').map((c, i) => c === ' ' ? ' ' : outBoxes[i].text).join('');
      hint.setText('密文已生成（绿色）。解密只需把每个字母向前移 ' + K + ' 位');
      return;
    }
    const i = done; done++;
    const ch = MSG[i];
    const bx = mX + i * mSP;
    if (ch === ' ') {
      arrow.moveTo(bx, 10, 0, 250);
      C(200, () => outBoxes[i].setText('␣'));
      C(100, () => outBoxes[i].setColor(DIM, DIM));
      hint.setText('空格不参与加密，原样保留');
      C(450, next);
      return;
    }
    const p = ch.charCodeAt(0) - 65;
    const cp = (p + K) % 26;
    arrow.moveTo(bx, 10, 0, 250);
    C(150, () => {
      plainBoxes[p].setColor(YELLOW, YELLOW);
      msgBoxes[i].setColor(YELLOW, YELLOW);
    });
    hint.setText(ch + ' 在字母表中位置 ' + p + '：(' + p + ' + ' + K + ') mod 26 = ' + cp);
    C(650, () => {
      cipherBoxes[cp].setColor(GREEN, GREEN);
      cipherBoxes[cp].setText(String.fromCharCode(65 + cp));
      outBoxes[i].setColor(GREEN, GREEN);
      outBoxes[i].setText(String.fromCharCode(65 + cp));
      msgBoxes[i].setColor(GREEN, GREEN);
      plainBoxes[p].setColor(PALETTE.node, PALETTE.nodeEmissive);
    });
    hint.setText(ch + ' → ' + String.fromCharCode(65 + cp));
    C(450, next);
  };
  next();
}

panel.addButton('运行加密', runEncrypt);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
