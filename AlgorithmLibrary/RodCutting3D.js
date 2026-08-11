// AlgorithmLibrary/RodCutting3D.js — 钢条切割：dp[i]=max(p[j]+dp[i-j]) 自底向上填表，候选第一刀青色、暂优橙色、选中金色，最终方案 6+2 装箱（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('RodCutting3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 660], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff;
const hint = new VText(scene, { text: '点击「运行演示」开始：钢条切割（长 8，价格表已知）', x: 0, y: 308, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 260, z: 0, color: GOLD, scale: 0.72 });
const outT = new VText(scene, { text: '', x: 0, y: -232, z: 0, color: PALETTE.textGlow, scale: 0.62 });
const totalT = new VText(scene, { text: '', x: 90, y: -120, z: 0, color: GOLD, scale: 0.8 });

const P = [0, 1, 5, 8, 9, 10, 17, 17, 20];
const N = 8;
const dp = Array(N + 1).fill(0);
const cut = Array(N + 1).fill(0);
const steps = [];
for (let i = 1; i <= N; i++) {
  let best = 0, bj = 0;
  const tries = [];
  for (let j = 1; j <= i; j++) {
    const val = P[j] + dp[i - j];
    tries.push({ j, val });
    if (val > best) { best = val; bj = j; }
  }
  dp[i] = best; cut[i] = bj;
  steps.push({ i, best, bj, tries });
}
const pieces = [];
let nn = N;
while (nn > 0) { pieces.push(cut[nn]); nn -= cut[nn]; }

const X = (i) => -240 + (i - 0.5) * 60;
const rod = [1, 2, 3, 4, 5, 6, 7, 8].map(i => new VBox(scene, { w: 56, h: 46, d: 46, x: X(i), y: 150, z: 0, label: String(i), color: BLUE, emissive: BLUE }));
const priceT = [1, 2, 3, 4, 5, 6, 7, 8].map(i => new VText(scene, { text: '价' + P[i], x: X(i), y: 192, z: 0, color: WHITE, scale: 0.55 }));
const dpT = [1, 2, 3, 4, 5, 6, 7, 8].map(i => new VText(scene, { text: 'dp' + i + ':0', x: X(i), y: 60, z: 0, color: WHITE, scale: 0.5 }));
const bin1 = new VBox(scene, { w: 90, h: 56, d: 56, x: -110, y: -120, z: 0, label: '', color: BLUE, emissive: BLUE });
const bin2 = new VBox(scene, { w: 90, h: 56, d: 56, x: -10, y: -120, z: 0, label: '', color: BLUE, emissive: BLUE });
new VText(scene, { text: '一根长 8 的钢条可整卖也可切割零售，切多少刀免费 —— 怎么切收入最高？', x: 0, y: 228, z: 0, color: WHITE, scale: 0.68 });
new VText(scene, { text: 'dp[i] = max(p[j] + dp[i−j])：第一刀切 j，剩下 i−j 交给子问题；小问题先算 → 大问题直接查', x: 0, y: -192, z: 0, color: WHITE, scale: 0.62 });

function clearView() {
  rod.forEach((r, i) => { r.setColor(BLUE, BLUE); r.setText(String(i + 1)); });
  dpT.forEach((t, i) => t.setText('dp' + (i + 1) + ':0', { color: WHITE }));
  bin1.setText(''); bin2.setText(''); bin1.setColor(BLUE, BLUE); bin2.setColor(BLUE, BLUE);
  totalT.setText(''); stageT.setText(''); outT.setText('');
}

function* rodGen() {
  yield S(() => outT.setText('核心洞察：切割问题的最优解 = 「第一刀」+「剩余段的最优解」—— 子问题结构相同 → DP'));
  yield W(650);
  for (const s of steps) {
    yield S(() => stageT.setText('计算 dp[' + s.i + ']：尝试第一刀 j = 1..' + s.i + '，取 p[j] + dp[' + s.i + '−j] 的最大值'));
    yield W(380);
    for (const t of s.tries) {
      rod[t.j - 1].setColor(t.j === s.bj ? ORANGE : CYAN, t.j === s.bj ? ORANGE : CYAN);
      yield S(() => outT.setText('切 ' + t.j + '：p[' + t.j + ']=' + P[t.j] + ' + dp[' + (s.i - t.j) + ']=' + dp[s.i - t.j] + ' = ' + t.val + (t.j === s.bj ? ' ← 暂优' : '')));
      yield W(240);
    }
    dpT[s.i - 1].setText('dp' + s.i + ':' + s.best, { color: GOLD });
    rod.forEach(r => r.setColor(BLUE, BLUE));
    rod[s.bj - 1].setColor(GOLD, GOLD);
    yield S(() => stageT.setText('dp[' + s.i + '] = ' + s.best + '：最优第一刀 = 切 ' + s.bj + '（价 ' + P[s.bj] + ' + dp[' + (s.i - s.bj) + ']）'));
    yield W(480);
  }
  rod.forEach(r => r.setColor(BLUE, BLUE));
  rod[5].setColor(GOLD, GOLD); rod[1].setColor(GOLD, GOLD);
  bin1.setText('段 ' + pieces[0]); bin2.setText('段 ' + pieces[1]);
  bin1.setColor(GOLD, GOLD); bin2.setColor(GOLD, GOLD);
  totalT.setText('总价 = ' + dp[N] + ' 元');
  yield S(() => outT.setText('最优方案：切成长度 ' + pieces[0] + ' + ' + pieces[1] + ' = 17 + 5 = ' + dp[N] + ' —— 整卖才 20，切着卖反而多 2 元'));
  yield W(800);
  yield S(() => { status.textContent = '钢条切割最优收益 = ' + dp[N] + '（' + pieces.join('+') + '）'; outT.setText('注意：按单价贪心（2 元/单位）会切 4 段 2，只能卖 20 —— 贪心输给 DP；O(n²)'); });
  yield W(650);
}

function* runRod() {
  clearView();
  hint.setText('钢条切割：dp[i] = max(p[j] + dp[i−j])，自底向上');
  yield W(400);
  yield* rodGen();
  yield S(() => { outT.setText(''); hint.setText('钢条切割完成：最优收益 22（6+2），O(n²)'); });
}

panel.addButton('运行演示', () => engine.start(runRod()));
panel.addButton('清空', () => { engine.clear(); clearView(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；青 = 本轮候选切法，橙 = 暂优，金 = 选中；下方两个箱子装最优方案）');

scene.start(engine);
