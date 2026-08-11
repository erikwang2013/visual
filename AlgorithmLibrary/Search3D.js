// AlgorithmLibrary/Search3D.js — 二分查找 / 线性搜索：12 槽升序数组，lo/mid/hi 标记动画（function* 生成器驱动）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Search3D');

const scene = new Scene3D('scene', { cameraPos: [0, 220, 640], fov: 55 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, ROSE = 0xfb7185, ORANGE = 0xfb923c, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「运行演示」开始：查找', x: 0, y: 265, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');

const N = 12, SPX = 70;
const data = [3, 7, 12, 18, 25, 33, 41, 56, 62, 70, 81, 95];
const cells = data.map((v, i) =>
  new VBox(scene, { w: 56, h: 56, d: 40, x: (i - 5.5) * SPX, y: 0, z: 0, label: String(v), color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
const xOf = i => (i - 5.5) * SPX;

const loT = new VText(scene, { text: '', x: 0, y: 78, z: 0, color: ORANGE, scale: 0.9 });
const hiT = new VText(scene, { text: '', x: 0, y: 78, z: 0, color: ORANGE, scale: 0.9 });
const midT = new VText(scene, { text: '', x: 0, y: -78, z: 0, color: YELLOW, scale: 0.9 });
const stepT = new VText(scene, { text: '', x: 0, y: -150, z: 0, color: PALETTE.textGlow, scale: 0.75 });
const eqT = new VText(scene, { text: '', x: 0, y: -200, z: 0, color: PALETTE.textDim, scale: 0.66 });

function resetAll() {
  cells.forEach(c => c.setColor(PALETTE.node, PALETTE.nodeEmissive));
  loT.setText(''); hiT.setText(''); midT.setText(''); stepT.setText(''); eqT.setText('');
}

function* searchGen() {
  resetAll();
  yield S(() => hint.setText('有序数组查找：二分一次砍半 O(log n)，线性逐个扫 O(n)'));
  yield S(() => { stepT.setText('第一场：二分查找 target = 41 — 前提：数组已升序'); });
  yield W(500);
  let lo = 0, hi = N - 1;
  loT.setText('lo'); hiT.setText('hi');
  yield S(() => {
    loT.sprite.position.set(xOf(lo), 78, 0); hiT.sprite.position.set(xOf(hi), 78, 0);
    stepT.setText('初始：lo = 0，hi = 11 — 查找区间 [0, 11]');
  });
  yield W(600);
  let found = false;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    yield S(() => {
      midT.setText('mid'); midT.sprite.position.set(xOf(mid), -78, 0);
      cells[mid].setColor(YELLOW, YELLOW);
      stepT.setText('mid = (lo+hi)/2 = ' + mid + ' → data[' + mid + '] = ' + data[mid]);
    });
    yield W(700);
    if (data[mid] === 41) {
      yield S(() => {
        cells[mid].setColor(GREEN, GREEN);
        midT.setText('命中！');
        stepT.setText('data[' + mid + '] = 41 = target → 找到，下标 ' + mid);
      });
      yield W(700);
      found = true; break;
    }
    if (data[mid] < 41) {
      lo = mid + 1;
      yield S(() => { stepT.setText('41 > data[' + mid + '] → 丢掉左半边，lo 跳到 ' + lo); });
      yield W(500);
      yield A(350, p => { loT.sprite.position.x = xOf(lo - 1) + (xOf(lo) - xOf(lo - 1)) * easeInOut(p); });
    } else {
      hi = mid - 1;
      yield S(() => { stepT.setText('41 < data[' + mid + '] → 丢掉右半边，hi 缩到 ' + hi); });
      yield W(500);
      yield A(350, p => { hiT.sprite.position.x = xOf(hi + 1) + (xOf(hi) - xOf(hi + 1)) * easeInOut(p); });
    }
    yield S(() => cells[mid].setColor(PALETTE.node, PALETTE.nodeEmissive));
    yield W(200);
  }
  if (!found) {
    yield S(() => { stepT.setText('lo > hi → 区间空，41 不存在'); });
    yield W(400);
  }
  yield S(() => {
    loT.setText(''); hiT.setText(''); midT.setText('');
    eqT.setText('二分查找 O(log n)：3 次比较找到 41（n=12，log₂12 ≈ 3.6 次）');
    stepT.setText('第二场：线性搜索 target = 56 — 不要求有序，从头逐个扫');
  });
  yield W(800);
  yield S(() => { stepT.setText('线性搜索：从 data[0] 开始逐个比较…'); });
  yield W(400);
  for (let i = 0; i < N; i++) {
    yield S(() => {
      cells[i].setColor(BLUE, BLUE);
      stepT.setText('比较 data[' + i + '] = ' + data[i] + ' ' + (data[i] === 56 ? '= target → 找到！' : '≠ 56，继续'));
    });
    yield W(300);
    if (data[i] === 56) {
      yield S(() => cells[i].setColor(GREEN, GREEN));
      yield W(500);
      break;
    }
    yield S(() => cells[i].setColor(PALETTE.node, PALETTE.nodeEmissive));
    yield W(120);
  }
  yield S(() => {
    eqT.setText('线性搜索 O(n)：9 次比较找到 56（下标 7）；n=12 最坏 12 次');
    stepT.setText('对比：二分只用了 3 次比较，但要求有序 — 无序数据只能用线性');
  });
  yield W(800);
  yield S(() => {
    status.textContent = '查找完成：二分查找 41 → 下标 6（3 次比较）；线性搜索 56 → 下标 7（9 次比较）';
    hint.setText('二分=有序专用 O(log n)，线性=通用 O(n) — 数据量小/无序时线性反而简单直接');
  });
  yield W(600);
}

panel.addButton('运行演示', () => engine.start(searchGen()));
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；橙=lo/hi 边界，黄=mid 探测，蓝=线性比较，绿=命中）');

scene.start(engine);
