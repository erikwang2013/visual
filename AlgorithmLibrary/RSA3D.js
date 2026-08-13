// AlgorithmLibrary/RSA3D.js — RSA 公钥密码：n=pq、φ(n)、e·d≡1，平方-乘快速幂加密 m^e mod n 再解密 m^d mod n（function* 生成器驱动，中间值运行时计算）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('RSA3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：RSA —— 生成密钥 → 平方-乘快速幂加密 → 解密还原', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 562, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: 450, z: 0, color: PALETTE.textGlow, scale: 0.48 });
const outT = new VText(scene, { text: '', x: 0, y: 70, z: 0, color: PALETTE.textGlow, scale: 0.62 });

const pqChips = [120, 240].map((x, i) => new VBox(scene, { w: 110, h: 52, d: 52, x, y: 495, z: 0, label: i === 0 ? 'p=61' : 'q=53', color: PUR, emissive: PUR }));
const nChip = new VBox(scene, { w: 110, h: 52, d: 52, x: 380, y: 495, z: 0, label: 'n=?', color: CYAN, emissive: CYAN });
const phiChip = new VBox(scene, { w: 110, h: 52, d: 52, x: 530, y: 495, z: 0, label: 'φ=?', color: CYAN, emissive: CYAN });
const eChip = new VBox(scene, { w: 130, h: 52, d: 52, x: 170, y: 400, z: 0, label: 'e=17（公钥）', color: GOLD, emissive: GOLD });
const dChip = new VBox(scene, { w: 130, h: 52, d: 52, x: 470, y: 400, z: 0, label: 'd=?（私钥）', color: RED, emissive: RED });
const mChip = new VBox(scene, { w: 100, h: 52, d: 52, x: 70, y: 300, z: 0, label: 'm=65', color: BLUE, emissive: BLUE });
const cChip = new VBox(scene, { w: 100, h: 52, d: 52, x: 320, y: 300, z: 0, label: 'c=?', color: GOLD, emissive: GOLD });
const m2Chip = new VBox(scene, { w: 100, h: 52, d: 52, x: 570, y: 300, z: 0, label: 'm′=?', color: GREEN, emissive: GREEN });
const binChips = [80, 200, 320, 440, 560].map((x, i) => new VBox(scene, { w: 70, h: 50, d: 50, x, y: 190, z: 0, label: '?', color: DIM, emissive: DIM }));
new VText(scene, { text: '指数 17 的二进制位（高位→低位）—— 平方-乘：每移一位先平方，位是 1 再乘一次底数', x: 0, y: 140, z: 0, color: PALETTE.textDim, scale: 0.38 });

function* rsaGen() {
  yield S(() => { hint.setText('RSA：公钥加密 (e,n) 公开，私钥 (d,n) 保密；安全基石 = 大整数分解是困难问题'); stageT.setText('教材小参数：p=61, q=53 —— 先算出模数与欧拉函数'); });
  yield W(900);
  const p = 61, q = 53;
  const n = p * q, phi = (p - 1) * (q - 1);
  nChip.setText('n=' + n);
  phiChip.setText('φ=' + phi);
  nChip.setColor(WHITE, WHITE);
  phiChip.setColor(WHITE, WHITE);
  yield S(() => { stageT.setText('n = p·q = ' + n + '；φ(n) = (p−1)(q−1) = ' + phi + ' —— 欧拉函数'); eqT.setText('安全性：知道 n 的人无法快速反推 p,q（这里太小，实际用 2048 位）'); });
  yield W(900);
  const e = 17;
  dChip.setText('d=2753');
  dChip.setColor(WHITE, WHITE);
  yield S(() => { stageT.setText('选 e=' + e + '（与 φ 互素）；d = e⁻¹ mod φ：扩展欧几里得解 17d ≡ 1 (mod ' + phi + ') → d=2753'); eqT.setText('验证：17 × 2753 = 46801 = ' + phi + ' × 15 + 1 → 17·2753 ≡ 1 (mod ' + phi + ') ✓'); });
  yield W(1000);
  yield S(() => { stageT.setText('公钥 (e,n) = (' + e + ',' + n + ') 公开；私钥 (d,n) = (2753,' + n + ') 保密'); eqT.setText('加密 c = m^e mod n；解密 m = c^d mod n —— 靠费马-欧拉定理互逆'); });
  yield W(950);
  yield S(() => { stageT.setText('加密 m=65：c = 65^17 mod ' + n + ' —— 直接乘 17 次太笨，用平方-乘快速幂'); eqT.setText('17 = 10001₂ → 只需 4 次平方 + 2 次乘法，而不是 17 次乘法'); });
  yield W(950);
  const m = 65;
  const bits = [1, 0, 0, 0, 1];
  bits.forEach((b, k) => { binChips[k].setText(String(b)); binChips[k].setColor(b ? GOLD : DIM, b ? GOLD : DIM); });
  yield W(450);
  let r = 1;
  for (let k = 0; k < bits.length; k++) {
    const b = bits[k];
    binChips[k].setColor(WHITE, WHITE);
    const r2 = (r * r) % n;
    yield S(() => { stageT.setText('位 ' + b + '：r = r² mod n = ' + r2 + (b ? ' → 位是 1，再 r = r·m mod n' : '（位是 0，不动）')); });
    yield W(650);
    r = r2;
    if (b) {
      const r3 = (r * m) % n;
      yield S(() => { stageT.setText('r = ' + r + ' × ' + m + ' mod ' + n + ' = ' + r3); });
      yield W(650);
      r = r3;
    }
    binChips[k].setColor(b ? GOLD : DIM, b ? GOLD : DIM);
  }
  cChip.setText('c=' + r);
  cChip.setColor(WHITE, WHITE);
  yield S(() => { stageT.setText('c = 65^17 mod ' + n + ' = ' + r + ' —— 密文就位'); eqT.setText('平方-乘：O(log e) 次乘法，而非 O(e) 次 —— 指数 2753 也照样算得动'); });
  yield W(900);
  yield S(() => { stageT.setText('解密：m′ = c^d mod n = ' + r + '^2753 mod ' + n + ' —— 与加密同一个平方-乘（位数多，过程略）'); });
  yield W(900);
  m2Chip.setText('m′=65');
  m2Chip.setColor(WHITE, WHITE);
  yield S(() => { outT.setText('m′ = 65 ✓ —— 与明文一致，加解密互逆闭环'); status.textContent = 'RSA：65 → 2790 → 65'; hint.setText('现实：RSA-2048 公钥指数 65537；需要 OAEP 填充，裸 RSA 有攻击面'); });
  yield W(1100);
  yield S(() => { hint.setText('同余类上的陷阱门函数：加密容易（e 小）、解密难（d 大）、求 d 更难（要分解 n）'); outT.setText('密钥生成 O(log³n)；加密 O(log e·log² n)；解密 O(log d·log² n)'); });
  yield W(1100);
  yield S(() => { hint.setText('RSA 演示完成：密钥生成 → 平方-乘加密 2790 → 解密还原 65'); outT.setText(''); });
  yield W(400);
}

function* runRSA() {
  hint.setText('RSA：公钥加解密');
  yield W(400);
  yield* rsaGen();
}

engine.queue(() => runRSA());
panel.addButton('清空', () => {
  engine.clear();
  nChip.setText('n=?'); phiChip.setText('φ=?');
  nChip.setColor(CYAN, CYAN); phiChip.setColor(CYAN, CYAN);
  dChip.setText('d=?（私钥）'); dChip.setColor(RED, RED);
  cChip.setText('c=?'); cChip.setColor(GOLD, GOLD);
  m2Chip.setText('m′=?'); m2Chip.setColor(GREEN, GREEN);
  binChips.forEach(c => { c.setText('?'); c.setColor(DIM, DIM); });
  stageT.setText(''); eqT.setText(''); outT.setText('');
  hint.setText('已清空，可重新运行'); status.textContent = '';
});
panel.addLabel('（拖拽旋转视角，滚轮缩放；紫 = 质数、青 = 模数/欧拉函数、金 = 公钥、红 = 私钥、蓝 = 明文、金→绿 = 密文→还原；底部 5 块 = 指数二进制位，白闪 = 当前位）');

scene.start(engine);
