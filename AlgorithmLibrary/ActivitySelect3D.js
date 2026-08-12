// AlgorithmLibrary/ActivitySelect3D.js — 活动选择（贪心）：按结束时间排序，每次选最早结束且兼容的活动 —— 11 个活动选 4 个（A1,A4,A8,A11）（function* 生成器驱动，步骤数组运行时预计算）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('ActivitySelect3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, ROSE = 0xfb7185, CYAN = 0x67e8f9, WHITE = 0xe2e8f0;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：活动选择 —— 一间教室最多排几个活动？', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');

const K = 24;
const ACTS = [[1, 4], [3, 5], [0, 6], [5, 7], [3, 9], [5, 9], [6, 10], [8, 11], [8, 12], [2, 14], [12, 16]];

const acSteps = (() => {
  const sorted = ACTS.map((a, i) => ({ id: i + 1, s: a[0], f: a[1] })).sort((x, y) => x.f - y.f);
  const steps = [];
  let last = 0;
  for (const a of sorted) {
    const sel = a.s >= last;
    steps.push({ a, sel, last });
    if (sel) last = a.f;
  }
  steps.push({ type: 'final', chosen: steps.filter(s => s.sel).map(s => s.a.id) });
  return steps;
})();
const CHOSEN = acSteps[acSteps.length - 1].chosen;

const bars = ACTS.map((a, i) => {
  const y = 150 - i * 26;
  return new VBox(scene, { w: (a[1] - a[0]) * K - 4, h: 20, d: 20, x: -360 + a[0] * K + 2, y, z: 0, label: 'A' + (i + 1), color: DIM, emissive: DIM });
});
tubeBetween(scene, { x: -360, y: -140, z: 0 }, { x: 24, y: -140, z: 0 }, { color: PALETTE.edge, opacity: 0.5, radius: 1.5 });
[0, 4, 8, 12, 16].forEach(t =>
  new VText(scene, { text: String(t), x: -360 + t * K, y: -160, z: 0, color: PALETTE.textDim, scale: 0.5 }));
new VText(scene, { text: '11 个活动（开始 s, 结束 f）按结束时间排好 —— 一间教室，最多能排几个不冲突的活动？', x: 0, y: 196, z: 0, color: PALETTE.textDim, scale: 0.55 });
new VText(scene, { text: '贪心策略：每次选「结束最早且与已选兼容」的活动 —— 留下的时间最多，后续选择空间最大', x: 0, y: -205, z: 0, color: PALETTE.textDim, scale: 0.62 });
const stageT = new VText(scene, { text: '', x: 0, y: 262, z: 0, color: GOLD, scale: 0.68 });
const outT = new VText(scene, { text: '', x: 0, y: -245, z: 0, color: PALETTE.textGlow, scale: 0.62 });
const totalT = new VText(scene, { text: '', x: 0, y: -170, z: 0, color: GREEN, scale: 0.8 });

function* actGen() {
  yield S(() => { hint.setText('贪心 ≠ 碰运气：要证明「选最早结束」的最优性 —— 任何最优解都能把第一个活动换成它（交换论证）'); });
  yield W(700);
  yield S(() => {
    stageT.setText('指针 last = 已选活动的结束时间；从结束最早的 A1 开始逐个检查');
    hint.setText('检查规则：若活动开始 ≥ last 就选它，并把 last 更新为它的结束时间；否则跳过');
  });
  yield W(700);
  for (const s of acSteps) {
    if (s.type === 'final') break;
    const a = s.a, bar = bars[a.id - 1];
    yield S(() => {
      bar.setColor(s.sel ? CYAN : ROSE, s.sel ? CYAN : ROSE);
      stageT.setText('检查 A' + a.id + '（' + a.s + ' ~ ' + a.f + '）：last = ' + s.last + ' → ' + (s.sel ? '开始 ' + a.s + ' ≥ ' + s.last + '，兼容！' : '开始 ' + a.s + ' < ' + s.last + '，与已选冲突'));
      hint.setText(s.sel ? 'A' + a.id + ' 结束时间 ' + a.f + ' 是在兼容活动里最早的 → 贪心选中它' : 'A' + a.id + ' 与已选活动重叠，跳过（贪心看的是结束时间，不是时长）');
    });
    yield W(550);
    yield S(() => {
      if (s.sel) {
        bar.setColor(GREEN, GREEN);
        bar.setText('✓ 选');
        stageT.setText('选中 A' + a.id + '！last 更新为 ' + a.f + ' —— 已选：' + acSteps.filter(x => x.sel).map(x => 'A' + x.a.id).join('、'));
        hint.setText('已选活动排成一条时间线：互不重叠，且始终保留最大剩余时间');
      } else {
        bar.setColor(DIM, DIM);
        bar.setText('✗ 冲突');
        stageT.setText('A' + a.id + ' 跳过 —— 注意 A' + a.id + ' 时长为 ' + (a.f - a.s) + '，贪心宁可跳过长活动也不破坏兼容性');
      }
    });
    yield W(550);
  }
  yield S(() => {
    CHOSEN.forEach(id => { bars[id - 1].setColor(GREEN, GREEN); bars[id - 1].setText('✓ 选'); });
    totalT.setText('最多可选 ' + CHOSEN.length + ' 个：' + CHOSEN.map(i => 'A' + i).join('、'));
    stageT.setText('扫描完 11 个活动 → 最多 ' + CHOSEN.length + ' 个：A1（1-4）、A4（5-7）、A8（8-11）、A11（12-16）');
    hint.setText('为什么不是 A2/A3/A6？它们开始太早、和已选重叠；结束最早的兼容活动永远不差');
  });
  yield W(1100);
  yield S(() => {
    outT.setText('最多 ' + CHOSEN.length + ' 个活动 —— 若按「开始最早」贪心：A3（0-6）→ A4 → A8 → A11 也是 4 个；但「最短时长」贪心会输，只能选 2 个');
    status.textContent = '活动选择最多 ' + CHOSEN.length + ' 个（A1,A4,A8,A11）';
    hint.setText('最短时长贪心会输：选 A1（1-4）后只能再排 1 个 —— 结束时间才是决定剩余空间的量');
  });
  yield W(1300);
  yield S(() => {
    outT.setText('复杂度 O(n log n)：排序一次 + 线性扫描；应用：会议室排期、CPU 任务调度、区间图着色的贪心基础');
    hint.setText('变体：带权重活动选择用 DP（每个活动「选/不选」取最大），贪心失效的地方就是 DP 登场的地方');
  });
  yield W(1000);
}

engine.queue(() => actGen());
panel.addButton('清空', () => {
  engine.clear();
  bars.forEach(b => { b.setColor(DIM, DIM); b.setText(b.text); });
  stageT.setText(''); outT.setText(''); totalT.setText('');
  hint.setText('已清空，可重新运行'); status.textContent = '';
});
panel.addLabel('（拖拽旋转视角，滚轮缩放；横条 = 活动的时间区间，绿色 = 选中，红色 = 冲突检查）');

scene.start(engine);
