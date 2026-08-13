// AlgorithmLibrary/LDPC3D.js — LDPC 低密度奇偶校验：稀疏校验矩阵 H 定义码字 H·c=0（模 2），Tanner 图逐边画入；单点错误使覆盖它的全部校验同时失败，翻转即修复（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('LDPC3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：LDPC —— 稀疏校验矩阵 + Tanner 图纠错', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 700, y: 440, z: 0, color: GOLD, scale: 0.5, wrapChars: 8 });
const eqT = new VText(scene, { text: '', x: 700, y: 345, z: 0, color: PALETTE.textGlow, scale: 0.45, wrapChars: 8 });
const outT = new VText(scene, { text: '', x: 700, y: 345, z: 0, color: PALETTE.textGlow, scale: 0.45, wrapChars: 8 });

// Tanner 图：上排 4 变量节点（码字位），下排 3 校验节点（方程）
const VX = [-270, -90, 90, 270].map(v => v + 320);
const varNodes = VX.map((x, i) => new VNode(scene, { x, y: 400, z: 0, radius: 34, label: 'v' + i + '=?', color: BLUE, emissive: BLUE }));
const CX = [-180, 0, 180].map(v => v + 320);
const checkBoxes = CX.map((x, i) => new VBox(scene, { w: 100, h: 56, d: 56, x, y: 250, z: 0, label: 'c' + i + '=?', color: DIM, emissive: DIM }));
new VText(scene, { text: '校验矩阵 H：3×4 稀疏，每行 3 个 1；合法码字每行 XOR = 0', x: 700, y: 490, z: 0, color: PALETTE.textDim, scale: 0.4, wrapChars: 10 });

const H = [[1, 1, 1, 0], [1, 0, 1, 1], [0, 1, 1, 1]];
const edges = new Map();
const P = (x, y) => ({ x, y, z: 0 });
function addEdge(key, a, b, color, radius) { edges.set(key, tubeBetween(scene, P(a[0], a[1]), P(b[0], b[1]), { color, opacity: 0.7, radius })); }
function clearEdges() { edges.forEach(m => scene.remove(m)); edges.clear(); }

function* ldpcGen() {
  yield S(() => { hint.setText('LDPC：稀疏校验矩阵定义码字，噪声后靠方程把错找回来'); stageT.setText('4 位码字 + 3 个校验方程；「低密度」= 矩阵里 1 很稀'); });
  yield W(900);
  const nbrNames = ['v0 v1 v2', 'v0 v2 v3', 'v1 v2 v3'];
  for (let i = 0; i < 3; i++) {
    H[i].forEach((h, j) => { if (h) addEdge('e' + i + '_' + j, [VX[j], 400], [CX[i], 250], CYAN, 2.5); });
    yield S(() => { stageT.setText('校验 c' + i + ' 覆盖 {' + nbrNames[i] + '}：XOR = 0（模 2）'); });
    yield W(850);
  }
  yield S(() => { stageT.setText('Tanner 图完成：9 边 = H 中 9 个 1，装入 [1,1,0,1]'); eqT.setText('c0: v0⊕v1⊕v2 = 0；c1: v0⊕v2⊕v3 = 0；c2: v1⊕v2⊕v3 = 0'); });
  yield W(900);
  const bits = [null, null, null, null];
  const DATA = [1, 1, 0, 1];
  for (let i = 0; i < 4; i++) {
    bits[i] = DATA[i];
    varNodes[i].setText('v' + i + '=' + DATA[i]);
    varNodes[i].setColor(WHITE, WHITE);
    yield W(350);
  }
  const check = i => { let s = 0; H[i].forEach((h, j) => { if (h) s ^= bits[j]; }); return s; };
  for (let i = 0; i < 3; i++) {
    const v = check(i);
    checkBoxes[i].setText('c' + i + '=' + v);
    checkBoxes[i].setColor(v ? RED : GREEN, v ? RED : GREEN);
  }
  yield S(() => { stageT.setText('校验：三方程全 0 ✓ —— 码字合法'); eqT.setText('H·c = (0,0,0) —— 通过'); });
  yield W(900);
  bits[2] = 1;
  varNodes[2].setText('v2=1');
  varNodes[2].setColor(RED, RED);
  yield S(() => { stageT.setText('信道噪声：v2 翻成 1 → 收到 [1,1,1,1]（红 = 出错）'); });
  yield W(850);
  for (let i = 0; i < 3; i++) {
    const v = check(i);
    checkBoxes[i].setText('c' + i + '=' + v);
    checkBoxes[i].setColor(v ? RED : GREEN, v ? RED : GREEN);
  }
  yield S(() => { stageT.setText('重算校验：三方程全 1 ✗ —— 全被破坏！'); eqT.setText('全失败 ⟹ 错误位 = 三行交集 → v2'); });
  yield W(1100);
  bits[2] = 0;
  varNodes[2].setText('v2=0');
  varNodes[2].setColor(GREEN, GREEN);
  yield S(() => { stageT.setText('翻转 v2：1 → 0，码字恢复 [1,1,0,1]'); });
  yield W(800);
  for (let i = 0; i < 3; i++) {
    const v = check(i);
    checkBoxes[i].setText('c' + i + '=' + v);
    checkBoxes[i].setColor(GREEN, GREEN);
  }
  yield S(() => { stageT.setText('校验全绿：c0=c1=c2=0 —— 纠错完成'); });
  yield W(850);
  yield S(() => { eqT.setText(''); outT.setText('纠错完成：错误位被失败方程交集唯一确定 —— 解码用置信传播'); status.textContent = 'LDPC：纠 1 位错'; hint.setText('真实 LDPC：码长上千，信念传播迭代修正 —— 5G/WiFi/DVB 在用'); });
  yield W(1100);
  yield S(() => { hint.setText('toy 码率 1/4，实用 0.5~0.9；与 Turbo 并称纠错双雄'); outT.setText('复杂度：每轮消息传递 O(E)，E = H 中 1 的个数'); });
  yield W(1100);
  yield S(() => { hint.setText('LDPC 完成：稀疏校验 + Tanner 图 + 校验定位'); outT.setText(''); });
  yield W(400);
}

function* runLDPC() {
  hint.setText('LDPC：稀疏校验纠错');
  yield W(400);
  yield* ldpcGen();
}

engine.queue(() => runLDPC());
panel.addButton('清空', () => {
  engine.clear(); clearEdges();
  varNodes.forEach((n, i) => { n.setText('v' + i + '=?'); n.setColor(BLUE, BLUE); });
  checkBoxes.forEach((c, i) => { c.setText('c' + i + '=?'); c.setColor(DIM, DIM); });
  stageT.setText(''); eqT.setText(''); outT.setText('');
  hint.setText('已清空，可重新运行'); status.textContent = '';
});
panel.addLabel('（拖拽旋转视角，滚轮缩放；上排圆球 = 码字位 v0~v3，下排方框 = 校验方程 c0~c2；青边 = 方程覆盖关系，绿 = 校验通过、红 = 校验失败；错误位翻红后由全部失败方程交集定位）');

scene.start(engine);
