// AlgorithmLibrary/StoneMerge3D.js — 石子合并（区间 DP）：dp[i][j]=min(dp[i][k]+dp[k+1][j])+sum(i..j) 按区间长自底向上填表，玫瑰色端点、青色格子、金色最优，最终展示最优合并次序（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('StoneMerge3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff;
const hint = new VText(scene, { text: '点击「运行演示」开始：石子合并（4 堆：4、1、2、7）', x: 0, y: 308, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 265, z: 0, color: GOLD, scale: 0.72 });
const outT = new VText(scene, { text: '', x: 0, y: -238, z: 0, color: PALETTE.textGlow, scale: 0.62 });
const totalT = new VText(scene, { text: '', x: 0, y: -182, z: 0, color: GOLD, scale: 0.8 });

const ST = [4, 1, 2, 7];
const N = 4;
const PX = [-180, -60, 60, 180];
const ps = [0];
ST.forEach(s => ps.push(ps[ps.length - 1] + s));
const dp = Array.from({ length: N }, () => new Array(N).fill(0));
const steps = [];
for (let len = 2; len <= N; len++) {
  for (let i = 0; i + len <= N; i++) {
    const j = i + len - 1;
    dp[i][j] = Infinity;
    let bk = i;
    for (let k = i; k < j; k++) {
      const v = dp[i][k] + dp[k + 1][j];
      if (v < dp[i][j]) { dp[i][j] = v; bk = k; }
    }
    dp[i][j] += ps[j + 1] - ps[i];
    steps.push({ len, i, j, bk, cost: dp[i][j], sum: ps[j + 1] - ps[i] });
  }
}

const nodes = [0, 1, 2, 3].map(i => new VNode(scene, { radius: 26, x: PX[i], y: 130, z: 0, label: String(ST[i]), color: BLUE, emissive: BLUE }));
const sumT = [0, 1, 2, 3].map(i => new VText(scene, { text: '石子 ' + ST[i], x: PX[i], y: 172, z: 0, color: WHITE, scale: 0.5 }));
const dpCells = [];
for (let len = 2; len <= N; len++) for (let i = 0; i + len <= N; i++) {
  const j = i + len - 1;
  const box = new VBox(scene, { w: 64, h: 34, d: 34, x: -90 + (i + j) * 60, y: 40 - (len - 2) * 55, z: 0, label: '', color: BLUE, emissive: BLUE });
  dpCells.push({ i, j, box });
}
new VText(scene, { text: '一圈石子排成行，相邻两堆才能合并，代价 = 两堆重量之和 —— 求合并成一堆的最小总代价', x: 0, y: 225, z: 0, color: WHITE, scale: 0.68 });
new VText(scene, { text: '区间 DP：dp[i][j] = min(dp[i][k] + dp[k+1][j]) + sum(i..j) —— 枚举最后一次合并的分界点 k', x: 0, y: -205, z: 0, color: WHITE, scale: 0.62 });

function cellOf(i, j) { return dpCells.find(c => c.i === i && c.j === j); }
function clearView() {
  nodes.forEach((n, i) => { n.setColor(BLUE, BLUE); n.setText(String(ST[i])); });
  sumT.forEach((t, i) => t.setText('石子 ' + ST[i], { color: WHITE }));
  dpCells.forEach(c => { c.box.setColor(BLUE, BLUE); c.box.setText(''); });
  totalT.setText(''); stageT.setText(''); outT.setText('');
}

function* smGen() {
  yield S(() => outT.setText('区间 DP 按「长度从小到大」计算：先解决相邻两堆，再解决更长区间 —— dp[i][j] 只依赖更短的子区间'));
  yield W(650);
  for (const s of steps) {
    nodes[s.i].setColor(RED, RED); nodes[s.j].setColor(RED, RED);
    cellOf(s.i, s.j).box.setColor(CYAN, CYAN);
    yield S(() => stageT.setText('长度 ' + s.len + '：dp[' + s.i + '][' + s.j + '] 枚举分界 k=' + s.i + '..' + (s.j - 1) + '，最优 k=' + s.bk));
    yield W(420);
    for (let k = s.i; k < s.j; k++) {
      const v = dp[s.i][k] + dp[k + 1][s.j];
      yield S(() => outT.setText('k=' + k + '：dp[' + s.i + '][' + k + ']=' + dp[s.i][k] + ' + dp[' + (k + 1) + '][' + s.j + ']=' + dp[k + 1][s.j] + ' = ' + v + (k === s.bk ? ' ← 暂优' : '')));
      yield W(260);
    }
    const c = cellOf(s.i, s.j);
    c.box.setText('dp ' + s.cost);
    c.box.setColor(GOLD, GOLD);
    nodes.forEach(n => n.setColor(BLUE, BLUE));
    nodes[s.i].setColor(GOLD, GOLD);
    yield S(() => stageT.setText('dp[' + s.i + '][' + s.j + '] = ' + s.cost + '（= 子问题 ' + (s.cost - s.sum) + ' + 区间和 ' + s.sum + '）'));
    yield W(480);
    if (s.len === N) {
      totalT.setText('总代价 = ' + s.cost + '（区间 [0..3] 合并成一堆）');
      status.textContent = '石子合并最小代价 = ' + s.cost;
    }
  }
  yield S(() => outT.setText('最优合并次序：先并 1+2=3（代价 3）→ 再并 4+3=7（代价 7）→ 最后 7+7=14 → 共 24'));
  yield W(750);
  yield S(() => outT.setText('对比：若先并 4+1（代价 5），总代价会到 26 —— 合并顺序真的影响总代价；O(n³)，四边形不等式可优化到 O(n²)'));
  yield W(650);
  yield S(() => outT.setText('完成：石子合并最小代价 = 24，区间 DP 三件套（石子合并/矩阵链乘/多边形三角剖分）'));
  yield W(600);
}

function* runSM() {
  clearView();
  hint.setText('石子合并：dp[i][j] = min(dp[i][k]+dp[k+1][j]) + sum(i..j)，按区间长填表');
  yield W(400);
  yield* smGen();
  yield S(() => { outT.setText(''); hint.setText('石子合并完成：最小代价 24（1+2 → 4+3 → 7+7），O(n³)'); });
}

panel.addButton('运行演示', () => engine.start(runSM()));
panel.addButton('清空', () => { engine.clear(); clearView(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；玫红 = 区间端点，青 = 计算中，金 = 最优值；下方 dp 格从长度 2 填到 4）');

scene.start(engine);
