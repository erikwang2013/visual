// AlgorithmLibrary/QLearning3D.js — Q-Learning：试错 + 奖励回传，学出最优路径（function* 生成器驱动）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('QLearning3D');

const scene = new Scene3D('scene', { cameraPos: [0, 330, 640], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, ROSE = 0xfb7185, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「运行演示」开始：Q-Learning', x: 0, y: 255, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');

const SX = [-240, -80, 80, 240];
const states = SX.map((x, i) => new VBox(scene, { w: 80, h: 80, d: 80, x, y: 90, z: 0, label: 's' + i, color: i === 3 ? GREEN : DIM, emissive: i === 3 ? GREEN : 0 }));
new VText(scene, { text: '终点奖励 +10', x: 240, y: 190, z: 0, color: GREEN, scale: 0.6 });
new VText(scene, { text: '4 格走廊：从 s₀ 出发，到达 s₃ 得 +10', x: -40, y: 190, z: 0, color: PALETTE.textDim, scale: 0.6 });

// 右行箭头（蓝）与左行箭头（红）
const arrow = (x1, x2, y, color) => {
  const b = new VBox(scene, { w: 150, h: 6, d: 6, x: (x1 + x2) / 2, y, z: 0, label: '→', color, emissive: color });
  b.mesh.scale.set(80 / 150, 1, 1);
  b.mesh.visible = false;
  return b;
};
const rightArrows = [0, 1, 2].map(i => arrow(SX[i] + 40, SX[i + 1] - 40, 122, BLUE));
const leftArrow = arrow(SX[3] - 40, SX[2] + 40, 58, ROSE);

// 智能体（黄块）
const agent = new VBox(scene, { w: 36, h: 36, d: 36, x: SX[0], y: 90, z: 0, label: 'agent', color: YELLOW, emissive: YELLOW });

// Q 表显示（每状态一行）
const qT = SX.map((x, i) => new VText(scene, { text: 'Q(s' + i + ') = [0, 0]', x, y: -30, z: 0, color: PALETTE.textGlow, scale: 0.6 }));
new VText(scene, { text: 'Q(s,a) ← Q(s,a) + lr·(R + γ·maxQ(s′) − Q(s,a))    lr = 0.5，γ = 0.9', x: 0, y: -110, z: 0, color: PALETTE.textDim, scale: 0.6 });

const stepT = new VText(scene, { text: '', x: 0, y: -175, z: 0, color: PALETTE.textGlow, scale: 0.75 });

// 三轮 Q 表快照（ml_validate.mjs 实际运行输出）
const EP = [
  [[0, 0], [0, 0], [0, 5], [5, 0]],
  [[0, 0], [0, 2.25], [0, 9.75], [9.75, 0]],
  [[0, 1.01], [0, 5.51], [0, 14.26], [14.26, 0]]
];

function fmt(v) { return String(Number(v.toFixed(2))); }
function showQ(ep) {
  ep.forEach((row, i) => qT[i].setText('Q(s' + i + ') = [' + fmt(row[0]) + ', ' + fmt(row[1]) + ']'));
}
function agentAt(i) {
  states[i].setColor(YELLOW, YELLOW);
}

function resetAll() {
  states.forEach((b, i) => b.setColor(i === 3 ? GREEN : DIM, i === 3 ? GREEN : 0));
  [...rightArrows, leftArrow].forEach(b => (b.mesh.visible = false));
  agent.mesh.position.set(SX[0], 90, 0);
  qT.forEach((t, i) => t.setText('Q(s' + i + ') = [0, 0]'));
  stepT.setText('');
}

function* qGen() {
  resetAll();
  yield S(() => hint.setText('Q-Learning：不断试错，把终点的奖励沿状态一步步"回传"到起点'));
  yield S(() => { stepT.setText('ep1：智能体从 s₀ 出发，一路向右探索（Q 表全 0 起步）'); });
  yield W(500);
  for (const i of [0, 1, 2]) {
    yield S(() => { rightArrows[i].mesh.visible = true; });
    yield A(450, p => agent.mesh.position.set(SX[i] + (SX[i + 1] - SX[i]) * p, 90, 0));
    yield S(() => {
      agentAt(i + 1);
      stepT.setText(i === 0 ? 's₀ → s₁：Q(s₀,→) = 0.5·0 + 0.5·(0 + 0.9·maxQ(s₁)) = 0'
        : i === 1 ? 's₁ → s₂：同样 Q(s₁,→) = 0 — 还没尝到甜头'
        : 's₂ → s₃：到达终点，拿到奖励 R = +10！');
    });
    yield W(350);
  }
  yield S(() => {
    showQ(EP[0]);
    stepT.setText('ep1 结束：Q(s₂,→) = 0.5·0 + 0.5·(10 + 0) = 5；回程 Q(s₃,←) = 5（奖励首次入表）');
  });
  yield W(650);
  yield S(() => {
    showQ(EP[1]);
    stepT.setText('ep2：奖励沿路径回传 — Q(s₂,→) = 0.5·5 + 0.5·(10 + 0.9·maxQ(s₃)) = 9.75，Q(s₁,→) = 2.25');
  });
  yield W(650);
  yield S(() => {
    showQ(EP[2]);
    stepT.setText('ep3：价值从终点一路传回起点 — Q(s₀,→) = 1.01，Q(s₁,→) = 5.51，Q(s₂,→) = 14.26');
  });
  yield W(650);
  yield S(() => {
    status.textContent = 'Q-Learning 完成：3 轮后 Q(s₂,→) = 14.26 最大 → 最优策略：每步向右，一路拿 +10';
    hint.setText('Q-Learning 无需环境模型，靠奖励回传学会策略 — 游戏 AI、路径规划的基础');
  });
  yield W(600);
}

panel.addButton('运行演示', () => engine.start(qGen()));
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；黄块=智能体，箭头=可选动作，Q 表在下方逐轮更新）');

scene.start(engine);
