// AlgorithmLibrary/Clock3D.js — 时钟页面置换（二次机会）：环形扫描，使用位为 1 就清零放行，找到 0 才换出 —— LRU 的低成本近似（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Clock3D');

const scene = new Scene3D('scene', { cameraPos: [0, 260, 700], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「运行演示」开始：Clock —— 环形指针扫过，使用位 1 清零放行，0 则换出', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 262, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: 150, z: 0, color: PALETTE.textGlow, scale: 0.5 });
const outT = new VText(scene, { text: '', x: 0, y: -235, z: 0, color: PALETTE.textGlow, scale: 0.62 });

const REF = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1];
const FRAME_X = [-220, 0, 220];
const chips = REF.map((v, i) => new VBox(scene, { w: 40, h: 26, d: 26, x: -400 + i * 48, y: 220, z: 0, label: String(v), color: DIM, emissive: DIM }));
const frames = FRAME_X.map(x => new VBox(scene, { w: 100, h: 70, d: 70, x, y: 70, z: 0, label: '空', color: BLUE, emissive: BLUE }));
const bitChips = FRAME_X.map(x => new VBox(scene, { w: 46, h: 26, d: 26, x: x + 78, y: 70, z: 0, label: 'R=0', color: DIM, emissive: DIM }));
let slots = [-1, -1, -1];
let bits = [0, 0, 0];

function* clockGen() {
  yield S(() => { hint.setText('Clock（二次机会）：缺页时指针环形扫描 —— R=1 的页清零后跳过（给第二次机会），R=0 的页直接换出'); stageT.setText('引用串：' + REF.join(',') + '；3 个页框 —— 指针每次缺页后前进一步'); });
  yield W(800);
  let faults = 0, hand = 0;
  for (let i = 0; i < REF.length; i++) {
    const v = REF[i];
    chips[i].setColor(GOLD, GOLD);
    yield W(260);
    const fi = slots.indexOf(v);
    if (fi >= 0) {
      bits[fi] = 1;
      bitChips[fi].setText('R=1');
      bitChips[fi].setColor(GOLD, GOLD);
      frames[fi].setColor(GOLD, GOLD);
      yield S(() => { stageT.setText('t=' + (i + 1) + '：引用 ' + v + ' —— 命中！使用位置 1（指针不动）'); eqT.setText('缺页 ' + faults + ' 次；指针 → 帧 ' + hand + '；R 位：' + bits.join(', ')); });
      yield W(650);
      frames[fi].setColor(BLUE, BLUE);
    } else {
      faults++;
      yield S(() => { stageT.setText('t=' + (i + 1) + '：引用 ' + v + ' —— 缺页，指针从帧 ' + hand + ' 开始扫'); eqT.setText('缺页 ' + faults + ' 次；R 位：' + bits.join(', ')); });
      yield W(500);
      while (bits[hand] === 1) {
        bits[hand] = 0;
        bitChips[hand].setText('R=0');
        bitChips[hand].setColor(RED, RED);
        frames[hand].setColor(RED, RED);
        yield S(() => { stageT.setText('帧 ' + hand + ' 的 R=1 → 清零放行（二次机会），指针前进'); });
        yield W(500);
        bitChips[hand].setColor(DIM, DIM);
        frames[hand].setColor(BLUE, BLUE);
        hand = (hand + 1) % 3;
      }
      const vi = hand;
      const victim = slots[vi];
      if (victim >= 0) {
        frames[vi].moveTo(FRAME_X[vi], 25, 0, 320);
        yield S(() => { stageT.setText('找到 R=0：换出 ' + victim + '，装入 ' + v); eqT.setText('缺页 ' + faults + ' 次；指针 → 帧 ' + vi + ' 被替换'); });
        yield W(320);
      } else {
        yield S(() => { stageT.setText('帧 ' + vi + ' 为空，直接装入 ' + v); });
      }
      slots[vi] = v;
      bits[vi] = 1;
      bitChips[vi].setText('R=1');
      bitChips[vi].setColor(GOLD, GOLD);
      frames[vi].moveTo(FRAME_X[vi], 70, 0, 320);
      frames[vi].setText(String(v));
      frames[vi].setColor(GOLD, GOLD);
      yield W(320);
      frames[vi].setColor(BLUE, BLUE);
      hand = (hand + 1) % 3;
    }
    chips[i].setColor(DIM, DIM);
    yield W(300);
  }
  yield S(() => { outT.setText('Clock 缺页 = ' + faults + ' 次（20 次引用 / 3 帧，命中 ' + (20 - faults) + ' 次）'); status.textContent = 'Clock 缺页 ' + faults + ' 次'; hint.setText('本串中指针多数情况要扫满一圈才找到 0 —— 退化为 FIFO（15）；命中把 R 置 1 后，热页会多活一轮'); });
  yield W(1100);
  yield S(() => { hint.setText('复杂度 O(n) 扫描（均摊 O(1)）。应用：Linux 页置换核心思想、Windows 二次机会 —— 只需 1 个引用位，比 LRU 便宜得多'); outT.setText('对比同引用串：LRU = 12，LFU = 13，FIFO/Clock = 15 —— Clock 是「FIFO + 二次机会」的合体'); });
  yield W(1100);
  yield S(() => { hint.setText('Clock 演示完成：环形扫描二次机会，缺页 ' + faults + ' 次'); outT.setText(''); });
  yield W(400);
}

function* runClock() {
  hint.setText('Clock：二次机会');
  yield W(400);
  yield* clockGen();
}

panel.addButton('运行演示', () => engine.start(runClock()));
panel.addButton('清空', () => { engine.clear(); stageT.setText(''); eqT.setText(''); outT.setText(''); slots = [-1, -1, -1]; bits = [0, 0, 0]; chips.forEach(c => c.setColor(DIM, DIM)); frames.forEach((f, i) => { f.setText('空'); f.setColor(BLUE, BLUE); f.moveTo(FRAME_X[i], 70, 0, 10); }); bitChips.forEach((b, i) => { b.setText('R=0'); b.setColor(DIM, DIM); b.moveTo(FRAME_X[i] + 78, 70, 0, 10); }); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；右侧小方块 = 使用位 R，金 R=1 红 R=0；扫描时 R=1 清零放行，找到 R=0 才换出）');

scene.start(engine);
