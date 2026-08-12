// AlgorithmLibrary/LRU3D.js — 最近最久未用页面置换：换出最久没被引用的页 —— 栈性质，无 Belady 异常，最优的实用近似（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('LRU3D');

const scene = new Scene3D('scene', { cameraPos: [0, 260, 700], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：LRU —— 换掉最久没被碰过的页面', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 262, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: 150, z: 0, color: PALETTE.textGlow, scale: 0.5 });
const outT = new VText(scene, { text: '', x: 0, y: -235, z: 0, color: PALETTE.textGlow, scale: 0.62 });

const REF = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1];
const FRAME_X = [-220, 0, 220];
const chips = REF.map((v, i) => new VBox(scene, { w: 40, h: 26, d: 26, x: -400 + i * 48, y: 220, z: 0, label: String(v), color: DIM, emissive: DIM }));
const frames = FRAME_X.map(x => new VBox(scene, { w: 100, h: 70, d: 70, x, y: 70, z: 0, label: '空', color: BLUE, emissive: BLUE }));
let slots = [-1, -1, -1];

function* lruGen() {
  yield S(() => { hint.setText('LRU：页面被引用就把「最近」标记刷新 —— 缺页时淘汰最久没被碰过的那页，近似最优算法'); stageT.setText('引用串：' + REF.join(',') + '；3 个页框 —— 每次缺页都换出「最近最久未用」的页'); });
  yield W(800);
  let faults = 0;
  let recency = []; // 最近 → 最旧
  for (let i = 0; i < REF.length; i++) {
    const v = REF[i];
    chips[i].setColor(GOLD, GOLD);
    yield W(260);
    const fi = slots.indexOf(v);
    if (fi >= 0) {
      recency = [v, ...recency.filter(x => x !== v)];
      frames[fi].setColor(GOLD, GOLD);
      yield S(() => { stageT.setText('t=' + (i + 1) + '：引用 ' + v + ' —— 命中！刷新为「最近」'); eqT.setText('缺页 ' + faults + ' 次；最近 → 最旧：' + recency.join(' → ')); });
      yield W(650);
      frames[fi].setColor(BLUE, BLUE);
    } else {
      faults++;
      const ei = slots.indexOf(-1);
      let vi, victim = -1;
      if (ei >= 0) { vi = ei; }
      else { victim = recency.pop(); vi = slots.indexOf(victim); }
      if (victim >= 0) {
        frames[vi].setColor(RED, RED);
        frames[vi].moveTo(FRAME_X[vi], 25, 0, 320);
        yield S(() => { stageT.setText('t=' + (i + 1) + '：引用 ' + v + ' —— 缺页！淘汰最久未用的 ' + victim + '（帧 ' + vi + '）'); eqT.setText('缺页 ' + faults + ' 次；最近 → 最旧：' + recency.join(' → ')); });
        yield W(320);
      } else {
        yield S(() => { stageT.setText('t=' + (i + 1) + '：引用 ' + v + ' —— 缺页！装入空帧 ' + vi); eqT.setText('缺页 ' + faults + ' 次；最近 → 最旧：' + recency.join(' → ')); });
      }
      slots[vi] = v;
      recency = [v, ...recency.filter(x => x !== victim && x !== v)];
      frames[vi].moveTo(FRAME_X[vi], 70, 0, 320);
      frames[vi].setText(String(v));
      frames[vi].setColor(GOLD, GOLD);
      yield W(320);
      frames[vi].setColor(BLUE, BLUE);
    }
    chips[i].setColor(DIM, DIM);
    yield W(300);
  }
  yield S(() => { outT.setText('LRU 缺页 = ' + faults + ' 次（20 次引用 / 3 帧，命中 ' + (20 - faults) + ' 次）'); status.textContent = 'LRU 缺页 ' + faults + ' 次'; hint.setText('栈性质：LRU 的缺页数随帧数增加只会变少 —— 绝不 Belady；代价是维护最近序需要硬件支持（时间戳/栈）'); });
  yield W(1100);
  yield S(() => { hint.setText('复杂度 O(1)（栈/链表 + 哈希）。应用：Linux 页缓存近似 LRU、Redis 内存淘汰 —— 硬件计数器版本称「老化」'); outT.setText('对比同引用串：LRU = 12，LFU = 13，FIFO = 15 —— LRU 最优（此串的最优 = 10）'); });
  yield W(1100);
  yield S(() => { hint.setText('LRU 演示完成：最近最久未用优先淘汰，缺页 ' + faults + ' 次'); outT.setText(''); });
  yield W(400);
}

function* runLRU() {
  hint.setText('LRU：淘汰最久未用');
  yield W(400);
  yield* lruGen();
}

engine.queue(() => runLRU());
panel.addButton('清空', () => { engine.clear(); stageT.setText(''); eqT.setText(''); outT.setText(''); slots = [-1, -1, -1]; chips.forEach(c => c.setColor(DIM, DIM)); frames.forEach((f, i) => { f.setText('空'); f.setColor(BLUE, BLUE); f.moveTo(FRAME_X[i], 70, 0, 10); }); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；金 = 当前引用/换入瞬间，红 = 被淘汰的最久未用页；文字实时显示「最近 → 最旧」次序）');

scene.start(engine);
