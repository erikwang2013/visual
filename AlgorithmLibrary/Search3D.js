// AlgorithmLibrary/Search3D.js — 二分查找 / 线性搜索：12 槽升序数组，lo/mid/hi 标记动画（function* 生成器驱动，解说入状态栏）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Search3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, ORANGE = 0xfb923c;
const status = panel.addStatus('就绪');

const N = 12, SPX = 70;
const data = [3, 7, 12, 18, 25, 33, 41, 56, 62, 70, 81, 95];
const cells = data.map((v, i) =>
  new VBox(scene, { w: 56, h: 56, d: 40, x: (i - 5.5) * SPX + 320, y: 300, z: 0, label: String(v), color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
const xOf = i => (i - 5.5) * SPX + 320;

const loT = new VText(scene, { text: '', x: 0, y: 378, z: 0, color: ORANGE, scale: 0.9 });
const hiT = new VText(scene, { text: '', x: 0, y: 378, z: 0, color: ORANGE, scale: 0.9 });
const midT = new VText(scene, { text: '', x: 0, y: 222, z: 0, color: YELLOW, scale: 0.9 });

function resetAll() {
  cells.forEach(c => c.setColor(PALETTE.node, PALETTE.nodeEmissive));
  loT.setText(''); hiT.setText(''); midT.setText('');
}

function* searchGen() {
  resetAll();
  yield S(() => { status.textContent = '查找演示：有序数组用二分查找 O(log n)，无序只能用线性搜索 O(n)'; });
  yield W(500);
  let lo = 0, hi = N - 1;
  yield S(() => {
    loT.setText('lo'); hiT.setText('hi');
    loT.sprite.position.set(xOf(lo), 378, 0); hiT.sprite.position.set(xOf(hi), 378, 0);
    status.textContent = '第一场：二分查找 target = 41（前提：数组已升序）—— 初始区间 [lo, hi] = [0, 11]';
  });
  yield W(600);
  let found = false;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    yield S(() => {
      midT.setText('mid'); midT.sprite.position.set(xOf(mid), 222, 0);
      cells[mid].setColor(YELLOW, YELLOW);
      status.textContent = 'mid = (lo + hi) / 2 = ' + mid + ' → data[' + mid + '] = ' + data[mid];
    });
    yield W(700);
    if (data[mid] === 41) {
      yield S(() => {
        cells[mid].setColor(GREEN, GREEN);
        midT.setText('命中！');
        status.textContent = 'data[' + mid + '] = 41 = target → 找到，下标 ' + mid + '（3 次比较，log₂12 ≈ 3.6）';
      });
      yield W(700);
      found = true; break;
    }
    if (data[mid] < 41) {
      lo = mid + 1;
      yield S(() => { status.textContent = '41 > data[' + mid + '] → 丢掉左半边，lo 跳到 ' + lo; });
      yield W(500);
      yield A(350, p => { loT.sprite.position.x = xOf(lo - 1) + (xOf(lo) - xOf(lo - 1)) * easeInOut(p); });
    } else {
      hi = mid - 1;
      yield S(() => { status.textContent = '41 < data[' + mid + '] → 丢掉右半边，hi 缩到 ' + hi; });
      yield W(500);
      yield A(350, p => { hiT.sprite.position.x = xOf(hi + 1) + (xOf(hi) - xOf(hi + 1)) * easeInOut(p); });
    }
    yield S(() => cells[mid].setColor(PALETTE.node, PALETTE.nodeEmissive));
    yield W(200);
  }
  if (!found) {
    yield S(() => { status.textContent = 'lo > hi → 区间空，41 不存在'; });
    yield W(400);
  }
  yield S(() => {
    loT.setText(''); hiT.setText(''); midT.setText('');
    status.textContent = '二分查找完成：3 次比较找到 41（下标 6）；第二场：线性搜索 target = 56';
  });
  yield W(800);
  yield S(() => { status.textContent = '线性搜索：不要求有序，从 data[0] 开始逐个比较…'; });
  yield W(400);
  let linSteps = 0;
  for (let i = 0; i < N; i++) {
    linSteps++;
    yield S(() => {
      cells[i].setColor(BLUE, BLUE);
      status.textContent = '比较 data[' + i + '] = ' + data[i] + (data[i] === 56 ? ' = target → 找到！' : ' ≠ 56，继续');
    });
    yield W(300);
    if (data[i] === 56) {
      yield S(() => {
        cells[i].setColor(GREEN, GREEN);
        status.textContent = '命中 data[' + i + '] = 56！线性搜索共比较 ' + linSteps + ' 次';
      });
      yield W(500);
      break;
    }
    yield S(() => cells[i].setColor(PALETTE.node, PALETTE.nodeEmissive));
    yield W(120);
  }
  yield S(() => { status.textContent = '对比：二分 3 次比较（需有序），线性 ' + linSteps + ' 次比较（无需有序）—— 数据量小/无序时线性更直接'; });
  yield W(800);
  yield S(() => { status.textContent = '查找演示完成：二分查找 41 → 下标 6（3 次比较）；线性搜索 56 → 下标 7（' + linSteps + ' 次比较）'; });
  yield W(600);
}

engine.queue(() => searchGen());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
