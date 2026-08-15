// AlgorithmLibrary/RodCutting3D.js — 钢条切割：dp[i]=max(p[j]+dp[i−j]) 自底向上填表，候选第一刀青色、暂优橙色、选中金色，切割线动画，最终方案 6+2 装箱（function* 生成器驱动，运行期零 new）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('RodCutting3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, CYAN = 0x22d3ee, ORANGE = 0xfb923c, DIM = 0x334155;
const status = panel.addStatus('就绪');
const ease = p => p * p * (3 - 2 * p);
const lerp = (a, b, t) => a + (b - a) * t;

const P = [0, 1, 5, 8, 9, 10, 17, 17, 20];
const N = 8;

// 预计算 dp 表、最优第一刀与最终切割方案
const steps = [];
const dp = Array(N + 1).fill(0), cut = Array(N + 1).fill(0);
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
const SEG = Math.max(...pieces), SEG2 = Math.min(...pieces);

const X = i => 340 + (i - 4.5) * 60;
const ROD_Y = 400, PRICE_Y = 448, DP_Y = 300, BIN_Y = 185;
const boundary = j => 340 + (j - 4) * 60; // 第 j 段与第 j+1 段之间的切割线位置

// ---- 预建对象（运行期只改 text/color/scale/position/visible，绝不 new）----
const rod = [1, 2, 3, 4, 5, 6, 7, 8].map(i => new VBox(scene, { w: 56, h: 46, d: 46, x: X(i), y: ROD_Y, z: 0, label: String(i), color: BLUE, emissive: BLUE }));
const priceT = [1, 2, 3, 4, 5, 6, 7, 8].map(i => new VText(scene, { text: '价 ' + P[i], x: X(i), y: PRICE_Y, z: 0, color: PALETTE.text, scale: 0.5 }));
const dpBox = [1, 2, 3, 4, 5, 6, 7, 8].map(i => new VBox(scene, { w: 46, h: 40, d: 40, x: X(i), y: DP_Y, z: 0, label: 'dp' + i + ':0', color: DIM, emissive: DIM }));
const cutLine = new VBox(scene, { w: 8, h: 96, d: 80, x: 90, y: ROD_Y, z: 0, label: '', color: CYAN, emissive: CYAN });
cutLine.mesh.visible = false;
const bin1 = new VBox(scene, { w: 180, h: 50, d: 50, x: 255, y: BIN_Y, z: 0, label: '', color: DIM, emissive: DIM });
const bin2 = new VBox(scene, { w: 80, h: 50, d: 50, x: 440, y: BIN_Y, z: 0, label: '', color: DIM, emissive: DIM });

function* rodGen() {
  yield S(() => { status.textContent = '钢条切割：一根长 ' + N + ' 的钢条可整卖（' + P[N] + ' 元）或切段卖。dp[i] = max(p[j] + dp[i−j])：第一刀切 j，剩下 i−j 交给子问题，小问题先算'; });
  yield W(900);
  for (const s of steps) {
    yield S(() => { status.textContent = '计算 dp[' + s.i + ']：尝试第一刀 j = 1..' + s.i + '，取 p[j] + dp[' + s.i + '−j] 的最大值'; });
    yield W(450);
    for (const t of s.tries) {
      cutLine.mesh.visible = true;
      cutLine.setColor(t.j === s.bj ? ORANGE : CYAN, t.j === s.bj ? ORANGE : CYAN);
      cutLine.moveTo(boundary(t.j), ROD_Y, 0, 320);
      rod[t.j - 1].setColor(t.j === s.bj ? ORANGE : CYAN, t.j === s.bj ? ORANGE : CYAN);
      yield S(() => { status.textContent = '切 ' + t.j + '：p[' + t.j + ']=' + P[t.j] + ' + dp[' + (s.i - t.j) + ']=' + dp[s.i - t.j] + ' = ' + t.val + (t.j === s.bj ? '（当前最优）' : ''); });
      yield W(400);
    }
    rod.forEach(r => r.setColor(BLUE, BLUE));
    rod[s.bj - 1].setColor(GOLD, GOLD);
    dpBox[s.i - 1].setColor(GOLD, GOLD);
    dpBox[s.i - 1].setText('dp' + s.i + ':' + s.best);
    yield S(() => { status.textContent = 'dp[' + s.i + '] = ' + s.best + '：最优第一刀切 ' + s.bj + '（价 ' + P[s.bj] + ' + dp[' + (s.i - s.bj) + ']=' + dp[s.i - s.bj] + '）→ 写入 dp 表'; });
    yield W(500);
    dpBox[s.i - 1].setColor(DIM, DIM);
    rod[s.bj - 1].setColor(BLUE, BLUE);
  }
  yield S(() => { status.textContent = 'dp[' + N + '] = ' + dp[N] + '：最优方案 = 段 ' + SEG + ' + 段 ' + SEG2 + '。切割线滑到第 ' + SEG + ' 段之后，先切出长 ' + SEG + ' 的段'; });
  yield W(700);
  cutLine.setColor(GOLD, GOLD);
  cutLine.moveTo(boundary(SEG), ROD_Y, 0, 600);
  yield W(650);
  yield S(() => { status.textContent = '左段（1~' + SEG + '）与右段（' + (SEG + 1) + '~' + N + '）标金：段 ' + SEG + ' 价 ' + P[SEG] + '、段 ' + SEG2 + ' 价 ' + P[SEG2] + '；两段装箱'; });
  rod.forEach(r => r.setColor(GOLD, GOLD));
  bin1.mesh.visible = true; bin2.mesh.visible = true;
  bin1.setColor(GOLD, GOLD); bin2.setColor(GOLD, GOLD);
  bin1.setText('段 ' + SEG); bin2.setText('段 ' + SEG2);
  yield W(600);
  yield A(700, p => {
    const e = ease(p);
    for (let i = 0; i < SEG; i++) {
      const t = rod[i].mesh;
      t.position.set(lerp(X(i + 1), 255 + (i - 2.5) * 34, e), lerp(ROD_Y, BIN_Y, e), 0);
      t.scale.setScalar(1 - 0.4 * e);
    }
    for (let i = SEG; i < N; i++) {
      const t = rod[i].mesh;
      t.position.set(lerp(X(i + 1), 440 + (i - SEG - 0.5) * 34, e), lerp(ROD_Y, BIN_Y, e), 0);
      t.scale.setScalar(1 - 0.4 * e);
    }
  });
  rod.forEach(r => r.mesh.scale.setScalar(0.6));
  yield S(() => { status.textContent = '装箱完成：段 ' + SEG + '（' + P[SEG] + ' 元）+ 段 ' + SEG2 + '（' + P[SEG2] + ' 元）= ' + dp[N] + ' 元 —— 整卖 ' + P[N] + ' 元，切割多赚 ' + (dp[N] - P[N]) + ' 元；按单价贪心切 4 段 2 只卖 20 元，贪心输给 DP'; });
  yield W(900);
  yield S(() => { status.textContent = 'RodCutting 演示完成：长 8 钢条最优切割 6+2，收益 22 元（整卖 20 元，切割多赚 2 元）；复杂度 O(n²)（n 段 × 每段试 n 刀）'; });
  yield W(900);
}

engine.queue(() => rodGen());
panel.addButton('清空', () => {
  engine.clear();
  rod.forEach((r, i) => { r.setColor(BLUE, BLUE); r.setText(String(i + 1)); r.mesh.position.set(X(i + 1), ROD_Y, 0); r.mesh.scale.setScalar(1); });
  dpBox.forEach((b, i) => { b.setColor(DIM, DIM); b.setText('dp' + (i + 1) + ':0'); });
  cutLine.tweenPos = null;
  cutLine.mesh.visible = false;
  cutLine.mesh.position.set(90, ROD_Y, 0);
  bin1.mesh.visible = false; bin2.mesh.visible = false;
  bin1.setText(''); bin2.setText('');
  status.textContent = '';
});

scene.start(engine);
