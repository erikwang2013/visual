// AlgorithmLibrary/LDPC3D.js — LDPC (7,4)：校验矩阵 + 置信传播（简化）
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('LDPC3D');

const scene = new Scene3D('scene', { cameraPos: [0, 330, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, ROSE = 0xfb7185, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「运行编码」开始', x: 0, y: 255, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const H = [[1, 1, 1, 0, 1, 0, 0], [1, 0, 0, 1, 0, 1, 0], [0, 1, 0, 1, 0, 0, 1]];
const ROW_LABEL = ['C1', 'C2', 'C3'];
const SP = 52, X0 = -156;
const grid = [];
for (let r = 0; r < 3; r++) {
  const row = [];
  for (let j = 0; j < 7; j++) {
    const box = new VBox(scene, { w: 44, h: 38, d: 38, x: X0 + j * SP, y: 215 - 60 * r, z: 0, label: H[r][j] ? '1' : '·', color: H[r][j] ? DIM : 0x1e293b, emissive: 0 });
    row.push(box);
  }
  grid.push(row);
  new VText(scene, { text: ROW_LABEL[r], x: -250, y: 215 - 60 * r, z: 0, color: PALETTE.textDim, scale: 0.55 });
}
new VText(scene, { text: '校验矩阵 H（3×7，每行一个奇偶校验方程）', x: 0, y: 265, z: 0, color: PALETTE.textDim, scale: 0.7 });

const CW = [1, 0, 1, 1, 0, 0, 1];
const RCV = [...CW]; RCV[2] ^= 1;
const BIT_LABEL = ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7'];
const cwBoxes = [];
for (let i = 0; i < 7; i++) {
  cwBoxes.push(new VBox(scene, { w: 52, h: 52, d: 52, x: X0 + i * SP, y: -10, z: 0, label: '', color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
  new VText(scene, { text: BIT_LABEL[i], x: X0 + i * SP, y: -48, z: 0, color: PALETTE.textDim, scale: 0.5 });
}
new VText(scene, { text: '码字（4 数据 + 3 校验）', x: -300, y: 25, z: 0, color: PALETTE.textDim, scale: 0.6 });
const stepT = new VText(scene, { text: '', x: 0, y: -95, z: 0, color: PALETTE.textGlow, scale: 0.75 });
const synT = new VText(scene, { text: '', x: 0, y: -155, z: 0, color: PALETTE.textDim, scale: 0.7 });

const synd = r => H.map(row => row.reduce((a, v, j) => a ^ (v & r[j]), 0));
const S = synd(RCV);
const CAND = [0, 1, 2, 4];

function resetAll() {
  engine.clear();
  for (const row of grid) for (const b of row) { b.setColor(b.label === '1' ? DIM : 0x1e293b, 0); }
  for (const b of cwBoxes) { b.setColor(PALETTE.node, PALETTE.nodeEmissive); b.setText(''); }
  stepT.setText('');
  synT.setText('');
}

function runEncode() {
  resetAll();
  hint.setText('LDPC：稀疏校验矩阵 H，码字满足 H·c = 0（每行一个偶校验方程）');
  C(300, () => {
    for (const row of grid) for (const b of row) if (b.label === '1') b.setColor(BLUE, BLUE);
    stepT.setText('C1: b1⊕b2⊕b3⊕b5=0   C2: b1⊕b4⊕b6=0   C3: b2⊕b4⊕b7=0');
  });
  C(900, () => {
    for (const row of grid) for (const b of row) if (b.label === '1') b.setColor(DIM, 0);
    for (const [i, v] of [[0, 1], [1, 0], [2, 1], [3, 1]]) { cwBoxes[i].setColor(BLUE, BLUE); cwBoxes[i].setText(String(v)); }
    stepT.setText('写入数据位 1 0 1 1 → 由校验方程求解校验位');
  });
  C(1000, () => {
    for (const j of [4, 5]) { cwBoxes[j].setColor(YELLOW, YELLOW); cwBoxes[j].setText('0'); }
    stepT.setText('C1: 1⊕0⊕1⊕b5=0 → b5=0    C2: 1⊕1⊕b6=0 → b6=0');
    hint.setText('校验位由 H 各行方程解出：C1 行 1⊕0⊕1⊕0 = 0 ✓');
  });
  C(800, () => {
    cwBoxes[6].setColor(YELLOW, YELLOW); cwBoxes[6].setText('1');
    stepT.setText('C3: 0⊕1⊕b7=0 → b7=1  码字 1011001');
  });
  C(700, () => {
    for (let i = 0; i < 7; i++) cwBoxes[i].setColor(GREEN, GREEN);
    stepT.setText('码字完成：1011001（每行 1 的个数为偶数）发送到信道');
    hint.setText('传输：信道噪声翻转了位 3（1 → 0）…');
  });
  C(1000, () => {
    cwBoxes[2].setColor(ROSE, ROSE); cwBoxes[2].setText('0');
    stepT.setText('接收码字 1001001 → 重算三行校验方程（综合征）');
  });
  C(900, () => {
    const bad = [0, 1];
    for (const j of bad) grid[0][j].setColor(ROSE, ROSE);
    for (const j of [2, 4]) grid[0][j].setColor(BLUE, BLUE);
    stepT.setText('C1: 1⊕0⊕0⊕0 = 1 ✗（校验失败）');
    synT.setText('');
  });
  C(800, () => {
    for (let j = 0; j < 7; j++) grid[0][j].setColor(grid[0][j].label === '1' ? DIM : 0x1e293b, 0);
    for (const j of [0, 3, 5]) grid[1][j].setColor(BLUE, BLUE);
    stepT.setText('C2: 1⊕1⊕0 = 0 ✓');
  });
  C(800, () => {
    for (let j = 0; j < 7; j++) grid[1][j].setColor(grid[1][j].label === '1' ? DIM : 0x1e293b, 0);
    for (const j of [1, 3, 6]) grid[2][j].setColor(BLUE, BLUE);
    stepT.setText('C3: 0⊕1⊕1 = 0 ✓');
  });
  C(800, () => {
    for (let j = 0; j < 7; j++) grid[2][j].setColor(grid[2][j].label === '1' ? DIM : 0x1e293b, 0);
    synT.setText('综合征 = [1, 0, 0]：只有 C1 失败 → 错位必在 C1 独有行覆盖、C2/C3 不含的位');
    hint.setText('LDPC 纠错：把出错候选位逐位翻转验证（简化展示；真实 LDPC 用置信传播迭代）');
    tryBit(0);
  });

  function tryBit(k) {
    if (k >= CAND.length) { C(300, () => {}); return; }
    const j = CAND[k];
    const trial = [...RCV]; trial[j] ^= 1;
    const ok = synd(trial).every(v => v === 0);
    C(150, () => { cwBoxes[j].setColor(YELLOW, YELLOW); stepT.setText('试错：翻转位 ' + (j + 1) + '（' + BIT_LABEL[j] + '）…'); });
    C(650, () => {
      if (ok) {
        cwBoxes[j].setColor(GREEN, GREEN); cwBoxes[j].setText('1');
        synT.setText('翻转位 3 后综合征全零 → 纠错成功！码字还原 1011001');
        stepT.setText('码字还原 1011001 ✓  消息恢复 1011');
        status.textContent = 'LDPC 完成：翻转位 3 → 综合征 [1,0,0] → 试错纠正位 3';
        hint.setText('LDPC 可接近香农极限，5G/WiFi/卫星通信/SSD 纠错都在用（信噪比极低也能通信）');
      } else {
        cwBoxes[j].setColor(ROSE, ROSE);
        synT.setText('翻转位 ' + (j + 1) + ' 后综合征仍非零 → 该位无误，继续试错…');
        C(500, () => { cwBoxes[j].setColor(PALETTE.node, PALETTE.nodeEmissive); cwBoxes[j].setText(''); tryBit(k + 1); });
      }
    });
  }
}

panel.addButton('运行编码', runEncode);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；LDPC 校验矩阵稀疏，可迭代译码逼近香农极限）');

scene.start(engine);
