// AlgorithmLibrary/LRU3D.js — 最近最久未用页面置换：换出最久没被引用的页 —— 栈性质，无 Belady 异常，最优的实用近似（function* 生成器驱动，解说入状态栏）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
applyTheme('LRU3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, RED = 0xfb7185, DIM = 0x334155;
const status = panel.addStatus('就绪');

// 演示序列固定（20 次引用 / 3 帧）：引用串 chips + 3 页框模块级预建，运行时仅显隐/移动/变色
const REF = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1];
const FRAME_X = [100, 320, 540];
const chips = REF.map((v, i) => new VBox(scene, { w: 26, h: 24, d: 24, x: 14 + i * 30, y: 345, z: 0, label: String(v), color: DIM, emissive: DIM }));
const frames = FRAME_X.map(x => new VBox(scene, { w: 100, h: 70, d: 70, x, y: 500, z: 0, label: '空', color: BLUE, emissive: BLUE }));
let slots = [-1, -1, -1];

function* lruGen() {
  yield S(() => { status.textContent = 'LRU：引用页刷新「最近」标记 —— 缺页时淘汰最久未用的页。引用串 ' + REF.join(',') + '，3 个页框'; });
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
      yield S(() => { status.textContent = 't=' + (i + 1) + ' 引用 ' + v + ' —— 命中！刷新「最近」。缺页 ' + faults + ' 次；最近 → 最旧：' + recency.join(' → '); });
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
        frames[vi].moveTo(FRAME_X[vi], 460, 0, 320);
        yield S(() => { status.textContent = 't=' + (i + 1) + ' 引用 ' + v + ' 缺页 → 淘汰最久未用 ' + victim + '。缺页 ' + faults + ' 次；最近 → 最旧：' + recency.join(' → '); });
        yield W(320);
      } else {
        yield S(() => { status.textContent = 't=' + (i + 1) + ' 引用 ' + v + ' 缺页 → 装入空帧 ' + vi + '。缺页 ' + faults + ' 次；最近 → 最旧：' + recency.join(' → '); });
      }
      slots[vi] = v;
      recency = [v, ...recency.filter(x => x !== victim && x !== v)];
      frames[vi].moveTo(FRAME_X[vi], 500, 0, 320);
      frames[vi].setText(String(v));
      frames[vi].setColor(GOLD, GOLD);
      yield W(320);
      frames[vi].setColor(BLUE, BLUE);
    }
    chips[i].setColor(DIM, DIM);
    yield W(300);
  }
  yield S(() => { status.textContent = 'LRU 缺页 ' + faults + ' 次（命中 ' + (20 - faults) + ' 次）；对比同引用串：LFU = 13、FIFO = 15（最优 10）。栈性质：帧越多缺页只会更少，绝不 Belady；代价是维护最近序'; });
  yield W(1100);
  yield S(() => { status.textContent = '复杂度：O(1) 查找淘汰（哈希 + 双向链表）。应用：Linux 页缓存近似 LRU、Redis 内存淘汰（硬件计数器版称老化）'; });
  yield W(1100);
  yield S(() => { status.textContent = 'LRU 演示完成：20 次引用 / 3 帧，最近最久未用优先淘汰，缺页 ' + faults + ' 次（命中 ' + (20 - faults) + ' 次），复杂度 O(1)'; });
  yield W(400);
}

function* runLRU() {
  slots = [-1, -1, -1];
  chips.forEach(c => c.setColor(DIM, DIM));
  frames.forEach((f, i) => { f.setText('空'); f.setColor(BLUE, BLUE); f.moveTo(FRAME_X[i], 500, 0, 1); });
  yield W(300);
  yield* lruGen();
}

engine.queue(() => runLRU());
panel.addButton('清空', () => { engine.clear(); slots = [-1, -1, -1]; chips.forEach(c => c.setColor(DIM, DIM)); frames.forEach((f, i) => { f.setText('空'); f.setColor(BLUE, BLUE); f.moveTo(FRAME_X[i], 500, 0, 10); }); status.textContent = ''; });

scene.start(engine);
