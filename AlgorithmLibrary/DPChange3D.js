// AlgorithmLibrary/DPChange3D.js — 找零钱（DP）：币 1/5/10/25 凑 26，dp[r][c]=min(不含, 含) 逐格填表，回溯金色路径 25+1，结尾对比贪心反例（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('DPChange3D');

const scene = new Scene3D('scene', { cameraPos: [0, 320, 900], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff;
const hint = new VText(scene, { text: '点击「运行演示」开始：找零钱（币种 1/5/10/25，凑 26）', x: 0, y: 308, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 265, z: 0, color: GOLD, scale: 0.72 });
const outT = new VText(scene, { text: '', x: 0, y: -260, z: 0, color: PALETTE.textGlow, scale: 0.6 });

const COINS = [1, 5, 10, 25];
const AMT = 26;
const R = COINS.length;
const CW = 30, CH = 36, TY = 85;
const dp = Array.from({ length: R + 1 }, () => Array(AMT + 1).fill(Infinity));
for (let r = 0; r <= R; r++) dp[r][0] = 0;
const steps = [];
for (let r = 1; r <= R; r++) for (let c = 1; c <= AMT; c++) {
  const use = c >= COINS[r - 1] ? dp[r][c - COINS[r - 1]] + 1 : Infinity;
  const skip = dp[r - 1][c];
  dp[r][c] = Math.min(skip, use);
  steps.push({ r, c, v: dp[r][c], use: use < skip, skip, useV: use });
}
const sol = [];
let r = R, c = AMT;
while (c > 0 && r > 0) {
  if (dp[r][c] === dp[r - 1][c]) r--;
  else { sol.push(COINS[r - 1]); c -= COINS[r - 1]; }
}

const cellView = new Map();
for (let r = 0; r <= R; r++) for (let c = 0; c <= AMT; c++) {
  const box = new VBox(scene, { w: CW - 6, h: CH - 6, d: 10, x: -405 + c * CW, y: TY - r * CH, z: 0, label: c === 0 ? '0' : (r === 0 ? '∞' : ''), color: BLUE, emissive: BLUE });
  cellView.set(r + '-' + c, { box });
}
for (let r = 1; r <= R; r++) new VText(scene, { text: COINS[r - 1] + '币', x: -405 - 40, y: TY - r * CH, z: 0, color: WHITE, scale: 0.45 });
new VText(scene, { text: 'dp[r][c] = 用前 r 种币凑 c 分的最少枚数；dp[r][c] = min(不含第 r 种, 含一枚第 r 种) —— 每格只依赖左/上', x: 0, y: -232, z: 0, color: WHITE, scale: 0.62 });
new VText(scene, { text: '凑零钱：给定币种无限量，求凑出 26 分的最少硬币数（无限背包变体）', x: 0, y: 235, z: 0, color: WHITE, scale: 0.68 });
const ansT = new VText(scene, { text: '', x: 0, y: -178, z: 0, color: GOLD, scale: 0.8 });

function cell(r, c) { return cellView.get(r + '-' + c); }
function setCell(r, c, v, col) {
  const e = cell(r, c);
  e.box.setText(v === Infinity ? '∞' : String(v));
  if (col) e.box.setColor(col, col);
}
function clearView() {
  cellView.forEach((e, k) => {
    const [, r, c] = k.split('-').map(Number);
    e.box.setText(c === 0 ? '0' : (r === 0 ? '∞' : ''));
    e.box.setColor(BLUE, BLUE);
  });
  ansT.setText(''); stageT.setText(''); outT.setText('');
}

function* chGen() {
  yield S(() => outT.setText('第一行 = 只有 0 分可用：除了 0 分其余全 ∞（凑不出）；首列 dp[r][0] = 0（凑 0 分用 0 枚）'));
  yield W(700);
  for (const s of steps) {
    const e = cell(s.r, s.c);
    e.box.setColor(CYAN, CYAN);
    yield S(() => outT.setText('dp[' + s.r + '][' + s.c + '] = min(不含 ' + COINS[s.r - 1] + ': ' + (s.skip === Infinity ? '∞' : s.skip) + ', 含一枚: ' + (s.useV === Infinity ? '∞' : s.useV) + ')'));
    yield W(150);
    setCell(s.r, s.c, s.v, s.v < Infinity ? (s.use ? ORANGE : BLUE) : BLUE);
    yield S(() => stageT.setText('dp[' + s.r + '][' + s.c + '] = ' + (s.v === Infinity ? '∞' : s.v) + (s.use ? '（含 ' + COINS[s.r - 1] + ' 更优）' : '（不用 ' + COINS[s.r - 1] + ' 更优）')));
    yield W(130);
  }
  yield S(() => { ansT.setText('dp[4][26] = ' + dp[R][AMT] + ' → 26 分最少 ' + dp[R][AMT] + ' 枚'); stageT.setText('表填完！回溯：从 dp[4][26] 出发，凡 dp[r][c]==dp[r−1][c] 就上行（不用），否则用一枚该币左移'); });
  yield W(800);
  let rr = R, cc = AMT;
  const path = [];
  while (cc > 0 && rr > 0) {
    cell(rr, cc).box.setColor(GOLD, GOLD);
    if (dp[rr][cc] === dp[rr - 1][cc]) { path.push('上'); rr--; }
    else { path.push('用' + COINS[rr - 1]); cc -= COINS[rr - 1]; }
    yield S(() => outT.setText('回溯 ' + path.join(' → ')));
    yield W(280);
  }
  cell(R, AMT).box.setColor(GOLD, GOLD);
  yield S(() => { ansT.setText('26 = ' + sol.join(' + ') + '，共 ' + dp[R][AMT] + ' 枚'); stageT.setText('最优解：' + sol.join(' + ') + ' —— 贪心（先取 25 → 1）恰好也是最优'); });
  yield W(800);
  yield S(() => outT.setText('但贪心不总是对：币种 1/3/4 凑 6 时，贪心取 4+1+1 = 3 枚，而 DP 取 3+3 = 2 枚 —— 这正是要 DP 的原因'));
  yield W(750);
  yield S(() => { status.textContent = '找零 26 最少 ' + dp[R][AMT] + ' 枚（25+1）'; outT.setText('完成：找零 26 = 25+1 共 2 枚，O(币种数 × 金额)；无限背包的模板'); });
  yield W(600);
}

function* runCH() {
  clearView();
  hint.setText('找零钱：dp[r][c] = min(不含, 含)，逐格填表 + 回溯');
  yield W(400);
  yield* chGen();
  yield S(() => { outT.setText(''); hint.setText('找零完成：26 = 25+1 共 2 枚，O(4×26)'); });
}

panel.addButton('运行演示', () => engine.start(runCH()));
panel.addButton('清空', () => { engine.clear(); clearView(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；青 = 计算中，橙 = 含币更优，金 = 回溯路径；行 = 前 r 种币，列 = 金额）');

scene.start(engine);
