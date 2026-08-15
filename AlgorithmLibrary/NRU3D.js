// AlgorithmLibrary/NRU3D.js — 最近未用页面置换：引用位 R + 修改位 M 把页面分成 4 类，缺页优先淘汰最低类 —— 粗粒度 LRU，周期清零 R（function* 生成器驱动，解说入状态栏）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
applyTheme('NRU3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, WHITE = 0xffffff, DIM = 0x334155;
const status = panel.addStatus('就绪');

// 4 个淘汰优先级类：类0 最优淘汰 → 类3 最后淘汰
const CLS = [
  { name: '类0 (R=0,M=0)', color: GREEN },
  { name: '类1 (R=0,M=1)', color: CYAN },
  { name: '类2 (R=1,M=0)', color: ORANGE },
  { name: '类3 (R=1,M=1)', color: RED }
];
const clsBoxes = CLS.map((c, i) => new VBox(scene, { w: 156, h: 46, d: 46, x: 90 + i * 160, y: 490, z: 0, label: c.name, color: c.color, emissive: c.color }));

// 5 帧：页面 + R/M 位芯片（模块级预建，运行期仅显隐/移动/变色）
const FX = [70, 200, 330, 460, 590];
const frames = FX.map(x => new VBox(scene, { w: 90, h: 60, d: 60, x, y: 300, z: 0, label: '', color: BLUE, emissive: BLUE }));
const rChips = FX.map(x => new VBox(scene, { w: 40, h: 24, d: 24, x: x + 58, y: 300, z: 0, label: 'R=0', color: DIM, emissive: DIM }));
const mChips = FX.map(x => new VBox(scene, { w: 40, h: 24, d: 24, x: x + 104, y: 300, z: 0, label: 'M=0', color: DIM, emissive: DIM }));
const INIT_R = [0, 1, 1, 0, 0], INIT_M = [0, 0, 1, 1, 0];

// 事件：{ref, type: hit|fault|reset, idx, txt}
const EVENTS = [
  { ref: 0, type: 'hit', idx: 0, txt: '引用 0：命中帧 0 ✓ —— R 置 1（刚被用过）' },
  { ref: 5, type: 'fault', idx: 4, txt: '引用 5：缺页 —— 类0 里有 {帧4:4}，淘汰 4，装入 5（R=1）' },
  { ref: 0, type: 'reset', txt: '时钟周期到达：所有 R 位清零 —— 给老页面第二次机会' },
  { ref: 1, type: 'hit', idx: 1, txt: '引用 1：命中帧 1 ✓ —— R 置 1' },
  { ref: 6, type: 'fault', idx: 0, txt: '引用 6：缺页 —— 类0 里有 {帧0:0, 帧4:5}，淘汰 0，装入 6（R=1）' }
];

function* nruGen() {
  yield S(() => { status.textContent = 'NRU：给每帧记 2 个 bit（R/M）→ 4 类优先级；缺页时从最低类里挑一帧淘汰 —— 比 LRU 便宜，比 FIFO 聪明。5 帧：0,1,2,3,4；事件序列：命中、缺页、周期清零、命中、缺页'; });
  yield W(800);
  let faults = 0;
  const pages = [0, 1, 2, 3, 4];
  let r = INIT_R.slice(), m = INIT_M.slice();
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
      yield S(() => { status.textContent = ev.txt + '；R 位：' + r.join(',') + ' —— 全部清零'; });
      yield W(800);
      sync();
      yield W(300);
      continue;
    }
    if (ev.type === 'hit') {
      r[ev.idx] = 1;
      rChips[ev.idx].setColor(GOLD, GOLD);
      frames[ev.idx].setColor(GOLD, GOLD);
      yield S(() => { status.textContent = ev.txt + '；R 位：' + r.join(','); });
      yield W(700);
      sync();
    } else {
      const ci = r[ev.idx] * 2 + m[ev.idx];
      clsBoxes[ci].setColor(WHITE, WHITE);
      yield S(() => { status.textContent = ev.txt + '；分类：' + clsText(); });
      yield W(900);
      clsBoxes[ci].setColor(CLS[ci].color, CLS[ci].color);
      frames[ev.idx].setColor(RED, RED);
      frames[ev.idx].moveTo(FX[ev.idx], 255, 0, 320);
      yield S(() => { status.textContent = '帧 ' + ev.idx + ' 被淘汰（' + pages[ev.idx] + ' 出局）—— 若 M=1 还得先写回磁盘'; });
      yield W(320);
      pages[ev.idx] = ev.ref;
      r[ev.idx] = 1;
      frames[ev.idx].moveTo(FX[ev.idx], 300, 0, 320);
      frames[ev.idx].setText(String(ev.ref));
      frames[ev.idx].setColor(GOLD, GOLD);
      rChips[ev.idx].setText('R=1');
      rChips[ev.idx].setColor(GOLD, GOLD);
      faults++;
      yield W(320);
      sync();
      yield S(() => { status.textContent = '页 ' + ev.ref + ' 装入帧 ' + ev.idx + '（R=1）—— 缺页 ' + faults + ' 次'; });
      yield W(600);
    }
    yield W(300);
  }
  yield S(() => { status.textContent = '缺页 ' + faults + ' 次 —— 淘汰顺序永远从类0 开始：干净且没人要的页最便宜。本质：用 2 bit 粗粒度近似 LRU —— 类0 最像「最久未用」'; });
  yield W(1100);
  yield S(() => { status.textContent = '复杂度 O(1) 位操作；应用：Linux 早期内核、教学 OS。局限：M 位只在换出时才需要精确；周期清零 R 的频率决定「最近」窗口 —— 调参是门学问'; });
  yield W(1100);
  yield S(() => { status.textContent = 'NRU 演示完成：R/M 四位分类淘汰，缺页 ' + faults + ' 次，类0（未读未写）永远最先被淘汰'; });
  yield W(400);
}

function* runNRU() {
  yield S(() => { status.textContent = 'NRU：四类淘汰 —— 开始'; });
  yield W(400);
  yield* nruGen();
}

engine.queue(() => runNRU());
panel.addButton('清空', () => { engine.clear(); frames.forEach((f, i) => { f.setText(String(i)); f.setColor(BLUE, BLUE); f.moveTo(FX[i], 300, 0, 10); }); rChips.forEach((c, i) => { c.setText('R=' + INIT_R[i]); c.setColor(INIT_R[i] ? GOLD : DIM, INIT_R[i] ? GOLD : DIM); }); mChips.forEach((c, i) => { c.setText('M=' + INIT_M[i]); c.setColor(INIT_M[i] ? ORANGE : DIM, INIT_M[i] ? ORANGE : DIM); }); status.textContent = ''; });

scene.start(engine);
