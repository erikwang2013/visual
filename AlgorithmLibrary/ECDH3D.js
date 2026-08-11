// AlgorithmLibrary/ECDH3D.js — ECDH 密钥交换：双方各藏一个私钥，公开交换公钥，各自算出同一个共享秘密 —— 中间人看不到它
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('ECDH3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, ROSE = 0xfb7185, CYAN = 0x67e8f9, VIOLET = 0xa78bfa, AMBER = 0xfbbf24;
const hint = new VText(scene, { text: '点击「运行 ECDH」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const box = (v, x, y, w = 92, color = DIM) => new VBox(scene, { w, h: 44, d: 44, x, y, z: 0, label: String(v), color, emissive: color });
const aPri = box('', -330, 175, 78);
const aPub = box('', -330, 45, 88);
const aShr = box('', -330, -95, 88);
const bPri = box('', 330, 175, 78);
const bPub = box('', 330, 45, 88);
const bShr = box('', 330, -95, 88);
const midBox = box('', 0, -95, 150);
new VText(scene, { text: '爱丽丝', x: -330, y: 230, z: 0, color: CYAN, scale: 0.5 });
new VText(scene, { text: '鲍勃', x: 330, y: 230, z: 0, color: AMBER, scale: 0.5 });
new VText(scene, { text: '私钥', x: -385, y: 175, z: 0, color: ROSE, scale: 0.42 });
new VText(scene, { text: '公钥', x: -385, y: 45, z: 0, color: VIOLET, scale: 0.42 });
new VText(scene, { text: '共享秘密', x: -385, y: -95, z: 0, color: GREEN, scale: 0.42 });
new VText(scene, { text: '曲线 y²=x³+2x+2 (mod 17)，G = (5,1)，n = 19 —— ECDH：双方不传秘密，却算出同一个秘密', x: 0, y: 250, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: '核心等式：aA·(aB·G) = aB·(aA·G) —— 交换律在椭圆曲线点乘上成立，所以共享秘密两边一致', x: 0, y: -235, z: 0, color: PALETTE.textDim, scale: 0.62 });
const stageT = new VText(scene, { text: '', x: 0, y: 230, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: 115, z: 0, color: PALETTE.textGlow, scale: 0.55 });
const outT = new VText(scene, { text: '', x: 0, y: -190, z: 0, color: PALETTE.textGlow, scale: 0.62 });

function setCell(obj, v, color) { obj.setText(String(v)); if (color) obj.setColor(color, color); }
function resetAll() {
  engine.clear();
  [aPri, aPub, aShr, bPri, bPub, bShr, midBox].forEach(b => setCell(b, '', DIM));
  stageT.setText(''); eqT.setText(''); outT.setText('');
}

function runECDH() {
  resetAll();
  hint.setText('问题：爱丽丝和鲍勃只能公开通信，怎样「当面」定下一个只有他俩知道的秘密？—— ECDH 用椭圆曲线回答');
  C(600, () => {
    setCell(aPri, 'aA = 2', ROSE);
    setCell(bPri, 'aB = 6', ROSE);
    stageT.setText('各自掷私钥：爱丽丝 aA = 2，鲍勃 aB = 6（玫红）—— 私钥永远不出门');
    hint.setText('公开参数（曲线、基点 G、阶 n）全世界共享 —— 私钥才是唯一的秘密，且只存在自己脑子里');
  });
  C(750, () => {
    setCell(aPub, '2G = (6, 3)', VIOLET);
    setCell(bPub, '6G = (16, 13)', VIOLET);
    eqT.setText('公钥 = 私钥 × G：A 公钥 2G = (6, 3)；B 公钥 6G = (16, 13)', { color: VIOLET });
    stageT.setText('公布公钥（紫）—— 从公钥反推私钥 = 离散对数难题，安全');
  });
  C(750, () => {
    eqT.setText('公开信道：交换公钥 —— 中间人可以看到 (6,3) 和 (16,13)，但无法反推 2 或 6', { color: PALETTE.textGlow });
    stageT.setText('交换公钥：爱丽丝把 (6,3) 发给鲍勃，鲍勃把 (16,13) 发给爱丽丝 —— 公钥随便被监听');
  });
  C(900, () => {
    setCell(aShr, 'aA·Bpub = 2·(16,13) = (0, 11)', GREEN);
    eqT.setText('爱丽丝算：aA × 鲍勃公钥 = 2·(16, 13) = 12G = (0, 11)', { color: GREEN });
    stageT.setText('爱丽丝侧：自己的私钥 × 对方的公钥（绿）—— 只在她本地计算');
  });
  C(900, () => {
    setCell(bShr, 'aB·Apub = 6·(6,3) = (0, 11)', GREEN);
    eqT.setText('鲍勃算：aB × 爱丽丝公钥 = 6·(6, 3) = 12G = (0, 11)', { color: GREEN });
    stageT.setText('鲍勃侧：6·(6, 3) 也等于 (0, 11) —— 两个结果完全相同！');
  });
  C(1000, () => {
    setCell(midBox, '共享秘密 = 12G = (0, 11)', GREEN);
    eqT.setText('aA·aB·G = aB·aA·G = 12G = (0, 11) —— 点乘的交换律让双方殊途同归', { color: GREEN });
    stageT.setText('共享秘密诞生：双方都得到 (0, 11)，中间人却算不出 —— 除非能解离散对数');
    hint.setText('这个点就是「密钥交换的果实」：通常取 x 坐标喂给 KDF（密钥派生函数），得到对称加密密钥');
  });
  C(1200, () => {
    outT.setText('复杂度：每方 1 次点乘 O(log n)；应用：TLS 1.3 的 ECDHE 握手、Signal 协议、比特币 HD 钱包派生');
    status.textContent = 'ECDH：aA=2, aB=6 → 交换公钥 (6,3)/(16,13) → 共享秘密 12G=(0,11)';
    hint.setText('家族：ECDH 是 DH 的椭圆曲线版 —— 同样的交换律数学，256 位曲线 ≈ 3072 位大素数，所以 TLS 全选了 ECDHE');
  });
}

panel.addButton('运行 ECDH', runECDH);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；青 = 爱丽丝，琥珀 = 鲍勃，玫红 = 私钥，紫 = 公钥，绿 = 共享秘密）');

scene.start(engine);
