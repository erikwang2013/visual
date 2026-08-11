// AlgorithmLibrary/KM3D.js — Kuhn-Munkres（KM）：二分图最大权完美匹配，O(n³) 顶标 + 相等子图
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('KM3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, VIOLET = 0xa78bfa, CYAN = 0x67e8f9, WHITE = 0xe2e8f0;
const hint = new VText(scene, { text: '点击「运行 KM」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const W = [[4, 2, 3], [3, 2, 2], [1, 3, 4]];
const N = 3;

function km() {
  const lx = W.map(r => Math.max(...r));
  const ly = [0, 0, 0];
  const matchR = [-1, -1, -1];
  const steps = [{ type: 'init', lx: [...lx], ly: [...ly], match: [...matchR] }];
  for (let i = 0; i < N; i++) {
    const visL = new Array(N).fill(false);
    const visR = new Array(N).fill(false);
    const slack = [Infinity, Infinity, Infinity];
    const tryEdges = [];
    const dfs = (u) => {
      visL[u] = true;
      for (let v = 0; v < N; v++) {
        if (visR[v]) continue;
        const gap = lx[u] + ly[v] - W[u][v];
        if (gap === 0) {
          visR[v] = true;
          tryEdges.push({ u, v });
          if (matchR[v] === -1 || dfs(matchR[v])) {
            matchR[v] = u;
            steps.push({ type: 'match', u, v, lx: [...lx], ly: [...ly], match: [...matchR] });
            return true;
          }
        } else slack[v] = Math.min(slack[v], gap);
      }
      return false;
    };
    if (!dfs(i)) {
      const d = Math.min(...slack.filter(x => x !== Infinity));
      for (let u = 0; u < N; u++) if (visL[u]) lx[u] -= d;
      for (let v = 0; v < N; v++) if (visR[v]) ly[v] += d;
      steps.push({ type: 'adjust', d, lx: [...lx], ly: [...ly], match: [...matchR] });
      dfs(i);
    }
  }
  return steps;
}
const kmSteps = km();

const cells = [];
for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
  cells.push(new VBox(scene, { w: 44, h: 34, d: 34, x: -60 + j * 66, y: 70 - i * 62, z: 0,
    label: String(W[i][j]), color: DIM, emissive: DIM }));
}
const lxT = [0, 1, 2].map(i => new VText(scene, { text: 'L' + i + ' 顶标=0', x: -160, y: 70 - i * 62, z: 0, color: VIOLET, scale: 0.55 }));
const lyT = [0, 1, 2].map(j => new VText(scene, { text: 'R' + j + ' 顶标=0', x: -60 + j * 66, y: 175, z: 0, color: CYAN, scale: 0.55 }));
const matchT = new VText(scene, { text: '匹配：暂无', x: 0, y: -150, z: 0, color: WHITE, scale: 0.65 });
new VText(scene, { text: '任务：每个 L 配一个 R，且总权重最大 —— 如任务-工人分配、卫星-观测目标分配', x: 0, y: 225, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: '顶标思想：l(u)+l(v) = w 的边组成「相等子图」；只在其上找完美匹配；找不到就调顶标（delta 缩小）', x: 0, y: -185, z: 0, color: PALETTE.textDim, scale: 0.62 });
const stageT = new VText(scene, { text: '', x: 0, y: 255, z: 0, color: GOLD, scale: 0.72 });
const outT = new VText(scene, { text: '', x: 0, y: -220, z: 0, color: PALETTE.textGlow, scale: 0.62 });

function syncState(s) {
  [0, 1, 2].forEach(i => lxT[i].setText('L' + i + ' 顶标=' + s.lx[i], { color: VIOLET }));
  [0, 1, 2].forEach(j => lyT[j].setText('R' + j + ' 顶标=' + s.ly[j], { color: CYAN }));
}
function setCell(i, j, color) { cells[i * N + j].setColor(color, color); }
function resetAll() {
  engine.clear();
  cells.forEach((c, idx) => { c.setColor(DIM, DIM); c.setText(String(W[Math.floor(idx / N)][idx % N])); });
  [0, 1, 2].forEach(i => lxT[i].setText('L' + i + ' 顶标=0', { color: VIOLET }));
  [0, 1, 2].forEach(j => lyT[j].setText('R' + j + ' 顶标=0', { color: CYAN }));
  matchT.setText('匹配：暂无', { color: WHITE });
  stageT.setText(''); outT.setText('');
}

function runKM() {
  resetAll();
  hint.setText('KM 是「带权二分图最大匹配」的标准解：任务分配 / 婚姻匹配 / 分子对接打分');
  C(700, () => {
    lxT.forEach((t, i) => t.setText('L' + i + ' 顶标=' + W[i].reduce((a, b) => Math.max(a, b)), { color: VIOLET }));
    stageT.setText('初始化顶标：l(Lᵢ) = 第 i 行最大值，l(Rⱼ) = 0 —— 保证 l(u)+l(v) ≥ w 恒成立');
    hint.setText('相等子图 = 满足 l(u)+l(v)=w 的边（青色格子），接下来只在这个子图里找完美匹配');
  });
  C(800, () => {
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      if (W[i][j] === Math.max(...W[i])) setCell(i, j, CYAN);
    }
    stageT.setText('相等子图高亮（青色）：L0-R0、L1-R0、L2-R2 三条约束恰好相等');
  });
  for (const s of kmSteps) {
    if (s.type === 'init') continue;
    C(700, () => {
      if (s.type === 'adjust') {
        stageT.setText(`标号调整：delta = ${s.d} → 所有已访问 L 顶标 −${s.d}，已访问 R 顶标 +${s.d}`);
        hint.setText('delta = min 未满约束 gap —— 恰让一条新边进入相等子图，又不破坏已有相等边');
        syncState(s);
      } else {
        const { u, v } = s;
        setCell(u, v, GOLD);
        matchT.setText('匹配：L' + u + '–R' + v + '（' + W[u][v] + ' 权）', { color: GOLD });
        stageT.setText(`增广成功：L${u} 匹配 R${v} —— 交替树沿相等子图回溯，前面的匹配整体换位`);
        hint.setText('相等子图上的增广：最多 O(n) 次匹配尝试 + O(n) 次标号调整 → 总复杂度 O(n³)');
        syncState(s);
      }
    });
  }
  C(1100, () => {
    outT.setText('完美匹配完成：L0–R0(4) + L1–R1(2) + L2–R2(4) = 总权 10 —— 穷举 6 种排列也只有 10，最优');
    status.textContent = 'KM 最大权匹配 = 10（L0-R0, L1-R1, L2-R2）';
    hint.setText('数学保证：顶标始终 ≥ 权重；相等子图一旦有完美匹配，它就是全局最优解');
  });
  C(1200, () => {
    outT.setText('应用：工位排班、任务分发、车辆调度；最小权版本把权重取负即可');
    hint.setText('KM 与匈牙利（无权最大匹配）的关系：匈牙利是 KM 的退化特例（权=0/1）');
  });
}

panel.addButton('运行 KM', runKM);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；3×3 权重矩阵，注意标号调整 delta 出现时青色新边亮起）');

scene.start(engine);
