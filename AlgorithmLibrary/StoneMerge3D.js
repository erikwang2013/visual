// AlgorithmLibrary/StoneMerge3D.js — 石子合并（区间 DP）：dp[i][j]=min(dp[i][k]+dp[k+1][j])+sum(i..j) 按区间长自底向上填表，玫瑰色端点、青色格子、金色最优，最终展示最优合并次序（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
applyTheme('StoneMerge3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff;
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 320, y: 610, z: 0, color: GOLD, scale: 0.72 });

const ST = [4, 1, 2, 7];
const N = 4;
const PX = [140, 260, 380, 500];
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

const nodes = [0, 1, 2, 3].map(i => new VNode(scene, { radius: 26, x: PX[i], y: 520, z: 0, label: String(ST[i]), color: BLUE, emissive: BLUE }));
const sumT = [0, 1, 2, 3].map(i => new VText(scene, { text: '石子 ' + ST[i], x: PX[i], y: 565, z: 0, color: WHITE, scale: 0.5 }));
const dpCells = [];
for (let len = 2; len <= N; len++) for (let i = 0; i + len <= N; i++) {
  const j = i + len - 1;
  const box = new VBox(scene, { w: 64, h: 34, d: 34, x: 230 + (i + j) * 60, y: 440 - (len - 2) * 50, z: 0, label: '', color: BLUE, emissive: BLUE });
  dpCells.push({ i, j, box });
}

function cellOf(i, j) { return dpCells.find(c => c.i === i && c.j === j); }
function clearView() {
  nodes.forEach((n, i) => { n.setColor(BLUE, BLUE); n.setText(String(ST[i])); });
  sumT.forEach((t, i) => t.setText('石子 ' + ST[i], { color: WHITE }));
  dpCells.forEach(c => { c.box.setColor(BLUE, BLUE); c.box.setText(''); });
  stageT.setText('');
}

function* smGen() {
  yield S(() => { status.textContent = '石子合并（区间 DP）：4 堆石子 4、1、2、7 排成一行，相邻两堆才能合并，代价 = 两堆重量之和，求合并成一堆的最小总代价'; });
  yield W(650);
  for (const s of steps) {
    nodes[s.i].setColor(RED, RED); nodes[s.j].setColor(RED, RED);
    cellOf(s.i, s.j).box.setColor(CYAN, CYAN);
    yield S(() => { stageT.setText('长度 ' + s.len + '：dp[' + s.i + '][' + s.j + ']'); status.textContent = '长度 ' + s.len + '：dp[' + s.i + '][' + s.j + '] 枚举分界点 k=' + s.i + '..' + (s.j - 1) + '，区间和 sum(' + s.i + '..' + s.j + ')=' + s.sum; });
    yield W(420);
    for (let k = s.i; k < s.j; k++) {
      const v = dp[s.i][k] + dp[k + 1][s.j];
      yield S(() => { status.textContent = 'k=' + k + '：dp[' + s.i + '][' + k + ']=' + dp[s.i][k] + ' + dp[' + (k + 1) + '][' + s.j + ']=' + dp[k + 1][s.j] + ' = ' + v + (k === s.bk ? '（暂优）' : ''); });
      yield W(260);
    }
    const c = cellOf(s.i, s.j);
    c.box.setText('dp ' + s.cost);
    c.box.setColor(GOLD, GOLD);
    nodes.forEach(n => n.setColor(BLUE, BLUE));
    nodes[s.i].setColor(GOLD, GOLD);
    yield S(() => { status.textContent = 'dp[' + s.i + '][' + s.j + '] = ' + s.cost + '（子问题 ' + (s.cost - s.sum) + ' + 区间和 ' + s.sum + '），金色 = 当前最优值'; });
    yield W(480);
    if (s.len === N) {
      yield S(() => { status.textContent = '长度 4 填完：石子合并最小代价 = ' + s.cost + '（区间 [0..3] 合并成一堆）'; });
      yield W(500);
    }
  }
  yield S(() => { status.textContent = '最优合并次序：先并 1+2=3（代价 3）→ 再并 4+3=7（代价 7）→ 最后 7+7=14，合计 24'; });
  yield W(750);
  yield S(() => { status.textContent = '对比：若先并 4+1（代价 5），总代价变为 26——合并顺序影响总代价；复杂度 O(n³)，四边形不等式可优化到 O(n²)'; });
  yield W(650);
  yield S(() => { status.textContent = '演示完成：石子合并最小代价 24（1+2→3、4+3→7、7+7→14），区间 DP 三件套：石子合并 / 矩阵链乘 / 多边形三角剖分'; });
  yield W(600);
}

function* runSM() {
  clearView();
  yield W(400);
  yield* smGen();
}

engine.queue(() => runSM());
panel.addButton('清空', () => { engine.clear(); clearView(); status.textContent = ''; });

scene.start(engine);
