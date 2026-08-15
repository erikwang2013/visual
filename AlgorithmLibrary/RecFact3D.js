// AlgorithmLibrary/RecFact3D.js — 递归阶乘：调用帧链 f(6)→f(5)→…→f(1) 自上而下展开（深入阶段），到达基线 f(1)=1 后逐帧回溯计算 f(k)=k×f(k−1)（function* 生成器驱动，数值运行时计算）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
applyTheme('RecFact3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, CYAN = 0x22d3ee, WHITE = 0xffffff, DIM = 0x334155;
const status = panel.addStatus('就绪');

const N = 6;
const frames = Array.from({ length: N }, (_, i) => new VBox(scene, { w: 340, h: 44, d: 44, x: 320, y: 500 - i * 52, z: 0, label: 'f(' + (N - i) + ') = ' + (N - i) + ' × f(' + (N - i - 1) + ')', color: DIM, emissive: DIM }));

function* runFact() {
  yield S(() => { status.textContent = '递归阶乘：f(n) = n × f(n−1)，f(1) = 1 为基线 —— 当前帧先「挂起」，深入去算 f(5)'; });
  yield W(950);
  for (let i = 0; i < N; i++) {
    frames[i].setColor(WHITE, WHITE);
    yield S(() => { status.textContent = '深入第 ' + (i + 1) + ' 层：f(' + (N - i) + ') 压栈，递归调用 f(' + (N - i - 1) + ')'; });
    yield W(600);
    frames[i].setColor(GOLD, GOLD);
    yield W(300);
  }
  yield S(() => { status.textContent = '到达基线：f(1) = 1 —— 不再递归，开始回溯返回值（栈深 = 6，递归内存开销 O(n)）'; });
  yield W(800);
  frames[N - 1].setColor(GREEN, GREEN);
  let val = 1;
  yield S(() => { status.textContent = '回溯：f(1) = 1 返回给 f(2) 的调用者'; });
  yield W(700);
  for (let k = 2; k <= N; k++) {
    val = val * k;
    frames[N - k].setColor(CYAN, CYAN);
    frames[N - k].setText('f(' + k + ') = ' + k + ' × ' + (val / k) + ' = ' + val);
    yield S(() => { status.textContent = '回溯：f(' + k + ') = ' + k + ' × f(' + (k - 1) + ') = ' + k + ' × ' + (val / k) + ' = ' + val + ' —— 弹出第 ' + k + ' 层栈帧（乘法只在回溯阶段发生）'; });
    yield W(750);
  }
  yield S(() => { status.textContent = '全部回溯完成：f(6) = 6 × 120 = 720 ✓ —— 每层返回值像多米诺一样依次完成'; });
  yield W(1100);
  yield S(() => { status.textContent = '递归与迭代等价：任何递归都能改成循环 + 显式栈；无基线 = 无限递归 → 栈溢出'; });
  yield W(1000);
  yield S(() => { status.textContent = '阶乘递归演示完成：f(6) = 720，深入 6 层压栈 → 基线 f(1)=1 → 回溯 5 次乘法计算；栈深 = n，内存 O(n)'; });
  yield W(400);
}

engine.queue(() => runFact());
panel.addButton('清空', () => {
  engine.clear();
  frames.forEach((f, i) => { f.setText('f(' + (N - i) + ') = ' + (N - i) + ' × f(' + (N - i - 1) + ')'); f.setColor(DIM, DIM); });
  status.textContent = '';
});

scene.start(engine);
