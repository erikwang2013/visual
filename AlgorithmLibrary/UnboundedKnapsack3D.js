// AlgorithmLibrary/UnboundedKnapsack3D.js — 完全背包：dp[w] = max(dp[w-wi]+vi)，每种物品无限件，回溯最优组合
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('UnboundedKnapsack3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, ROSE = 0xfb7185, CYAN = 0x67e8f9, WHITE = 0xe2e8f0;
const hint = new VText(scene, { text: '点击「运行完全背包」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const ITEMS = [
  { id: 'A', w: 3, v: 4 },
  { id: 'B', w: 5, v: 8 },
  { id: 'C', w: 4, v: 6 }
];
const CAP = 10;

function unboundedKnapsack() {
  const dp = new Array(CAP + 1).fill(0);
  const pick = new Array(CAP + 1).fill(-1);
  const steps = [];
  for (let w = 1; w <= CAP; w++) {
    const cands = [];
    let best = 0, bf = -1;
    for (const it of ITEMS) {
      if (w >= it.w) {
        const v = dp[w - it.w] + it.v;
        cands.push({ id: it.id, v });
        if (v > best) { best = v; bf = it.id; }
      }
    }
    dp[w] = best; pick[w] = bf;
    steps.push({ w, cands, best, bf, dp: [...dp] });
  }
  let w = CAP;
  const comb = [];
  while (w > 0 && pick[w] !== -1) {
    const it = ITEMS.find(i => i.id === pick[w]);
    comb.push(it.id);
    w -= it.w;
  }
  steps.push({ type: 'final', total: dp[CAP], comb, dp });
  return steps;
}
const ubSteps = unboundedKnapsack();

const items = ITEMS.map((it, i) => ({
  box: new VBox(scene, { w: 110, h: 46, d: 46, x: -400, y: 130 - i * 85, z: 0, label: it.id, color: DIM, emissive: DIM }),
  info: new VText(scene, { text: `重量 ${it.w} · 价值 ${it.v}`, x: -400, y: 130 - i * 85 + 40, z: 0, color: PALETTE.textDim, scale: 0.5 })
}));
const slots = [];
for (let w = 1; w <= CAP; w++) {
  slots.push(new VBox(scene, { w: 42, h: 40, d: 40, x: -270 + (w - 1) * 60, y: 180, z: 0, label: String(w), color: DIM, emissive: DIM }));
}
const capT = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((w, i) =>
  new VText(scene, { text: '容量' + w, x: -270 + i * 60, y: 212, z: 0, color: PALETTE.textDim, scale: 0.45 }));
new VText(scene, { text: '背包容量 = 10，三种物品各无限件 —— 怎么装价值最大？', x: 0, y: 248, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: '完全背包：dp[w] = max(dp[w-wi] + vi) —— 容量从小到大填，同一物品可反复用（与 0/1 背包唯一区别）', x: 0, y: -130, z: 0, color: PALETTE.textDim, scale: 0.62 });
const dpT = new VText(scene, { text: '', x: 0, y: -40, z: 0, color: GOLD, scale: 0.8 });
const stageT = new VText(scene, { text: '', x: 0, y: 265, z: 0, color: GOLD, scale: 0.72 });
const outT = new VText(scene, { text: '', x: 0, y: -175, z: 0, color: PALETTE.textGlow, scale: 0.62 });

function resetAll() {
  engine.clear();
  items.forEach(it => { it.box.setColor(DIM, DIM); it.box.setText(it.box.text); });
  slots.forEach(s => { s.setColor(DIM, DIM); s.setText(s.text); });
  dpT.setText(''); stageT.setText(''); outT.setText('');
}

function runUnbounded() {
  resetAll();
  hint.setText('0/1 背包每个物品最多一次；完全背包不同 —— 同一件可以装无数次，转移只看「最后装的那个」');
  C(700, () => {
    stageT.setText('把 dp[0..10] 全部初始化为 0；从容量 1 开始逐个计算，每个容量选「最后一个物品」使价值最大');
    hint.setText('为什么能这样？dp[w] 只关心容量 w 的最优价值，装了几件、顺序如何都无所谓 —— 子结构最优');
  });
  for (const s of ubSteps) {
    if (s.type === 'final') break;
    C(550, () => {
      slots[s.w - 1].setColor(CYAN, CYAN);
      if (s.cands.length === 0) {
        stageT.setText(`容量 ${s.w}：所有物品都放不下 → dp[${s.w}] = 0`);
        hint.setText('容量比任何物品都小，只能空着 —— 空手也是一种方案');
      } else {
        stageT.setText(`容量 ${s.w}：候选 = [${s.cands.map(c => '装' + c.id + '→' + c.v).join('，')}] → 取最大 ${s.best}`);
        hint.setText(`转移：dp[${s.w}] = max(dp[${s.w}-重] + 价)，候选对应「最后装的一件」—— 完全背包正着扫容量，允许同物多次`);
      }
    });
    C(550, () => {
      slots[s.w - 1].setColor(GOLD, GOLD);
      slots[s.w - 1].setText(String(s.best));
      dpT.setText('dp 表 = [' + s.dp.join(', ') + ']');
      stageT.setText(`dp[${s.w}] = ${s.best}（装 ${s.bf || '—'}）—— 金色锁定，后续容量直接复用`);
      hint.setText('注意 dp[8]：8 = 5+3 → B+A = 12，比两个 C（6+6=12）并列 —— 只记录第一个最大即可');
    });
  }
  const fin = ubSteps[ubSteps.length - 1];
  C(900, () => {
    stageT.setText('回溯：从 dp[10] 开始，每步减掉「最后一个物品」的重量 → ' + fin.comb.join('+') + ' 直到容量耗尽');
    hint.setText('pick 表记录每个容量最后装的物品 —— 有 pick 才能从价值反推出「怎么装」');
  });
  C(1000, () => {
    dpT.setText('最终 dp 表 = [' + fin.dp.join(', ') + ']');
    stageT.setText('答案 = dp[10] = ' + fin.total + '：' + fin.comb.join(' + ') + ' = ' + fin.comb.map(id => ITEMS.find(i => i.id === id).w).join(' + ') + ' = 10 装得下');
    hint.setText('B(8) 的价值密度 = 1.6 最高 → 5+5 = 10 正好装满，价值 16 —— 密度最高的物品最划算');
  });
  C(1100, () => {
    outT.setText('完全背包最优 = ' + fin.total + '（2×B）—— 若每个物品最多一件（0/1 背包）只能 B+C = 8+6 = 14，差 2');
    status.textContent = '完全背包最大价值 = ' + fin.total + '（B+B）';
    hint.setText('0/1 背包要倒着扫容量（防止重复用）；完全背包正着扫 —— 一行代码之差，语义完全不同');
  });
  C(1300, () => {
    outT.setText('复杂度 O(n·W) 时间、O(W) 空间；变体：物品个数受限 → 多重背包（二进制拆分）；价值密度贪心只在部分情况最优');
    hint.setText('应用：零钱兑换、原材料切割、货运装箱 —— 「无限供应」场景都是完全背包');
  });
}

panel.addButton('运行完全背包', runUnbounded);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；左侧 = 无限量物品（重量·价值），上排 = 容量 1..10 的 dp 槽）');

scene.start(engine);
