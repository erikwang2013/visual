// AlgorithmLibrary/Strassen3D.js — Strassen 矩阵乘法：7 个乘法代替 8 个 —— 用加法换乘法，递归地把 O(n³) 压到 O(n^2.807)（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Strassen3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155, ROSE = 0xfb7185, VIOLET = 0xa78bfa, AMBER = 0xfbbf24;
const hint = new VText(scene, { text: '点击「运行演示」开始：Strassen 矩阵乘法 A×B', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 255, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: 110, z: 0, color: PALETTE.textGlow, scale: 0.58 });
const outT = new VText(scene, { text: '', x: 0, y: -245, z: 0, color: PALETTE.textGlow, scale: 0.62 });

const MA = [[1, 2], [3, 4]];
const B = [[5, 6], [7, 8]];

function strassenData(A, B) {
  const a11 = A[0][0], a12 = A[0][1], a21 = A[1][0], a22 = A[1][1];
  const b11 = B[0][0], b12 = B[0][1], b21 = B[1][0], b22 = B[1][1];
  const P = [
    { name: 'P1', expr: '(a11+a22)·(b11+b22)', num: `(${a11 + a22})×(${b11 + b22}) = ${a11 + a22}×${b11 + b22} = ${(a11 + a22) * (b11 + b22)}`, v: (a11 + a22) * (b11 + b22), parts: [['A', 0, 0], ['A', 1, 1], ['B', 0, 0], ['B', 1, 1]] },
    { name: 'P2', expr: '(a21+a22)·b11', num: `(${a21 + a22})×${b11} = ${(a21 + a22) * b11}`, v: (a21 + a22) * b11, parts: [['A', 1, 0], ['A', 1, 1], ['B', 0, 0]] },
    { name: 'P3', expr: 'a11·(b12−b22)', num: `${a11}×(${b12 - b22}) = ${a11 * (b12 - b22)}`, v: a11 * (b12 - b22), parts: [['A', 0, 0], ['B', 0, 1], ['B', 1, 1]] },
    { name: 'P4', expr: 'a22·(b21−b11)', num: `${a22}×(${b21 - b11}) = ${a22 * (b21 - b11)}`, v: a22 * (b21 - b11), parts: [['A', 1, 1], ['B', 1, 0], ['B', 0, 0]] },
    { name: 'P5', expr: '(a11+a12)·b22', num: `(${a11 + a12})×${b22} = ${(a11 + a12) * b22}`, v: (a11 + a12) * b22, parts: [['A', 0, 0], ['A', 0, 1], ['B', 1, 1]] },
    { name: 'P6', expr: '(a21−a11)·(b11+b12)', num: `(${a21 - a11})×(${b11 + b12}) = ${(a21 - a11) * (b11 + b12)}`, v: (a21 - a11) * (b11 + b12), parts: [['A', 1, 0], ['A', 0, 0], ['B', 0, 0], ['B', 0, 1]] },
    { name: 'P7', expr: '(a12−a22)·(b21+b22)', num: `(${a12 - a22})×(${b21 + b22}) = ${(a12 - a22) * (b21 + b22)}`, v: (a12 - a22) * (b21 + b22), parts: [['A', 0, 1], ['A', 1, 1], ['B', 1, 0], ['B', 1, 1]] }
  ];
  const Cm = [
    { i: 0, j: 0, expr: 'P1+P4−P5+P7', num: `${P[0].v}+${P[3].v}−${P[4].v}+${P[6].v}`, uses: [0, 3, 4, 6], v: P[0].v + P[3].v - P[4].v + P[6].v },
    { i: 0, j: 1, expr: 'P3+P5', num: `${P[2].v}+${P[4].v}`, uses: [2, 4], v: P[2].v + P[4].v },
    { i: 1, j: 0, expr: 'P2+P4', num: `${P[1].v}+${P[3].v}`, uses: [1, 3], v: P[1].v + P[3].v },
    { i: 1, j: 1, expr: 'P1+P3−P2+P6', num: `${P[0].v}+${P[2].v}−${P[1].v}+${P[5].v}`, uses: [0, 2, 1, 5], v: P[0].v + P[2].v - P[1].v + P[5].v }
  ];
  return { P, Cm };
}
const { P, Cm } = strassenData(MA, B);

const AX = j => -200 + 50 * j;
const ARY = i => 200 - 50 * i;
const BX = j => 150 + 50 * j;
const PX = t => -270 + 90 * t;
const CX = j => -200 + 50 * j;
const CY = i => -80 - 50 * i;

const cell = (v, x, y, sz = 40) => new VBox(scene, { w: sz, h: sz, d: sz, x, y, z: 0, label: String(v), color: DIM, emissive: DIM });
const aCells = MA.map((row, i) => row.map((v, j) => cell(v, AX(j), ARY(i))));
const bCells = B.map((row, i) => row.map((v, j) => cell(v, BX(j), ARY(i))));
const pCards = P.map((p, t) => ({
  box: new VBox(scene, { w: 56, h: 40, d: 40, x: PX(t), y: 40, z: 0, label: p.name, color: DIM, emissive: DIM }),
  valT: new VText(scene, { text: '', x: PX(t), y: 15, z: 0, color: GOLD, scale: 0.5 })
}));
const cCells = Cm.map(c => cell(0, CX(c.j), CY(c.i)));
new VText(scene, { text: 'Strassen：7 个 P 乘积（每卡一次乘法）拼出 C 的 4 块 —— 用加法换乘法，递归起来复杂度就从 O(n³) 掉下来', x: 0, y: 225, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: '左上 = A，右上 = B，中间 7 张 P 卡 = 唯一做乘法的地方；左下 = C = A×B —— 紫色 = 当前 P，玫瑰 = 参与拼装的 P', x: 0, y: -205, z: 0, color: PALETTE.textDim, scale: 0.62 });

function setCell(obj, v, color) { obj.setText(String(v)); if (color) obj.setColor(color, color); }
function clearView() {
  MA.forEach((row, i) => row.forEach((v, j) => setCell(aCells[i][j], v, DIM)));
  B.forEach((row, i) => row.forEach((v, j) => setCell(bCells[i][j], v, DIM)));
  pCards.forEach(p => { p.box.setColor(DIM, DIM); p.valT.setText(''); });
  cCells.forEach(c => setCell(c, 0, DIM));
  stageT.setText(''); eqT.setText(''); outT.setText('');
}

function* strGen() {
  yield S(() => { hint.setText('朴素算法每个 C 块要 2 次乘法，共 8 次 —— Strassen 的戏法：把 a 和 b 的组合预先打包，7 次乘法足矣'); stageT.setText('目标：C = A×B。先看朴素做法 —— 每次乘法都「锁死」一个 a 和一个 b，8 次'); });
  yield W(700);
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { aCells[i][j].setColor(CYAN, CYAN); bCells[i][j].setColor(CYAN, CYAN); }
  yield S(() => hint.setText('Strassen 的洞察：矩阵元素可以「预组合」—— 组合后的中间量比原始元素更能复用信息'));
  yield W(600);
  for (let t = 0; t < P.length; t++) {
    const p = P[t];
    p.parts.forEach(([m, i, j]) => (m === 'A' ? aCells[i][j] : bCells[i][j]).setColor(CYAN, CYAN));
    pCards[t].box.setColor(VIOLET, VIOLET);
    eqT.setText(p.name + ' = ' + p.expr, { color: VIOLET });
    yield S(() => stageT.setText(p.name + '：先对 A、B 的元素做加减法（青色），得到两个组合数 —— 一个乘法还没开始'));
    yield W(650);
    yield S(() => hint.setText('加减法不要钱，乘法才是瓶颈 —— 所以 P 的构造里全是加减，只有最后的 × 计入成本'));
    yield W(300);
    pCards[t].box.setColor(GOLD, GOLD);
    pCards[t].valT.setText('= ' + p.v, { color: GOLD });
    eqT.setText(p.name + ' = ' + p.num, { color: GOLD });
    yield S(() => stageT.setText(p.name + ' = ' + p.num + ' —— 一次乘法完成（卡变金色）'));
    yield W(600);
    p.parts.forEach(([m, i, j]) => (m === 'A' ? aCells[i][j] : bCells[i][j]).setColor(DIM, DIM));
    pCards[t].box.setColor(VIOLET, VIOLET);
  }
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { aCells[i][j].setColor(DIM, DIM); bCells[i][j].setColor(DIM, DIM); }
  yield S(() => stageT.setText('7 张 P 卡全部就位 —— 现在用「加减组合」把 C 的 4 块拼出来，零乘法'));
  yield W(500);
  for (let t = 0; t < Cm.length; t++) {
    const c = Cm[t];
    c.uses.forEach(u => pCards[u].box.setColor(ROSE, ROSE));
    eqT.setText('C[' + (c.i + 1) + '][' + (c.j + 1) + '] = ' + c.expr, { color: ROSE });
    yield S(() => stageT.setText('拼 C[' + (c.i + 1) + '][' + (c.j + 1) + ']：' + c.expr + ' —— 玫瑰色 = 参与的 P 卡'));
    yield W(700);
    setCell(cCells[t], c.v, GOLD);
    eqT.setText('C[' + (c.i + 1) + '][' + (c.j + 1) + '] = ' + c.num + ' = ' + c.v, { color: GOLD });
    yield S(() => stageT.setText('C[' + (c.i + 1) + '][' + (c.j + 1) + '] = ' + c.v + ' 落定（金色）—— 只加不加，一次乘法都没用'));
    yield W(600);
  }
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { aCells[i][j].setColor(CYAN, CYAN); bCells[i][j].setColor(CYAN, CYAN); }
  pCards.forEach(p => p.box.setColor(VIOLET, VIOLET));
  yield S(() => { outT.setText('C = [[' + Cm[0].v + ',' + Cm[1].v + '],[' + Cm[2].v + ',' + Cm[3].v + ']] ✓ 与朴素一致 —— 8 次乘法减到 7 次：T(n) = 7T(n/2) + O(n²) → O(n^2.807)'); status.textContent = 'Strassen：7 次乘法得 C = [[19,22],[43,50]]（朴素 8 次，结果一致）'; });
  yield W(1000);
  yield S(() => { hint.setText('递归的威力：n×n 切成 4 个 n/2 块，每层都省 1/8 的乘法 —— 反复套用，省出来的份额越滚越大'); outT.setText('应用：大规模矩阵乘（BLAS/深度学习）、Winograd 变体进 SIMD 库 —— 常数大，n 小时朴素反而快，工程上约 n>64 切换'); });
  yield W(1200);
  yield S(() => { hint.setText('Strassen 完成：C = [[19,22],[43,50]] ✓'); outT.setText(''); });
  yield W(400);
}

function* runStr() {
  clearView();
  hint.setText('Strassen：7 次乘法 + 加减拼装');
  yield W(400);
  yield* strGen();
}

panel.addButton('运行演示', () => engine.start(runStr()));
panel.addButton('清空', () => { engine.clear(); clearView(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；青色 = 参与组合的元素，紫色 = P 卡，金色 = 已完成，玫瑰 = 拼装中的 P）');

scene.start(engine);
