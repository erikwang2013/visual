// AlgorithmLibrary/Caesar3D.js — 凯撒密码：C = (P + k) mod 26 逐字符移位；字母表双排联动 + 消息行加密 + 回绕演示（function* 生成器驱动，移位全部运行时计算）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Caesar3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：凯撒密码 —— 每个字母右移 3 位，C = (P + k) mod 26', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 320, y: 555, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 320, y: 390, z: 0, color: PALETTE.textGlow, scale: 0.44 });
const outT = new VText(scene, { text: '', x: 700, y: 420, z: 0, color: PALETTE.textGlow, scale: 0.55, wrapChars: 8 });

const K = 3;
const SP = 26, X0 = -26 * SP / 2 + SP / 2 + 345;
const plainBoxes = [], cipherBoxes = [];
for (let i = 0; i < 26; i++) {
  plainBoxes.push(new VBox(scene, { w: 26, h: 26, d: 26, x: X0 + i * SP, y: 525, z: 0, label: String.fromCharCode(65 + i), color: BLUE, emissive: BLUE }));
  cipherBoxes.push(new VBox(scene, { w: 26, h: 26, d: 26, x: X0 + i * SP, y: 445, z: 0, label: '·', color: DIM, emissive: DIM }));
}
new VText(scene, { text: '明文字母表', x: 780, y: 510, z: 0, color: PALETTE.textDim, scale: 0.7 });
new VText(scene, { text: '密文字母表（右移 ' + K + ' 位）', x: 780, y: 470, z: 0, color: PALETTE.textDim, scale: 0.7 });

const MSG = 'HELLO WORLD';
const mX = 28, mSP = 70;
const msgBoxes = [], outBoxes = [];
for (let i = 0; i < MSG.length; i++) {
  const c = MSG[i];
  msgBoxes.push(new VBox(scene, { w: 56, h: 56, d: 56, x: mX + i * mSP, y: 300, z: 0, label: c === ' ' ? '␣' : c, color: c === ' ' ? DIM : BLUE, emissive: c === ' ' ? DIM : BLUE }));
  outBoxes.push(new VBox(scene, { w: 56, h: 56, d: 56, x: mX + i * mSP, y: 235, z: 0, label: '', color: DIM, emissive: DIM }));
}
new VText(scene, { text: '明文', x: 780, y: 300, z: 0, color: PALETTE.textDim, scale: 0.7 });
new VText(scene, { text: '密文', x: 780, y: 220, z: 0, color: PALETTE.textDim, scale: 0.7 });
const arrowT = new VText(scene, { text: '↓', x: mX, y: 368, z: 0, color: GOLD, scale: 0.8 });

function* caesarGen() {
  yield S(() => { hint.setText('凯撒密码：把字母表做成一个环，每个字母向后移动 k 位；' + MSG.replace(/ /g, '') + ' → ?'); stageT.setText('密钥 k = ' + K + '；字母表从 A(0) 到 Z(25)，越界从另一头绕回'); });
  yield W(900);
  for (let i = 0; i < 26; i++) {
    const cp = (i + K) % 26;
    cipherBoxes[cp].setText(String.fromCharCode(65 + cp));
    cipherBoxes[cp].setColor(GOLD, GOLD);
    yield S(() => { eqT.setText('A→D 排定：明文字母 ' + String.fromCharCode(65 + i) + '(' + i + ') 映射到密文 ' + String.fromCharCode(65 + cp) + '(' + cp + ') = (' + i + '+' + K + ') mod 26'); });
    yield W(130);
  }
  yield S(() => { stageT.setText('字母表就位：A→D、B→E … 最后 X→A、Y→B、Z→C（回绕）'); });
  yield W(700);
  for (let i = 0; i < 26; i++) cipherBoxes[i].setColor(DIM, DIM);
  const ct = [];
  for (let i = 0; i < MSG.length; i++) {
    const ch = MSG[i];
    const bx = mX + i * mSP;
    arrowT.moveTo(bx, 368, 0, 300);
    if (ch === ' ') {
      outBoxes[i].setText('␣'); outBoxes[i].setColor(DIM, DIM);
      yield S(() => { stageT.setText('空格不参与加密，原样保留'); });
      ct.push(' ');
      yield W(420);
      continue;
    }
    const p = ch.charCodeAt(0) - 65;
    const cp = (p + K) % 26;
    const out = String.fromCharCode(65 + cp);
    ct.push(out);
    msgBoxes[i].setColor(GOLD, GOLD);
    plainBoxes[p].setColor(ORANGE, ORANGE);
    yield S(() => { stageT.setText(ch + ' 位置 ' + p + '：(' + p + ' + ' + K + ') mod 26 = ' + cp + ' → ' + out + (cp < p ? '（回绕！）' : '')); eqT.setText('加密公式 C = (P + k) mod 26：' + ch + ' → ' + out); });
    yield W(550);
    cipherBoxes[cp].setColor(GREEN, GREEN);
    cipherBoxes[cp].setText(out);
    outBoxes[i].setText(out);
    outBoxes[i].setColor(GREEN, GREEN);
    msgBoxes[i].setColor(GREEN, GREEN);
    plainBoxes[p].setColor(BLUE, BLUE);
    yield W(420);
  }
  outT.setText('密文：' + ct.join(''));
  status.textContent = '凯撒：' + MSG + ' → ' + ct.join('');
  yield S(() => { stageT.setText('加密完成：' + MSG + ' → ' + ct.join('') + ' —— 解密只需左移 ' + K + ' 位'); hint.setText('解密：P = (C − k) mod 26。密钥空间只有 26 种 —— 现代标准是一文不值，但它是密码学第一课'); });
  yield W(1000);
  yield S(() => { hint.setText('历史：尤利乌斯·凯撒用于军情（k=3 经典值）；暴力破解 = 试 26 个偏移看哪个可读'); eqT.setText('字母频率攻击：' + ct.join('') + ' 中最常见的是 L(3 次) → 对应 E 或 T'); });
  yield W(1000);
  yield S(() => { hint.setText('凯撒演示完成：移位 → 回绕 → 加密 ' + MSG + ' → ' + ct.join('')); outT.setText(''); });
  yield W(400);
}

function* runCaesar() {
  hint.setText('凯撒：移位 + 回绕');
  yield W(400);
  yield* caesarGen();
}

engine.queue(() => runCaesar());
panel.addButton('清空', () => {
  engine.clear();
  plainBoxes.forEach(b => b.setColor(BLUE, BLUE));
  cipherBoxes.forEach(b => { b.setText('·'); b.setColor(DIM, DIM); });
  msgBoxes.forEach((b, i) => { const c = MSG[i]; b.setText(c === ' ' ? '␣' : c); b.setColor(c === ' ' ? DIM : BLUE, c === ' ' ? DIM : BLUE); });
  outBoxes.forEach(b => { b.setText(''); b.setColor(DIM, DIM); });
  stageT.setText(''); eqT.setText(''); outT.setText('');
  hint.setText('已清空，可重新运行'); status.textContent = '';
});
panel.addLabel('（拖拽旋转视角，滚轮缩放；上排蓝 = 明文字母表、下排金 = 映射、消息行蓝→金→绿 = 正在加密、绿 = 密文；X→A 等回绕自动演示）');

scene.start(engine);
