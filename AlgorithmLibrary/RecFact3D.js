// AlgorithmLibrary/RecFact3D.js — 递归阶乘：调用帧链 f(6)→f(5)→…→f(1) 自上而下展开（深入阶段），到达基线 f(1)=1 后逐帧回溯计算 f(k)=k×f(k−1)（function* 生成器驱动，数值运行时计算）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('RecFact3D');

const scene = new Scene3D('scene', { cameraPos: [0, 300, 640], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「运行演示」开始：递归阶乘 —— 展开到基线，再逐层回溯', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 262, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: 150, z: 0, color: PALETTE.textGlow, scale: 0.44 });
const resultT = new VText(scene, { text: '6! = ?', x: 0, y: -140, z: 0, color: GOLD, scale: 1.4 });

const N = 6;
const frames = Array.from({ length: N }, (_, i) => new VBox(scene, { w: 340, h: 44, d: 44, x: 0, y: 200 - i * 52, z: 0, label: 'f(' + (N - i) + ') = ' + (N - i) + ' × f(' + (N - i - 1) + ')', color: DIM, emissive: DIM }));
new VText(scene, { text: '调用栈：新帧压在旧帧之上（深入），返回时从栈顶逐层弹出（回溯）', x: 0, y: 235, z: 0, color: PALETTE.textDim, scale: 0.34 });

function* recFactGen() {
  yield S(() => { hint.setText('递归：函数调用自己。阶乘 f(n) = n × f(n−1)，f(1) = 1 —— 递归必须有一个「不再递归」的基线'); stageT.setText('f(6) = 6 × f(5) —— 但 f(5) 还不知道，先「挂起」当前帧，去算 f(5)'); });
  yield W(950);
  for (let i = 0; i < N; i++) {
    frames[i].setColor(WHITE, WHITE);
    yield S(() => { stageT.setText('深入第 ' + (i + 1) + ' 层：f(' + (N - i) + ') 需要 f(' + (N - i - 1) + ') —— 压栈，递归调用'); });
    yield W(600);
    frames[i].setColor(GOLD, GOLD);
    yield W(300);
  }
  yield S(() => { stageT.setText('到达基线：f(1) = 1 —— 不再递归，开始返回值'); eqT.setText('栈深 = 6（共 6 帧）；深度 = n —— 递归的内存开销 O(n)'); });
  yield W(800);
  frames[N - 1].setColor(GREEN, GREEN);
  let val = 1;
  yield S(() => { stageT.setText('回溯第 1 层：f(1) = 1 返回给 f(2) 的调用者'); });
  yield W(700);
  for (let k = 2; k <= N; k++) {
    val = val * k;
    frames[N - k].setColor(CYAN, CYAN);
    frames[N - k].setText('f(' + k + ') = ' + k + ' × ' + (val / k) + ' = ' + val);
    yield S(() => { stageT.setText('回溯：f(' + k + ') = ' + k + ' × f(' + (k - 1) + ') = ' + k + ' × ' + (val / k) + ' = ' + val + ' —— 弹出 ' + k + ' 层栈帧'); eqT.setText('乘法只在回溯阶段发生 —— 深入时只有压栈'); });
    yield W(750);
  }
  resultT.setText('6! = 720');
  yield S(() => { stageT.setText('全部回溯完成：f(6) = 720 —— 每一层的返回值像多米诺一样依次完成'); eqT.setText('f(6) = 6×120 = 720 ✓'); status.textContent = '6! = 720'; hint.setText('递归与迭代等价：任何递归都能改成循环 + 显式栈 —— 递归胜在代码与数学定义一致'); });
  yield W(1100);
  yield S(() => { hint.setText('风险：无基线 = 无限递归 → 栈溢出（StackOverflow）；阶乘用迭代更省内存，递归教的是「分治思维」'); });
  yield W(1000);
  yield S(() => { hint.setText('递归阶乘演示完成：深入展开 → 基线 → 回溯计算'); });
  yield W(400);
}

function* runRecFact() {
  hint.setText('递归阶乘：展开 → 基线 → 回溯');
  yield W(400);
  yield* recFactGen();
}

panel.addButton('运行演示', () => engine.start(runRecFact()));
panel.addButton('清空', () => {
  engine.clear();
  frames.forEach((f, i) => { f.setText('f(' + (N - i) + ') = ' + (N - i) + ' × f(' + (N - i - 1) + ')'); f.setColor(DIM, DIM); });
  resultT.setText('6! = ?');
  stageT.setText(''); eqT.setText('');
  hint.setText('已清空，可重新运行'); status.textContent = '';
});
panel.addLabel('（拖拽旋转视角，滚轮缩放；灰 = 待执行帧、白闪 = 当前压栈、金 = 已压栈、绿 = 基线、青 = 已回溯计算；深入阶段只压栈，乘法全在回溯时发生）');

scene.start(engine);
