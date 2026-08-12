// AlgorithmLibrary/FIFO3D.js — 先进先出页面置换：先装进来的页面最先被换出 —— 队列语义，实现最简单，但有 Belady 异常（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('FIFO3D');

const scene = new Scene3D('scene', { cameraPos: [0, 260, 700], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「运行演示」开始：FIFO —— 先装进来的页面先被换出', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 262, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: 150, z: 0, color: PALETTE.textGlow, scale: 0.5 });
const outT = new VText(scene, { text: '', x: 0, y: -235, z: 0, color: PALETTE.textGlow, scale: 0.62 });

const REF = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1];
const FRAME_X = [-220, 0, 220];
const chips = REF.map((v, i) => new VBox(scene, { w: 40, h: 26, d: 26, x: -400 + i * 48, y: 220, z: 0, label: String(v), color: DIM, emissive: DIM }));
const frames = FRAME_X.map(x => new VBox(scene, { w: 100, h: 70, d: 70, x, y: 70, z: 0, label: '空', color: BLUE, emissive: BLUE }));
let slots = [-1, -1, -1];

function* fifoGen() {
  yield S(() => { hint.setText('FIFO：先装进来的页面最先被换出 —— 队列语义，实现最简单，但会引发 Belady 异常'); stageT.setText('引用串：' + REF.join(',') + '；3 个页框 —— 每次缺页都换出「最早装入」的页'); });
  yield W(800);
  let faults = 0;
  const orderQ = [];
  for (let i = 0; i < REF.length; i++) {
    const v = REF[i];
    chips[i].setColor(GOLD, GOLD);
    yield W(260);
    const fi = slots.indexOf(v);
    if (fi >= 0) {
      frames[fi].setColor(GOLD, GOLD);
      yield S(() => { stageT.setText('t=' + (i + 1) + '：引用 ' + v + ' —— 命中（已在帧 ' + fi + '，不动队列）'); eqT.setText('缺页 ' + faults + ' 次；队列：' + orderQ.map(f => slots[f]).join(' → ')); });
      yield W(650);
      frames[fi].setColor(BLUE, BLUE);
    } else {
      faults++;
      const ei = slots.indexOf(-1);
      let vi, victim = -1;
      if (ei >= 0) { vi = ei; }
      else { vi = orderQ.shift(); victim = slots[vi]; }
      if (victim >= 0) {
        frames[vi].setColor(RED, RED);
        frames[vi].moveTo(FRAME_X[vi], 25, 0, 320);
        yield S(() => { stageT.setText('t=' + (i + 1) + '：引用 ' + v + ' —— 缺页！换出最早装入的 ' + victim + '（帧 ' + vi + '）'); eqT.setText('缺页 ' + faults + ' 次；队列：' + orderQ.map(f => slots[f]).join(' → ') + '（先入先出）'); });
        yield W(320);
      } else {
        yield S(() => { stageT.setText('t=' + (i + 1) + '：引用 ' + v + ' —— 缺页！装入空帧 ' + vi); eqT.setText('缺页 ' + faults + ' 次；队列：' + orderQ.map(f => slots[f]).join(' → ')); });
      }
      slots[vi] = v;
      orderQ.push(vi);
      frames[vi].moveTo(FRAME_X[vi], 70, 0, 320);
      frames[vi].setText(String(v));
      frames[vi].setColor(GOLD, GOLD);
      yield W(320);
      frames[vi].setColor(BLUE, BLUE);
    }
    chips[i].setColor(DIM, DIM);
    yield W(300);
  }
  yield S(() => { outT.setText('FIFO 缺页 = ' + faults + ' 次（20 次引用 / 3 帧，命中 ' + (20 - faults) + ' 次）'); status.textContent = 'FIFO 缺页 ' + faults + ' 次'; hint.setText('Belady 异常：增加帧数反而可能缺页更多 —— FIFO 不满足栈性质；LRU 绝对不会'); });
  yield W(1100);
  yield S(() => { hint.setText('复杂度 O(1)。应用：最简单的置换策略，常作对比基线 —— 现代 OS 多用它的改良版 CLOCK'); outT.setText('对比同引用串：LRU = 12，LFU = 13，FIFO = 15 —— FIFO 最差但实现最便宜'); });
  yield W(1100);
  yield S(() => { hint.setText('FIFO 演示完成：先进先出，缺页 ' + faults + ' 次'); outT.setText(''); });
  yield W(400);
}

function* runFIFO() {
  hint.setText('FIFO：先进先出');
  yield W(400);
  yield* fifoGen();
}

panel.addButton('运行演示', () => engine.start(runFIFO()));
panel.addButton('清空', () => { engine.clear(); stageT.setText(''); eqT.setText(''); outT.setText(''); slots = [-1, -1, -1]; chips.forEach(c => c.setColor(DIM, DIM)); frames.forEach((f, i) => { f.setText('空'); f.setColor(BLUE, BLUE); f.moveTo(FRAME_X[i], 70, 0, 10); }); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；金 = 当前引用/换入瞬间，红 = 被换出的旧页，蓝 = 帧内页面；队列文字实时显示先进先出顺序）');

scene.start(engine);
