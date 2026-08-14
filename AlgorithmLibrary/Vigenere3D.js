// AlgorithmLibrary/Vigenere3D.js — 维吉尼亚密码：多表替换，C = (P+K) mod 26，密钥循环使用；逐列加密再解密验证（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Vigenere3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const status = panel.addStatus('就绪');

const PT = 'ATTACKATDAWN';
const KEY = 'LEMON';
const N = PT.length;
const X0 = 10;   // 12 列：x ∈ [10, 606] 全在视锥内
const pxChips = [], keyChips = [], cxChips = [];
for (let i = 0; i < N; i++) {
  const x = X0 + i * 52;
  pxChips.push(new VBox(scene, { w: 48, h: 44, d: 44, x, y: 700, z: 0, label: '?', color: BLUE, emissive: BLUE }));
  keyChips.push(new VBox(scene, { w: 48, h: 44, d: 44, x, y: 610, z: 0, label: '?', color: PUR, emissive: PUR }));
  cxChips.push(new VBox(scene, { w: 48, h: 44, d: 44, x, y: 520, z: 0, label: '?', color: GOLD, emissive: GOLD }));
}

const C2I = c => c.charCodeAt(0) - 65;
const I2C = n => String.fromCharCode(65 + n);

function* vigenereGen() {
  yield S(() => { status.textContent = '维吉尼亚密码：凯撒的推广 —— 每个位置用不同的偏移（由密钥字母决定），同样的字母在不同位置会加密成不同密文；明文 ATTACKATDAWN（12 位），密钥 LEMON 循环使用 L E M O N L E M O N L E'; });
  yield W(900);
  for (let i = 0; i < N; i++) {
    pxChips[i].setText(PT[i]);
    keyChips[i].setText(KEY[i % KEY.length]);
    yield W(180);
  }
  yield S(() => { status.textContent = '明文与密钥就位。加密：C = (P + K) mod 26 —— 逐列计算；A=0 B=1 … Z=25；偏移量 = 密钥字母的序号（L=11, E=4, M=12, O=14, N=13）'; });
  yield W(850);
  const cipher = [];
  for (let i = 0; i < N; i++) {
    const p = C2I(PT[i]), k = C2I(KEY[i % KEY.length]);
    const c = (p + k) % 26;
    cipher.push(I2C(c));
    pxChips[i].setColor(WHITE, WHITE);
    keyChips[i].setColor(WHITE, WHITE);
    yield W(260);
    cxChips[i].setText(I2C(c));
    cxChips[i].setColor(WHITE, WHITE);
    yield S(() => { status.textContent = '列 ' + i + '：' + PT[i] + '(' + p + ') + ' + KEY[i % KEY.length] + '(' + k + ') = ' + (p + k) + ' mod 26 = ' + c + ' → ' + I2C(c); });
    yield W(560);
    pxChips[i].setColor(BLUE, BLUE);
    keyChips[i].setColor(PUR, PUR);
    cxChips[i].setColor(GOLD, GOLD);
  }
  const cipherText = cipher.join('');
  yield S(() => { status.textContent = '密文：' + cipherText + ' —— 明文里两个 A 加密成了 L 和 E，看不出重复模式，抗频率分析（同字母不同密文 = 维吉尼亚的核心优势）'; });
  yield W(1000);
  yield S(() => { status.textContent = '解密验证：P = (C − K) mod 26，倒推回明文'; });
  yield W(700);
  let ok = true;
  for (let i = 0; i < N; i++) {
    const c = C2I(cipher[i]), k = C2I(KEY[i % KEY.length]);
    const p = ((c - k) % 26 + 26) % 26;
    if (I2C(p) !== PT[i]) ok = false;
    cxChips[i].setColor(GREEN, GREEN);
    yield W(180);
  }
  yield S(() => { status.textContent = '维吉尼亚：ATTACKATDAWN → ' + cipherText + ' —— 解密得 ATTACKATDAWN ✓' + (ok ? '' : '（不一致！）') + '；破解：先猜密钥长度（Kasiski 试验 / 重合指数），再按列做频率分析 —— 一战前被称为「不可破的密码」，19 世纪被破'; });
  yield W(1100);
  yield S(() => { status.textContent = '现代意义：密钥流思想的开山之作 —— 后人把随机密钥流 + XOR 发扬为一次性便签（绝对安全）与流密码；复杂度 O(n)；安全性完全依赖密钥随机性 —— 重复使用密钥就退化成好破的多表替换'; });
  yield W(1100);
  yield S(() => { status.textContent = '维吉尼亚演示完成：密钥循环多表替换，加密解密互逆'; });
  yield W(400);
}

function* runVigenere() {
  yield W(400);
  yield* vigenereGen();
}

engine.queue(() => runVigenere());
panel.addButton('清空', () => {
  engine.clear();
  pxChips.forEach(c => { c.setText('?'); c.setColor(BLUE, BLUE); });
  keyChips.forEach(c => { c.setText('?'); c.setColor(PUR, PUR); });
  cxChips.forEach(c => { c.setText('?'); c.setColor(GOLD, GOLD); });
  status.textContent = '';
});

scene.start(engine);
