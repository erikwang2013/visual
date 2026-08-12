// AlgorithmLibrary/DigitDP3D.js — 数位DP：统计 1..120 不含数字 6 的个数，f[p][紧][开始] 3×4 状态表自底向上填，个位 base=1，答案 100−1=99（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('DigitDP3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff;
const hint = new VText(scene, { text: '点击「运行演示」开始：数位DP（1..120 不含 6）', x: 0, y: 305, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 265, z: 0, color: GOLD, scale: 0.72 });
const outT = new VText(scene, { text: '', x: 0, y: -175, z: 0, color: PALETTE.textGlow, scale: 0.62 });
const ansT = new VText(scene, { text: '', x: 0, y: -112, z: 0, color: GOLD, scale: 0.8 });

const DIGITS = [1, 2, 0];
const N = 3;
const f = Array.from({ length: N + 1 }, () => new Array(4).fill(0));
for (let t = 0; t < 4; t++) f[N][t] = 1;   // base case：空后缀只有 1 种
const steps = [];
for (let p = N - 1; p >= 0; p--) {
  for (const [tight, started] of [[1, 0], [0, 0], [1, 1], [0, 1]]) {
    const max = tight ? DIGITS[p] : 9;
    let total = 0;
    const opts = [];
    for (let d = 0; d <= max; d++) {
      if (d === 6) { opts.push({ d, skip: true }); continue; }
      const nt = (tight && d === max) ? 1 : 0;
      const ns = (started || d > 0) ? 1 : 0;
      const v = f[p + 1][nt * 2 + ns];
      opts.push({ d, v });
      total += v;
    }
    f[p][tight * 2 + started] = total;
    steps.push({ p, tight, started, max, opts, val: total });
  }
}

const slotX = [-70, 0, 70];
const slots = [0, 1, 2].map(i => new VBox(scene, { w: 44, h: 46, d: 46, x: slotX[i], y: 170, z: 0, label: String(DIGITS[i]), color: BLUE, emissive: BLUE }));
const slotT = [0, 1, 2].map(i => new VText(scene, { text: ['百位', '十位', '个位'][i], x: slotX[i], y: 205, z: 0, color: WHITE, scale: 0.5 }));
new VText(scene, { text: '范围 1 ~ 120', x: 165, y: 172, z: 0, color: PALETTE.textGlow, scale: 0.55 });
const cells = [];
const rowY = [60, 5, -50];
const colX = [-150, -50, 50, 150];
const colLabel = ['紧·未开始', '松·未开始', '紧·开始', '松·开始'];
for (let p = 0; p < N; p++) for (let idx = 0; idx < 4; idx++) {
  const [tight, started] = [[1, 0], [0, 0], [1, 1], [0, 1]][idx];
  const box = new VBox(scene, { w: 56, h: 32, d: 32, x: colX[idx], y: rowY[p], z: 0, label: '', color: BLUE, emissive: BLUE });
  cells.push({ p, tight, started, box });
}
for (let idx = 0; idx < 4; idx++) new VText(scene, { text: colLabel[idx], x: colX[idx], y: rowY[0] + 32, z: 0, color: WHITE, scale: 0.4 });
new VText(scene, { text: 'f[p][紧][开始]：合法后缀个数', x: 0, y: 235, z: 0, color: WHITE, scale: 0.68 });
new VText(scene, { text: '两个维度：紧贴 = 前缀与上限相同则受限；开始 = 已出现非零位（前导 0 不算数字）', x: 0, y: -235, z: 0, color: WHITE, scale: 0.62 });

function cellOf(p, tight, started) { return cells.find(c => c.p === p && c.tight === tight && c.started === started); }
function clearView() {
  slots.forEach(s => s.setColor(BLUE, BLUE));
  cells.forEach(c => { c.box.setColor(BLUE, BLUE); c.box.setText(''); });
  ansT.setText(''); stageT.setText(''); outT.setText('');
}

function* ddGen() {
  yield S(() => outT.setText('暴力从 1 数到 120 只要 120 次 —— 但上限是 10¹⁸ 呢？数位 DP 只关心「位数」，复杂度 O(位数×4)'));
  yield W(650);
  yield S(() => { stageT.setText('base case：f[3][*] = 1（空后缀只有 1 种），从个位向上逐位填状态表'); slots[2].setColor(RED, RED); });
  yield W(550);
  slots[2].setColor(BLUE, BLUE);
  for (const s of steps) {
    const c = cellOf(s.p, s.tight, s.started);
    c.box.setColor(CYAN, CYAN);
    slots[s.p].setColor(RED, RED);
    yield S(() => stageT.setText('f[' + s.p + '][' + (s.tight ? '紧' : '松') + '][' + (s.started ? '开始' : '未开始') + ']：该位可填 0..' + s.max + '（' + (s.tight ? '紧贴上限制' : '放松，随便填') + '），跳过 6'));
    yield W(400);
    let shown = 0;
    for (const o of s.opts) {
      if (o.skip) { shown++; continue; }
      if (shown > 6) { shown = -1; break; }
      shown++;
      yield S(() => outT.setText('d=' + o.d + '：下一位 ' + (o.v === 1 ? '只有 1 种（紧贴→仍紧贴 / 非零→已开始）' : 'f[' + (s.p + 1) + '][' + o.v + '] 种') + ' → 累加'));
      yield W(120);
    }
    yield S(() => outT.setText(s.opts.some(o => o.skip) ? 'd=6 是禁忌数字，跳过 ✗；候选 ' + s.opts.filter(o => !o.skip).length + ' 个，合计 ' + s.val : '候选 ' + s.opts.length + ' 个，合计 ' + s.val));
    yield W(280);
    c.box.setText(String(s.val));
    c.box.setColor(GOLD, GOLD);
    slots[s.p].setColor(BLUE, BLUE);
    yield S(() => stageT.setText('f[' + s.p + '][' + (s.tight ? '紧' : '松') + '][' + (s.started ? '开始' : '未开始') + '] = ' + s.val + '（金色锁定；转移：d=上限位 且 原紧贴 → 仍紧贴；d>0 → 已开始）'));
    yield W(420);
  }
  yield S(() => ansT.setText('f[0][紧][未开始] = 100 → 减去全 0 那一个 → 1..120 不含 6 的个数 = 99'));
  yield W(800);
  yield S(() => outT.setText('对照暴力：1..120 共 120 个，含 6 的有 21 个（6,16,26,36,46,56,60..69,76,86,96,106,116）→ 120−21 = 99 ✓'));
  yield W(700);
  yield S(() => outT.setText('复杂度 O(位数 × 4)：上限 10¹⁸ 也只要 18×4 = 72 个状态；区间 [L,R] 统计 = f(R) − f(L−1)；进阶可加「已用 6 个数」维度'));
  yield W(700);
  yield S(() => { status.textContent = '1..120 不含数字 6 的个数 = 99'; outT.setText('完成：数位DP 答案 = 99，O(位数×4)；含 4/7 车牌号统计、[L,R] 区间条件计数均适用'); });
  yield W(600);
}

function* runDD() {
  clearView();
  hint.setText('数位DP：f[p][紧][开始] 自底向上填表，答案在 f[0][紧][未开始]');
  yield W(400);
  yield* ddGen();
  yield S(() => { outT.setText(''); hint.setText('数位DP完成：1..120 不含 6 的个数 = 99，O(3×4)'); });
}

panel.addButton('运行演示', () => engine.start(runDD()));
panel.addButton('清空', () => { engine.clear(); clearView(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；红 = 当前位数格子，青 = 计算中状态，金 = 已锁定；上方为上限 120 的三位格子）');

scene.start(engine);
