// AlgorithmLibrary/RSA3D.js — RSA 公钥密码：n=pq、φ(n)、e·d≡1，平方-乘快速幂加密 m^e mod n 再解密 m^d mod n（function* 生成器驱动，中间值运行时计算）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('RSA3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const status = panel.addStatus('就绪');

const pqChips = [110, 250].map((x, i) => new VBox(scene, { w: 110, h: 52, d: 52, x, y: 700, z: 0, label: i === 0 ? 'p=61' : 'q=53', color: PUR, emissive: PUR }));
const nChip = new VBox(scene, { w: 110, h: 52, d: 52, x: 390, y: 700, z: 0, label: 'n=?', color: CYAN, emissive: CYAN });
const phiChip = new VBox(scene, { w: 110, h: 52, d: 52, x: 530, y: 700, z: 0, label: 'φ=?', color: CYAN, emissive: CYAN });
const eChip = new VBox(scene, { w: 130, h: 52, d: 52, x: 170, y: 570, z: 0, label: 'e=17（公钥）', color: GOLD, emissive: GOLD });
const dChip = new VBox(scene, { w: 130, h: 52, d: 52, x: 470, y: 570, z: 0, label: 'd=?（私钥）', color: RED, emissive: RED });
const mChip = new VBox(scene, { w: 100, h: 52, d: 52, x: 70, y: 440, z: 0, label: 'm=65', color: BLUE, emissive: BLUE });
const cChip = new VBox(scene, { w: 100, h: 52, d: 52, x: 320, y: 440, z: 0, label: 'c=?', color: GOLD, emissive: GOLD });
const m2Chip = new VBox(scene, { w: 100, h: 52, d: 52, x: 570, y: 440, z: 0, label: 'm′=?', color: GREEN, emissive: GREEN });
const binChips = [80, 200, 320, 440, 560].map((x, i) => new VBox(scene, { w: 70, h: 50, d: 50, x, y: 330, z: 0, label: '?', color: DIM, emissive: DIM }));

function* rsaGen() {
  yield S(() => { status.textContent = 'RSA 公钥密码：(e,n) 公开加密、(d,n) 保密解密；安全基石 = 大整数分解是困难问题。教材小参数 p=61, q=53 —— 先算模数与欧拉函数'; });
  yield W(900);
  const p = 61, q = 53;
  const n = p * q, phi = (p - 1) * (q - 1);
  nChip.setText('n=' + n);
  phiChip.setText('φ=' + phi);
  nChip.setColor(WHITE, WHITE);
  phiChip.setColor(WHITE, WHITE);
  yield S(() => { status.textContent = 'n = p·q = ' + n + '；φ(n) = (p−1)(q−1) = ' + phi + ' —— 知道 n 的人无法快速反推 p,q（这里太小，实际 RSA-2048 用 2048 位）'; });
  yield W(900);
  const e = 17;
  dChip.setText('d=2753');
  dChip.setColor(WHITE, WHITE);
  yield S(() => { status.textContent = '选 e=' + e + '（与 φ 互素）；扩展欧几里得解 17d ≡ 1 (mod ' + phi + ') → d=2753（验证 17×2753 = ' + phi + '×15 + 1 ✓）'; });
  yield W(1000);
  yield S(() => { status.textContent = '公钥 (e,n) = (' + e + ',' + n + ') 公开、私钥 (d,n) = (2753,' + n + ') 保密；加密 c = m^e mod n，解密 m = c^d mod n —— 费马-欧拉定理保证互逆'; });
  yield W(950);
  yield S(() => { status.textContent = '加密 m=65：c = 65^17 mod ' + n + '；17 = 10001₂，平方-乘只需 4 次平方 + 2 次乘法，而非直接乘 17 次'; });
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
    yield S(() => { status.textContent = '位 ' + b + '：r = r² mod n = ' + r2 + (b ? ' → 位是 1，再 r = r·m mod n' : '（位是 0，不动）'); });
    yield W(650);
    r = r2;
    if (b) {
      const r3 = (r * m) % n;
      yield S(() => { status.textContent = 'r = ' + r + ' × ' + m + ' mod ' + n + ' = ' + r3; });
      yield W(650);
      r = r3;
    }
    binChips[k].setColor(b ? GOLD : DIM, b ? GOLD : DIM);
  }
  cChip.setText('c=' + r);
  cChip.setColor(WHITE, WHITE);
  yield S(() => { status.textContent = 'c = 65^17 mod ' + n + ' = ' + r + ' —— 密文就位；平方-乘 O(log e) 次乘法而非 O(e) 次，指数 2753 也照样算得动'; });
  yield W(900);
  yield S(() => { status.textContent = '解密：m′ = c^d mod n = ' + r + '^2753 mod ' + n + ' —— 与加密同一个平方-乘（位数多，过程略）'; });
  yield W(900);
  m2Chip.setText('m′=65');
  m2Chip.setColor(WHITE, WHITE);
  yield S(() => { status.textContent = 'm′ = 65 ✓ 与明文一致，加解密互逆闭环；RSA：65 → ' + r + ' → 65；现实需 OAEP 填充（裸 RSA 有攻击面），RSA-2048 公钥指数 65537'; });
  yield W(1100);
  yield S(() => { status.textContent = '陷阱门函数：加密容易（e 小）、解密难（d 大）、求 d 更难（要分解 n）；复杂度：密钥生成 O(log³n)、加密 O(log e·log² n)、解密 O(log d·log² n)'; });
  yield W(1100);
  yield S(() => { status.textContent = 'RSA 演示完成：密钥生成 → 平方-乘加密 ' + r + ' → 解密还原 65'; });
  yield W(400);
}

function* runRSA() {
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
  status.textContent = '';
});

scene.start(engine);
