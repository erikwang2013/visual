// AlgorithmLibrary/FibonacciSearch3D.js — 斐波那契搜索：用黄金分割比例定位，只需加/减无需除法 —— 13 元素、key=47 一步探针命中（function* 生成器驱动，探针与区间收缩运行时计算）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
applyTheme('FibonacciSearch3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, VIOLET = 0xa78bfa, RED = 0xf87171;
const status = panel.addStatus('就绪');

const DATA = [3, 8, 15, 19, 26, 34, 41, 47, 55, 62, 68, 74, 81];
const KEY = 47, N = DATA.length, SPX = 42;
const bars = [];
for (let i = 0; i < N; i++) {
  bars.push(new VBox(scene, { w: 30, h: 36, d: 36, x: (i - 6) * SPX + 320, y: 300, z: 0, label: String(DATA[i]), color: DIM, emissive: DIM }));
}

const setH = i => { bars[i].mesh.scale.y = Math.max(DATA[i] / 100, 0.04); bars[i].mesh.position.y = 18 * DATA[i] / 100 + 282; };

function* fibGen() {
  let f0 = 0, f1 = 1, f2 = 1;
  while (f2 < N) { f0 = f1; f1 = f2; f2 = f0 + f1; }
  let offset = -1, steps = 0;
  yield S(() => { status.textContent = '斐波那契搜索 = 二分亲戚：用 F(k)=F(k-1)+F(k-2) 划分区间，探针位于黄金分割点'; });
  yield W(700);
  yield S(() => {
    status.textContent = '初始化：取不小于 N=13 的斐波那契数 F=13，三元组 (f0, f1, f2) = (' + f0 + ', ' + f1 + ', ' + f2 + ')';
  });
  yield W(700);
  while (f1 > 0) {
    steps++;
    const i = Math.min(offset + f1, N - 1);
    yield S(() => {
      bars[i].setColor(GOLD, GOLD);
      status.textContent = '第 ' + steps + ' 步：三元组 (' + f0 + ', ' + f1 + ', ' + f2 + ') → 探针 i = offset+f1 = ' + i + '，比较 a[' + i + '] = ' + DATA[i] + ' vs key=' + KEY;
    });
    yield W(650);
    if (DATA[i] < KEY) {
      yield S(() => {
        bars[i].setColor(RED, RED);
        for (let j = offset + 1; j <= i; j++) bars[j].setColor(VIOLET, VIOLET);
        status.textContent = 'a[' + i + '] < key → 右移：offset=' + i + '，三元组 (' + (f1 - f0) + ', ' + f0 + ', ' + f1 + ')，新区间 ' + (i + 1) + '…' + (offset + f2);
      });
      yield W(500);
      offset = i; f2 = f1; f1 = f0; f0 = f2 - f1;
    } else if (DATA[i] > KEY) {
      yield S(() => {
        bars[i].setColor(RED, RED);
        for (let j = i; j <= offset + f2; j++) bars[j].setColor(VIOLET, VIOLET);
        status.textContent = 'a[' + i + '] > key → 左移：三元组 (' + (f1 - f0) + ', ' + f0 + ', ' + f1 + ')，区间保持 ' + (offset + 1) + '…' + (i - 1);
      });
      yield W(500);
      f2 = f0; f1 = f1 - f0; f0 = f2 - f1;
    } else {
      yield S(() => {
        bars[i].setColor(GREEN, GREEN);
        status.textContent = '✓ 命中！a[' + i + '] = ' + KEY + '（' + steps + ' 步，只用加减与比较，无需除法）';
      });
      yield W(1000);
      yield S(() => { status.textContent = '斐波那契搜索演示完成：13 个元素、key=47，' + steps + ' 步探针命中 a[7]=47；仅加减定位，复杂度 O(log N)'; });
      yield W(400);
      return;
    }
  }
  yield S(() => {
    if (offset >= 0 && DATA[offset] === KEY) {
      bars[offset].setColor(GREEN, GREEN);
      status.textContent = '✓ 边界命中！a[' + offset + '] = ' + KEY + '（最后一步比较 offset 位置）';
    } else {
      status.textContent = '斐波那契搜索未找到 key=' + KEY;
    }
  });
  yield W(700);
}

engine.queue(() => fibGen());
panel.addButton('清空', () => {
  engine.clear();
  DATA.forEach((_, i) => { setH(i); bars[i].setColor(DIM, DIM); });
  status.textContent = '';
});

scene.start(engine);
