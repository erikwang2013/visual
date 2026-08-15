// AlgorithmLibrary/QLearning3D.js — Q-Learning：4 格走廊试错 + 奖励回传，学出最优路径（function* 生成器驱动，Q 表逐轮更新）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('QLearning3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x60a5fa, ROSE = 0xfb7185, DIM = 0x334155;
const status = panel.addStatus('就绪');
const ease = p => p * p * (3 - 2 * p);

const SX = [80, 240, 400, 560], SY = 460;
const states = SX.map((x, i) => new VBox(scene, { w: 80, h: 80, d: 80, x, y: SY, z: 0, label: 's' + i, color: i === 3 ? GREEN : DIM, emissive: i === 3 ? GREEN : 0 }));
// 动作箭头（蓝=右行，红=左行）
const mkArrow = (x1, x2, y, color, lbl) => {
  const b = new VBox(scene, { w: 150, h: 6, d: 6, x: (x1 + x2) / 2, y, z: 0, label: lbl, color, emissive: color });
  b.mesh.scale.set(80 / 150, 1, 1);
  b.mesh.visible = false;
  return b;
};
const rightArrows = [0, 1, 2].map(i => mkArrow(SX[i] + 40, SX[i + 1] - 40, SY + 48, BLUE, '→'));
const leftArrow = mkArrow(SX[3] - 40, SX[2] + 40, SY - 48, ROSE, '←');

// 智能体（黄块）
const agent = new VBox(scene, { w: 36, h: 36, d: 36, x: SX[0], y: SY, z: 0, label: 'agent', color: YELLOW, emissive: YELLOW });

// Q 表（每状态一行，[右行, 左行]）
const qT = SX.map((x, i) => new VText(scene, { text: 'Q(s' + i + ') = [' + (i === 0 || i === 3 ? '0, —' : '0, 0') + ']', x, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.6 }));

// 4 轮 Q 表快照（lr=0.5，γ=0.9；每轮向右到终点拿 +10 后回退一步）
const EP = [
  [[0, null], [0, 0], [5, 0], [null, 2.25]],
  [[0, null], [2.25, 0], [8.51, 0], [null, 4.96]],
  [[1.01, null], [4.96, 0], [11.49, 0], [null, 7.65]],
  [[2.74, null], [7.65, 0], [14.18, 0], [null, 10.21]]
];
const EP_TXT = [
  '第 1 轮：Q 表全 0，一路向右探索 → 到终点得 R=+10：Q(s₂,→)=0.5·10=5；回退一步：Q(s₃,←)=0.5·0.9·5=2.25（奖励首次入表）',
  '第 2 轮：奖励回传 — Q(s₁,→)=0.5·0.9·5=2.25；Q(s₂,→)=5+0.5·(10+0.9·2.25−5)=8.51；Q(s₃,←)=2.25+0.5·(0.9·8.51−2.25)=4.96',
  '第 3 轮：价值继续向起点传播 — Q(s₀,→)=0.5·0.9·2.25=1.01；Q(s₁,→)=2.25+0.5·(0.9·8.51−2.25)=4.96；Q(s₂,→)=8.51+0.5·(10+0.9·4.96−8.51)=11.49',
  '第 4 轮：Q 表趋稳 — Q(s₀,→)=1.01+0.5·(0.9·4.96−1.01)=2.74，Q(s₂,→)=11.49+0.5·(10+0.9·7.65−11.49)=14.18 最大 → 最优策略：每步向右'
];

function fmt(v) { return v === null ? '—' : String(Number(v.toFixed(2))); }
function showQ(ep) {
  ep.forEach((row, i) => qT[i].setText('Q(s' + i + ') = [' + fmt(row[0]) + ', ' + fmt(row[1]) + ']'));
}
function resetAll() {
  states.forEach((b, i) => b.setColor(i === 3 ? GREEN : DIM, i === 3 ? GREEN : 0));
  [...rightArrows, leftArrow].forEach(b => { b.mesh.visible = false; });
  agent.mesh.position.set(SX[0], SY, 0);
  qT.forEach((t, i) => t.setText('Q(s' + i + ') = [' + (i === 0 || i === 3 ? '0, —' : '0, 0') + ']'));
}

function* episode(k, note, details) {
  yield S(() => {
    agent.mesh.position.x = SX[0];
    status.textContent = k === 1 ? '第 1 轮：从起点 s₀ 出发（Q 表全 0，一路向右探索）' : '第 ' + k + ' 轮：回到起点 s₀，再次向右（奖励逐步回传）';
  });
  yield W(450);
  for (let j = 0; j < 3; j++) {
    yield S(() => { rightArrows[j].mesh.visible = true; status.textContent = details ? details[j] : '第 ' + k + ' 轮：向右移动（' + (j + 1) + '/3）'; });
    yield A(360, p => { agent.mesh.position.x = SX[j] + (SX[j + 1] - SX[j]) * ease(p); });
    yield W(220);
  }
  yield S(() => { leftArrow.mesh.visible = true; status.textContent = '第 ' + k + ' 轮：回退一步 s₃→s₂，奖励向起点传播'; });
  yield A(340, p => { agent.mesh.position.x = SX[3] + (SX[2] - SX[3]) * ease(p); });
  yield W(220);
  yield S(() => { showQ(EP[k - 1]); status.textContent = note; });
  yield W(750);
}

function* runQLearning() {
  resetAll();
  yield S(() => { status.textContent = 'Q-Learning：智能体在 4 格走廊试错（s₃ 终点奖励 +10），把奖励沿路径回传，学出最优策略（lr=0.5，γ=0.9）'; });
  yield W(800);
  yield* episode(1, EP_TXT[0], ['s₀→s₁：Q(s₀,→)=0.5·(0+0.9·0−0)=0', 's₁→s₂：Q(s₁,→)=0（还没尝到甜头）', 's₂→s₃：到达终点，拿到奖励 R=+10！']);
  yield* episode(2, EP_TXT[1], null);
  yield* episode(3, EP_TXT[2], null);
  yield* episode(4, EP_TXT[3], null);
  yield S(() => { status.textContent = 'QLearning 演示完成：4 轮迭代后 Q(s₂,→)=14.18 最大，最优策略 = 每步向右直达终点（累计 +10）；复杂度：每轮 O(S·A)，收敛需多轮迭代'; });
  yield W(800);
}

engine.queue(() => runQLearning());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
