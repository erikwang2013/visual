// AlgorithmLibrary/Clock3D.js — 时钟页面置换（二次机会）：环形扫描，使用位为 1 就清零放行，找到 0 才换出 —— LRU 的低成本近似（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VArrow } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Clock3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, CYAN = 0x22d3ee, DIM = 0x334155;
const status = panel.addStatus('就绪');

const REF = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1];
const FRAME_X = [140, 320, 500];
// 演示体（引用串块/帧/使用位块/指针箭头）模块级一次性预建，generator 内零 new
const chips = REF.map((v, i) => new VBox(scene, { w: 30, h: 20, d: 20, x: 15 + i * 30, y: 830, z: 0, label: String(v), color: DIM, emissive: DIM }));
const frames = FRAME_X.map(x => new VBox(scene, { w: 110, h: 80, d: 80, x, y: 620, z: 0, label: '空', color: BLUE, emissive: BLUE }));
const bitChips = FRAME_X.map(x => new VBox(scene, { w: 46, h: 26, d: 26, x: x + 85, y: 620, z: 0, label: 'R=0', color: DIM, emissive: DIM }));
const handArrow = new VArrow(scene, { x: FRAME_X[0], y: 730, z: 0, down: true });
let slots = [-1, -1, -1];
let bits = [0, 0, 0];

function* clockGen() {
  yield S(() => { status.textContent = 'Clock（二次机会）：缺页时指针环形扫描 —— R=1 的页清零放行（给第二次机会），R=0 的页换出。引用串 ' + REF.join(',') + '；3 个页框，指针每次缺页后前进一步'; });
  yield W(800);
  let faults = 0, hand = 0;
  for (let i = 0; i < REF.length; i++) {
    const v = REF[i];
    chips[i].setColor(GOLD, GOLD);
    yield W(260);
    const fi = slots.indexOf(v);
    if (fi >= 0) {
      bits[fi] = 1;
      yield S(() => {
        bitChips[fi].setText('R=1'); bitChips[fi].setColor(GOLD, GOLD);
        frames[fi].setColor(GOLD, GOLD);
        status.textContent = 't=' + (i + 1) + '：引用 ' + v + ' —— 命中！使用位置 1（指针不动）；缺页 ' + faults + ' 次，R 位 ' + bits.join(',');
      });
      yield W(650);
      frames[fi].setColor(BLUE, BLUE);
    } else {
      faults++;
      yield S(() => { status.textContent = 't=' + (i + 1) + '：引用 ' + v + ' —— 缺页，指针从帧 ' + hand + ' 开始扫（R 位 ' + bits.join(',') + '）'; });
      yield W(500);
      while (bits[hand] === 1) {
        bits[hand] = 0;
        yield S(() => {
          bitChips[hand].setText('R=0'); bitChips[hand].setColor(RED, RED);
          frames[hand].setColor(RED, RED);
          status.textContent = '帧 ' + hand + ' 的 R=1 → 清零放行（二次机会），指针前进';
        });
        yield W(500);
        bitChips[hand].setColor(DIM, DIM);
        frames[hand].setColor(BLUE, BLUE);
        hand = (hand + 1) % 3;
        handArrow.moveTo(FRAME_X[hand], 730, 0, 300);
      }
      const vi = hand;
      const victim = slots[vi];
      if (victim >= 0) {
        frames[vi].moveTo(FRAME_X[vi], 470, 0, 320);
        yield S(() => { status.textContent = '找到 R=0：换出 ' + victim + '，装入 ' + v; });
        yield W(320);
      }
      slots[vi] = v;
      bits[vi] = 1;
      yield S(() => {
        bitChips[vi].setText('R=1'); bitChips[vi].setColor(GOLD, GOLD);
        frames[vi].moveTo(FRAME_X[vi], 620, 0, 320);
        frames[vi].setText(String(v));
        frames[vi].setColor(GOLD, GOLD);
        status.textContent = '帧 ' + vi + (victim >= 0 ? ' 已换页' : ' 为空，直接装入') + '：' + v + ' 就位，R=1；缺页 ' + faults + ' 次';
      });
      yield W(320);
      frames[vi].setColor(BLUE, BLUE);
      hand = (hand + 1) % 3;
      handArrow.moveTo(FRAME_X[hand], 730, 0, 300);
    }
    chips[i].setColor(DIM, DIM);
    yield W(300);
  }
  yield S(() => { status.textContent = 'Clock 统计：20 次引用 / 3 帧，缺页 15 次，命中 5 次 —— 本串指针多数要扫满一圈才找到 0（退化为 FIFO 15）；命中置 R=1 后热页多活一轮'; });
  yield W(1100);
  yield S(() => { status.textContent = '复杂度 O(n) 扫描（均摊 O(1)），只需 1 个引用位，比 LRU 便宜得多。应用：Linux 页置换核心思想、Windows 二次机会。对比同串：LRU=12，LFU=13，FIFO/Clock=15 —— Clock 是「FIFO + 二次机会」的合体'; });
  yield W(1100);
  yield S(() => { status.textContent = 'Clock 演示完成：环形扫描二次机会，缺页 15 次（20 次引用/3 帧，命中 5）；复杂度 O(n) 扫描（均摊 O(1)）'; });
  yield W(400);
}

function* runClock() {
  yield W(400);
  yield* clockGen();
}

engine.queue(() => runClock());
panel.addButton('清空', () => {
  engine.clear();
  slots = [-1, -1, -1];
  bits = [0, 0, 0];
  chips.forEach(c => c.setColor(DIM, DIM));
  frames.forEach((f, i) => { f.setText('空'); f.setColor(BLUE, BLUE); f.moveTo(FRAME_X[i], 620, 0, 10); });
  bitChips.forEach((b, i) => { b.setText('R=0'); b.setColor(DIM, DIM); b.moveTo(FRAME_X[i] + 85, 620, 0, 10); });
  handArrow.moveTo(FRAME_X[0], 730, 0, 10);
  status.textContent = '';
});

scene.start(engine);
