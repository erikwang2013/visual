// AlgorithmLibrary/LogisticRegression3D.js — 逻辑回归：sigmoid + 梯度下降求决策边界
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('LogisticRegression3D');

const scene = new Scene3D('scene', { cameraPos: [0, 360, 680], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, ROSE = 0xfb7185, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「训练模型」开始', x: 0, y: 260, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const PTS = [[-3, 1, 1], [-2, 2, 1], [-1, 0.5, 1], [1, -1, 0], [2, -2, 0], [3, -0.5, 0]];
const PX = v => v * 62, PY = v => -v * 55;
const ptBoxes = [];
for (let i = 0; i < PTS.length; i++) {
  const [x, y, lab] = PTS[i];
  ptBoxes.push(new VBox(scene, { w: 34, h: 34, d: 34, x: PX(x), y: PY(y), z: 0, label: '', color: lab ? GREEN : ROSE, emissive: lab ? GREEN : ROSE }));
}
new VText(scene, { text: '训练集：6 个样本（绿=正例 1，红=负例 0）', x: 0, y: 195, z: 0, color: PALETTE.textDim, scale: 0.7 });
const line = new VBox(scene, { w: 200, h: 4, d: 4, x: 0, y: 0, z: 0, label: '', color: YELLOW, emissive: YELLOW });
line.mesh.visible = false;
const stepT = new VText(scene, { text: '', x: 0, y: 60, z: 0, color: PALETTE.textGlow, scale: 0.8 });
const lossT = new VText(scene, { text: '', x: 0, y: -40, z: 0, color: PALETTE.textDim, scale: 0.7 });
const eqT = new VText(scene, { text: '', x: 0, y: -110, z: 0, color: PALETTE.textDim, scale: 0.7 });

const W_ROUNDS = [[0, -0.6, 0.35], [0.002, -0.779, 0.462], [0.005, -0.898, 0.538]];
const LOSS = [0.204, 0.143, 0.114];

function placeLine(w) {
  const [b, w1, w2] = w;
  const y1 = -(w1 * -3 + b) / w2, y2 = -(w1 * 3 + b) / w2;
  const p1 = { x: PX(-3), y: PY(y1) }, p2 = { x: PX(3), y: PY(y2) };
  const cx = (p1.x + p2.x) / 2, cy = (p1.y + p2.y) / 2;
  const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  line.mesh.rotation.z = Math.atan2(p2.y - p1.y, p2.x - p1.x);
  line.mesh.scale.set(len / 200, 1, 1);
  line.mesh.position.set(cx, cy, 0);
}

function resetAll() {
  engine.clear();
  for (let i = 0; i < PTS.length; i++) { ptBoxes[i].setColor(PTS[i][2] ? GREEN : ROSE, PTS[i][2] ? GREEN : ROSE); }
  line.mesh.visible = false;
  stepT.setText(''); lossT.setText(''); eqT.setText('');
}

function runTrain() {
  resetAll();
  hint.setText('逻辑回归：p = σ(w₁x + w₂y + b)，σ 把分数压到 0..1，交叉熵作损失');
  C(200, () => { for (let i = 0; i < PTS.length; i++) ptBoxes[i].setColor(PTS[i][2] ? GREEN : ROSE, PTS[i][2] ? GREEN : ROSE); });
  C(900, () => {
    stepT.setText('初始化 w = [b, w₁, w₂] = [0, 0, 0] → 每个点 p = σ(0) = 0.5，边界无法分类');
    lossT.setText('平均交叉熵损失 = 0.693（最大熵：全部预测 0.5）');
  });
  C(1000, () => {
    hint.setText('梯度下降：w ← w − lr·∂L/∂w，沿损失下降方向逐步修正边界');
    gradStep(0);
  });

  function gradStep(k) {
    if (k >= 3) {
      C(800, () => {
        line.setColor(GREEN, GREEN);
        stepT.setText('训练完成：w = [0.005, −0.898, 0.538] → 边界 w₁x + w₂y + b = 0');
        lossT.setText('损失 0.204 → 0.143 → 0.114 持续下降 ✓  正例全部在边界上方');
        status.textContent = '逻辑回归完成：6 样本训练 3 轮，损失 0.204→0.114，决策边界收敛';
        hint.setText('预测新样本：代入 σ(w·x+b)，p ≥ 0.5 判正例（垃圾邮件识别/信用评分都在用）');
      });
      return;
    }
    const w = W_ROUNDS[k];
    C(150, () => {
      line.mesh.visible = true;
      placeLine(w);
      stepT.setText('梯度下降第 ' + (k + 1) + ' 轮：梯度方向（p−y 加权）更新权重 → 边界旋转挪移');
    });
    C(750, () => {
      eqT.setText('w = [' + w.map(v => v.toFixed(3)).join(', ') + ']   平均损失 = ' + LOSS[k].toFixed(3));
      lossT.setText('本轮损失 = ' + LOSS[k].toFixed(3) + '（比上轮' + (k === 0 ? '' : ' ↓') + '，边界向正例/负例分界处推进）');
      gradStep(k + 1);
    });
  }
}

panel.addButton('训练模型', runTrain);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；σ 函数输出概率，交叉熵衡量预测与真实标签的偏差）');

scene.start(engine);
