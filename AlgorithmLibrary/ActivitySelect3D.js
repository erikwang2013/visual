// AlgorithmLibrary/ActivitySelect3D.js — 活动选择（贪心）：按结束时间排序，每次选最早结束且兼容的活动 —— 11 个活动选 4 个（A1,A4,A8,A11）（function* 生成器驱动，运行期零 new）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VNode, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('ActivitySelect3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const DIM = 0x334155, GOLD = 0xfcd34d, RED = 0xfb7185;
const status = panel.addStatus('就绪');
const ease = p => p * p * (3 - 2 * p);

const K = 24;
const ACTS = [[1, 4], [3, 5], [0, 6], [5, 7], [3, 9], [5, 9], [6, 10], [8, 11], [8, 12], [2, 14], [12, 16]];

// 预计算：按结束时间升序 + 贪心选择序列（排序后恰好是 A1..A11，展示顺序即检查顺序）
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

const BAR_Y = i => 545 - i * 26;
const AXIS_Y = 252;

// ---- 预建对象（运行期只改 text/color/scale/position/visible，绝不 new）----
const bars = ACTS.map((a, i) => {
  const b = new VBox(scene, { w: (a[1] - a[0]) * K - 4, h: 20, d: 20, x: 130 + a[0] * K, y: BAR_Y(i), z: 0, label: 'A' + (i + 1), color: DIM, emissive: DIM });
  b.mesh.visible = false;
  return b;
});
tubeBetween(scene, { x: 128, y: AXIS_Y, z: 0 }, { x: 512, y: AXIS_Y, z: 0 }, { color: PALETTE.edge, opacity: 0.5, radius: 1.5 });
[0, 4, 8, 12, 16].forEach(t =>
  new VText(scene, { text: String(t), x: 128 + t * K, y: 230, z: 0, color: PALETTE.textDim, scale: 0.5 }));
const lastMarker = new VNode(scene, { radius: 9, x: 128, y: AXIS_Y + 14, z: 0, color: GOLD, emissive: GOLD });
const countT = new VText(scene, { text: '已选 0 个', x: 660, y: 545, z: 0, color: GOLD, scale: 0.6 });

function* actGen() {
  yield S(() => { status.textContent = '活动选择（贪心）：11 个活动已按结束时间升序排好，每根横条 = 一个活动的时间区间。一间教室最多能排几个互不冲突的活动？'; });
  yield W(500);
  for (let i = 0; i < bars.length; i++) {
    bars[i].mesh.visible = true;
    bars[i].mesh.scale.y = 0.05;
    yield A(220, p => { bars[i].mesh.scale.y = 0.05 + 0.95 * ease(p); });
    bars[i].mesh.scale.y = 1;
    yield W(50);
  }
  yield S(() => { status.textContent = '贪心规则：每次选「结束最早且与已选兼容」的活动；last = 已选活动的最晚结束时间，活动开始 ≥ last 才兼容'; });
  yield W(800);
  const chosen = [];
  for (const s of acSteps) {
    if (s.type === 'final') break;
    const a = s.a, bar = bars[a.id - 1];
    yield S(() => {
      status.textContent = '检查 A' + a.id + '（' + a.s + '~' + a.f + '）：last = ' + s.last + '，开始 ' + a.s + (s.sel ? ' ≥ ' + s.last + ' → 兼容，选中' : ' < ' + s.last + ' → 与已选冲突，跳过');
    });
    yield W(550);
    if (s.sel) {
      bar.setColor(GOLD, GOLD);
      bar.setText('A' + a.id + ' ✓');
      lastMarker.moveTo(128 + a.f * K, AXIS_Y + 14, 0, 400);
      yield A(240, p => { const e = Math.sin(p * Math.PI); bar.mesh.scale.set(1 + 0.12 * e, 1 + 0.12 * e, 1); });
      bar.mesh.scale.set(1, 1, 1);
      chosen.push(a.id);
      yield S(() => {
        countT.setText('已选 ' + chosen.length + ' 个');
        status.textContent = '选中 A' + a.id + '（金）！last 更新为 ' + a.f + '，last 指针右移 —— 已选：' + chosen.map(id => 'A' + id).join('、');
      });
      yield W(550);
    } else {
      bar.setColor(RED, RED);
      bar.setText('A' + a.id + ' ✗');
      yield W(300);
      bar.setColor(DIM, DIM);
      bar.setText('A' + a.id);
      yield S(() => { status.textContent = 'A' + a.id + ' 开始 ' + a.s + ' < last = ' + s.last + '，与已选重叠 → 跳过（贪心看结束时间，不看时长）'; });
      yield W(500);
    }
  }
  yield S(() => { status.textContent = '扫描完 11 个活动：最多兼容 ' + CHOSEN.length + ' 个 —— A1(1-4)、A4(5-7)、A8(8-11)、A11(12-16)，1~16 整段时间轴排满'; });
  yield W(1000);
  yield S(() => { status.textContent = '反例：若按「最短时长」贪心先选 A2(3-5)，剩余区间只能再排 1 个 —— 结束时间才是决定剩余空间的量'; });
  yield W(900);
  yield S(() => { status.textContent = 'ActivitySelect 演示完成：11 个活动最多兼容 4 个（A1,A4,A8,A11），1~16 整段时间轴排满；复杂度 O(n log n)（排序 + 线性扫描）'; });
  yield W(900);
}

engine.queue(() => actGen());
panel.addButton('清空', () => {
  engine.clear();
  bars.forEach((b, i) => { b.setColor(DIM, DIM); b.setText('A' + (i + 1)); b.mesh.scale.set(1, 1, 1); });
  lastMarker.tweenPos = null;
  lastMarker.mesh.position.set(128, AXIS_Y + 14, 0);
  countT.setText('已选 0 个');
  status.textContent = '';
});

scene.start(engine);
