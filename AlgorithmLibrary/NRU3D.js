// AlgorithmLibrary/NRU3D.js — 最近未用页面置换：引用位 R + 修改位 M 把页面分成 4 类，缺页优先淘汰最低类 —— 粗粒度 LRU，周期清零 R（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('NRU3D');

const scene = new Scene3D('scene', { cameraPos: [0, 330, 640], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：NRU —— R/M 位分四类，先淘汰最便宜的类', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 262, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: 145, z: 0, color: PALETTE.textGlow, scale: 0.48 });
const outT = new VText(scene, { text: '', x: 0, y: -235, z: 0, color: PALETTE.textGlow, scale: 0.62 });

// 4 个淘汰优先级类：类0 最优淘汰 → 类3 最后淘汰
const CLS = [
  { name: '类0 (R=0,M=0)', color: GREEN, note: '未读未写 · 先淘汰' },
  { name: '类1 (R=0,M=1)', color: CYAN, note: '未读已写' },
  { name: '类2 (R=1,M=0)', color: ORANGE, note: '已读未写' },
  { name: '类3 (R=1,M=1)', color: RED, note: '又读又写 · 最后动' }
];
const clsBoxes = CLS.map((c, i) => new VBox(scene, { w: 172, h: 46, d: 46, x: -360 + i * 240, y: 205, z: 0, label: c.name, color: c.color, emissive: c.color }));
CLS.forEach((c, i) => new VText(scene, { text: c.note, x: -360 + i * 240, y: 170, z: 0, color: PALETTE.textDim, scale: 0.34 }));

// 5 帧：页面 + R/M 位芯片
const FX = [-360, -180, 0, 180, 360];
const frames = FX.map(x => new VBox(scene, { w: 110, h: 60, d: 60, x, y: 55, z: 0, label: '', color: BLUE, emissive: BLUE }));
const rChips = FX.map(x => new VBox(scene, { w: 44, h: 24, d: 24, x: x + 70, y: 55, z: 0, label: 'R=0', color: DIM, emissive: DIM }));
const mChips = FX.map(x => new VBox(scene, { w: 44, h: 24, d: 24, x: x + 122, y: 55, z: 0, label: 'M=0', color: DIM, emissive: DIM }));
new VText(scene, { text: 'R = 近期被引用过？ M = 被写过（脏页）？ —— 换出后要写回磁盘的页更贵', x: 0, y: -10, z: 0, color: PALETTE.textDim, scale: 0.4 });

// 事件：{ref, type: hit|fault|reset, idx, txt}
const EVENTS = [
  { ref: 0, type: 'hit', idx: 0, txt: '引用 0：命中帧 0 ✓ —— R 置 1（刚被用过）' },
  { ref: 5, type: 'fault', idx: 4, txt: '引用 5：缺页 —— 类0 里有 {帧4:4}，淘汰 4，装入 5（R=1）' },
  { ref: 0, type: 'reset', txt: '时钟周期到达：所有 R 位清零 —— 给老页面第二次机会' },
  { ref: 1, type: 'hit', idx: 1, txt: '引用 1：命中帧 1 ✓ —— R 置 1' },
  { ref: 6, type: 'fault', idx: 0, txt: '引用 6：缺页 —— 类0 里有 {帧0:0, 帧4:5}，淘汰 0，装入 6（R=1）' }
];

function* nruGen() {
  yield S(() => { hint.setText('NRU：给每帧记 2 个 bit（R/M）→ 4 类优先级；缺页时从最低类里挑一帧淘汰 —— 比 LRU 便宜，比 FIFO 聪明'); stageT.setText('5 帧：0,1,2,3,4；事件序列：命中、缺页、周期清零、缺页'); });
  yield W(800);
  let faults = 0;
  const pages = [0, 1, 2, 3, 4];
  let r = [0, 1, 1, 0, 0];
  const m = [0, 0, 1, 1, 0];
  const sync = () => {
    frames.forEach((f, i) => { f.setText(String(pages[i])); f.setColor(BLUE, BLUE); });
    rChips.forEach((c, i) => { c.setText('R=' + r[i]); c.setColor(r[i] ? GOLD : DIM, r[i] ? GOLD : DIM); });
    mChips.forEach((c, i) => { c.setText('M=' + m[i]); c.setColor(m[i] ? ORANGE : DIM, m[i] ? ORANGE : DIM); });
  };
  sync();
  const clsText = () => {
    const groups = [[], [], [], []];
    pages.forEach((p, i) => groups[r[i] * 2 + m[i]].push('帧' + i + ':' + p));
    return groups.map((g, i) => '类' + i + '={' + (g.join(',') || '∅') + '}').join('  ');
  };
  for (let k = 0; k < EVENTS.length; k++) {
    const ev = EVENTS[k];
    if (ev.type === 'reset') {
      r = [0, 0, 0, 0, 0];
      yield S(() => { stageT.setText(ev.txt); eqT.setText('R 位：' + r.join(',') + ' —— 全部清零'); });
      yield W(800);
      sync();
      yield W(300);
      continue;
    }
    if (ev.type === 'hit') {
      r[ev.idx] = 1;
      rChips[ev.idx].setColor(GOLD, GOLD);
      frames[ev.idx].setColor(GOLD, GOLD);
      yield S(() => { stageT.setText(ev.txt); eqT.setText('R 位：' + r.join(',')); });
      yield W(700);
      sync();
    } else {
      const ci = r[ev.idx] * 2 + m[ev.idx];
      clsBoxes[ci].setColor(WHITE, WHITE);
      yield S(() => { stageT.setText(ev.txt); eqT.setText('分类：' + clsText()); });
      yield W(900);
      clsBoxes[ci].setColor(CLS[ci].color, CLS[ci].color);
      frames[ev.idx].setColor(RED, RED);
      frames[ev.idx].moveTo(FX[ev.idx], 10, 0, 320);
      yield S(() => { stageT.setText('帧 ' + ev.idx + ' 被淘汰（' + pages[ev.idx] + ' 出局）—— 若 M=1 还得先写回磁盘'); });
      yield W(320);
      pages[ev.idx] = ev.ref;
      r[ev.idx] = 1;
      frames[ev.idx].moveTo(FX[ev.idx], 55, 0, 320);
      frames[ev.idx].setText(String(ev.ref));
      frames[ev.idx].setColor(GOLD, GOLD);
      rChips[ev.idx].setText('R=1');
      rChips[ev.idx].setColor(GOLD, GOLD);
      faults++;
      yield W(320);
      sync();
      yield S(() => { stageT.setText('页 ' + ev.ref + ' 装入帧 ' + ev.idx + '（R=1）—— 缺页 ' + faults + ' 次'); });
      yield W(600);
    }
    yield W(300);
  }
  yield S(() => { outT.setText('缺页 ' + faults + ' 次 —— 淘汰顺序永远从类0 开始：干净且没人要的页最便宜'); status.textContent = 'NRU 缺页 ' + faults + ' 次'; hint.setText('本质：用 2 bit 粗粒度近似 LRU —— 类0 最像「最久未用」，类3 最像「刚用且要写回」'); });
  yield W(1100);
  yield S(() => { hint.setText('复杂度 O(1) 位操作。应用：Linux 早期内核、教学 OS —— 现代 Linux 用 CLOCK 增强版（近似 LRU）'); outT.setText('局限：M 位只在换出时才需要精确；周期清零 R 的频率决定「最近」窗口 —— 调参是门学问'); });
  yield W(1100);
  yield S(() => { hint.setText('NRU 演示完成：R/M 四位分类淘汰，缺页 ' + faults + ' 次'); outT.setText(''); });
  yield W(400);
}

function* runNRU() {
  hint.setText('NRU：四类淘汰');
  yield W(400);
  yield* nruGen();
}

engine.queue(() => runNRU());
panel.addButton('清空', () => { engine.clear(); stageT.setText(''); eqT.setText(''); outT.setText(''); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；顶排四框 = 淘汰优先级，绿→红越来越贵；帧旁 R/M 芯片随事件翻转，白框 = 正在扫描的类）');

scene.start(engine);
