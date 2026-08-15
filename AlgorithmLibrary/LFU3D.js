// AlgorithmLibrary/LFU3D.js — 最不经常使用页面置换：换出被访问次数最少的页 —— 计数淘汰，偏爱高频页，但旧热点可能赖着不走（function* 生成器驱动，解说入状态栏）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VBox } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
applyTheme('LFU3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, RED = 0xfb7185, DIM = 0x334155, CNT_DIM = 0x94a3b8;
const status = panel.addStatus('就绪');

// 演示序列固定（20 次引用 / 3 帧）：引用串 chips + 3 页框 + 次数徽标模块级预建，运行时仅显隐/移动/变色
const REF = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1];
const FRAME_X = [220, 320, 420];
const chips = REF.map((v, i) => new VBox(scene, { w: 26, h: 24, d: 24, x: 14 + i * 30, y: 345, z: 0, label: String(v), color: DIM, emissive: DIM }));
const frames = FRAME_X.map(x => new VBox(scene, { w: 100, h: 70, d: 70, x, y: 500, z: 0, label: '空', color: BLUE, emissive: BLUE }));
const cntChips = FRAME_X.map(x => new VText(scene, { text: '', x, y: 440, z: 0, color: CNT_DIM, scale: 0.42 }));
let slots = [-1, -1, -1];

function* lfuGen() {
  yield S(() => { status.textContent = 'LFU：每个页面统计被访问次数 —— 缺页时淘汰次数最少的那页；同次数先淘汰装得久的（FIFO 决胜）。引用串 ' + REF.join(',') + '，3 个页框，次数随引用累计永不衰减'; });
  yield W(800);
  let faults = 0;
  const cnt = {};
  const born = [-1, -1, -1];
  for (let i = 0; i < REF.length; i++) {
    const v = REF[i];
    chips[i].setColor(GOLD, GOLD);
    yield W(260);
    const fi = slots.indexOf(v);
    if (fi >= 0) {
      cnt[v]++;
      cntChips[fi].setText('次数 ' + cnt[v]);
      cntChips[fi].sprite.material.color.setHex(GOLD);
      frames[fi].setColor(GOLD, GOLD);
      yield S(() => { status.textContent = 't=' + (i + 1) + '：引用 ' + v + ' —— 命中！次数 ' + cnt[v] + '。缺页 ' + faults + ' 次；次数：' + slots.map(p => p < 0 ? '空' : p + '×' + cnt[p]).join('  '); });
      yield W(650);
      frames[fi].setColor(BLUE, BLUE);
      cntChips[fi].sprite.material.color.setHex(CNT_DIM);
    } else {
      faults++;
      const ei = slots.indexOf(-1);
      let vi, victim = -1;
      if (ei >= 0) { vi = ei; }
      else {
        let bj = 0;
        for (let j = 1; j < 3; j++) {
          if (cnt[slots[j]] < cnt[slots[bj]] || (cnt[slots[j]] === cnt[slots[bj]] && born[j] < born[bj])) bj = j;
        }
        vi = bj; victim = slots[vi];
      }
      if (victim >= 0) {
        frames[vi].setColor(RED, RED);
        frames[vi].moveTo(FRAME_X[vi], 460, 0, 320);
        yield S(() => { status.textContent = 't=' + (i + 1) + '：引用 ' + v + ' —— 缺页！淘汰次数最少的 ' + victim + '（×' + cnt[victim] + '，帧 ' + vi + '）。缺页 ' + faults + ' 次；次数：' + slots.map(p => p < 0 ? '空' : p + '×' + cnt[p]).join('  '); });
        yield W(320);
      } else {
        yield S(() => { status.textContent = 't=' + (i + 1) + '：引用 ' + v + ' —— 缺页！装入空帧 ' + vi + '。缺页 ' + faults + ' 次'; });
      }
      slots[vi] = v;
      born[vi] = i;
      cnt[v] = 1;
      cntChips[vi].setText('次数 1');
      frames[vi].moveTo(FRAME_X[vi], 500, 0, 320);
      frames[vi].setText(String(v));
      frames[vi].setColor(GOLD, GOLD);
      yield W(320);
      frames[vi].setColor(BLUE, BLUE);
    }
    chips[i].setColor(DIM, DIM);
    yield W(300);
  }
  yield S(() => { status.textContent = 'LFU 缺页 ' + faults + ' 次（20 次引用 / 3 帧，命中 ' + (20 - faults) + ' 次）；对比同引用串：LRU = 12、FIFO = 15 —— 0 号页反复命中保住了帧'; });
  yield W(1100);
  yield S(() => { status.textContent = '复杂度：O(log n)（小根堆）或 O(1)（近似计数）。缺陷：早期热点次数高会「赖着不走」；改进版 LFU-Aging 定期把次数减半。应用：CDN 缓存（Varnish）、数据库缓冲池，与 LRU 结合成 LIRS 类算法'; });
  yield W(1100);
  yield S(() => { status.textContent = 'LFU 演示完成：20 次引用 / 3 帧，按访问次数淘汰，缺页 ' + faults + ' 次（命中 ' + (20 - faults) + ' 次），复杂度 O(log n)/O(1)'; });
  yield W(400);
}

function* runLFU() {
  slots = [-1, -1, -1];
  chips.forEach(c => c.setColor(DIM, DIM));
  frames.forEach((f, i) => { f.setText('空'); f.setColor(BLUE, BLUE); f.moveTo(FRAME_X[i], 500, 0, 1); });
  cntChips.forEach(c => c.setText(''));
  yield W(300);
  yield* lfuGen();
}

engine.queue(() => runLFU());
panel.addButton('清空', () => { engine.clear(); slots = [-1, -1, -1]; chips.forEach(c => c.setColor(DIM, DIM)); frames.forEach((f, i) => { f.setText('空'); f.setColor(BLUE, BLUE); f.moveTo(FRAME_X[i], 500, 0, 10); }); cntChips.forEach(c => c.setText('')); status.textContent = ''; });

scene.start(engine);
