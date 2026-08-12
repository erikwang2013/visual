// AlgorithmLibrary/RC43D.js — RC4 流密码：S 盒 KSA 逐轮置换 + PRGA 生成密钥流逐字节异或；加密与解密是同一个函数（function* 生成器驱动，全部数值运行时计算）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('RC43D');

const scene = new Scene3D('scene', { cameraPos: [0, 330, 640], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：RC4 —— 密钥调度 KSA + 伪随机数 PRGA，异或即加密', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 262, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: 140, z: 0, color: PALETTE.textGlow, scale: 0.48 });
const outT = new VText(scene, { text: '', x: 0, y: -235, z: 0, color: PALETTE.textGlow, scale: 0.62 });

const M = 8; // toy 8 元素 S 盒（演示用；真实 RC4 是 256）
const SX = [-280, -200, -120, -40, 40, 120, 200, 280];
const sChips = SX.map((x, i) => new VBox(scene, { w: 60, h: 60, d: 60, x, y: 70, z: 0, label: String(i), color: BLUE, emissive: BLUE }));
new VText(scene, { text: 'S 盒下标', x: 0, y: 30, z: 0, color: PALETTE.textDim, scale: 0.34 });
const KEYBYTES = 'Key'.split('').map(c => c.charCodeAt(0));
const keyChips = SX.map((x, i) => new VBox(scene, { w: 60, h: 44, d: 44, x, y: 170, z: 0, label: KEYBYTES[i % 3], color: PUR, emissive: PUR }));
new VText(scene, { text: '密钥字节（"Key" 循环）：' + KEYBYTES.map(k => k + '(' + String.fromCharCode(k) + ')').join(' '), x: 0, y: 205, z: 0, color: PALETTE.textDim, scale: 0.38 });
const ijT = new VText(scene, { text: 'i=0  j=0', x: 0, y: -20, z: 0, color: GOLD, scale: 0.6 });

function* rc4Gen() {
  yield S(() => { hint.setText('RC4：两阶段 —— ① KSA 用密钥把 S = [0..7] 彻底打乱；② PRGA 每输出一字节就再换一次'); stageT.setText('S 初始 [0,1,2,3,4,5,6,7]，密钥字节 K = [75,101,121]（"Key"）—— 全部按 mod 8 计算'); });
  yield W(900);
  const box = Array.from({ length: M }, (_, i) => i);
  let j = 0;
  const render = () => sChips.forEach((c, i) => { c.setText(String(box[i])); c.setColor(BLUE, BLUE); });
  render();
  yield S(() => { stageT.setText('KSA 开始：i 从 0 到 7，j = (j + S[i] + K[i mod 3]) mod 8，然后交换 S[i] 与 S[j]'); eqT.setText('下标 i：0 1 2 3 4 5 6 7   密钥 K：75 101 121（mod 8 = 3 5 1）'); });
  yield W(800);
  for (let i = 0; i < M; i++) {
    j = (j + box[i] + KEYBYTES[i % 3]) % M;
    ijT.setText('i=' + i + '  j=' + j);
    sChips[i].setColor(WHITE, WHITE);
    sChips[j].setColor(WHITE, WHITE);
    yield S(() => { stageT.setText('轮 ' + i + '：j = (j + S[' + i + '] + K[' + (i % 3) + ']) mod 8 = ' + j + ' → 交换 S[' + i + '] 与 S[' + j + ']'); eqT.setText('S[' + i + ']=' + box[i] + '，S[' + j + ']=' + box[j]); });
    yield W(520);
    [box[i], box[j]] = [box[j], box[i]];
    sChips[i].setText(String(box[i]));
    sChips[j].setText(String(box[j]));
    yield W(380);
    sChips[i].setColor(BLUE, BLUE);
    sChips[j].setColor(BLUE, BLUE);
    yield W(240);
  }
  yield S(() => { stageT.setText('KSA 完成：S = [' + box.join(',') + '] —— 密钥熵扩散到整个 S 盒'); eqT.setText('只要密钥相同，KSA 结果就相同 → 收发双方得到同一个 S 盒'); });
  yield W(900);
  yield S(() => { stageT.setText('PRGA 加密第一个字节：i = 1，j = (j + S[1]) mod 8，交换后取 t = (S[i] + S[j]) mod 8，密钥流 = S[t]'); });
  yield W(750);
  let i2 = 1;
  j = (j + box[1]) % M;
  ijT.setText('i=1  j=' + j);
  sChips[1].setColor(WHITE, WHITE);
  sChips[j].setColor(WHITE, WHITE);
  yield S(() => { stageT.setText('j = (j + S[1]) mod 8 = ' + j + ' → 交换 S[1] 与 S[' + j + ']'); });
  yield W(550);
  [box[1], box[j]] = [box[j], box[1]];
  sChips[1].setText(String(box[1]));
  sChips[j].setText(String(box[j]));
  yield W(350);
  const t = (box[1] + box[j]) % M;
  const ks = box[t];
  sChips[t].setColor(GOLD, GOLD);
  sChips[1].setColor(BLUE, BLUE);
  sChips[j].setColor(BLUE, BLUE);
  yield S(() => { stageT.setText('t = (S[1] + S[' + j + ']) mod 8 = ' + t + ' → 密钥流字节 K = S[' + t + '] = ' + ks); });
  yield W(700);
  const plain = 97; // 'a'
  const enc = plain ^ ks;
  const ch = String.fromCharCode(enc);
  yield S(() => { stageT.setText("加密 'a'(" + plain + ') ⊕ ' + ks + ' = ' + enc + ' → "' + ch + '"   （XOR 是对合运算：再 ⊕ 一次就还原）'); eqT.setText('C = P ⊕ K；解密 P = C ⊕ K —— 同一个函数'); });
  yield W(900);
  yield S(() => { outT.setText("解密验证：'" + ch + "'(" + enc + ') ⊕ ' + ks + ' = ' + (enc ^ ks) + ' → "a" ✓'); status.textContent = 'RC4：a → ' + ch; hint.setText('曾用于 WEP/TLS/PDF；2015 年后因密钥流偏差攻击（如 RC4 NOMORE）被弃用 —— 但它是「简单即优雅」的经典教材案例'); });
  yield W(1100);
  yield S(() => { hint.setText('现代替代：ChaCha20（无偏、更快）。RC4 的教训：可预测的密钥流 + 重复 IV = 灾难'); outT.setText('复杂度：O(1) 每字节；状态 = 256 字节 —— 历史上极省资源'); });
  yield W(1100);
  yield S(() => { hint.setText('RC4 演示完成：KSA 打乱 S 盒 → PRGA 生成密钥流 → XOR 加解密'); outT.setText(''); });
  yield W(400);
}

function* runRC4() {
  hint.setText('RC4：KSA + PRGA');
  yield W(400);
  yield* rc4Gen();
}

engine.queue(() => runRC4());
panel.addButton('清空', () => {
  engine.clear();
  sChips.forEach((c, i) => { c.setText(String(i)); c.setColor(BLUE, BLUE); });
  ijT.setText('i=0  j=0');
  stageT.setText(''); eqT.setText(''); outT.setText('');
  hint.setText('已清空，可重新运行'); status.textContent = '';
});
panel.addLabel('（拖拽旋转视角，滚轮缩放；中排 8 块 = S 盒（下标在下方），上排紫块 = 密钥字节循环；白闪 = 正在交换的两个位置，金 = 密钥流输出位）');

scene.start(engine);
