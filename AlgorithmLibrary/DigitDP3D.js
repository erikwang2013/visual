// AlgorithmLibrary/DigitDP3D.js — 数位DP：统计 1..120 不含数字 6 的个数，f[p][紧][开始] 自底向上填表
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('DigitDP3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, ROSE = 0xfb7185, CYAN = 0x67e8f9, AMBER = 0xfbbf24, WHITE = 0xe2e8f0;
const hint = new VText(scene, { text: '点击「运行数位DP」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const DIGITS = [1, 2, 0];
const N = 3;

function digitDP() {
  const f = Array.from({ length: N + 1 }, () => new Array(4).fill(0));
  const steps = [];
  for (let p = N - 1; p >= 0; p--) {
    for (const [tight, started] of [[1, 1], [0, 1], [1, 0], [0, 0]]) {
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
  steps.push({ type: 'final', total: f[0][0] - 1 });
  return steps;
}
const ddSteps = digitDP();

const slotX = [-70, 0, 70];
const slots = [0, 1, 2].map(i =>
  new VBox(scene, { w: 44, h: 46, d: 46, x: slotX[i], y: 170, z: 0, label: String(DIGITS[i]), color: DIM, emissive: DIM }));
const slotT = [0, 1, 2].map(i =>
  new VText(scene, { text: ['百位', '十位', '个位'][i], x: slotX[i], y: 205, z: 0, color: PALETTE.textDim, scale: 0.5 }));
new VText(scene, { text: '范围 1 ~ 120', x: 165, y: 172, z: 0, color: PALETTE.textGlow, scale: 0.55 });
const cells = [];
const rowY = [60, 5, -50];
const colX = [-150, -50, 50, 150];
for (let p = 0; p < N; p++) for (let idx = 0; idx < 4; idx++) {
  const [tight, started] = [[1, 0], [0, 0], [1, 1], [0, 1]][idx];
  const box = new VBox(scene, { w: 56, h: 32, d: 32, x: colX[idx], y: rowY[p], z: 0, label: '', color: DIM, emissive: DIM });
  cells.push({ p, tight, started, box });
}
new VText(scene, { text: 'f[p][紧][开始]：从第 p 位到个位的「合法后缀」个数 —— 表格一共 3×4 = 12 个状态', x: 0, y: 248, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: '两个维度：紧贴 = 前缀与上限相同则受限；开始 = 已出现非零位（前导 0 不算数字）', x: 0, y: -130, z: 0, color: PALETTE.textDim, scale: 0.62 });
const ansT = new VText(scene, { text: '', x: 0, y: -105, z: 0, color: GOLD, scale: 0.8 });
const stageT = new VText(scene, { text: '', x: 0, y: 265, z: 0, color: GOLD, scale: 0.72 });
const outT = new VText(scene, { text: '', x: 0, y: -175, z: 0, color: PALETTE.textGlow, scale: 0.62 });

function cellOf(p, tight, started) { return cells.find(c => c.p === p && c.tight === tight && c.started === started); }
function resetAll() {
  engine.clear();
  slots.forEach(s => s.setColor(DIM, DIM));
  cells.forEach(c => { c.box.setColor(DIM, DIM); c.box.setText(''); });
  ansT.setText(''); stageT.setText(''); outT.setText('');
}

function runDigitDP() {
  resetAll();
  hint.setText('暴力从 1 数到 120 只要 120 次 —— 但如果上限是 10¹⁸ 呢？数位 DP 只关心「位数」');
  C(700, () => {
    stageT.setText('把 120 拆成 3 个格子：百位 1、十位 2、个位 0；从个位开始自底向上填状态表');
    hint.setText('核心状态：紧贴（前缀等于上限前缀）→ 当前位被上限卡住；否则 0..9 随便填');
  });
  for (const s of ddSteps) {
    const c = cellOf(s.p, s.tight, s.started);
    C(650, () => {
      c.box.setColor(CYAN, CYAN);
      slots[s.p].setColor(ROSE, ROSE);
      stageT.setText(`f[${s.p}][${s.tight ? '紧' : '松'}][${s.started ? '开始' : '未开始'}]：该位可填 0..${s.max}（${s.tight ? '紧贴上限制' : '放松，随便填'}），跳过 6`);
      hint.setText('候选 = [' + s.opts.map(o => o.skip ? 'd=6✗' : 'd' + o.d + '→' + o.v).join('，') + ']');
    });
    C(600, () => {
      c.box.setText(String(s.val));
      c.box.setColor(GOLD, GOLD);
      slots[s.p].setColor(DIM, DIM);
      stageT.setText(`f[${s.p}][${s.tight ? '紧' : '松'}][${s.started ? '开始' : '未开始'}] = ${s.val}：下一位状态值求和（金色锁定）`);
      hint.setText('转移：d=上限位 且 原紧贴 → 仍紧贴；d>0 → 变为「已开始」');
    });
  }
  C(900, () => {
    ansT.setText('f[0][紧][未开始] = 100 → 减去全 0 那一个 → 1..120 不含 6 的个数 = 99');
    stageT.setText('答案就在左上格 f[0][紧][未开始] = 100（0..120 共 100 个），减 1 得 99');
    hint.setText('对照暴力：1..120 共 120 个数，含 6 的有 21 个（6,16,26,36,46,56,60..69,76,86,96,106,116）→ 120−21 = 99 ✓');
  });
  C(1100, () => {
    outT.setText('统计结果 = 99 —— 复杂度 O(位数 × 4)：上限 10¹⁸ 也只要算 18×4 = 72 个状态，与数字大小无关');
    status.textContent = '1..120 不含数字 6 的个数 = 99';
    hint.setText('应用：不含 4/7 的车牌号统计、区间 [L,R] 内满足条件数的个数（= f(R) − f(L−1)）');
  });
  C(1200, () => {
    outT.setText('进阶：还能带「已用 6 的个数」维度统计恰好 k 个 6 的数；数位 DP 是数字统计的万能模板');
    hint.setText('记忆化递归写法等价于这张表：同一状态只算一次，这就是「DP」与「枚举」的分水岭');
  });
}

panel.addButton('运行数位DP', runDigitDP);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；上排 = 上限 120 的位数格子，下方 3×4 状态表从个位向上填）');

scene.start(engine);
