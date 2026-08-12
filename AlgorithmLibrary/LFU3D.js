// AlgorithmLibrary/LFU3D.js — 最不经常使用页面置换：换出被访问次数最少的页 —— 计数淘汰，偏爱高频页，但旧热点可能赖着不走（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('LFU3D');

const scene = new Scene3D('scene', { cameraPos: [0, 260, 700], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：LFU —— 换掉被访问次数最少的页面', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 262, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: 150, z: 0, color: PALETTE.textGlow, scale: 0.5 });
const outT = new VText(scene, { text: '', x: 0, y: -235, z: 0, color: PALETTE.textGlow, scale: 0.62 });

const REF = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1];
const FRAME_X = [-220, 0, 220];
const chips = REF.map((v, i) => new VBox(scene, { w: 40, h: 26, d: 26, x: -400 + i * 48, y: 220, z: 0, label: String(v), color: DIM, emissive: DIM }));
const frames = FRAME_X.map(x => new VBox(scene, { w: 100, h: 70, d: 70, x, y: 70, z: 0, label: '空', color: BLUE, emissive: BLUE }));
const cntChips = FRAME_X.map(x => new VText(scene, { text: '', x, y: 22, z: 0, color: PALETTE.textDim, scale: 0.42 }));
let slots = [-1, -1, -1];

function* lfuGen() {
  yield S(() => { hint.setText('LFU：每个页面统计被访问次数 —— 缺页时淘汰次数最少的那页；同次数先淘汰装得久的（FIFO 决胜）'); stageT.setText('引用串：' + REF.join(',') + '；3 个页框 —— 次数随引用累计，永不衰减'); });
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
      yield S(() => { stageT.setText('t=' + (i + 1) + '：引用 ' + v + ' —— 命中！次数 ' + cnt[v]); eqT.setText('缺页 ' + faults + ' 次；次数：' + slots.map(p => p < 0 ? '空' : p + '×' + cnt[p]).join('  ')); });
      yield W(650);
      frames[fi].setColor(BLUE, BLUE);
      cntChips[fi].sprite.material.color.setHex(PALETTE.textDim);
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
        frames[vi].moveTo(FRAME_X[vi], 25, 0, 320);
        yield S(() => { stageT.setText('t=' + (i + 1) + '：引用 ' + v + ' —— 缺页！淘汰次数最少的 ' + victim + '（×' + cnt[victim] + '，帧 ' + vi + '）'); eqT.setText('缺页 ' + faults + ' 次；次数：' + slots.map(p => p < 0 ? '空' : p + '×' + cnt[p]).join('  ')); });
        yield W(320);
      } else {
        yield S(() => { stageT.setText('t=' + (i + 1) + '：引用 ' + v + ' —— 缺页！装入空帧 ' + vi); eqT.setText('缺页 ' + faults + ' 次'); });
      }
      slots[vi] = v;
      born[vi] = i;
      cnt[v] = 1;
      cntChips[vi].setText('次数 1');
      frames[vi].moveTo(FRAME_X[vi], 70, 0, 320);
      frames[vi].setText(String(v));
      frames[vi].setColor(GOLD, GOLD);
      yield W(320);
      frames[vi].setColor(BLUE, BLUE);
    }
    chips[i].setColor(DIM, DIM);
    yield W(300);
  }
  yield S(() => { outT.setText('LFU 缺页 = ' + faults + ' 次（20 次引用 / 3 帧，命中 ' + (20 - faults) + ' 次）'); status.textContent = 'LFU 缺页 ' + faults + ' 次'; hint.setText('缺陷：早期热点页次数高会「赖着不走」；改进版 LFU-Aging 定期把次数减半'); });
  yield W(1100);
  yield S(() => { hint.setText('复杂度 O(log n)（小根堆）或 O(1)（近似）。应用：CDN 缓存（Varnish）、数据库缓冲池 —— 与 LRU 结合成 LIRS 类算法'); outT.setText('对比同引用串：LRU = 12，LFU = 13，FIFO = 15 —— LFU 惜败 LRU，因 0 号页反复命中保住了帧'); });
  yield W(1100);
  yield S(() => { hint.setText('LFU 演示完成：按访问次数淘汰，缺页 ' + faults + ' 次'); outT.setText(''); });
  yield W(400);
}

function* runLFU() {
  hint.setText('LFU：按次数淘汰');
  yield W(400);
  yield* lfuGen();
}

engine.queue(() => runLFU());
panel.addButton('清空', () => { engine.clear(); stageT.setText(''); eqT.setText(''); outT.setText(''); slots = [-1, -1, -1]; chips.forEach(c => c.setColor(DIM, DIM)); frames.forEach((f, i) => { f.setText('空'); f.setColor(BLUE, BLUE); f.moveTo(FRAME_X[i], 70, 0, 10); }); cntChips.forEach(c => c.setText('')); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；金 = 当前引用/换入瞬间，红 = 被淘汰的次数最少页；帧下方文字实时显示访问次数）');

scene.start(engine);
