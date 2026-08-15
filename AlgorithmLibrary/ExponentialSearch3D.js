// AlgorithmLibrary/ExponentialSearch3D.js — 指数搜索：指数步进找上界 + 二分收尾 —— 14 元素、key=62，步进 5 次圈定 [8,13] 后二分命中（function* 生成器驱动，探测与二分运行时计算）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
applyTheme('ExponentialSearch3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, TEAL = 0x2dd4bf, BLUE = 0x38bdf8, RED = 0xf87171;
const status = panel.addStatus('就绪');

const DATA = [3, 8, 15, 19, 26, 34, 41, 47, 55, 62, 68, 74, 81, 90];
const KEY = 62, N = DATA.length, SPX = 42;
const bars = [];
for (let i = 0; i < N; i++) {
  bars.push(new VBox(scene, { w: 30, h: 36, d: 36, x: (i - 6.5) * SPX + 320, y: 225, z: 0, label: String(DATA[i]), color: DIM, emissive: DIM }));
}

const setH = i => { bars[i].mesh.scale.y = Math.max(DATA[i] / 100, 0.04); bars[i].mesh.position.y = 18 * DATA[i] / 100 - 18 + 225; };

function* expGen() {
  let i = 1, k = 0;
  yield S(() => { status.textContent = '指数搜索两阶段：① 以 i=1,2,4,8… 翻倍探测，直到 a[i] ≥ key；② 在 [i/2, i] 内二分'; });
  yield W(700);
  while (i < N && DATA[i] < KEY) {
    k++;
    const idx = i;
    yield S(() => {
      for (let j = 0; j <= idx; j++) bars[j].setColor(TEAL, TEAL);
      bars[idx].setColor(GOLD, GOLD);
      status.textContent = '第 ' + k + ' 步：i = ' + idx + '，a[' + idx + '] = ' + DATA[idx] + ' < key → 继续翻倍';
    });
    yield W(550);
    i *= 2;
  }
  const idx = i >= N ? N - 1 : i;
  k++;
  yield S(() => {
    for (let j = 0; j <= idx; j++) bars[j].setColor(TEAL, TEAL);
    bars[idx].setColor(GOLD, GOLD);
    status.textContent = '第 ' + k + ' 步：i = ' + idx + '，a[' + idx + '] = ' + DATA[idx] + ' ≥ key → 停下！';
  });
  yield W(550);
  const hi = i >= N ? N - 1 : i;
  const lo = Math.floor(i / 2);
  yield S(() => {
    for (let j = 0; j < N; j++) bars[j].setColor(DIM, DIM);
    for (let j = lo; j <= hi; j++) bars[j].setColor(BLUE, BLUE);
    status.textContent = '边界已锁定：候选区间 [' + lo + ', ' + hi + ']（指数步进只用了 ' + k + ' 次比较）→ 第 2 阶段二分查找 key=' + KEY;
  });
  yield W(600);
  let l = lo, h = hi, cnt = 0;
  while (l <= h) {
    const m = (l + h) >> 1;
    cnt++;
    yield S(() => {
      bars[m].setColor(GOLD, GOLD);
      status.textContent = '二分第 ' + cnt + ' 步：mid = ' + m + '，a[' + m + '] = ' + DATA[m] + ' vs key=' + KEY;
    });
    yield W(550);
    if (DATA[m] === KEY) {
      yield S(() => {
        bars[m].setColor(GREEN, GREEN);
        status.textContent = '✓ 命中！a[' + m + '] = ' + KEY + '（步进 ' + k + ' 次 + 二分 ' + cnt + ' 次 = ' + (k + cnt) + ' 次比较）';
      });
      yield W(1000);
      yield S(() => { status.textContent = '指数搜索演示完成：14 个元素、key=62，翻倍 ' + k + ' 次圈定 [' + lo + ', ' + hi + ']，二分 ' + cnt + ' 次命中 a[' + m + ']=' + KEY + '；总比较 ' + (k + cnt) + ' 次，复杂度 O(log i)，i 为目标位置'; });
      yield W(400);
      return;
    }
    const nl = DATA[m] < KEY ? m + 1 : l, nh = DATA[m] < KEY ? h : m - 1;
    yield S(() => {
      bars[m].setColor(RED, RED);
      status.textContent = 'a[' + m + '] ' + (DATA[m] < KEY ? '<' : '>') + ' key → 区间 [' + nl + ', ' + nh + ']';
    });
    yield W(450);
    l = nl; h = nh;
  }
  yield S(() => { status.textContent = '指数搜索未找到 key=' + KEY; });
  yield W(700);
}

engine.queue(() => expGen());
panel.addButton('清空', () => {
  engine.clear();
  DATA.forEach((_, i) => { setH(i); bars[i].setColor(DIM, DIM); });
  status.textContent = '';
});

scene.start(engine);
