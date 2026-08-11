// AlgorithmLibrary/Hamming3D.js — 汉明(7,4) 纠错码：校验位放 2 的幂位置，接收端算校正子 s = s1+2·s2+4·s4 定位并翻转出错位（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Hamming3D');

const scene = new Scene3D('scene', { cameraPos: [0, 330, 640], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「运行演示」开始：汉明(7,4) —— 4 数据位 + 3 校验位，纠 1 位错', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 262, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: 150, z: 0, color: PALETTE.textGlow, scale: 0.48 });
const outT = new VText(scene, { text: '', x: 0, y: -235, z: 0, color: PALETTE.textGlow, scale: 0.62 });

// 7 位码字：位置 1,2,4 = 校验位（青），3,5,6,7 = 数据位（蓝）
const BX = [-210, -140, -70, 0, 70, 140, 210];
const PARITY_IDX = [0, 1, 3];
const chips = BX.map((x, i) => new VBox(scene, { w: 54, h: 54, d: 54, x, y: 80, z: 0, label: '位' + (i + 1), color: PARITY_IDX.includes(i) ? CYAN : BLUE, emissive: PARITY_IDX.includes(i) ? CYAN : BLUE }));
new VText(scene, { text: '位置 1,2,4 = 校验位 p1,p2,p4（青）；3,5,6,7 = 数据位 d1,d2,d3,d4（蓝）', x: 0, y: 22, z: 0, color: PALETTE.textDim, scale: 0.4 });
const synChips = [-140, 0, 140].map((x, k) => new VBox(scene, { w: 54, h: 54, d: 54, x, y: -60, z: 0, label: 's' + [1, 2, 4][k] + '=?', color: DIM, emissive: DIM }));
new VText(scene, { text: '校正子 s1 s2 s4：接收端重算奇偶校验 —— 全 0 无错；非 0 时 s1+2s2+4s4 = 出错位号', x: 0, y: -125, z: 0, color: PALETTE.textDim, scale: 0.4 });

const bits = [null, null, null, null, null, null, null];

function* hammingGen() {
  yield S(() => { hint.setText('汉明(7,4)：4 个数据位 + 3 个校验位 = 7 位码字，能纠正 1 位错'); stageT.setText('数据 d = [1,0,1,1]（d1 d2 d3 d4）→ 填入位置 3,5,6,7'); });
  yield W(800);
  const d = [1, 0, 1, 1];
  const POSD = [2, 4, 5, 6];
  POSD.forEach((p, k) => { bits[p] = d[k]; chips[p].setText(String(d[k])); chips[p].setColor(WHITE, WHITE); });
  yield W(650);
  yield S(() => { stageT.setText('数据位就位：d1=1, d2=0, d3=1, d4=1 —— 现在补 3 个校验位'); eqT.setText('p1 覆盖位 {1,3,5,7}；p2 覆盖位 {2,3,6,7}；p4 覆盖位 {4,5,6,7} —— 每组 1 的个数为偶'); });
  yield W(750);
  const p1 = d[0] ^ d[1] ^ d[3];
  bits[0] = p1; chips[0].setText(String(p1)); chips[0].setColor(CYAN, CYAN);
  yield S(() => { stageT.setText('p1 = d1⊕d2⊕d4 = 1⊕0⊕1 = ' + p1 + '（看位 1,3,5,7）'); });
  yield W(700);
  const p2 = d[0] ^ d[2] ^ d[3];
  bits[1] = p2; chips[1].setText(String(p2)); chips[1].setColor(CYAN, CYAN);
  yield S(() => { stageT.setText('p2 = d1⊕d3⊕d4 = 1⊕1⊕1 = ' + p2 + '（看位 2,3,6,7）'); });
  yield W(700);
  const p4 = d[1] ^ d[2] ^ d[3];
  bits[3] = p4; chips[3].setText(String(p4)); chips[3].setColor(CYAN, CYAN);
  yield S(() => { stageT.setText('p4 = d2⊕d3⊕d4 = 0⊕1⊕1 = ' + p4 + '（看位 4,5,6,7）'); });
  yield W(700);
  yield S(() => { stageT.setText('码字完成：0 1 1 0 0 1 1 —— 任何 1 位翻转都会破坏 2~3 组奇偶校验'); eqT.setText('汉明距离 3：最多纠 1 位，或检 2 位错'); });
  yield W(900);
  bits[4] = 1; chips[4].setText('1'); chips[4].setColor(RED, RED);
  yield S(() => { stageT.setText('信道噪声：位 5 的 0 翻成 1 → 收到 0 1 1 0 1 1 1（红 = 出错位，信道对我们未知）'); eqT.setText('接收：0 1 1 0 1 1 1'); });
  yield W(900);
  const s1 = bits[0] ^ bits[2] ^ bits[4] ^ bits[6];
  const s2 = bits[1] ^ bits[2] ^ bits[5] ^ bits[6];
  const s4 = bits[3] ^ bits[4] ^ bits[5] ^ bits[6];
  yield S(() => {
    [s1, s2, s4].forEach((v, k) => { synChips[k].setText('s' + [1, 2, 4][k] + '=' + v); synChips[k].setColor(v ? RED : GREEN, v ? RED : GREEN); });
    stageT.setText('接收端重算三组校验：s1 = 1⊕1⊕1⊕1 = ' + s1 + '，s2 = 1⊕1⊕1⊕1 = ' + s2 + '，s4 = 0⊕1⊕1⊕1 = ' + s4);
    eqT.setText('校正子 s = s1 + 2·s2 + 4·s4 = ' + (s1 + 2 * s2 + 4 * s4) + ' → 出错位就是第 ' + (s1 + 2 * s2 + 4 * s4) + ' 位');
  });
  yield W(1100);
  const errPos = s1 + 2 * s2 + 4 * s4;
  const fixed = bits[errPos - 1] ^ 1;
  chips[errPos - 1].setText(String(fixed));
  chips[errPos - 1].setColor(GREEN, GREEN);
  yield S(() => { stageT.setText('翻转第 ' + errPos + ' 位：' + bits[errPos - 1] + ' → ' + fixed + ' —— 恢复 0 1 1 0 0 1 1'); });
  yield W(900);
  yield S(() => { outT.setText('解码数据 d = [1,0,1,1] —— 纠错完成：1 位翻转被定位并修复'); status.textContent = '汉明(7,4)：纠 1 位错'; hint.setText('原理：校验位放在 2 的幂位置，每组奇偶校验覆盖不同位置集 → 校正子二进制 = 出错位号。能纠 1 位 / 检 2 位'); });
  yield W(1100);
  yield S(() => { hint.setText('扩展汉明码（+1 总奇偶位）可纠 1 检 2；应用：ECC 内存 SEC-DED、老式 Modem、闪存控制器'); outT.setText('编码 O(n)：每组校验一遍；译码 O(1)：一组异或网络'); });
  yield W(1100);
  yield S(() => { hint.setText('汉明码演示完成：4 数据位 + 3 校验位 → 纠 1 位错'); outT.setText(''); });
  yield W(400);
}

function* runHamming() {
  hint.setText('汉明(7,4)：纠 1 位错');
  yield W(400);
  yield* hammingGen();
}

panel.addButton('运行演示', () => engine.start(runHamming()));
panel.addButton('清空', () => {
  engine.clear();
  for (let i = 0; i < 7; i++) { bits[i] = null; chips[i].setText('位' + (i + 1)); chips[i].setColor(PARITY_IDX.includes(i) ? CYAN : BLUE, PARITY_IDX.includes(i) ? CYAN : BLUE); }
  synChips.forEach((c, k) => { c.setText('s' + [1, 2, 4][k] + '=?'); c.setColor(DIM, DIM); });
  stageT.setText(''); eqT.setText(''); outT.setText('');
  hint.setText('已清空，可重新运行'); status.textContent = '';
});
panel.addLabel('（拖拽旋转视角，滚轮缩放；上排 7 块 = 码字位，青 = 校验位、蓝 = 数据位；下排 = 校正子 s1,s2,s4，绿 = 通过、红 = 失败；红色位翻转后按校正子定位修复）');

scene.start(engine);
