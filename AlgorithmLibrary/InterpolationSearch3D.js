// AlgorithmLibrary/InterpolationSearch3D.js — 插值搜索：按值比例估算位置（查字典式）—— 12 元素、key=57 两步命中（function* 生成器驱动，解说入状态栏）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('InterpolationSearch3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, BLUE = 0x38bdf8, RED = 0xf87171;
const status = panel.addStatus('就绪');

const DATA = [5, 12, 18, 26, 33, 41, 49, 57, 64, 72, 80, 88];
const KEY = 57, N = DATA.length, SPX = 42;
const bars = [];
for (let i = 0; i < N; i++) {
  bars.push(new VBox(scene, { w: 30, h: 36, d: 36, x: (i - 5.5) * SPX + 320, y: 300, z: 0, label: String(DATA[i]), color: DIM, emissive: DIM }));
}
const lowM = new VBox(scene, { w: 10, h: 10, d: 10, x: -2000, y: 222, z: 0, color: BLUE, emissive: BLUE });
const highM = new VBox(scene, { w: 10, h: 10, d: 10, x: -2000, y: 222, z: 0, color: BLUE, emissive: BLUE });
const lowT = new VText(scene, { text: '', x: 0, y: 240, z: 0, color: BLUE, scale: 0.6 });
const highT = new VText(scene, { text: '', x: 0, y: 222, z: 0, color: BLUE, scale: 0.6 });

const setH = i => { bars[i].mesh.scale.y = Math.max(DATA[i] / 100, 0.04); bars[i].mesh.position.y = 18 * DATA[i] / 100 + 282; };
const moveMark = (m, i) => { m.mesh.position.x = (i - 5.5) * SPX + 320; };

function* interpGen() {
  let low = 0, high = N - 1;
  yield S(() => { status.textContent = '插值搜索：按 key 值在区间内的比例估算位置（查字典式）—— 目标 key = 57'; });
  yield W(700);
  yield S(() => {
    moveMark(lowM, low); moveMark(highM, high);
    lowT.setText('low = 0'); highT.setText('high = 11');
    status.textContent = '初始区间 [0, 11]：a[0] = 5 ≤ 57 ≤ a[11] = 88（数组近似均匀分布）';
  });
  yield W(700);
  let steps = 0;
  while (low <= high && KEY >= DATA[low] && KEY <= DATA[high]) {
    steps++;
    const pos = low + Math.floor(((high - low) * (KEY - DATA[low])) / (DATA[high] - DATA[low]));
    const lv = DATA[low], hv = DATA[high];
    yield S(() => {
      bars[pos].setColor(GOLD, GOLD);
      status.textContent = '第 ' + steps + ' 步：pos = low + (high−low)·(key−a[low])/(a[high]−a[low]) = ' + low + ' + ' + (high - low) + '·(' + KEY + '−' + lv + ')/(' + hv + '−' + lv + ') = ' + pos + ' → a[' + pos + '] = ' + DATA[pos];
    });
    yield W(700);
    if (DATA[pos] === KEY) {
      yield S(() => {
        bars[pos].setColor(GREEN, GREEN);
        status.textContent = '第 ' + steps + ' 步命中！a[' + pos + '] = ' + KEY + '（一步估算即中，均匀分布下期望 O(log log N)）';
      });
      yield W(1000);
      yield S(() => { status.textContent = '插值搜索演示完成：' + steps + ' 步命中（第 1 步 pos=6，a[6]=49<57 收缩至 [7,11]；第 2 步 pos=7，a[7]=57）；二分需 4 步，查字典式的跳跃'; });
      yield W(400);
      return;
    }
    const nl = DATA[pos] < KEY ? pos + 1 : low, nh = DATA[pos] < KEY ? high : pos - 1;
    yield S(() => {
      bars[pos].setColor(RED, RED);
      moveMark(lowM, nl); moveMark(highM, nh);
      lowT.setText('low = ' + nl); highT.setText('high = ' + nh);
      status.textContent = 'a[' + pos + '] = ' + DATA[pos] + ' ' + (DATA[pos] < KEY ? '<' : '>') + ' key → 区间收缩为 [' + nl + ', ' + nh + ']';
    });
    yield W(600);
    low = nl; high = nh;
  }
  yield S(() => { status.textContent = '插值搜索未找到 key：key 超出当前区间范围（a[low] ≤ key ≤ a[high] 不成立）'; });
  yield W(800);
  yield S(() => { status.textContent = '插值搜索演示完成：' + steps + ' 步后未找到 key = ' + KEY; });
  yield W(400);
}

engine.queue(() => interpGen());
panel.addButton('清空', () => {
  engine.clear();
  DATA.forEach((_, i) => { setH(i); bars[i].setColor(DIM, DIM); });
  [lowM, highM].forEach(m => m.mesh.position.x = -2000);
  lowT.setText(''); highT.setText('');
  status.textContent = '';
});

scene.start(engine);
