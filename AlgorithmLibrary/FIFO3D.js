// AlgorithmLibrary/FIFO3D.js — 先进先出页面置换：先装进来的页面最先被换出 —— 队列语义，实现最简单，但有 Belady 异常（function* 生成器驱动，解说入状态栏）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
applyTheme('FIFO3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, RED = 0xfb7185, DIM = 0x334155;
const status = panel.addStatus('就绪');

const REF = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1];
const FRAME_X = [100, 320, 540];
const chips = REF.map((v, i) => new VBox(scene, { w: 40, h: 26, d: 26, x: 100 + (i % 10) * 48, y: 470 - Math.floor(i / 10) * 60, z: 0, label: String(v), color: DIM, emissive: DIM }));
const frames = FRAME_X.map(x => new VBox(scene, { w: 100, h: 70, d: 70, x, y: 300, z: 0, label: '空', color: BLUE, emissive: BLUE }));
let slots = [-1, -1, -1];

function resetView() {
  slots = [-1, -1, -1];
  chips.forEach(c => c.setColor(DIM, DIM));
  frames.forEach((f, i) => { f.setText('空'); f.setColor(BLUE, BLUE); f.moveTo(FRAME_X[i], 300, 0, 10); });
}

function* fifoGen() {
  resetView();
  yield S(() => { status.textContent = 'FIFO：先装进来的页面最先被换出 —— 队列语义；3 个页框，20 次引用，每次缺页都换出「最早装入」的页'; });
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
      yield S(() => { status.textContent = 't=' + (i + 1) + '：引用 ' + v + ' —— 命中（已在帧 ' + fi + '，队列不动；缺页 ' + faults + ' 次）'; });
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
        frames[vi].moveTo(FRAME_X[vi], 255, 0, 320);
        yield S(() => { status.textContent = 't=' + (i + 1) + '：引用 ' + v + ' —— 缺页！换出最早装入的 ' + victim + '（帧 ' + vi + '；缺页 ' + faults + ' 次）'; });
        yield W(320);
      } else {
        yield S(() => { status.textContent = 't=' + (i + 1) + '：引用 ' + v + ' —— 缺页！装入空帧 ' + vi + '（缺页 ' + faults + ' 次）'; });
      }
      slots[vi] = v;
      orderQ.push(vi);
      frames[vi].moveTo(FRAME_X[vi], 300, 0, 320);
      frames[vi].setText(String(v));
      frames[vi].setColor(GOLD, GOLD);
      yield W(320);
      frames[vi].setColor(BLUE, BLUE);
    }
    chips[i].setColor(DIM, DIM);
    yield W(300);
  }
  yield S(() => { status.textContent = 'FIFO 缺页 = ' + faults + ' 次（20 次引用 / 3 帧，命中 ' + (20 - faults) + ' 次）—— Belady 异常：增加帧数反而可能缺页更多，FIFO 不满足栈性质'; });
  yield W(1100);
  yield S(() => { status.textContent = '复杂度 O(1)。应用：最简单的置换策略，常作对比基线 —— 现代 OS 多用它的改良版 CLOCK'; });
  yield W(1100);
  yield S(() => { status.textContent = 'FIFO 演示完成：先进先出，20 次引用 / 3 帧，缺页 15 次、命中 5 次'; });
  yield W(400);
}

engine.queue(() => fifoGen());
panel.addButton('清空', () => { engine.clear(); resetView(); status.textContent = ''; });

scene.start(engine);
