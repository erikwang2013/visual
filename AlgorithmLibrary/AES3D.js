// AlgorithmLibrary/AES3D.js — AES 加密：状态矩阵一轮完整演示（真实 S 盒 / ShiftRows / MixColumns）
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('AES3D');

const scene = new Scene3D('scene', { cameraPos: [0, 380, 700], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const YELLOW = 0xfacc15, GREEN = 0x4ade80, ORANGE = 0xfb923c, BLUE = 0x60a5fa;
const hint = new VText(scene, { text: '点击「运行一轮」开始', x: 0, y: 330, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

// ---- 真实 AES 原语 ----
const SBOX = [0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76];
const xtime = a => ((a << 1) ^ (a & 0x80 ? 0x1b : 0)) & 0xff;
const gfMul = (a, b) => {
  let r = 0;
  while (b) { if (b & 1) r ^= a; a = xtime(a); b >>= 1; }
  return r & 0xff;
};
// 输入字节 00..0F 按列填入状态矩阵；轮密钥 2b7e151628aed2a6abf7158809cf4f3c
const input = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const rkey = [0x2b, 0x7e, 0x15, 0x16, 0x28, 0xae, 0xd2, 0xa6, 0xab, 0xf7, 0x15, 0x88, 0x09, 0xcf, 0x4f, 0x3c];
const hex2 = v => v.toString(16).padStart(2, '0').toUpperCase();

// ---- 4×4 状态网格（行 0 在上） ----
const val = Array.from({ length: 4 }, () => Array(4).fill(0));
const box = Array.from({ length: 4 }, () => Array(4).fill(null));
const px = c => -99 + c * 66, py = r => 216 - r * 78;
for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
  val[r][c] = input[c * 4 + r];
  box[r][c] = new VBox(scene, { w: 56, h: 56, d: 56, x: px(c), y: py(r), z: 0, label: hex2(val[r][c]), color: PALETTE.node, emissive: PALETTE.nodeEmissive });
}
for (let r = 0; r < 4; r++) new VText(scene, { text: '行 ' + r, x: -170, y: py(r), z: 0, color: PALETTE.textDim, scale: 0.65 });
for (let c = 0; c < 4; c++) new VText(scene, { text: '列 ' + c, x: px(c), y: 270, z: 0, color: PALETTE.textDim, scale: 0.65 });
new VText(scene, { text: '输入 000102...0F（列主序填充）', x: 0, y: 300, z: 0, color: PALETTE.textDim, scale: 0.7 });
const outText = new VText(scene, { text: '', x: 0, y: -110, z: 0, color: PALETTE.textGlow, scale: 0.85 });

function resetAll() {
  engine.clear();
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    val[r][c] = input[c * 4 + r];
    box[r][c].setColor(PALETTE.node, PALETTE.nodeEmissive);
    box[r][c].setText(hex2(val[r][c]));
    box[r][c].moveTo(px(c), py(r), 0, 1);
  }
  outText.setText('');
}

function runRound() {
  resetAll();
  hint.setText('AES 第 1 轮：AddRoundKey → SubBytes → ShiftRows → MixColumns（完整加密共 10 轮）');
  // 1. AddRoundKey：逐列异或轮密钥
  for (let c = 0; c < 4; c++) {
    const col = c;
    C(120, () => { for (let r = 0; r < 4; r++) box[r][col].setColor(YELLOW, YELLOW); });
    hint.setText('AddRoundKey：状态列 ' + col + ' 与轮密钥异或');
    C(550, () => {
      for (let r = 0; r < 4; r++) {
        val[r][col] ^= rkey[col * 4 + r];
        box[r][col].setText(hex2(val[r][col]));
        box[r][col].setColor(PALETTE.node, PALETTE.nodeEmissive);
      }
    });
  }
  // 2. SubBytes：逐字节查 S 盒
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    const rr = r, cc = c;
    C(120, () => box[rr][cc].setColor(GREEN, GREEN));
    hint.setText('SubBytes：' + hex2(val[rr][cc]) + ' 查 S 盒 → ' + hex2(SBOX[val[rr][cc]]));
    C(300, () => {
      val[rr][cc] = SBOX[val[rr][cc]];
      box[rr][cc].setText(hex2(val[rr][cc]));
      box[rr][cc].setColor(PALETTE.node, PALETTE.nodeEmissive);
    });
  }
  // 3. ShiftRows：第 r 行循环左移 r 格
  for (let r = 1; r < 4; r++) {
    const row = r;
    C(120, () => { for (let c = 0; c < 4; c++) box[row][c].setColor(ORANGE, ORANGE); });
    hint.setText('ShiftRows：第 ' + row + ' 行循环左移 ' + row + ' 格');
    C(600, () => {
      for (let c = 0; c < 4; c++) box[row][c].moveTo(px((c - row + 4) % 4), py(row), 0, 420);
    });
    C(520, () => {
      const old = val[row].slice();
      for (let c = 0; c < 4; c++) val[row][(c - row + 4) % 4] = old[c];
      for (let c = 0; c < 4; c++) {
        box[row][c].setText(hex2(val[row][c]));
        box[row][c].setColor(PALETTE.node, PALETTE.nodeEmissive);
      }
    });
  }
  // 4. MixColumns：每列做 GF(2⁸) 矩阵乘法
  for (let c = 0; c < 4; c++) {
    const col = c;
    C(120, () => { for (let r = 0; r < 4; r++) box[r][col].setColor(BLUE, BLUE); });
    hint.setText('MixColumns：列 ' + col + ' 在 GF(2⁸) 上做矩阵乘法');
    C(650, () => {
      const b = [val[0][col], val[1][col], val[2][col], val[3][col]];
      val[0][col] = gfMul(2, b[0]) ^ gfMul(3, b[1]) ^ b[2] ^ b[3];
      val[1][col] = b[0] ^ gfMul(2, b[1]) ^ gfMul(3, b[2]) ^ b[3];
      val[2][col] = b[0] ^ b[1] ^ gfMul(2, b[2]) ^ gfMul(3, b[3]);
      val[3][col] = gfMul(3, b[0]) ^ b[1] ^ b[2] ^ gfMul(2, b[3]);
      for (let r = 0; r < 4; r++) {
        box[r][col].setText(hex2(val[r][col]));
        box[r][col].setColor(PALETTE.node, PALETTE.nodeEmissive);
      }
    });
  }
  C(300, () => {
    outText.setText('一轮结束：' + [].concat(...val).map(hex2).join(''));
    status.textContent = '演示完成：完整 AES-128 重复上述 4 步共 10 轮（最后一轮省去 MixColumns）后输出密文';
    hint.setText('每轮输出的 16 字节进入下一轮；最后一轮无 MixColumns');
  });
}

panel.addButton('运行一轮', runRound);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；S 盒与列混合为真实 AES 运算）');

scene.start(engine);
