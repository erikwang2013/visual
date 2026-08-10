// AlgorithmLibrary/SkipList3D.js — 跳表：多层有序链表加速查找（向下向右搜索）
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('SkipList3D');

const scene = new Scene3D('scene', { cameraPos: [0, 420, 640], fov: 50 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const KEY = 9;
const GREEN = 0x4ade80, YELLOW = 0xfacc15, DIM = 0x475569;
// 每层包含的节点值（自顶向下 L3 → L0），下层必然包含上层值
const LANES = [[3, 17, 25], [3, 9, 17, 25], [3, 6, 9, 12, 17, 19, 22, 25], [3, 6, 9, 12, 17, 19, 22, 25, 28]];
const LANE_Y = [190, 130, 70, 10];
const vx = v => -300 + v * 20;
const laneBoxes = [];
const hint = new VText(scene, { text: '点击「运行跳表」开始：查找 ' + KEY, x: 0, y: 280, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

LANES.forEach((vals, l) => {
  new VText(scene, { text: 'L' + l, x: -350, y: LANE_Y[l], z: 0, color: PALETTE.textDim, scale: 0.7 });
  laneBoxes[l] = [];
  vals.forEach(v => {
    laneBoxes[l].push(new VBox(scene, { w: 34, h: 34, d: 34, x: vx(v), y: LANE_Y[l], z: 0, label: String(v), color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
  });
  for (let k = 0; k + 1 < vals.length; k++) {
    tubeBetween(scene, [vx(vals[k]), LANE_Y[l], 0], [vx(vals[k + 1]), LANE_Y[l], 0], { color: PALETTE.edge, radius: 2, opacity: 0.35 });
  }
});
const seqBox = new VBox(scene, { w: 40, h: 40, d: 40, x: 345, y: 10, z: 0, label: String(KEY), color: PALETTE.orange, emissive: PALETTE.orange });
new VText(scene, { text: '目标', x: 345, y: 65, z: 0, color: PALETTE.textDim, scale: 0.65 });
const info = new VText(scene, { text: '', x: 0, y: -80, z: 0, color: PALETTE.text, scale: 0.8 });

function resetAll() {
  engine.clear();
  for (const l of laneBoxes) for (const b of l) b.setColor(PALETTE.node, PALETTE.nodeEmissive);
  seqBox.setColor(PALETTE.orange, PALETTE.orange);
  info.setText('');
}

function runSkipList() {
  resetAll();
  hint.setText('跳表查找 ' + KEY + '：从顶层 L3 开始向右，遇到比 KEY 大的节点就沿其前驱下移一层');
  const steps = [];
  let comps = 0;
  for (let l = 3, startIdx = 0; l >= 0; l--) {
    const vals = LANES[l];
    let k = startIdx, found = false;
    for (; k < vals.length; k++) {
      const v = vals[k];
      comps++;
      if (v === KEY) { steps.push({ t: 'visit', l, v, found: true }); found = true; break; }
      if (v < KEY) { steps.push({ t: 'visit', l, v, found: false }); continue; }
      steps.push({ t: 'nxt', l, v });
      break;
    }
    if (found || l === 0) break;
    const from = vals[k > 0 ? k - 1 : 0];
    startIdx = Math.max(0, LANES[l - 1].indexOf(from));
    steps.push({ t: 'down', l, from });
  }

  let i = 0;
  const step = () => {
    if (i >= steps.length) {
      status.textContent = '跳表查找完成：找到 ' + KEY + '，共比较 ' + comps + ' 次（顺序查找需 ' + LANES[0].length + ' 次）';
      hint.setText('找到 ' + KEY + '！比较 ' + comps + ' 次，跳过了 ' + (LANES[0].length - comps) + ' 个无关元素');
      info.setText('L0 全链表共 ' + LANES[0].length + ' 个元素；跳表借助高层“跳跃指针”只需比较 ' + comps + ' 个');
      seqBox.setColor(GREEN, GREEN);
      return;
    }
    const e = steps[i]; i++;
    if (e.t === 'visit') {
      const box = laneBoxes[e.l][LANES[e.l].indexOf(e.v)];
      box.setColor(YELLOW, YELLOW);
      hint.setText('L' + e.l + '：节点 ' + e.v + ' < ' + KEY + '，继续向右');
      C(420, () => { if (!e.found) box.setColor(PALETTE.node, PALETTE.nodeEmissive); step(); });
    } else if (e.t === 'nxt') {
      const box = laneBoxes[e.l][LANES[e.l].indexOf(e.v)];
      box.setColor(DIM, DIM);
      hint.setText('L' + e.l + '：下一个 ' + e.v + ' > ' + KEY + '，沿前驱下移一层');
      C(480, () => { box.setColor(PALETTE.node, PALETTE.nodeEmissive); step(); });
    } else {
      hint.setText('下移到 L' + (e.l - 1) + '，从 ' + e.from + ' 继续向右');
      C(300, step);
    }
  };
  step();
}

panel.addButton('运行跳表', runSkipList);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
