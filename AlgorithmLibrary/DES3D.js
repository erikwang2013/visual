// AlgorithmLibrary/DES3D.js — DES 加密：16 轮 Feistel 网络（教学简化版）
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('DES3D');

const scene = new Scene3D('scene', { cameraPos: [0, 380, 700], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const YELLOW = 0xfacc15, BLUE = 0x60a5fa, GREEN = 0x4ade80, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「运行加密」开始', x: 0, y: 320, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const INPUT = '0123456789ABCDEF';           // 64 位明文 = 16 个十六进制字符
const L0 = INPUT.slice(0, 8), R0 = INPUT.slice(8);
const subkeys = [];                          // 由 64 位主密钥循环左移生成 16 个 32 位子密钥
{
  const master = BigInt('0x133457799BBCDFF1');
  for (let i = 0; i < 16; i++) {
    const k = (master >> BigInt(64 - 2 * i)) | (master << BigInt(2 * i));
    subkeys.push(((k & BigInt('0xFFFFFFFFFFFFFFFF')) >> BigInt(32)).toString(16).padStart(8, '0'));
  }
}
const F = (r, k) => {
  const x = parseInt(r, 16), y = parseInt(k, 16);
  return (((x << 5) | (x >>> 27)) ^ y) >>> 0;   // 轮函数：循环左移 5 位再异或子密钥
};
const hex8 = v => (v >>> 0).toString(16).padStart(8, '0');

const lBox = new VBox(scene, { w: 240, h: 74, d: 44, x: -150, y: 180, z: 0, label: L0, color: PALETTE.node, emissive: PALETTE.nodeEmissive });
const rBox = new VBox(scene, { w: 240, h: 74, d: 44, x: 150, y: 180, z: 0, label: R0, color: PALETTE.node, emissive: PALETTE.nodeEmissive });
new VText(scene, { text: 'L₀（左 32 位）', x: -150, y: 240, z: 0, color: PALETTE.textDim, scale: 0.7 });
new VText(scene, { text: 'R₀（右 32 位）', x: 150, y: 240, z: 0, color: PALETTE.textDim, scale: 0.7 });
new VText(scene, { text: '明文 ' + INPUT, x: 0, y: 290, z: 0, color: PALETTE.textDim, scale: 0.8 });
const outText = new VText(scene, { text: '', x: 0, y: 20, z: 0, color: PALETTE.textGlow, scale: 0.9 });
const keyText = new VText(scene, { text: '', x: 0, y: 90, z: 0, color: PALETTE.textDim, scale: 0.75 });

function resetAll() {
  engine.clear();
  lBox.setColor(PALETTE.node, PALETTE.nodeEmissive);
  rBox.setColor(PALETTE.node, PALETTE.nodeEmissive);
  lBox.setText(L0);
  rBox.setText(R0);
  lBox.moveTo(-150, 180, 0, 1);
  rBox.moveTo(150, 180, 0, 1);
  outText.setText('');
  keyText.setText('');
}

function runEncrypt() {
  resetAll();
  hint.setText('DES：初始置换 IP 后进入 16 轮 Feistel，每轮 L = R，R = L ⊕ F(R, Kᵢ)');
  let L = L0, R = R0;
  for (let i = 1; i <= 16; i++) {
    const Li = R;
    const Ri = hex8(parseInt(L, 16) ^ F(R, subkeys[i - 1]));
    const round = i;
    C(120, () => { lBox.setColor(YELLOW, YELLOW); rBox.setColor(YELLOW, YELLOW); });
    hint.setText('第 ' + round + ' 轮：R\' = L ⊕ F(R, K' + round + ')，K' + round + ' = ' + subkeys[round - 1]);
    keyText.setText('子密钥 K' + round + '：' + subkeys[round - 1]);
    C(850, () => {
      lBox.moveTo(150, 180, 0, 380);
      rBox.moveTo(-150, 180, 0, 380);
    });
    C(450, () => {
      lBox.setText(Li);
      rBox.setText(Ri);
      lBox.setColor(PALETTE.node, PALETTE.nodeEmissive);
      rBox.setColor(PALETTE.node, PALETTE.nodeEmissive);
    });
    C(300, () => {
      lBox.moveTo(-150, 180, 0, 380);
      rBox.moveTo(150, 180, 0, 380);
    });
    if (round === 16) {
      C(450, () => {
        const cipher = R + L;
        outText.setText('密文（FP 逆置换）：' + cipher);
        status.textContent = '加密完成：' + INPUT + ' → ' + cipher;
        hint.setText('16 轮结束，左右合并后经逆置换 FP 得到密文');
      });
    }
    L = Li; R = Ri;
  }
}

panel.addButton('运行加密', runEncrypt);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（教学简化版：轮函数以 32 位循环移位 + 异或模拟 S 盒置换）');

scene.start(engine);
