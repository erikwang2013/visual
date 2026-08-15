// AlgorithmLibrary/LDPC3D.js — LDPC 低密度奇偶校验：稀疏校验矩阵 H 定义码字 H·c=0（模 2），Tanner 图逐边画入；单点错误使覆盖它的全部校验同时失败，翻转即修复（function* 生成器驱动，解说入状态栏）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VBox, tubeBetween } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
applyTheme('LDPC3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GREEN = 0x4ade80, RED = 0xfb7185, CYAN = 0x22d3ee, WHITE = 0xffffff, DIM = 0x334155;
const status = panel.addStatus('就绪');

// Tanner 图：上排 4 变量节点（码字位），下排 3 校验节点（方程）
const VN_Y = 560, CK_Y = 360;
const VX = [-270, -90, 90, 270].map(v => v + 320);
const varNodes = VX.map((x, i) => new VNode(scene, { x, y: VN_Y, z: 0, radius: 34, label: 'v' + i + '=?', color: BLUE, emissive: BLUE }));
const CX = [-180, 0, 180].map(v => v + 320);
const checkBoxes = CX.map((x, i) => new VBox(scene, { w: 100, h: 56, d: 56, x, y: CK_Y, z: 0, label: 'c' + i + '=?', color: DIM, emissive: DIM }));

const H = [[1, 1, 1, 0], [1, 0, 1, 1], [0, 1, 1, 1]];
// 9 条校验边模块级预建，运行期仅显隐
const edges = new Map();
const P = (x, y) => ({ x, y, z: 0 });
for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) {
  if (!H[i][j]) continue;
  const t = tubeBetween(scene, P(VX[j], VN_Y), P(CX[i], CK_Y), { color: CYAN, opacity: 0.7, radius: 2.5 });
  t.visible = false;
  edges.set(i + '_' + j, t);
}

function* ldpcGen() {
  yield S(() => { status.textContent = 'LDPC：4 位码字 + 3 个校验方程（模 2，每行 XOR=0）；「低密度」= H 中 1 很稀（3×4 共 9 个）'; });
  yield W(900);
  const nbrNames = ['v0 v1 v2', 'v0 v2 v3', 'v1 v2 v3'];
  for (let i = 0; i < 3; i++) {
    H[i].forEach((h, j) => { if (h) edges.get(i + '_' + j).visible = true; });
    yield S(() => { status.textContent = '校验 c' + i + ' 覆盖 {' + nbrNames[i] + '}：XOR = 0（模 2），画入 ' + H[i].filter(Boolean).length + ' 条边'; });
    yield W(850);
  }
  yield S(() => { status.textContent = 'Tanner 图完成：9 条边 = H 中 9 个 1；装入码字 [1,1,0,1]'; });
  yield W(800);
  const bits = [0, 0, 0, 0];
  const DATA = [1, 1, 0, 1];
  for (let i = 0; i < 4; i++) {
    bits[i] = DATA[i];
    varNodes[i].setText('v' + i + '=' + DATA[i]);
    varNodes[i].setColor(WHITE, WHITE);
    yield S(() => { status.textContent = '装入 v' + i + ' = ' + DATA[i]; });
    yield W(380);
  }
  const check = i => { let s = 0; H[i].forEach((h, j) => { if (h) s ^= bits[j]; }); return s; };
  for (let i = 0; i < 3; i++) {
    const v = check(i);
    checkBoxes[i].setText('c' + i + '=' + v);
    checkBoxes[i].setColor(v ? RED : GREEN, v ? RED : GREEN);
  }
  yield S(() => { status.textContent = '校验：c0=c1=c2=0 —— 码字合法（H·c = (0,0,0) ✓）'; });
  yield W(900);
  bits[2] = 1;
  varNodes[2].setText('v2=1');
  varNodes[2].setColor(RED, RED);
  yield S(() => { status.textContent = '信道噪声：v2 翻成 1 → 收到 [1,1,1,1]（红 = 出错位）'; });
  yield W(850);
  for (let i = 0; i < 3; i++) {
    const v = check(i);
    checkBoxes[i].setText('c' + i + '=' + v);
    checkBoxes[i].setColor(v ? RED : GREEN, v ? RED : GREEN);
  }
  yield S(() => { status.textContent = '重算校验：c0=c1=c2=1 —— 三方程全失败 ✗（错误位被全部覆盖）'; });
  yield W(800);
  yield S(() => { status.textContent = '错误位 = 三个失败方程的交集 → 唯一候选 v2'; });
  yield W(900);
  bits[2] = 0;
  varNodes[2].setText('v2=0');
  varNodes[2].setColor(GREEN, GREEN);
  yield S(() => { status.textContent = '翻转 v2：1 → 0，码字恢复 [1,1,0,1]'; });
  yield W(700);
  for (let i = 0; i < 3; i++) {
    checkBoxes[i].setText('c' + i + '=0');
    checkBoxes[i].setColor(GREEN, GREEN);
  }
  yield S(() => { status.textContent = '校验全绿：c0=c1=c2=0 —— 纠错完成 ✓'; });
  yield W(900);
  yield S(() => { status.textContent = '真实 LDPC：码长上千、H 每行仅数十个 1，解码用置信传播迭代修正 —— 5G/WiFi/DVB 在用'; });
  yield W(900);
  yield S(() => { status.textContent = 'LDPC 演示完成：H 为 3×4 稀疏矩阵（9 个 1）、Tanner 图 9 边；装入 [1,1,0,1] 后 v2 出错，三校验全失败，交集定位 v2 并翻转修复'; });
  yield W(800);
}

function* runLDPC() {
  yield S(() => { status.textContent = 'LDPC：稀疏校验纠错演示（自动开始）'; });
  yield W(400);
  yield* ldpcGen();
}

engine.queue(() => runLDPC());
panel.addButton('清空', () => {
  engine.clear();
  edges.forEach(t => { t.visible = false; });
  varNodes.forEach((n, i) => { n.setText('v' + i + '=?'); n.setColor(BLUE, BLUE); });
  checkBoxes.forEach((c, i) => { c.setText('c' + i + '=?'); c.setColor(DIM, DIM); });
  status.textContent = '';
});

scene.start(engine);
