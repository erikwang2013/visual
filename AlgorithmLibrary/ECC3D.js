// AlgorithmLibrary/ECC3D.js — 椭圆曲线密码（ECC）：y²=x³+ax+b 上的点加法群 —— 17 位小域上完整演示「倍点 + 加法」如何生成循环群
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('ECC3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, ROSE = 0xfb7185, CYAN = 0x67e8f9, VIOLET = 0xa78bfa, AMBER = 0xfbbf24;
const hint = new VText(scene, { text: '点击「运行 ECC」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const G = '(5, 1)';
const MUL = [
  ['2G', '(6, 3)'], ['3G', '(10, 6)'], ['4G', '(3, 1)'], ['5G', '(9, 16)'], ['6G', '(16, 13)'], ['7G', '(0, 6)'],
  ['8G', '(13, 7)'], ['9G', '(7, 6)'], ['10G', '(7, 11)'], ['11G', '(13, 10)'], ['12G', '(0, 11)'], ['13G', '(16, 4)'],
  ['14G', '(9, 1)'], ['15G', '(3, 16)'], ['16G', '(10, 11)'], ['17G', '(6, 14)'], ['18G', '(5, 16)'], ['19G', '∞'],
];

const box = (v, x, y, w = 66, color = DIM) => new VBox(scene, { w, h: 44, d: 44, x, y, z: 0, label: String(v), color, emissive: color });
const gBox = box(G, -290, 175, 70);
const row1 = MUL.slice(0, 6).map((m, i) => box(m[0] + ' ' + m[1], -180 + i * 70, 175, 62));
const row2 = MUL.slice(6, 12).map((m, i) => box(m[0] + ' ' + m[1], -180 + i * 70, 75, 62));
const row3 = MUL.slice(12, 18).map((m, i) => box(m[0] + ' ' + m[1], -180 + i * 70, -25, 62));
new VText(scene, { text: 'G', x: -290, y: 228, z: 0, color: CYAN, scale: 0.46 });
new VText(scene, { text: 'kG 循环群（k = 2..18）', x: 0, y: 228, z: 0, color: GOLD, scale: 0.46 });
new VText(scene, { text: 'y² = x³ + 2x + 2 (mod 17)，G = (5, 1)，阶 n = 19 —— 从 G 出发反复「加自己」，18 步后回到 ∞，再一步回到 G', x: 0, y: 250, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: '点加法：λ = (y₂−y₁)/(x₂−x₁)，x₃ = λ²−x₁−x₂，y₃ = λ(x₁−x₃)−y₁ —— 除法 = 模逆元，全部在 mod 17 里做', x: 0, y: -235, z: 0, color: PALETTE.textDim, scale: 0.62 });
const stageT = new VText(scene, { text: '', x: 0, y: 230, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: 130, z: 0, color: PALETTE.textGlow, scale: 0.55 });
const outT = new VText(scene, { text: '', x: 0, y: -190, z: 0, color: PALETTE.textGlow, scale: 0.62 });

function setCell(obj, v, color) { obj.setText(String(v)); if (color) obj.setColor(color, color); }
function resetAll() {
  engine.clear();
  setCell(gBox, G, DIM);
  [...row1, ...row2, ...row3].forEach(b => setCell(b, '', DIM));
  stageT.setText(''); eqT.setText(''); outT.setText('');
}

function runECC() {
  resetAll();
  hint.setText('ECC 的主角：椭圆曲线上的点构成一个「加法群」—— 点与点相加仍是曲线上的点，且有循环结构');
  C(600, () => {
    gBox.setColor(CYAN, CYAN);
    stageT.setText('基点 G = (5, 1)（青）—— 验证 1² = 5³ + 2·5 + 2 = 137 ≡ 1 (mod 17) ✓');
    hint.setText('曲线 y²=x³+2x+2 在 mod 17 下有 19 个点（含 ∞）—— 素数个点，所以群是循环群');
  });
  C(800, () => {
    eqT.setText('倍点 2G = G + G：λ = (3x²+a)/(2y) = (3·25+2)/2 = 77/2 ≡ 9·9 = 13；x₃ = 13²−10 = 6；y₃ = 13(5−6)−1 = −14 ≡ 3', { color: CYAN });
    stageT.setText('2G = (6, 3)（金）—— 两个相同点相加用切线：斜率公式换成 (3x²+a)/(2y)');
  });
  C(800, () => {
    setCell(row1[0], MUL[0][0] + ' ' + MUL[0][1], GOLD);
    eqT.setText('加法 3G = 2G + G：λ = (3−1)/(6−5) = 2；x₃ = 4−5−6 = −7 ≡ 10；y₃ = 2(5−10)−1 = −11 ≡ 6', { color: GOLD });
    stageT.setText('3G = (10, 6) —— 两个不同点相加用连线：先横坐标 λ²，再减去两个 x');
    hint.setText('模逆元是关键运算：2⁻¹ mod 17 = 9（2×9=18≡1）—— 分数在模算术里都是整数');
  });
  C(800, () => {
    setCell(row1[1], MUL[1][0] + ' ' + MUL[1][1], GOLD);
    setCell(row1[2], MUL[2][0] + ' ' + MUL[2][1], GOLD);
    eqT.setText('4G = 3G + G = (3, 1)；5G = 4G + G = (9, 16) —— 逐次加 G，点开始「乱跳」', { color: GOLD });
    stageT.setText('kG 序列毫无规律可言：加一次 G，坐标像随机数一样翻腾 —— 这就是 ECC 安全的基石');
  });
  C(900, () => {
    row1.forEach((b, i) => { if (i > 2) setCell(b, MUL[i][0] + ' ' + MUL[i][1], GOLD); });
    eqT.setText('6G = (16, 13)、7G = (0, 6)…… 第一行 2G..7G 全部落定', { color: GOLD });
    stageT.setText('倍加算法：kG 用「倍点 + 加法」二进制分解，只需 O(log k) 次 —— 这就是 ECC 比 RSA 快的秘密');
  });
  C(900, () => {
    row2.forEach((b, i) => setCell(b, MUL[6 + i][0] + ' ' + MUL[6 + i][1], GOLD));
    eqT.setText('8G..13G：注意 7G = (0, 6) 与 12G = (0, 11) 互为 y 轴对称 —— x=0 上恰有两个点', { color: GOLD });
    stageT.setText('第二行落定 —— 点的 y 坐标成对出现 ±y（17−y），这是曲线的对称性');
  });
  C(900, () => {
    row3.forEach((b, i) => setCell(b, MUL[12 + i][0] + ' ' + MUL[12 + i][1], GOLD));
    eqT.setText('18G = (5, 16) —— 与 G = (5, 1) 只有 y 不同：y 坐标成对出现', { color: GOLD });
    stageT.setText('18G 落定 —— 数一数：G, 2G, …, 18G 共 18 个非零元 + ∞ = 19 = n');
  });
  C(1000, () => {
    eqT.setText('19G = ∞（无穷远点）：19 个点走完一个循环 —— n = 19 是群的阶，G 是生成元', { color: ROSE });
    stageT.setText('19G = ∞ —— 再进一步 20G = 1G，群是循环的！');
    hint.setText('密码学意义：已知 G 和 kG 求 k = 离散对数难题 —— 17 太小能穷举，真实曲线用 256 位（secp256k1），穷举不可能');
  });
  C(1000, () => {
    outT.setText('复杂度：点乘 O(log k) 次倍点/加法；应用：ECDSA 签名、ECDH 密钥交换、比特币 secp256k1、TLS 证书');
    status.textContent = 'ECC：y²=x³+2x+2 mod 17，G=(5,1) 阶 19 —— 2G=(6,3)，19G=∞ 完整循环演示';
    hint.setText('同尺寸密钥对比：ECC 256 位 ≈ RSA 3072 位 —— 更小的密钥、更快的握手，这就是为什么 ECC 赢下了互联网');
  });
}

panel.addButton('运行 ECC', runECC);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；青 = 基点 G，金 = kG 循环群，玫红 = 无穷远点 ∞）');

scene.start(engine);
